import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

import { DESIGN, NOTES, P, PIPELINE, SPEC, approve, certification, commitAll, git, later, pipeline, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

const APPROVAL = "threads/1-reviewer-default-implementer-implementation.md";
const checkAt = (at) => JSON.parse(rp("check", `${at}/${PIPELINE}`, "--json"));
const states = (report) => Object.fromEntries(report.phases.map((phase) => [phase.artifact, phase.stale ?? phase.state]));

// A pipeline with a code change, approved, squash-merged into the base branch, its branch deleted. Returns the
// approved commit.
function squashMerged() {
  pipeline(3);
  writeFile("src/app.js", "export const a = 2;\n");
  commitAll("code");
  approve();
  const approved = certification(APPROVAL).reviewed;
  git(root, "checkout", "--quiet", "main");
  git(root, "merge", "--quiet", "--squash", "demo");
  commitAll("Squash demo");
  git(root, "branch", "--quiet", "-D", "demo");
  return approved;
}
// A fresh clone of the base branch, which holds none of the pipeline branch's commits, continuing on `demo_2`.
function freshClone(approved) {
  const clone = `${root}/.clone`;
  writeFile(".git/info/exclude", ".clone/\n");
  git(root, "clone", "--quiet", "--no-local", root, clone);
  for (const [key, value] of [["user.email", "rp-test@example.com"], ["user.name", "RP Test"], ["commit.gpgsign", "false"]]) git(clone, "config", key, value);
  git(clone, "checkout", "--quiet", "-b", "demo_2", "origin/main");
  git(clone, "branch", "--quiet", "-f", "main", "origin/main");
  assert.throws(() => execFileSync("git", ["cat-file", "-e", `${approved}^{commit}`], { cwd: clone, stdio: "ignore" }));
  return clone;
}
function laterInput(at, rel, target) {
  writeFile(`${at === root ? "" : ".clone/"}${P(rel)}`, later(target, "\nIt broke.\n"));
  git(at, "add", "-A");
  git(at, "commit", "--quiet", "-m", `later input ${rel}`);
}

describe("a pipeline continued after a squash merge", () => {
  useRepo();

  it("in a clone holding none of its commits, keeps every artifact fresh and makes notes.md stale on a later input targeting it", () => {
    const clone = freshClone(squashMerged());
    laterInput(clone, "0-intent/failure-1.md", NOTES);
    const report = checkAt(clone);
    assert.deepEqual(states(report), { [SPEC]: "fresh", [DESIGN]: "fresh", [NOTES]: ["0-intent/failure-1.md"] });
    assert.deepEqual(report.frontier, [{ action: "respond", target: NOTES, threads: [], changed: ["0-intent/failure-1.md"] }]);
  });

  it("in a clone lacking the approved commit, counts the approval as none and wakes the review lane", () => {
    const clone = freshClone(squashMerged());
    const out = run("check", `${clone}/${PIPELINE}`);
    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /^frontier review default\n[\s\S]*\nreview default unapproved\n/);
    assert.deepEqual(checkAt(clone).reviews, [{ lane: "default", approved: false }]);
  });

  it("in the clone holding the approved commit, keeps the lane approved, and stale on a later input but not on code", () => {
    squashMerged();
    git(root, "checkout", "--quiet", "-b", "demo_2", "main");
    assert.deepEqual(checkAt(root).reviews, [{ lane: "default", approved: true }]);
    assert.deepEqual(checkAt(root).frontier, [{ action: "complete" }]);
    laterInput(root, "0-intent/constraint-1.md", SPEC);
    assert.deepEqual(checkAt(root).reviews, [{ lane: "default", approved: false, stale: ["0-intent/constraint-1.md"] }]);
  });
});
