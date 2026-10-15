/**
 * Who a session is: the spawn identity `rp_spawn` writes, the process-wide
 * ledger and parentage records, and the resolution that decides which RP tools
 * a caller may use.
 */

import { requestServer, sessionReadError } from "./server.mjs";

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
 * The session-metadata key under which `rp_spawn` stores a spawned session's
 * identity. Written once, at creation, so it survives daemon restarts and
 * every later title change.
 */
const SPAWN_METADATA_KEY = "rp";

/**
 * Read the spawn identity a stored session record carries.
 *
 * @param {{ id: string, metadata?: object | null }} record A session record
 *   (`GET /api/session` or `GET /api/session/:id`).
 * @returns {{ name: string, pipelineSlug: string, spawner: string } | undefined}
 *   The identity `rp_spawn` wrote, or `undefined` when the session carries
 *   none (RP did not spawn it).
 * @throws {Error} When the record carries RP metadata that is not a
 *   well-formed identity.
 */
function spawnIdentity(record) {
  const identity = record.metadata?.[SPAWN_METADATA_KEY];
  if (identity === undefined) {
    return undefined;
  }
  const { name, pipelineSlug, spawner } = identity ?? {};
  if ([name, pipelineSlug, spawner].some((value) => typeof value !== "string")) {
    throw new Error(`Session ${record.id} carries malformed RP metadata`);
  }
  return { name, pipelineSlug, spawner };
}

/**
 * `globalThis` key backing the process-wide spawn ledger.
 *
 * opencode may re-import this module under a distinct resolved URL for each
 * per-directory `setup(ctx)` re-run, which would otherwise give each re-run
 * its own module scope and a fresh, empty ledger. Storing the ledger on
 * `globalThis` under a stable key instead means every such re-import shares
 * one ledger for the lifetime of the daemon process.
 */
const LEDGER_KEY = Symbol.for("radical-pipelines.opencode.ledger");

/**
 * Fetch the process-wide spawn ledger, creating it on first use.
 *
 * The ledger caches the spawn identities sessions carry in their metadata
 * (see `spawnIdentity`): `rp_spawn` records each session it creates, and
 * `resolveSession` records a session it reads.
 *
 * @returns {{
 *   bySessionID: Map<string, { name: string, pipelineSlug: string, spawner: string, directory?: string, repoRoot?: string | null, spawnedAt?: number }>,
 * }} The singleton ledger, keyed by session ID.
 */
function getLedger() {
  if (!globalThis[LEDGER_KEY]) {
    globalThis[LEDGER_KEY] = { bySessionID: new Map() };
  }
  return globalThis[LEDGER_KEY];
}

/**
 * Record a spawned session in the ledger.
 *
 * @param {string} sessionID The spawned session's ID.
 * @param {{ name: string, pipelineSlug: string, spawner: string, directory?: string, repoRoot?: string | null, spawnedAt?: number }} entry
 *   The spawned instance's pipeline-unique name, the slug of the pipeline it belongs to, the
 *   session ID of the agent that spawned it, the directory the session is
 *   seated in, the root of the repository containing that seat (`null`
 *   when it could not be resolved), and when this process spawned it (absent
 *   for a session it only read).
 * @returns {void}
 */
function recordSpawn(sessionID, entry) {
  getLedger().bySessionID.set(sessionID, entry);
}

/**
 * Look up a recorded spawn by its session ID.
 *
 * Answers only from the ledger; `resolveSession` answers for sessions it has
 * not recorded yet.
 *
 * @param {string} sessionID The session ID to look up.
 * @returns {{ name: string, pipelineSlug: string, spawner: string, directory?: string, repoRoot?: string | null, spawnedAt?: number } | undefined}
 *   The entry recorded for `sessionID`, or `undefined` if none is.
 */
function lookupSpawn(sessionID) {
  return getLedger().bySessionID.get(sessionID);
}

/**
 * `globalThis` key backing the process-wide record of session parentage.
 * Shares the re-import rationale of `LEDGER_KEY`.
 */
