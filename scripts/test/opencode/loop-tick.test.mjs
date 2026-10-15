import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getSessionUpdatedAt,
  interruptSession,
  isDeadStreamMessage,
  isSessionActive,
  promoteInboxItem,
  resolveDeadStreamConfirmMs,
  runLoopTick,
  sessionReadError,
  withTargetInterruptLock,
} from "../../../opencode/plugin.mjs";

describe("resolveDeadStreamConfirmMs", () => {
  test("defaults to one hour and honors a positive numeric override", () => {
    assert.equal(resolveDeadStreamConfirmMs({}), 3_600_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "4000" }), 4_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "bogus" }), 3_600_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "-5" }), 3_600_000);
  });
});

describe("withTargetInterruptLock", () => {
  test("serializes critical sections per target while leaving other targets unblocked", async () => {
    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const first = withTargetInterruptLock("ses_lock_a", async () => {
      order.push("a1:start");
      await firstGate;
      order.push("a1:end");
    });
    const second = withTargetInterruptLock("ses_lock_a", async () => {
      order.push("a2");
    });
    const other = withTargetInterruptLock("ses_lock_b", async () => {
      order.push("b");
    });

    await other;
    assert.deepEqual(order, ["a1:start", "b"], "a different target must not wait behind the lock");
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(order, ["a1:start", "b", "a1:end", "a2"], "same-target sections must serialize in order");
  });
});

describe("isDeadStreamMessage", () => {
  test("matches only an unfinished message whose last part is a tool call stuck streaming", () => {
    assert.equal(
      isDeadStreamMessage({
        content: [{ type: "text", text: "spawning" }, { type: "tool", state: { status: "streaming" } }],
      }),
      true,
    );
  });

  test("an executing tool anywhere in the message vetoes, even behind a trailing streaming part", () => {
    // Completed tool calls execute concurrently with the remaining stream,
    // so `[running, streaming]` is legitimate work in flight: interrupting
    // it would kill the running tool.
    assert.equal(
      isDeadStreamMessage({
        content: [
          { type: "tool", id: "call_1", name: "shell", state: { status: "running" } },
          { type: "tool", id: "call_2", name: "rp_spawn", state: { status: "streaming", input: "" } },
        ],
      }),
      false,
    );
  });

  test("rejects finished, errored, executing-tool, and absent messages", () => {
    assert.equal(isDeadStreamMessage(null), false);
    assert.equal(
      isDeadStreamMessage({ finish: "error", content: [{ type: "tool", state: { status: "streaming" } }] }),
      false,
    );
    assert.equal(
      isDeadStreamMessage({ error: { type: "aborted" }, content: [{ type: "tool", state: { status: "streaming" } }] }),
      false,
    );
    assert.equal(isDeadStreamMessage({ content: [{ type: "tool", state: { status: "running" } }] }), false);
    assert.equal(isDeadStreamMessage({ content: [{ type: "text", text: "thinking" }] }), false);
    assert.equal(isDeadStreamMessage({ content: [] }), false);
  });
});

