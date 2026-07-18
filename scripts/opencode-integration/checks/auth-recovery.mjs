/**
 * Auth-error recovery — model swap and re-spawn — driven against a session
 * on a deliberately unauthenticated provider config.
 *
 * The stub's "stubnoauth" provider (same models, no `apiKey` configured at
 * all) is a deterministic, offline injector for `provider.auth`: verified
 * live that a turn on it fails immediately with the structured error
 * `{ type: "provider.auth", message: "Missing auth credential: apiKey" }`,
 * with no network call ever made.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, driveToolCall, prompt, switchModel, waitForAssistantFinish } from "../lib/api-client.mjs";

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  let session;
  await runCheck(results, "a turn on an unauthenticated provider surfaces a structured provider.auth error", async () => {
    session = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stubnoauth", id: "stub-model" },
    });
    await prompt(server, session.id, "hello");

    const failed = await waitForAssistantFinish(server, session.id, "error");
    assert.equal(failed.error?.type, "provider.auth");
    assert.match(failed.error?.message ?? "", /apiKey/i);
  });

  await runCheck(
    results,
    "retry 1 — a same-session model switch to the authenticated provider recovers the session non-disruptively",
    async () => {
      const status = await switchModel(server, session.id, { providerID: "stub", id: "stub-model" });
      assert.equal(status, 204);

      // Re-prompt after the switch; the session must now complete normally.
      const result = await driveToolCall(server, session.id, `return await tools.rp_status({});`);
      assert.ok(result.text, "expected the re-prompted turn to complete on the authenticated model");
    },
  );

  await runCheck(results, "retry 2 — a re-spawn on the authenticated model runs successfully", async () => {
    const orchestrator = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `return await tools.rp_spawn({name:"auth-recovery-respawn", agent:"spec-researcher", model:"stub/stub-model", directory:${JSON.stringify(projectDir)}, prompt:"say hello", run:"auth-recovery-run"});`,
    );
    assert.ok(result.text?.startsWith("ses_"), `expected a fresh session ID, got: ${result.text}`);
  });
}