const SESSION_PARENTAGE_KEY = Symbol.for("radical-pipelines.opencode.sessionParentage");

/**
 * Fetch the process-wide parentage record, creating it on first use.
 *
 * @returns {Map<string, boolean>} Session ID to whether opencode created it
 *   as the child of another session. Absence means unobserved, which is not
 *   the same as unparented (see `resolveSession`).
 */
function getSessionParentage() {
  if (!globalThis[SESSION_PARENTAGE_KEY]) {
    globalThis[SESSION_PARENTAGE_KEY] = new Map();
  }
  return globalThis[SESSION_PARENTAGE_KEY];
}

/**
 * `globalThis` key backing the in-flight session reads, so concurrent
 * callers asking about one session share a single answer.
 */
const SESSION_READS_PENDING_KEY = Symbol.for("radical-pipelines.opencode.sessionReadsPending");

/**
 * Fetch the in-flight session reads, creating the map on first use.
 *
 * @returns {Map<string, {answer: Promise<{ child: boolean, spawn?: object } | undefined>, lastKnown?: boolean}>}
 *   Session ID to the read currently answering for it. The wrapper object,
 *   not the promise, is the identity a deletion invalidates.
 */
function getPendingSessionReads() {
  if (!globalThis[SESSION_READS_PENDING_KEY]) {
    globalThis[SESSION_READS_PENDING_KEY] = new Map();
  }
  return globalThis[SESSION_READS_PENDING_KEY];
}

/**
 * `globalThis` key backing the insertion-ordered set of remembered root
 * sessions — the cached half of the parentage record. Shares the re-import
 * rationale of `LEDGER_KEY`.
 */
const SESSION_ROOTS_KEY = Symbol.for("radical-pipelines.opencode.sessionRoots");

/**
 * Fetch the remembered root sessions, creating the set on first use.
 *
 * @returns {Set<string>} Root session IDs in insertion order, so the oldest
 *   is evicted first without scanning the parentage record.
 */
function getRootSessions() {
  if (!globalThis[SESSION_ROOTS_KEY]) {
    globalThis[SESSION_ROOTS_KEY] = new Set();
  }
  return globalThis[SESSION_ROOTS_KEY];
}

/**
 * How many root sessions are cached before the oldest is dropped.
 *
 * The parentage record holds two kinds of fact, and they are retained by
 * different rules because they are not the same kind of thing:
 *
 * - A **root** entry is a cache. Losing one costs a single read, so their
 *   number is what this bounds.
 * - A **subagent** entry is the access boundary itself. Dropping one and
 *   then failing to read its replacement answer grants that subagent every
 *   tool — reachable in practice, not in theory — so a subagent is held
 *   until its deletion is observed, and no count releases it.
 *
 * Bounding the record as a whole would collapse that distinction and let
 * the unbounded population starve the bounded one: subagents alone would
 * fill the budget and leave nothing cached. opencode reclaims a subagent
 * when its *parent* is deleted rather than when its task returns, so the
 * subagents of a terminated agent are reclaimed while those of a session
 * that is never deleted accumulate.
 */
const ROOT_SESSION_CACHE_CAP = 4096;

/**
 * Remember one session's parentage, bounding what is retained.
 *
 * @param {string} sessionID The session to record.
 * @param {boolean} child Whether opencode created it under a parent.
 * @returns {void}
 */
function recordParentage(sessionID, child) {
  const parentage = getSessionParentage();
  const roots = getRootSessions();
  parentage.delete(sessionID);
  roots.delete(sessionID);
  parentage.set(sessionID, child);
  if (!child) {
    roots.add(sessionID);
  }
  while (roots.size > ROOT_SESSION_CACHE_CAP) {
    const oldest = roots.values().next().value;
    roots.delete(oldest);
    parentage.delete(oldest);
  }
}

