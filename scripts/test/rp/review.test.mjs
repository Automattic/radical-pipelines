import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { describe, it } from "node:test";

import { P, PIPELINE, REVIEW, TO_SPEC, abs, commitAll, git, lane, pipeline, root, rp, run, thread, useRepo, write, writeFile } from "./fixture.mjs";

const LANES = [lane("reviewer", "a"), lane("reviewer", "a-b")];
const review = (laneId = "a") => JSON.parse(rp("review", abs(PIPELINE), "--lane", laneId, "--json"));
const head = () => git(root, "rev-parse", "HEAD").trim();
const files = (commit) => git(root, "ls-tree", "-r", "--name-only", commit).split("\n").filter(Boolean).sort();
const patchId = (diff) => execFileSync("git", ["patch-id", "--stable"], { cwd: root, input: diff, encoding: "utf8" }).split(" ")[0];
const netChange = (tip) => git(root, "diff", git(root, "merge-base", "main", tip).trim(), tip, "--", ".", ":(exclude).pipelines");

// A pipeline on `demo` with a code change, every kind of pipeline file, another pipeline, and threads of three lanes.
function scenario() {
  git(root, "checkout", "--quiet", "main");
  writeFile(".pipelines/other/0-intent/intent.md", "origin: issue 1\n");
  commitAll("another pipeline");
  git(root, "checkout", "--quiet", "demo");
  git(root, "merge", "--quiet", "--no-edit", "main");
  pipeline(3, { lanes: LANES });
  writeFile("src/app.js", "export const a = 2;\n");
  write("0-intent/constraint-1.md", "target: 3-implementation/notes.md\n");
  thread(TO_SPEC);
  thread({ n: 2, ...REVIEW("a") });
  thread({ n: 3, opener: "reviewer-a", owner: "owner", artifact: "intent", status: "disagreement" });
  thread({ n: 2, ...REVIEW("a-b") });
  write("1-spec/spec/evidence.txt", "x\n");
  return commitAll("work");
}

