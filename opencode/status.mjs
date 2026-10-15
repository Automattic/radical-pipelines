/**
 * The `rp_status` tool: gathering opencode's session records and the plugin's
 * observations into the status payload.
 */

import { displayAgentName } from "./agents.mjs";
import { formatStructuredError, getErrorLog } from "./diagnostics.mjs";
import { formatModelString, getLedger, spawnIdentity } from "./ledger.mjs";
import {
  currentToolFor,
  lastRawSessionProgressAt,
  lastSendFor,
  lastSessionEventAt,
  turnsFor,
} from "./observations.mjs";
import { readServiceRecordFile, requestServer, resolveServer } from "./server.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";
import { PLUGIN_ID } from "./version.mjs";

/** Page size `rp_status` lists sessions with. */
const SESSION_LIST_PAGE = 500;

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
 * parts carry no time of their own in the session projection. A full page
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
 * the plugin's own per-session observations.
 *
 * @param {Array<{ id: string, agent: string, model: object, location?: {directory: string}, time?: {updated: *}, metadata?: object }>} sessionRecords
 *   The session records to report (`GET /api/session`, already narrowed to
 *   the status call's scope).
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
 *   lastTextFor?: (sessionID: string) => { at: number | undefined, excerpt: string } | { olderThan: number } | null | undefined,
 * }} [observations] Resolvers for the plugin's own per-session observations
 *   (see `lastSessionEventAt`, `lastRawSessionProgressAt`, `turnsFor`,
 *   `lastSendFor`, `extractLastText`); each defaults to none.
 * @returns {Array<{name: string, pipelineSlug: string, sessionID: string, agent: string, model: string, directory: string, activity: *, running: boolean | undefined, pending: number | undefined, permissions: Array<object> | undefined, currentTool: object | undefined, lastTurn: object | undefined, lastSend: object | undefined, lastText: object | null | undefined}>}
 *   One row per session record carrying a spawn identity (see
 *   `spawnIdentity`), in `sessionRecords` order; other records are omitted.
 *   `activity` is the latest of the record's `updated` — which
 *   opencode moves only when the session receives input — the
 *   session's last observed progress event, and its last raw provider byte
 *   (a streaming tool call's partial arguments emit no event), so it covers
 *   tool and model progress within a turn.
 */
function buildLedgerRows(
  sessionRecords,
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
    const entry = spawnIdentity(record);
    if (!entry) {
      continue;
    }
    const updated = record.time?.updated;
    rows.push({
      name: entry.name,
      pipelineSlug: entry.pipelineSlug,
      sessionID: record.id,
      agent: displayAgentName(record.agent),
      model: record.model ? formatModelString(record.model) : record.model,
      directory: record.location?.directory,
      activity: latestOf(updated, lastEventAtFor(record.id), rawProgressAtFor(record.id)),
      running: activeSessionIDs?.has(record.id),
      pending: pendingCountFor(record.id),
      permissions: permissionsFor(record.id),
      currentTool: currentToolForFn(record.id),
      lastTurn: turnsForFn(record.id)?.lastTurn,
      lastSend: lastSendForFn(record.id),
      lastText: lastTextFor(record.id),
    });
  }
  return rows;
}

/**
 * Whether an error-log entry concerns one of the sessions in scope.
 *
 * An entry naming a session is that session's; an entry naming none (a lost
 * listener, a failed hook, a loop that lost its server) concerns every
 * scope.
 *
 * @param {object} entry An error-log entry.
 * @param {Set<string>} sessionIDs The sessions in scope.
 * @returns {boolean}
 */
function errorInScope(entry, sessionIDs) {
  return entry.sessionID === undefined || sessionIDs.has(entry.sessionID);
}

/**
 * The sessions a status scope covers: those RP recognizes — recorded in the
 * ledger, or live with a spawn identity — that the scope selects. The
 * ledger's part is independent of what the server lists, so a recorded
 * session the server no longer returns stays in scope.
 *
 * @param {{ pipelineSlug?: string, session?: string }} scope
 * @param {Array<{ id: string }>} liveRecords The in-scope session records
 *   the server returned.
 * @returns {Set<string>}
 */
function scopedSessionIDs({ pipelineSlug, session }, liveRecords) {
  const ids = new Set(liveRecords.map((record) => record.id));
  for (const [sessionID, entry] of getLedger().bySessionID) {
    if (session !== undefined ? sessionID === session : entry.pipelineSlug === pipelineSlug) {
      ids.add(sessionID);
    }
  }
  return ids;
}

/**
 * Gather and shape the `rp_status` payload for one scope.
 *
 * The scope is one pipeline (`pipelineSlug`), one session (`session`), or
 * everything RP recognizes. Reads the ledger snapshot and per-session
 * pending counts over the reach helper and the HTTP client (never an
 * `opencode api` shell-out); when the server cannot be resolved, the ledger
 * comes back empty rather than firing requests blind. Per-session reads run
 * only for the sessions in scope, and the transcript — the newest assistant
 * text — is read only for the single session of a `session` scope.
 *
 * @param {{
 *   pipelineSlug?: string,
 *   session?: string,
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   now?: () => number,
 * }} [options] `env` defaults to `process.env`; `readServiceRecord` defaults
 *   to `readServiceRecordFile`; `requestFn` defaults to the real HTTP client.
 * @returns {Promise<object>} The shaped status payload (see `shapeStatus`).
 */
