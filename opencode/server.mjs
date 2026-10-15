/**
 * Reaching the opencode server: resolving how to address the running
 * process, the authenticated HTTP client, and the session reads the tools and
 * loops share.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
 * The service record is written only while a daemon (`opencode service
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
 * Tags observed on a dead-target session error, across the two shapes it
 * appears in: the in-process `ctx.session.prompt` rejection (`name`/`_tag`
 * `"Session.NotFoundError"`, no HTTP status — verified live against the
 * tested runtime) and the raw HTTP response body (`_tag: "SessionNotFoundError"`,
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
 * Build the error a non-2xx read of a *session-addressed* endpoint throws.
 *
 * The status travels on the error so a caller can tell a target that no
 * longer exists from a transport failure it should keep retrying (see
 * `isSessionNotFoundError`). The message stays the request line, which is
 * what the bounded error log surfaces.
 *
 * @param {string} request The request line, e.g. `"GET /api/session/x/inbox"`.
 * @param {number} status The HTTP status the server answered with.
 * @returns {Error} The error to throw, carrying `status`.
 */
function sessionReadError(request, status) {
  const error = new Error(`${request} returned ${status}`);
  error.status = status;
  return error;
}

/**
 * Check whether opencode currently reports a session as running.
 *
 * Backs the loop tick's idle check and would back any other liveness read;
 * reads `GET /api/session/active`, whose body envelopes the object keyed by
 * the session IDs currently running as `{ data: {...} }` — every opencode
 * HTTP GET response is wrapped in this `data` envelope, verified live against
 * the tested runtime.
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
    throw sessionReadError(`GET /api/session/${sessionID}`, response.status);
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
    throw sessionReadError(`GET /api/session/${sessionID}/inbox`, response.status);
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
    throw sessionReadError(`GET /api/session/${sessionID}/message`, response.status);
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
    "PATCH",
    `/api/session/${sessionID}/inbox/${inboxID}`,
    { delivery: "steer" },
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`PATCH /api/session/${sessionID}/inbox/${inboxID} returned ${response.status}`);
  }
}

/**
 * Interrupt a session's in-flight execution. With `resume=true` execution
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
    `/api/session/${sessionID}/interrupt?resume=true`,
    undefined,
    requestFn,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`POST /api/session/${sessionID}/interrupt returned ${response.status}`);
  }
}

export {
  buildBasicAuthHeader,
  fetchRequest,
  getSessionInbox,
  getSessionMessages,
  getSessionUpdatedAt,
  interruptSession,
  isSessionActive,
  isSessionNotFoundError,
  promoteInboxItem,
  readServiceRecordFile,
  requestServer,
  resolveServer,
  sessionReadError,
};
