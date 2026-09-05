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
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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
 * Append the opencode session protocol — messaging and turns — to a spawned
 * agent's initial prompt.
 *
 * The turn rule exists because an opencode session outlives its turn: an
 * idle session resumes only on an inbox item. Verified live against the
 * pinned build: a `shell` call with `background: true` ends the turn and its
 * completion later arrives as an inbox item that starts a new execution — so
 * awaiting it is a legitimate reason to end the turn — but background
 * commands carry no timeout by default, so a hung one never completes and
 * the session is parked until someone nudges it. A detached process has no
 * wake source at all. Foreground waits keep the agent observing, and a
 * foreground command's timeout hands it the hang signal a detached process
 * never does.
 *
 * @param {string} prompt The caller-authored initial prompt.
 * @param {string} spawnerID The calling session's authoritative ID.
 * @returns {string} The original prompt followed by the runtime protocol.
 */
function appendSpawnProtocol(prompt, spawnerID) {
  return `${prompt}\n\n## RP messaging (opencode)\n\n**Spawner identifier:** ${spawnerID}\n\nOnly \`rp_send\` routes a message to another session. Send every message required by your profile with \`rp_send\`: your prompt's **Requester** is the agent ID to address what your profile sends to its requester; the orchestrator is the **Spawner identifier** above. Your own agent ID is this session's ID.\n\n## RP turns (opencode)\n\nEnding your turn is a stop: only a message resumes this session — a reply you await, or the completion notice of a background command you gave a \`timeout\`. Anything else you are waiting on holds your turn: wait with foreground commands that have a timeout, compare progress between checks, and treat unchanged progress as a stall to act on.`;
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
 * Cap on consecutive ticks the failed-probe backoff skips (see
 * `runLoopTick`): at the default 15-minute interval the effective cadence
 * bottoms out at one injection every ~2 hours.
 */
const LOOP_BACKOFF_MAX_SKIPS = 7;

/**
 * Wall-clock window a dead-stream suspect must stay frozen before its
 * interrupt is authorized (see `runLoopTick`'s dead-stream guard).
 *
 * A raw response chunk observed by the location's `http.response` tee
 * proves liveness, but no observable signal proves death: a stream that
 * legitimately pauses longer than any finite window is indistinguishable
 * from one whose connection silently died. Interrupting after this window
 * of *total* byte-and-event silence is therefore an accepted, documented
 * heuristic (per #261's amended constraint), tuned so that a false
 * positive — a live provider sending nothing at all for a full hour on a
 * connection nothing else killed first — is beyond any observed provider
 * behavior, while a genuine hang still recovers unattended the same day
 * it happens rather than whenever a human notices. Overridable via
 * `RP_LOOP_DEAD_STREAM_CONFIRM_MS` so the integration harness can exercise
 * the confirmation without hour-long waits.
 */
const LOOP_DEAD_STREAM_CONFIRM_MS = 3_600_000;

/**
 * Deadline on one health-loop tick (see `armLoopTimer`).
 *
 * A tick's own reads and writes are each bounded by
 * `SERVER_REQUEST_TIMEOUT_MS`, so this sits well above the longest tick
 * path's request budget: it fires only on a tick that has genuinely hung,
 * never on one that is merely slow. Its purpose is the timer's invariant
 * that an in-flight tick always settles — the loop re-arms from the tick's
 * completion, and disarming (cancel, re-arm, plugin cleanup) waits for it —
 * so no single stuck tick can silently kill the loop or wedge whoever
 * waits on it.
 */
const LOOP_TICK_TIMEOUT_MS = 120_000;



/**
 * Resolve the dead-stream confirmation window from the environment.
 *
 * @param {Record<string, string | undefined>} env The process environment.
 * @returns {number} The override when it parses to a positive number, else
 *   `LOOP_DEAD_STREAM_CONFIRM_MS`.
 */
function resolveDeadStreamConfirmMs(env) {
  const override = Number(env.RP_LOOP_DEAD_STREAM_CONFIRM_MS);
  return Number.isFinite(override) && override > 0 ? override : LOOP_DEAD_STREAM_CONFIRM_MS;
}

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
 * @param {(entry: object, isCancelled: () => boolean, runtime: object) => void | Promise<void>} tick
 *   Called with `entry`, its cancellation state, and the loop's mutable
 *   runtime state (see `runLoopTick`'s `state` dep) on every tick. The
 *   runtime object lives as long as the armed timer, so tick-to-tick memory
 *   (backoff, last injection) survives between ticks and resets on re-arm.
 *   A tick still pending after `tickTimeoutMs` is abandoned: it is recorded
 *   as a `timeout` tick and a `loop.tick.timeout` error, its `isCancelled`
 *   reports `true` from then on so it performs no further effect, and the
 *   loop re-arms without it.
 * @param {number} [tickTimeoutMs] The per-tick deadline; defaults to
 *   `LOOP_TICK_TIMEOUT_MS`.
 * @returns {Promise<void>} Resolves when any replaced loop has stopped and
 *   the new timer is armed.
 */
function armLoopTimer(entry, tick, tickTimeoutMs = LOOP_TICK_TIMEOUT_MS) {
  const timers = getLoopTimers();
  const previous = timers.get(entry.id);
  const previousStopped = previous ? stopLoopTimer(previous) : Promise.resolve();
  const state = { timer: undefined, inFlight: null, ready: undefined, cancelled: false, runtime: {} };
  const schedule = () => {
    state.timer = setTimeout(() => {
      state.timer = undefined;
      if (state.cancelled) return;
      let abandoned = false;
      let deadline;
      const expired = new Promise((resolve) => {
        deadline = setTimeout(() => {
          abandoned = true;
          const at = Date.now();
          recordLoopTick({ loopID: entry.id, targetSession: entry.targetSession, at, outcome: "timeout" });
          recordError({ type: "loop.tick.timeout", loopID: entry.id, timeoutMs: tickTimeoutMs, at });
          resolve();
        }, tickTimeoutMs);
      });
      const running = Promise.resolve().then(() => tick(entry, () => state.cancelled || abandoned, state.runtime));
      state.inFlight = Promise.race([running, expired])
        .catch(() => {})
        .finally(() => {
          clearTimeout(deadline);
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
 * Decide whether an assistant message is a provably dead stream.
 *
 * The signature — observed live on a hung session — is an in-flight message
 * (no `finish`, no `error`) whose last content part is a tool call stuck in
 * `streaming`: the provider connection died while the tool call's arguments
 * were still arriving, so the tool never executed and the turn can never
 * reach a step boundary. A tool part in `running` state is a tool actually
 * executing (possibly a long build or test run) and is never treated as
 * dead.
 *
 * @param {object | null} message The session's newest assistant message.
 * @returns {boolean} `true` only for the dead-stream signature.
 */
function isDeadStreamMessage(message) {
  if (!message || message.finish !== undefined || message.error !== undefined) {
    return false;
  }
  const parts = Array.isArray(message.content) ? message.content : [];
  const last = parts[parts.length - 1];
  if (!last || last.type !== "tool" || last.state?.status !== "streaming") {
    return false;
  }
  // Completed tool calls execute concurrently with the rest of the stream,
  // so `[running, streaming]` is a legitimate shape: an executing tool
  // anywhere in the message is observable work and vetoes the signature.
  return !parts.some((part) => part.type === "tool" && part.state?.status === "running");
}

/**
 * `globalThis` key backing the per-target interrupt serialization chain.
 *
 * Stored on `globalThis` for the same re-import rationale as `LEDGER_KEY`:
 * two loops targeting one session must serialize their confirm-and-interrupt
 * sequences whichever scope armed them.
 */
const TARGET_INTERRUPT_LOCKS_KEY = Symbol.for("radical-pipelines.opencode.targetInterruptLocks");

/**
 * `globalThis` key backing the per-target last-interrupt timestamps.
 */
const TARGET_INTERRUPT_AT_KEY = Symbol.for("radical-pipelines.opencode.targetInterruptAt");

/**
 * Run `fn` holding the target's interrupt lock, serializing with every
 * other confirm-and-interrupt sequence aimed at the same session.
 *
 * @param {string} sessionID The target session.
 * @param {() => Promise<T>} fn The critical section.
 * @returns {Promise<T>} `fn`'s result.
 * @template T
 */
async function withTargetInterruptLock(sessionID, fn) {
  if (!globalThis[TARGET_INTERRUPT_LOCKS_KEY]) {
    globalThis[TARGET_INTERRUPT_LOCKS_KEY] = new Map();
  }
  const locks = globalThis[TARGET_INTERRUPT_LOCKS_KEY];
  const previous = locks.get(sessionID) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  locks.set(sessionID, tail);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(sessionID) === tail) {
      locks.delete(sessionID);
    }
  }
}

/**
 * Record the last dead-stream interrupt issued against a target, so a
 * second loop whose suspicion predates it never interrupts the successor
 * execution the first interrupt resumed. Recorded only after the interrupt
 * request succeeded — a failed request records nothing, leaving the next
 * confirmation free to retry. Shares the age-only retention of every other
 * evidence map: safety records age out, they are never crowded out.
 */
function recordTargetInterrupt(sessionID, at) {
  recordSessionObservation(TARGET_INTERRUPT_AT_KEY, sessionID, at);
}

/** @param {string} sessionID @returns {number | undefined} */
function lastTargetInterruptAt(sessionID) {
  return getSessionObservationMap(TARGET_INTERRUPT_AT_KEY).get(sessionID);
}

/**
 * Fingerprint a dead-stream candidate for the two-observation confirmation.
 *
 * A session-level stale timestamp says nothing about the *stream's* own
 * freshness — a healthy tool call whose header just arrived can coexist
 * with an old session timestamp — so a candidate is never interrupted on
 * first sight. The fingerprint alone cannot prove death either: the
 * projected transcript keeps `state.input` empty while incomplete JSON
 * arguments stream, so an identical fingerprint is necessary but not
 * sufficient — confirmation additionally requires *event silence* for the
 * session since the suspicion was recorded (see `recordSessionEventActivity`;
 * streaming deltas emit events even though the projection is unchanged).
 *
 * @param {object} message A message matching `isDeadStreamMessage`.
 * @returns {string} A fingerprint of the projected stream state.
 */
function deadStreamFingerprint(message) {
  const parts = Array.isArray(message.content) ? message.content : [];
  const last = parts[parts.length - 1];
  const args = last?.state?.input;
  const argsLength = typeof args === "string" ? args.length : JSON.stringify(args ?? "").length;
  return `${message.id ?? ""}:${parts.length}:${last?.id ?? ""}:${argsLength}`;
}

/** Whether an assistant message is a finished turn (successful or failed). */
function isFinishedTurn(message) {
  return message.finish !== undefined || message.error !== undefined;
}

/**
 * Locate the turn that responded to this loop's injected input.
 *
 * Anchored on the admitted input's message ID, so a concurrent, unrelated
 * turn that starts during the admission round trip is never mistaken for
 * the probe's response: the responding turn is the assistant message
 * immediately following the injected input in the transcript. The
 * injection timestamp is only a fallback for an injection whose admitted
 * ID could not be captured.
 *
 * @param {Array<object>} messages The session's messages, newest first.
 * @param {{id?: string, at: number}} injection The recorded injection.
 * @returns {{status: "none" | "undelivered" | "awaiting-response"} | {status: "finished", message: object}}
 *   `none` — nothing attributable exists (fallback anchoring only);
 *   `undelivered` — the input is not in the read transcript page: still
 *   parked, vanished, or aged past the page boundary — the branches
 *   disambiguate via the inbox and supersede a vanished anchor rather than
 *   wait on it; `awaiting-response` — the input was delivered but its
 *   responding turn has not finished; `finished` — the responding turn,
 *   ready to classify.
 */
function findProbeResponse(messages, injection) {
  if (!injection.id) {
    const finished = messages.find((message) => message.type === "assistant" && isFinishedTurn(message));
    if (!finished || (finished.time?.created ?? 0) < injection.at) {
      return { status: "none" };
    }
    return { status: "finished", message: finished };
  }
  const index = messages.findIndex((message) => message.id === injection.id);
  if (index === -1) {
    return { status: "undelivered" };
  }
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].type === "assistant") {
      return isFinishedTurn(messages[i])
        ? { status: "finished", message: messages[i] }
        : { status: "awaiting-response" };
    }
  }
  return { status: "awaiting-response" };
}

/**
 * Classify the outcome of this loop's previous injection, once, from the
 * turn that responded to it (see `findProbeResponse`).
 *
 * A verdict exists only when the responding turn has finished: an error is
 * a failed probe (the injection accomplished nothing — network outage,
 * provider quota exhaustion, auth failure; the class is irrelevant) and
 * escalates the backoff; any other finish is a success and ends the
 * backoff. An undelivered input or an unfinished responding turn yields a
 * pending status instead, leaving the injection unevaluated for a later
 * tick — a probe still failing slowly is never counted as healthy
 * activity. `lastInjection.evaluated` flips only here, after the message
 * read has already succeeded, so a failed read never consumes the
 * evaluation.
 *
 * @param {{ lastInjection?: {id?: string, at: number, evaluated: boolean}, backoffLevel?: number, backoffSkips?: number }} state
 *   The loop's mutable tick-to-tick memory.
 * @param {Array<object>} messages The target's messages, newest first.
 * @returns {{verdict: "failed", level: number, skips: number} | {verdict: "succeeded"} | {pending: string} | null}
 *   The verdict, a pending status while the probe's outcome is not yet
 *   decidable, or `null` when there is nothing to evaluate.
 */
function evaluateProbe(state, messages) {
  if (!state.lastInjection || state.lastInjection.evaluated) {
    return null;
  }
  const response = findProbeResponse(messages, state.lastInjection);
  if (response.status !== "finished") {
    return response.status === "none" ? null : { pending: response.status };
  }
  state.lastInjection.evaluated = true;
  if (response.message.finish === "error" || response.message.error !== undefined) {
    return { verdict: "failed", ...recordFailedProbe(state) };
  }
  state.backoffLevel = 0;
  state.backoffSkips = 0;
  return { verdict: "succeeded" };
}

/**
 * Record one failed probe: consume the evaluation and escalate the backoff.
 *
 * Shared by `evaluateProbe` (an error-finish responding turn) and the idle
 * branch's no-response rule (a delivered probe with no responding turn on
 * an idle target — nothing is processing, so none is coming).
 *
 * @param {object} state The loop's mutable tick-to-tick memory.
 * @returns {{level: number, skips: number}} The escalated backoff.
 */
function recordFailedProbe(state) {
  state.lastInjection.evaluated = true;
  state.backoffLevel = (state.backoffLevel ?? 0) + 1;
  state.backoffSkips = Math.min(2 ** state.backoffLevel - 1, LOOP_BACKOFF_MAX_SKIPS);
  return { level: state.backoffLevel, skips: state.backoffSkips };
}

/**
 * Execute one health-loop tick.
 *
 * Pure aside from its injected effects, so a tick can be exercised
 * synchronously in tests without a live server, a real timer, or a real
 * opencode session.
 *
 * Beyond the base idle-queue / stale-steer behavior, three guards keep the
 * loop from flooding or losing a target that cannot make progress:
 *
 * - **Coalescing** — a tick that finds this loop's prompt still pending in
 *   the target's inbox, or delivered to an *active* target with its
 *   responding turn not yet finished, injects nothing: a probe is never
 *   duplicated while its predecessor's outcome is undecided. On the stale
 *   path a pending *queue* copy is promoted to steer delivery in place (a
 *   parked queue item cannot reach a running session; a steer can) rather
 *   than injected again. An anchor found in neither the inbox nor the
 *   transcript page (vanished or aged out) is superseded, never waited on.
 * - **Failed-probe backoff** — each injection is evaluated once, against
 *   the turn that responded to it (see `evaluateProbe`), on whichever
 *   branch first observes that turn finished; a failed probe makes the
 *   loop skip the next `2^level - 1` injection opportunities — queue and
 *   steer alike — capped at `LOOP_BACKOFF_MAX_SKIPS`. A delivered probe
 *   with no responding turn on an *idle* target is a failed probe too:
 *   nothing is processing, so no response is coming. Every tick still
 *   inspects the target — the backoff suppresses injections, never
 *   observation or escalation — and the first successful turn ends it, so
 *   the pipeline resumes on the first probe after conditions clear.
 * - **Dead-stream escalation** — a target that is active yet stale with
 *   the dead-stream signature (see `isDeadStreamMessage`) is suspected on
 *   first observation and interrupted only once the same projected
 *   fingerprint (see `deadStreamFingerprint`) has stayed frozen for the
 *   whole wall-clock confirmation window (`deadStreamConfirmMs`) with
 *   *no observed liveness*: neither raw provider-response chunks (the
 *   authoritative signal, teed per location by the `http.response` hook —
 *   see `observeHttpResponse`) nor execution-progress events (see
 *   `recordSessionEventActivity`). Liveness signals are strictly vetoes
 *   that re-arm the window — their absence alone never authorizes; and
 *   silence itself only counts where bytes were once observed: a target
 *   with no raw-progress record at all has unknown coverage and is never
 *   escalated (`dead-stream-unobserved`). Confirmation and interrupt run
 *   serialized
 *   per target (`withTargetLock`), skipping targets another loop already
 *   interrupted after this suspicion began, and a final
 *   fingerprint-and-liveness revalidation runs inside the lock immediately
 *   before the interrupt. The interrupt runs with `continue=true`, after
 *   promoting any parked queue copy of the prompt so the resumed execution
 *   delivers it, and clears the skip window so the freed target is
 *   re-probed on the next tick. Recovery is never delayed by coalescing or
 *   backoff; a target genuinely inside a long or still-streaming tool call
 *   is left alone.
 *
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry
 *   The loop entry being ticked.
 * @param {{
 *   server: {baseURL: string, password: string} | null,
 *   isSessionActive: (server: object, sessionID: string) => Promise<boolean>,
 *   getSessionUpdatedAt: (server: object, sessionID: string) => Promise<number>,
 *   getInbox: (server: object, sessionID: string) => Promise<Array<object>>,
 *   getMessages: (server: object, sessionID: string) => Promise<Array<object>>,
 *   getLastEventAt: (sessionID: string) => number | undefined,
 *   getRawProgressAt: (sessionID: string) => number | undefined,
 *   getLastInterruptAt: (sessionID: string) => number | undefined,
 *   recordInterrupt: (sessionID: string, at: number) => void,
 *   withTargetLock: (sessionID: string, fn: () => Promise<object>) => Promise<object>,
 *   injectPrompt: (sessionID: string, text: string, delivery: "queue" | "steer") => Promise<*>,
 *   promoteInboxItem: (server: object, sessionID: string, inboxID: string) => Promise<*>,
 *   interruptSession: (server: object, sessionID: string) => Promise<*>,
 *   onOutcome: (outcome: object) => void,
 *   isCancelled?: () => boolean,
 *   now?: () => number,
 *   deadStreamConfirmMs?: number,
 *   state?: {
 *     lastInjection?: {id?: string, at: number, evaluated: boolean},
 *     backoffLevel?: number,
 *     backoffSkips?: number,
 *     deadStreamSuspect?: {fingerprint: string, at: number},
 *   },
 * }} deps The tick's effects: the resolved server (or `null` when
 *   unreachable, see `resolveServer`), session-state reads, the prompt
 *   injector (whose resolved value is the admitted input record — its ID
 *   anchors probe evaluation), the queue-to-steer promotion, the interrupt
 *   escalation, and the outcome recorder. `now` defaults to `Date.now`.
 *   `state` is the loop's mutable tick-to-tick memory, owned by the armed
 *   timer (see `armLoopTimer`); it defaults to a throwaway object so a
 *   bare call behaves like a first tick.
 * @returns {Promise<object>} The recorded outcome.
 */
async function runLoopTick(
  entry,
  {
    server,
    isSessionActive,
    getSessionUpdatedAt: readUpdatedAt,
    getInbox: readInbox,
    getMessages: readMessages,
    getLastEventAt = () => undefined,
    getRawProgressAt = () => undefined,
    getLastInterruptAt = () => undefined,
    recordInterrupt = () => {},
    withTargetLock = (sessionID, fn) => fn(),
    injectPrompt,
    promoteInboxItem: promote,
    interruptSession: interrupt,
    onOutcome,
    isCancelled = () => false,
    now = Date.now,
    deadStreamConfirmMs = LOOP_DEAD_STREAM_CONFIRM_MS,
    state = {},
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
        result = await runIdleTick(entry, {
          server,
          isSessionActive,
          readInbox,
          readMessages,
          injectPrompt,
          isCancelled,
          now,
          state,
        });
      } else {
        result = await runActiveTick(entry, {
          server,
          readUpdatedAt,
          readInbox,
          readMessages,
          getLastEventAt,
          getRawProgressAt,
          getLastInterruptAt,
          recordInterrupt,
          withTargetLock,
          injectPrompt,
          promote,
          interrupt,
          isCancelled,
          now,
          deadStreamConfirmMs,
          state,
        });
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
 * Perform one injection and record it as the loop's last probe, anchored on
 * the admitted input's message ID when the injector surfaces one.
 *
 * The timestamp is taken before the admission round trip — the server
 * schedules execution without joining it, so a turn can start (and fail)
 * before admission resolves — and serves only as the anchoring fallback.
 *
 * @param {{ prompt: string, targetSession: string }} entry The loop entry.
 * @param {(sessionID: string, text: string, delivery: string) => Promise<*>} injectPrompt The injector.
 * @param {"queue" | "steer"} delivery The delivery mode.
 * @param {() => number} now The clock.
 * @param {object} state The loop's mutable tick-to-tick memory.
 * @param {() => boolean} isCancelled The tick's cancellation check.
 * @returns {Promise<boolean>} `true` when the admitted probe was recorded;
 *   `false` when the tick was cancelled while awaiting admission.
 */
async function injectProbe(entry, injectPrompt, delivery, now, state, isCancelled) {
  const injectedAt = now();
  const admitted = await injectPrompt(entry.targetSession, entry.prompt, delivery);
  if (isCancelled()) return false;
  const id = admitted?.data?.id ?? admitted?.id;
  state.lastInjection = { ...(typeof id === "string" ? { id } : {}), at: injectedAt, evaluated: false };
  return true;
}

/**
 * The idle branch of `runLoopTick`: coalesce, evaluate the previous
 * injection, then inject with queue delivery unless backing off.
 *
 * A delivered probe with no responding turn on an idle target is a failed
 * probe: nothing is processing, so no response is coming (a missing model
 * or a crash that produced no assistant record), and re-injecting would
 * flood. A probe whose anchor is in neither the inbox nor the transcript
 * page (vanished or aged out) is superseded instead of waited on.
 *
 * @param {{ id: string, prompt: string, targetSession: string }} entry The loop entry.
 * @param {object} deps The subset of `runLoopTick`'s resolved deps this branch uses.
 * @returns {Promise<object>} The branch's outcome.
 */
async function runIdleTick(entry, { server, isSessionActive, readInbox, readMessages, injectPrompt, isCancelled, now, state }) {
  const inbox = await readInbox(server, entry.targetSession);
  if (isCancelled()) {
    return { outcome: "cancelled" };
  }
  if (inbox.some((item) => item.payload?.text === entry.prompt)) {
    return { outcome: "skipped", reason: "pending-delivery" };
  }
  if (state.lastInjection && !state.lastInjection.evaluated) {
    const messages = await readMessages(server, entry.targetSession);
    if (isCancelled()) {
      return { outcome: "cancelled" };
    }
    const evaluation = evaluateProbe(state, messages);
    if (evaluation?.verdict === "failed") {
      return { outcome: "skipped", reason: "failed-probe", level: evaluation.level, skips: evaluation.skips };
    }
    if (evaluation?.pending === "awaiting-response") {
      // The idleness sample is by now reads old; a turn may have started —
      // or started *and finished* — in the meantime, and failing the probe
      // then would ignore its response. Bracket a fresh transcript read
      // between two idle observations: only a response missing from a
      // snapshot taken while provably idle on both sides proves no
      // response is coming.
      const activeBefore = await isSessionActive(server, entry.targetSession);
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      if (activeBefore) {
        return { outcome: "skipped", reason: "awaiting-response" };
      }
      const freshMessages = await readMessages(server, entry.targetSession);
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      const reEvaluation = evaluateProbe(state, freshMessages);
      if (reEvaluation?.verdict === "failed") {
        return { outcome: "skipped", reason: "failed-probe", level: reEvaluation.level, skips: reEvaluation.skips };
      }
      if (reEvaluation?.pending === "awaiting-response") {
        const activeAfter = await isSessionActive(server, entry.targetSession);
        if (isCancelled()) {
          return { outcome: "cancelled" };
        }
        if (activeAfter) {
          return { outcome: "skipped", reason: "awaiting-response" };
        }
        const escalated = recordFailedProbe(state);
        return { outcome: "skipped", reason: "failed-probe", ...escalated };
      }
      if (reEvaluation?.pending === "undelivered") {
        state.lastInjection.evaluated = true;
      }
      // A succeeded verdict falls through: the backoff was reset and the
      // normal injection cadence resumes below.
    }
    if (evaluation?.pending === "undelivered") {
      state.lastInjection.evaluated = true;
    }
  }
  if ((state.backoffSkips ?? 0) > 0) {
    state.backoffSkips -= 1;
    return { outcome: "skipped", reason: "backoff", remaining: state.backoffSkips };
  }
  if (!(await injectProbe(entry, injectPrompt, "queue", now, state, isCancelled))) {
    return { outcome: "cancelled" };
  }
  return { outcome: "injected", reason: "idle" };
}

/**
 * The active branch of `runLoopTick`: probe evaluation on the busy path;
 * on the stale path, the two-observation dead-stream confirmation and
 * interrupt, coalescing (pending steer, queue-promotion, or an unfinished
 * responding turn), and the backoff-gated steer.
 *
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry The loop entry.
 * @param {object} deps The subset of `runLoopTick`'s resolved deps this branch uses.
 * @returns {Promise<object>} The branch's outcome.
 */
async function runActiveTick(
  entry,
  {
    server,
    readUpdatedAt,
    readInbox,
    readMessages,
    getLastEventAt,
    getRawProgressAt,
    getLastInterruptAt,
    recordInterrupt,
    withTargetLock,
    injectPrompt,
    promote,
    interrupt,
    isCancelled,
    now,
    deadStreamConfirmMs,
    state,
  },
) {
  const lastActivity = await readUpdatedAt(server, entry.targetSession);
  if (isCancelled()) {
    return { outcome: "cancelled" };
  }
  if (now() - lastActivity <= entry.interval * LOOP_STALE_INTERVALS) {
    // Recent activity may be this loop's own probe failing slowly, so the
    // backoff is not reset here; only the observed responding turn decides.
    if (state.lastInjection && !state.lastInjection.evaluated) {
      const messages = await readMessages(server, entry.targetSession);
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      const evaluation = evaluateProbe(state, messages);
      if (evaluation?.verdict === "failed") {
        return { outcome: "skipped", reason: "failed-probe", level: evaluation.level, skips: evaluation.skips };
      }
    }
    return { outcome: "busy", lastActivity };
  }
  const messages = await readMessages(server, entry.targetSession);
  if (isCancelled()) {
    return { outcome: "cancelled" };
  }
  const newestAssistant = messages.find((message) => message.type === "assistant") ?? null;
  if (isDeadStreamMessage(newestAssistant)) {
    const fingerprint = deadStreamFingerprint(newestAssistant);
    // Coverage is response *identity*, not a clock comparison: the still-
    // open (unfinished) generations whose consumed bytes carried the
    // suspected tool part's provider-unique call id. Time-to-first-token
    // gaps cannot break it (the id arrives in the same bytes that created
    // the part), a completed or unrelated response can never impersonate
    // the hung stream, and a wrapper another hook replaced without
    // consuming never carries the id, so it can claim nothing. Every
    // matching generation counts: any live one vetoes, and more than one
    // is ambiguous identity that never authorizes. The residual a passive
    // tee cannot see — a later hook consuming the identity-bearing bytes
    // through this tee and then silently substituting the response without
    // cancelling it — is undetectable from here and excluded by the
    // documented single-observer assumption.
    const parts = Array.isArray(newestAssistant.content) ? newestAssistant.content : [];
    const suspectCallID = parts[parts.length - 1]?.id;
    const matchedGenerations = () => {
      if (typeof suspectCallID !== "string" || suspectCallID.length === 0) {
        return [];
      }
      const raw = getRawProgressAt(entry.targetSession);
      return raw?.open?.filter((generation) => generationCarries(generation, suspectCallID)) ?? [];
    };
    if (state.deadStreamSuspect?.fingerprint !== fingerprint) {
      // First observation: a stale session timestamp says nothing about the
      // stream's own freshness, so a candidate is only suspected here and
      // interrupted once frozen for the whole confirmation window. The
      // coverage verdict is pinned in loop state so a later map eviction
      // cannot retract established evidence.
      state.deadStreamSuspect = { fingerprint, at: now(), covered: matchedGenerations().length === 1 };
      return { outcome: "skipped", reason: "dead-stream-suspected", lastActivity };
    }
    const suspectedAt = state.deadStreamSuspect.at;
    const rawLiveness = () => {
      // Any generation carrying the suspected id that produced bytes since
      // the suspicion vetoes — never just the first match — while bytes on
      // unrelated same-session responses neither veto the suspected stream
      // forever nor stand in for its own progress.
      return matchedGenerations().some((generation) => generation.lastAt >= suspectedAt);
    };
    const eventLiveness = () => {
      const stamp = getLastEventAt(entry.targetSession);
      return stamp !== undefined && stamp >= suspectedAt;
    };
    if (rawLiveness() || eventLiveness()) {
      // The stream produced raw response bytes or progress events since the
      // suspicion — it is alive whatever the projection shows. Observed
      // liveness vetoes and re-arms the window.
      state.deadStreamSuspect = { fingerprint, at: now(), covered: matchedGenerations().length === 1 };
      return { outcome: "skipped", reason: "dead-stream-suspected", lastActivity };
    }
    {
      const matches = matchedGenerations();
      if (matches.length > 1) {
        // Two open generations carrying one call id is sampled-then-
        // replaced or replayed identity: ambiguous evidence never
        // authorizes escalation.
        return { outcome: "skipped", reason: "dead-stream-unobserved", lastActivity };
      }
      if (!state.deadStreamSuspect.covered) {
        // Silence only counts where the suspected stream's own bytes were
        // observed. Coverage can still be established late (a hook that
        // registered after the suspicion began observes the session from
        // its next response); until then, escalation stays disabled rather
        // than authorized.
        if (matches.length !== 1) {
          return { outcome: "skipped", reason: "dead-stream-unobserved", lastActivity };
        }
        state.deadStreamSuspect.covered = true;
      }
    }
    if (now() - suspectedAt < deadStreamConfirmMs) {
      // Total silence, but not yet for the whole window: keep waiting.
      return { outcome: "skipped", reason: "dead-stream-suspected", lastActivity };
    }
    return await withTargetLock(entry.targetSession, async () => {
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      const interruptedAt = getLastInterruptAt(entry.targetSession);
      if (interruptedAt !== undefined && interruptedAt >= suspectedAt) {
        // Another loop already interrupted this target after our suspicion
        // began: our evidence describes the interrupted execution, not the
        // one that resumed. Never interrupt the successor on it.
        delete state.deadStreamSuspect;
        return { outcome: "skipped", reason: "dead-stream-suspected", lastActivity };
      }
      // A parked queue copy would out-survive the interrupt
      // (`continue=true` resumes steering input while queued prompts stay
      // parked) and then coalesce every later tick: promote it first so
      // the resumed execution delivers it.
      const inbox = await readInbox(server, entry.targetSession);
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      const pendingCopy = inbox.find((item) => item.payload?.text === entry.prompt);
      if (pendingCopy && pendingCopy.delivery !== "steer") {
        await promote(server, entry.targetSession, pendingCopy.id);
      }
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      // Final revalidation, inside the lock: the reads above took time, and
      // progress or completion during them must veto the interrupt.
      const freshMessages = await readMessages(server, entry.targetSession);
      if (isCancelled()) {
        return { outcome: "cancelled" };
      }
      const freshAssistant = freshMessages.find((message) => message.type === "assistant") ?? null;
      if (
        !isDeadStreamMessage(freshAssistant) ||
        deadStreamFingerprint(freshAssistant) !== fingerprint ||
        matchedGenerations().length > 1 ||
        rawLiveness() ||
        eventLiveness()
      ) {
        delete state.deadStreamSuspect;
        return { outcome: "skipped", reason: "dead-stream-suspected", lastActivity };
      }
      delete state.deadStreamSuspect;
      const silenceMs = now() - suspectedAt;
      await interrupt(server, entry.targetSession);
      // Recorded only now, after the request succeeded: a failed interrupt
      // must leave the next confirmation free to retry rather than skip on
      // a phantom record.
      recordInterrupt(entry.targetSession, now());
      // The freed target must be re-probed on the next tick, not after a
      // leftover skip window.
      state.backoffSkips = 0;
      return { outcome: "interrupted", reason: "dead-stream", silenceMs, lastActivity };
    });
  }
  delete state.deadStreamSuspect;
  const inbox = await readInbox(server, entry.targetSession);
  if (isCancelled()) {
    return { outcome: "cancelled" };
  }
  if (inbox.some((item) => item.payload?.text === entry.prompt && item.delivery === "steer")) {
    return { outcome: "skipped", reason: "pending-delivery", lastActivity };
  }
  const pendingQueue = inbox.find((item) => item.payload?.text === entry.prompt);
  if (pendingQueue) {
    await promote(server, entry.targetSession, pendingQueue.id);
    if (isCancelled()) {
      return { outcome: "cancelled" };
    }
    return { outcome: "promoted", reason: "stale-running", lastActivity };
  }
  const evaluation = evaluateProbe(state, messages);
  if (evaluation?.verdict === "failed") {
    return { outcome: "skipped", reason: "failed-probe", level: evaluation.level, skips: evaluation.skips };
  }
  if (evaluation?.pending === "awaiting-response") {
    return { outcome: "skipped", reason: "awaiting-response", lastActivity };
  }
  if (evaluation?.pending === "undelivered") {
    // In neither the inbox nor the transcript page: vanished or aged out —
    // superseded rather than waited on, or recovery would stall forever.
    state.lastInjection.evaluated = true;
  }
  if ((state.backoffSkips ?? 0) > 0) {
    state.backoffSkips -= 1;
    return { outcome: "skipped", reason: "backoff", remaining: state.backoffSkips };
  }
  if (!(await injectProbe(entry, injectPrompt, "steer", now, state, isCancelled))) {
    return { outcome: "cancelled" };
  }
  return { outcome: "injected", reason: "stale-running", lastActivity };
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
 * Deadline on every request the plugin issues against the opencode server.
 *
 * Enforced through `AbortSignal.timeout`, the one mechanism that fires on
 * every host runtime the plugin runs under: opencode runs on Bun, where
 * `node:http`'s `request.setTimeout` (and `destroy`) never settle a request
 * whose server does not answer, so a client built on them can wait forever.
 */
const SERVER_REQUEST_TIMEOUT_MS = 10_000;

/**
 * The default `requestServer` request function: a thin wrapper over the
 * global `fetch`, performing no work until called and rejecting once
 * `SERVER_REQUEST_TIMEOUT_MS` passes without a complete response.
 *
 * @param {URL} url The fully-resolved request URL.
 * @param {{ method: string, headers: Record<string,string>, body?: string }} init
 *   The request method, headers (including the Basic-auth header), and an
 *   optional JSON-string body.
 * @param {number} [timeoutMs] The request deadline; defaults to
 *   `SERVER_REQUEST_TIMEOUT_MS`.
 * @returns {Promise<{ status: number, body: * }>} The response status and,
 *   when the response has a body, its parsed JSON.
 */
async function fetchRequest(url, { method, headers, body }, timeoutMs = SERVER_REQUEST_TIMEOUT_MS) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.text();
  return { status: response.status, body: data ? JSON.parse(data) : undefined };
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
 *   Injectable request function; defaults to `fetchRequest`, so tests can
 *   stub the HTTP boundary without a real server.
 * @returns {Promise<{ status: number, body: * }>} The resolved response.
 */
function requestServer(server, method, path, body, requestFn = fetchRequest) {
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
 * Read a session's admitted-but-undelivered inbox items.
 *
 * Backs the loop tick's coalescing: an item whose `payload.text` equals the
 * loop's prompt is a previous injection still awaiting delivery.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session ID to read.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<Array<object>>} The pending inbox items.
 * @throws {Error} On a non-2xx response — pending state unknown means the
 *   tick must not inject on top of a possibly pending prompt.
 */
async function getSessionInbox(server, sessionID, requestFn) {
  const response = await requestServer(server, "GET", `/api/session/${sessionID}/inbox`, undefined, requestFn);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GET /api/session/${sessionID}/inbox returned ${response.status}`);
  }
  return response.body?.data ?? [];
}

/**
 * Read a session's projected messages, newest first, parts included.
 *
 * Backs the loop tick's failed-probe evaluation (locating the injected
 * input and its responding turn) and the dead-stream gate (the newest
 * assistant message's `content` part states).
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session ID to read.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<Array<object>>} The session's messages, newest first.
 * @throws {Error} On a non-2xx response.
 */
async function getSessionMessages(server, sessionID, requestFn) {
  // An explicit limit well above the server's default page: probe anchors
  // must stay visible across many intervening turns (see
  // `findProbeResponse`'s aging note).
  const response = await requestServer(
    server,
    "GET",
    `/api/session/${sessionID}/message?limit=200`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GET /api/session/${sessionID}/message returned ${response.status}`);
  }
  return response.body?.data ?? [];
}

/**
 * Promote a pending queued inbox item to steer delivery in place.
 *
 * The loop tick's stale-path coalescing: a parked queue copy of the monitor
 * prompt cannot reach a running session, so it is converted to a steer —
 * which wakes session execution — instead of injecting a duplicate.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session owning the inbox item.
 * @param {string} inboxID The pending inbox item to promote.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<void>} Resolves when the promotion is accepted.
 * @throws {Error} On a non-2xx response.
 */
async function promoteInboxItem(server, sessionID, inboxID, requestFn) {
  const response = await requestServer(
    server,
    "POST",
    `/api/session/${sessionID}/inbox/${inboxID}/steer`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`POST /api/session/${sessionID}/inbox/${inboxID}/steer returned ${response.status}`);
  }
}

/**
 * Interrupt a session's in-flight execution. With `continue=true` execution
 * resumes with pending steering input and next-in-line control items;
 * queued prompts stay parked until the session next idles.
 *
 * The loop tick's dead-stream escalation — fired only when a steer is
 * already pending, which the resumed execution then delivers: verified live
 * to unstick a session whose provider stream died mid-tool-call.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session ID to interrupt.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<void>} Resolves when the interrupt is accepted.
 * @throws {Error} On a non-2xx response.
 */
async function interruptSession(server, sessionID, requestFn) {
  const response = await requestServer(
    server,
    "POST",
    `/api/session/${sessionID}/interrupt?continue=true`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`POST /api/session/${sessionID}/interrupt returned ${response.status}`);
  }
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
 * Resolve the ledger entry a session record belongs to, when RP recognizes it.
 *
 * @param {{ id: string, title?: string }} record A session record
 *   (`GET /api/session`).
 * @param {(sessionID: string) => { name: string, run: string, spawner: string } | undefined} lookup
 *   Resolves a session ID to its recorded ledger entry (see `lookupSpawn`).
 *   A record whose ID isn't found this way falls back to `parseTitle` on its
 *   `title`, so restart-surviving sessions are still recognized.
 * @returns {{ name: string, run: string, spawner?: string } | null | undefined}
 *   The entry, or nothing when the record is neither in the ledger nor
 *   `rp:`-titled.
 */
function recognizeSession(record, lookup) {
  return lookup(record.id) ?? parseTitle(record.title ?? "");
}

/** Maximum length of a ledger row's `lastText` excerpt. */
const LAST_TEXT_EXCERPT_CAP = 200;

/**
 * How many of a session's newest messages `rp_status` reads first to locate
 * its newest assistant text. Most sessions speak within this many messages;
 * consecutive tool-only steps each project as their own assistant message,
 * so a session in a long run of them needs the deeper page.
 */
const LAST_TEXT_PAGE = 20;

/**
 * The deeper page read when the first holds no text but is full. Bounds the
 * cost of one status call; a session silent for longer than this reports
 * how far the search reached rather than a fabricated "never spoke".
 */
const LAST_TEXT_DEEP_PAGE = 100;

/**
 * Extract the newest assistant text from a page of a session's projected
 * messages.
 *
 * Scans the newest-first page for the first assistant message carrying a
 * non-empty text part and returns that message's last such part, trimmed and
 * truncated to `LAST_TEXT_EXCERPT_CAP`. The timestamp is the message's
 * completion time, or its creation time while it is still in flight — text
 * parts carry no time of their own in the pinned projection. A full page
 * without text is inconclusive and says so; only a short page proves the
 * session never spoke.
 *
 * @param {Array<object>} messages One page, as returned by
 *   `getSessionMessages`.
 * @param {number} [pageLimit] The limit the page was requested with; when
 *   the page reaches it without text, the result is `{ olderThan: pageLimit }`.
 * @returns {{ at: number | undefined, excerpt: string } | { olderThan: number } | undefined}
 *   The newest text, the depth a textless full page was searched to, or
 *   `undefined` when the exhausted transcript holds none.
 */
function extractLastText(messages, pageLimit) {
  for (const message of messages) {
    if (message?.type !== "assistant") {
      continue;
    }
    const parts = Array.isArray(message.content) ? message.content : [];
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i];
      if (part?.type !== "text" || typeof part.text !== "string") {
        continue;
      }
      const text = part.text.trim();
      if (text.length === 0) {
        continue;
      }
      return {
        at: message.time?.completed ?? message.time?.created,
        excerpt: text.length > LAST_TEXT_EXCERPT_CAP ? `${text.slice(0, LAST_TEXT_EXCERPT_CAP)}…` : text,
      };
    }
  }
  return pageLimit !== undefined && messages.length >= pageLimit ? { olderThan: pageLimit } : undefined;
}

/**
 * The latest of several timestamps, tolerating absent ones.
 *
 * @param {*} first The primary timestamp; returned as-is when none is finite.
 * @param {...*} rest Further timestamps.
 * @returns {*} The greatest finite value, or `first`.
 */
function latestOf(first, ...rest) {
  const finite = [first, ...rest].filter((value) => Number.isFinite(value));
  return finite.length > 0 ? Math.max(...finite) : first;
}

/**
 * Build the `rp_status` ledger rows from opencode's live session records and
 * the plugin's own in-memory spawn ledger.
 *
 * @param {Array<{ id: string, agent: string, model: object, location?: {directory: string}, time?: {updated: *}, title?: string }>} sessionRecords
 *   Every session opencode currently knows about (`GET /api/session`).
 * @param {(sessionID: string) => { name: string, run: string, spawner: string } | undefined} lookup
 *   Resolves a session ID to its recorded ledger entry (see
 *   `recognizeSession`).
 * @param {Set<string> | null} activeSessionIDs Session IDs opencode reports
 *   running now (see `isSessionActive`), or `null` when the read failed.
 * @param {(sessionID: string) => number} pendingCountFor Resolves a
 *   session's pending-input count.
 * @param {(sessionID: string) => Array<{id: string, action: string, resources: string[]}>} [permissionsFor]
 *   Resolves a session's pending permission requests; defaults to none.
 * @param {(sessionID: string) => object | undefined} [currentToolForFn]
 *   Resolves a session's currently executing tool call (see
 *   `currentToolFor`); defaults to none.
 * @param {{
 *   lastEventAtFor?: (sessionID: string) => number | undefined,
 *   rawProgressAtFor?: (sessionID: string) => number | undefined,
 *   turnsFor?: (sessionID: string) => { turns: number, lastTurn: object } | undefined,
 *   lastSendFor?: (sessionID: string) => { at: number, to: string } | undefined,
 *   lastTextFor?: (sessionID: string) => { at: number | undefined, excerpt: string } | { olderThan: number } | undefined,
 * }} [observations] Resolvers for the plugin's own per-session observations
 *   (see `lastSessionEventAt`, `lastRawSessionProgressAt`, `turnsFor`,
 *   `lastSendFor`, `extractLastText`); each defaults to none.
 * @returns {Array<{name: string, run: string, sessionID: string, agent: string, model: string, directory: string, updated: *, activity: *, running: boolean | undefined, pending: number | undefined, permissions: Array<object> | undefined, currentTool: object | undefined, lastTurn: object | undefined, turns: number | undefined, lastSend: object | undefined, lastText: object | undefined}>}
 *   One row per session record RP recognizes as its own, in `sessionRecords`
 *   order; records RP does not recognize (neither ledger nor `rp:` title)
 *   are omitted. `activity` is the latest of the record's `updated` — which
 *   the pinned build moves only when the session receives input — the
 *   session's last observed progress event, and its last raw provider byte
 *   (a streaming tool call's partial arguments emit no event), so it covers
 *   tool and model progress within a turn.
 */
function buildLedgerRows(
  sessionRecords,
  lookup,
  activeSessionIDs,
  pendingCountFor,
  permissionsFor = () => [],
  currentToolForFn = () => undefined,
  {
    lastEventAtFor = () => undefined,
    rawProgressAtFor = () => undefined,
    turnsFor: turnsForFn = () => undefined,
    lastSendFor: lastSendForFn = () => undefined,
    lastTextFor = () => undefined,
  } = {},
) {
  const rows = [];
  for (const record of sessionRecords) {
    const entry = recognizeSession(record, lookup);
    if (!entry) {
      continue;
    }
    const updated = record.time?.updated;
    const turnRecord = turnsForFn(record.id);
    rows.push({
      name: entry.name,
      run: entry.run,
      sessionID: record.id,
      agent: record.agent,
      model: record.model ? formatModelString(record.model) : record.model,
      directory: record.location?.directory,
      updated,
      activity: latestOf(updated, lastEventAtFor(record.id), rawProgressAtFor(record.id)),
      running: activeSessionIDs?.has(record.id),
      pending: pendingCountFor(record.id),
      permissions: permissionsFor(record.id),
      currentTool: currentToolForFn(record.id),
      lastTurn: turnRecord?.lastTurn,
      turns: turnRecord?.turns,
      lastSend: lastSendForFn(record.id),
      lastText: lastTextFor(record.id),
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
  const lastTexts = new Map();

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
    // Per-session reads only for the sessions that become rows: the list
    // spans every project the server knows.
    for (const record of sessionRecords.filter((record) => recognizeSession(record, lookupSpawn))) {
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
      // Newest text: a cheap page first, the deeper one only when the first
      // is full and textless (a long run of tool-only steps).
      const firstPage = await readEndpoint(
        "message",
        `/api/session/${record.id}/message?limit=${LAST_TEXT_PAGE}`,
      );
      if (firstPage) {
        let lastText = extractLastText(firstPage.body?.data ?? [], LAST_TEXT_PAGE);
        if (lastText?.olderThan !== undefined) {
          const deepPage = await readEndpoint(
            "message",
            `/api/session/${record.id}/message?limit=${LAST_TEXT_DEEP_PAGE}`,
          );
          if (deepPage) {
            lastText = extractLastText(deepPage.body?.data ?? [], LAST_TEXT_DEEP_PAGE);
          }
        }
        lastTexts.set(record.id, lastText);
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
    {
      lastEventAtFor: lastSessionEventAt,
      rawProgressAtFor: (id) => lastRawSessionProgressAt(id)?.lastAt,
      turnsFor,
      lastSendFor,
      lastTextFor: (id) => lastTexts.get(id),
    },
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
 *
 * @returns {Map<string, {inFlight: number, confirmed: boolean, deferred: Array<() => Promise<void>>, releasing: boolean}>}
 *   The singleton map.
 */
function getTerminationState() {
  if (!globalThis[TERMINATED_SESSIONS_KEY]) {
    globalThis[TERMINATED_SESSIONS_KEY] = new Map();
  }
  return globalThis[TERMINATED_SESSIONS_KEY];
}

/**
 * Run one terminal-event report so a failure inside it can never escape to
 * its caller, recording it the way the event loop does.
 *
 * Both the event loop and the release path use this, so a report behaves
 * identically whichever reaches it: one failing report is logged and the next
 * still runs, and it cannot change what `rp_terminate` returns or raises.
 *
 * @param {() => Promise<void>} run The report to isolate.
 * @returns {Promise<void>} Always resolves.
 */
function isolateListener(run) {
  return run().catch((error) => recordError({ type: "listener.failed", error: String(error) }));
}

/**
 * Record that a termination attempt for a session has started.
 *
 * @param {string} sessionID The session being terminated.
 * @returns {void}
 */
function beginTermination(sessionID) {
  const state = getTerminationState();
  const entry = state.get(sessionID) ?? {
    inFlight: 0,
    confirmed: false,
    deferred: [],
    releasing: false,
  };
  entry.inFlight += 1;
  state.set(sessionID, entry);
}

/**
 * Record how one termination attempt ended, and release whatever the pending
 * outcome was holding.
 *
 * Suppression lasts forever once some attempt confirmed the deletion, so a
 * failing attempt can never withdraw the suppression a successful one depends
 * on. Otherwise nothing was terminated and the session may still be alive, so
 * the caller releases: `releaseTermination` decides there whether every peer
 * has settled, since it must re-check that after each await regardless.
 *
 * @param {string} sessionID The session the attempt targeted.
 * @param {boolean} confirmed Whether this attempt deleted the session.
 * @returns {boolean} `true` when the caller must now call
 *   `releaseTermination` — that is, when no attempt on this session has
 *   confirmed a deletion, whether this one or an earlier one.
 */
function endTermination(sessionID, confirmed) {
  const state = getTerminationState();
  const entry = state.get(sessionID);
  if (!entry) {
    return false;
  }
  entry.inFlight -= 1;
  entry.confirmed = entry.confirmed || confirmed;
  if (entry.confirmed) {
    // The session is gone; anything it emitted on the way out was the
    // shutdown. Drop it as soon as that is known rather than after the last
    // attempt settles, so a peer that stalls cannot strand it.
    entry.deferred = [];
    return false;
  }
  // Whether a peer is still in flight is `releaseTermination`'s gate, which it
  // has to re-check after every await anyway; repeating it here would be a
  // second copy of the same rule that no behaviour depends on.
  return true;
}

/**
 * Report everything a failed termination was holding, then forget the session.
 *
 * The state stays in place for the whole drain, so an event arriving partway
 * through joins the end of the queue instead of overtaking what is already
 * held — the listener's arrival order survives the release. Each report is
 * isolated, so one failure neither stops the rest nor reaches `rp_terminate`.
 *
 * A release owns the session's state only while that state stays the one it
 * started on, unclaimed and unconfirmed. A termination beginning during a
 * report hands ownership to that newer attempt: draining its events would
 * report an outcome nobody knows yet, and deleting its state would lose the
 * marker it is about to earn. Every condition is therefore re-checked after
 * each await, and one release runs at a time, since a second would interleave
 * with this drain and could delete state this one still owns.
 *
 * @param {string} sessionID The session whose termination failed.
 * @returns {Promise<void>}
 */
async function releaseTermination(sessionID) {
  const state = getTerminationState();
  const entry = state.get(sessionID);
  if (!entry || entry.releasing) {
    return;
  }
  entry.releasing = true;
  while (state.get(sessionID) === entry && entry.inFlight === 0 && !entry.confirmed) {
    const next = entry.deferred.shift();
    if (!next) {
      state.delete(sessionID);
      break;
    }
    await isolateListener(next);
  }
  entry.releasing = false;
}

/**
 * Decide what a terminal event's arrival during a termination means.
 *
 * A confirmed deletion discards it: the session is gone, and the plugin
 * cannot tell a failure the delete provoked from one the session raised on
 * its own moments earlier — both carry the same type on the same session, and
 * `created` is a millisecond wall clock that cannot separate them. Suppressing
 * is the safe side of that ambiguity, since the spawner asked for this agent
 * to stop and a report about a session it just destroyed is not actionable.
 *
 * An unknown outcome holds it instead. Discarding on the mere intent to
 * terminate would lose a genuine failure for good when the delete turns out to
 * fail and the agent is still alive.
 *
 * @param {string} sessionID The session the event pertains to.
 * @param {() => Promise<void>} run Reports the event.
 * @returns {boolean} `true` when the termination took the event over.
 */
function withheldByTermination(sessionID, run) {
  const entry = getTerminationState().get(sessionID);
  if (!entry) {
    return false;
  }
  if (entry.confirmed) {
    return true;
  }
  entry.deferred.push(run);
  return true;
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

/**
 * `globalThis` key backing the per-session last-event timestamps.
 *
 * Stored on `globalThis` for the same re-import rationale as `LEDGER_KEY`.
 */
const SESSION_EVENT_ACTIVITY_KEY = Symbol.for("radical-pipelines.opencode.sessionEventActivity");

/**
 * `globalThis` key backing the per-session raw-progress timestamps.
 *
 * Stored on `globalThis` for the same re-import rationale as `LEDGER_KEY`.
 */
const SESSION_RAW_PROGRESS_KEY = Symbol.for("radical-pipelines.opencode.sessionRawProgress");

/**
 * How long session-observation evidence is retained.
 *
 * Evidence ages out; it is never crowded out: an entry younger than this is
 * never evicted however many sessions are active, because evicting recent
 * liveness would convert an observed byte into apparent silence and could
 * authorize interrupting a live stream. Memory stays bounded by the number
 * of sessions active within the retention, and the retention comfortably
 * exceeds any sane dead-stream confirmation window.
 */
const SESSION_EVIDENCE_RETENTION_MS = 86_400_000;

/**
 * Size threshold that triggers age-pruning of a session-observation map.
 * Pruning removes only entries older than `SESSION_EVIDENCE_RETENTION_MS`;
 * when every entry is recent, the map is allowed to grow instead.
 */
const SESSION_OBSERVATION_PRUNE_THRESHOLD = 256;

/**
 * Prune a session-observation map's aged entries once it grows past the
 * threshold.
 *
 * @param {Map<string, *>} map The observation map.
 * @param {number} at The current timestamp.
 * @param {(value: *) => number} newestOf Extracts a value's newest stamp.
 * @returns {void}
 */
function pruneSessionObservations(map, at, newestOf) {
  if (map.size <= SESSION_OBSERVATION_PRUNE_THRESHOLD) {
    return;
  }
  for (const [id, value] of map) {
    if (at - newestOf(value) > SESSION_EVIDENCE_RETENTION_MS) {
      map.delete(id);
    }
  }
}

/**
 * Record a per-session observation into an age-pruned `globalThis`-backed
 * map.
 *
 * The stored value never regresses: an older observation draining late
 * refreshes the entry's recency but keeps the newest timestamp.
 *
 * @param {symbol} key The map's `globalThis` key.
 * @param {string} sessionID The session observed.
 * @param {number} at The observation timestamp.
 * @returns {void}
 */
function recordSessionObservation(key, sessionID, at) {
  const map = getSessionObservationMap(key);
  const previous = map.get(sessionID);
  map.delete(sessionID);
  map.set(sessionID, previous !== undefined && previous > at ? previous : at);
  pruneSessionObservations(map, at, (value) => value);
}

/**
 * Fetch a process-wide session-observation map, creating it on first use.
 *
 * @param {symbol} key The map's `globalThis` key.
 * @returns {Map<string, *>} Session ID to observation (a timestamp, or a
 *   record carrying one).
 */
function getSessionObservationMap(key) {
  if (!globalThis[key]) {
    globalThis[key] = new Map();
  }
  return globalThis[key];
}

/**
 * Safety bound on distinct identifier values remembered per response
 * generation. Far above anything a real response produces (values are
 * deduplicated), so a valid call id is never silently discarded; the bound
 * only guards runaway memory on a pathological stream.
 */
const RAW_GENERATION_ID_CAP = 8_192;

/**
 * Fetch (creating on first use) a session's raw-progress record.
 *
 * The record's `lastAt` is refreshed *before* the map is pruned, so a
 * session reusing an aged record can never prune — and thereby detach —
 * the very record its new response is about to populate. Open generations
 * are themselves pruned by age only (see `SESSION_EVIDENCE_RETENTION_MS`),
 * never by count: dropping a live generation for volume could erase the
 * exact evidence a later confirmation needs.
 *
 * @param {string} sessionID The session observed.
 * @param {number} at The observation timestamp (drives pruning).
 * @returns {{lastAt: number, open: Array<{startedAt: number, lastAt: number, ids: string[]}>}}
 */
function getRawSessionRecord(sessionID, at) {
  const map = getSessionObservationMap(SESSION_RAW_PROGRESS_KEY);
  let record = map.get(sessionID);
  map.delete(sessionID);
  if (!record) {
    record = { lastAt: at, open: [] };
  }
  record.lastAt = record.lastAt > at ? record.lastAt : at;
  record.open = record.open.filter((generation) => at - generation.lastAt <= SESSION_EVIDENCE_RETENTION_MS);
  map.set(sessionID, record);
  pruneSessionObservations(map, at, (value) => value.lastAt);
  return record;
}

/**
 * Record that a new raw provider response began for a session.
 *
 * Opens a response *generation*: the entry stays in `open` until the
 * response's stream ends or aborts, so coverage can require an unfinished
 * stream — a completed earlier response (a title request, a prior turn
 * milliseconds before) can never impersonate the stream under suspicion.
 *
 * @param {string} sessionID The session whose response arrived.
 * @param {number} [at] The observation timestamp; defaults to `Date.now()`.
 * @returns {{startedAt: number, lastAt: number, ids: string[]}} The opened generation.
 */
function recordRawResponseStart(sessionID, at = Date.now()) {
  const record = getRawSessionRecord(sessionID, at);
  const generation = { startedAt: at, lastAt: at, ids: new Set() };
  record.open.push(generation);
  return generation;
}

/**
 * Remember an identifier value observed in a generation's consumed bytes.
 *
 * Provider streams carry the tool-call id of every call they produce, so
 * the identifiers a generation was *seen carrying* tie it to the projected
 * tool part under suspicion — response identity by content, not by clock.
 *
 * @param {{ids: Set<string>}} generation The generation that carried the id.
 * @param {string} id The identifier value observed.
 * @returns {void}
 */
function recordGenerationID(generation, id) {
  if (generation.ids.size < RAW_GENERATION_ID_CAP) {
    generation.ids.add(id);
  }
}

/**
 * Whether a generation's consumed bytes carried an identifier value.
 *
 * Tolerates both the live `Set` and the plain-array form tests stub.
 *
 * @param {{ids: Set<string> | string[]}} generation The generation.
 * @param {string} id The identifier value.
 * @returns {boolean}
 */
function generationCarries(generation, id) {
  const ids = generation.ids;
  return Array.isArray(ids) ? ids.includes(id) : Boolean(ids?.has?.(id));
}

/**
 * Record that a response generation's stream ended (completed or aborted).
 *
 * @param {string} sessionID The session whose response ended.
 * @param {{startedAt: number, lastAt: number}} generation The generation.
 * @param {number} [at] The observation timestamp; defaults to `Date.now()`.
 * @returns {void}
 */
function recordRawResponseEnd(sessionID, generation, at = Date.now()) {
  const record = getRawSessionRecord(sessionID, at);
  const index = record.open.indexOf(generation);
  if (index !== -1) {
    record.open.splice(index, 1);
  }
  record.lastAt = record.lastAt > at ? record.lastAt : at;
}

/**
 * Record that a raw provider-response chunk arrived for a session.
 *
 * Fed by the `http.response` session hook, which tees the provider's
 * streaming body: every chunk of the raw response — including partial
 * argument fragments that surface nowhere else — refreshes `lastAt`.
 * This is the authoritative liveness signal for the dead-stream guard: a
 * stream producing bytes is alive whatever the projection shows.
 *
 * @param {string} sessionID The session whose response produced a chunk.
 * @param {{startedAt: number, lastAt: number}} [generation] The producing
 *   generation, when known.
 * @param {number} [at] The observation timestamp; defaults to `Date.now()`.
 * @returns {void}
 */
function recordRawSessionProgress(sessionID, generation, at = Date.now()) {
  // The producing generation is refreshed *before* the record is fetched:
  // fetching prunes open generations by their old timestamps, and a byte
  // resuming after a long silence must never prune — and thereby detach —
  // the very generation it proves alive. A generation aged out by an
  // earlier observation is re-attached: its stream just proved itself.
  if (generation) {
    generation.lastAt = generation.lastAt > at ? generation.lastAt : at;
  }
  const record = getRawSessionRecord(sessionID, at);
  if (generation && !record.open.includes(generation)) {
    record.open.push(generation);
  }
  record.lastAt = record.lastAt > at ? record.lastAt : at;
}

/**
 * Read a session's raw-progress record.
 *
 * @param {string} sessionID The session to look up.
 * @returns {{lastAt: number, open: Array<{startedAt: number, lastAt: number, ids: string[]}>} | undefined}
 *   The newest chunk timestamp across all responses plus the still-open
 *   response generations, or `undefined` when nothing has been observed
 *   (or the record aged out).
 */
function lastRawSessionProgressAt(sessionID) {
  return getSessionObservationMap(SESSION_RAW_PROGRESS_KEY).get(sessionID);
}

/**
 * Pattern extracting identifier values from a response's decoded bytes.
 *
 * Pinned provider protocols project the tool-part id from different raw
 * fields — Chat's `id`, Open Responses' `call_id`, Bedrock's `toolUseId` —
 * so every id-suffixed key's string value is captured, and the quoted JSON
 * token is decoded so escaped values (`"call_\u0031"`) match their
 * projected form. The superset is harmless: matching is by the suspected
 * tool part's provider-unique call id.
 */
const RAW_ID_PATTERN = /"[A-Za-z0-9_]*[iI][dD]"\s*:\s*("(?:[^"\\]|\\.){0,1024}")/g;

/**
 * Wrap a session's provider response so its streamed chunks record raw
 * progress, passing the bytes through untouched.
 *
 * The `http.response` hook's `response` field is mutable for exactly this
 * kind of interposition; a body-less response just records the arrival.
 *
 * @param {{sessionID: string, response: Response}} input The hook input.
 * @returns {void}
 */
function observeHttpResponse(input) {
  const sessionID = input.sessionID;
  const body = input.response?.body;
  if (!body || typeof body.pipeThrough !== "function") {
    // A body-less response cannot hang mid-stream; just record the arrival.
    recordRawSessionProgress(sessionID, undefined);
    return;
  }
  const generation = recordRawResponseStart(sessionID);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let tail = "";
  const tee = new TransformStream({
    transform(chunk, controller) {
      recordRawSessionProgress(sessionID, generation);
      try {
        // Identity capture: remember the identifier values these consumed
        // bytes carried (with a tail carry across chunk boundaries), so
        // the generation can be matched to the projected tool part it
        // produced. Only bytes the runner actually consumes flow through
        // here — a wrapper another hook replaced never transforms, so an
        // abandoned generation can never claim identity.
        const text = tail + decoder.decode(chunk, { stream: true });
        RAW_ID_PATTERN.lastIndex = 0;
        let match;
        while ((match = RAW_ID_PATTERN.exec(text)) !== null) {
          try {
            // Decode the quoted JSON token so escaped raw values match
            // their projected form.
            recordGenerationID(generation, JSON.parse(match[1]));
          } catch {
            recordGenerationID(generation, match[1].slice(1, -1));
          }
        }
        tail = text.slice(-1_200);
      } catch {
        // Identity capture is best-effort; liveness recording above stands.
      }
      controller.enqueue(chunk);
    },
    flush() {
      recordRawResponseEnd(sessionID, generation);
    },
    cancel() {
      recordRawResponseEnd(sessionID, generation);
    },
  });
  input.response = new Response(body.pipeThrough(tee), {
    status: input.response.status,
    statusText: input.response.statusText,
    headers: input.response.headers,
  });
}

/**
 * Event-type prefixes that evidence *execution progress* for a session —
 * model output and step movement. Inbox admissions, permission traffic,
 * and other metadata activity are excluded: they can occur indefinitely
 * around a hung session and must not defer its recovery.
 */
const PROGRESS_EVENT_PREFIXES = [
  "session.step.",
  "session.text.",
  "session.reasoning.",
  "session.tool.",
  "session.execution.",
];

/**
 * Record that an execution-progress event was observed for its session.
 *
 * Fed by the plugin's event subscription. This signal is strictly a *veto*
 * for the dead-stream guard — observed progress defers an interrupt, but
 * silence never authorizes one (the pinned build emits no events for
 * partial argument chunks, and the observer itself can lag or fail), so a
 * missing or stale entry carries no weight on its own; authorization comes
 * from the wall-clock confirmation window (see `runLoopTick`).
 *
 * @param {{type?: string, created?: number, data?: {sessionID?: string}}} event An opencode event.
 * @param {number} [at] Overrides the timestamp; defaults to the event's own
 *   `created` time (falling back to `Date.now()` when absent).
 * @returns {void}
 */
function recordSessionEventActivity(event, at) {
  const sessionID = event?.data?.sessionID;
  if (typeof sessionID !== "string" || typeof event?.type !== "string") {
    return;
  }
  if (PROGRESS_EVENT_PREFIXES.some((prefix) => event.type.startsWith(prefix))) {
    // The event's own creation time, not the consumption time: an old event
    // draining from a lagged queue must not masquerade as fresh progress.
    const timestamp = at ?? (Number.isFinite(event.created) ? event.created : Date.now());
    recordSessionObservation(SESSION_EVENT_ACTIVITY_KEY, sessionID, timestamp);
  }
}

/**
 * Read the timestamp of the most recent event observed for a session.
 *
 * @param {string} sessionID The session to look up.
 * @returns {number | undefined} The timestamp, or `undefined` when no event
 *   has been observed (e.g. a fresh daemon) — which for a genuinely hung
 *   session is indistinguishable from silence, and treated as such.
 */
function lastSessionEventAt(sessionID) {
  return getSessionObservationMap(SESSION_EVENT_ACTIVITY_KEY).get(sessionID);
}

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

/**
 * Event types that end a session's turn, mapped to the outcome a ledger row
 * reports. An interrupt — verified live to emit
 * `session.execution.interrupted`, never succeeded/failed — ends the turn
 * like the other two; only `failed` is a failure to announce.
 */
const TURN_END_OUTCOMES = new Map([
  ["session.execution.succeeded", "succeeded"],
  ["session.execution.failed", "failed"],
  ["session.execution.interrupted", "interrupted"],
]);

/**
 * Event types the terminal-event listener treats as terminal for a session:
 * every turn end, so a child whose first turn is interrupted still gets its
 * durable `rp:` title asserted (and stays reconstructible after a restart).
 */
const TERMINAL_EVENT_TYPES = new Set(TURN_END_OUTCOMES.keys());

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
 * `globalThis` key backing the per-session turn records.
 *
 * Stored on `globalThis` for the same re-import rationale as `LEDGER_KEY`.
 */
const SESSION_TURNS_KEY = Symbol.for("radical-pipelines.opencode.sessionTurns");

/**
 * Record a turn's end for its session from a turn-ending event.
 *
 * Fed by the plugin's event subscription. Every session is tracked — the
 * ledger surfaces only the ones RP recognizes — and entries age out like the
 * other session observations. Other events are ignored.
 *
 * @param {object} event An opencode event.
 * @param {number} [at] Overrides the timestamp; defaults to the event's own
 *   `created` time (falling back to `Date.now()` when absent).
 * @returns {void}
 */
function recordTurnEnd(event, at) {
  const outcome = TURN_END_OUTCOMES.get(event?.type);
  if (outcome === undefined) {
    return;
  }
  const sessionID = terminalEventSessionID(event);
  if (typeof sessionID !== "string") {
    return;
  }
  const endedAt = at ?? (Number.isFinite(event.created) ? event.created : Date.now());
  const map = getSessionObservationMap(SESSION_TURNS_KEY);
  const previous = map.get(sessionID);
  map.delete(sessionID);
  map.set(sessionID, { turns: (previous?.turns ?? 0) + 1, lastTurn: { endedAt, outcome } });
  pruneSessionObservations(map, endedAt, (value) => value.lastTurn.endedAt);
}

/**
 * Read a session's turn record.
 *
 * @param {string} sessionID The session to look up.
 * @returns {{ turns: number, lastTurn: { endedAt: number, outcome: "succeeded" | "failed" | "interrupted" } } | undefined}
 *   The count of turns observed ending and the newest one, or `undefined`
 *   when none has been observed (e.g. a fresh daemon).
 */
function turnsFor(sessionID) {
  return getSessionObservationMap(SESSION_TURNS_KEY).get(sessionID);
}

/**
 * Handle one event delivered to the terminal-event listener.
 *
 * Ignores non-terminal events and terminal events on sessions RP did not
 * spawn. An event on a session `rp_terminate` is deleting goes to
 * `withheldByTermination`, which discards it once a delete has confirmed —
 * the failure a delete provokes is the expected end of a deliberate shutdown,
 * not a fault to report — and holds it while the outcome is unknown, so a
 * delete that fails still reports what the surviving session raised.
 * A successful turn is not a completion signal — an agent declares its own
 * completion in a message to its spawner — so success events pass silently,
 * and so does an interrupt (a deliberate stop, not a fault).
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
  const report = async () => {
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
  };

  if (withheldByTermination(sessionID, report)) {
    return;
  }
  await report();
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
 * `globalThis` key backing the per-session last-`rp_send` records.
 *
 * Stored on `globalThis` for the same re-import rationale as `LEDGER_KEY`.
 */
const SESSION_LAST_SEND_KEY = Symbol.for("radical-pipelines.opencode.sessionLastSend");

/**
 * Record a session's admitted `rp_send`.
 *
 * Every sender is tracked — the ledger surfaces only the ones RP recognizes
 * — and entries age out like the other session observations.
 *
 * @param {string} sessionID The sending session.
 * @param {string} to The recipient session ID.
 * @param {number} at The admission timestamp.
 * @returns {void}
 */
function recordSend(sessionID, to, at) {
  const map = getSessionObservationMap(SESSION_LAST_SEND_KEY);
  map.delete(sessionID);
  map.set(sessionID, { at, to });
  pruneSessionObservations(map, at, (value) => value.at);
}

/**
 * Read a session's last admitted `rp_send`.
 *
 * @param {string} sessionID The session to look up.
 * @returns {{ at: number, to: string } | undefined} The newest send, or
 *   `undefined` when none has been observed (e.g. a fresh daemon).
 */
function lastSendFor(sessionID) {
  return getSessionObservationMap(SESSION_LAST_SEND_KEY).get(sessionID);
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
  // Only plain profile filenames are honored: a manifest entry never names a path.
  return new Set(JSON.parse(readFileSync(manifestPath, "utf8")).filter((name) => typeof name === "string" && /^[A-Za-z0-9._-]+\.md$/.test(name)));
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
 *  - every filename written is (re)recorded as RP-owned;
 *  - an RP-owned target whose source profile no longer exists is removed, so
 *    retired profiles never linger in the registry.
 *
 * @param {string} [sourceDir] Absolute path to the directory of source agent
 *   profiles. Defaults to `../agents` resolved relative to this module (the
 *   repository's `agents/` directory at runtime).
 * @param {string} [targetDir] Absolute path to the target agents directory.
 *   Defaults to opencode's global agents directory (see `resolveAgentsTargetDir`).
 * @returns {{ written: string[], collisions: string[], removed: string[] }}
 *   `written` lists the source filenames copied into `targetDir` this run;
 *   `collisions` lists filenames that already existed under `targetDir` as
 *   foreign (non-RP-owned) files, and so were left unmodified; `removed` lists
 *   RP-owned targets deleted because their source profile is gone.
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

  const removed = [];
  const current = new Set(profiles);
  for (const name of [...owned]) {
    if (current.has(name)) continue;
    rmSync(join(targetDir, name), { force: true });
    owned.delete(name);
    removed.push(name);
  }

  writeOwnershipManifest(targetDir, owned);

  return { written, collisions, removed };
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
 *     run: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     activity: string | number,
 *     running?: boolean,
 *     pending?: number,
 *     permissions?: Array<{id: string, action: string, resources: string[]}>,
 *     currentTool: object | undefined,
 *     lastTurn: { endedAt: number, outcome: "succeeded" | "failed" | "interrupted" } | undefined,
 *     turns: number | undefined,
 *     lastSend: { at: number, to: string } | undefined,
 *     lastText: { at: number | undefined, excerpt: string } | { olderThan: number } | undefined,
 *   }>,
 *   errorLog: Array<*>,
 *   loopTickLog?: Array<*>,
 *   readFailures?: Array<{endpoint: string, status: number | "transport", count: number}>,
 * }} input The status payload's components. `pluginVersion` identifies the
 *   running plugin build; `pinComparison` is the result of comparing the
 *   running opencode build against the pin; `ledgerEntries` is one row per
 *   live spawn (see `buildLedgerRows`); `errorLog` and `loopTickLog` are
 *   bounded recent-event rings; `readFailures` lists the server reads that
 *   failed while gathering the ledger — a non-empty list means the ledger's
 *   `running`/`pending`/`permissions`/`lastText` fields are incomplete, not
 *   that the sessions are idle.
 * @returns {{
 *   pluginVersion: string,
 *   pin: "match" | "outside the verified surface" | "not determinable",
 *   ledger: Array<{
 *     name: string,
 *     run: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     activity: string | number,
 *     running?: boolean,
 *     pending?: number,
 *     permissions?: Array<{id: string, action: string, resources: string[]}>,
 *     currentTool: object | undefined,
 *     lastTurn: { endedAt: number, outcome: "succeeded" | "failed" | "interrupted" } | undefined,
 *     turns: number | undefined,
 *     lastSend: { at: number, to: string } | undefined,
 *     lastText: { at: number | undefined, excerpt: string } | { olderThan: number } | undefined,
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
      run: entry.run,
      sessionID: entry.sessionID,
      agent: entry.agent,
      model: entry.model,
      directory: entry.directory,
      updated: entry.updated,
      activity: entry.activity,
      running: entry.running,
      pending: entry.pending,
      permissions: entry.permissions,
      currentTool: entry.currentTool,
      lastTurn: entry.lastTurn,
      turns: entry.turns,
      lastSend: entry.lastSend,
      lastText: entry.lastText,
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
 * declares an output schema, so a tool without one resolves to `null` however
 * much it computed. RP's tools return whatever shape their operation produced
 * (a bare session ID, a status payload, a loop registry listing), so the
 * declared schema is the permissive one that accepts any JSON value rather
 * than a per-tool shape.
 */
const ANY_OUTPUT_SCHEMA = {};

/**
 * Mark a tool descriptor as directly invocable.
 *
 * opencode splits a registered tool by its `options.codemode`: only
 * `codemode: false` reaches the model as a tool of its own, while every other
 * tool is reachable solely inside the `execute` Code Mode wrapper. RP's tools
 * coordinate a run and must be callable in their own right, so each one
 * declares the direct form — as opencode's own built-in tools do.
 *
 * @param {object} tool The tool descriptor to register.
 * @returns {object} The same descriptor, marked for direct invocation.
 */
function asDirectTool(tool) {
  return { ...tool, options: { ...tool.options, codemode: false } };
}

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
function buildSpawnTool(ctx, { resolveRepoRootFn = resolveRepoRoot, collided = () => new Set(), rpProfiles = () => new Set() } = {}) {
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
      if (collided().has(`${agent}.md`)) {
        throw new Error(`Agent "${agent}" is a foreign profile colliding with an RP profile; remove or rename it before spawning`);
      }
      // A project-local profile of the same name would shadow the sealed RP one.
      if (rpProfiles().has(`${agent}.md`)) {
        const repoRoot = resolveRepoRootFn(directory);
        for (const local of ["agents", "agent"]) {
          const shadow = repoRoot ? join(repoRoot, ".opencode", local, `${agent}.md`) : null;
          if (shadow && existsSync(shadow)) {
            throw new Error(`Agent "${agent}" is shadowed by the project-local profile ${shadow}; remove it before spawning`);
          }
        }
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
 * Suppression lasts forever once any attempt confirms the deletion, and
 * `releaseTermination` holds it in place while a peer attempt is still in
 * flight, so no failing attempt can withdraw what a concurrent successful one
 * depends on. A delete that terminated nothing and raced nothing leaves no
 * marker behind.
 *
 * While the outcome is unknown a terminal event is *held*, not dropped:
 * intent to terminate is not termination, and a delete that fails leaves a
 * live session whose failure its spawner still needs. Settling releases what
 * was held unless some attempt confirmed the deletion, and every released
 * report is isolated, so nothing that happens inside one can change what this
 * tool returns or raises.
 *
 * A transport throw is ambiguous — the server may have committed the delete
 * before the socket failed — and is treated as "not terminated", so anything
 * held is reported: a visible surplus report beats an invisible missing one.
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
      // A terminal event that arrives while this delete is in flight is held
      // rather than dropped, so settling has to release it: the session is
      // still alive whenever nothing was terminated, and its failures are
      // still its spawner's business.
      const settle = async (confirmed) => {
        if (endTermination(session, confirmed)) {
          await releaseTermination(session);
        }
      };
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
        await settle(false);
        throw error;
      }
      if (response.status === 404) {
        await settle(false);
        return toToolResult({ status: 404, error: "SessionNotFoundError" });
      }
      if (response.status < 200 || response.status >= 300) {
        await settle(false);
        return toToolResult({ status: response.status, error: "SessionTerminationFailed" });
      }
      await settle(true);
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
 *   now?: () => number,
 * }} [deps] `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client; `now` stamps the sender's
 *   `lastSend` record and defaults to `Date.now`.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSendTool(ctx, { env = process.env, readServiceRecordOverride, requestFn, now = Date.now } = {}) {
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
      // Admission, not receipt: the record answers "has this session
      // messaged anyone, and whom", which is what an idle row lacks.
      recordSend(toolCtx.sessionID, to, now());

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
 * The tool returns as soon as the loop is disarmed and its entry removed. It
 * never waits for a tick already in flight: a tool call holds the calling
 * session's step open, and a tick can be pending for as long as
 * `LOOP_TICK_TIMEOUT_MS`. The abandoned tick observes cancellation at its
 * next guard (see `runLoopTick`) and performs no subsequent effect.
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
      void disarmLoopTimer(id);
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
async function consumeEvents(ctx, onEvent, onIterator) {
  const iterator = ctx.event.subscribe()[Symbol.asyncIterator]();
  onIterator?.(iterator);
  try {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        return;
      }
      await isolateListener(() => onEvent(value));
    }
  } finally {
    onIterator?.(null);
  }
}

/**
 * Keep the event subscription alive for the daemon's lifetime, resubscribing
 * whenever the stream ends or fails, until the signal aborts.
 *
 * The pinned subscribe API accepts no cancellation options, so teardown
 * retains the live iterator and closes it with `return()` when the signal
 * aborts — otherwise a cleaned-up supervisor would stay blocked on `next()`
 * forever while a reloaded plugin starts another.
 *
 * The subscription feeds the progress-veto signal (see
 * `recordSessionEventActivity`); an unsupervised loss would silently stop
 * observation. Because the signal is veto-only, a gap can never *authorize*
 * an interrupt — resubscription just restores the protection.
 *
 * @param {object} ctx The plugin's opencode context.
 * @param {(event: object) => Promise<void>} onEvent Forwarded to `consumeEvents`.
 * @param {{ delayMs?: number, maxRestarts?: number, signal?: AbortSignal }} [options]
 *   Retry pacing; `maxRestarts` bounds the loop in tests (unbounded by
 *   default); `signal` tears the supervisor down (plugin cleanup).
 * @returns {Promise<void>} Resolves when `signal` aborts or `maxRestarts`
 *   is exhausted.
 */
async function superviseEvents(ctx, onEvent, { delayMs = 1_000, maxRestarts = Infinity, signal } = {}) {
  let activeIterator = null;
  const closeActive = () => {
    void activeIterator?.return?.().catch(() => {});
  };
  signal?.addEventListener("abort", closeActive, { once: true });
  try {
    for (let restarts = 0; restarts <= maxRestarts && !signal?.aborted; restarts++) {
      try {
        await consumeEvents(ctx, onEvent, (iterator) => {
          activeIterator = iterator;
          if (signal?.aborted) {
            closeActive();
          }
        });
        if (!signal?.aborted) {
          recordError({ type: "listener.ended", at: Date.now() });
        }
      } catch (error) {
        if (!signal?.aborted) {
          recordError({ type: "listener.lost", error: String(error), at: Date.now() });
        }
      }
      if (signal?.aborted) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  } finally {
    signal?.removeEventListener("abort", closeActive);
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
 * @returns {Promise<() => Promise<void>>} Resolves once this location's tools
 *   and skills are registered, to the location's cleanup: disposes its own
 *   raw-liveness hook, and — when the last live location releases the
 *   shared resources — closes the supervised event subscription, disarms
 *   every loop timer, and clears the once-guard so a reloaded plugin
 *   re-arms.
 */
async function setup(ctx, deps = {}) {
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

  const tick = async (entry, isCancelled, runtime = {}) => {
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
        getInbox: (server, sessionID) => getSessionInbox(server, sessionID, requestFn),
        getMessages: (server, sessionID) => getSessionMessages(server, sessionID, requestFn),
        getLastEventAt: (sessionID) => lastSessionEventAt(sessionID),
        getRawProgressAt: (sessionID) => lastRawSessionProgressAt(sessionID),
        getLastInterruptAt: (sessionID) => lastTargetInterruptAt(sessionID),
        recordInterrupt: (sessionID, at) => recordTargetInterrupt(sessionID, at),
        withTargetLock: withTargetInterruptLock,
        injectPrompt: (sessionID, text, delivery) => ctx.session.prompt({ sessionID, text, delivery }),
        promoteInboxItem: (server, sessionID, inboxID) => promoteInboxItem(server, sessionID, inboxID, requestFn),
        interruptSession: (server, sessionID) => interruptSession(server, sessionID, requestFn),
        onOutcome,
        isCancelled,
        deadStreamConfirmMs: resolveDeadStreamConfirmMs(env),
        state: runtime,
      });
    } catch (error) {
      if (!outcomeRecorded) {
        onOutcome({ outcome: "failed", error: String(error) });
      }
      recordError({ type: "loop.tick.failed", loopID: entry.id, error: String(error), at: Date.now() });
    }
  };

  // Registration is a promise that opencode resolves to a disposable, and
  // `setup` is what the plugin API waits on before treating this location as
  // live — so awaiting it is what keeps a session from being served a tool
  // catalogue that RP has not finished contributing to yet.
  await ctx.tool.transform((tools) => {
    tools.add(asDirectTool(buildSpawnTool(ctx, { resolveRepoRootFn, collided: () => collidedProfiles, rpProfiles: () => rpProfileNames })));
    tools.add(asDirectTool(buildSendTool(ctx, { env, readServiceRecordOverride, requestFn })));
    tools.add(asDirectTool(buildTerminateTool({ env, readServiceRecordOverride, requestFn })));
    tools.add(asDirectTool(buildLoopStartTool({ registryPath, tick })));
    tools.add(asDirectTool(buildLoopListTool(registryPath)));
    tools.add(asDirectTool(buildLoopCancelTool(registryPath)));
    tools.add(
      asDirectTool(buildStatusTool({ env, readServiceRecordOverride, requestFn, readCliVersionOverride })),
    );
    tools.add(asDirectTool(buildPermissionReplyTool({ env, readServiceRecordOverride, requestFn })));
    return tools;
  });

  // Builds up to the previously pinned one took a directory source; newer ones
  // dropped `source` from the draft and take fully-formed skills through
  // `add`. Probing the draft keeps one plugin working on both, rather than
  // dying with "sources.source is not a function" on whichever build the
  // owner happens to run.
  await ctx.skill.transform((skills) => {
    if (typeof skills.source === "function") {
      skills.source({ type: "directory", path: SKILLS_SOURCE_DIR });
      return skills;
    }
    for (const skill of readSkillDirectory(SKILLS_SOURCE_DIR)) {
      skills.add(skill);
    }
    return skills;
  });

  const { collisions, written } = materializeAgents(agentsSourceDir, agentsTargetDir ?? resolveAgentsTargetDir(env));
  const collidedProfiles = new Set(collisions);
  const rpProfileNames = new Set([...written, ...collisions]);
  for (const name of collisions) {
    recordError({ type: "agent.materialize.collision", name });
  }

  let shared = globalThis[SETUP_ONCE_KEY];
  if (!shared || shared === true) {
    shared = { refs: 0, abort: new AbortController() };
    globalThis[SETUP_ONCE_KEY] = shared;
    void superviseEvents(
      ctx,
      async (event) => {
        recordSessionEventActivity(event);
        onToolEvent(event);
        recordTurnEnd(event);
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
      },
      { signal: shared.abort.signal },
    );
    for (const entry of listLoopEntries(registryPath)) {
      void armLoopTimer(entry, tick);
    }
  }
  shared.refs += 1;

  // The raw-liveness observer, registered per location: `ctx.session.hook`
  // is location-scoped, so the once-guarded resources above must not own
  // it — every location tees its own provider responses (see
  // `observeHttpResponse`). Pinned registration inserts the callback
  // synchronously with no failure channel; the guard below still records
  // the unexpected, and the dead-stream gate treats uncovered targets as
  // unobservable rather than silent, so escalation is disabled wherever
  // this hook is missing. A hook landing late cannot retroactively tee a
  // response whose headers already passed; coverage returns only with the
  // next response the hook actually observes.
  const hookRegistration = Promise.resolve()
    .then(() => ctx.session.hook("http.response", observeHttpResponse))
    .catch((error) => {
      recordError({ type: "observer.hook.failed", error: String(error), at: Date.now() });
      return undefined;
    });

  // The plugin API invokes the returned cleanup when unloading a location:
  // dispose only this location's hook, and tear the shared observer and
  // timers down only when the last live location releases them — clearing
  // the once-guard so a reloaded plugin's setup can re-arm everything.
  let cleaned = false;
  return async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    const registration = await hookRegistration;
    await Promise.resolve(registration?.dispose?.()).catch(() => {});
    shared.refs -= 1;
    if (shared.refs <= 0 && globalThis[SETUP_ONCE_KEY] === shared) {
      delete globalThis[SETUP_ONCE_KEY];
      shared.abort.abort();
      const timers = getLoopTimers();
      await Promise.all([...timers.keys()].map((id) => disarmLoopTimer(id)));
    }
  };
}

export default { id: PLUGIN_ID, setup };

export {
  addLoopEntry,
  agentExists,
  appendSpawnProtocol,
  appendToErrorLog,
  armLoopTimer,
  asDirectTool,
  buildBasicAuthHeader,
  buildLedgerRows,
  buildStatusPayload,
  comparePinnedBuild,
  currentToolFor,
  deleteLoopEntry,
  disarmLoopTimer,
  extractLastText,
  fetchRequest,
  formatAttribution,
  formatModelString,
  formatPermissionForward,
  formatRedirectMessage,
  formatStructuredError,
  formatTitle,
  getSessionInbox,
  getSessionMessages,
  getSessionUpdatedAt,
  interruptSession,
  isDeadStreamMessage,
  isSessionActive,
  isSessionNotFoundError,
  isTerminalEvent,
  lastRawSessionProgressAt,
  lastSendFor,
  lastSessionEventAt,
  lastTargetInterruptAt,
  listLoopEntries,
  lookupSpawn,
  materializeAgents,
  observeHttpResponse,
  onPermissionAsked,
  onToolEvent,
  parseModelString,
  parsePermissionAsked,
  parseSkillFrontmatter,
  parseTitle,
  promoteInboxItem,
  readCliVersion,
  readPackageVersion,
  readPinManifest,
  readServiceRecordFile,
  readSkillDirectory,
  recordGenerationID,
  recordRawResponseStart,
  recordRawSessionProgress,
  recordSend,
  recordSessionEventActivity,
  recordSpawn,
  recordTargetInterrupt,
  recordTurnEnd,
  redirectTargets,
  replyToPermission,
  requestServer,
  resolveAgentsTargetDir,
  resolveCurrentSpawn,
  resolveDeadStreamConfirmMs,
  resolveLoopRegistryPath,
  resolveRepoRoot,
  resolveRunningBuild,
  resolveServer,
  runLoopTick,
  setup,
  shapeStatus,
  superviseEvents,
  terminalEventError,
  terminalEventSessionID,
  toToolResult,
  toolTarget,
  turnsFor,
  withTargetInterruptLock,
};
