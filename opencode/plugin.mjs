/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM module supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, session termination, health
 * monitoring, permission mediation, status). Every pure helper is
 * named-exported so it can be unit-tested offline, without a running opencode
 * daemon.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parse an Agent-models convention string into the `Model.Ref` object
 * opencode's `session.create` requires.
 *
 * The convention string has the form `provider/model[#variant]`. Only the
 * first `/` splits the provider segment from the model id, so a model id
 * that itself contains slashes (e.g. `openrouter/anthropic/claude-3-opus`)
 * is preserved verbatim as `id`. opencode's API rejects this raw string form
 * outright (`session.create` expects the parsed object), so callers must
 * always parse the convention string before calling `create`.
 *
 * @param {string} modelString Convention string, e.g. `"anthropic/claude-3-opus"`
 *   or `"anthropic/claude-3-opus#thinking"`.
 * @returns {{ providerID: string, id: string, variant: string }} The parsed
 *   `Model.Ref`. `variant` defaults to `"default"` when the string omits
 *   `#variant`.
 * @throws {Error} If the provider segment or the model segment is missing.
 */
function parseModelString(modelString) {
  const hashIndex = modelString.indexOf("#");
  const withoutVariant =
    hashIndex === -1 ? modelString : modelString.slice(0, hashIndex);
  const variant = hashIndex === -1 ? "default" : modelString.slice(hashIndex + 1);

  const slashIndex = withoutVariant.indexOf("/");
  const providerID = slashIndex === -1 ? "" : withoutVariant.slice(0, slashIndex);
  const id = slashIndex === -1 ? "" : withoutVariant.slice(slashIndex + 1);

  if (!providerID || !id) {
    throw new Error(
      `Invalid model string "${modelString}": expected "provider/model[#variant]"`,
    );
  }

  return { providerID, id, variant };
}

/**
 * Format a parsed `Model.Ref` back into the Agent-models convention string.
 *
 * The inverse of `parseModelString`, used to render an opencode session's
 * persisted `model` field (an object) back into the owner-facing
 * `provider/model[#variant]` string for `rp_status`'s ledger rows.
 *
 * @param {{ providerID: string, id: string, variant?: string }} model The
 *   parsed `Model.Ref`, as persisted on an opencode session record.
 * @returns {string} `"<providerID>/<id>"`, or `"<providerID>/<id>#<variant>"`
 *   when `variant` is set to anything other than `"default"`.
 */
function formatModelString({ providerID, id, variant }) {
  const base = `${providerID}/${id}`;
  return variant && variant !== "default" ? `${base}#${variant}` : base;
}

/**
 * `globalThis` key backing the process-wide spawn ledger.
 *
 * opencode may re-import this module under a distinct resolved URL for each
 * per-directory `setup(ctx)` re-run, which would otherwise give each re-run
 * its own module scope and a fresh, empty ledger. Storing the ledger on
 * `globalThis` under a stable key instead means every such re-import shares
 * one ledger for the lifetime of the daemon process; the ledger disappears
 * only when the process (and `globalThis` with it) does.
 */
const LEDGER_KEY = Symbol.for("radical-pipelines.opencode.ledger");

/**
 * Fetch the process-wide spawn ledger, creating it on first use.
 *
 * @returns {{
 *   bySessionID: Map<string, { name: string, run: string, spawner: string, directory?: string, repoRoot?: string | null }>,
 *   currentByName: Map<string, string>,
 * }} The singleton ledger. `bySessionID` holds every recorded spawn keyed by
 *   session ID, so any session ID that was ever recorded stays individually
 *   resolvable. `currentByName` maps an instance name to the session ID of
 *   its most recently recorded spawn, implementing latest-wins-per-name.
 */
function getLedger() {
  if (!globalThis[LEDGER_KEY]) {
    globalThis[LEDGER_KEY] = {
      bySessionID: new Map(),
      currentByName: new Map(),
    };
  }
  return globalThis[LEDGER_KEY];
}

/**
 * Record a spawned session in the ledger.
 *
 * Recording a second spawn under the same `name` (a re-spawn) supersedes the
 * older entry as the name's current resolution (see `resolveCurrentSpawn`),
 * while the older session ID remains individually resolvable (see
 * `lookupSpawn`).
 *
 * @param {string} sessionID The session ID opencode assigned to the spawn.
 * @param {{ name: string, run: string, spawner: string, directory?: string, repoRoot?: string | null }} entry
 *   The spawned instance's run-unique name, the run it belongs to, the
 *   session ID of the agent that spawned it, the directory the session is
 *   seated in, and the root of the repository containing that seat (`null`
 *   when it could not be resolved).
 * @returns {void}
 */
function recordSpawn(sessionID, entry) {
  const ledger = getLedger();
  ledger.bySessionID.set(sessionID, entry);
  ledger.currentByName.set(entry.name, sessionID);
}

/**
 * Look up a recorded spawn by its session ID.
 *
 * @param {string} sessionID The session ID to look up.
 * @returns {{ name: string, run: string, spawner: string, directory?: string, repoRoot?: string | null } | undefined}
 *   The entry recorded for `sessionID`, or `undefined` if no spawn was ever
 *   recorded under that session ID.
 */
function lookupSpawn(sessionID) {
  return getLedger().bySessionID.get(sessionID);
}

/**
 * Resolve the session currently considered "the" instance for a name.
 *
 * When multiple spawns have shared the same `name` (a re-spawn), this
 * returns the most recently recorded one.
 *
 * @param {string} name The run-unique instance name to resolve.
 * @returns {{ sessionID: string, name: string, run: string, spawner: string } | undefined}
 *   The current entry for `name` (including its session ID), or `undefined`
 *   if no spawn has ever been recorded under that name.
 */
function resolveCurrentSpawn(name) {
  const ledger = getLedger();
  const sessionID = ledger.currentByName.get(name);
  if (sessionID === undefined) {
    return undefined;
  }
  return { sessionID, ...ledger.bySessionID.get(sessionID) };
}

/**
 * Check whether an agent name is one opencode currently recognizes.
 *
 * `rp_spawn` calls this against `ctx.agent.list()` before creating a session,
 * since `session.create` itself does not validate the agent name — an unknown
 * agent would otherwise create a dead session that can never execute a turn.
 *
 * @param {Array<string | { name: string }>} agentList The list opencode
 *   returns from `ctx.agent.list()` — entries may be plain agent-id strings
 *   or objects carrying a `name` field, so both shapes are accepted.
 * @param {string} agentName The agent name to check for.
 * @returns {boolean} `true` when `agentName` appears in `agentList`.
 */
function agentExists(agentList, agentName) {
  return agentList.some((entry) =>
    typeof entry === "string" ? entry === agentName : entry?.name === agentName,
  );
}

/**
 * Tags observed on a dead-target session error, across the two shapes it
 * appears in: the in-process `ctx.session.prompt` rejection (`name`/`_tag`
 * `"Session.NotFoundError"`, no HTTP status — verified live against the
 * pinned build) and the raw HTTP response body (`_tag: "SessionNotFoundError"`,
 * no dot, alongside a 404 status).
 */
const SESSION_NOT_FOUND_TAGS = new Set(["Session.NotFoundError", "SessionNotFoundError"]);

/**
 * Check whether an error thrown by `ctx.session.prompt` reports a dead
 * (nonexistent) target session.
 *
 * `rp_send` uses this to turn a dead-target failure into a returned tool
 * result instead of letting it propagate as a thrown error.
 *
 * @param {*} error The error caught from `ctx.session.prompt`.
 * @returns {boolean} `true` when `error` represents a dead-target session
 *   error (see `SESSION_NOT_FOUND_TAGS`) or carries an HTTP 404 status.
 */
function isSessionNotFoundError(error) {
  return (
    error?.status === 404 ||
    SESSION_NOT_FOUND_TAGS.has(error?.name) ||
    SESSION_NOT_FOUND_TAGS.has(error?._tag)
  );
}

/**
 * Build the unspoofable attribution prefix for a delivered message.
 *
 * The prefix is derived entirely from the resolved sender (looked up from
 * the ledger by the caller's own session ID), never from message content,
 * so a sender cannot forge who a message is "from".
 *
 * @param {{ name: string, sessionID: string }} sender The resolved sender:
 *   its instance name and its session ID.
 * @returns {string} The delivered-message prefix, e.g.
 *   `"[from spec-lead (ses_x)]"`.
 */
function formatAttribution(sender) {
  return `[from ${sender.name} (${sender.sessionID})]`;
}

/**
 * Append the opencode transport protocol to a spawned agent's initial prompt.
 *
 * @param {string} prompt The caller-authored initial prompt.
 * @param {string} spawnerID The calling session's authoritative ID.
 * @returns {string} The original prompt followed by the runtime protocol.
 */
function appendSpawnProtocol(prompt, spawnerID) {
  return `${prompt}\n\n## RP messaging (opencode)\n\n**Spawner identifier:** ${spawnerID}\n\nOnly \`rp_send\` routes a message to another session. Send every message required by your profile with \`rp_send\`: use the **Requester identifier** for what your profile addresses to your requester; otherwise use the **Spawner identifier** above.`;
}

/** Prefix marking a session title as an RP-managed, reconstructible one. */
const TITLE_PREFIX = "rp:";

/**
 * Format the durable session title used to reconstruct ledger state.
 *
 * The title is asserted onto the session (surviving daemon restarts) so the
 * ledger can be rebuilt from `run` and `name` alone.
 *
 * @param {{ run: string, name: string }} identity The run identifier and the
 *   run-unique instance name.
 * @returns {string} The title, formatted as `"rp:<run>:<name>"`.
 */
function formatTitle({ run, name }) {
  return `${TITLE_PREFIX}${run}:${name}`;
}

/**
 * Parse a durable session title back into its run and instance name.
 *
 * @param {string} title The session title to parse.
 * @returns {{ run: string, name: string } | undefined} The parsed `{ run,
 *   name }`, or `undefined` when `title` lacks the `rp:` prefix.
 */
function parseTitle(title) {
  if (!title.startsWith(TITLE_PREFIX)) {
    return undefined;
  }
  const rest = title.slice(TITLE_PREFIX.length);
  const separatorIndex = rest.indexOf(":");
  if (separatorIndex === -1) {
    return undefined;
  }
  return {
    run: rest.slice(0, separatorIndex),
    name: rest.slice(separatorIndex + 1),
  };
}

/**
 * Resolve the absolute path to the durable loop registry file.
 *
 * The registry backs `rp_loop_start`/`rp_loop_list`/`rp_loop_cancel` and the
 * re-arm-on-setup behavior: it lives outside opencode's own data directory so
 * it survives independently of opencode's state, under RP's own XDG-style
 * location.
 *
 * @param {Record<string, string | undefined>} [env] Environment to read
 *   `XDG_DATA_HOME` from. Defaults to the real process environment; injectable
 *   so callers can resolve the path without depending on ambient process state.
 * @returns {string} Absolute path to `loops.json`, under
 *   `$XDG_DATA_HOME/radical-pipelines/` when `XDG_DATA_HOME` is set, else under
 *   `~/.local/share/radical-pipelines/`.
 */
function resolveLoopRegistryPath(env = process.env) {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "radical-pipelines", "loops.json");
}

