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
  getMessages,
  getSession,
  interrupt,
  pollMessages,
  pollUntil,
  prompt,
} from "../lib/api-client.mjs";
import { startServe, stopServe } from "../lib/sandbox.mjs";
import { slowPrompt, stallPrompt, tricklePrompt } from "../lib/stub-provider.mjs";

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

      try {

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

      } finally {
        await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_cancel({id: ${JSON.stringify(backoffLoopID)}});`,
        ).catch(() => {});
      }
    },
  );

  await runCheck(
    results,
    "probes that produce no assistant record at all are classified as failed on an idle target",
    async () => {
      // A missing provider admits the input and produces nothing: no
      // assistant message ever appears, so only the idle no-response rule
      // can stop the loop from re-injecting forever.
      const recordless = await createSession(server, {
        agent: "build",
        directory: ctx.projectDir,
        model: { providerID: "missing-provider", id: "missing-model" },
      });
      const recordlessMarker = "suite-health-loop-no-record-ping";
      const startResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_start({interval: 500, prompt: ${JSON.stringify(recordlessMarker)}, target_session: ${JSON.stringify(recordless.id)}});`,
      );
      const recordlessLoopID = startResult.structuredJSON.id;

      try {

        const ticks = await pollUntil(
          async () => {
            const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
            const observed = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter(
              (tick) => tick.loopID === recordlessLoopID,
            );
            return observed.some(
              (tick) => tick.outcome === "skipped" && tick.reason === "failed-probe" && tick.level >= 2,
            )
              ? observed
              : undefined;
          },
          { timeoutMs: 30_000, intervalMs: 400, label: "an escalated failed-probe tick with no assistant records" },
        );

        const injections = ticks.filter((tick) => tick.outcome === "injected").length;
        assert.ok(
          injections <= 3,
          `expected the no-response rule to rate-limit probes, got ${injections}: ${JSON.stringify(ticks)}`,
        );
        const transcript = await getMessages(server, recordless.id);
        assert.ok(
          !transcript.some((message) => message.type === "assistant"),
          "the repro requires that no assistant record was ever produced",
        );

      } finally {
        await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_cancel({id: ${JSON.stringify(recordlessLoopID)}});`,
        ).catch(() => {});
      }
    },
  );

  await runCheck(
    results,
    "slow failing probes are held while in flight and back off once classified, instead of chaining",
    async () => {
      // Each probe turn runs ~1.5s before failing (unauthenticated provider
      // honoring the slow directive), so the target is often active at tick
      // time — the shape that previously chained injections indefinitely.
      const slowFailing = await createSession(server, {
        agent: "build",
        directory: ctx.projectDir,
        model: { providerID: "stubnoauth", id: "stub-model" },
      });
      // The monitor prompt must carry the stub's slow directive, but its
      // delimiters cannot appear contiguously in this driving prompt — the
      // stub's own code-directive parser would terminate at the embedded
      // ":__END__". Assemble it inside the Code Mode snippet instead.
      const startResult = await driveToolCall(
        server,
        controller.id,
        `const p = ["__RP_SLOW__", ":1500:", "__EN" + "D__", " // suite-health-loop-slow-fail-ping"].join(""); return await tools.rp_loop_start({interval: 600, prompt: p, target_session: ${JSON.stringify(slowFailing.id)}});`,
      );
      const slowLoopID = startResult.structuredJSON.id;

      try {

        const ticks = await pollUntil(
          async () => {
            const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
            const observed = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter(
              (tick) => tick.loopID === slowLoopID,
            );
            return observed.some(
              (tick) => tick.outcome === "skipped" && tick.reason === "failed-probe" && tick.level >= 2,
            )
              ? observed
              : undefined;
          },
          { timeoutMs: 40_000, intervalMs: 400, label: "an escalated failed-probe tick under slow failures" },
        );

        const injections = ticks.filter((tick) => tick.outcome === "injected" || tick.outcome === "promoted").length;
        assert.ok(
          injections <= 3,
          `expected slow failures to back off, not chain (max 3 injections before level 2), got ${injections}: ${JSON.stringify(ticks)}`,
        );

      } finally {
        await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_cancel({id: ${JSON.stringify(slowLoopID)}});`,
        ).catch(() => {});
      }
    },
  );

  await runCheck(
    results,
    "a parked queue copy of the monitor prompt is promoted to steer in place, not duplicated",
    async () => {
      const promoTarget = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
      const promoMarker = "suite-health-loop-promotion-ping";

      // Occupy the target, then park a queue copy of the exact monitor
      // prompt behind the running turn.
      await prompt(server, promoTarget.id, slowPrompt(8_000, `promo-busy-${Date.now()}`), { delivery: "steer" });
      await pollUntil(
        async () => ((await getActiveSessionIDs(server)).has(promoTarget.id) ? true : undefined),
        { timeoutMs: 5_000, label: "the promotion target to become active" },
      );
      await prompt(server, promoTarget.id, promoMarker, { delivery: "queue" });
      const parked = (await getInbox(server, promoTarget.id)).find((item) => item.payload?.text === promoMarker);
      assert.ok(parked, "expected the queue copy to park in the inbox behind the running turn");
      assert.equal(parked.delivery, "queue");

      const startResult = await driveToolCall(
        server,
        controller.id,
        `return await tools.rp_loop_start({interval: 800, prompt: ${JSON.stringify(promoMarker)}, target_session: ${JSON.stringify(promoTarget.id)}});`,
      );
      const promoLoopID = startResult.structuredJSON.id;

      try {

        const promotedTick = await pollUntil(
          async () => {
            const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
            return (statusResult.structuredJSON?.recentLoopTicks ?? []).find(
              (tick) => tick.loopID === promoLoopID && tick.outcome === "promoted",
            );
          },
          { timeoutMs: 15_000, intervalMs: 400, label: "a queue-to-steer promotion tick" },
        );
        assert.equal(promotedTick.reason, "stale-running");

        // Same item, new delivery: the parked copy was converted, not
        // replaced or duplicated.
        const promoted = (await getInbox(server, promoTarget.id)).filter(
          (item) => item.payload?.text === promoMarker,
        );
        assert.equal(promoted.length, 1, `expected exactly one pending copy, got: ${JSON.stringify(promoted)}`);
        assert.equal(promoted[0].id, parked.id, "the promoted item must keep the parked item's inbox ID");
        assert.equal(promoted[0].delivery, "steer");

        const cancelResult = await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_cancel({id: ${JSON.stringify(promoLoopID)}});`,
        );
        assert.deepEqual(cancelResult.structuredJSON, { cancelled: true });

        // The promoted copy delivers exactly once.
        await pollMessages(
          server,
          promoTarget.id,
          (messages) => messages.find((message) => message.type === "user" && message.text === promoMarker),
          { timeoutMs: 15_000, label: "the promoted steer to deliver" },
        );
        await delay(1_000);
        const deliveries = (await getMessages(server, promoTarget.id)).filter(
          (message) => message.type === "user" && message.text === promoMarker,
        );
        assert.equal(deliveries.length, 1, `expected a single delivery, got ${deliveries.length}`);
      } finally {
        await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_cancel({id: ${JSON.stringify(promoLoopID)}});`,
        ).catch(() => {});
      }
    },
  );

  await runCheck(
    results,
    "a target hung on a dead provider stream is interrupted, and the monitor prompt then reaches it",
    async () => {
      const hung = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
      const deadMarker = "suite-health-loop-dead-stream-ping";
      let stallTurn;
      let deadLoopID;

      try {
        // The stub flushes headers, waits a provider-sized time-to-first-
        // token gap, emits a tool_call header whose arguments never arrive,
        // then goes silent: the session hangs with a tool part stuck in
        // `streaming` state — the live incident's signature, with the
        // adversarial header/row gap included.
        stallTurn = prompt(server, hung.id, stallPrompt(60_000, `stall-${Date.now()}`, 2_500), {
          delivery: "steer",
        }).catch(() => {});
        await pollUntil(
          async () => ((await getActiveSessionIDs(server)).has(hung.id) ? true : undefined),
          { timeoutMs: 5_000, label: "the stalled target to become active" },
        );

        // Park a queue copy of the monitor prompt behind the hung turn: the
        // interrupt must not strand it (`continue=true` leaves queued
        // prompts parked), so the confirming tick promotes it to steer
        // first.
        await prompt(server, hung.id, deadMarker, { delivery: "queue" });
        const parkedCopy = (await getInbox(server, hung.id)).find((item) => item.payload?.text === deadMarker);
        assert.ok(parkedCopy, "expected the queue copy to park behind the hung turn");

        const startResult = await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_start({interval: 800, prompt: ${JSON.stringify(deadMarker)}, target_session: ${JSON.stringify(hung.id)}});`,
        );
        deadLoopID = startResult.structuredJSON.id;

        let observedTicks = [];
        const interruptedTick = await pollUntil(
          async () => {
            const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
            observedTicks = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter(
              (tick) => tick.loopID === deadLoopID,
            );
            return observedTicks.find((tick) => tick.outcome === "interrupted" && tick.reason === "dead-stream");
          },
          { timeoutMs: 30_000, intervalMs: 400, label: "a dead-stream interrupted tick" },
        ).catch((error) => {
          error.message += `; observed ticks: ${JSON.stringify(observedTicks)}`;
          throw error;
        });
        assert.equal(interruptedTick.reason, "dead-stream");

        // The interrupt contract: suspicion first, then at least the full
        // confirmation window (4 s in this sandbox) of observed silence.
        const suspectedTicks = observedTicks.filter((tick) => tick.reason === "dead-stream-suspected");
        assert.ok(suspectedTicks.length > 0, "the interrupt must be preceded by an explicit suspicion");
        assert.ok(
          interruptedTick.silenceMs >= 4_000,
          `expected the full 4s confirmation window of observed silence, got ${interruptedTick.silenceMs}ms`,
        );

        // The parked copy — promoted just before the interrupt — must be the
        // delivery that reaches the freed session: same admitted ID, so the
        // interrupt stranded nothing.
        await pollMessages(
          server,
          hung.id,
          (messages) => messages.find((message) => message.type === "user" && message.id === parkedCopy.id),
          { timeoutMs: 15_000, label: "the parked monitor copy to reach the freed session" },
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
      } finally {
        if (deadLoopID) {
          await driveToolCall(
            server,
            controller.id,
            `return await tools.rp_loop_cancel({id: ${JSON.stringify(deadLoopID)}});`,
          ).catch(() => {});
        }
        // A failed assertion must not leave the stalled execution running.
        await interrupt(server, hung.id).catch(() => {});
        if (stallTurn) {
          await stallTurn;
        }
      }
    },
  );

  await runCheck(
    results,
    "a healthy slow argument stream is suspected but never interrupted",
    async () => {
      // Argument chunks trickle in every 250 ms for ~9 s while the
      // projected transcript stays frozen — the exact shape of a dead
      // stream, except alive — deliberately *outliving* suspicion plus the
      // 4 s sandbox confirmation window: only the raw-liveness veto (teed
      // provider chunks) can protect it past the boundary.
      const trickling = await createSession(server, { agent: "build", directory: ctx.projectDir, model: STUB_MODEL });
      const trickleMarker = "suite-health-loop-trickle-ping";
      let trickleTurn;
      let trickleLoopID;

      try {
        trickleTurn = prompt(server, trickling.id, tricklePrompt(250, 36, `trickle-${Date.now()}`), {
          delivery: "steer",
        }).catch(() => {});
        await pollUntil(
          async () => ((await getActiveSessionIDs(server)).has(trickling.id) ? true : undefined),
          { timeoutMs: 5_000, label: "the trickling target to become active" },
        );

        const startResult = await driveToolCall(
          server,
          controller.id,
          `return await tools.rp_loop_start({interval: 600, prompt: ${JSON.stringify(trickleMarker)}, target_session: ${JSON.stringify(trickling.id)}});`,
        );
        trickleLoopID = startResult.structuredJSON.id;

        // The suspicion must actually engage (the stream looks dead to the
        // projection) or this check proves nothing.
        await pollUntil(
          async () => {
            const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
            return (statusResult.structuredJSON?.recentLoopTicks ?? []).find(
              (tick) => tick.loopID === trickleLoopID && tick.reason === "dead-stream-suspected",
            );
          },
          { timeoutMs: 15_000, intervalMs: 300, label: "the healthy trickle to be suspected" },
        );

        // The stream completes on its own; the freed session returns to idle
        // with a successfully finished turn — never an aborted one.
        await pollUntil(
          async () => (!(await getActiveSessionIDs(server)).has(trickling.id) ? true : undefined),
          { timeoutMs: 25_000, label: "the trickling turn to complete naturally" },
        );
        const finished = await pollMessages(
          server,
          trickling.id,
          (messages) =>
            messages.find((message) => message.type === "assistant" && message.finish && message.finish !== "error"),
          { timeoutMs: 10_000, label: "the trickling turn's successful finish" },
        );
        assert.ok(finished.finish, "the trickled tool call must complete as a normal turn");

        const statusResult = await driveToolCall(server, controller.id, `return await tools.rp_status({});`);
        const ticks = (statusResult.structuredJSON?.recentLoopTicks ?? []).filter(
          (tick) => tick.loopID === trickleLoopID,
        );
        assert.ok(
          !ticks.some((tick) => tick.outcome === "interrupted"),
          `a healthy stream must never be interrupted, got: ${JSON.stringify(ticks)}`,
        );
        // The boundary must actually be crossed: the suspicion span has to
        // exceed the 4 s confirmation window for this check to prove the
        // veto, not merely outrun the clock.
        const suspectedAts = ticks
          .filter((tick) => tick.reason === "dead-stream-suspected")
          .map((tick) => tick.at);
        assert.ok(
          Math.max(...suspectedAts) - Math.min(...suspectedAts) >= 4_000,
          `expected the suspicion to span the confirmation window, got: ${JSON.stringify(ticks)}`,
        );

      } finally {
        if (trickleLoopID) {
          await driveToolCall(
            server,
            controller.id,
            `return await tools.rp_loop_cancel({id: ${JSON.stringify(trickleLoopID)}});`,
          ).catch(() => {});
        }
        // Idle interruption is a no-op; a failed assertion must not leave
        // the trickling execution running.
        await interrupt(server, trickling.id).catch(() => {});
        if (trickleTurn) {
          await trickleTurn;
        }
      }
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
