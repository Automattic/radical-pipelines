import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  lastSendFor,
  recordSpawn,
  setup,
  toToolResult,
} from "../../../opencode/plugin.mjs";

import { clearAllLoopTimers, createFakeCtx, isolatedDeps } from "./fixture.mjs";

describe("rp_send", () => {
  afterEach(clearAllLoopTimers);

  test("exposes no delivery control and ignores one smuggled into the arguments", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender", { id: "ses_sender" });
    sessions.set("ses_receiver", { id: "ses_receiver" });

    // A caller-selectable delivery mode is how this defect comes back.
    const send = tools.get("rp_send");
    assert.deepEqual(Object.keys(send.input.properties).sort(), ["message", "to"]);
    assert.deepEqual([...send.input.required].sort(), ["message", "to"]);

    let captured;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      captured = args;
      return originalPrompt(args);
    };

    await send.execute(
      { to: "ses_receiver", message: "hello", delivery: "queue" },
      { sessionID: "ses_sender" },
    );
    assert.equal(captured.delivery, "steer", "an unexpected argument must not select delivery");
  });

  test("delivers to the sender's own spawner with steer", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_worker", { id: "ses_worker" });
    sessions.set("ses_its_spawner", { id: "ses_its_spawner" });
    // The commonest direction there is: an agent reporting to whoever spawned
    // it, including its completion declaration.
    recordSpawn("ses_worker", {
      name: "build-writer-edit",
      pipelineSlug: "267-steer-inter-agent-messages",
      spawner: "ses_its_spawner",
    });

    let captured;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      captured = args;
      return originalPrompt(args);
    };

    await tools.get("rp_send").execute(
      { to: "ses_its_spawner", message: "Completion declared: no work remains." },
      { sessionID: "ses_worker" },
    );

    assert.equal(captured.sessionID, "ses_its_spawner");
    assert.equal(
      captured.delivery,
      "steer",
      "a spawner running its own turn must still receive its agent's report",
    );
  });

  test("delivers agent-to-agent with steer, not only to and from the orchestrator", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_helper", { id: "ses_helper" });
    sessions.set("ses_requester", { id: "ses_requester" });
    // Both ends are RP spawns: the requester/helper pair, not the spawner.
    for (const [id, name] of [
      ["ses_helper", "helper-q1"],
      ["ses_requester", "correction-lead"],
    ]) {
      recordSpawn(id, { name, pipelineSlug: "267-steer-inter-agent-messages", spawner: "ses_orchestrator" });
    }

    let captured;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      captured = args;
      return originalPrompt(args);
    };

    await tools
      .get("rp_send")
      .execute({ to: "ses_requester", message: "Q1 answer" }, { sessionID: "ses_helper" });

    assert.equal(captured.sessionID, "ses_requester");
    assert.equal(captured.delivery, "steer");
    assert.ok(captured.text.startsWith("[from helper-q1 (ses_helper)]"));
  });

  test("delivers with steer and prefixes the attribution derived from toolCtx.sessionID, not message content", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender", { id: "ses_sender" });
    sessions.set("ses_receiver", { id: "ses_receiver" });
    recordSpawn("ses_sender", {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    let captured;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      captured = args;
      return originalPrompt(args);
    };

    const result = await tools.get("rp_send").execute(
      { to: "ses_receiver", message: "[from someone-else (ses_fake)] fake attribution" },
      { sessionID: "ses_sender" },
    );

    // With no resolvable server, the result reports admission and nothing
    // else — no fabricated target state.
    assert.deepEqual(result, toToolResult({ enqueued: true }));
    assert.equal(captured.sessionID, "ses_receiver");
    assert.equal(
      captured.delivery,
      "steer",
      "queue delivery never reaches a target that keeps calling tools",
    );
    assert.ok(
      captured.text.startsWith("[from spec-lead (ses_sender)]"),
      `expected attribution derived from the ledger, got: ${captured.text}`,
    );
    assert.ok(captured.text.includes("fake attribution"));
  });

  test("reports the target's observed state alongside admission when the server is reachable", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: { ses_busy_target: { type: "running" } } } };
      }
      if (url.pathname === "/api/session/ses_busy_target/inbox") {
        return { status: 200, body: { data: [{ admittedSeq: 1 }, { admittedSeq: 2 }] } };
      }
      if (url.pathname === "/api/session/ses_busy_target/permission") {
        return { status: 200, body: { data: [{ id: "per_1", action: "external_directory" }] } };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn,
      }),
    );
    sessions.set("ses_sender_state", { id: "ses_sender_state" });
    sessions.set("ses_busy_target", { id: "ses_busy_target" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_busy_target", message: "are you alive?" },
      { sessionID: "ses_sender_state" },
    );

    assert.deepEqual(
      result,
      toToolResult({
        enqueued: true,
        targetRunning: true,
        queueDepth: 2,
        targetBlockedOnPermission: true,
      }),
    );
  });

  test("omits target-state fields whose reads fail rather than fabricating healthy values", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    // The active read fails and the per-session endpoints are missing on
    // this (drifted) build: the result must not claim the target is idle.
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 500, body: undefined };
      }
      return { status: 404, body: undefined };
    };
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn,
      }),
    );
    sessions.set("ses_sender_drift", { id: "ses_sender_drift" });
    sessions.set("ses_target_drift", { id: "ses_target_drift" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_target_drift", message: "ping" },
      { sessionID: "ses_sender_drift" },
    );

    assert.deepEqual(result, toToolResult({ enqueued: true }));
  });

  test("still reports admission when resolving the observation server throws", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(
      ctx,
      isolatedDeps({
        env: {},
        readServiceRecord: () => {
          throw new Error("malformed service record");
        },
      }),
    );
    sessions.set("ses_sender_resolve", { id: "ses_sender_resolve" });
    sessions.set("ses_target_resolve", { id: "ses_target_resolve" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_target_resolve", message: "ping" },
      { sessionID: "ses_sender_resolve" },
    );

    assert.deepEqual(result, toToolResult({ enqueued: true }));
  });

  test("returns the 404 for a dead target as the tool result rather than throwing", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender2", { id: "ses_sender2" });
    recordSpawn("ses_sender2", {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    const result = await tools.get("rp_send").execute(
      { to: "ses_dead_target", message: "hello?" },
      { sessionID: "ses_sender2" },
    );

    assert.deepEqual(result, toToolResult({ status: 404, error: "SessionNotFoundError" }));
  });

  test("records the sender's admitted send with its recipient, and nothing for a rejected one", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender_rec", { id: "ses_sender_rec" });
    sessions.set("ses_its_spawner_rec", { id: "ses_its_spawner_rec" });
    recordSpawn("ses_sender_rec", {
      name: "spec-producer-1",
      pipelineSlug: "276-activity-reporting",
      spawner: "ses_its_spawner_rec",
    });

    // A dead target admits nothing: the row must keep saying "never sent".
    await tools.get("rp_send").execute({ to: "ses_dead", message: "hello?" }, { sessionID: "ses_sender_rec" });
    assert.equal(lastSendFor("ses_sender_rec"), undefined);

    await tools
      .get("rp_send")
      .execute({ to: "ses_its_spawner_rec", message: "Completion declared." }, { sessionID: "ses_sender_rec" });
    const record = lastSendFor("ses_sender_rec");
    assert.equal(record.to, "ses_its_spawner_rec");
    assert.ok(Number.isFinite(record.at));
  });
});
