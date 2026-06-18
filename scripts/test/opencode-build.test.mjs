import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";

import { build, convertAgent, splitAgent } from "../../packages/opencode/build.mjs";

/** Repository root (the grandparent of this `scripts/test/` dir). */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_AGENTS_DIR = join(REPO_ROOT, "agents");
const SOURCE_SKILLS_DIR = join(REPO_ROOT, "skills");

/** List the source agent filenames (the single edit point). */
function sourceAgentNames() {
  return readdirSync(SOURCE_AGENTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

/** Recursively list relative file paths under a directory, sorted. */
function listFiles(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFiles(join(dir, entry.name), rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

describe("opencode agent frontmatter conversion", () => {
  test("carries description verbatim, adds mode: subagent, drops the rest", () => {
    const source = "---\nname: example\ndescription: A — verbatim: line\n---\n\nBody stays put.\n";
    const converted = convertAgent(source);
    assert.equal(
      converted,
      "---\ndescription: A — verbatim: line\nmode: subagent\n---\n\nBody stays put.\n",
    );
  });

  test("keeps the body byte-identical to the source", () => {
    const source = "---\nname: x\ndescription: d\n---\nFirst line\n\nLast line, no trailing newline";
    assert.equal(splitAgent(convertAgent(source)).body, splitAgent(source).body);
  });
});

describe("opencode build over the real shared trees", () => {
  let outDir;
  let outAgentsDir;
  let outSkillsDir;

  before(() => {
    outDir = mkdtempSync(join(tmpdir(), "rp-opencode-build-"));
    outAgentsDir = join(outDir, "agents");
    outSkillsDir = join(outDir, "skills");
    build({ outAgentsDir, outSkillsDir });
  });

  after(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  test("emits one converted .md per source agent", () => {
    assert.deepEqual(
      readdirSync(outAgentsDir).filter((n) => n.endsWith(".md")).sort(),
      sourceAgentNames(),
    );
  });

  test("each converted agent has the opencode frontmatter and a byte-identical body", () => {
    for (const name of sourceAgentNames()) {
      const source = readFileSync(join(SOURCE_AGENTS_DIR, name), "utf8");
      const converted = readFileSync(join(outAgentsDir, name), "utf8");
      const { frontmatter } = splitAgent(converted);

      const descriptionLine = splitAgent(source).frontmatter.find((l) => l.startsWith("description:"));
      assert.ok(frontmatter.includes(descriptionLine), `${name}: description carried verbatim`);
      assert.ok(frontmatter.includes("mode: subagent"), `${name}: mode: subagent added`);
      assert.ok(!frontmatter.some((l) => l.startsWith("name:")), `${name}: no name`);
      assert.ok(!frontmatter.some((l) => l.startsWith("model:")), `${name}: no model`);
      assert.ok(!frontmatter.some((l) => l.startsWith("permission:")), `${name}: no permission`);

      assert.equal(splitAgent(converted).body, splitAgent(source).body, `${name}: body byte-identical`);
    }
  });

  test("bundles the skill tree byte-identically", () => {
    const sourceFiles = listFiles(SOURCE_SKILLS_DIR);
    assert.deepEqual(listFiles(outSkillsDir), sourceFiles);
    for (const rel of sourceFiles) {
      assert.equal(
        readFileSync(join(outSkillsDir, rel)).equals(readFileSync(join(SOURCE_SKILLS_DIR, rel))),
        true,
        `${rel}: byte-identical`,
      );
    }
  });
});