/**
 * List every entry currently stored in the loop registry.
 *
 * Reads fresh from disk on every call (no in-memory cache), so a call made
 * from a newly constructed registry instance — including one in a different
 * process, after a restart — observes whatever the last writer persisted.
 *
 * @param {string} registryPath Absolute path to the registry JSON file, as
 *   returned by `resolveLoopRegistryPath` (or a test-injected path).
 * @returns {Array<{ id: string, interval: number, prompt: string, targetSession: string }>}
 *   Every entry in the registry, in insertion order, or `[]` when the file
 *   does not exist yet.
 */
function listLoopEntries(registryPath) {
  if (!existsSync(registryPath)) {
    return [];
  }
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

/**
 * Persist a full list of entries to the loop registry, creating the parent
 * directory first if it does not already exist.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {Array<{ id: string, interval: number, prompt: string, targetSession: string }>} entries
 *   The complete list of entries to persist, replacing whatever was there.
 * @returns {void}
 */
function writeLoopRegistry(registryPath, entries) {
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, JSON.stringify(entries, null, 2));
}

/**
 * Add an entry to the loop registry.
 *
 * Each entry carries enough to re-arm a recurring timer after a restart: the
 * loop id, its tick interval, the prompt to inject, and the session it
 * targets.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry
 *   The loop entry to add. `id` uniquely identifies the loop; `interval` is
 *   the tick period in milliseconds; `prompt` is the text injected when a tick
 *   fires; `targetSession` is the session ID the loop watches and prompts.
 * @returns {void}
 */
function addLoopEntry(registryPath, entry) {
  const entries = listLoopEntries(registryPath);
  entries.push(entry);
  writeLoopRegistry(registryPath, entries);
}

/**
 * Delete a loop registry entry by loop id.
 *
 * Deleting an id that is not present is a no-op: the registry is left
 * unchanged rather than raising an error.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {string} id The loop id to remove.
 * @returns {void}
 */
function deleteLoopEntry(registryPath, id) {
  const entries = listLoopEntries(registryPath).filter(
    (entry) => entry.id !== id,
  );
  writeLoopRegistry(registryPath, entries);
}

/**
 * `globalThis` key backing the process-wide map of armed loop timers.
 *
 * Shares the same re-import rationale as `LEDGER_KEY`: storing the map on
 * `globalThis` means every per-directory `setup(ctx)` re-run arms into the
 * same map, so a loop started from one scope is visible (and cancellable)
 * from any other.
 */
const LOOP_TIMERS_KEY = Symbol.for("radical-pipelines.opencode.loopTimers");

/** Active sessions become stale after this many unchanged loop intervals. */
const LOOP_STALE_INTERVALS = 2;

/**
 * Fetch the process-wide map of armed loop timers, creating it on first use.
 *
 * @returns {Map<string, {timer: NodeJS.Timeout | undefined, inFlight: Promise<void> | null, ready: Promise<void> | undefined, cancelled: boolean}>}
 *   The singleton map from loop id to its timer state.
 */
function getLoopTimers() {
  if (!globalThis[LOOP_TIMERS_KEY]) {
    globalThis[LOOP_TIMERS_KEY] = new Map();
  }
  return globalThis[LOOP_TIMERS_KEY];
}

/**
 * Arm a loop entry's recurring tick, replacing any timer already armed under
 * the same loop id.
 *
 * @param {{ id: string, interval: number }} entry The loop entry to arm; only
 *   `id` and `interval` are read here (`tick` receives the full entry).
 * @param {(entry: object, isCancelled: () => boolean) => void | Promise<void>} tick
 *   Called with `entry` and its cancellation state on every tick.
 * @returns {Promise<void>} Resolves when any replaced loop has stopped and
 *   the new timer is armed.
 */
function armLoopTimer(entry, tick) {
  const timers = getLoopTimers();
  const previous = timers.get(entry.id);
  const previousStopped = previous ? stopLoopTimer(previous) : Promise.resolve();
  const state = { timer: undefined, inFlight: null, ready: undefined, cancelled: false };
  const schedule = () => {
    state.timer = setTimeout(() => {
      state.timer = undefined;
      if (state.cancelled) return;
      state.inFlight = Promise.resolve()
        .then(() => tick(entry, () => state.cancelled))
        .catch(() => {})
        .finally(() => {
          state.inFlight = null;
          if (!state.cancelled) schedule();
        });
    }, entry.interval);
  };
  timers.set(entry.id, state);
  state.ready = previousStopped.then(() => {
    if (!state.cancelled && timers.get(entry.id) === state) schedule();
  });
  return state.ready;
}

/** Stop one timer state and wait for its startup and active tick. */
function stopLoopTimer(state) {
  state.cancelled = true;
  clearTimeout(state.timer);
  return Promise.all([state.ready, state.inFlight].filter(Boolean)).then(() => {});
}

/**
 * Disarm a loop's timer by loop id.
 *
 * Disarming an id with no armed timer (never armed, or already disarmed) is
 * a no-op.
 *
 * @param {string} id The loop id to disarm.
 * @returns {Promise<void>} Resolves when any in-flight tick has stopped.
 */
function disarmLoopTimer(id) {
  const timers = getLoopTimers();
  const state = timers.get(id);
  if (!state) return Promise.resolve();
  return stopLoopTimer(state).finally(() => {
    if (timers.get(id) === state) timers.delete(id);
  });
}

/**
 * Execute one health-loop tick.
 *
 * Pure aside from its injected effects, so a tick can be exercised
 * synchronously in tests without a live server, a real timer, or a real
 * opencode session.
 *
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry
 *   The loop entry being ticked.
 * @param {{
 *   server: {baseURL: string, password: string} | null,
 *   isSessionActive: (server: object, sessionID: string) => Promise<boolean>,
 *   getSessionUpdatedAt: (server: object, sessionID: string) => Promise<number>,
 *   injectPrompt: (sessionID: string, text: string, delivery: "queue" | "steer") => Promise<*>,
 *   onOutcome: (outcome: object) => void,
 *   isCancelled?: () => boolean,
 *   now?: () => number,
 * }} deps The tick's effects: the resolved server (or `null` when
 *   unreachable, see `resolveServer`), session-state reads, the prompt
 *   injector, and the outcome recorder. `now` defaults to `Date.now`.
 * @returns {Promise<object>} The recorded outcome.
 */
async function runLoopTick(
  entry,
  {
    server,
    isSessionActive,
    getSessionUpdatedAt: readUpdatedAt,
    injectPrompt,
    onOutcome,
    isCancelled = () => false,
    now = Date.now,
  },
) {
  let result;
  try {
    if (isCancelled()) {
      result = { outcome: "cancelled" };
    } else if (!server) {
      result = { outcome: "no-server" };
    } else {
      const active = await isSessionActive(server, entry.targetSession);
      if (isCancelled()) {
        result = { outcome: "cancelled" };
      } else if (!active) {
        await injectPrompt(entry.targetSession, entry.prompt, "queue");
        result = { outcome: "injected", reason: "idle" };
      } else {
        const lastActivity = await readUpdatedAt(server, entry.targetSession);
        if (isCancelled()) {
          result = { outcome: "cancelled" };
        } else if (now() - lastActivity <= entry.interval * LOOP_STALE_INTERVALS) {
          result = { outcome: "busy", lastActivity };
        } else {
          await injectPrompt(entry.targetSession, entry.prompt, "steer");
          result = { outcome: "injected", reason: "stale-running", lastActivity };
        }
      }
    }
  } catch (error) {
    const failure = { outcome: "failed", error: String(error) };
    onOutcome(failure);
    throw error;
  }
  onOutcome(result);
  return result;
}

/**
 * Resolve the directory opencode's service record lives under.
 *
 * @param {Record<string, string | undefined>} env Environment to read
 *   `XDG_STATE_HOME` from.
 * @returns {string} `$XDG_STATE_HOME/opencode` when `XDG_STATE_HOME` is set,
 *   else `~/.local/state/opencode`.
 */
function resolveServiceRecordDir(env) {
  return env.XDG_STATE_HOME
    ? join(env.XDG_STATE_HOME, "opencode")
    : join(homedir(), ".local", "state", "opencode");
}

/**
 * Read and parse opencode's service record from disk, when one exists.
 *
 * The service record is written only while a daemon (`opencode2 service
 * start`) runs — a `serve` process writes none — so a missing record is the
 * normal `serve`/harness case, not an error.
 *
 * opencode has written the record under two names across builds — the
 * hash-suffixed `service-<hash>.json` and the bare `service.json` — so both
 * are accepted. The state directory is shared by every opencode instance
 * running under the same environment (other daemons, dev builds), so records
 * naming live *sibling* servers routinely sit alongside — and because those
 * siblings share on-disk session storage, a request sent to one answers
 * plausibly while its in-memory state (active set, pending permissions)
 * belongs to the wrong process. The plugin runs inside the server process it
 * must address, so the only trustworthy record is the one whose `pid` names
 * this very process; anything else is ignored.
 *
 * @param {Record<string, string | undefined>} env Environment used to
 *   resolve the service record's directory (see `resolveServiceRecordDir`).
 * @param {number} [pid] The process ID a record must name to be trusted.
 *   Defaults to the current process; injectable for tests.
 * @returns {{ id: string, version: string, url: string, pid: number, password: string } | null}
 *   The record naming `pid`, or `null` when its directory does not exist or
 *   no record inside it names `pid`.
 */
function readServiceRecordFile(env, pid = process.pid) {
  const dir = resolveServiceRecordDir(env);
  if (!existsSync(dir)) {
    return null;
  }
  const records = readdirSync(dir)
    .filter(
      (entryName) =>
        entryName === "service.json" ||
        (entryName.startsWith("service-") && entryName.endsWith(".json")),
    )
    .map((entryName) => join(dir, entryName))
    .flatMap((path) => {
      try {
        return [{ path, record: JSON.parse(readFileSync(path, "utf8")) }];
      } catch {
        return [];
      }
    })
    .filter(({ record }) => record?.pid === pid);
  if (records.length === 0) {
    return null;
  }
  return records.reduce((left, right) =>
    statSync(left.path).mtimeMs >= statSync(right.path).mtimeMs ? left : right,
  ).record;
}

/**
 * Resolve how to reach the running opencode server, offline-testably.
 *
 * Tries the daemon case first (a service record on disk naming the current
 * process, see `readServiceRecordFile`), then the `serve`/harness case (env
 * overrides), then gives up. Both dependencies are injectable so this never
 * touches the real filesystem or environment in a test.
 *
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 * }} [options] `env` defaults to `process.env`; `readServiceRecord` defaults
 *   to `readServiceRecordFile`.
 * @returns {{ baseURL: string, password: string } | null} The service
 *   record's `{url, password}` renamed to `{baseURL, password}` when a
 *   record is present; else `{baseURL: env.RP_OPENCODE_SERVER_URL, password:
 *   env.OPENCODE_PASSWORD}` when both are set; else `null`.
 */
function resolveServer({ env = process.env, readServiceRecord = readServiceRecordFile } = {}) {
  const record = readServiceRecord(env);
  if (record && record.url && record.password) {
    return { baseURL: record.url, password: record.password };
  }
  if (env.RP_OPENCODE_SERVER_URL && env.OPENCODE_PASSWORD) {
    return { baseURL: env.RP_OPENCODE_SERVER_URL, password: env.OPENCODE_PASSWORD };
  }
  return null;
}

