/**
 * What the plugin observed about each session — raw provider bytes,
 * execution-progress events, turn ends, the executing tool, admitted sends —
 * as age-pruned, process-wide records feeding the health loop and `rp_status`.
 */

import { lookupSpawn } from "./ledger.mjs";

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
 * Provider protocols project the tool-part id from different raw
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
 * silence never authorizes one (opencode emits no events for
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
 * Extract the session ID a terminal event pertains to.
 *
 * @param {object} event The terminal event (see `TURN_END_OUTCOMES`).
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
 * @param {object} event The terminal event (see `TURN_END_OUTCOMES`).
 * @returns {{ type?: string, message?: string } | undefined} The event's
 *   `Session.StructuredError`, read from whichever of the event's known
 *   shapes carries it, or `undefined` when the event carries none.
 */
function terminalEventError(event) {
  return event?.properties?.error ?? event?.data?.error;
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
 * other session observations. Other events are ignored. The turn carries
 * `messaged` when this process saw it begin (see `turnMessaged`).
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
  const lastTurn = { endedAt, outcome };
  const messaged = turnMessaged(
    sessionID,
    previous?.lastTurn.endedAt ?? lookupSpawn(sessionID)?.spawnedAt,
    at ?? Date.now(),
  );
  if (messaged !== undefined) {
    lastTurn.messaged = messaged;
  }
  map.delete(sessionID);
  map.set(sessionID, { turns: (previous?.turns ?? 0) + 1, lastTurn });
  pruneSessionObservations(map, endedAt, (value) => value.lastTurn.endedAt);
}

/**
 * Whether a session sent a message during the turn that began at `beganAt`.
 *
 * A turn begins when its session is spawned or when its previous turn ends.
 * The answer is known only when this process observed that moment within
 * `SESSION_EVIDENCE_RETENTION_MS` of `now`: older evidence — the previous
 * turn's end, or a send — may have aged out, which would pass for a first
 * turn or for silence. A send stamped exactly at the beginning counts, so an
 * ambiguous instant never reads as silence.
 *
 * @param {string} sessionID The session whose turn ended.
 * @param {number | undefined} beganAt When the turn began.
 * @param {number} now The current timestamp.
 * @returns {boolean | undefined} Whether an admitted `rp_send` falls in the
 *   turn, or `undefined` when its beginning is unknown.
 */
function turnMessaged(sessionID, beganAt, now) {
  if (beganAt === undefined || now - beganAt > SESSION_EVIDENCE_RETENTION_MS) {
    return undefined;
  }
  const send = lastSendFor(sessionID);
  return send !== undefined && send.at >= beganAt;
}

/**
 * Read a session's turn record.
 *
 * @param {string} sessionID The session to look up.
 * @returns {{ turns: number, lastTurn: { endedAt: number, outcome: "succeeded" | "failed" | "interrupted", messaged?: boolean } } | undefined}
 *   The count of turns observed ending and the newest one, or `undefined`
 *   when none has been observed (e.g. a fresh daemon).
 */
function turnsFor(sessionID) {
  return getSessionObservationMap(SESSION_TURNS_KEY).get(sessionID);
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
 * Every session is tracked — the ledger surfaces only the ones RP recognizes
 * — and entries age out like the other session observations.
 * `session.tool.input.started` remembers the call's tool name; `session.tool.called` marks the call as
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
  if (!sessionID || !callID) {
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
    const since = now();
    state.current.delete(sessionID);
    state.current.set(sessionID, {
      callID,
      tool,
      target: toolTarget(props.input ?? {}),
      since,
    });
    pruneSessionObservations(state.current, since, (value) => value.since);
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

export {
  currentToolFor,
  generationCarries,
  getSessionObservationMap,
  lastRawSessionProgressAt,
  lastSendFor,
  lastSessionEventAt,
  observeHttpResponse,
  onToolEvent,
  recordGenerationID,
  recordRawResponseStart,
  recordRawSessionProgress,
  recordSend,
  recordSessionEventActivity,
  recordSessionObservation,
  recordTurnEnd,
  terminalEventError,
  terminalEventSessionID,
  toolTarget,
  turnsFor,
};
