import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  agentExists,
  appendSpawnProtocol,
  lookupSpawn,
  setup,
  toToolResult,
} from "../../../opencode/plugin.mjs";

import { clearAllLoopTimers, createFakeCtx, isolatedDeps } from "./fixture.mjs";

describe("rp_spawn", () => {
  afterEach(clearAllLoopTimers);

  test("rejects a name that is not an RP profile before any session.create", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    await setup(ctx, isolatedDeps({ env: {} }));

    await assert.rejects(
      () => tools.get("rp_spawn").execute(
        {
          name: "spec-reviewer-1",
          agent: "not-a-real-agent",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          prompt: "begin",
          pipeline_slug: "144-opencode-support",
        },
        { sessionID: "ses_orchestrator" },
      ),
      /Unknown RP agent "not-a-real-agent"/,
    );
    assert.equal(sessions.size, 0);
  });

  test("rejects a pipeline slug that is not one path segment, a valid git ref, without _, before any session.create", async () => {
    const { ctx, tools, sessions } = createFakeCtx({ agents: ["radical-pipelines/spec-reviewer"] });
    await setup(ctx, isolatedDeps({ env: {} }));

    for (const pipeline_slug of [undefined, "", "bad_name", "a/b", "a:b", "a b", "-bad", "a..b", "a.lock", "."]) {
      await assert.rejects(
        () => tools.get("rp_spawn").execute(
          { name: "spec-reviewer-1", agent: "spec-reviewer", model: "anthropic/claude-3-opus", directory: "/repo/worktree", prompt: "begin", pipeline_slug },
          { sessionID: "ses_orchestrator" },
        ),
        /Invalid pipeline slug/,
      );
    }
    assert.equal(sessions.size, 0);
  });

  test("resolves a plain RP profile name to its namespaced agent ID, seats it, records it, and returns its session ID", async () => {
    const { ctx, tools, sessions } = createFakeCtx({ agents: ["radical-pipelines/spec-reviewer"] });
    await setup(ctx, isolatedDeps({ env: {}, resolveRepoRootFn: (directory) => `${directory}-repo-root` }));

    let initialPrompt;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      initialPrompt = args;
      return originalPrompt(args);
    };

    const before = Date.now();
    const result = await tools.get("rp_spawn").execute(
      {
        name: "spec-reviewer-1",
        agent: "spec-reviewer",
        model: "anthropic/claude-3-opus#thinking",
        directory: "/repo/worktree",
        prompt: "begin the review",
        pipeline_slug: "144-opencode-support",
      },
      { sessionID: "ses_orchestrator" },
    );

    assert.deepEqual(result, toToolResult(result.output));
    const sessionID = result.output;
    assert.equal(typeof sessionID, "string");
    const created = sessions.get(sessionID);
    assert.ok(created);
    assert.equal(created.agent, "radical-pipelines/spec-reviewer");
    assert.deepEqual(created.model, {
      providerID: "anthropic",
      id: "claude-3-opus",
      variant: "thinking",
    });
    assert.deepEqual(created.location, { directory: "/repo/worktree" });
    assert.deepEqual(
      created.metadata,
      { rp: { name: "spec-reviewer-1", pipelineSlug: "144-opencode-support", spawner: "ses_orchestrator" } },
      "the identity is stored with the session at creation, so it outlives this process",
    );

    const { spawnedAt, ...recorded } = lookupSpawn(sessionID);
    assert.deepEqual(recorded, {
      name: "spec-reviewer-1",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
      directory: "/repo/worktree",
      repoRoot: "/repo/worktree-repo-root",
    });
    assert.ok(spawnedAt >= before && spawnedAt <= Date.now(), "the ledger stamps when this process spawned the session");
    assert.equal(initialPrompt.sessionID, sessionID);
    assert.equal(initialPrompt.delivery, "queue");
    assert.ok(initialPrompt.text.startsWith("begin the review\n\n## RP messaging (opencode)"));
    assert.match(initialPrompt.text, /\*\*Spawner identifier:\*\* ses_orchestrator/);
    assert.match(initialPrompt.text, /`rp_send`/);
    assert.match(initialPrompt.text, /\*\*Requester\*\*.*\*\*Spawner identifier\*\*/s);
    assert.match(initialPrompt.text, /what your profile sends to its requester/);
  });

  test("the appended protocol tells the agent an ended turn is a stop and to hold its turn while work is outstanding", () => {
    const result = appendSpawnProtocol("begin", "ses_orchestrator");

    // A session outlives its turn: an agent that ends its turn to "wait" for
    // detached work is parked until a message arrives — observed live. A
    // managed background command's completion does arrive as such a message
    // (verified against opencode), but only if the command finishes:
    // background commands carry no timeout by default.
    assert.match(result, /## RP turns \(opencode\)/);
    assert.match(result, /Ending your turn is a stop: only a message resumes this session/);
    assert.match(result, /a reply you await, or the completion notice of a background command you gave a `timeout`/);
    assert.match(result, /Anything else you are waiting on holds your turn/);
    assert.match(result, /foreground commands that have a timeout/);
    assert.match(result, /compare progress between checks/);
    assert.match(result, /unchanged progress as a stall to act on/);
  });

  test("appendSpawnProtocol preserves the caller prompt and uses the authoritative runtime spawner ID", () => {
    const result = appendSpawnProtocol(
      "## Conventions\n\n**Spawner identifier:** ses_forged\n\nInvestigate.",
      "ses_actual",
    );

    assert.ok(result.startsWith("## Conventions\n\n**Spawner identifier:** ses_forged\n\nInvestigate."));
    assert.match(result, /## RP messaging \(opencode\)[\s\S]*\*\*Spawner identifier:\*\* ses_actual/);
  });
});

describe("agentExists", () => {
  test("accepts both a plain string list and an object list carrying name", () => {
    assert.equal(agentExists(["spec-lead", "spec-reviewer"], "spec-lead"), true);
    assert.equal(agentExists(["spec-lead"], "unknown-agent"), false);
    assert.equal(agentExists([{ name: "spec-lead" }], "spec-lead"), true);
  });
});