/**
 * Build the HTTP Basic-auth header value opencode's HTTP API requires.
 *
 * @param {string} password The resolved server password (see `resolveServer`).
 * @returns {string} `"Basic " + base64("opencode:" + password)`.
 */
function buildBasicAuthHeader(password) {
  return `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;
}

/**
 * The default `requestServer` request function: a promise wrapper over
 * node's built-in `node:http`, performing no work until called.
 *
 * @param {URL} url The fully-resolved request URL.
 * @param {{ method: string, headers: Record<string,string>, body?: string }} init
 *   The request method, headers (including the Basic-auth header), and an
 *   optional JSON-string body.
 * @returns {Promise<{ status: number, body: * }>} The response status and,
 *   when the response has a body, its parsed JSON.
 */
function nodeHttpRequest(url, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data ? JSON.parse(data) : undefined });
      });
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => req.destroy(new Error("opencode server request timed out")));
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Issue an authenticated request against a resolved opencode server.
 *
 * @param {{ baseURL: string, password: string }} server A server resolved by
 *   `resolveServer`.
 * @param {"GET" | "POST" | "DELETE"} method The HTTP method.
 * @param {string} path The request path, resolved against `server.baseURL`.
 * @param {*} [body] A JSON-serializable request body (POST only).
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function; defaults to `nodeHttpRequest` (node
 *   builtins only), so tests can stub the HTTP boundary without a real
 *   server.
 * @returns {Promise<{ status: number, body: * }>} The resolved response.
 */
function requestServer(server, method, path, body, requestFn = nodeHttpRequest) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers = { Authorization: buildBasicAuthHeader(server.password) };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  return requestFn(new URL(path, server.baseURL), { method, headers, body: payload });
}

/**
 * Check whether opencode currently reports a session as running.
 *
 * Backs the loop tick's idle check and would back any other liveness read;
 * reads `GET /api/session/active`, whose body envelopes the object keyed by
 * the session IDs currently running as `{ data: {...} }` — every opencode
 * HTTP GET response is wrapped in this `data` envelope, verified live against
 * the pinned build.
 *
 * @param {{ baseURL: string, password: string }} server A server resolved by
 *   `resolveServer`.
 * @param {string} sessionID The session ID to check.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<boolean>} `true` when `sessionID` is a key of the
 *   `/api/session/active` response's `data` object.
 * @throws {Error} On a non-2xx response. A failed read means the session's
 *   state is unknown, not that it is idle; treating it as idle would let a
 *   health-loop tick inject into a busy session.
 */
async function isSessionActive(server, sessionID, requestFn) {
  const response = await requestServer(server, "GET", "/api/session/active", undefined, requestFn);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GET /api/session/active returned ${response.status}`);
  }
  const active = response.body?.data;
  return Boolean(active && Object.prototype.hasOwnProperty.call(active, sessionID));
}

/**
 * Read a session's last-activity timestamp.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session ID to read.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<number>} The session record's `time.updated` timestamp.
 * @throws {Error} When the read fails or the timestamp is absent.
 */
