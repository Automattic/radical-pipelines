/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM module supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, health monitoring, status).
 * Every pure helper is named-exported so it can be unit-tested offline,
 * without a running opencode daemon.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
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
 *   bySessionID: Map<string, { name: string, run: string, spawner: string }>,
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
 * @param {{ name: string, run: string, spawner: string }} entry The spawned
 *   instance's run-unique name, the run it belongs to, and the session ID
 *   of the agent that spawned it.
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
 * @returns {{ name: string, run: string, spawner: string } | undefined} The
 *   entry recorded for `sessionID`, or `undefined` if no spawn was ever
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
 * Each entry carries enough to re-arm a `setInterval` after a restart: the
 * loop id, its tick interval, the prompt to inject, and the session it
 * targets.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry
 *   The loop entry to add. `id` uniquely identifies the loop; `interval` is
 *   the tick period in milliseconds; `prompt` is the text injected on an idle
 *   tick; `targetSession` is the session ID the loop watches and prompts.
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

/**
 * Fetch the process-wide map of armed loop timers, creating it on first use.
 *
 * @returns {Map<string, NodeJS.Timeout>} The singleton map from loop id to
 *   its live `setInterval` handle.
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
 * @param {(entry: object) => void} tick Called with `entry` on every tick.
 * @returns {void}
 */
function armLoopTimer(entry, tick) {
  disarmLoopTimer(entry.id);
  getLoopTimers().set(
    entry.id,
    setInterval(() => tick(entry), entry.interval),
  );
}

/**
 * Disarm a loop's timer by loop id.
 *
 * Disarming an id with no armed timer (never armed, or already disarmed) is
 * a no-op.
 *
 * @param {string} id The loop id to disarm.
 * @returns {void}
 */
function disarmLoopTimer(id) {
  const timers = getLoopTimers();
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
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
 *   injectPrompt: (sessionID: string, text: string) => Promise<*>,
 *   onSkippedNoServer: (entry: object) => void,
 * }} deps The tick's effects: the resolved server (or `null` when
 *   unreachable, see `resolveServer`), the idle check, the prompt injector,
 *   and a logger invoked when the tick is skipped for lack of a reachable
 *   server.
 * @returns {Promise<"no-server" | "busy" | "injected">} What the tick did.
 */
