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
    assert.equal(path, join("/custom/config-home", "opencode", "agents"));
  });

  test("falls back to ~/.config/opencode/agents when XDG_CONFIG_HOME is unset", () => {
    const path = resolveAgentsTargetDir({});
    assert.equal(path, join(homedir(), ".config", "opencode", "agents"));
  });

  test("defaults to the real process environment when none is given", () => {
    const path = resolveAgentsTargetDir();
    assert.ok(path.endsWith(join("opencode", "agents")));
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
    assert.deepEqual(result.collisions, []);

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

  test("a second materialize with unchanged sources is a no-op diff and overwrites only RP-owned files", () => {
    materializeAgents(sourceDir, targetDir);
    const before = {
      a: readFileSync(join(targetDir, "agent-a.md"), "utf8"),
      b: readFileSync(join(targetDir, "agent-b.md"), "utf8"),
    };

    const result = materializeAgents(sourceDir, targetDir);

    assert.deepEqual(result.collisions, []);
    assert.deepEqual(result.written.sort(), ["agent-a.md", "agent-b.md"]);
    assert.equal(
      readFileSync(join(targetDir, "agent-a.md"), "utf8"),
      before.a,
    );
    assert.equal(
      readFileSync(join(targetDir, "agent-b.md"), "utf8"),
      before.b,
    );
  });

  test("a pre-existing target file of the same name that is not RP-owned is reported as a collision and left unmodified", () => {
    mkdirSync(targetDir, { recursive: true });
    const foreignContent = "a foreign, hand-authored agent profile\n";
    writeFileSync(join(targetDir, "agent-a.md"), foreignContent);

    const result = materializeAgents(sourceDir, targetDir);

    assert.deepEqual(result.collisions, ["agent-a.md"]);
    assert.deepEqual(result.written, ["agent-b.md"]);
    assert.equal(
      readFileSync(join(targetDir, "agent-a.md"), "utf8"),
      foreignContent,
    );
  });

  test("an RP-owned target whose source profile was retired is removed; foreign files stay", () => {
    materializeAgents(sourceDir, targetDir);
    writeFileSync(join(targetDir, "foreign.md"), "not ours");
    rmSync(join(sourceDir, "agent-b.md"));
    const result = materializeAgents(sourceDir, targetDir);
    assert.deepEqual(result.removed, ["agent-b.md"]);
    assert.equal(existsSync(join(targetDir, "agent-b.md")), false);
    assert.equal(existsSync(join(targetDir, "agent-a.md")), true);
    assert.equal(existsSync(join(targetDir, "foreign.md")), true);
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