/**
 * Remember a session's parentage, as reported by `session.created`.
 *
 * A session opencode creates with a `parentID` is a subagent: another
 * session delegated to it inside its own turn, and it delivers its result by
 * returning, not by addressing anyone. `resolveSession` needs that fact.
 *
 * A creation *without* a `parentID` is recorded too — it is positive
 * evidence of a root session, and recording it spares that session the
 * lookup its absence would otherwise cost.
 *
 * A fork is not a child: opencode emits `session.forked` for one and records
 * its lineage as a fork of its origin, leaving parentage null. Reading only
 * `session.created` therefore leaves a forked orchestrator a root session.
 *
 * @param {{type?: string, data?: {sessionID?: string, parentID?: string}}} event
 *   An opencode event.
 * @returns {void}
 */
function recordSessionParent(event) {
  const sessionID = event?.data?.sessionID;
  if (typeof sessionID !== "string") {
    return;
  }
  if (event.type === "session.created") {
    recordParentage(sessionID, typeof event.data.parentID === "string");
    return;
  }
  // A deleted session's ID answers for nothing, and a daemon that kept every
  // one it ever saw would grow for as long as it runs.
  if (event.type === "session.deleted") {
    const inFlight = getPendingSessionReads().get(sessionID);
    if (inFlight) {
      // Deletion retires the memo for callers still to come; it does not
      // unclassify the one already waiting on this read. Hand that caller
      // what the record knew, or its own read will come back 404 — the
      // session is gone — and a subagent would widen on the way out.
      inFlight.lastKnown = getSessionParentage().get(sessionID);
    }
    getSessionParentage().delete(sessionID);
    getRootSessions().delete(sessionID);
    // Also drop any read still in flight for it: that read began before the
    // deletion and would otherwise reinsert the session it just answered
    // for. `rp_terminate` produces exactly that ordering.
    getPendingSessionReads().delete(sessionID);
  }
}

/**
 * The one RP tool a spawned agent needs: its profile requires it to message
 * its requester and the orchestrator, and nothing else.
 */
const AGENT_TOOL = "rp_send";

/**
 * Resolve what RP knows about a session: whether opencode created it as a
 * subagent, and the spawn identity it carries.
 *
 * Both facts come from opencode's stored session record, which a caller
 * cannot forge: its parentage, and the metadata `rp_spawn` writes at
 * creation (see `spawnIdentity`). Both are normally known without a read: a
 * session in the ledger is one `rp_spawn` created without a parent, and any
 * other session this process watched being created carries no identity, its
 * parentage told by the `session.created` event.
 *
 * Any other session is *asked about* rather than assumed: the event
 * subscription replays no history and resubscribes after a dropped stream
 * rather than recovering what fell in the gap, and a restart empties the
 * ledger while the sessions it recorded live on. Otherwise a subagent born in
 * such a gap would pass for a root session, and a spawned agent that
 * outlived a restart would pass for no agent at all. The answer is
 * remembered, so a session is asked about at most once.
 *
 * @param {string} sessionID The session to resolve.
 * @param {{ readSession: (sessionID: string) => Promise<{ child: boolean, spawn?: object } | undefined> }} deps
 *   `readSession` reads the stored session record, or answers `undefined`
 *   when it cannot be read.
 * @returns {Promise<{ child: boolean | undefined, spawn: object | undefined }>}
 *   `child` is `undefined` when the session could not be classified;
 *   `spawn` is its ledger entry, or `undefined` when it carries none or
 *   could not be read.
 */
