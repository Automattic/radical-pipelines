/**
 * Health-loop start/list/idle-only-firing/cancel mechanics, and a leftover
 * loop surviving a `serve` restart and remaining cancellable from a fresh
 * session, driven against the sandbox's running `serve` process via the
 * plugin's real `rp_loop_start`/`rp_loop_list`/`rp_loop_cancel` tools.
 */

import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, driveToolCall, getMessages, prompt } from "../lib/api-client.mjs";
import { startServe, stopServe } from "../lib/sandbox.mjs";
import { slowPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * Count how many "queued ping" injections a session has received.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} marker
 * @returns {Promise<number>}
 */
async function countInjections(server, sessionID, marker) {
  const messages = await getMessages(server, sessionID);
  return messages.filter((m) => m.type === "user" && m.text === marker).length;
}

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, env: object, binDir: string, opencodeBin: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { results } = ctx;
  let server = ctx.server;

  const target = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
  const marker = "suite-health-loop-ping";
  let loopID;

  await runCheck(results, "rp_loop_start records a loop targeting the calling session by default", async () => {
    const result = await driveToolCall(
      server,
      target.id,
      `return await tools.rp_loop_start({interval: 400, prompt: ${JSON.stringify(marker)}});`,
    );
    assert.ok(result.structuredJSON?.id, `expected rp_loop_start to return { id }, got: ${result.text}`);
    loopID = result.structuredJSON.id;

    const listResult = await driveToolCall(server, target.id, `return await tools.rp_loop_list({});`);
    const entries = JSON.parse(listResult.text);
    const entry = entries.find((e) => e.id === loopID);
    assert.ok(entry, `expected rp_loop_list to include ${loopID}`);
    assert.equal(entry.targetSession, target.id);
    assert.equal(entry.prompt, marker);
  });

  await runCheck(results, "a busy target's tick is skipped; the same target's tick injects the prompt once idle", async () => {
    // A slow-replying turn keeps the target genuinely "running" for a known
    // window spanning several 400ms tick intervals — none of them may
    // inject while it's busy.
    const busyBefore = await countInjections(server, target.id, marker);
    const slowTurn = prompt(server, target.id, slowPrompt(2_000, `busy-check-${Date.now()}`), { delivery: "steer" });
    await delay(1_600); // ticks land at ~400/800/1200/1600ms, all inside the 2s busy window
    const busyAfter = await countInjections(server, target.id, marker);
    assert.equal(busyAfter, busyBefore, "expected zero injections while the target was busy");
    await slowTurn;

    // Now idle between calls: at least one tick must inject the prompt.
    await delay(1_200);
    const idleAfter = await countInjections(server, target.id, marker);
    assert.ok(idleAfter > busyAfter, `expected at least one idle-tick injection; busy=${busyAfter} idle=${idleAfter}`);
  });

  await runCheck(results, "rp_loop_cancel stops further ticks and removes the registry entry", async () => {
    const cancelResult = await driveToolCall(server, target.id, `return await tools.rp_loop_cancel({id: ${JSON.stringify(loopID)}});`);
    assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });

    const listResult = await driveToolCall(server, target.id, `return await tools.rp_loop_list({});`);
    const entries = JSON.parse(listResult.text);
    assert.ok(!entries.some((e) => e.id === loopID), "expected the cancelled loop to be gone from rp_loop_list");

    const before = await countInjections(server, target.id, marker);
    await delay(1_200);
    const after = await countInjections(server, target.id, marker);
    assert.equal(after, before, "expected no further ticks after cancel");
  });

  await runCheck(
    results,
    "a leftover loop survives a `serve` restart and is listable and cancellable from a fresh session",
    async () => {
      const survivor = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
      const survivorMarker = "suite-health-loop-survivor-ping";
      const startResult = await driveToolCall(
        server,
        survivor.id,
        `return await tools.rp_loop_start({interval: 100000, prompt: ${JSON.stringify(survivorMarker)}});`,
      );
      const survivorLoopID = startResult.structuredJSON.id;

      // Restart `serve`: same XDG dirs (same on-disk registry + session DB),
      // fresh process — simulating a daemon restart between runs.
      stopServe(ctx.serveChild);
      await delay(1_000);
      const { child, baseURL, password } = await startServe({
        projectDir: ctx.projectDir,
        env: ctx.env,
        binDir: ctx.binDir,
        opencodeBin: ctx.opencodeBin,
      });
      ctx.serveChild = child;
      server = { baseURL, password };
      ctx.server = server;

      // The first project-scoped touch after restart re-arms every
      // registered loop (setup()'s registry-driven re-arm).
      const freshSession = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });

      const listResult = await driveToolCall(server, freshSession.id, `return await tools.rp_loop_list({});`);
      const entries = JSON.parse(listResult.text);
      assert.ok(
        entries.some((e) => e.id === survivorLoopID),
        `expected the leftover loop ${survivorLoopID} to survive the restart`,
      );

      const cancelResult = await driveToolCall(
        server,
        freshSession.id,
        `return await tools.rp_loop_cancel({id: ${JSON.stringify(survivorLoopID)}});`,
      );
      assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });

      const listAfterCancel = await driveToolCall(server, freshSession.id, `return await tools.rp_loop_list({});`);
      const entriesAfterCancel = JSON.parse(listAfterCancel.text);
      assert.ok(!entriesAfterCancel.some((e) => e.id === survivorLoopID), "expected the leftover loop to be gone after cancel");
    },
  );
}