async function getSessionUpdatedAt(server, sessionID, requestFn) {
  const response = await requestServer(
    server,
    "GET",
    `/api/session/${sessionID}`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GET /api/session/${sessionID} returned ${response.status}`);
  }
  const updated = response.body?.data?.time?.updated;
  if (!Number.isFinite(updated)) {
    throw new Error(`GET /api/session/${sessionID} response is missing time.updated`);
  }
  return updated;
}

/**
 * Read the running opencode build's best-effort version string via
 * `opencode2 --version`.
 *
 * Used as `rp_status`'s fallback when no service record (and so no `version`
 * field) is available — the `serve` harness case, which writes no record.
 *
 * @param {(command: string, args: string[], options: object) => string} [exec]
 *   Injectable process-execution function; defaults to
 *   `child_process.execFileSync`. Injected in tests so a missing/failing
 *   `opencode2` binary is never actually invoked.
 * @returns {string | null} The bare build string (e.g. `"0.0.0-next-<N>"`),
 *   or `null` when the command could not be run (e.g. the binary is not
 *   installed). The real CLI prints `"opencode2 v<build>"` — verified
 *   live — so that leading `"opencode2 v"` is stripped; without it, this
 *   would never equal the pin manifest's bare build string.
 */
function readCliVersion(exec = execFileSync) {
  try {
    return exec("opencode2", ["--version"], { encoding: "utf8" }).trim().replace(/^opencode2\s+v/, "");
  } catch {
    return null;
  }
}

/**
 * Resolve the running opencode build string for the pin comparison.
 *
 * @param {{ version?: string } | null} serviceRecord The service record read
 *   by `readServiceRecordFile` (present only while a daemon runs), or `null`.
 * @param {() => string | null} readCliVersionFn Best-effort fallback reading
 *   `opencode2 --version` (see `readCliVersion`); called only when
 *   `serviceRecord` carries no `version`.
 * @returns {string} `serviceRecord.version` when present; else whatever
 *   `readCliVersionFn` returns; else `"unknown"`.
 */
function resolveRunningBuild(serviceRecord, readCliVersionFn) {
  if (serviceRecord && serviceRecord.version) {
    return serviceRecord.version;
  }
  return readCliVersionFn() ?? "unknown";
}

/**
 * Build the `rp_status` ledger rows from opencode's live session records and
 * the plugin's own in-memory spawn ledger.
 *
 * @param {Array<{ id: string, agent: string, model: object, location?: {directory: string}, time?: {updated: *}, title?: string }>} sessionRecords
 *   Every session opencode currently knows about (`GET /api/session`).
 * @param {(sessionID: string) => { name: string, run: string, spawner: string } | undefined} lookup
 *   Resolves a session ID to its recorded ledger entry (see `lookupSpawn`).
 *   A record whose ID isn't found this way falls back to `parseTitle` on its
 *   `title`, so restart-surviving sessions are still recognized.
 * @param {Set<string> | null} activeSessionIDs Session IDs opencode reports
 *   running now (see `isSessionActive`), or `null` when the read failed.
 * @param {(sessionID: string) => number} pendingCountFor Resolves a
 *   session's pending-input count.
 * @param {(sessionID: string) => Array<{id: string, action: string, resources: string[]}>} [permissionsFor]
 *   Resolves a session's pending permission requests; defaults to none.
 * @param {(sessionID: string) => object | undefined} [currentToolForFn]
 *   Resolves a session's currently executing tool call (see
 *   `currentToolFor`); defaults to none.
 * @returns {Array<{name: string, sessionID: string, agent: string, model: string, directory: string, updated: *, running: boolean | undefined, pending: number | undefined, permissions: Array<object> | undefined, currentTool: object | undefined}>}
 *   One row per session record RP recognizes as its own, in `sessionRecords`
 *   order; records RP does not recognize (neither ledger nor `rp:` title)
 *   are omitted.
 */
function buildLedgerRows(
  sessionRecords,
  lookup,
  activeSessionIDs,
  pendingCountFor,
  permissionsFor = () => [],
  currentToolForFn = () => undefined,
) {
  const rows = [];
  for (const record of sessionRecords) {
    const entry = lookup(record.id) ?? parseTitle(record.title ?? "");
    if (!entry) {
      continue;
    }
    rows.push({
      name: entry.name,
      sessionID: record.id,
      agent: record.agent,
      model: record.model ? formatModelString(record.model) : record.model,
      directory: record.location?.directory,
      updated: record.time?.updated,
      running: activeSessionIDs?.has(record.id),
      pending: pendingCountFor(record.id),
      permissions: permissionsFor(record.id),
      currentTool: currentToolForFn(record.id),
    });
  }
  return rows;
}

/**
 * Gather and shape the full `rp_status` payload.
 *
 * Reads the ledger snapshot and per-session pending counts over the reach
 * helper and the HTTP client (never an `opencode2 api` shell-out); when the
 * server cannot be resolved, the ledger comes back empty rather than firing
 * requests blind.
 *
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   readCliVersion?: () => string | null,
 * }} [options] `env` defaults to `process.env`; `readServiceRecord` defaults
 *   to `readServiceRecordFile`; `requestFn` defaults to the real HTTP client;
 *   `readCliVersion` defaults to the real `opencode2 --version` reader.
 * @returns {Promise<object>} The shaped status payload (see `shapeStatus`).
 */
async function buildStatusPayload({
  env = process.env,
  readServiceRecord: readServiceRecordOverride,
  requestFn,
  readCliVersion: readCliVersionOverride,
} = {}) {
  const readRecord = readServiceRecordOverride ?? readServiceRecordFile;
  const readVersion = readCliVersionOverride ?? readCliVersion;

  const server = resolveServer({ env, readServiceRecord: readRecord });
  const pin = readPinManifest();
  const serviceRecord = readRecord(env);
  const runningBuild = resolveRunningBuild(serviceRecord, readVersion);
  const pinComparison = comparePinnedBuild(runningBuild, pin.cli);

  let sessionRecords = [];
  let activeIDs = null;
  const pendingCounts = new Map();
  const pendingPermissions = new Map();

  // A failed read must be reported, not rendered as "idle and healthy":
  // defaulting a failed active-set or permission read to empty is exactly how
  // a blocked session becomes invisible. Failures are aggregated per
  // endpoint+status so a per-session endpoint failure surfaces as one row,
  // not one per session.
  const failures = new Map();
  const noteFailure = (endpoint, status) => {
    const key = `${endpoint}:${status}`;
    const existing = failures.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      failures.set(key, { endpoint, status, count: 1 });
    }
  };
  const ok = (response) => response.status >= 200 && response.status < 300;
  const readEndpoint = async (endpoint, path) => {
    try {
      const response = await requestServer(server, "GET", path, undefined, requestFn);
      if (ok(response)) {
        return response;
      }
      noteFailure(endpoint, response.status);
    } catch {
      noteFailure(endpoint, "transport");
    }
    return null;
  };

  if (server) {
    // Every opencode HTTP GET response envelopes its payload as
    // `{ data: ... }` — verified live against the pinned build.
    const sessionsResponse = await readEndpoint("session", "/api/session");
    if (sessionsResponse) {
      sessionRecords = sessionsResponse.body?.data ?? [];
    }
    const activeResponse = await readEndpoint("active", "/api/session/active");
    if (activeResponse) {
      activeIDs = new Set(Object.keys(activeResponse.body?.data ?? {}));
    }
    for (const record of sessionRecords) {
      const inboxResponse = await readEndpoint("inbox", `/api/session/${record.id}/inbox`);
      if (inboxResponse) {
        pendingCounts.set(record.id, (inboxResponse.body?.data ?? []).length);
      }
      const permissionsResponse = await readEndpoint(
        "permission",
        `/api/session/${record.id}/permission`,
      );
      if (permissionsResponse) {
        pendingPermissions.set(
          record.id,
          (permissionsResponse.body?.data ?? []).map((item) => ({
            id: item.id,
            action: item.action,
            resources: item.resources,
          })),
        );
      }
    }
  }

  const ledgerEntries = buildLedgerRows(
    sessionRecords,
    lookupSpawn,
    activeIDs,
    (id) => pendingCounts.get(id),
    (id) => pendingPermissions.get(id),
    currentToolFor,
  );

  return shapeStatus({
    pluginVersion: PLUGIN_ID,
    pinComparison,
    ledgerEntries,
    errorLog: getErrorLog(),
    loopTickLog: getLoopTickLog(),
    readFailures: [...failures.values()],
  });
}

/**
 * `globalThis` key backing the process-wide set of child session IDs whose
 * durable `rp:` title has been asserted.
 *
 * Enforces "re-assert the title once per child" across every per-directory
 * `setup(ctx)` re-run, the same way `LEDGER_KEY` shares the spawn ledger.
 */
const TITLED_CHILDREN_KEY = Symbol.for("radical-pipelines.opencode.titledChildren");

/**
 * Fetch the process-wide set of already-titled child session IDs, creating
 * it on first use.
 *
 * @returns {Set<string>} The singleton set.
 */
function getTitledChildren() {
  if (!globalThis[TITLED_CHILDREN_KEY]) {
    globalThis[TITLED_CHILDREN_KEY] = new Set();
  }
  return globalThis[TITLED_CHILDREN_KEY];
}

/**
 * `globalThis` key backing the per-session termination state `rp_terminate`
 * maintains for the terminal-event listener.
 */
const TERMINATED_SESSIONS_KEY = Symbol.for("radical-pipelines.opencode.terminatedSessions");

/**
 * Fetch the process-wide map of per-session termination state, creating it on
 * first use.
 *
 * A session is present while at least one `rp_terminate` call for it is in
 * flight, and remains present once any call has confirmed the deletion.
 * Membership is exactly the condition under which terminal events for that
 * session are ignored.
 *
 * @returns {Map<string, {inFlight: number, confirmed: boolean}>} The singleton map.
 */
function getTerminationState() {
  if (!globalThis[TERMINATED_SESSIONS_KEY]) {
    globalThis[TERMINATED_SESSIONS_KEY] = new Map();
  }
  return globalThis[TERMINATED_SESSIONS_KEY];
}

/**
 * Record that a termination attempt for a session has started.
 *
 * @param {string} sessionID The session being terminated.
 * @returns {void}
 */
function beginTermination(sessionID) {
  const state = getTerminationState();
  const entry = state.get(sessionID) ?? { inFlight: 0, confirmed: false };
  entry.inFlight += 1;
  state.set(sessionID, entry);
}

/**
 * Record how one termination attempt ended.
 *
 * Suppression survives while any other attempt is still in flight and forever
 * once some attempt confirmed the deletion, so a failing attempt can never
 * withdraw the suppression a concurrent successful one depends on. State is
 * dropped only when nothing is in flight and nothing was ever terminated,
 * which is what keeps a never-spawned session ID from leaving a marker.
 *
 * @param {string} sessionID The session the attempt targeted.
 * @param {boolean} confirmed Whether this attempt deleted the session.
 * @returns {void}
 */
function endTermination(sessionID, confirmed) {
  const state = getTerminationState();
  const entry = state.get(sessionID);
  if (!entry) {
    return;
  }
  entry.inFlight -= 1;
  entry.confirmed = entry.confirmed || confirmed;
  if (entry.inFlight <= 0 && !entry.confirmed) {
    state.delete(sessionID);
  }
}

/**
 * Whether terminal events for a session are the expected consequence of a
 * deliberate termination rather than a fault to report.
 *
 * @param {string} sessionID The session a terminal event pertains to.
 * @returns {boolean} `true` while a termination is in flight or confirmed.
 */
function isTerminating(sessionID) {
  return getTerminationState().has(sessionID);
}

/**
 * `globalThis` key backing the bounded, in-memory recent-errors ring the
 * terminal-event listener and loop scheduler append to.
 */
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

/**
 * Fetch the process-wide recent-errors ring, creating it on first use.
 *
 * @returns {Array<*>} The singleton log (see `appendToErrorLog`).
 */
function getErrorLog() {
  if (!globalThis[ERROR_LOG_KEY]) {
    globalThis[ERROR_LOG_KEY] = [];
  }
  return globalThis[ERROR_LOG_KEY];
}

/**
 * Append an entry to the process-wide recent-errors ring.
 *
 * @param {*} entry The entry to append (see `appendToErrorLog`).
 * @returns {void}
 */
function recordError(entry) {
  globalThis[ERROR_LOG_KEY] = appendToErrorLog(getErrorLog(), entry);
}

/** `globalThis` key backing the bounded recent health-loop tick log. */
const LOOP_TICK_LOG_KEY = Symbol.for("radical-pipelines.opencode.loopTickLog");

/** Fetch the process-wide recent health-loop tick log. */
function getLoopTickLog() {
  if (!globalThis[LOOP_TICK_LOG_KEY]) {
    globalThis[LOOP_TICK_LOG_KEY] = [];
  }
  return globalThis[LOOP_TICK_LOG_KEY];
}

/** Append an entry to the process-wide recent health-loop tick log. */
function recordLoopTick(entry) {
  globalThis[LOOP_TICK_LOG_KEY] = appendToErrorLog(
    getLoopTickLog(),
    entry,
    DEFAULT_LOOP_TICK_LOG_CAP,
  );
}

/** Event types the terminal-event listener treats as terminal for a session. */
const TERMINAL_EVENT_TYPES = new Set([
  "session.execution.succeeded",
  "session.execution.failed",
]);

/**
 * Check whether an opencode event is a session-terminal event.
 *
 * @param {{ type?: string }} event The event received from `ctx.event.subscribe`.
 * @returns {boolean} `true` when `event.type` is a terminal execution event.
 */
function isTerminalEvent(event) {
  return TERMINAL_EVENT_TYPES.has(event?.type);
}

/**
 * Extract the session ID a terminal event pertains to.
 *
 * @param {object} event The terminal event (see `isTerminalEvent`).
 * @returns {string | undefined} The event's session ID, read from whichever
 *   of the event's known shapes carries it.
 */
function terminalEventSessionID(event) {
  return (
    event?.properties?.sessionID ?? event?.data?.sessionID ?? event?.durable?.aggregateID
  );
}

/**
 * Extract the structured error a failed terminal event carries.
 *
 * @param {object} event The terminal event (see `isTerminalEvent`).
 * @returns {{ type?: string, message?: string } | undefined} The event's
 *   `Session.StructuredError`, read from whichever of the event's known
 *   shapes carries it, or `undefined` when the event carries none.
 */
function terminalEventError(event) {
  return event?.properties?.error ?? event?.data?.error;
}

/**
 * Render a structured error as one line for a notification.
 *
 * @param {*} error The value `terminalEventError` extracted.
 * @returns {string} `"<type>: <message>"` when both fields are present, the
 *   one present field otherwise, or a JSON rendering as the fallback for an
 *   unrecognized shape.
 */
function formatStructuredError(error) {
  if (typeof error === "string") {
    return error;
  }
  const parts = [error?.type, error?.message].filter(Boolean);
  return parts.length > 0 ? parts.join(": ") : JSON.stringify(error);
}

/**
 * Handle one event delivered to the terminal-event listener.
 *
 * Ignores non-terminal events, terminal events on sessions RP did not spawn,
 * and every event on a session terminated through `rp_terminate` — a delete
 * races whatever the session was doing, and a failure it provokes is the
 * expected end of a deliberate shutdown rather than a fault to report.
 * A successful turn is not a completion signal — an agent declares its own
 * completion in a message to its spawner — so success events pass silently.
 * Every failed turn is recorded in the bounded error log (including the
 * structured error it carries, so `rp_status`'s `recentErrors` reports the
 * cause) and announced to the spawner (steer delivery, so a working spawner
 * still receives it) with that cause. The child's durable `rp:` title is
 * re-asserted over the reach helper on its first terminal event.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @param {{
 *   ctx: object,
 *   env: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps `ctx` supplies `ctx.session.prompt` for the failure announcement;
 *   the rest resolve the server for the title re-assert.
 * @returns {Promise<void>}
 */
async function onTerminalEvent(event, { ctx, env, readServiceRecord, requestFn }) {
  if (!isTerminalEvent(event)) {
    return;
  }
  const sessionID = terminalEventSessionID(event);
  const entry = sessionID ? lookupSpawn(sessionID) : undefined;
  if (!entry) {
    return;
  }
  if (isTerminating(sessionID)) {
    return;
  }

  if (event.type === "session.execution.failed") {
    const error = terminalEventError(event);
    const logEntry = { type: event.type, sessionID, at: Date.now() };
    if (error !== undefined) {
      logEntry.error = error;
    }
    recordError(logEntry);

    const cause = error !== undefined ? ` Cause: ${formatStructuredError(error)}` : "";
    await ctx.session.prompt({
      sessionID: entry.spawner,
      text: `[rp] ${entry.name} (${sessionID}) failed a turn.${cause}`,
      delivery: "steer",
    });
  }

  const titled = getTitledChildren();
  if (titled.has(sessionID)) {
    return;
  }
  const server = resolveServer({ env, readServiceRecord });
  if (server) {
    await requestServer(
      server,
      "POST",
      `/api/session/${sessionID}/rename`,
      { title: formatTitle({ run: entry.run, name: entry.name }) },
      requestFn,
    );
    titled.add(sessionID);
  }
}

/** Event type opencode publishes when a session blocks on a permission ask. */
const PERMISSION_ASKED_EVENT_TYPE = "permission.asked";

/**
 * Parse a `permission.asked` event into the fields the permission
 * mediator needs, across the `properties`/`data` carrier shapes events
 * appear in (see `terminalEventSessionID`).
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @returns {{ requestID: string, sessionID: string, action: string, resources: string[] } | undefined}
 *   The parsed request, or `undefined` when the event is not a permission
 *   ask or lacks a request ID or session ID.
 */
function parsePermissionAsked(event) {
  if (event?.type !== PERMISSION_ASKED_EVENT_TYPE) {
    return undefined;
  }
  const props = event.properties ?? event.data ?? {};
  if (!props.id || !props.sessionID) {
    return undefined;
  }
  return {
    requestID: props.id,
    sessionID: props.sessionID,
    action: props.action ?? "",
    resources: Array.isArray(props.resources) ? props.resources : [],
  };
}

/**
 * Resolve the root of the repository containing a directory — for a git
 * worktree, the main checkout's root, not the worktree's.
 *
 * @param {string} directory Absolute directory to resolve from (a spawn's
 *   seat).
 * @param {(command: string, args: string[], options: object) => string} [exec]
 *   Injectable process-execution function; defaults to
 *   `child_process.execFileSync`.
 * @returns {string | null} The repository root, or `null` when it cannot be
 *   resolved (not a git checkout, git missing, or a common dir not named
 *   `.git`).
 */
function resolveRepoRoot(directory, exec = execFileSync) {
  try {
    const commonDir = exec(
      "git",
      ["-C", directory, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8" },
    ).trim();
    return basename(commonDir) === ".git" ? dirname(commonDir) : null;
  } catch {
    return null;
  }
}

/**
 * Map an `external_directory` ask onto equivalent paths inside the asking
 * session's own worktree, when every requested directory has one.
 *
 * A resource is redirectable when it lies inside the seat's repository and
 * the same repository-relative path exists inside the seat. One
 * non-redirectable resource makes the whole ask non-redirectable — partial
 * redirects would leave the reply ambiguous.
 *
 * @param {{
 *   resources: string[],
 *   seat: string,
 *   repoRoot: string,
 *   exists?: (path: string) => boolean,
 * }} input `resources` are the ask's permission resources (each
 *   `<directory>/*`); `seat` is the session's seated directory; `repoRoot`
 *   is the root of the repository containing the seat; `exists` defaults to
 *   `fs.existsSync`.
 * @returns {Array<{ external: string, internal: string }> | undefined} One
 *   mapping per resource, or `undefined` when any resource falls outside
 *   `repoRoot` or has no existing counterpart inside `seat`.
 */
function redirectTargets({ resources, seat, repoRoot, exists = existsSync }) {
  if (resources.length === 0) {
    return undefined;
  }
  const targets = [];
  for (const resource of resources) {
    const external = resource.endsWith("/*") ? resource.slice(0, -2) : resource;
    const rel = relative(repoRoot, external);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      return undefined;
    }
    const internal = join(seat, rel);
    if (!exists(internal)) {
      return undefined;
    }
    targets.push({ external, internal });
  }
  return targets;
}

/**
 * Render the corrective feedback for a redirected (rejected) external read.
 *
 * @param {Array<{ external: string, internal: string }>} targets The
 *   mappings `redirectTargets` computed.
 * @returns {string} The rejection feedback delivered to the asking agent.
 */
function formatRedirectMessage(targets) {
  const mappings = targets.map((target) => `${target.internal} (instead of ${target.external})`);
  return `External read rejected: this session works only inside its own worktree, which already contains the same content. Read it from ${mappings.join(", ")}.`;
}

/**
 * Render the spawner notification for a forwarded permission ask.
 *
 * @param {{ name: string }} entry The asking session's ledger entry.
 * @param {{ requestID: string, sessionID: string, action: string, resources: string[] }} request
 *   The parsed ask.
 * @returns {string} The notification text delivered to the spawner.
 */
function formatPermissionForward(entry, request) {
  return `[rp] ${entry.name} (${request.sessionID}) is blocked on permission request ${request.requestID}: ${request.action} ${request.resources.join(", ")}. Adjudicate with rp_permission_reply — "once" to allow, "reject" with a message to refuse — or escalate to the owner.`;
}

/**
 * Reply to a pending permission request over the HTTP API.
 *
 * @param {{ baseURL: string, password: string }} server A server resolved by
 *   `resolveServer`.
 * @param {{ sessionID: string, requestID: string, reply: "once" | "reject", message?: string }} input
 *   The reply. `message` on a reject reaches the asking agent as corrective
 *   feedback instead of aborting its turn.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<{ status: number, body: * }>} The resolved response.
 */
function replyToPermission(server, { sessionID, requestID, reply, message }, requestFn) {
  return requestServer(
    server,
    "POST",
    `/api/session/${sessionID}/permission/${requestID}/reply`,
    message === undefined ? { reply } : { reply, message },
    requestFn,
  );
}

/**
 * `globalThis` key backing the process-wide set of permission request IDs
 * already handled, so a duplicate delivery of the same ask is handled once.
 * Shares the re-import rationale of `LEDGER_KEY`.
 */
const HANDLED_PERMISSIONS_KEY = Symbol.for("radical-pipelines.opencode.handledPermissions");

/**
 * Fetch the process-wide set of already-handled permission request IDs,
 * creating it on first use.
 *
 * @returns {Set<string>} The singleton set.
 */
function getHandledPermissions() {
  if (!globalThis[HANDLED_PERMISSIONS_KEY]) {
    globalThis[HANDLED_PERMISSIONS_KEY] = new Set();
  }
  return globalThis[HANDLED_PERMISSIONS_KEY];
}

/**
 * Handle one permission-ask event for an RP-spawned session.
 *
 * Never allows anything. An `external_directory` ask whose every resource
 * has the same content inside the asking session's own worktree is rejected
 * with feedback redirecting the agent to the worktree copy — worktrees stay
 * independent and the agent proceeds immediately. Every other ask stays
 * pending and is forwarded to the spawner (steer delivery, so a working
 * spawner still receives it) to adjudicate via `rp_permission_reply`; a
 * redirect-eligible ask also falls back to forwarding when the server cannot
 * be reached to deliver the reject, or when the reject reply comes back
 * non-2xx — a reply that did not land leaves the
 * session blocked, and treating it as handled would leave it blocked with
 * nobody told. Both outcomes are recorded in the bounded log surfaced by
 * `rp_status`.
 *
 * Asks on sessions RP did not spawn are ignored.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @param {{
 *   ctx: object,
 *   env: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   exists?: (path: string) => boolean,
 * }} deps `ctx` supplies `ctx.session.prompt` for the forward; the rest
 *   resolve the server for the reject reply; `exists` reaches
 *   `redirectTargets`.
 * @returns {Promise<void>}
 */
async function onPermissionAsked(event, { ctx, env, readServiceRecord, requestFn, exists }) {
  const request = parsePermissionAsked(event);
  if (!request) {
    return;
  }
  const entry = lookupSpawn(request.sessionID);
  if (!entry) {
    return;
  }
  const handled = getHandledPermissions();
  if (handled.has(request.requestID)) {
    return;
  }
  handled.add(request.requestID);

  const server = resolveServer({ env, readServiceRecord });
  if (request.action === "external_directory" && entry.directory && entry.repoRoot && server) {
    const targets = redirectTargets({
      resources: request.resources,
      seat: entry.directory,
      repoRoot: entry.repoRoot,
      exists,
    });
    if (targets) {
      let response;
      try {
        response = await replyToPermission(
          server,
          {
            sessionID: request.sessionID,
            requestID: request.requestID,
            reply: "reject",
            message: formatRedirectMessage(targets),
          },
          requestFn,
        );
      } catch {
        response = { status: "transport" };
      }
      if (response.status >= 200 && response.status < 300) {
        recordError({
          type: "permission.redirected",
          sessionID: request.sessionID,
          requestID: request.requestID,
          resources: request.resources,
          at: Date.now(),
        });
        return;
      }
      recordError({
        type: "permission.redirect.failed",
        sessionID: request.sessionID,
        requestID: request.requestID,
        status: response.status,
        at: Date.now(),
      });
    }
  }

  recordError({
    type: "permission.forwarded",
    sessionID: request.sessionID,
    requestID: request.requestID,
    action: request.action,
    resources: request.resources,
    at: Date.now(),
  });
  try {
    await ctx.session.prompt({
      sessionID: entry.spawner,
      text: formatPermissionForward(entry, request),
      delivery: "steer",
    });
  } catch (error) {
    handled.delete(request.requestID);
    throw error;
  }
}

/**
 * `globalThis` key backing the process-wide current-tool tracker. Shares the
 * re-import rationale of `LEDGER_KEY`.
 */
const TOOL_STATE_KEY = Symbol.for("radical-pipelines.opencode.toolState");

/**
 * Cap on remembered call-ID→tool-name correlations awaiting their
 * `session.tool.called` event, bounding the map when a streamed tool input
 * never reaches execution (e.g. an interrupt).
 */
const TOOL_NAME_CAP = 200;

/**
 * Fetch the process-wide current-tool tracker, creating it on first use.
 *
 * @returns {{
 *   names: Map<string, string>,
 *   current: Map<string, { callID: string, tool: string | undefined, target: string | undefined, since: number }>,
 * }} The singleton tracker. `names` correlates a call ID to its tool name
 *   between `session.tool.input.started` (which carries the name) and
 *   `session.tool.called` (which carries the input); `current` maps a
 *   session ID to its currently executing tool call.
 */
function getToolState() {
  if (!globalThis[TOOL_STATE_KEY]) {
    globalThis[TOOL_STATE_KEY] = { names: new Map(), current: new Map() };
  }
  return globalThis[TOOL_STATE_KEY];
}

/**
 * Extract a compact human-readable target from a tool call's input.
 *
 * @param {Record<string, unknown>} input The tool call's input record.
 * @returns {string | undefined} The first of `path`, `command`, `directory`,
 *   `url`, or `to` that is a string, truncated to 120 characters; else
 *   `undefined`.
 */
function toolTarget(input) {
  for (const key of ["path", "command", "directory", "url", "to"]) {
    const value = input?.[key];
    if (typeof value === "string") {
      return value.length > 120 ? `${value.slice(0, 120)}…` : value;
    }
  }
  return undefined;
}

/**
 * Track a session's currently executing tool from the tool lifecycle events.
 *
 * Only sessions in the spawn ledger are tracked. `session.tool.input.started`
 * remembers the call's tool name; `session.tool.called` marks the call as
 * the session's current tool (with its target and start time); a matching
 * `session.tool.success`/`session.tool.failed` clears it. Non-tool events
 * are ignored.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @param {{ now?: () => number }} [deps] `now` defaults to `Date.now`.
 * @returns {void}
 */
function onToolEvent(event, { now = Date.now } = {}) {
  const type = event?.type;
  if (typeof type !== "string" || !type.startsWith("session.tool.")) {
    return;
  }
  const props = event.properties ?? event.data ?? {};
  const { sessionID, callID } = props;
  if (!sessionID || !callID || !lookupSpawn(sessionID)) {
    return;
  }
  const state = getToolState();
  if (type === "session.tool.input.started") {
    state.names.set(callID, props.name);
    if (state.names.size > TOOL_NAME_CAP) {
      state.names.delete(state.names.keys().next().value);
    }
    return;
  }
  if (type === "session.tool.called") {
    const tool = state.names.get(callID);
    state.names.delete(callID);
    state.current.set(sessionID, {
      callID,
      tool,
      target: toolTarget(props.input ?? {}),
      since: now(),
    });
    return;
  }
  if (type === "session.tool.success" || type === "session.tool.failed") {
    if (state.current.get(sessionID)?.callID === callID) {
      state.current.delete(sessionID);
    }
  }
}

/**
 * Resolve a session's currently executing tool call, when one is tracked.
 *
 * @param {string} sessionID The session ID to resolve.
 * @returns {{ callID: string, tool: string | undefined, target: string | undefined, since: number } | undefined}
 *   The tracked current tool call, or `undefined`.
 */
function currentToolFor(sessionID) {
  return getToolState().current.get(sessionID);
}

/**
 * Absolute path to RP's own agent profile sources, resolved relative to this
 * module's location so it resolves correctly regardless of the process's
 * working directory.
 *
 * Serves as `materializeAgents`'s default `sourceDir`; tests inject their own
 * directory instead of relying on this constant.
 */
const DEFAULT_AGENTS_SOURCE_DIR = fileURLToPath(
  new URL("../agents", import.meta.url),
);

/**
 * Filename of the ownership manifest `materializeAgents` writes into the
 * target agents directory.
 *
 * Records which filenames in the target were materialized by RP, as opposed
 * to pre-existing, foreign agents of the same name, so a later materialize
 * knows which target files it may safely overwrite.
 */
const OWNERSHIP_MANIFEST_NAME = ".rp-owned.json";

/**
 * Read the set of filenames recorded as RP-owned in a target agents
 * directory.
 *
 * @param {string} targetDir Absolute path to the target agents directory.
 * @returns {Set<string>} The recorded RP-owned filenames, or an empty set
 *   when the directory has no manifest yet (e.g. it was never materialized
 *   into before).
 */
function readOwnershipManifest(targetDir) {
  const manifestPath = join(targetDir, OWNERSHIP_MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    return new Set();
  }
  return new Set(JSON.parse(readFileSync(manifestPath, "utf8")));
}

/**
 * Persist the set of RP-owned filenames to a target agents directory's
 * ownership manifest, replacing whatever was recorded before.
 *
 * @param {string} targetDir Absolute path to the target agents directory.
 * @param {Set<string>} owned The complete set of RP-owned filenames.
 * @returns {void}
 */
function writeOwnershipManifest(targetDir, owned) {
  writeFileSync(
    join(targetDir, OWNERSHIP_MANIFEST_NAME),
    JSON.stringify([...owned].sort(), null, 2),
  );
}

/**
 * Resolve the directory opencode's global agents live under.
 *
 * Mirrors `resolveLoopRegistryPath`/`resolveServiceRecordDir`: opencode
 * itself resolves its global config directory from `XDG_CONFIG_HOME` when
 * set, so the materialization target must honor the same variable — writing
 * to the unqualified `~/.config` under an XDG-isolated environment would
 * materialize agents into a directory opencode never scans.
 *
 * @param {Record<string, string | undefined>} [env] Environment to read
 *   `XDG_CONFIG_HOME` from. Defaults to the real process environment.
 * @returns {string} `$XDG_CONFIG_HOME/opencode/agents` when `XDG_CONFIG_HOME`
 *   is set, else `~/.config/opencode/agents`.
 */
function resolveAgentsTargetDir(env = process.env) {
  const configHome = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "opencode", "agents");
}

