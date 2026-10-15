import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  test,
} from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import {
  formatStructuredError,
  lookupSpawn,
  recordSend,
  recordSessionParent,
  recordSpawn,
  setup,
  terminalEventError,
  terminalEventSessionID,
  toToolResult,
  turnsFor,
} from "../../../opencode/plugin.mjs";

import { clearAllLoopTimers, createFakeCtx, isolatedDeps } from "./fixture.mjs";

// The owner's session: opencode announces every session it creates, so
// registering ses_owner as a root session is what the running daemon does
// before any tool call reaches the access boundary.
for (const id of ["ses_owner", "ses_caller"]) {
  recordSessionParent({ type: "session.created", data: { sessionID: id } });
}

/** Well-known globalThis symbols the module keys its singletons under. */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");
const TERMINATED_SESSIONS_KEY = Symbol.for("radical-pipelines.opencode.terminatedSessions");

describe("rp_terminate", () => {
  afterEach(clearAllLoopTimers);

  test("deletes the target session and surfaces missing and failed deletions", async () => {
    const { ctx, tools } = createFakeCtx();
    const requests = [];
    let status = 204;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          requests.push({ url, init });
          return { status, body: undefined };
        },
      }),
    );

    const tool = tools.get("rp_terminate");
    assert.deepEqual(await tool.execute({ session: "ses_finished" }, { sessionID: "ses_owner" }), toToolResult({ terminated: true }));
    assert.equal(requests[0].url.pathname, "/api/session/ses_finished");
    assert.equal(requests[0].init.method, "DELETE");
    assert.equal(requests[0].init.body, undefined);

    status = 404;
    assert.deepEqual(
      await tool.execute({ session: "ses_missing" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 404, error: "SessionNotFoundError" }),
    );

    status = 500;
    assert.deepEqual(
      await tool.execute({ session: "ses_finished" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );
  });

  test("reports an unreachable server without issuing a request", async () => {
    const { ctx, tools } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    assert.deepEqual(
      await tools.get("rp_terminate").execute({ session: "ses_finished" }, { sessionID: "ses_owner" }),
      toToolResult({ error: "server unreachable" }),
    );
  });
});

function tool_execute(tools, session) {
  return tools.get("rp_terminate").execute({ session }, { sessionID: "ses_owner" });
}

