import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  PIPELINE, abs, apply, commitIn, conventions, git, ignore, lane, laneWorktree, landRole, pipeline, read, root, run, useRepo, wakeOf, write, writeFile,
} from "./fixture.mjs";

const candidate = (id) => `1-spec/lanes/${id}/spec.md`;
const head = () => git(root, "rev-parse", "HEAD").trim();
const subjects = (range) => git(root, "log", "--first-parent", "--format=%s", range).split("\n").filter(Boolean);
// The turn record and the assignment `rp next --apply` wrote for `role`, by the plan `lines` printed.
const written = (lines, role) => [readFileSync(git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/turns.json").trim(), "utf8"),
  readFileSync(wakeOf(lines, role).assignment, "utf8")];
// What `rp next --apply` prints and writes for the spec's first lane.
const applied = () => { const lines = apply(); return [lines, ...written(lines, "spec-producer-a")]; };
// The output of `command` after each of `setups`, every one of which must equal the first.
function same(setups, command) {
  const [first, ...rest] = setups.map((setup) => { setup(); return command(); });
  for (const each of rest) assert.deepEqual(each, first);
  return first;
}

describe("the pipeline configuration", () => {
  useRepo();

  it("is all rp check, rp next, and rp land read of the project's conventions: the main checkout's .rp.md and .rp.local.md, absent, present, or edited between commands, change nothing they print or write", () => {
    ignore(".rp.md");
    ignore(".rp.local.md");
    conventions({ "landing-commit-format": "{subject} (orchestrator)", guardrails: { tests: { text: "Run the tests.", profiles: ["spec-producer"] } } });
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    // The main checkout's .rp.md and .rp.local.md: absent, in prose, or holding conventions data in a JSON frontmatter.
    const projectFiles = [
      () => { rmSync(abs(".rp.md"), { force: true }); rmSync(abs(".rp.local.md"), { force: true }); },
      () => {
        writeFile(".rp.md", "---\nconventions: 7\n---\n\n## Shared conventions\n\n### Worktree folder root\n\n`.elsewhere`\n\n### Landing commit\n\n`{subject} (prose)`\n\n### Guardrails\n\n#### tests\n\nProfiles: spec-producer\n\nRun the prose tests.\n");
        writeFile(".rp.local.md", "# Local overrides\n\n### Guardrails\n\n#### tests\n\nProfiles: spec-producer\n\nRun the local tests.\n");
      },
      () => {
        writeFile(".rp.md", `---\n${JSON.stringify({ conventions: 7, "worktree-folder-root": ".data", "landing-commit-format": "{subject} (data)", guardrails: { tests: { text: "Run the data tests.", profiles: ["spec-producer"] } } })}\n---\n`);
        writeFile(".rp.local.md", `---\n${JSON.stringify({ "commit-format": "Local data." })}\n---\n`);
      },
    ];
    same(projectFiles, () => run("check", abs(PIPELINE)));
    same(projectFiles, () => run("next", abs(PIPELINE)));
    apply();
    const [, , assignment] = same(projectFiles, applied);
    assert.match(assignment, /Run the tests\./);
    commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "candidate");
    const before = head();
    projectFiles[1]();
    assert.equal(landRole("spec-producer-a"), "");
    assert.deepEqual(subjects(`${before}..HEAD`), ["Certify spec lane a candidate (orchestrator)", "Merge spec lane a (orchestrator)"]);
  });

  it("holds the owner's directions, which change nothing rp check, rp next, and rp land print or write, whether it holds some, none, or no list", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    const config = JSON.parse(read("config.json"));
    const directions = [
      () => write("config.json", JSON.stringify({ ...config, "owner-directions": ["Keep the pipeline branch local.", "Start from `v4`."] })),
      () => write("config.json", JSON.stringify({ ...config, "owner-directions": [] })),
      () => write("config.json", JSON.stringify(config)),
    ];
    same(directions, () => run("check", abs(PIPELINE), "--json"));
    same(directions, () => run("next", abs(PIPELINE)));
    apply();
    same(directions, applied);
    commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "candidate");
    const before = head();
    same(directions.map((setup) => () => { git(root, "reset", "--quiet", "--hard", before); setup(); }), () => {
      const out = run("land", abs(PIPELINE), "--role", "spec-producer-a");
      return [out, subjects(`${before}..HEAD`), git(root, "ls-tree", "-r", "HEAD", "--", `${PIPELINE}/certification`)];
    });
  });
});