/**
 * Materialize RP's agent profiles into opencode's global agents directory.
 *
 * Copies every `*.md` profile from `sourceDir` into `targetDir` byte for
 * byte — including the extra `name:` frontmatter key the profiles carry,
 * which opencode ignores since the filename governs the agent id. The copy
 * is idempotent and ownership-aware, tracked via a manifest written into
 * `targetDir`:
 *  - a target filename recorded as RP-owned (from a previous materialize) is
 *    always overwritten with the current source bytes;
 *  - a target filename that already exists but is *not* recorded as
 *    RP-owned — a foreign file of the same name — is left untouched and
 *    reported as a collision instead of being clobbered;
 *  - every filename written is (re)recorded as RP-owned.
 *
 * @param {string} [sourceDir] Absolute path to the directory of source agent
 *   profiles. Defaults to `../agents` resolved relative to this module (the
 *   repository's `agents/` directory at runtime).
 * @param {string} [targetDir] Absolute path to the target agents directory.
 *   Defaults to opencode's global agents directory (see `resolveAgentsTargetDir`).
 * @returns {{ written: string[], collisions: string[] }} `written` lists the
 *   source filenames copied into `targetDir` this run; `collisions` lists
 *   filenames that already existed under `targetDir` as foreign (non-RP-owned)
 *   files, and so were left unmodified.
 */
