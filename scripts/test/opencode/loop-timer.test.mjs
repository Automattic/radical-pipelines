import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { afterEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import {
  armLoopTimer,
  disarmLoopTimer,
  recordSessionParent,
  resolveLoopRegistryPath,
  setup,
} from "../../../opencode/plugin.mjs";

import {
  clearAllLoopTimers,
  createFakeCtx,
  freshDir,
  isolatedDeps,
} from "./fixture.mjs";

// The owner's session: opencode announces every session it creates, so
// registering ses_owner as a root session is what the running daemon does
// before any tool call reaches the access boundary.
for (const id of ["ses_owner", "ses_caller"]) {
  recordSessionParent({ type: "session.created", data: { sessionID: id } });
}

/** Well-known globalThis symbols the module keys its singletons under. */
const LOOP_TIMERS_KEY = Symbol.for("radical-pipelines.opencode.loopTimers");
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");
const LOOP_TICK_LOG_KEY = Symbol.for("radical-pipelines.opencode.loopTickLog");

describe("armLoopTimer / disarmLoopTimer", () => {
  afterEach(clearAllLoopTimers);

  test("arms a recurring timer invoking tick repeatedly until disarmed", async () => {
    let calls = 0;
    const entry = { id: "loop_timer_test_1", interval: 15 };

    await armLoopTimer(entry, () => {
      calls++;
    });

    // Wait for ticks rather than a fixed duration: a loaded runner can
    // starve the interval long enough that a fixed wait sees a single tick.
    const deadline = Date.now() + 2000;
    while (calls < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);
    const callsAtDisarm = calls;

    assert.ok(callsAtDisarm >= 2, `expected multiple ticks before disarm, got ${callsAtDisarm}`);

    await delay(70);
    assert.equal(calls, callsAtDisarm, "no further ticks after disarm");
  });

  test("passes one mutable runtime object to every tick of an armed loop", async () => {
    const runtimes = [];
    const entry = { id: "loop_timer_test_runtime", interval: 10 };

    await armLoopTimer(entry, (tickEntry, isCancelled, runtime) => {
      runtime.count = (runtime.count ?? 0) + 1;
      runtimes.push(runtime);
    });

    const deadline = Date.now() + 2_000;
    while (runtimes.length < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(runtimes.length >= 2, `expected multiple ticks, got ${runtimes.length}`);
    assert.equal(runtimes[0], runtimes[1], "each tick must receive the same runtime object");
    assert.equal(runtimes[0].count, runtimes.length, "tick-to-tick mutations must persist");
  });

  test("serializes slow ticks instead of overlapping them", async () => {
    let calls = 0;
    let running = 0;
    let maxRunning = 0;
    const entry = { id: "loop_timer_test_serial", interval: 5 };

    await armLoopTimer(entry, async () => {
      calls++;
      running++;
      maxRunning = Math.max(maxRunning, running);
      await delay(30);
      running--;
    });

    const deadline = Date.now() + 2_000;
    while (calls < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(calls >= 2, `expected multiple ticks, got ${calls}`);
    assert.equal(maxRunning, 1);
  });

  test("disarm waits for an in-flight tick and exposes cancellation to it", async () => {
    let started;
    let release;
    let effect = false;
    const startedPromise = new Promise((resolve) => {
      started = resolve;
    });
    const releasePromise = new Promise((resolve) => {
      release = resolve;
    });
    const entry = { id: "loop_timer_test_cancel", interval: 5 };

    await armLoopTimer(entry, async (_entry, isCancelled) => {
      started();
      await releasePromise;
      if (!isCancelled()) effect = true;
    });
    await startedPromise;

    let firstStopped = false;
    let secondStopped = false;
    const firstStopping = disarmLoopTimer(entry.id).then(() => {
      firstStopped = true;
    });
    const secondStopping = disarmLoopTimer(entry.id).then(() => {
      secondStopped = true;
    });
    await delay(10);
    assert.equal(firstStopped, false, "disarm must wait for the in-flight tick");
    assert.equal(secondStopped, false, "concurrent disarm must wait for the same tick");
    release();
    await Promise.all([firstStopping, secondStopping]);

    assert.equal(effect, false);
  });

  test("replacing a loop ID waits for its prior tick before arming the replacement", async () => {
    let active = 0;
    let maxActive = 0;
    let replacementCalls = 0;
    let firstStarted;
    let releaseFirst;
    const firstStartedPromise = new Promise((resolve) => {
      firstStarted = resolve;
    });
    const releaseFirstPromise = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const entry = { id: "loop_timer_test_replace", interval: 5 };

    await armLoopTimer(entry, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      firstStarted();
      await releaseFirstPromise;
      active--;
    });
    await firstStartedPromise;

    const replacementArmed = armLoopTimer(entry, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      replacementCalls++;
      active--;
    });
    await delay(15);
    assert.equal(replacementCalls, 0, "replacement must wait for the prior tick");
    releaseFirst();
    await replacementArmed;

    const deadline = Date.now() + 2_000;
    while (replacementCalls === 0 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(replacementCalls > 0, "expected the replacement loop to tick");
    assert.equal(maxActive, 1);
  });

  test("abandons a tick still pending after the deadline, records it, marks it cancelled, and keeps ticking", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    globalThis[ERROR_LOG_KEY] = [];
    const entry = { id: "loop_timer_test_deadline", interval: 5, targetSession: "ses_target" };
    const cancellationChecks = [];
    let calls = 0;
    let releaseFirst;
    const firstRelease = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    await armLoopTimer(
      entry,
      async (_entry, isCancelled) => {
        calls++;
        if (calls === 1) {
          await firstRelease;
          cancellationChecks.push(isCancelled());
        }
      },
      30,
    );

    const deadline = Date.now() + 2_000;
    while (calls < 2 && Date.now() < deadline) {
      await delay(10);
    }
    assert.ok(calls >= 2, "the loop must re-arm after abandoning the hung tick");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) => tick.loopID === entry.id && tick.targetSession === "ses_target" && tick.outcome === "timeout",
      ),
      `expected a timeout tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (error) => error.type === "loop.tick.timeout" && error.loopID === entry.id && error.timeoutMs === 30,
      ),
      `expected a loop.tick.timeout error, got: ${JSON.stringify(globalThis[ERROR_LOG_KEY])}`,
    );

    releaseFirst();
    await delay(10);
    assert.deepEqual(cancellationChecks, [true], "the abandoned tick must see itself cancelled");

    await disarmLoopTimer(entry.id);
  });

  test("disarm resolves after the deadline even when the in-flight tick never settles", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    globalThis[ERROR_LOG_KEY] = [];
    const entry = { id: "loop_timer_test_hung", interval: 5 };
    let started;
    const startedPromise = new Promise((resolve) => {
      started = resolve;
    });

    await armLoopTimer(
      entry,
      () => {
        started();
        return new Promise(() => {});
      },
      40,
    );
    await startedPromise;

    const disarmStartedAt = Date.now();
    await disarmLoopTimer(entry.id);
    assert.ok(Date.now() - disarmStartedAt < 1_000, "disarm must be bounded by the tick deadline");
    assert.equal(globalThis[LOOP_TIMERS_KEY].has(entry.id), false);
  });
});

describe("rp_loop_start / rp_loop_list / rp_loop_cancel (wired through setup)", () => {
  afterEach(clearAllLoopTimers);

  test("records a registry entry defaulting target_session to the caller; a busy target skips the tick and an idle target injects the prompt once; rp_loop_cancel stops further ticks and removes the entry", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });

    let active = true;
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: active ? { ses_caller: { type: "running" } } : {} } };
      }
      if (url.pathname === "/api/session/ses_caller") {
        return { status: 200, body: { data: { time: { updated: Date.now() } } } };
      }
      if (url.pathname === "/api/session/ses_caller/inbox") {
        return { status: 200, body: { data: [] } };
      }
      if (url.pathname === "/api/session/ses_caller/message") {
        return { status: 200, body: { data: [] } };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };

    const promptCalls = [];
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return originalPrompt(args);
    };

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn,
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 25, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    assert.ok(loopID);

    const entries = (await tools.get("rp_loop_list").execute({}, {})).output;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, loopID);
    assert.equal(entries[0].targetSession, "ses_caller");
    assert.equal(entries[0].prompt, "check status");

    await delay(60);
    assert.equal(promptCalls.length, 0, "a busy target must not receive an injected prompt");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) => tick.loopID === loopID && tick.outcome === "busy" && typeof tick.lastActivity === "number",
      ),
      `expected an observable busy tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );
    globalThis[LOOP_TICK_LOG_KEY].push({ loopID: "loop_other", targetSession: "ses_other", at: 1, outcome: "busy" });
    const listed = (await tools.get("rp_loop_list").execute({}, {})).output;
    assert.ok(listed[0].recentTicks.length >= 1, "a listed loop carries its own recent ticks");
    assert.ok(listed[0].recentTicks.every((tick) => tick.loopID === loopID), "and none of another loop's");

    active = false;
    await delay(60);
    assert.ok(promptCalls.length >= 1, "an idle target must receive the injected prompt");
    assert.equal(promptCalls[0].sessionID, "ses_caller");
    assert.equal(promptCalls[0].text, "check status");
    assert.equal(promptCalls[0].delivery, "queue");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) => tick.loopID === loopID && tick.outcome === "injected" && tick.reason === "idle",
      ),
      `expected an observable injected tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );

    await tools.get("rp_loop_cancel").execute({ id: loopID }, {});
    assert.deepEqual((await tools.get("rp_loop_list").execute({}, {})).output, []);

    const countAfterCancel = promptCalls.length;
    const ticksAfterCancel = globalThis[LOOP_TICK_LOG_KEY].filter((tick) => tick.loopID === loopID).length;
    await delay(60);
    assert.equal(promptCalls.length, countAfterCancel, "a cancelled loop must not tick again");
    assert.equal(
      globalThis[LOOP_TICK_LOG_KEY].filter((tick) => tick.loopID === loopID).length,
      ticksAfterCancel,
      "nor record a tick",
    );
  });

  test("records a failed outcome when server resolution throws before the tick starts", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    globalThis[ERROR_LOG_KEY] = [];
    const dataHome = freshDir();
    const { ctx, tools } = createFakeCtx();

    setup(
      ctx,
      isolatedDeps({
        env: { XDG_DATA_HOME: dataHome },
        readServiceRecord: () => {
          throw new Error("server resolution failed");
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 15, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    const deadline = Date.now() + 2_000;
    while (globalThis[LOOP_TICK_LOG_KEY].length === 0 && Date.now() < deadline) {
      await delay(10);
    }

    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) =>
          tick.loopID === loopID &&
          tick.outcome === "failed" &&
          tick.error === "Error: server resolution failed",
      ),
      `expected an observable failed tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) => entry.type === "loop.tick.failed" && entry.loopID === loopID,
      ),
      `expected the failure in recentErrors, got: ${JSON.stringify(globalThis[ERROR_LOG_KEY])}`,
    );

    await tools.get("rp_loop_cancel").execute({ id: loopID }, {});
  });

  test("returns while a tick is still in flight; the abandoned tick sees the cancellation and injects nothing", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return { id: "msg_probe" };
    };
    let readStarted;
    let releaseRead;
    const readStartedPromise = new Promise((resolve) => {
      readStarted = resolve;
    });
    const readResponse = new Promise((resolve) => {
      releaseRead = resolve;
    });

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn: async (url) => {
          if (url.pathname === "/api/session/active") {
            readStarted();
            return readResponse;
          }
          return { status: 200, body: { data: [] } };
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 5, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    await readStartedPromise;

    const result = await tools.get("rp_loop_cancel").execute({ id: loopID }, {});
    assert.deepEqual(result.output, { cancelled: true });
    assert.deepEqual((await tools.get("rp_loop_list").execute({}, {})).output, []);

    releaseRead({ status: 200, body: { data: {} } });
    await clearAllLoopTimers();
    assert.equal(promptCalls.length, 0, "a tick abandoned by cancel must not inject");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some((tick) => tick.loopID === loopID && tick.outcome === "cancelled"),
      `expected the abandoned tick to record itself cancelled, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );
  });

  test("a tick that finds its target gone retires the loop: entry removed, timer disarmed, retirement recorded once", async () => {
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });
    globalThis[ERROR_LOG_KEY] = [];
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return { id: "msg_probe" };
    };

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn: async (url) => {
          // The target is not in the active set, and every session-addressed
          // read of it answers 404: the session no longer exists.
          if (url.pathname === "/api/session/active") {
            return { status: 200, body: { data: {} } };
          }
          return { status: 404, body: { _tag: "SessionNotFoundError" } };
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 5, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;

    await delay(120);

    assert.deepEqual(
      (await tools.get("rp_loop_list").execute({}, { sessionID: "ses_caller" })).output,
      [],
      "a retired loop leaves no registry entry",
    );
    const retirements = globalThis[ERROR_LOG_KEY].filter((entry) => entry.type === "loop.retired");
    assert.equal(retirements.length, 1, `expected exactly one retirement, got ${JSON.stringify(retirements)}`);
    assert.equal(retirements[0].loopID, loopID);
    assert.equal(promptCalls.length, 0, "a loop whose target is gone must not inject");

    const ticksAtRetirement = globalThis[LOOP_TICK_LOG_KEY].filter((tick) => tick.loopID === loopID).length;
    await delay(60);
    assert.equal(
      globalThis[LOOP_TICK_LOG_KEY].filter((tick) => tick.loopID === loopID).length,
      ticksAtRetirement,
      "a retired loop stops ticking",
    );
  });

  test("disarms the loop and rejects without waiting for the in-flight tick when deleting the registry entry fails", async () => {
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });
    let readStarted;
    let releaseRead;
    const readStartedPromise = new Promise((resolve) => {
      readStarted = resolve;
    });
    const readResponse = new Promise((resolve) => {
      releaseRead = resolve;
    });

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn: async (url) => {
          assert.equal(url.pathname, "/api/session/active");
          readStarted();
          return readResponse;
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 5, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    await readStartedPromise;
    writeFileSync(resolveLoopRegistryPath({ XDG_DATA_HOME: dataHome }), "{");

    await assert.rejects(tools.get("rp_loop_cancel").execute({ id: loopID }, {}), SyntaxError);
    assert.equal(globalThis[LOOP_TIMERS_KEY].get(loopID).cancelled, true, "the loop must be disarmed");

    releaseRead({ status: 200, body: { data: {} } });
  });
});

/** Run `rp_terminate` for a session, for tests that start two concurrently. */
