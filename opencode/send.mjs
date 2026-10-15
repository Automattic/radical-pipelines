/**
 * The `rp_send` tool: directed, attributed messaging between sessions.
 */

import {
  isSessionActive,
  isSessionNotFoundError,
  requestServer,
  resolveServer,
} from "./client.mjs";
import { resolveSession } from "./ledger.mjs";
import { recordSend } from "./observations.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";

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
 *   readSession?: Function,
 *   now?: () => number,
 * }} [deps] `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client; `readSession` reaches
 *   `resolveSession`; `now` stamps the sender's `lastSend` record and
 *   defaults to `Date.now`.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSendTool(ctx, { env = process.env, readServiceRecordOverride, requestFn, readSession, now = Date.now } = {}) {
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
      const sender = (await resolveSession(toolCtx.sessionID, { readSession })).spawn;
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

export {
  buildSendTool,
  formatAttribution,
};