async function runLoopTick(entry, { server, isSessionActive, injectPrompt, onSkippedNoServer }) {
  if (!server) {
    onSkippedNoServer(entry);
    return "no-server";
  }
  const active = await isSessionActive(server, entry.targetSession);
  if (active) {
    return "busy";
  }
  await injectPrompt(entry.targetSession, entry.prompt);
  return "injected";
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
 * @param {Record<string, string | undefined>} env Environment used to
 *   resolve the service record's directory (see `resolveServiceRecordDir`).
 * @returns {{ id: string, version: string, url: string, pid: number, password: string } | null}
 *   The parsed record, or `null` when its directory or a `service-*.json`
 *   file inside it does not exist.
 */
function readServiceRecordFile(env) {
  const dir = resolveServiceRecordDir(env);
  if (!existsSync(dir)) {
    return null;
  }
  const fileName = readdirSync(dir).find(
    (entryName) => entryName.startsWith("service-") && entryName.endsWith(".json"),
  );
  if (!fileName) {
    return null;
  }
  return JSON.parse(readFileSync(join(dir, fileName), "utf8"));
}

/**
 * Resolve how to reach the running opencode server, offline-testably.
 *
 * Tries the daemon case first (a service record on disk), then the
 * `serve`/harness case (env overrides), then gives up. Both dependencies are
 * injectable so this never touches the real filesystem or environment in a
 * test.
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
 * @param {"GET" | "POST"} method The HTTP method.
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
 */
async function isSessionActive(server, sessionID, requestFn) {
  const response = await requestServer(server, "GET", "/api/session/active", undefined, requestFn);
  const active = response.body?.data;
  return Boolean(active && Object.prototype.hasOwnProperty.call(active, sessionID));
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
 * @param {Set<string>} activeSessionIDs Session IDs opencode reports running
 *   now (see `isSessionActive`).
 * @param {(sessionID: string) => number} pendingCountFor Resolves a
 *   session's pending-input count.
 * @returns {Array<{name: string, sessionID: string, agent: string, model: string, directory: string, updated: *, running: boolean, pending: number}>}
 *   One row per session record RP recognizes as its own, in `sessionRecords`
 *   order; records RP does not recognize (neither ledger nor `rp:` title)
 *   are omitted.
 */
function buildLedgerRows(sessionRecords, lookup, activeSessionIDs, pendingCountFor) {
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
      running: activeSessionIDs.has(record.id),
      pending: pendingCountFor(record.id),
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
  let activeIDs = new Set();
  const pendingCounts = new Map();

  if (server) {
    // Every opencode HTTP GET response envelopes its payload as
    // `{ data: ... }` — verified live against the pinned build.
    const sessionsResponse = await requestServer(server, "GET", "/api/session", undefined, requestFn);
    sessionRecords = sessionsResponse.body?.data ?? [];
    const activeResponse = await requestServer(server, "GET", "/api/session/active", undefined, requestFn);
    activeIDs = new Set(Object.keys(activeResponse.body?.data ?? {}));
    for (const record of sessionRecords) {
      const pendingResponse = await requestServer(
        server,
        "GET",
        `/api/session/${record.id}/pending`,
        undefined,
        requestFn,
      );
      pendingCounts.set(record.id, (pendingResponse.body?.data ?? []).length);
    }
  }

  const ledgerEntries = buildLedgerRows(
    sessionRecords,
    lookupSpawn,
    activeIDs,
    (id) => pendingCounts.get(id) ?? 0,
  );

  return shapeStatus({
    pluginVersion: PLUGIN_ID,
    pinComparison,
    ledgerEntries,
    errorLog: getErrorLog(),
  });
}

/**
 * `globalThis` key backing the process-wide set of child session IDs already
 * notified to their spawner.
 *
 * Enforces "notify on the first terminal event only" across every
 * per-directory `setup(ctx)` re-run, the same way `LEDGER_KEY` shares the
 * spawn ledger.
 */
const NOTIFIED_CHILDREN_KEY = Symbol.for("radical-pipelines.opencode.notifiedChildren");

/**
 * Fetch the process-wide set of already-notified child session IDs,
 * creating it on first use.
 *
 * @returns {Set<string>} The singleton set.
 */
function getNotifiedChildren() {
  if (!globalThis[NOTIFIED_CHILDREN_KEY]) {
    globalThis[NOTIFIED_CHILDREN_KEY] = new Set();
  }
  return globalThis[NOTIFIED_CHILDREN_KEY];
}

/**
 * `globalThis` key backing the bounded, in-memory recent-errors ring the
 * completion listener and loop scheduler append to.
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

/** Event types the completion listener treats as terminal for a session. */
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
 * Handle one event delivered to the completion listener.
 *
 * Ignores non-terminal events and terminal events on sessions RP did not
 * spawn. For a recognized child's terminal event: always records it in the
 * bounded error log — including, for a failed event, the structured error it
 * carries, so `rp_status`'s `recentErrors` reports the cause; on the child's
 * *first* terminal event only, notifies the spawner (queue delivery) and
 * re-asserts the child's durable `rp:` title over the reach helper. The
 * notification text names the terminal outcome — "succeeded" or "failed" —
 * so a first-turn spawn failure reads as a failure rather than as a false
 * success, and a failure notification carries the structured error's cause.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @param {{
 *   ctx: object,
 *   env: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps `ctx` supplies `ctx.session.prompt` for the notification; the rest
 *   resolve the server for the title re-assert.
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

  const error = terminalEventError(event);
  const logEntry = { type: event.type, sessionID, at: Date.now() };
  if (error !== undefined) {
    logEntry.error = error;
  }
  recordError(logEntry);

  const notified = getNotifiedChildren();
  if (notified.has(sessionID)) {
    return;
  }
  notified.add(sessionID);

  const outcome = event.type === "session.execution.succeeded" ? "succeeded" : "failed";
  const cause =
    outcome === "failed" && error !== undefined
      ? ` Cause: ${formatStructuredError(error)}`
      : "";
  await ctx.session.prompt({
    sessionID: entry.spawner,
    text: `[rp] ${entry.name} (${sessionID}) ${outcome} on its first turn.${cause}`,
    delivery: "queue",
  });

  const server = resolveServer({ env, readServiceRecord });
  if (server) {
    await requestServer(
      server,
      "POST",
      `/api/session/${sessionID}/rename`,
      { title: formatTitle({ run: entry.run, name: entry.name }) },
      requestFn,
    );
  }
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
 *     running: boolean,
 *     pending: number,
 *   }>,
 *   errorLog: Array<*>,
 * }} input The status payload's components. `pluginVersion` identifies the
 *   running plugin build; `pinComparison` is the result of comparing the
 *   running opencode build against the pin; `ledgerEntries` is one row per
 *   live spawn; `errorLog` is the bounded recent-errors ring.
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
 *     running: boolean,
 *     pending: number,
 *   }>,
 *   recentErrors: Array<*>,
 * }} The shaped `rp_status` result.
 */
