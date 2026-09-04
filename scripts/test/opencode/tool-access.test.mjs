import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  guardTool,
  readSessionParentage,
  recordSessionParent,
  recordSpawn,
  resolveToolAccess,
} from "../../../opencode/plugin.mjs";

/** A `readParentage` that fails the test if the boundary consults it. */
const neverAsked = {
  readParentage: () => {
    throw new Error("parentage was already observed; it must not be read again");
  },
};

/** A `readParentage` that answers, and counts how often it was asked. */
function asks(answer) {
  const calls = [];
  return {
    calls,
    deps: {
      readParentage: async (sessionID) => {
        calls.push(sessionID);
        return answer;
      },
    },
  };
}

/** Build a tool descriptor that records every call it is allowed to make. */
function spyTool(name) {
  const calls = [];
  return {
    calls,
    tool: {
      name,
      description: `${name} description`,
      input: { type: "object", properties: {} },
      output: { type: "object" },
      options: { permission: "rp" },
      async execute(input, toolCtx) {
        calls.push({ input, sessionID: toolCtx.sessionID });
        return { output: "ran", content: [{ type: "text", text: "ran" }] };
      },
    },
  };
}

describe("recordSessionParent / resolveToolAccess", () => {
  test("a session created with a parent is a subagent and reaches no RP tool", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_child", parentID: "ses_access_worker" },
    });

    assert.equal(await resolveToolAccess("ses_access_child", neverAsked), "none");
  });

  test("a session created without a parent is a root session, and is never asked about again", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_rootlevel" },
    });

    assert.equal(await resolveToolAccess("ses_access_rootlevel", neverAsked), "full");
  });

  test("a spawned agent is limited to sending", async () => {
    recordSpawn("ses_access_agent", {
      name: "build-worker-tdd 1",
      run: "144-opencode-support",
      spawner: "ses_access_orchestrator",
    });
    recordSessionParent({ type: "session.created", data: { sessionID: "ses_access_agent" } });

    assert.equal(await resolveToolAccess("ses_access_agent", neverAsked), "send-only");
  });

  test("parentage is read only from session.created", async () => {
    recordSessionParent({
      type: "session.updated",
      data: { sessionID: "ses_access_other_event", parentID: "ses_access_worker" },
    });
    recordSessionParent({ type: "session.created", data: {} });
    recordSessionParent(undefined);

    const asked = asks(false);
    assert.equal(await resolveToolAccess("ses_access_other_event", asked.deps), "full");
    assert.deepEqual(asked.calls, ["ses_access_other_event"]);
  });

  test("a subagent of a spawned agent stays a subagent: parentage outranks the ledger", async () => {
    recordSpawn("ses_access_both", {
      name: "build-worker-tdd 2",
      run: "144-opencode-support",
      spawner: "ses_access_orchestrator",
    });
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_access_both", parentID: "ses_access_worker" },
    });

    assert.equal(await resolveToolAccess("ses_access_both", neverAsked), "none");
  });

  test("a session whose creation event was missed is asked about rather than assumed unparented", async () => {
    const asked = asks(true);

    assert.equal(await resolveToolAccess("ses_access_missed", asked.deps), "none");
    assert.deepEqual(asked.calls, ["ses_access_missed"]);
  });

  test("the answer is remembered, so a session is asked about at most once", async () => {
    const asked = asks(true);

    await resolveToolAccess("ses_access_asked_once", asked.deps);
    await resolveToolAccess("ses_access_asked_once", asked.deps);
    await resolveToolAccess("ses_access_asked_once", asked.deps);

    assert.deepEqual(asked.calls, ["ses_access_asked_once"]);
  });

  test("an unanswerable question leaves the caller a root session, and is retried next call", async () => {
    const asked = asks(undefined);

    assert.equal(await resolveToolAccess("ses_access_unreadable", asked.deps), "full");
    assert.equal(await resolveToolAccess("ses_access_unreadable", asked.deps), "full");
    assert.deepEqual(asked.calls, ["ses_access_unreadable", "ses_access_unreadable"]);
  });
});

describe("resolveToolAccess under concurrency and session lifetime", () => {
  test("concurrent first calls share one read rather than issuing one each", async () => {
    const calls = [];
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    const deps = {
      readParentage: async (sessionID) => {
        calls.push(sessionID);
        return held;
      },
    };

    const waiting = Promise.all(
      Array.from({ length: 25 }, () => resolveToolAccess("ses_race_shared", deps)),
    );
    release(true);

    assert.deepEqual(await waiting, Array.from({ length: 25 }, () => "none"));
    assert.deepEqual(calls, ["ses_race_shared"], "one cold session must cost one read");
  });

  test("every concurrent caller reaches the same verdict, so none is left holding a weaker one", async () => {
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    const deps = { readParentage: async () => held };

    const waiting = Promise.all([
      resolveToolAccess("ses_race_agreement", deps),
      resolveToolAccess("ses_race_agreement", deps),
      resolveToolAccess("ses_race_agreement", deps),
    ]);
    release(true);

    assert.deepEqual(await waiting, ["none", "none", "none"]);
  });

  test("a creation event landing while a read is unanswered outranks the read", async () => {
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    const deps = { readParentage: async () => held };

    const pending = resolveToolAccess("ses_race_event", deps);
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_race_event", parentID: "ses_race_parent" },
    });
    release(undefined);

    assert.equal(await pending, "none", "the unreadable read must not overrule the event");
    assert.equal(await resolveToolAccess("ses_race_event", neverAsked), "none");
  });

  test("a deleted session is forgotten, so its ID answers for nothing later", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_lifetime_gone", parentID: "ses_lifetime_parent" },
    });
    assert.equal(await resolveToolAccess("ses_lifetime_gone", neverAsked), "none");

    recordSessionParent({ type: "session.deleted", data: { sessionID: "ses_lifetime_gone" } });

    const asked = asks(false);
    assert.equal(await resolveToolAccess("ses_lifetime_gone", asked.deps), "full");
    assert.deepEqual(asked.calls, ["ses_lifetime_gone"], "a forgotten session is asked about again");
  });
});