function materializeAgents(
  sourceDir = DEFAULT_AGENTS_SOURCE_DIR,
  targetDir = resolveAgentsTargetDir(),
) {
  mkdirSync(targetDir, { recursive: true });

  const owned = readOwnershipManifest(targetDir);
  const written = [];
  const collisions = [];

  const profiles = readdirSync(sourceDir).filter((name) =>
    name.endsWith(".md"),
  );
  for (const name of profiles) {
    const targetPath = join(targetDir, name);
    if (existsSync(targetPath) && !owned.has(name)) {
      collisions.push(name);
      continue;
    }
    copyFileSync(join(sourceDir, name), targetPath);
    owned.add(name);
    written.push(name);
  }

  writeOwnershipManifest(targetDir, owned);

  return { written, collisions };
}

/**
 * Absolute path to the pin manifest, resolved relative to this module's
 * location so it resolves correctly regardless of the process's working
 * directory.
 *
 * Serves as `readPinManifest`'s default `manifestPath`; tests inject their
 * own path instead of relying on this constant.
 */
const DEFAULT_PIN_MANIFEST_PATH = fileURLToPath(
  new URL("./pin.json", import.meta.url),
);

/**
 * Read and parse the pin manifest declaring the exact `@opencode-ai/cli`
 * build (and `@opencode-ai/plugin` version) this layer targets.
 *
 * @param {string} [manifestPath] Absolute path to the manifest JSON file.
 *   Defaults to `opencode/pin.json` alongside this module.
 * @returns {{ cli: string, plugin: string }} The parsed manifest.
 */
function readPinManifest(manifestPath = DEFAULT_PIN_MANIFEST_PATH) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

/**
 * Compare a running opencode build against the pinned build.
 *
 * @param {string | null | undefined} runningBuild The build string reported
 *   by the running installation (e.g. from `opencode2 --version` or the
 *   service record), or a nullish value or the literal `"unknown"` when it
 *   could not be read (e.g. a `serve` process exposes no service record).
 * @param {string} pinnedCli The pinned `@opencode-ai/cli` build string (the
 *   pin manifest's `cli` field, see `readPinManifest`).
 * @returns {"match" | "outside the verified surface" | "not determinable"}
 *   `"match"` when `runningBuild` equals `pinnedCli`; `"not determinable"`
 *   when `runningBuild` is nullish or `"unknown"` rather than a real build
 *   string; otherwise `"outside the verified surface"`.
 */
function comparePinnedBuild(runningBuild, pinnedCli) {
  if (runningBuild == null || runningBuild === "unknown") {
    return "not determinable";
  }
  return runningBuild === pinnedCli ? "match" : "outside the verified surface";
}

/**
 * Default cap for the in-memory recent-errors ring `appendToErrorLog`
 * maintains.
 */
const DEFAULT_ERROR_LOG_CAP = 20;

/** Default cap for the in-memory recent health-loop tick ring. */
const DEFAULT_LOOP_TICK_LOG_CAP = 100;

/**
 * Append an entry to a bounded, in-memory error log ring.
 *
 * Pure: returns a new array rather than mutating `log`, leaving the caller
 * in control of where the resulting log is stored (e.g. a module-singleton
 * held by the event listener).
 *
 * @param {Array<*>} log Existing log entries, oldest first.
 * @param {*} entry The entry to append (e.g. a captured structured error).
 * @param {number} [cap] Maximum number of entries the ring retains. Defaults
 *   to `DEFAULT_ERROR_LOG_CAP`.
 * @returns {Array<*>} `log` with `entry` appended; once the result would
 *   exceed `cap` entries, the oldest are dropped so at most `cap` remain,
 *   newest last.
 */