function shapeStatus({ pluginVersion, pinComparison, ledgerEntries, errorLog }) {
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
    })),
    recentErrors: errorLog,
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
 * process's working directory. Registered as a skill source by reference —
 * never copied — in `setup`.
 */
const SKILLS_SOURCE_DIR = fileURLToPath(new URL("../skills", import.meta.url));

/**
 * Wrap a tool's computed result into the shape opencode's dynamic
 * (`jsonSchema`-based) tool contract requires: `{ structured, content }`.
 * Any other return shape from `execute` — a bare string, a plain object
 * missing either key — surfaces to the calling agent as a generic "Tool
 * execution failed", regardless of the value actually computed.
 *
 * @param {*} value The tool's computed result.
 * @returns {{ structured: *, content: Array<{ type: "text", text: string }> }}
 *   `structured` is the value calling code receives back; `content` is its
 *   human-readable rendering (the string itself when `value` already is one,
 *   else its JSON form).
 */
function toToolResult(value) {
  return {
    structured: value,
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
  };
}

/**
 * Build the `rp_spawn` tool descriptor.
 *
 * @param {object} ctx The plugin's opencode context, as passed to `setup`.
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSpawnTool(ctx) {
  return {
    name: "rp_spawn",
    description:
      "Spawn a new named RP agent instance as an opencode session seated in a directory.",
    jsonSchema: {
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
      recordSpawn(session.id, { name, run, spawner: toolCtx.sessionID });
      await ctx.session.prompt({ sessionID: session.id, text: prompt, delivery: "queue" });
      return toToolResult(session.id);
    },
  };
}

/**
 * Build the `rp_send` tool descriptor.
 *
 * @param {object} ctx The plugin's opencode context, as passed to `setup`.
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSendTool(ctx) {
  return {
    name: "rp_send",
    description: "Send a directed, queue-delivered message to another RP session by session ID.",
    jsonSchema: {
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
        await ctx.session.prompt({ sessionID: to, text, delivery: "queue" });
        return toToolResult({ delivered: true });
      } catch (error) {
        if (isSessionNotFoundError(error)) {
          return toToolResult({ status: 404, error: "SessionNotFoundError" });
        }
        throw error;
      }
    },
  };
}

/**
 * Build the `rp_loop_start` tool descriptor.
 *
 * @param {{ registryPath: string, tick: (entry: object) => Promise<*> }} deps
 *   `registryPath` is where the new entry is persisted; `tick` is the
 *   per-interval callback armed for it.
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopStartTool({ registryPath, tick }) {
  return {
    name: "rp_loop_start",
    description:
      "Start a recurring health-loop prompt against a session, firing only while it is idle.",
    jsonSchema: {
      type: "object",
      properties: {
        interval: { type: "number", description: "Tick period in milliseconds." },
        prompt: { type: "string", description: "Prompt injected on an idle tick." },
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
      armLoopTimer(entry, tick);
      return toToolResult({ id: entry.id });
    },
  };
}

/**
 * Build the `rp_loop_list` tool descriptor.
 *
 * @param {string} registryPath Absolute path to the loop registry file.
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopListTool(registryPath) {
  return {
    name: "rp_loop_list",
    description: "List every currently registered health loop.",
    jsonSchema: { type: "object", properties: {} },
    async execute() {
      return toToolResult(listLoopEntries(registryPath));
    },
  };
}

/**
 * Build the `rp_loop_cancel` tool descriptor.
 *
 * @param {string} registryPath Absolute path to the loop registry file.
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildLoopCancelTool(registryPath) {
  return {
    name: "rp_loop_cancel",
    description: "Cancel a health loop, stopping further ticks.",
    jsonSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Loop id returned by rp_loop_start." } },
      required: ["id"],
    },
    async execute({ id }) {
      disarmLoopTimer(id);
      deleteLoopEntry(registryPath, id);
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
 * @returns {{name: string, description: string, jsonSchema: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildStatusTool({ env, readServiceRecordOverride, requestFn, readCliVersionOverride }) {
  return {
    name: "rp_status",
    description: "Report plugin version, pin comparison, ledger snapshot, and recent errors.",
    jsonSchema: { type: "object", properties: {} },
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
 * the completion listener's `ctx.event.subscribe` and the loop registry's
 * re-arm-at-setup — so they run exactly once across every per-directory
 * `setup(ctx)` re-run within one daemon process.
 */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");