async function buildStatusPayload({
  pipelineSlug,
  session,
  env = process.env,
  readServiceRecord: readServiceRecordOverride,
  requestFn,
  now = Date.now,
} = {}) {
  if (pipelineSlug !== undefined && session !== undefined) {
    throw new Error("rp_status takes pipeline_slug or session, not both");
  }
  const readRecord = readServiceRecordOverride ?? readServiceRecordFile;

  const server = resolveServer({ env, readServiceRecord: readRecord });

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
  const readEndpoint = async (endpoint, path, valid = Array.isArray) => {
    try {
      const response = await requestServer(server, "GET", path, undefined, requestFn);
      if (ok(response)) {
        if (!valid(response.body?.data)) {
          noteFailure(endpoint, "malformed");
          return null;
        }
        return response;
      }
      noteFailure(endpoint, response.status);
    } catch {
      noteFailure(endpoint, "transport");
    }
    return null;
  };
  const inScope = (record) => {
    let entry;
    try {
      entry = spawnIdentity(record);
    } catch {
      noteFailure("session", "malformed");
      return false;
    }
    if (!entry) {
      return false;
    }
    if (session !== undefined) {
      return record.id === session;
    }
    return pipelineSlug === undefined || entry.pipelineSlug === pipelineSlug;
  };

  if (server) {
    // Every opencode HTTP GET response envelopes its payload as
    // `{ data: ... }` — verified live against opencode. The list is paged
    // and cannot be filtered by metadata, so every page is read.
    let cursor;
    do {
      const query = `limit=${SESSION_LIST_PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const sessionsResponse = await readEndpoint("session", `/api/session?${query}`);
      if (!sessionsResponse) {
        break;
      }
      const records = sessionsResponse.body.data;
      if (!records.every((record) => record && typeof record.id === "string")) {
        noteFailure("session", "malformed");
        break;
      }
      sessionRecords.push(...records.filter(inScope));
      // The page names the next one, or `null` at the end of the list.
      const next = sessionsResponse.body.cursor?.next;
      if (typeof next !== "string" && next !== null) {
        noteFailure("session", "malformed");
        break;
      }
      cursor = records.length > 0 ? next : null;
    } while (cursor);
    const activeResponse = await readEndpoint(
      "active", "/api/session/active",
      (data) => data !== null && typeof data === "object" && !Array.isArray(data),
    );
    if (activeResponse) {
      activeIDs = new Set(Object.keys(activeResponse.body.data));
    }
    for (const record of sessionRecords) {
      if (!Number.isFinite(record.time?.updated)) {
        noteFailure("activity", "malformed");
      }
      const inboxResponse = await readEndpoint("inbox", `/api/session/${record.id}/inbox`);
      if (inboxResponse) {
        pendingCounts.set(record.id, inboxResponse.body.data.length);
      }
      const permissionsResponse = await readEndpoint(
        "permission",
        `/api/session/${record.id}/permission`,
        (data) => Array.isArray(data) && data.every((item) =>
          item && typeof item.id === "string" && typeof item.action === "string" &&
          Array.isArray(item.resources) && item.resources.every((resource) => typeof resource === "string")),
      );
      if (permissionsResponse) {
        pendingPermissions.set(
          record.id,
          permissionsResponse.body.data.map((item) => ({
            id: item.id,
            action: item.action,
            resources: item.resources,
          })),
        );
      }
      if (session === undefined) {
        continue;
      }
      // Newest text: a cheap page first, the deeper one only when the first
      // is full and textless (a long run of tool-only steps).
      const firstPage = await readEndpoint(
        "message",
        `/api/session/${record.id}/message?limit=${LAST_TEXT_PAGE}`,
      );
      if (firstPage) {
        let lastText = extractLastText(firstPage.body.data, LAST_TEXT_PAGE);
        if (lastText?.olderThan !== undefined) {
          const deepPage = await readEndpoint(
            "message",
            `/api/session/${record.id}/message?limit=${LAST_TEXT_DEEP_PAGE}`,
          );
          if (deepPage) {
            lastText = extractLastText(deepPage.body.data, LAST_TEXT_DEEP_PAGE);
          }
        }
        lastTexts.set(record.id, lastText ?? null);
      }
    }
  } else {
    noteFailure("server", "unreachable");
  }

  const ledgerEntries = buildLedgerRows(
    sessionRecords,
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
  const scoped = pipelineSlug !== undefined || session !== undefined;
  const inScopeIDs = scopedSessionIDs({ pipelineSlug, session }, sessionRecords);

  return shapeStatus({
    pluginVersion: PLUGIN_ID,
    ledgerEntries,
    errorLog: scoped ? getErrorLog().filter((entry) => errorInScope(entry, inScopeIDs)) : getErrorLog(),
    readFailures: [...failures.values()],
    pipelineSlug,
    now: now(),
  });
}

/** Maximum length of a health check's failure cause. */
const ERROR_SUMMARY_CAP = 200;

/** Keep the failure's identity, time, and bounded cause for health checks. */
function summarizeError(entry) {
  const cause = entry.error ?? entry.reason ?? entry.status;
  const text = cause === undefined ? undefined : formatStructuredError(cause).replace(/\s+/g, " ").trim();
  return {
    type: entry.type,
    ...(entry.sessionID !== undefined ? { sessionID: entry.sessionID } : {}),
    at: entry.at,
    ...(text === undefined ? {} : {
      error: text.length > ERROR_SUMMARY_CAP ? `${text.slice(0, ERROR_SUMMARY_CAP)}…` : text,
    }),
  };
}

/**
 * Shape the `rp_status` tool result from its component inputs.
 *
 * Pure: every input is supplied by the caller — the plugin's `rp_status`
 * handler gathers the plugin version, the ledger snapshot, and the error log (see
 * `appendToErrorLog`) from their respective sources — so this function
 * performs no I/O of its own.
 *
 * @param {{
 *   pluginVersion: string,
 *   ledgerEntries: Array<{
 *     name: string,
 *     pipelineSlug: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     activity: string | number,
 *     running?: boolean,
 *     pending?: number,
 *     permissions?: Array<{id: string, action: string, resources: string[]}>,
 *     currentTool: object | undefined,
 *     lastTurn: { endedAt: number, outcome: "succeeded" | "failed" | "interrupted", messaged?: boolean } | undefined,
 *     lastSend: { at: number, to: string } | undefined,
 *     lastText: { at: number | undefined, excerpt: string } | { olderThan: number } | null | undefined,
 *   }>,
 *   errorLog: Array<*>,
 *   readFailures?: Array<{endpoint: string, status: number | string, count: number}>,
 *   pipelineSlug?: string,
 *   now?: number,
 * }} input The status payload's components. `pluginVersion` identifies the
 *   running plugin build; `ledgerEntries` is one row per live spawn in scope
 *   (see `buildLedgerRows`); `errorLog` is the bounded recent-errors ring,
 *   narrowed to the scope; `readFailures` lists the server reads that
 *   failed while gathering the ledger — a non-empty list means the ledger's
 *   `running`/`pending`/`permissions`/`lastText` fields are incomplete, not
 *   that the sessions are idle.
 * @returns {object} A pipeline scope carries health fields and failure
 *   summaries; other scopes carry diagnostic rows and the full event log.
 *   `lastText` is present only when a session scope read the transcript.
 */
function shapeStatus({ pluginVersion, ledgerEntries, errorLog, readFailures = [], pipelineSlug, now = Date.now() }) {
  if (pipelineSlug !== undefined) {
    return {
      ledger: ledgerEntries.map((entry) => ({
        sessionID: entry.sessionID,
        running: entry.running ?? null,
        secondsSinceActivity: Number.isFinite(entry.activity)
          ? Math.max(0, Math.floor((now - entry.activity) / 1000))
          : null,
        pending: entry.pending ?? null,
        permissions: entry.permissions ?? null,
      })),
      recentErrors: errorLog.filter((entry) => entry.level === "error").map(summarizeError),
      readFailures,
    };
  }
  return {
    pluginVersion,
    ledger: ledgerEntries.map((entry) => ({
      name: entry.name,
      pipelineSlug: entry.pipelineSlug,
      sessionID: entry.sessionID,
      agent: entry.agent,
      model: entry.model,
      directory: entry.directory,
      activity: entry.activity,
      running: entry.running,
      pending: entry.pending,
      permissions: entry.permissions,
      currentTool: entry.currentTool,
      lastTurn: entry.lastTurn,
      lastSend: entry.lastSend,
      ...(entry.lastText !== undefined ? { lastText: entry.lastText } : {}),
    })),
    recentErrors: errorLog,
    readFailures,
  };
}

/**
 * Build the `rp_status` tool descriptor.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps Passed through to `buildStatusPayload`.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildStatusTool({ env, readServiceRecordOverride, requestFn }) {
  return {
    name: "rp_status",
    description:
      "Report compact pipeline health (pipeline_slug), detailed session diagnostics (session), or all RP sessions and the plugin version (unscoped). Scoped reports include their sessions' events and events naming no session; pipeline health includes only failure summaries. readFailures marks incomplete status reads.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        pipeline_slug: { type: "string", description: "Health overview: sessionID, running, secondsSinceActivity, pending, permissions, and failure summaries. Excludes session." },
        session: {
          type: "string",
          description: "Investigate one session: identity, configuration, activity timestamp, execution details, newest assistant text, and full diagnostic events. Excludes pipeline_slug.",
        },
      },
    },
    async execute({ pipeline_slug, session } = {}) {
      return toToolResult(
        await buildStatusPayload({
          pipelineSlug: pipeline_slug,
          session,
          env,
          readServiceRecord: readServiceRecordOverride,
          requestFn,
        }),
      );
    },
  };
}

export {
  buildLedgerRows,
  buildStatusPayload,
  buildStatusTool,
  extractLastText,
  shapeStatus,
};
