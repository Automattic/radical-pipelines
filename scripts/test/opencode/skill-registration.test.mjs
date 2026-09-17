import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readSkillDirectory } from "../../../opencode/plugin.mjs";

test("reads nested and flat skills with optional frontmatter and boolean metadata", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rp-skills-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, "nested"));
  const bodies = {
    "nested/SKILL.md": "---\nname: Nested\ndescription: Nested skill\nautoinvoke: true\nslash: true\n---\nNested body",
    "flat.md": "---\nautoinvoke: false\nslash: false\n---\nFlat body",
    "plain.md": "Plain body",
  };
  for (const [path, body] of Object.entries(bodies)) writeFileSync(join(directory, path), body);

  const skills = readSkillDirectory(directory);
  assert.deepEqual(skills.map((skill) => skill.id), ["flat", "nested", "plain"]);
  assert.deepEqual(skills.map((skill) => skill.autoinvoke), [false, true, undefined]);
  for (const skill of skills) {
    const path = skill.id === "nested" ? "nested/SKILL.md" : `${skill.id}.md`;
    assert.equal(skill.path, join(directory, path));
    assert.equal(skill.content, `${skill.id[0].toUpperCase()}${skill.id.slice(1)} body`);
  }
  assert.equal(skills[1].name, "Nested");
  assert.equal(skills[1].description, "Nested skill");
  assert.equal(skills[0].name, "flat");
});
