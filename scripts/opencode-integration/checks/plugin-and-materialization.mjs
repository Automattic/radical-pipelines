/**
 * Flow 2 (plugin load + version id) and the plugin's skill-registration and
 * agent-materialization mechanics (including foreign-file collision
 * safety), driven against the sandbox's running `serve` process.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, listAgents, listPlugins, listSkills, pollUntil } from "../lib/api-client.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const AGENTS_SOURCE_DIR = join(REPO_ROOT, "agents");
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, xdgConfigHome: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, xdgConfigHome, results } = ctx;
  const materializedAgentsDir = join(xdgConfigHome, "opencode", "agents");

  await runCheck(results, "collision safety: pre-existing foreign file at an agent path is left untouched", async () => {
    // Seeded BEFORE the plugin's setup() has a chance to run (setup is lazy,
    // triggered by the sandbox's first session — created just below) — a
    // foreign, non-RP-owned file at a would-be materialized filename.
    mkdirSync(materializedAgentsDir, { recursive: true });
    ctx.foreignAgentPath = join(materializedAgentsDir, "spec-lead.md");
    ctx.foreignAgentContent = "a foreign, hand-authored agent profile\n";
    writeFileSync(ctx.foreignAgentPath, ctx.foreignAgentContent);
  });

  await runCheck(results, "plugin loads and /api/plugin reports radical-pipelines@<package.json version>", async () => {
    // The first session in this project triggers the plugin's lazy setup().
    // On a cold cache, opencode's own catalog build runs asynchronously
    // after session.create's response returns — verified live that
    // /api/plugin can take a few seconds to populate the first time — so
    // every read of it here polls rather than asserting on one immediate read.
    await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });

    const pkgVersion = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")).version;
    const expectedID = `radical-pipelines@${pkgVersion}`;
    const plugins = await pollUntil(
      async () => {
        const list = await listPlugins(server, projectDir);
        return list.some((p) => p.id === expectedID) ? list : undefined;
      },
      { timeoutMs: 15_000, label: `plugin "${expectedID}" to appear in /api/plugin` },
    );
    assert.ok(
      plugins.some((p) => p.id === expectedID),
      `expected a plugin id "${expectedID}" among: ${JSON.stringify(plugins.map((p) => p.id))}`,
    );
  });

  await runCheck(results, "skill registration: the radical-pipelines skill is registered by reference to the real skill file", async () => {
    const skills = await pollUntil(
      async () => {
        const list = await listSkills(server, projectDir);
        return list.some((s) => s.id === "radical-pipelines") ? list : undefined;
      },
      { timeoutMs: 15_000, label: `the "radical-pipelines" skill to appear in /api/skill` },
    );
    const found = skills.find((s) => s.id === "radical-pipelines");
    assert.ok(found, `expected a "radical-pipelines" skill among: ${JSON.stringify(skills.map((s) => s.id))}`);
    assert.ok(
      found.location.endsWith(join("skills", "radical-pipelines", "SKILL.md")),
      `expected the skill's location to point at the repo's own SKILL.md, got: ${found.location}`,
    );
  });

  await runCheck(results, "agent materialization: every source *.md profile is available by its filename-derived id", async () => {
    const sourceNames = readdirSync(AGENTS_SOURCE_DIR).filter((name) => name.endsWith(".md"));
    assert.ok(sourceNames.length > 0, "expected at least one source agent profile");
    const expectedIDs = sourceNames.map((name) => name.replace(/\.md$/, "")).filter((id) => id !== "spec-lead");

    const agents = await pollUntil(
      async () => {
        const list = await listAgents(server, projectDir);
        const ids = new Set(list.map((a) => a.id));
        return expectedIDs.every((id) => ids.has(id)) ? list : undefined;
      },
      { timeoutMs: 15_000, label: "every materialized agent to appear in /api/agent" },
    );
    const agentIDs = new Set(agents.map((a) => a.id));

    for (const id of expectedIDs) {
      // "spec-lead" collided with the foreign file seeded above; it must NOT
      // have been materialized (see the collision-safety check below).
      assert.ok(agentIDs.has(id), `expected agent "${id}" to be recognized; got: ${JSON.stringify([...agentIDs])}`);
    }
  });

  await runCheck(results, "agent materialization: materialized bytes match the source profile exactly", async () => {
    const fileName = "spec-researcher.md";
    const sourceBytes = readFileSync(join(AGENTS_SOURCE_DIR, fileName), "utf8");
    const materializedPath = join(materializedAgentsDir, fileName);
    await pollUntil(async () => existsSync(materializedPath), {
      timeoutMs: 15_000,
      label: `${fileName} to be materialized on disk`,
    });
    const materializedBytes = readFileSync(materializedPath, "utf8");
    assert.equal(materializedBytes, sourceBytes);
  });

  await runCheck(results, "collision safety: the foreign file at a colliding agent path was left byte-identical", async () => {
    const currentContent = readFileSync(ctx.foreignAgentPath, "utf8");
    assert.equal(currentContent, ctx.foreignAgentContent, "the foreign file must not have been overwritten");
  });
}
