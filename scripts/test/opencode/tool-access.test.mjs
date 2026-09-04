import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  guardTool,
  recordSessionParent,
  recordSpawn,
  resolveToolAccess,
} from "../../../opencode/plugin.mjs";

/** Build a tool descriptor that records every call it is allowed to make. */
function spyTool(name) {
  const calls = [];
  return {
    calls,
    tool: {
      name,
      description: `${name} description`,
      input: { type: "object", properties: {} },
      async execute(input, toolCtx) {
        calls.push({ input, sessionID: toolCtx.sessionID });
        return { output: "ran", content: [{ type: "text", text: "ran" }] };
      },
    },
  };
}

describe("recordSessionParent / resolveToolAccess", () => {
  test("a session created with a parent is a subagent and reaches no RP tool", () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_child", parentID: "ses_access_worker" },
    });

    assert.equal(resolveToolAccess("ses_access_child"), "none");
  });

  test("a session created without a parent is not a subagent", () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_rootlevel" },
    });

    assert.equal(resolveToolAccess("ses_access_rootlevel"), "full");
  });

  test("a spawned agent is limited to sending", () => {
    recordSpawn("ses_access_agent", {
      name: "build-worker-tdd 1",
      run: "144-opencode-support",
      spawner: "ses_access_orchestrator",
    });

    assert.equal(resolveToolAccess("ses_access_agent"), "send-only");
  });

  test("a session nothing spawned and nothing parented — the orchestrator, the owner — reaches everything", () => {
    assert.equal(resolveToolAccess("ses_access_unknown"), "full");
  });

  test("parentage is read only from session.created, and only when a parent is named", () => {
    recordSessionParent({
      type: "session.updated",
      data: { sessionID: "ses_access_other_event", parentID: "ses_access_worker" },
    });
    recordSessionParent({ type: "session.created", data: {} });
    recordSessionParent(undefined);

    assert.equal(resolveToolAccess("ses_access_other_event"), "full");
  });

  test("a subagent of a spawned agent stays a subagent: parentage outranks the ledger", () => {
    recordSpawn("ses_access_both", {
      name: "build-worker-tdd 2",
      run: "144-opencode-support",
      spawner: "ses_access_orchestrator",
    });
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_both", parentID: "ses_access_worker" },
    });

    assert.equal(resolveToolAccess("ses_access_both"), "none");
  });
});

describe("guardTool", () => {
  test("a subagent is refused every tool, and the effect never runs", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_guard_child", parentID: "ses_guard_worker" },
    });

    for (const name of ["rp_send", "rp_spawn", "rp_status", "rp_loop_list"]) {
      const { tool, calls } = spyTool(name);
      const result = await guardTool(tool).execute({}, { sessionID: "ses_guard_child" });

      assert.equal(result.output.status, 403);
      assert.equal(result.output.error, "SubagentNotPermitted");
      assert.match(result.output.message, /delegated this task/);
      assert.deepEqual(calls, []);
    }
  });

  test("a spawned agent reaches rp_send and nothing else", async () => {
    recordSpawn("ses_guard_agent", {
      name: "build-worker-tdd 3",
      run: "144-opencode-support",
      spawner: "ses_guard_orchestrator",
    });

    const send = spyTool("rp_send");
    const sent = await guardTool(send.tool).execute({ to: "x" }, { sessionID: "ses_guard_agent" });
    assert.equal(sent.output, "ran");
    assert.deepEqual(send.calls, [{ input: { to: "x" }, sessionID: "ses_guard_agent" }]);

    const spawn = spyTool("rp_spawn");
    const refused = await guardTool(spawn.tool).execute({}, { sessionID: "ses_guard_agent" });
    assert.equal(refused.output.status, 403);
    assert.equal(refused.output.error, "AgentNotPermitted");
    assert.match(refused.output.message, /rp_send/);
    assert.deepEqual(spawn.calls, []);
  });

  test("an unspawned, unparented session reaches every tool", async () => {
    for (const name of ["rp_send", "rp_spawn", "rp_status", "rp_terminate"]) {
      const { tool, calls } = spyTool(name);
      const result = await guardTool(tool).execute({ a: 1 }, { sessionID: "ses_guard_orchestrator_2" });

      assert.equal(result.output, "ran");
      assert.equal(calls.length, 1);
    }
  });

  test("the wrapper preserves the descriptor opencode registers", () => {
    const { tool } = spyTool("rp_status");
    const guarded = guardTool(tool);

    assert.equal(guarded.name, tool.name);
    assert.equal(guarded.description, tool.description);
    assert.deepEqual(guarded.input, tool.input);
  });
});