describe("runLoopTick", () => {
  const entry = { id: "loop_1", interval: 1000, prompt: "check", targetSession: "ses_target" };

  test("a null server resolution records a no-server outcome without checking activity or injecting", async () => {
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: null,
      isSessionActive: () => {
        throw new Error("must not be called when server is null");
      },
      getSessionUpdatedAt: () => {
        throw new Error("must not be called when server is null");
      },
      injectPrompt: () => {
        throw new Error("must not be called when server is null");
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });

    assert.deepEqual(result, { outcome: "no-server" });
    assert.deepEqual(outcomes, [result]);
  });

  test("a target that no longer exists reports target-missing once instead of throwing every interval", async () => {
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => {
        throw sessionReadError("GET /api/session/ses_target/inbox", 404);
      },
      getMessages: async () => [],
      injectPrompt: () => {
        throw new Error("must not inject into a target that does not exist");
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });

    assert.deepEqual(result, { outcome: "target-missing" });
    assert.deepEqual(outcomes, [result]);
  });

  test("a read that fails for any other reason still surfaces as a thrown failure", async () => {
    const outcomes = [];
    await assert.rejects(
      runLoopTick(entry, {
        server: { baseURL: "http://x", password: "y" },
        isSessionActive: async () => false,
        getInbox: async () => {
          throw sessionReadError("GET /api/session/ses_target/inbox", 503);
        },
        getMessages: async () => [],
        injectPrompt: async () => {},
        onOutcome: (outcome) => outcomes.push(outcome),
      }),
      /503/,
    );

    assert.deepEqual(outcomes, [{ outcome: "failed", error: "Error: GET /api/session/ses_target/inbox returned 503" }]);
  });

  test("a target updated no more than two intervals ago records busy with its last activity", async () => {
    let injected = 0;
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 8_000,
      injectPrompt: async () => {
        injected++;
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "busy", lastActivity: 8_000 });
    assert.deepEqual(outcomes, [result]);
    assert.equal(injected, 0);
  });

  test("a target still active more than two intervals after its last activity receives a steer prompt", async () => {
    const calls = [];
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 7_999,
      getInbox: async () => [],
      getMessages: async () => [],
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push({ sessionID, text, delivery });
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      now: () => 10_000,
    });

    assert.deepEqual(result, {
      outcome: "injected",
      reason: "stale-running",
      lastActivity: 7_999,
    });
    assert.deepEqual(outcomes, [result]);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { sessionID: "ses_target", text: "check", delivery: "steer" });
  });

  test("an idle target receives one queued prompt without a session-record read", async () => {
    const calls = [];
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getSessionUpdatedAt: () => {
        throw new Error("must not read activity for an idle target");
      },
      getInbox: async () => [],
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push({ sessionID, text, delivery });
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.deepEqual(outcomes, [result]);
    assert.deepEqual(calls, [{ sessionID: "ses_target", text: "check", delivery: "queue" }]);
  });

  test("a failed tick records the failure before rejecting", async () => {
    const outcomes = [];

    await assert.rejects(
      () =>
        runLoopTick(entry, {
          server: { baseURL: "http://x", password: "y" },
          isSessionActive: async () => {
            throw new Error("active read failed");
          },
          getSessionUpdatedAt: async () => 0,
          injectPrompt: async () => {},
          onOutcome: (outcome) => outcomes.push(outcome),
        }),
      /active read failed/,
    );

    assert.deepEqual(outcomes, [{ outcome: "failed", error: "Error: active read failed" }]);
  });

  test("cancellation during a state read records cancellation without injecting", async () => {
    const outcomes = [];
    let cancelled = false;
    let injected = false;
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => {
        cancelled = true;
        return false;
      },
      getSessionUpdatedAt: async () => 0,
      injectPrompt: async () => {
        injected = true;
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      isCancelled: () => cancelled,
    });

    assert.deepEqual(result, { outcome: "cancelled" });
    assert.deepEqual(outcomes, [result]);
    assert.equal(injected, false);
  });

  test("an idle target with this loop's prompt still pending in its inbox is not injected again", async () => {
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: () => {
        throw new Error("must not read messages while the prompt is pending");
      },
      injectPrompt: () => {
        throw new Error("must not duplicate a pending prompt");
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      state: {},
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "pending-delivery" });
    assert.deepEqual(outcomes, [result]);
  });

  test("an injection answered only by an error-finish turn backs off, then probes again", async () => {
    const state = {};
    const calls = [];
    let messages = [];
    let nextID = 0;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push(delivery);
        nextID += 1;
        return { data: { id: `usr_${nextID}` } };
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    // Tick 1: first injection, anchored on the admitted input's ID.
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.deepEqual(state.lastInjection, { id: "usr_1", at: 10_000, evaluated: false });

    // The injected turn fails instantly (network down, quota exhausted...).
    messages = [
      { id: "as_1", type: "assistant", finish: "error", time: { created: 10_500 } },
      { id: "usr_1", type: "user", text: "check" },
    ];

    // Tick 2: the failed probe is detected once and starts the backoff.
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });

    // Tick 3: the injection is suppressed by the backoff, but the target is
    // still inspected (the tick reaches the idle branch's own reads).
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "backoff",
      remaining: 0,
    });

    // Tick 4: the backoff expired — the loop probes again.
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.deepEqual(calls, ["queue", "queue"]);
  });

  test("consecutive failed probes double the backoff up to its cap", async () => {
    const state = { lastInjection: { id: "usr_1", at: 10_000, evaluated: false }, backoffLevel: 2 };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", finish: "error", time: { created: 10_500 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject while backing off");
      },
      onOutcome: () => {},
      now: () => 20_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 3,
      skips: 7,
    });

    // A fourth consecutive failure stays at the cap.
    state.backoffSkips = 0;
    state.lastInjection = { id: "usr_1", at: 10_000, evaluated: false };
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 4,
      skips: 7,
    });
  });

  test("a successful turn after an injection ends the backoff and injects normally", async () => {
    const state = { lastInjection: { id: "usr_1", at: 10_000, evaluated: false }, backoffLevel: 3, backoffSkips: 5 };
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", finish: "stop", time: { created: 10_500 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: async (sessionID, text, delivery) => calls.push(delivery),
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.equal(state.backoffLevel, 0);
    assert.equal(state.backoffSkips, 0, "a success must end a pending skip window");
    assert.deepEqual(calls, ["queue"]);
  });

  test("with only timestamp anchoring, an error turn older than the injection does not trigger the backoff", async () => {
    const state = { lastInjection: { at: 10_000, evaluated: false } };
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [{ id: "as_1", type: "assistant", finish: "error", time: { created: 9_000 } }],
      injectPrompt: async (sessionID, text, delivery) => calls.push(delivery),
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.deepEqual(calls, ["queue"]);
  });

  test("a busy target whose probe is still in flight leaves the backoff and the evaluation untouched", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false }, backoffLevel: 3 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 9_500,
      getMessages: async () => [
        { id: "as_1", type: "assistant", time: { created: 9_100 }, content: [{ type: "text", text: "..." }] },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a busy target");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "busy", lastActivity: 9_500 });
    assert.equal(state.backoffLevel, 3, "an unresolved probe must not reset the backoff");
    assert.equal(state.lastInjection.evaluated, false, "an in-flight responding turn yields no verdict");
  });

  test("a busy target whose probe finished as an error engages the backoff without waiting for idle", async () => {
    // The slow-failure chain: the probe turn errors and follow-up activity
    // keeps the session active, so the target is never observed idle. The
    // busy path itself must classify the finished responding turn.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 9_500,
      getMessages: async () => [
        { id: "as_2", type: "assistant", time: { created: 9_600 } },
        { id: "as_1", type: "assistant", finish: "error", time: { created: 9_400 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a busy target");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "failed-probe", level: 1, skips: 1 });
  });

  test("an unrelated turn that started during the admission round trip is never classified as the probe", async () => {
    // A concurrent prompt can start — and fail — while the probe's admission
    // round trip is still in flight. ID anchoring attributes only the turn
    // that actually responded to the injected input.
    const state = { lastInjection: { id: "usr_9", at: 10_000, evaluated: false }, backoffLevel: 0 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getMessages: async () => [
        // Newest first: our input was delivered, but no turn has responded
        // to it yet; the newest *finished* turn is an unrelated failure
        // from after the injection timestamp.
        { id: "usr_9", type: "user", text: "check" },
        { id: "as_5", type: "assistant", finish: "error", time: { created: 10_010 } },
        { id: "usr_5", type: "user", text: "unrelated" },
      ],
      getInbox: async () => [],
      injectPrompt: () => {
        throw new Error("must not inject while the probe's response is pending");
      },
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response", lastActivity: 5_000 });
    assert.equal(state.backoffLevel, 0, "an unrelated failure must not engage the backoff");
    assert.equal(state.lastInjection.evaluated, false);
  });

  test("a failed evaluation read does not consume the evaluation", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => {
        throw new Error("message read failed");
      },
      injectPrompt: () => {
        throw new Error("must not inject before the probe is classified");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    await assert.rejects(() => runLoopTick(entry, deps), /message read failed/);
    assert.equal(state.lastInjection.evaluated, false, "a failed read must leave the probe evaluable");

    // The next tick, with the read working again, classifies the probe.
    deps.getMessages = async () => [
      { id: "as_1", type: "assistant", finish: "error", time: { created: 9_500 } },
      { id: "usr_1", type: "user", text: "check" },
    ];
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
  });

  test("a turn failing during the admission round trip is still classified as a failed probe", async () => {
    // The server admits and schedules without joining execution, so a fast
    // failure can complete before the injection call resolves. ID anchoring
    // attributes it regardless of timestamps.
    let clock = 10_000;
    let messages = [];
    const state = {};
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async () => {
        // The admission round trip takes 50ms, during which the scheduled
        // turn starts and fails instantly.
        messages = [
          { id: "as_1", type: "assistant", finish: "error", time: { created: clock + 10 } },
          { id: "usr_1", type: "user", text: "check" },
        ];
        clock += 50;
        return { data: { id: "usr_1" } };
      },
      onOutcome: () => {},
      now: () => clock,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.equal(state.lastInjection.at, 10_000, "the fallback marker must predate the admission round trip");

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
  });

  test("a stale steer is gated by the backoff", async () => {
    // Steering a stale target is an injection like any other: during a
    // skip window it is suppressed — hung-target recovery does not depend
    // on it, because the dead-stream interrupt fires directly.
    const state = { backoffSkips: 5, backoffLevel: 3 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [],
      injectPrompt: () => {
        throw new Error("must not inject during backoff");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "backoff", remaining: 4 });
  });

  test("the dead-stream interrupt fires with no pending steer, even during a backoff window, and clears it", async () => {
    const interrupts = [];
    const state = { backoffSkips: 5, backoffLevel: 3 };
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject during backoff");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
    assert.equal(state.backoffSkips, 0, "the freed target must be re-probed on the next tick, not after the window");
  });

  test("an idle target whose delivered probe got no response records a failed probe instead of flooding", async () => {
    // A missing model (or a crash before any assistant record) admits the
    // input and produces nothing: the session is idle, so no response is
    // coming, and re-injecting every tick would flood.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [{ id: "usr_1", type: "user", text: "check" }],
      injectPrompt: () => {
        throw new Error("must not re-inject over an unanswered probe");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "skipped", reason: "backoff", remaining: 0 });
  });

  test("a probe anchor found in neither the inbox nor the transcript page is superseded, not waited on", async () => {
    // The anchor aged past the read page (or was cancelled): waiting on it
    // would suppress monitoring forever.
    const idleState = { lastInjection: { id: "usr_gone", at: 1_000, evaluated: false } };
    const idleCalls = [];
    assert.deepEqual(
      await runLoopTick(entry, {
        server: { baseURL: "http://x", password: "y" },
        isSessionActive: async () => false,
        getInbox: async () => [],
        getMessages: async () => [{ id: "as_50", type: "assistant", finish: "stop", time: { created: 9_000 } }],
        injectPrompt: async (sessionID, text, delivery) => {
          idleCalls.push(delivery);
          return { data: { id: "usr_2" } };
        },
        onOutcome: () => {},
        now: () => 10_000,
        state: idleState,
      }),
      { outcome: "injected", reason: "idle" },
    );
    assert.deepEqual(idleCalls, ["queue"]);

    const staleState = { lastInjection: { id: "usr_gone", at: 1_000, evaluated: false } };
    const staleCalls = [];
    assert.deepEqual(
      await runLoopTick(entry, {
        server: { baseURL: "http://x", password: "y" },
        isSessionActive: async () => true,
        getSessionUpdatedAt: async () => 5_000,
        getInbox: async () => [],
        getMessages: async () => [{ id: "as_50", type: "assistant", finish: "stop", time: { created: 9_000 } }],
        injectPrompt: async (sessionID, text, delivery) => {
          staleCalls.push(delivery);
          return { data: { id: "usr_2" } };
        },
        onOutcome: () => {},
        now: () => 10_000,
        state: staleState,
      }),
      { outcome: "injected", reason: "stale-running", lastActivity: 5_000 },
    );
    assert.deepEqual(staleCalls, ["steer"]);
  });

  test("a frozen stream is suspected, held for the confirmation window, then interrupted", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 2_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, [], "the first observation must not interrupt");

    // Frozen, but the wall-clock window has not elapsed: still suspected.
    clock = 11_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, [], "an unelapsed window must not authorize the interrupt");

    clock = 12_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 2_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a stream that progressed between observations is never interrupted", async () => {
    const state = {};
    let args = "";
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", name: "rp_spawn", state: { status: "streaming", input: args } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: () => {
        throw new Error("a healthy, progressing stream must never be interrupted");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });

    // The arguments grew between ticks: same message, live stream.
    args = '{"name":"rev8-doc';
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
  });

  test("an unchanged fingerprint with events still flowing is not confirmed dead", async () => {
    // The projection keeps a streaming tool call's input empty while its
    // arguments arrive, so an identical fingerprint proves nothing by
    // itself; only event silence since the suspicion confirms death.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let lastEvent;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getLastEventAt: () => lastEvent,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // Progress events veto the confirmation and re-arm the window even
    // though the projection is static.
    clock = 11_100;
    lastEvent = 10_500;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    assert.deepEqual(interrupts, [], "a stream emitting events must never be interrupted");

    // A full window of true silence later, the confirmation fires.
    clock = 12_200;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("raw response chunks veto the interrupt indefinitely, even past the confirmation window", async () => {
    // The reviewer's boundary case: a healthy stream trickling argument
    // chunks with a frozen projection, outliving the window. The raw
    // liveness signal must keep vetoing for as long as bytes arrive.
    const state = {};
    let clock = 10_000;
    let lastRawChunk;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () =>
        lastRawChunk === undefined ? undefined : { lastAt: lastRawChunk, open: [{ startedAt: 0, lastAt: lastRawChunk, ids: ["call_1"] }] },
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: () => {
        throw new Error("a stream producing bytes must never be interrupted");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // Chunks keep arriving; every tick far beyond the window stays a veto.
    for (let tick = 0; tick < 5; tick++) {
      clock += 1_500;
      lastRawChunk = clock - 100;
      assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    }
  });

  test("two loops confirming the same dead target produce exactly one interrupt", async () => {
    const interrupts = [];
    let interruptedAt;
    const messages = [
      {
        id: "as_1",
        type: "assistant",
        content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
      },
    ];
    let clock = 10_000;
    const makeDeps = (state) => ({
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => messages,
      getLastInterruptAt: () => interruptedAt,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      recordInterrupt: (sessionID, at) => {
        interruptedAt = at;
      },
      withTargetLock: withTargetInterruptLock,
      injectPrompt: () => {
        throw new Error("must not inject");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    });
    const stateA = {};
    const stateB = {};

    // Both loops suspect the same frozen stream...
    assert.equal((await runLoopTick(entry, makeDeps(stateA))).reason, "dead-stream-suspected");
    assert.equal((await runLoopTick(entry, makeDeps(stateB))).reason, "dead-stream-suspected");

    // ...and confirm concurrently after the window. Serialization plus the
    // last-interrupt guard must yield a single interrupt: the second loop's
    // evidence describes the execution the first one already interrupted.
    clock = 11_100;
    const results = await Promise.all([runLoopTick(entry, makeDeps(stateA)), runLoopTick(entry, makeDeps(stateB))]);
    assert.deepEqual(interrupts, ["ses_target"], "the successor execution must never be interrupted on old evidence");
    assert.deepEqual(results.map((result) => result.outcome).sort(), ["interrupted", "skipped"]);
  });

  test("a target with no raw-progress record has unknown coverage and is never escalated", async () => {
    // Silence can only be measured where bytes were once observed: a
    // missing raw record (uncovered location, failed hook, or eviction)
    // must disable escalation, not authorize it.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("unknown coverage must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 15_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("a historical raw record from an earlier turn does not count as coverage of the current stream", async () => {
    // The reviewer's replay: raw timestamp 100 from a prior response, an
    // uncovered current stream suspected at 10000 — session history must
    // not authorize interrupting a stream that was never observed.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 100, open: [{ startedAt: 100, lastAt: 100, ids: ["call_old"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("historical coverage must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("identity holds across any time-to-first-token gap: headers long before the row still cover", async () => {
    // The row is created from the first model event, not the headers, so
    // the gap between response start and row creation is provider-sized —
    // seconds, not milliseconds. Identity is by carried call id, so the
    // gap cannot matter in either direction.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 8_600, open: [{ startedAt: 2_000, lastAt: 8_600, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("coverage pinned at suspicion survives a later record eviction, so a genuine stall still recovers", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let raw = { lastAt: 9_200, open: [{ startedAt: 9_100, lastAt: 9_200, ids: ["call_1"] }] };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => raw,
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // Suspicion establishes coverage of the current stream...
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // ...then 256 busier sessions evict the record. The pinned verdict must
    // hold: eviction is not a retraction, and the stall still recovers.
    raw = undefined;
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("coverage returns with the next response a late-landing hook actually observes", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let raw;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => raw,
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // Uncovered at suspicion: escalation disabled.
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-unobserved");

    // A hook cannot retroactively tee a response whose headers already
    // passed; what it observes is the *next* response for the session — a
    // provider retry here — opening a fresh generation whose bytes are
    // stale by the following tick, so silence finally becomes measurable.
    raw = { lastAt: 11_200, open: [{ startedAt: 11_200, lastAt: 11_200, ids: ["call_1"] }] };
    clock = 11_150 + 1_000;
    // First covered tick vetoes on the fresh bytes and re-arms...
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    // ...then a silent window authorizes.
    clock += 1_500;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_500,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a completed response milliseconds before the suspected message is never coverage for it", async () => {
    // The reviewer's identity counterexample: consecutive assistant rows
    // 215 ms apart. The prior turn's response closed its generation, so it
    // cannot impersonate the current, unobserved stream — slack or no
    // slack.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_2",
          type: "assistant",
          time: { created: 9_215 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
        { id: "as_1", type: "assistant", finish: "stop", time: { created: 9_000 } },
      ],
      // The prior response: started within the slack window but *closed* —
      // its bytes are history, not the current stream.
      getRawProgressAt: () => ({ lastAt: 9_210, open: [] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("a closed prior response must never authorize interrupting an unobserved stream");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("an abandoned generation that never consumed bytes can never claim identity", async () => {
    // A later hook can replace the teed response; the abandoned wrapper's
    // generation stays open but transforms nothing, so it carries no ids —
    // coverage must come from the response path actually consumed.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 9_100, open: [{ startedAt: 9_050, lastAt: 9_050, ids: [] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("an unconsumed wrapper must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("any matching generation producing bytes vetoes, not merely the first match", async () => {
    // Two open generations can carry one call id (sampled-then-replayed).
    // A silent older match must not shadow a live newer one.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({
        lastAt: clock,
        open: [
          { startedAt: 9_050, lastAt: 9_100, ids: ["call_1"] },
          { startedAt: 9_500, lastAt: clock, ids: ["call_1"] },
        ],
      }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("a live matching generation must veto the interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 14_000;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
  });

  test("multiple silent generations carrying one call id are ambiguous and never authorize", async () => {
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({
        lastAt: 9_100,
        open: [
          { startedAt: 9_050, lastAt: 9_100, ids: ["call_1"] },
          { startedAt: 9_060, lastAt: 9_090, ids: ["call_1"] },
        ],
      }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("ambiguous identity must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("bytes on unrelated same-session responses do not veto the suspected stream forever", async () => {
    // The veto is scoped to the matched generation: a concurrent response
    // (e.g. session.generate) trickling bytes must not defer recovery of
    // the hung agent turn indefinitely.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      // The matched generation is silent; an unrelated concurrent one keeps
      // producing bytes (session-wide lastAt stays fresh).
      getRawProgressAt: () => ({
        lastAt: clock,
        open: [
          { startedAt: 9_050, lastAt: 9_100, ids: ["call_1"] },
          { startedAt: 9_500, lastAt: clock, ids: ["call_unrelated"] },
        ],
      }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a failed interrupt request is not recorded, leaving the next confirmation free to retry", async () => {
    let recorded;
    const state = {};
    let clock = 10_000;
    let failInterrupt = true;
    const interrupts = [];
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      getLastInterruptAt: () => recorded,
      recordInterrupt: (sessionID, at) => {
        recorded = at;
      },
      injectPrompt: () => {
        throw new Error("must not inject");
      },
      interruptSession: async (server, sessionID) => {
        if (failInterrupt) {
          throw new Error("interrupt request failed");
        }
        interrupts.push(sessionID);
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    await assert.rejects(() => runLoopTick(entry, deps), /interrupt request failed/);
    assert.equal(recorded, undefined, "a failed request must record nothing");

    // The next confirmation retries instead of skipping on a phantom record.
    failInterrupt = false;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_300;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_200,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
    assert.equal(recorded, 12_300);
  });

  test("cancellation during the confirming tick's reads prevents the interrupt", async () => {
    let cancelled = false;
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => {
        cancelled = true;
        return [];
      },
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject after cancellation");
      },
      interruptSession: () => {
        throw new Error("a cancelled loop must never interrupt its target");
      },
      onOutcome: () => {},
      isCancelled: () => cancelled,
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "cancelled" });
  });

  test("a target that became active during the idle reads coalesces instead of failing the probe", async () => {
    // The idleness sample ages while the inbox and transcript are read; if
    // execution started in the meantime, the probe's response may still be
    // coming and must not be written off.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const activeAnswers = [false, true];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => activeAnswers.shift(),
      getInbox: async () => [],
      getMessages: async () => [{ id: "usr_1", type: "user", text: "check" }],
      injectPrompt: () => {
        throw new Error("must not inject while the probe's response may be starting");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response" });
    assert.equal(state.lastInjection.evaluated, false, "the probe must remain evaluable");
    assert.equal(state.backoffLevel ?? 0, 0, "no failure may be recorded for a possibly-starting response");
  });

  test("a parked queue copy is promoted before the confirming interrupt so the freed session receives it", async () => {
    const calls = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      promoteInboxItem: async (server, sessionID, inboxID) => calls.push(`promote:${inboxID}`),
      interruptSession: async () => calls.push("interrupt"),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // First observation only suspects; the parked copy must not be
    // promoted yet (the session may still be alive).
    const first = await runLoopTick(entry, deps);
    assert.equal(first.reason, "dead-stream-suspected");
    assert.deepEqual(calls, []);

    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(calls, ["promote:inb_1", "interrupt"], "the copy must be steerable before the claim is released");
  });

  test("progress during the confirming tick's own reads vetoes the interrupt at the last moment", async () => {
    const state = {};
    let clock = 10_000;
    let messages = [
      {
        id: "as_1",
        type: "assistant",
        content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
      },
    ];
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => {
        // The stream completes while the confirming tick reads the inbox.
        messages = [{ id: "as_1", type: "assistant", finish: "tool-calls", time: { created: clock } }];
        return [];
      },
      getMessages: async () => messages,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject during confirmation");
      },
      interruptSession: () => {
        throw new Error("progress during the confirming reads must veto the interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
  });

  test("a fast successful probe finishing between the snapshot and the idle recheck is classified from the fresh read", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    let messages = [{ id: "usr_1", type: "user", text: "check" }];
    let activeReads = 0;
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => {
        activeReads += 1;
        if (activeReads === 2) {
          // The successful turn ran to completion between the transcript
          // snapshot and this idleness recheck.
          messages = [
            { id: "as_1", type: "assistant", finish: "stop", time: { created: 9_800 } },
            { id: "usr_1", type: "user", text: "check" },
          ];
        }
        return false;
      },
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push(delivery);
        return { data: { id: "usr_2" } };
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.equal(state.backoffLevel, 0, "a successful response must never be recorded as a failed probe");
    assert.deepEqual(calls, ["queue"]);
  });

  test("a stale target with an unconsumed steer but an executing tool call is left alone", async () => {
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "steer", payload: { text: "check" } }],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", name: "shell", state: { status: "running" } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not duplicate the pending steer");
      },
      interruptSession: () => {
        throw new Error("must never interrupt an executing tool call");
      },
      onOutcome: () => {},
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "pending-delivery", lastActivity: 5_000 });
  });

  test("a stale target with a parked queue copy has it promoted to steer instead of receiving a duplicate", async () => {
    const promotions = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: async () => [],
      injectPrompt: () => {
        throw new Error("must not duplicate the parked prompt");
      },
      promoteInboxItem: async (server, sessionID, inboxID) => promotions.push({ sessionID, inboxID }),
      onOutcome: () => {},
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "promoted", reason: "stale-running", lastActivity: 5_000 });
    assert.deepEqual(promotions, [{ sessionID: "ses_target", inboxID: "inb_1" }]);
  });

  test("a stale target whose probe response is still in flight is not steered on top", async () => {
    // The slow-failure chain's steady state: the previous steer was
    // consumed and its responding turn is failing slowly. Re-steering here
    // is what floods; the tick waits for the responding turn's verdict.
    const state = { lastInjection: { id: "usr_1", at: 4_000, evaluated: false } };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", time: { created: 4_100 }, content: [] },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not steer while the probe's response is in flight");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response", lastActivity: 5_000 });
    assert.equal(state.lastInjection.evaluated, false);
  });
});
