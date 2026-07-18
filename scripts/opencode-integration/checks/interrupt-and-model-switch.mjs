/**
 * Interrupt and same-session model switch — the non-destructive first
 * recovery action the auth-recovery path (Flow 12) relies on, verified here
 * independent of any failure injector.
 */

import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getActiveSessionIDs,
  getSession,
  interrupt,
  prompt,
  switchModel,
  waitForIdle,
} from "../lib/api-client.mjs";
import { slowPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  await runCheck(results, "interrupt stops a session's in-flight execution", async () => {
    const session = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const slowTurn = prompt(server, session.id, slowPrompt(6_000, `interrupt-check-${Date.now()}`), { delivery: "steer" });

    // Give the turn a moment to actually start running.
    await delay(500);
    const activeBeforeInterrupt = await getActiveSessionIDs(server);
    assert.ok(activeBeforeInterrupt.has(session.id), "expected the session to be reported running before interrupt");

    const status = await interrupt(server, session.id);
    assert.equal(status, 204);

    await waitForIdle(server, session.id, { timeoutMs: 5_000 });
    const activeAfterInterrupt = await getActiveSessionIDs(server);
    assert.ok(!activeAfterInterrupt.has(session.id), "expected the session to be idle promptly after interrupt");

    // The slow turn's own promise still resolves once the stub's delayed
    // response arrives; avoid leaving it dangling past the check.
    await slowTurn.catch(() => {});
  });

  await runCheck(results, "a same-session model switch applies without disrupting the session", async () => {
    const session = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });

    const status = await switchModel(server, session.id, { providerID: "stub", id: "stub-model" });
    assert.equal(status, 204);

    const updated = await getSession(server, session.id);
    assert.deepEqual(
      { providerID: updated.model.providerID, id: updated.model.id },
      { providerID: "stub", id: "stub-model" },
    );

    // The session keeps working normally on the next turn after the switch.
    const result = await driveToolCall(server, session.id, `return await tools.rp_status({});`);
    assert.ok(result.text, "expected the session to still run turns normally after a model switch");
  });
}
