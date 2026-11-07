import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";

import plugin, { readPackageVersion, setup } from "../../../opencode/plugin.mjs";

import { createFakeCtx, freshDir, isolatedDeps } from "./fixture.mjs";

describe("default export", () => {
  test("is {id, setup} with id equal to radical-pipelines@<package.json version>", () => {
    assert.equal(typeof plugin.setup, "function");
    assert.equal(plugin.id, `radical-pipelines@${readPackageVersion()}`);
  });
});

describe("setup", () => {
  test("registers the packaged skill by reference to its SKILL.md", async () => {
    const { ctx, addedSkills } = createFakeCtx();

    await setup(ctx, isolatedDeps({ env: {} }));

    assert.deepEqual(
      addedSkills.map((skill) => skill.id),
      ["radical-pipelines"],
    );
    const [skill] = addedSkills;
    assert.equal(skill.name, "radical-pipelines");
    assert.ok(skill.path.endsWith(join("skills", "radical-pipelines", "SKILL.md")));
    assert.ok(skill.content.length > 0);
  });

  test("materializes every source profile into the target directory", async () => {
    const { ctx } = createFakeCtx();
    const agentsSourceDir = freshDir();
    const agentsTargetDir = freshDir();
    mkdirSync(agentsSourceDir, { recursive: true });
    writeFileSync(join(agentsSourceDir, "role.md"), "---\nname: role\ndescription: A role\n---\n\nBody.\n");

    await setup(ctx, { env: {}, agentsSourceDir, agentsTargetDir });

    assert.deepEqual(readdirSync(agentsTargetDir), ["role.md"]);
    assert.match(readFileSync(join(agentsTargetDir, "role.md"), "utf8"), /^mode: subagent$/m);
  });

  test("the registered context hook re-supplies the packaged skill to a session continuing from a checkpoint", async () => {
    globalThis[Symbol.for("radical-pipelines.opencode.skillActivations")]?.clear();
    const { ctx, hooks, addedSkills } = createFakeCtx();
    await setup(
      ctx,
      isolatedDeps({
        env: {},
        readServiceRecord: () => ({ url: "http://127.0.0.1:1", password: "pw" }),
        requestFn: async () => ({ status: 200, body: { data: [], cursor: { next: null } } }),
      }),
    );

    const loaded = {
      sessionID: "ses_wired_orchestrator",
      system: [],
      messages: [
        { role: "assistant", content: [{ type: "tool-call", id: "c1", name: "skill", input: { id: "radical-pipelines" } }] },
        { role: "tool", content: [{ type: "tool-result", id: "c1", name: "skill", result: { type: "text", value: "…" } }] },
      ],
    };
    await hooks.get("context")(loaded);
    assert.deepEqual(loaded.system, [], "nothing to re-supply while the activation is in the active context");

    const after = { sessionID: "ses_wired_orchestrator", system: [], messages: [] };
    await hooks.get("context")(after);
    const [block] = after.system;
    const skill = addedSkills.find((candidate) => candidate.id === "radical-pipelines");
    assert.ok(block.text.includes(`Skill: radical-pipelines\nBase directory: ${dirname(skill.path)}\n\n${skill.content}`));
  });

  test("setup resolves to a cleanup that disposes the location's hook once", async () => {
    const fake = createFakeCtx();
    const cleanup = await setup(fake.ctx, isolatedDeps({ env: {} }));
    assert.equal(typeof cleanup, "function", "the plugin API expects setup to resolve to its cleanup");

    await cleanup();
    await cleanup();
    assert.equal(fake.hookDisposals, 1);
  });

  test("a hook registration that throws leaves setup and its cleanup working", async () => {
    const fake = createFakeCtx();
    fake.ctx.session.hook = () => {
      throw new Error("unsupported hook");
    };

    const cleanup = await setup(fake.ctx, isolatedDeps({ env: {} }));
    await cleanup();
  });
});
