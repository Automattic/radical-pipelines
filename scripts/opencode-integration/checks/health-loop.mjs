/**
 * Health-loop start/list, recent-busy skip, stale-running steer, observable
 * outcomes, cancellation, and restart survival, driven against the sandbox's
 * running `serve` process through the real `rp_loop_*` and `rp_status` tools.
 */

import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getActiveSessionIDs,
  getInbox,
  getSession,
  pollMessages,
  pollUntil,
  prompt,
} from "../lib/api-client.mjs";
import { startServe, stopServe } from "../lib/sandbox.mjs";
import { slowPrompt, stallPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

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
  const controller = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
  const marker = "suite-health-loop-ping";
  let loopID;

  await runCheck(results, "rp_loop_start records a loop targeting the requested session", async () => {
    const result = await driveToolCall(
      server,
      controller.id,
      `return await tools.rp_loop_start({interval: 1000, prompt: ${JSON.stringify(marker)}, target_session: ${JSON.stringify(target.id)}});`,
    );
    assert.ok(result.structuredJSON?.id, `expected rp_loop_start to return { id }, got: ${result.text}`);
    loopID = result.structuredJSON.id;

    const listResult = await driveToolCall(server, controller.id, `return await tools.rp_loop_list({});`);
    const entries = JSON.parse(listResult.text);
    const entry = entries.find((e) => e.id === loopID);
    assert.ok(entry, `expected rp_loop_list to include ${loopID}`);
    assert.equal(entry.targetSession, target.id);
    assert.equal(entry.prompt, marker);
  });

  await runCheck(results, "a recent busy target is skipped, then receives a steer tick after two unchanged intervals", async () => {
    await prompt(server, target.id, slowPrompt(6_000, `busy-check-${Date.now()}`), { delivery: "steer" });
    await pollUntil(
      async () => (await getActiveSessionIDs(server)).has(target.id) || undefined,
      { timeoutMs: 4_000, label: "the health-loop target to become active" },
    );

    const baselineIDs = new Set(
      (await getInbox(server, target.id))
        .filter((item) => item.payload?.text === marker)
        .map((item) => item.id),
    );
    const session = await getSession(server, target.id);
    await delay(Math.max(0, session.time.updated + 1_200 - Date.now()));
    const recent = (await getInbox(server, target.id)).filter((item) => item.payload?.text === marker);
    assert.ok(
      recent.every((item) => baselineIDs.has(item.id)),
      `expected no injection before the two-interval stale threshold, got: ${JSON.stringify(recent)}`,
    );

    const staleTick = await pollUntil(
      async () => {
        const inbox = await getInbox(server, target.id);
        return inbox.find(
          (item) => item.payload?.text === marker && item.delivery === "steer" && !baselineIDs.has(item.id),
        );
      },
      { timeoutMs: 4_000, intervalMs: 100, label: "a stale-running health tick to enter the steer inbox" },
    );
    assert.equal(staleTick.delivery, "steer");
    assert.ok(
      (await getActiveSessionIDs(server)).has(target.id),
      "expected the stale override to fire while the slow target was still active",
    );

    // Coalescing: further ticks over the still-running window must not add
    // a second steer copy of the pending prompt.
    await delay(1_500);
    const steersAfter = (await getInbox(server, target.id)).filter(
      (item) => item.payload?.text === marker && item.delivery === "steer" && !baselineIDs.has(item.id),
    );
    assert.equal(
      steersAfter.length,
      1,
      `expected the pending steer to be coalesced, not duplicated, got: ${JSON.stringify(steersAfter)}`,
    );
  });

  await runCheck(results, "rp_loop_cancel stops further ticks, while rp_status retains their outcomes", async () => {
    const cancelResult = await driveToolCall(server, controller.id, `return await tools.rp_loop_cancel({id: ${JSON.stringify(loopID)}});`);
    assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });

    const listResult = await driveToolCall(server, controller.id, `return await tools.rp_loop_list({});`);
    const entries = JSON.parse(listResult.text);
    assert.ok(!entries.some((e) => e.id === loopID), "expected the cancelled loop to be gone from rp_loop_list");

    const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
    const ticks = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter((tick) => tick.loopID === loopID);
    assert.ok(
      ticks.some((tick) => tick.outcome === "busy" && typeof tick.lastActivity === "number"),
      `expected an observable busy outcome with last activity, got: ${JSON.stringify(ticks)}`,
    );
    assert.ok(
      ticks.some((tick) => tick.outcome === "injected" && tick.reason === "stale-running"),
      `expected an observable stale-running injection, got: ${JSON.stringify(ticks)}`,
    );

    await delay(2_200);
    const statusAfter = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
    const ticksAfter = (statusAfter.structuredJSON?.recentLoopTicks ?? []).filter(
      (tick) => tick.loopID === loopID,
    );
    assert.equal(ticksAfter.length, ticks.length, "expected no further tick outcomes after cancel");
  });

  await runCheck(
    results,
    "probes that only produce failing turns engage an escalating backoff instead of a flood",
    async () => {
      // Every turn on the deliberately unauthenticated provider fails, so
      // each injected monitor prompt is a failed probe.
      const failing = await createSession(server, {
        agent: "build",
        directory: ctx.projectDir,
        model: { providerID: "stubnoauth", id: "stub-model" },
      });
      const backoffMarker = "suite-health-loop-backoff-ping";
      const startResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_start({interval: 700, prompt: ${JSON.stringify(backoffMarker)}, target_session: ${JSON.stringify(failing.id)}});`,
      );
      const backoffLoopID = startResult.structuredJSON.id;

      // A failed-probe tick at level >= 2 proves the full escalation cycle:
      // inject -> fail -> classify -> skip -> re-inject -> fail -> escalate.
      const ticks = await pollUntil(
        async () => {
          const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
          const observed = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter(
            (tick) => tick.loopID === backoffLoopID,
          );
          return observed.some(
            (tick) => tick.outcome === "skipped" && tick.reason === "failed-probe" && tick.level >= 2,
          )
            ? observed
            : undefined;
        },
        { timeoutMs: 30_000, intervalMs: 400, label: "an escalated (level >= 2) failed-probe tick" },
      );

      assert.ok(
        ticks.some((tick) => tick.outcome === "injected" && tick.reason === "idle"),
        `expected at least one probe injection, got: ${JSON.stringify(ticks)}`,
      );
      assert.ok(
        ticks.some((tick) => tick.outcome === "skipped" && tick.reason === "backoff"),
        `expected backoff skips between probes, got: ${JSON.stringify(ticks)}`,
      );
      const injections = ticks.filter((tick) => tick.outcome === "injected").length;
      assert.ok(
        injections <= 3,
        `expected the backoff to rate-limit probes (max 3 injections before level 2), got ${injections}: ${JSON.stringify(ticks)}`,
      );

      const cancelResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_cancel({id: ${JSON.stringify(backoffLoopID)}});`,
      );
      assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });
    },
  );

  await runCheck(
    results,
    "a target hung on a dead provider stream is interrupted, and the pending steer then delivers",
    async () => {
      const hung = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
      // The stub emits a tool_call header whose arguments never arrive,
      // then goes silent: the session hangs with a tool part stuck in
      // `streaming` state, exactly the live incident's signature.
      const stallTurn = prompt(server, hung.id, stallPrompt(60_000, `stall-${Date.now()}`), {
        delivery: "steer",
      }).catch(() => {});
      await pollUntil(
        async () => ((await getActiveSessionIDs(server)).has(hung.id) ? true : undefined),
        { timeoutMs: 5_000, label: "the stalled target to become active" },
      );

      const deadMarker = "suite-health-loop-dead-stream-ping";
      const startResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_start({interval: 800, prompt: ${JSON.stringify(deadMarker)}, target_session: ${JSON.stringify(hung.id)}});`,
      );
      const deadLoopID = startResult.structuredJSON.id;

      const interruptedTick = await pollUntil(
        async () => {
          const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
          return (statusResult.structuredJSON?.recentLoopTicks ?? []).find(
            (tick) => tick.loopID === deadLoopID && tick.outcome === "interrupted" && tick.reason === "dead-stream",
          );
        },
        { timeoutMs: 30_000, intervalMs: 400, label: "a dead-stream interrupted tick" },
      );
      assert.equal(interruptedTick.reason, "dead-stream");

      // `continue=true` resumes execution with the pending steer: the
      // monitor prompt must actually run, and the freed session must return
      // to idle.
      await pollMessages(
        server,
        hung.id,
        (messages) => messages.find((message) => message.type === "user" && message.text === deadMarker),
        { timeoutMs: 15_000, label: "the pending steer to deliver after the interrupt" },
      );
      await pollUntil(
        async () => (!(await getActiveSessionIDs(server)).has(hung.id) ? true : undefined),
        { timeoutMs: 15_000, label: "the freed target to return to idle" },
      );

      const cancelResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_cancel({id: ${JSON.stringify(deadLoopID)}});`,
      );
      assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });
      await stallTurn;
    },
  );

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