describe("review", () => {
  useRepo();

  it("builds a change whose tree holds the code, the intent, later inputs, and the lane's own threads only", () => {
    scenario();
    const { change } = review("a");
    assert.deepEqual(files(change), [
      `${PIPELINE}/0-intent/constraint-1.md`,
      `${PIPELINE}/0-intent/intent.md`,
      `${PIPELINE}/threads/2-reviewer-a-implementer-implementation.md`,
      `${PIPELINE}/threads/3-reviewer-a-owner-intent.md`,
      "src/app.js",
    ]);
  });

  it("builds a review base holding the base's code and the same pipeline files, on the merge-base, with no pipeline commit in its history", () => {
    const tip = scenario();
    const { base, change } = review("a");
    const mergeBase = git(root, "merge-base", "main", tip).trim();
    assert.equal(git(root, "rev-parse", `${base}^`).trim(), mergeBase);
    assert.equal(git(root, "rev-parse", `${change}^`).trim(), base);
    assert.deepEqual(files(base), files(change));
    assert.equal(git(root, "show", `${base}:src/app.js`), "export const a = 1;\n");
    for (const commit of git(root, "rev-list", `${base}^`).split("\n").filter(Boolean))
      execFileSync("git", ["merge-base", "--is-ancestor", commit, "main"], { cwd: root });
  });

  it("makes the diff from the review base to the change the net change", () => {
    const tip = scenario();
    const { base, change } = review("a");
    assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(tip)));
  });

  it("follows the base merged into the pipeline branch after the pipeline started", () => {
    scenario();
    git(root, "checkout", "--quiet", "main");
    writeFile("src/base.js", "export const b = 1;\n");
    const moved = commitAll("base moves");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--quiet", "--no-edit", "main");
    const { base, change } = review("a");
    assert.equal(git(root, "rev-parse", `${base}^`).trim(), moved);
    assert.equal(git(root, "show", `${base}:src/base.js`), "export const b = 1;\n");
    assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(head())));
    assert.equal(git(root, "diff", "--stat", base, change, "--", "src/base.js"), "");
  });

  it("builds an empty change when the net change is empty", () => {
    pipeline(3, { lanes: LANES });
    const { base, change } = review("a");
    assert.equal(git(root, "rev-parse", `${base}^{tree}`).trim(), git(root, "rev-parse", `${change}^{tree}`).trim());
  });

  it("keeps a lane's threads apart from a lane whose id extends it", () => {
    scenario();
    assert.deepEqual(files(review("a-b").change).filter((path) => path.includes("/threads/")), [`${PIPELINE}/threads/2-reviewer-a-b-implementer-implementation.md`]);
  });

  it("gives a lane with no threads yet only the intent", () => {
    pipeline(3, { lanes: [lane("reviewer", "c")] });
    thread(TO_SPEC);
    commitAll("thread");
    assert.deepEqual(files(review("c").change).filter((path) => path.startsWith(PIPELINE)), [`${PIPELINE}/0-intent/intent.md`]);
  });

  it("moves the lane branch, and its worktree, to the change of each turn once the last turn's commits landed", () => {
    scenario();
    const first = review("a");
    assert.deepEqual([first.branch, first.worktree], ["demo-review-a", null]);
    assert.equal(git(root, "rev-parse", "demo-review-a").trim(), first.change);
    writeFile(".git/info/exclude", ".wt/\n");
    git(root, "worktree", "add", "--quiet", ".wt", "demo-review-a");
    const reviewThread = `.wt/${PIPELINE}/threads/2-reviewer-a-implementer-implementation.md`;
    writeFile(reviewThread, `${readFileSync(abs(reviewThread), "utf8")}\n## reviewer-a — ${first.tip}\n\nAnother point.\n`);
    git(`${root}/.wt`, "commit", "--quiet", "-am", "review");
    git(root, "cherry-pick", `${first.change}..demo-review-a`);
    write("threads/2-reviewer-a-implementer-implementation.md", `${readFileSync(abs(P("threads/2-reviewer-a-implementer-implementation.md")), "utf8")}\n## implementer — ${head()}\n\nAnswered.\n`);
    commitAll("answer");
    const second = review("a");
    assert.equal(second.worktree, realpathSync(`${root}/.wt`));
    assert.equal(git(`${root}/.wt`, "rev-parse", "HEAD").trim(), second.change);
    assert.match(readFileSync(abs(reviewThread), "utf8"), /Another point\.[\s\S]*## implementer — [0-9a-f]+\n\nAnswered\./);
    assert.equal(git(`${root}/.wt`, "status", "--porcelain"), "");
  });

  // A lane's turn approved at its change, landed: the approval stamped in the lane's worktree at the tip the change
  // was built from, then cherry-picked onto the pipeline branch.
  function approveAtChange() {
    const { change, tip } = review("a");
    writeFile(".git/info/exclude", ".wt/\n.clone/\n");
    git(root, "worktree", "add", "--quiet", ".wt", "demo-review-a");
    writeFile(`.wt/${PIPELINE}/threads/4-reviewer-a-implementer-implementation.md`, `status: closed: approved\nopener: reviewer-a\nowner: implementer\nartifact: implementation\n\n## reviewer-a — ${change}\n\nMerge it.\n`);
    git(`${root}/.wt`, "add", "-A");
    git(`${root}/.wt`, "commit", "--quiet", "-m", "approve");
    rp("stamp", `${root}/.wt/${PIPELINE}/threads/4-reviewer-a-implementer-implementation.md`, "--at", tip);
    git(`${root}/.wt`, "commit", "--quiet", "-am", "stamp");
    git(root, "cherry-pick", `${change}..demo-review-a`);
    return { change, tip };
  }
  const reviewOf = (at = root) => JSON.parse(rp("check", `${at}/${PIPELINE}`, "--json")).reviews.find((entry) => entry.lane === "a");
  const moveBase = () => {
    git(root, "checkout", "--quiet", "main");
    writeFile(".pipelines/other/0-intent/intent.md", "origin: issue 1\n\nFollow-up.\n");
    writeFile("src/base.js", "export const b = 1;\n");
    commitAll("base moves, another pipeline changes");
    git(root, "checkout", "--quiet", "demo");
  };

  it("gives the change the tip's net change: same merge-base with the base, same code", () => {
    const tip = scenario();
    const { change } = review("a");
    assert.equal(git(root, "merge-base", "main", change).trim(), git(root, "merge-base", "main", tip).trim());
    assert.equal(git(root, "diff", tip, change, "--", ".", ":(exclude).pipelines"), "");
  });

  it("anchors an approval to the pipeline-branch tip the change was built from", () => {
    scenario();
    const { tip } = approveAtChange();
    assert.equal(JSON.parse(readFileSync(abs(P("threads/4-reviewer-a-implementer-implementation.md")), "utf8").split("---\n")[1]).reviewed, tip);
    execFileSync("git", ["merge-base", "--is-ancestor", tip, "demo"], { cwd: root });
    assert.deepEqual(reviewOf(), { lane: "a", approved: true });
  });

  // How the pipeline branch moves after the approval: [what, move, approved].
  const after = [
    ["the base moves without being merged", () => moveBase(), true],
    ["the base, touching another pipeline, is merged", () => { moveBase(); git(root, "merge", "--quiet", "--no-edit", "main"); }, true],
    ["the code changes", () => { writeFile("src/app.js", "export const a = 3;\n"); commitAll("code moves"); }, false],
  ];
  for (const [what, move, approved] of after)
    it(`keeps an approval ${approved ? "fresh" : "stale"} when ${what}`, () => {
      scenario();
      approveAtChange();
      move();
      assert.deepEqual(reviewOf(), approved ? { lane: "a", approved: true } : { lane: "a", approved: false, codeChanged: true });
    });

  it("reads an approval on a clone of the pipeline branch that never had the change", () => {
    scenario();
    const { change } = approveAtChange();
    git(root, "clone", "--quiet", "--no-local", "--single-branch", "--branch", "demo", root, `${root}/.clone`);
    git(`${root}/.clone`, "fetch", "--quiet", "origin", "main:main");
    assert.throws(() => execFileSync("git", ["cat-file", "-e", `${change}^{commit}`], { cwd: `${root}/.clone`, stdio: "ignore" }));
    assert.deepEqual(reviewOf(`${root}/.clone`), { lane: "a", approved: true });
  });

  it("diffs a later turn from the change the last message names to the new tip", () => {
    scenario();
    const { change } = review("a");
    writeFile("src/app.js", "export const a = 3;\n");
    const tip = commitAll("answer");
    assert.equal(git(root, "diff", change, tip, "--", ".", ":(exclude).pipelines"), git(root, "diff", "HEAD~1", tip, "--", ".", ":(exclude).pipelines"));
  });

  it("stops, naming them, when the lane branch holds commits the pipeline branch lacks", () => {
    scenario();
    const { change } = review("a");
    writeFile(".git/info/exclude", ".wt/\n");
    git(root, "worktree", "add", "--quiet", ".wt", "demo-review-a");
    writeFile(`.wt/${PIPELINE}/threads/2-reviewer-a-implementer-implementation.md`, "status: open\nopener: reviewer-a\nowner: implementer\nartifact: implementation\n\n## reviewer-a — abc1234\n\nUnlanded.\n");
    git(`${root}/.wt`, "commit", "--quiet", "-am", "review");
    const unlanded = git(`${root}/.wt`, "rev-parse", "HEAD").trim();
    const out = run("review", abs(PIPELINE), "--lane", "a");
    assert.equal(out.status, 1);
    assert.match(out.stderr, new RegExp(`demo-review-a has commits the pipeline branch lacks; land them first: ${unlanded}`));
    assert.equal(git(root, "rev-parse", `demo-review-a^`).trim(), change);
  });

  const refusals = [
    ["no --lane", () => [], /--lane <lane> is required/],
    ["a lane the configuration does not declare", () => ["--lane", "default"], /default is not a review lane of \.pipelines\/demo\/run-config\.md/],
    ["a detached pipeline worktree", () => { git(root, "checkout", "--quiet", "--detach"); return ["--lane", "a"]; }, /has no branch checked out/],
  ];
  for (const [what, args, message] of refusals)
    it(`stops on ${what}`, () => {
      pipeline(3, { lanes: LANES });
      const out = run("review", abs(PIPELINE), ...args());
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });
});