/**
 * Drive the completion listener from opencode's event stream.
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
 * Registers the six coordination tools and the packaged skill source on
 * every call (opencode re-runs `setup` once per directory scope); guards the
 * completion listener's event subscription and the loop registry's re-arm
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
 * }} [deps] Injectable dependencies, absent in opencode's real invocation
 *   (`setup(ctx)`) and supplied only by offline tests: `env` and
 *   `readServiceRecord` reach `resolveServer`; `requestFn` reaches the HTTP
 *   client; `readCliVersion` reaches the pin-comparison fallback;
 *   `agentsSourceDir`/`agentsTargetDir` reach `materializeAgents`.
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
  } = deps;

  const registryPath = resolveLoopRegistryPath(env);

  const tick = (entry) =>
    runLoopTick(entry, {
      server: resolveServer({ env, readServiceRecord: readServiceRecordOverride }),
      isSessionActive: (server, sessionID) => isSessionActive(server, sessionID, requestFn),
      injectPrompt: (sessionID, text) => ctx.session.prompt({ sessionID, text, delivery: "queue" }),
      onSkippedNoServer: (loopEntry) =>
        recordError({ type: "loop.tick.skipped", loopID: loopEntry.id, reason: "server unreachable" }),
    }).catch((error) =>
      recordError({ type: "loop.tick.failed", loopID: entry.id, error: String(error) }),
    );

  ctx.tool.transform((tools) => {
    tools.add(buildSpawnTool(ctx));
    tools.add(buildSendTool(ctx));
    tools.add(buildLoopStartTool({ registryPath, tick }));
    tools.add(buildLoopListTool(registryPath));
    tools.add(buildLoopCancelTool(registryPath));
    tools.add(buildStatusTool({ env, readServiceRecordOverride, requestFn, readCliVersionOverride }));
    return tools;
  });

  ctx.skill.transform((sources) => sources.source({ type: "directory", path: SKILLS_SOURCE_DIR }));

  const { collisions } = materializeAgents(agentsSourceDir, agentsTargetDir ?? resolveAgentsTargetDir(env));
  for (const name of collisions) {
    recordError({ type: "agent.materialize.collision", name });
  }

  if (!globalThis[SETUP_ONCE_KEY]) {
    globalThis[SETUP_ONCE_KEY] = true;
    consumeEvents(ctx, (event) =>
      onTerminalEvent(event, {
        ctx,
        env,
        readServiceRecord: readServiceRecordOverride,
        requestFn,
      }),
    );
    for (const entry of listLoopEntries(registryPath)) {
      armLoopTimer(entry, tick);
    }
  }
}

export default { id: PLUGIN_ID, setup };

export {
  addLoopEntry,
  agentExists,
  appendToErrorLog,
  armLoopTimer,
  buildBasicAuthHeader,
  buildLedgerRows,
  buildStatusPayload,
  comparePinnedBuild,
  deleteLoopEntry,
  disarmLoopTimer,
  formatAttribution,
  formatModelString,
  formatStructuredError,
  formatTitle,
  isSessionActive,
  isSessionNotFoundError,
  isTerminalEvent,
  listLoopEntries,
  lookupSpawn,
  materializeAgents,
  parseModelString,
  parseTitle,
  readCliVersion,
  readPackageVersion,
  readPinManifest,
  readServiceRecordFile,
  recordSpawn,
  requestServer,
  resolveAgentsTargetDir,
  resolveCurrentSpawn,
  resolveLoopRegistryPath,
  resolveRunningBuild,
  resolveServer,
  runLoopTick,
  setup,
  shapeStatus,
  terminalEventError,
  terminalEventSessionID,
  toToolResult,
};
