/**
 * rp_permission_reply against real pending permission requests.
 *
 * The reply body is opencode's schema, not RP's: a stubbed HTTP boundary
 * would accept whatever shape the plugin happens to send, so the only
 * assertion that means anything is a live server clearing a request the
 * check watched go pending.
 *
 * The requests are raised through opencode's own evaluation endpoint against
 * a ruleset the check installs on the session, so what goes pending is
 * decided here rather than by the sandbox's defaults. The session holding
 * them is not RP-spawned, so the plugin leaves them for the tool to
 * adjudicate.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createPermissionRequest,
  createSession,
  driveToolCall,
  getPermissionRequests,
  setSessionPermissions,
} from "../lib/api-client.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/** The action the asking session's ruleset is set to ask about. */
const PROBE_ACTION = "suite_permission_probe";

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  const adjudicator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
  const asking = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
  assert.equal(await setSessionPermissions(server, asking.id, [{ action: PROBE_ACTION, resource: "*", effect: "ask" }]), 204);

  await runCheck(results, "rp_permission_reply's 'once' clears a real pending request", async () => {
    const requestID = await raiseRequest(server, asking.id, "allow-me");

    const result = await driveToolCall(server, adjudicator.id, "rp_permission_reply", {
      session: asking.id,
      request: requestID,
      reply: "once",
    });
    assert.equal(
      result.structuredJSON?.replied,
      true,
      `expected the reply to be accepted, got: ${result.text ?? result.error?.message}`,
    );

    await assertNoLongerPending(server, asking.id, requestID);
  });

  await runCheck(results, "rp_permission_reply's 'reject' carries its corrective message", async () => {
    const requestID = await raiseRequest(server, asking.id, "refuse-me");

    const result = await driveToolCall(server, adjudicator.id, "rp_permission_reply", {
      session: asking.id,
      request: requestID,
      reply: "reject",
      message: "Read it from the worktree copy instead.",
    });
    assert.equal(
      result.structuredJSON?.replied,
      true,
      `expected the reject to be accepted, got: ${result.text ?? result.error?.message}`,
    );

    await assertNoLongerPending(server, asking.id, requestID);
  });

  await runCheck(results, "rp_permission_reply reports an already-settled request as missing", async () => {
    const requestID = await raiseRequest(server, asking.id, "settle-me");
    await driveToolCall(server, adjudicator.id, "rp_permission_reply", {
      session: asking.id,
      request: requestID,
      reply: "once",
    });

    const again = await driveToolCall(server, adjudicator.id, "rp_permission_reply", {
      session: asking.id,
      request: requestID,
      reply: "once",
    });
    assert.equal(
      again.structuredJSON?.error,
      "PermissionNotFoundError",
      `expected a replied-twice request to report as missing, got: ${again.text ?? again.error?.message}`,
    );
  });
}

/**
 * Raise one pending request on the asking session and confirm it is pending.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} resource Names the request, so a leaked one is traceable.
 * @returns {Promise<string>} The pending request's ID.
 */
async function raiseRequest(server, sessionID, resource) {
  const created = await createPermissionRequest(server, sessionID, {
    action: PROBE_ACTION,
    resources: [resource],
  });
  assert.equal(created.effect, "ask", `expected the ruleset to ask about ${PROBE_ACTION}, got: ${created.effect}`);
  const pending = await getPermissionRequests(server, sessionID);
  assert.ok(
    pending.some((entry) => entry.id === created.id),
    `expected ${created.id} to be pending before the reply, got: ${JSON.stringify(pending)}`,
  );
  return created.id;
}

/**
 * Assert a request is gone from the asking session's pending list.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} requestID
 * @returns {Promise<void>}
 */
async function assertNoLongerPending(server, sessionID, requestID) {
  const pending = await getPermissionRequests(server, sessionID);
  assert.ok(
    !pending.some((entry) => entry.id === requestID),
    `expected ${requestID} to be settled, but it is still pending: ${JSON.stringify(pending)}`,
  );
}
