/**
 * Permission mediation: redirecting a spawned agent's external reads into its
 * worktree, forwarding every other ask to its spawner, and the
 * `rp_permission_reply` tool.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

import { requestServer, resolveServer } from "./client.mjs";
import { recordDiagnostic, recordError } from "./diagnostics.mjs";
import { resolveSession } from "./ledger.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";

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
 *   The reply, carrying the skill's term for it; the route's body names it
 *   `decision`. `message` on a reject reaches the asking agent as corrective
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
    message === undefined ? { decision: reply } : { decision: reply, message },
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
 *   readSession: Function,
 * }} deps `ctx` supplies `ctx.session.prompt` for the forward; `env`,
 *   `readServiceRecord` and `requestFn` resolve the server for the reject
 *   reply; `exists` reaches `redirectTargets`; `readSession` reaches
 *   `resolveSession`.
 * @returns {Promise<void>}
 */
async function onPermissionAsked(event, { ctx, env, readServiceRecord, requestFn, exists, readSession }) {
  const request = parsePermissionAsked(event);
  if (!request) {
    return;
  }
  const entry = (await resolveSession(request.sessionID, { readSession })).spawn;
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
        recordDiagnostic({
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

  recordDiagnostic({
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

export {
  buildPermissionReplyTool,
  formatPermissionForward,
  formatRedirectMessage,
  onPermissionAsked,
  parsePermissionAsked,
  redirectTargets,
  replyToPermission,
};
