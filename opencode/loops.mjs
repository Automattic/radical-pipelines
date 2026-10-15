/**
 * Health loops: the durable registry, the armed timers, the tick with its
 * coalescing, failed-probe backoff and dead-stream escalation, and the
 * `rp_loop_*` tools.
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { isSessionNotFoundError } from "./client.mjs";
import { appendToErrorLog, recordError } from "./diagnostics.mjs";
import { generationCarries, getSessionObservationMap, recordSessionObservation } from "./observations.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";

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
 * heuristic, tuned so that a false
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

/** `globalThis` key backing the bounded recent health-loop tick log. */
const LOOP_TICK_LOG_KEY = Symbol.for("radical-pipelines.opencode.loopTickLog");

/** Default cap for the in-memory recent health-loop tick ring. */
const DEFAULT_LOOP_TICK_LOG_CAP = 100;

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
 *   before the interrupt. The interrupt runs with `resume=true`, after
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
    // A target that no longer exists is terminal, not transient: no later
    // tick can find it again, so the loop reports it once and its owner
    // retires it (see `setup`) instead of failing on every interval forever.
    if (isSessionNotFoundError(error)) {
      const missing = { outcome: "target-missing" };
      onOutcome(missing);
      return missing;
    }
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
      // (`resume=true` resumes steering input while queued prompts stay
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
    description: "List every currently registered health loop with its recent ticks.",
    output: ANY_OUTPUT_SCHEMA,
    input: { type: "object", properties: {} },
    async execute() {
      const ticks = getLoopTickLog();
      return toToolResult(
        listLoopEntries(registryPath).map((entry) => ({
          ...entry,
          recentTicks: ticks.filter((tick) => tick.loopID === entry.id),
        })),
      );
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

export {
  addLoopEntry,
  armLoopTimer,
  buildLoopCancelTool,
  buildLoopListTool,
  buildLoopStartTool,
  deleteLoopEntry,
  disarmLoopTimer,
  getLoopTimers,
  isDeadStreamMessage,
  lastTargetInterruptAt,
  listLoopEntries,
  recordLoopTick,
  recordTargetInterrupt,
  resolveDeadStreamConfirmMs,
  resolveLoopRegistryPath,
  runLoopTick,
  withTargetInterruptLock,
};
