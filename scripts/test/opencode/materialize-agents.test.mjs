import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { materializeAgents, resolveAgentsTargetDir } from "../../../opencode/plugin.mjs";

describe("resolveAgentsTargetDir", () => {
  test("honors XDG_CONFIG_HOME when set", () => {
    const path = resolveAgentsTargetDir({ XDG_CONFIG_HOME: "/custom/config-home" });
    assert.equal(path, join("/custom/config-home", "opencode", "agents", "radical-pipelines"));
  });

  test("falls back to ~/.config/opencode/agents/radical-pipelines when XDG_CONFIG_HOME is unset", () => {
    const path = resolveAgentsTargetDir({});
    assert.equal(path, join(homedir(), ".config", "opencode", "agents", "radical-pipelines"));
  });

  test("defaults to the real process environment when none is given", () => {
    const path = resolveAgentsTargetDir();
    assert.ok(path.endsWith(join("opencode", "agents", "radical-pipelines")));
  });
});

describe("materializeAgents", () => {
  let root;
  let sourceDir;
  let targetDir;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "materialize-agents-"));
    sourceDir = join(root, "source");
    targetDir = join(root, "target");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      join(sourceDir, "agent-a.md"),
      "---\nname: agent-a\n---\n\nAgent A body.\n",
    );
    writeFileSync(
      join(sourceDir, "agent-b.md"),
      "---\nname: agent-b\n---\n\nAgent B body.\n",
    );
    // A non-.md file in the source directory must never be materialized.
    writeFileSync(join(sourceDir, "README.txt"), "not an agent profile");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("copies every source *.md profile byte-for-byte into an empty target, preserving filenames", () => {
    const result = materializeAgents(sourceDir, targetDir);

    assert.deepEqual(result.written.sort(), ["agent-a.md", "agent-b.md"]);

    assert.equal(
      readFileSync(join(targetDir, "agent-a.md"), "utf8"),
      readFileSync(join(sourceDir, "agent-a.md"), "utf8"),
    );
    assert.equal(
      readFileSync(join(targetDir, "agent-b.md"), "utf8"),
      readFileSync(join(sourceDir, "agent-b.md"), "utf8"),
    );
    assert.ok(!existsSync(join(targetDir, "README.txt")));
  });

  test("regenerates the target whole while leaving everything outside it untouched", () => {
    materializeAgents(sourceDir, targetDir);
    const strayDir = join(targetDir, "stray");
    mkdirSync(strayDir);
    writeFileSync(join(strayDir, "nested.md"), "remove me");
    writeFileSync(join(targetDir, "stray.md"), "remove me too");
    const outside = join(root, "outside.md");
    writeFileSync(outside, "keep me");

    const result = materializeAgents(sourceDir, targetDir);

    assert.deepEqual(result.written.sort(), ["agent-a.md", "agent-b.md"]);
    assert.equal(existsSync(strayDir), false);
    assert.equal(existsSync(join(targetDir, "stray.md")), false);
    assert.equal(readFileSync(outside, "utf8"), "keep me");
  });

  test("updating a source profile and re-materializing overwrites the RP-owned target with the new bytes", () => {
    materializeAgents(sourceDir, targetDir);

    const updated = "---\nname: agent-a\n---\n\nAgent A body, updated.\n";
    writeFileSync(join(sourceDir, "agent-a.md"), updated);

    const result = materializeAgents(sourceDir, targetDir);

    assert.deepEqual(result.written.sort(), ["agent-a.md", "agent-b.md"]);
    assert.equal(readFileSync(join(targetDir, "agent-a.md"), "utf8"), updated);
  });
});