async function resolveSession(sessionID, { readSession }) {
  let child = getSessionParentage().get(sessionID);
  const recorded = lookupSpawn(sessionID);
  if (recorded) {
    return { child: child ?? false, spawn: recorded };
  }
  let read;
  if (child === undefined) {
    // One read answers every caller waiting on the same session: separate
    // reads could disagree — an unreadable one beside a successful one —
    // and hand the same caller a different verdict depending on which it
    // happened to hold.
    const pending = getPendingSessionReads();
    let inFlight = pending.get(sessionID);
    if (!inFlight) {
      inFlight = {};
      inFlight.answer = (async () => {
        try {
          return await readSession(sessionID);
        } catch {
          return undefined;
        }
      })();
      pending.set(sessionID, inFlight);
    }
    read = await inFlight.answer;
    // The read stands only if nothing invalidated it while it was open. A
    // deletion drops it from the pending map, and its answer — about a
    // session that no longer exists — is then discarded rather than
    // remembered.
    const current = pending.get(sessionID) === inFlight;
    if (current) {
      pending.delete(sessionID);
    }
    // An event that landed while the read was in flight is authoritative:
    // the read answers only for a session still unaccounted for.
    child = getSessionParentage().get(sessionID);
    if (child === undefined) {
      // What the record knew when a deletion emptied it mid-read, else the
      // read — the same order as above, the event's word ahead of the read's.
      // Either is unfit to be *remembered* once invalidated, having been
      // overtaken by the deletion of the session it describes, and either
      // remains true of the caller holding it. Classifying from it is what
      // keeps a session being destroyed mid-call from widening on its way
      // out.
      const answer = inFlight.lastKnown ?? read?.child;
      if (answer !== undefined) {
        if (current) {
          recordParentage(sessionID, answer);
        }
        child = answer;
      }
    }
    if (current && read?.spawn) {
      recordSpawn(sessionID, read.spawn);
    }
  }
  return { child, spawn: lookupSpawn(sessionID) ?? read?.spawn };
}

/**
 * Decide which RP tools a calling session may use.
 *
 * Three callers exist, told apart by what `resolveSession` knows of them:
 *
 * - A **subagent** gets none. It returns its result to whoever delegated to
 *   it, which is the contract it was created under; reaching past that to
 *   address a session by ID is not part of its work.
 * - A **spawned agent** gets `rp_send` alone. Driving a run — spawning,
 *   terminating, health loops, answering permission asks — belongs to the
 *   session that spawned it.
 * - **Anything else** — the orchestrator, which nothing spawned, and the
 *   owner's own session — gets all of them.
 *
 * Only an unanswerable question opens the boundary. Any read that fails to
 * answer counts — an unreachable server, and equally one that replies 500 or
 * 404 — after which an unclassified caller is treated as a root session,
 * because refusing every caller RP cannot classify would stop the
 * orchestrator too.
 *
 * @param {string} sessionID The calling session's authoritative ID, as
 *   opencode supplies it to a tool's `execute`.
 * @param {{ readSession: Function }} deps Forwarded to `resolveSession`.
 * @returns {Promise<"none" | "send-only" | "full">} The caller's access.
 */
async function resolveToolAccess(sessionID, deps) {
  const { child, spawn } = await resolveSession(sessionID, deps);
  if (child) {
    return "none";
  }
  return spawn ? "send-only" : "full";
}

/**
 * Read what a stored session record says about the session: whether it was
 * created as the child of another, and the spawn identity it carries.
 *
 * The durable answer for the sessions this process did not watch being
 * created (see `resolveSession`).
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session ID to read.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<{ child: boolean, spawn?: { name: string, pipelineSlug: string, spawner: string, directory?: string } }>}
 *   `child` is `true` when the stored session names a parent; `spawn` is its
 *   spawn identity (see `spawnIdentity`) with the directory it is seated in.
 * @throws {Error} On a non-2xx response, carrying its status, or on a record
 *   that is not a session or carries malformed RP metadata.
 */
async function readSessionIdentity(server, sessionID, requestFn) {
  const response = await requestServer(
    server,
    "GET",
    `/api/session/${sessionID}`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw sessionReadError(`GET /api/session/${sessionID}`, response.status);
  }
  const record = response.body?.data;
  if (record?.id !== sessionID) {
    throw new Error(`GET /api/session/${sessionID} returned no session record`);
  }
  const identity = spawnIdentity(record);
  return {
    child: typeof record.parentID === "string",
    ...(identity && { spawn: { ...identity, directory: record.location?.directory } }),
  };
}

export {
  AGENT_TOOL,
  SPAWN_METADATA_KEY,
  formatModelString,
  getLedger,
  lookupSpawn,
  parseModelString,
  readSessionIdentity,
  recordSessionParent,
  recordSpawn,
  resolveSession,
  resolveToolAccess,
  spawnIdentity,
};