describe("terminal-event listener", () => {
  beforeEach(() => {
    delete globalThis[SETUP_ONCE_KEY];
    delete globalThis[TERMINATED_SESSIONS_KEY];
  });

  afterEach(clearAllLoopTimers);

  test("every failed terminal event announces the failure", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_evt", { id: "ses_spawner_evt" });
    sessions.set("ses_child_evt", { id: "ses_child_evt" });
    recordSpawn("ses_child_evt", {
      name: "worker",
      pipelineSlug: "258-agent-declared-completion",
      spawner: "ses_spawner_evt",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    await setup(
      ctx,
      isolatedDeps({ env: {}, readServiceRecord: () => null }),
    );

    assert.equal(fakeCtx.subscribeCalls, 1);

    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    assert.equal(
      promptCalls.length,
      0,
      "a successful turn whose beginning this process never saw is not announced",
    );

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    assert.equal(promptCalls.length, 2, "every failed turn must be announced, not just the first");
    for (const call of promptCalls) {
      assert.equal(call.sessionID, "ses_spawner_evt");
      assert.equal(call.delivery, "steer");
      assert.match(call.text, /worker \(ses_child_evt\) failed a turn/);
      assert.doesNotMatch(call.text, /succeeded/i);
    }

    // The silent success is still a fact the ledger row carries: every
    // terminal event above ended a turn.
    assert.equal(turnsFor("ses_child_evt").turns, 3);
    assert.equal(turnsFor("ses_child_evt").lastTurn.outcome, "failed");
  });

  test("a turn is announced when it failed, or succeeded without a message; never when interrupted, messaged, or begun out of view", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_turns", { id: "ses_spawner_turns" });
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };
    await setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    const outcomes = { succeeded: "session.execution.succeeded", failed: "session.execution.failed", interrupted: "session.execution.interrupted" };
    const messaging = ["messaged", "silent", "unknown"];
    let n = 0;
    for (const [outcome, type] of Object.entries(outcomes)) {
      for (const state of messaging) {
        const id = `ses_child_turns_${n++}`;
        sessions.set(id, { id });
        const begun = Date.now() - 10_000;
        recordSpawn(id, {
          name: `worker-${outcome}-${state}`,
          pipelineSlug: "announced-turns",
          spawner: "ses_spawner_turns",
          ...(state === "unknown" ? {} : { spawnedAt: begun }),
        });
        if (state !== "silent") {
          recordSend(id, "ses_spawner_turns", begun + 5_000);
        }
        promptCalls.length = 0;
        pushEvent({ type, data: { sessionID: id } });
        await delay(10);

        const expected =
          outcome === "failed"
            ? [`[rp] worker-${outcome}-${state} (${id}) failed a turn.`]
            : outcome === "succeeded" && state === "silent"
              ? [`[rp] worker-${outcome}-${state} (${id}) ended a turn without sending a message.`]
              : [];
        assert.deepEqual(
          promptCalls,
          expected.map((text) => ({ sessionID: "ses_spawner_turns", text, delivery: "steer" })),
          `${outcome} turn, ${state}`,
        );
      }
    }
  });

  test("a turn that ended without a message is not announced for a session whose deletion confirmed, and is held while the delete is in flight", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    for (const id of ["ses_spawner_unmsg", "ses_child_unmsg_deleted", "ses_child_unmsg_alive"]) {
      sessions.set(id, { id });
    }
    for (const id of ["ses_child_unmsg_deleted", "ses_child_unmsg_alive"]) {
      recordSpawn(id, {
        name: id,
        pipelineSlug: "announced-turns",
        spawner: "ses_spawner_unmsg",
        spawnedAt: Date.now() - 10_000,
      });
    }
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };
    let status = 204;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        // The turn ends while the delete is in flight: held, then settled by
        // the delete's outcome.
        requestFn: async (url) => {
          const id = url.pathname.split("/").pop();
          pushEvent({ type: "session.execution.succeeded", data: { sessionID: id } });
          await delay(10);
          return { status, body: undefined };
        },
      }),
    );

    await tools.get("rp_terminate").execute({ session: "ses_child_unmsg_deleted" }, { sessionID: "ses_spawner_unmsg" });
    await delay(10);
    assert.deepEqual(promptCalls, [], "a confirmed deletion drops the held announcement");

    status = 500;
    await tools.get("rp_terminate").execute({ session: "ses_child_unmsg_alive" }, { sessionID: "ses_spawner_unmsg" });
    await delay(10);
    assert.deepEqual(promptCalls.map((call) => call.text), [
      "[rp] ses_child_unmsg_alive (ses_child_unmsg_alive) ended a turn without sending a message.",
    ], "a failed deletion releases the held announcement");
  });

  test("a failure arriving while the delete is still in flight is suppressed, and other sessions keep announcing", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    for (const id of ["ses_spawner_term", "ses_child_term", "ses_child_other"]) {
      sessions.set(id, { id });
    }
    for (const id of ["ses_child_term", "ses_child_other"]) {
      recordSpawn(id, {
        name: id === "ses_child_term" ? "worker" : "bystander",
        pipelineSlug: "267-steer-inter-agent-messages",
        spawner: "ses_spawner_term",
      });
    }

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        // The delete-associated failure is observed while the request is
        // still in flight, so emitting it here — before the response
        // resolves — is what proves the marker is recorded up front. Moving
        // the record after a successful response fails this test.
        requestFn: async () => {
          pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_term" } });
          await delay(10);
          return { status: 204, body: undefined };
        },
      }),
    );
    globalThis[ERROR_LOG_KEY] = [];

    await tools.get("rp_terminate").execute({ session: "ses_child_term" }, { sessionID: "ses_owner" });
    await delay(10);

    assert.deepEqual(promptCalls, [], "a deliberate shutdown must not be announced as a failure");
    assert.deepEqual(
      globalThis[ERROR_LOG_KEY].filter((entry) => entry.sessionID === "ses_child_term"),
      [],
      "a deliberate shutdown must not appear in recentErrors",
    );

    // Suppression is per-session, not a disabled listener.
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_other" } });
    await delay(10);
    assert.equal(promptCalls.length, 1, "an untouched session must still announce its failures");
    assert.match(promptCalls[0].text, /bystander \(ses_child_other\) failed a turn/);
  });

  test("a failed attempt does not erase the suppression a successful termination placed", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_twice", { id: "ses_spawner_twice" });
    sessions.set("ses_child_twice", { id: "ses_child_twice" });
    recordSpawn("ses_child_twice", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_twice",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    let status = 204;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async () => ({ status, body: undefined }),
      }),
    );

    const tool = tools.get("rp_terminate");
    await tool.execute({ session: "ses_child_twice" }, { sessionID: "ses_owner" });

    status = 500;
    assert.deepEqual(
      await tool.execute({ session: "ses_child_twice" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_twice" } });
    await delay(10);
    assert.deepEqual(
      promptCalls,
      [],
      "a later failed attempt must not resurrect announcements for an already-terminated session",
    );
  });

  for (const outcome of [
    { label: "500", requestFn: async () => ({ status: 500, body: undefined }) },
    { label: "404", requestFn: async () => ({ status: 404, body: undefined }) },
    {
      label: "a transport throw",
      requestFn: async () => {
        throw new Error("socket hang up");
      },
    },
  ]) {
    test(`a failure held while the delete is in flight is reported once that delete ends in ${outcome.label}`, async () => {
      const fakeCtx = createFakeCtx();
      const { ctx, tools, pushEvent, sessions } = fakeCtx;
      sessions.set("ses_spawner_held", { id: "ses_spawner_held" });
      sessions.set("ses_child_held", { id: "ses_child_held" });
      recordSpawn("ses_child_held", {
        name: "worker",
        pipelineSlug: "267-steer-inter-agent-messages",
        spawner: "ses_spawner_held",
      });

      const promptCalls = [];
      ctx.session.prompt = async (args) => {
        promptCalls.push(args);
        return args;
      };

      setup(
        ctx,
        isolatedDeps({
          env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
          readServiceRecord: () => null,
          // The session fails on its own — a provider error, say — while the
          // delete that will not succeed is still in flight. Only the delete
          // emits it.
          requestFn: async (url, init) => {
            if (init.method !== "DELETE") {
              return { status: 200, body: undefined };
            }
            pushEvent({
              type: "session.execution.failed",
              data: { sessionID: "ses_child_held" },
              properties: { error: { type: "provider", message: "upstream exploded" } },
            });
            await delay(10);
            return outcome.requestFn(url, init);
          },
        }),
      );
      globalThis[ERROR_LOG_KEY] = [];

      await tools
        .get("rp_terminate")
        .execute({ session: "ses_child_held" }, { sessionID: "ses_owner" })
        .catch(() => undefined);
      await delay(10);

      // Nothing was terminated, so the agent is alive and its failure is
      // still its spawner's business. Dropping it would lose it for good.
      assert.equal(
        promptCalls.length,
        1,
        `a failure held across a delete that ended in ${outcome.label} must still be announced`,
      );
      assert.match(promptCalls[0].text, /worker \(ses_child_held\) failed a turn/);
      assert.match(promptCalls[0].text, /upstream exploded/);
      assert.equal(
        globalThis[ERROR_LOG_KEY].filter((e) => e.sessionID === "ses_child_held").length,
        1,
        "the held failure must also reach recentErrors",
      );
    });
  }

  test("one failing released report neither stops the others nor changes the tool's result", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_iso", { id: "ses_spawner_iso" });
    sessions.set("ses_child_iso", { id: "ses_child_iso" });
    recordSpawn("ses_child_iso", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_iso",
    });

    // A dead spawner is the ordinary way this happens.
    let attempts = 0;
    const announced = [];
    ctx.session.prompt = async (args) => {
      attempts += 1;
      announced.push(args.text.match(/Cause: provider: (.+)$/)?.[1]);
      if (attempts === 1) {
        throw new Error("spawner prompt failed");
      }
      return {};
    };

    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          for (const message of ["first", "second"]) {
            pushEvent({
              type: "session.execution.failed",
              data: { sessionID: "ses_child_iso" },
              properties: { error: { type: "provider", message } },
            });
          }
          await delay(10);
          return { status: 500, body: undefined };
        },
      }),
    );
    globalThis[ERROR_LOG_KEY] = [];

    // The rejecting report must not become this tool's outcome.
    assert.deepEqual(
      await tools.get("rp_terminate").execute({ session: "ses_child_iso" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );
    await delay(10);

    assert.equal(attempts, 2, "a failing report must not stop the reports held behind it");
    assert.deepEqual(
      announced,
      ["first", "second"],
      "held reports must release in the order they were held, not in reverse",
    );
    assert.ok(
      globalThis[ERROR_LOG_KEY].some((e) => e.type === "listener.failed"),
      "a failing released report must be recorded the way the event loop records one",
    );
  });

  test("a confirmed termination during an older release keeps its marker and drops the held reports", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_win", { id: "ses_spawner_win" });
    sessions.set("ses_child_win", { id: "ses_child_win" });
    recordSpawn("ses_child_win", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_win",
    });

    const gate = () => {
      let open;
      return { opened: new Promise((resolve) => (open = resolve)), open: () => open() };
    };
    const firstReport = gate();

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      if (promptCalls.length === 1) {
        await firstReport.opened;
      }
      return args;
    };

    let attempt = 0;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          attempt += 1;
          if (attempt === 1) {
            pushEvent({
              type: "session.execution.failed",
              data: { sessionID: "ses_child_win" },
              properties: { error: { type: "provider", message: "first attempt" } },
            });
            await delay(10);
            return { status: 500, body: undefined };
          }
          pushEvent({
            type: "session.execution.failed",
            data: { sessionID: "ses_child_win" },
            properties: { error: { type: "provider", message: "second attempt" } },
          });
          await delay(10);
          return { status: 204, body: undefined };
        },
      }),
    );
    globalThis[ERROR_LOG_KEY] = [];

    const failing = tool_execute(tools, "ses_child_win");
    await delay(30); // the first release is blocked inside its report

    // The second attempt settles successfully while that release is blocked.
    assert.deepEqual(
      await tool_execute(tools, "ses_child_win"),
      toToolResult({ terminated: true }),
    );

    firstReport.open();
    assert.deepEqual(
      await failing,
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );
    await delay(10);

    assert.ok(
      globalThis[TERMINATED_SESSIONS_KEY]?.has("ses_child_win"),
      "a release resuming after a confirmed deletion must not erase its marker",
    );
    assert.deepEqual(
      promptCalls.map((call) => call.text.match(/Cause: provider: (.+)$/)?.[1]),
      ["first attempt"],
      "the deletion is confirmed, so the events it was holding are the shutdown's and are dropped",
    );

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_win" } });
    await delay(10);
    assert.equal(promptCalls.length, 1, "the deleted session must stay suppressed");
    assert.equal(
      globalThis[TERMINATED_SESSIONS_KEY]?.get("ses_child_win")?.deferred.length,
      0,
      "a confirmed marker must discard late events, not accumulate them forever",
    );
  });

  test("a confirmed deletion drops its held reports without waiting for a stalled peer", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_stall", { id: "ses_spawner_stall" });
    sessions.set("ses_child_stall", { id: "ses_child_stall" });
    recordSpawn("ses_child_stall", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_stall",
    });

    let openStalled;
    const stalled = new Promise((resolve) => (openStalled = resolve));

    let attempt = 0;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          attempt += 1;
          if (attempt === 1) {
            pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_stall" } });
            await delay(20); // let the listener hold it before this attempt settles
            return { status: 204, body: undefined };
          }
          await stalled;
          return { status: 500, body: undefined };
        },
      }),
    );

    const succeeding = tool_execute(tools, "ses_child_stall");
    const stalling = tool_execute(tools, "ses_child_stall");

    assert.deepEqual(await succeeding, toToolResult({ terminated: true }));

    const entry = globalThis[TERMINATED_SESSIONS_KEY]?.get("ses_child_stall");
    assert.ok(entry, "the confirmed marker must outlive the peer still in flight");
    assert.equal(entry.confirmed, true);
    assert.equal(
      entry.deferred.length,
      0,
      "a report the confirmed deletion discards must not be stranded until the peer settles",
    );

    openStalled();
    assert.deepEqual(
      await stalling,
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );
  });

  test("a second failed release cannot overtake the release already draining", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_two", { id: "ses_spawner_two" });
    sessions.set("ses_child_two", { id: "ses_child_two" });
    recordSpawn("ses_child_two", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_two",
    });

    const gate = () => {
      let open;
      return { opened: new Promise((resolve) => (open = resolve)), open: () => open() };
    };
    const firstReport = gate();

    // Completion order, not call order, is what a second releaser corrupts.
    const started = [];
    const finished = [];
    ctx.session.prompt = async (args) => {
      const cause = args.text.match(/Cause: provider: (.+)$/)?.[1];
      started.push(cause);
      if (started.length === 1) {
        await firstReport.opened;
      }
      finished.push(cause);
      return args;
    };

    let attempt = 0;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          attempt += 1;
          pushEvent({
            type: "session.execution.failed",
            data: { sessionID: "ses_child_two" },
            properties: { error: { type: "provider", message: `attempt ${attempt}` } },
          });
          await delay(10);
          return { status: 500, body: undefined };
        },
      }),
    );

    const first = tool_execute(tools, "ses_child_two");
    await delay(30); // the first release is blocked inside its report
    const second = tool_execute(tools, "ses_child_two");
    await delay(30); // its own failure would start a competing release

    firstReport.open();
    await first;
    await second;
    await delay(20);

    assert.deepEqual(
      finished,
      ["attempt 1", "attempt 2"],
      "a competing release must not report past the one already draining",
    );
  });

  test("a termination beginning during a release keeps its own state and suppression", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_adopt", { id: "ses_spawner_adopt" });
    sessions.set("ses_child_adopt", { id: "ses_child_adopt" });
    recordSpawn("ses_child_adopt", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_adopt",
    });

    const gate = () => {
      let open;
      return { opened: new Promise((resolve) => (open = resolve)), open: () => open() };
    };
    const firstReport = gate();
    const secondDelete = gate();

    // The first attempt's released report blocks here, holding the release
    // open while the second termination begins.
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      if (promptCalls.length === 1) {
        await firstReport.opened;
      }
      return args;
    };

    let attempt = 0;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          attempt += 1;
          if (attempt === 1) {
            pushEvent({
              type: "session.execution.failed",
              data: { sessionID: "ses_child_adopt" },
              properties: { error: { type: "provider", message: "first attempt" } },
            });
            await delay(10);
            return { status: 500, body: undefined };
          }
          pushEvent({
            type: "session.execution.failed",
            data: { sessionID: "ses_child_adopt" },
            properties: { error: { type: "provider", message: "second attempt" } },
          });
          await secondDelete.opened;
          return { status: 204, body: undefined };
        },
      }),
    );

    const tool = tools.get("rp_terminate");
    const failing = tool.execute({ session: "ses_child_adopt" }, { sessionID: "ses_owner" });
    await delay(30); // reach the blocked report inside the first release
    const succeeding = tool.execute({ session: "ses_child_adopt" }, { sessionID: "ses_owner" });
    await delay(30); // the second attempt's event is admitted mid-release

    firstReport.open();
    assert.deepEqual(
      await failing,
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );

    secondDelete.open();
    assert.deepEqual(await succeeding, toToolResult({ terminated: true }));
    await delay(10);

    assert.deepEqual(
      promptCalls.map((call) => call.text.match(/Cause: provider: (.+)$/)?.[1]),
      ["first attempt"],
      "the stale release must not drain an event whose termination had not settled",
    );
    assert.ok(
      globalThis[TERMINATED_SESSIONS_KEY]?.has("ses_child_adopt"),
      "the successful termination's marker must survive the earlier release",
    );

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_adopt" } });
    await delay(10);
    assert.equal(promptCalls.length, 1, "a deleted session must stay suppressed afterwards");
  });

  test("a failing released report does not mask the transport error rp_terminate raises", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_mask", { id: "ses_spawner_mask" });
    sessions.set("ses_child_mask", { id: "ses_child_mask" });
    recordSpawn("ses_child_mask", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_mask",
    });

    ctx.session.prompt = async () => {
      throw new Error("spawner prompt failed");
    };

    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          if (init.method !== "DELETE") {
            return { status: 200, body: undefined };
          }
          pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_mask" } });
          await delay(10);
          throw new Error("socket hang up");
        },
      }),
    );

    await assert.rejects(
      () => tools.get("rp_terminate").execute({ session: "ses_child_mask" }, { sessionID: "ses_owner" }),
      /socket hang up/,
      "the caller must see why the delete failed, not why a report did",
    );
  });

  test("a failing attempt does not withdraw the suppression a concurrent successful one needs", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_race", { id: "ses_spawner_race" });
    sessions.set("ses_child_race", { id: "ses_child_race" });
    recordSpawn("ses_child_race", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_race",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    // Two gates make the interleaving deterministic rather than timing-based:
    // the call that introduces the marker fails first, and the concurrent
    // follower's delete is still in flight when its event arrives.
    const gate = () => {
      let open;
      return { opened: new Promise((resolve) => (open = resolve)), open: () => open() };
    };
    const first = gate();
    const second = gate();
    let attempt = 0;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async () => {
          attempt += 1;
          if (attempt === 1) {
            await first.opened;
            return { status: 500, body: undefined };
          }
          await second.opened;
          return { status: 204, body: undefined };
        },
      }),
    );

    const tool = tools.get("rp_terminate");
    const introducer = tool.execute({ session: "ses_child_race" }, { sessionID: "ses_owner" });
    const follower = tool.execute({ session: "ses_child_race" }, { sessionID: "ses_owner" });
    await delay(5); // both attempts in flight

    first.open();
    assert.deepEqual(
      await introducer,
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );

    // The follower's delete is still in flight, so its delete-associated
    // failure must still be suppressed even though the introducer withdrew.
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_race" } });
    await delay(10);
    assert.deepEqual(
      promptCalls,
      [],
      "a failed attempt must not expose the session a concurrent attempt is still deleting",
    );

    second.open();
    assert.deepEqual(await follower, toToolResult({ terminated: true }));
  });

  test("a first-call 404 leaves no marker behind", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, sessions } = fakeCtx;
    sessions.set("ses_spawner_404", { id: "ses_spawner_404" });

    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async () => ({ status: 404, body: undefined }),
      }),
    );

    assert.deepEqual(
      await tools.get("rp_terminate").execute({ session: "ses_never_existed" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 404, error: "SessionNotFoundError" }),
    );
    assert.equal(
      globalThis[TERMINATED_SESSIONS_KEY]?.has("ses_never_existed") ?? false,
      false,
      "a delete that terminated nothing must not leave a permanent marker",
    );
  });

  test("a failed termination leaves the session announcing its failures", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, tools, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_alive", { id: "ses_spawner_alive" });
    sessions.set("ses_child_alive", { id: "ses_child_alive" });
    recordSpawn("ses_child_alive", {
      name: "worker",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_spawner_alive",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async () => ({ status: 500, body: undefined }),
      }),
    );

    assert.deepEqual(
      await tools.get("rp_terminate").execute({ session: "ses_child_alive" }, { sessionID: "ses_owner" }),
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );

    // The session survived the failed delete, so a later genuine failure is
    // still the spawner's business.
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_alive" } });
    await delay(10);

    assert.equal(promptCalls.length, 1);
    assert.equal(promptCalls[0].sessionID, "ses_spawner_alive");
    assert.match(promptCalls[0].text, /worker \(ses_child_alive\) failed a turn/);
  });

  test("an interrupted turn is neither announced nor logged, and the session is left as it is", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_int", { id: "ses_spawner_int" });
    sessions.set("ses_child_int", { id: "ses_child_int" });
    recordSpawn("ses_child_int", {
      name: "worker-interrupted",
      pipelineSlug: "276-activity-reporting",
      spawner: "ses_spawner_int",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };
    const requests = [];
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          requests.push({ url, init });
          return { status: 204, body: undefined };
        },
      }),
    );

    pushEvent({ type: "session.execution.interrupted", data: { sessionID: "ses_child_int" } });
    await delay(10);

    assert.deepEqual(requests, []);
    assert.equal(promptCalls.length, 0, "an interrupt is a deliberate stop, not a failure to announce");
    assert.deepEqual(globalThis[ERROR_LOG_KEY], []);
    assert.equal(turnsFor("ses_child_int").lastTurn.outcome, "interrupted");
  });

  test("a failed turn of an agent spawned before a restart is announced to the spawner its stored record names", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent } = fakeCtx;
    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };
    const reads = [];
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        resolveRepoRootFn: () => "/repo",
        requestFn: async (url) => {
          reads.push(url.pathname);
          return {
            status: 200,
            body: {
              data: {
                id: "ses_child_survivor",
                title: "An automatic title",
                metadata: { rp: { name: "worker-survivor", pipelineSlug: "restart-run", spawner: "ses_spawner_survivor" } },
                location: { directory: "/repo/.worktrees/w" },
              },
            },
          };
        },
      }),
    );

    for (let turn = 0; turn < 2; turn++) {
      pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_survivor" } });
      await delay(10);
    }

    assert.deepEqual(reads, ["/api/session/ses_child_survivor"], "the stored record is read once");
    assert.equal(promptCalls.length, 2);
    assert.equal(promptCalls[0].sessionID, "ses_spawner_survivor");
    assert.match(promptCalls[0].text, /worker-survivor \(ses_child_survivor\) failed a turn/);
    assert.deepEqual(lookupSpawn("ses_child_survivor"), {
      name: "worker-survivor",
      pipelineSlug: "restart-run",
      spawner: "ses_spawner_survivor",
      directory: "/repo/.worktrees/w",
      repoRoot: "/repo",
    });
  });

  test("a successful terminal event does not enter the recent-errors log", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_success_log", { id: "ses_spawner_success_log" });
    sessions.set("ses_child_success_log", { id: "ses_child_success_log" });
    recordSpawn("ses_child_success_log", {
      name: "worker-success-log",
      pipelineSlug: "247-observable-health-loops",
      spawner: "ses_spawner_success_log",
    });

    await setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));
    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_success_log" } });
    await delay(10);

    assert.deepEqual(globalThis[ERROR_LOG_KEY], []);
  });

  test("a failed event's structured error reaches both the spawner notification and the error log", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_cause", { id: "ses_spawner_cause" });
    sessions.set("ses_child_cause", { id: "ses_child_cause" });
    recordSpawn("ses_child_cause", {
      name: "worker-cause",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_spawner_cause",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    await setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    const structuredError = {
      type: "provider.auth",
      message: "Invalid API key",
    };
    pushEvent({
      type: "session.execution.failed",
      data: { sessionID: "ses_child_cause", error: structuredError },
    });
    await delay(10);

    assert.equal(promptCalls.length, 1);
    assert.match(
      promptCalls[0].text,
      /provider\.auth/,
      `expected the error type in the text, got: ${promptCalls[0].text}`,
    );
    assert.match(
      promptCalls[0].text,
      /Invalid API key/,
      `expected the error message in the text, got: ${promptCalls[0].text}`,
    );

    const logged = globalThis[ERROR_LOG_KEY].find(
      (entry) => entry.sessionID === "ses_child_cause",
    );
    assert.ok(logged, "expected an error-log entry for the failed child");
    assert.deepEqual(logged.error, structuredError);
  });

  test("terminalEventSessionID reads the session ID from the event's data (the shape opencode's terminal events actually carry)", () => {
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", data: { sessionID: "ses_x" } }),
      "ses_x",
    );
  });

  test("terminalEventSessionID also accepts a properties-carried or durable-aggregate-carried session ID", () => {
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", properties: { sessionID: "ses_x" } }),
      "ses_x",
    );
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", durable: { aggregateID: "ses_x" } }),
      "ses_x",
    );
  });

  test("terminalEventError reads the structured error from the event's data or properties, and tolerates its absence", () => {
    const error = { type: "provider.auth", message: "HTTP 401" };
    assert.deepEqual(
      terminalEventError({ type: "session.execution.failed", data: { sessionID: "ses_x", error } }),
      error,
    );
    assert.deepEqual(
      terminalEventError({ type: "session.execution.failed", properties: { sessionID: "ses_x", error } }),
      error,
    );
    assert.equal(
      terminalEventError({ type: "session.execution.failed", data: { sessionID: "ses_x" } }),
      undefined,
    );
  });

  test("formatStructuredError renders type and message, a lone field, a bare string, and an unrecognized shape", () => {
    assert.equal(
      formatStructuredError({ type: "provider.auth", message: "HTTP 401" }),
      "provider.auth: HTTP 401",
    );
    assert.equal(formatStructuredError({ message: "HTTP 401" }), "HTTP 401");
    assert.equal(formatStructuredError("boom"), "boom");
    assert.equal(formatStructuredError({ code: 7 }), '{"code":7}');
  });
});