function appendToErrorLog(log, entry, cap = DEFAULT_ERROR_LOG_CAP) {
  const next = [...log, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/**
 * Shape the `rp_status` tool result from its component inputs.
 *
 * Pure: every input is supplied by the caller — the plugin's `rp_status`
 * handler gathers the plugin version, the pin comparison (see
 * `comparePinnedBuild`), the ledger snapshot, and the error log (see
 * `appendToErrorLog`) from their respective sources — so this function
 * performs no I/O of its own.
 *
 * @param {{
 *   pluginVersion: string,
 *   pinComparison: "match" | "outside the verified surface" | "not determinable",
 *   ledgerEntries: Array<{
 *     name: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     running?: boolean,
 *     pending?: number,
 *     permissions?: Array<{id: string, action: string, resources: string[]}>,
 *     currentTool: object | undefined,
 *   }>,
 *   errorLog: Array<*>,
 *   loopTickLog?: Array<*>,
 *   readFailures?: Array<{endpoint: string, status: number | "transport", count: number}>,
 * }} input The status payload's components. `pluginVersion` identifies the
 *   running plugin build; `pinComparison` is the result of comparing the
 *   running opencode build against the pin; `ledgerEntries` is one row per
 *   live spawn; `errorLog` and `loopTickLog` are bounded recent-event rings;
 *   `readFailures` lists the server reads that failed while gathering the
 *   ledger — a non-empty list means the ledger's
 *   `running`/`pending`/`permissions` fields are incomplete, not that the
 *   sessions are idle.
 * @returns {{
 *   pluginVersion: string,
 *   pin: "match" | "outside the verified surface" | "not determinable",
 *   ledger: Array<{
 *     name: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     running?: boolean,
 *     pending?: number,
 *     permissions?: Array<{id: string, action: string, resources: string[]}>,
 *     currentTool: object | undefined,
 *   }>,
 *   recentErrors: Array<*>,
 *   recentLoopTicks: Array<*>,
 *   readFailures: Array<{endpoint: string, status: number | "transport", count: number}>,
 * }} The shaped `rp_status` result.
 */
function shapeStatus({
  pluginVersion,
  pinComparison,
  ledgerEntries,
  errorLog,
  loopTickLog = [],
  readFailures = [],
}) {
  return {
    pluginVersion,
    pin: pinComparison,
    ledger: ledgerEntries.map((entry) => ({
      name: entry.name,
      sessionID: entry.sessionID,
      agent: entry.agent,
      model: entry.model,
      directory: entry.directory,
      updated: entry.updated,
      running: entry.running,
      pending: entry.pending,
      permissions: entry.permissions,
      currentTool: entry.currentTool,
    })),
    recentErrors: errorLog,
    recentLoopTicks: loopTickLog,
    readFailures,
  };
}

/**
 * Absolute path to this package's `package.json`, resolved relative to this
 * module's location.
 *
 * Serves as `readPackageVersion`'s default `packageJsonPath`.
 */
const DEFAULT_PACKAGE_JSON_PATH = fileURLToPath(new URL("../package.json", import.meta.url));

/**
 * Read this package's version, as declared in `package.json`.
 *
 * @param {string} [packageJsonPath] Absolute path to the manifest. Defaults
 *   to this repository's own `package.json`.
 * @returns {string} The manifest's `version` field.
 */
function readPackageVersion(packageJsonPath = DEFAULT_PACKAGE_JSON_PATH) {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
}

/**
 * The plugin's free-form id, surfaced verbatim by `GET /api/plugin` and by
 * `rp_status`. Read once at module load from `package.json` — never from a
 * network call — so it never goes stale relative to the installed package.
 */
const PLUGIN_ID = `radical-pipelines@${readPackageVersion()}`;

/**
 * Absolute path to the packaged `skills/` directory, resolved relative to
 * this module's location so it resolves correctly regardless of the
 * process's working directory. Read by reference — never copied — in
 * `setup`.
 */
const SKILLS_SOURCE_DIR = fileURLToPath(new URL("../skills", import.meta.url));

/**
 * Split a skill file into its YAML frontmatter fields and its markdown body.
 *
 * Only the scalar fields opencode reads off a skill are recognized (`name`,
 * `description`, `slash`); anything else in the block is ignored. A file
 * without a leading `---` fence has no frontmatter and is all body.
 *
 * @param {string} source Raw file contents.
 * @returns {{ frontmatter: Record<string, string>, content: string }}
 */
function parseSkillFrontmatter(source) {
  const normalized = source.replace(/^﻿/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(normalized);
  if (!match) return { frontmatter: {}, content: normalized.trim() };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    frontmatter[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }

  return {
    frontmatter,
    content: normalized.slice(match[0].length).trim(),
  };
}

/**
 * Read a directory of skills into the `Skill.Info` records opencode's
 * `ctx.skill.transform` draft accepts.
 *
 * opencode v2 dropped the directory *source* registration a plugin used to
 * hand over (`sources.source({ type: "directory", ... })` — removed, so
 * calling it dies with "sources.source is not a function"); the draft now
 * takes fully-formed skills. Both packaging layouts core supports are read
 * here: `<dir>/<id>/SKILL.md` (RP's own) and a flat `<dir>/<id>.md`, with the
 * id taken from the containing directory or the file's basename to match how
 * core derives it.
 *
 * @param {string} directory Absolute path to the skills directory.
 * @param {{ exists?: (path: string) => boolean, read?: (path: string) => string, list?: (path: string) => string[] }} [io]
 *   Injection seam for tests; defaults to the real filesystem.
 * @returns {Array<{ id: string, name: string, description?: string, slash?: boolean, location: string, content: string }>}
 *   Skills sorted by id. An absent or unreadable directory yields `[]`.
 */
function readSkillDirectory(
  directory,
  {
    exists = existsSync,
    read = (path) => readFileSync(path, "utf8"),
    list = (path) => readdirSync(path),
  } = {},
) {
  if (!exists(directory)) return [];

  const files = [];
  for (const entry of list(directory)) {
    const nested = join(directory, entry, "SKILL.md");
    if (exists(nested)) {
      files.push({ id: entry, path: nested });
      continue;
    }
    if (entry.endsWith(".md") && entry !== "SKILL.md") {
      files.push({ id: basename(entry, ".md"), path: join(directory, entry) });
    }
  }

  const skills = [];
  for (const file of files) {
    const { frontmatter, content } = parseSkillFrontmatter(read(file.path));
    skills.push({
      id: file.id,
      name: frontmatter.name ?? file.id,
      ...(frontmatter.description === undefined
        ? {}
        : { description: frontmatter.description }),
      ...(frontmatter.slash === undefined
        ? {}
        : { slash: frontmatter.slash === "true" }),
      location: file.path,
      content,
    });
  }

  return skills.sort((left, right) => (left.id < right.id ? -1 : 1));
}

/**
 * Wrap a tool's computed result into the shape opencode's tool contract
 * requires: `{ output, content }`. Any other return shape from `execute` —
 * a bare string, a plain object missing both keys — leaves the calling agent
 * with a null result, regardless of the value actually computed.
 *
 * `output` is round-tripped through JSON so it is always a JSON value:
 * opencode validates a tool's output against its declared schema and rejects
 * the whole call with "Tool returned a non-JSON value for its output schema"
 * if it is not. Ledger rows carry `undefined` whenever opencode's session
 * record omits a field — no current tool, no model, no recorded update time —
 * and the round-trip drops those keys exactly as the rendering already did.
 *
 * @param {*} value The tool's computed result.
 * @returns {{ output: *, content: Array<{ type: "text", text: string }> }}
 *   `output` is the JSON form of the value calling code receives back;
 *   `content` is its human-readable rendering (the string itself when `value`
 *   already is one, else its JSON form).
 */
function toToolResult(value) {
  if (typeof value === "string") {
    return { output: value, content: [{ type: "text", text: value }] };
  }
  const text = JSON.stringify(value) ?? "null";
  return { output: JSON.parse(text), content: [{ type: "text", text }] };
}

/**
 * The output schema every RP tool declares.
 *
 * opencode only carries a tool's `output` back to its caller when the tool
 * declares an output schema — Code Mode, which is how an agent reaches these
 * tools, returns that `output` and nothing else, so a tool without one
 * resolves to `null` however much it computed. RP's tools return whatever
 * shape their operation produced (a bare session ID, a status payload, a
 * loop registry listing), so the declared schema is the permissive one that
 * accepts any JSON value rather than a per-tool shape.
 */
const ANY_OUTPUT_SCHEMA = {};

/**
 * Build the `rp_spawn` tool descriptor.
 *
 * @param {object} ctx The plugin's opencode context, as passed to `setup`.
 * @param {{ resolveRepoRootFn?: (directory: string) => string | null }} [deps]
 *   `resolveRepoRootFn` defaults to `resolveRepoRoot`; injected in tests so
 *   no real `git` runs.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSpawnTool(ctx, { resolveRepoRootFn = resolveRepoRoot } = {}) {
  return {
    name: "rp_spawn",
    description:
      "Spawn a new named RP agent instance as an opencode session seated in a directory.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        name: { type: "string", description: "Run-unique instance name." },
        agent: { type: "string", description: "RP agent profile name." },
        model: { type: "string", description: "provider/model[#variant] convention string." },
        directory: { type: "string", description: "Absolute directory the session is seated in." },
        prompt: { type: "string", description: "Initial prompt posted to the spawned session." },
        run: { type: "string", description: "Run branch name." },
      },
      required: ["name", "agent", "model", "directory", "prompt", "run"],
    },
    async execute({ name, agent, model, directory, prompt, run }, toolCtx) {
      const agentList = await ctx.agent.list();
      if (!agentExists(agentList.data, agent)) {
        throw new Error(`Unknown agent "${agent}"`);
      }
      const session = await ctx.session.create({
        agent,
        model: parseModelString(model),
        location: { directory },
      });
      recordSpawn(session.id, {
        name,
        run,
        spawner: toolCtx.sessionID,
        directory,
        repoRoot: resolveRepoRootFn(directory),
      });
      await ctx.session.prompt({
        sessionID: session.id,
        text: appendSpawnProtocol(prompt, toolCtx.sessionID),
        delivery: "queue",
      });
      return toToolResult(session.id);
    },
  };
}

/**
 * Build the `rp_terminate` tool descriptor.
 *
 * Marks the session as terminating *before* issuing the delete, because a
 * delete-associated `session.execution.failed` has been observed in the same
 * second as the request: marking on success would land too late to suppress
 * it. What produces that failure is not established — a clean interrupt
 * publishes `session.execution.interrupted`, which this plugin ignores, so it
 * is not the interrupt — and the suppression deliberately does not depend on
 * knowing.
 *
 * `endTermination` keeps suppression alive while any other attempt is in
 * flight and forever once one confirmed the deletion, so no failing attempt
 * can withdraw what a concurrent successful one depends on. A delete that
 * terminated nothing and raced nothing leaves no marker behind.
 *
 * A transport throw is ambiguous — the server may have committed the delete
 * before the socket failed — and is treated as "not terminated": an event
 * that arrives later is announced rather than silently dropped, preferring a
 * visible surplus report over an invisible missing one.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildTerminateTool({ env, readServiceRecordOverride, requestFn }) {
  return {
    name: "rp_terminate",
    description: "Terminate a finished RP agent by deleting its opencode session.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        session: { type: "string", description: "Session ID of the finished agent." },
      },
      required: ["session"],
    },
    async execute({ session }) {
      const server = resolveServer({ env, readServiceRecord: readServiceRecordOverride });
      if (!server) {
        return toToolResult({ error: "server unreachable" });
      }
      beginTermination(session);
      let response;
      try {
        response = await requestServer(
          server,
          "DELETE",
          `/api/session/${session}`,
          undefined,
          requestFn,
        );
      } catch (error) {
        endTermination(session, false);
        throw error;
      }
      if (response.status === 404) {
        endTermination(session, false);
        return toToolResult({ status: 404, error: "SessionNotFoundError" });
      }
      if (response.status < 200 || response.status >= 300) {
        endTermination(session, false);
        return toToolResult({ status: response.status, error: "SessionTerminationFailed" });
      }
      endTermination(session, true);
      return toToolResult({ terminated: true });
    },
  };
}

/**
 * Build the `rp_permission_reply` tool descriptor.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildPermissionReplyTool({ env, readServiceRecordOverride, requestFn }) {
  return {
    name: "rp_permission_reply",
    description:
      "Reply to a pending permission request on an RP session: allow it once, or reject it (a message on a reject reaches the agent as corrective feedback).",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        session: { type: "string", description: "Session ID the request belongs to." },
        request: { type: "string", description: "Permission request ID." },
        reply: { type: "string", enum: ["once", "reject"], description: "The reply." },
        message: { type: "string", description: "Corrective feedback delivered on a reject." },
      },
      required: ["session", "request", "reply"],
    },
    async execute({ session, request, reply, message }) {
      const server = resolveServer({ env, readServiceRecord: readServiceRecordOverride });
      if (!server) {
        return toToolResult({ error: "server unreachable" });
      }
      const response = await replyToPermission(
        server,
        { sessionID: session, requestID: request, reply, message },
        requestFn,
      );
      if (response.status === 404) {
        return toToolResult({ status: 404, error: "PermissionNotFoundError" });
      }
      if (response.status < 200 || response.status >= 300) {
        return toToolResult({ status: response.status, error: "PermissionReplyFailed" });
      }
      return toToolResult({ replied: true });
    },
  };
}

/**
 * Build the `rp_send` tool descriptor.
 *
 * Steer delivery, so the message reaches the target at its next step
 * boundary rather than waiting for a turn to end. An agent runs one turn for
 * as long as it keeps calling tools, so queue delivery — which promotes only
 * at a turn boundary — cannot reach a working agent at all, and is discarded
 * outright if that agent is terminated while it still holds the message.
 *
 * The prompt call resolves once the message is *admitted*, not once it is
 * read. The result therefore reports `enqueued`, never "delivered", and adds
 * the target's observed state (running, queued inputs, pending permission
 * asks) when the server is reachable, so a sender can tell an about-to-deliver
 * message from one behind a blocked session.
 *
 * @param {object} ctx The plugin's opencode context, as passed to `setup`.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} [deps] `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSendTool(ctx, { env = process.env, readServiceRecordOverride, requestFn } = {}) {
  return {
    name: "rp_send",
    description:
      "Send a directed message to another RP session by session ID. The message reaches the target at its next step boundary, whether or not it is working; the result reports admission and the target's observed state, not receipt.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        to: { type: "string", description: "Target session ID." },
        message: { type: "string", description: "Message text." },
      },
      required: ["to", "message"],
    },
    async execute({ to, message }, toolCtx) {
      const sender = lookupSpawn(toolCtx.sessionID);
      const text = `${formatAttribution({
        name: sender?.name ?? toolCtx.sessionID,
        sessionID: toolCtx.sessionID,
      })} ${message}`;
      try {
        await ctx.session.prompt({ sessionID: to, text, delivery: "steer" });
      } catch (error) {
        if (isSessionNotFoundError(error)) {
          return toToolResult({ status: 404, error: "SessionNotFoundError" });
        }
        throw error;
      }

      // Best-effort target-state reads: each field is included only when its
      // read succeeds, so a failed read is absent rather than a fabricated
      // healthy value.
      const result = { enqueued: true };
      let server;
      try {
        server = resolveServer({ env, readServiceRecord: readServiceRecordOverride });
      } catch {
        return toToolResult(result);
      }
      if (server) {
        try {
          result.targetRunning = await isSessionActive(server, to, requestFn);
        } catch {
          // Left absent: the target's running state could not be read.
        }
        let inboxResponse;
        try {
          inboxResponse = await requestServer(
            server,
            "GET",
            `/api/session/${to}/inbox`,
            undefined,
            requestFn,
          );
        } catch {
          inboxResponse = null;
        }
        if (inboxResponse && inboxResponse.status >= 200 && inboxResponse.status < 300) {
          result.queueDepth = (inboxResponse.body?.data ?? []).length;
        }
        let permissionsResponse;
        try {
          permissionsResponse = await requestServer(
            server,
            "GET",
            `/api/session/${to}/permission`,
            undefined,
            requestFn,
          );
        } catch {
          permissionsResponse = null;
        }
        if (
          permissionsResponse &&
          permissionsResponse.status >= 200 &&
          permissionsResponse.status < 300
        ) {
          result.targetBlockedOnPermission = (permissionsResponse.body?.data ?? []).length > 0;
        }
      }
      return toToolResult(result);
    },
  };
}

/**
 * Build the `rp_loop_start` tool descriptor.
 *
 * @param {{ registryPath: string, tick: (entry: object) => Promise<*> }} deps
 *   `registryPath` is where the new entry is persisted; `tick` is the
 *   per-interval callback armed for it.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopStartTool({ registryPath, tick }) {
  return {
    name: "rp_loop_start",
    description:
      "Start a recurring health-loop prompt against a session, firing while idle or after two intervals without activity.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        interval: { type: "number", description: "Tick period in milliseconds." },
        prompt: { type: "string", description: "Prompt injected when a tick fires." },
        target_session: {
          type: "string",
          description: "Session watched and prompted; defaults to the calling session.",
        },
      },
      required: ["interval", "prompt"],
    },
    async execute({ interval, prompt, target_session }, toolCtx) {
      const entry = {
        id: `loop_${randomUUID()}`,
        interval,
        prompt,
        targetSession: target_session ?? toolCtx.sessionID,
      };
      addLoopEntry(registryPath, entry);
      await armLoopTimer(entry, tick);
      return toToolResult({ id: entry.id });
    },
  };
}

/**
 * Build the `rp_loop_list` tool descriptor.
 *
 * @param {string} registryPath Absolute path to the loop registry file.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopListTool(registryPath) {
  return {
    name: "rp_loop_list",
    description: "List every currently registered health loop.",
    output: ANY_OUTPUT_SCHEMA,
    input: { type: "object", properties: {} },
    async execute() {
      return toToolResult(listLoopEntries(registryPath));
    },
  };
}

/**
 * Build the `rp_loop_cancel` tool descriptor.
 *
 * @param {string} registryPath Absolute path to the loop registry file.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopCancelTool(registryPath) {
  return {
    name: "rp_loop_cancel",
    description: "Cancel a health loop, stopping further ticks.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: { id: { type: "string", description: "Loop id returned by rp_loop_start." } },
      required: ["id"],
    },
    async execute({ id }) {
      const stopped = disarmLoopTimer(id);
      try {
        deleteLoopEntry(registryPath, id);
      } finally {
        await stopped;
      }
      return toToolResult({ cancelled: true });
    },
  };
}

/**
 * Build the `rp_status` tool descriptor.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   readCliVersionOverride?: () => string | null,
 * }} deps Passed through to `buildStatusPayload`.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildStatusTool({ env, readServiceRecordOverride, requestFn, readCliVersionOverride }) {
  return {
    name: "rp_status",
    description: "Report plugin version, pin comparison, ledger snapshot, recent errors, and health-loop ticks.",
    output: ANY_OUTPUT_SCHEMA,
    input: { type: "object", properties: {} },
    async execute() {
      return toToolResult(
        await buildStatusPayload({
          env,
          readServiceRecord: readServiceRecordOverride,
          requestFn,
          readCliVersion: readCliVersionOverride,
        }),
      );
    },
  };
}

/**
 * `globalThis` key guarding the plugin's global, process-wide concerns —
 * the terminal-event listener's `ctx.event.subscribe` and the loop registry's
 * re-arm-at-setup — so they run exactly once across every per-directory
 * `setup(ctx)` re-run within one daemon process.
 */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");

/**
 * Drive the plugin's event listeners from opencode's event stream.
 *
 * `ctx.event.subscribe()` takes no handler argument — it returns an
 * `AsyncIterable` that must itself be consumed with `for await`; it is not a
 * callback-registration API. Runs for the lifetime of the daemon process
 * (never resolves under real use), so callers invoke this without awaiting it.
 *
 * @param {object} ctx The plugin's opencode context (supplies `ctx.event`).
 * @param {(event: object) => Promise<void>} onEvent Called with each event
 *   the stream yields; a rejection is caught per event so one failing event
 *   never stops the loop from consuming the next.
 * @returns {Promise<void>} Resolves only if the stream itself ends.
 */
async function consumeEvents(ctx, onEvent) {
  for await (const event of ctx.event.subscribe()) {
    await onEvent(event).catch((error) => recordError({ type: "listener.failed", error: String(error) }));
  }
}

/**
 * The RP opencode plugin's `setup` function.
 *
 * Registers the eight coordination tools and the packaged skill source on
 * every call (opencode re-runs `setup` once per directory scope); guards the
 * terminal-event listener's subscription and the loop registry's re-arm
 * behind `SETUP_ONCE_KEY` so they run exactly once per daemon process.
 * Materializes the agent profiles on every call, recording any collision
 * with a pre-existing, non-RP-owned agent file to the bounded error log
 * (observable via `rp_status`'s `recentErrors`) rather than dropping it.
 *
 * @param {object} ctx The plugin context opencode supplies: `ctx.tool`,
 *   `ctx.skill`, `ctx.agent`, `ctx.session`, `ctx.event`.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   readCliVersion?: () => string | null,
 *   agentsSourceDir?: string,
 *   agentsTargetDir?: string,
 *   resolveRepoRootFn?: (directory: string) => string | null,
 *   exists?: (path: string) => boolean,
 * }} [deps] Injectable dependencies, absent in opencode's real invocation
 *   (`setup(ctx)`) and supplied only by offline tests: `env` and
 *   `readServiceRecord` reach `resolveServer`; `requestFn` reaches the HTTP
 *   client; `readCliVersion` reaches the pin-comparison fallback;
 *   `agentsSourceDir`/`agentsTargetDir` reach `materializeAgents`;
 *   `resolveRepoRootFn` reaches `rp_spawn`; `exists` reaches the permission
 *   mediator's redirect check.
 * @returns {void}
 */
function setup(ctx, deps = {}) {
  const {
    env = process.env,
    readServiceRecord: readServiceRecordOverride,
    requestFn,
    readCliVersion: readCliVersionOverride,
    agentsSourceDir,
    agentsTargetDir,
    resolveRepoRootFn,
    exists,
  } = deps;

  const registryPath = resolveLoopRegistryPath(env);

  const tick = async (entry, isCancelled) => {
    let outcomeRecorded = false;
    const onOutcome = (outcome) => {
      const tickEntry = {
        loopID: entry.id,
        targetSession: entry.targetSession,
        at: Date.now(),
        ...outcome,
      };
      recordLoopTick(tickEntry);
      outcomeRecorded = true;
      if (outcome.outcome === "no-server") {
        recordError({
          type: "loop.tick.skipped",
          loopID: entry.id,
          reason: "server unreachable",
          at: tickEntry.at,
        });
      }
    };

    try {
      await runLoopTick(entry, {
        server: resolveServer({ env, readServiceRecord: readServiceRecordOverride }),
        isSessionActive: (server, sessionID) => isSessionActive(server, sessionID, requestFn),
        getSessionUpdatedAt: (server, sessionID) => getSessionUpdatedAt(server, sessionID, requestFn),
        injectPrompt: (sessionID, text, delivery) => ctx.session.prompt({ sessionID, text, delivery }),
        onOutcome,
        isCancelled,
      });
    } catch (error) {
      if (!outcomeRecorded) {
        onOutcome({ outcome: "failed", error: String(error) });
      }
      recordError({ type: "loop.tick.failed", loopID: entry.id, error: String(error), at: Date.now() });
    }
  };

  ctx.tool.transform((tools) => {
    tools.add(buildSpawnTool(ctx, { resolveRepoRootFn }));
    tools.add(buildSendTool(ctx, { env, readServiceRecordOverride, requestFn }));
    tools.add(buildTerminateTool({ env, readServiceRecordOverride, requestFn }));
    tools.add(buildLoopStartTool({ registryPath, tick }));
    tools.add(buildLoopListTool(registryPath));
    tools.add(buildLoopCancelTool(registryPath));
    tools.add(buildStatusTool({ env, readServiceRecordOverride, requestFn, readCliVersionOverride }));
    tools.add(buildPermissionReplyTool({ env, readServiceRecordOverride, requestFn }));
    return tools;
  });

  // Builds up to the previously pinned one took a directory source; newer ones
  // dropped `source` from the draft and take fully-formed skills through
  // `add`. Probing the draft keeps one plugin working on both, rather than
  // dying with "sources.source is not a function" on whichever build the
  // owner happens to run.
  ctx.skill.transform((skills) => {
    if (typeof skills.source === "function") {
      skills.source({ type: "directory", path: SKILLS_SOURCE_DIR });
      return skills;
    }
    for (const skill of readSkillDirectory(SKILLS_SOURCE_DIR)) {
      skills.add(skill);
    }
    return skills;
  });

  const { collisions } = materializeAgents(agentsSourceDir, agentsTargetDir ?? resolveAgentsTargetDir(env));
  for (const name of collisions) {
    recordError({ type: "agent.materialize.collision", name });
  }

  if (!globalThis[SETUP_ONCE_KEY]) {
    globalThis[SETUP_ONCE_KEY] = true;
    consumeEvents(ctx, async (event) => {
      onToolEvent(event);
      await onPermissionAsked(event, {
        ctx,
        env,
        readServiceRecord: readServiceRecordOverride,
        requestFn,
        exists,
      });
      await onTerminalEvent(event, {
        ctx,
        env,
        readServiceRecord: readServiceRecordOverride,
        requestFn,
      });
    });
    for (const entry of listLoopEntries(registryPath)) {
      void armLoopTimer(entry, tick);
    }
  }
}

export default { id: PLUGIN_ID, setup };

export {
  addLoopEntry,
  agentExists,
  appendSpawnProtocol,
  appendToErrorLog,
  armLoopTimer,
  buildBasicAuthHeader,
  buildLedgerRows,
  buildStatusPayload,
  comparePinnedBuild,
  currentToolFor,
  deleteLoopEntry,
  disarmLoopTimer,
  formatAttribution,
  formatModelString,
  formatPermissionForward,
  formatRedirectMessage,
  formatStructuredError,
  formatTitle,
  getSessionUpdatedAt,
  isSessionActive,
  isSessionNotFoundError,
  isTerminalEvent,
  listLoopEntries,
  lookupSpawn,
  materializeAgents,
  onPermissionAsked,
  onToolEvent,
  parseModelString,
  parsePermissionAsked,
  parseSkillFrontmatter,
  parseTitle,
  readCliVersion,
  readPackageVersion,
  readPinManifest,
  readServiceRecordFile,
  readSkillDirectory,
  recordSpawn,
  redirectTargets,
  replyToPermission,
  requestServer,
  resolveAgentsTargetDir,
  resolveCurrentSpawn,
  resolveLoopRegistryPath,
  resolveRepoRoot,
  resolveRunningBuild,
  resolveServer,
  runLoopTick,
  setup,
  shapeStatus,
  terminalEventError,
  terminalEventSessionID,
  toToolResult,
  toolTarget,
};