describe("readSessionParentage", () => {
  const server = { baseURL: "http://x", password: "y" };

  test("reports the parentage the stored session carries", async () => {
    assert.equal(
      await readSessionParentage(server, "ses_read_child", async () => ({
        status: 200,
        body: { data: { id: "ses_read_child", parentID: "ses_read_parent" } },
      })),
      true,
    );

    assert.equal(
      await readSessionParentage(server, "ses_read_root", async () => ({
        status: 200,
        body: { data: { id: "ses_read_root" } },
      })),
      false,
    );
  });

  test("a non-2xx read throws, carrying its status", async () => {
    await assert.rejects(
      readSessionParentage(server, "ses_read_gone", async () => ({ status: 404, body: undefined })),
      (error) => error.status === 404,
    );
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
      const result = await guardTool(tool, neverAsked).execute({}, { sessionID: "ses_guard_child" });

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
    recordSessionParent({ type: "session.created", data: { sessionID: "ses_guard_agent" } });

    const send = spyTool("rp_send");
    const sent = await guardTool(send.tool, neverAsked).execute({ to: "x" }, { sessionID: "ses_guard_agent" });
    assert.equal(sent.output, "ran");
    assert.deepEqual(send.calls, [{ input: { to: "x" }, sessionID: "ses_guard_agent" }]);

    const spawn = spyTool("rp_spawn");
    const refused = await guardTool(spawn.tool, neverAsked).execute({}, { sessionID: "ses_guard_agent" });
    assert.equal(refused.output.status, 403);
    assert.equal(refused.output.error, "AgentNotPermitted");
    assert.match(refused.output.message, /rp_send/);
    assert.deepEqual(spawn.calls, []);
  });

  test("an unspawned, unparented session reaches every tool", async () => {
    recordSessionParent({ type: "session.created", data: { sessionID: "ses_guard_owner" } });

    for (const name of ["rp_send", "rp_spawn", "rp_status", "rp_terminate"]) {
      const { tool, calls } = spyTool(name);
      const result = await guardTool(tool, neverAsked).execute({ a: 1 }, { sessionID: "ses_guard_owner" });

      assert.equal(result.output, "ran");
      assert.equal(calls.length, 1);
    }
  });

  test("the wrapper preserves every field of the descriptor opencode registers", () => {
    const { tool } = spyTool("rp_status");
    const guarded = guardTool(tool, neverAsked);

    assert.equal(guarded.name, tool.name);
    assert.equal(guarded.description, tool.description);
    assert.deepEqual(guarded.input, tool.input);
    assert.deepEqual(guarded.output, tool.output);
    assert.deepEqual(guarded.options, tool.options);
  });
});

describe("parentage retention", () => {
  test("retention is bounded, and an evicted session is asked about again rather than assumed", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_evicted_first", parentID: "ses_evicted_parent" },
    });
    assert.equal(await resolveToolAccess("ses_evicted_first", neverAsked), "none");

    for (let index = 0; index <= 4096; index++) {
      recordSessionParent({ type: "session.created", data: { sessionID: `ses_overflow_${index}` } });
    }

    assert.equal(
      await resolveToolAccess("ses_evicted_first", neverAsked),
      "none",
      "a subagent must survive the cap: evicting one and then failing to read its replacement grants it everything",
    );

    const asked = asks(false);
    assert.equal(await resolveToolAccess("ses_overflow_0", asked.deps), "full");
    assert.deepEqual(asked.calls, ["ses_overflow_0"], "root entries are the evictable ones");
  });

  test("a subagent survives the cap even when the replacement read is unanswerable", async () => {
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_evicted_child", parentID: "ses_evicted_parent" },
    });
    for (let index = 0; index <= 4096; index++) {
      recordSessionParent({ type: "session.created", data: { sessionID: `ses_flood_${index}` } });
    }

    assert.equal(await resolveToolAccess("ses_evicted_child", asks(undefined).deps), "none");
  });

  test("a deletion discards the answer of a read already in flight for it", async () => {
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });

    const pending = resolveToolAccess("ses_deleted_midread", { readParentage: async () => held });
    recordSessionParent({ type: "session.deleted", data: { sessionID: "ses_deleted_midread" } });
    release(false);
    await pending;

    const asked = asks(true);
    assert.equal(await resolveToolAccess("ses_deleted_midread", asked.deps), "none");
    assert.deepEqual(
      asked.calls,
      ["ses_deleted_midread"],
      "the stale read must not have been remembered for the deleted session",
    );
  });

  test("a read invalidated by a deletion still answers the caller holding it, rather than widening to full", async () => {
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });

    const pending = resolveToolAccess("ses_deleted_verdict", { readParentage: async () => held });
    recordSessionParent({ type: "session.deleted", data: { sessionID: "ses_deleted_verdict" } });
    // A later caller re-creates the pending slot, so the first read is no
    // longer the tracked one when it settles.
    void resolveToolAccess("ses_deleted_verdict", { readParentage: () => new Promise(() => {}) });
    release(true);

    assert.equal(await pending, "none");
  });
});
