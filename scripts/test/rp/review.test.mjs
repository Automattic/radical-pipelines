import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { describe, it } from "node:test";

import { NOTES, P, PIPELINE, REVIEW, TO_SPEC, abs, certification, commitAll, git, lane, later, pipeline, revise, root, rp, run, thread, useRepo, withFrontmatter, write, writeFile } from "./fixture.mjs";

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
  write("0-intent/constraint-1.md", later(NOTES));
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

  // A pipelines folder root holding tooling and pipelines of every format in the base, and tooling the pipeline branch
  // changed, with the pipeline worktree's copy of the tooling differing from its HEAD.
  function tooling() {
    git(root, "checkout", "--quiet", "main");
    const files = {
      ".pipelines/bin/env.mjs": "base env\n", ".pipelines/bin/node_modules/agent-browser/SKILL.md": "skill\n", ".pipelines/README.md": "root notes\n",
      ".pipelines/v0/prompt.md": "v0\n", ".pipelines/v1/0-prompt/prompt.md": "v1\n", ".pipelines/v3/base/0-intent/intent.md": "v3\n",
      ".pipelines/v3-spec/1-spec/spec.md": "spec only\n", ".pipelines/v5/run-config.md": "---\n{\"workflow\": \"x\"}\n---\n",
    };
    for (const [path, contents] of Object.entries(files)) writeFile(path, contents);
    commitAll("tooling and earlier pipelines");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--quiet", "--no-edit", "main");
    pipeline(3, { lanes: LANES });
    writeFile(".pipelines/bin/env.mjs", "pipeline env\n");
    writeFile("src/app.js", "export const a = 2;\n");
    const tip = commitAll("work");
    writeFile(".pipelines/bin/env.mjs", "uncommitted env\n");
    git(root, "add", ".pipelines/bin/env.mjs");
    writeFile(".pipelines/bin/env.mjs", "unstaged env\n");
    return tip;
  }

  it("keeps the root's tooling at the tip's version in both commits, and drops pipelines of every format", () => {
    const tip = tooling();
    const { base, change } = review("a");
    const inRoot = (commit) => files(commit).filter((path) => path.startsWith(".pipelines/"));
    assert.deepEqual(inRoot(change), [
      ".pipelines/README.md", ".pipelines/bin/env.mjs", ".pipelines/bin/node_modules/agent-browser/SKILL.md", `${PIPELINE}/0-intent/intent.md`,
    ]);
    assert.deepEqual(inRoot(base), inRoot(change));
    for (const commit of [base, change]) assert.equal(git(root, "show", `${commit}:.pipelines/bin/env.mjs`), "pipeline env\n");
    assert.equal(git(root, "show", `${base}:src/app.js`), "export const a = 1;\n");
    assert.equal(git(root, "diff", base, change, "--", ".pipelines"), "");
    assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(tip)));
  });

  it("builds from commits alone, whatever the pipeline worktree holds", () => {
    tooling();
    const before = git(root, "status", "--porcelain");
    review("a");
    assert.equal(git(root, "status", "--porcelain"), before);
    assert.equal(readFileSync(abs(".pipelines/bin/env.mjs"), "utf8"), "unstaged env\n");
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
    writeFile(reviewThread, `${readFileSync(abs(reviewThread), "utf8")}\n## reviewer-a — ${first.change}\n\nAnother point.\n`);
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

  // A lane's turn approving its change: the reviewer's commit on the lane branch.
  function approveInLane() {
    const { change } = review("a");
    writeFile(".git/info/exclude", ".wt/\n.clone/\n");
    git(root, "worktree", "add", "--quiet", ".wt", "demo-review-a");
    writeFile(`.wt/${PIPELINE}/threads/4-reviewer-a-implementer-implementation.md`, withFrontmatter({ status: "approved", ...REVIEW("a") }, `\n## reviewer-a — ${change}\n\nMerge it.\n`));
    git(`${root}/.wt`, "add", "-A");
    git(`${root}/.wt`, "commit", "--quiet", "-m", "approve");
    return change;
  }
  // Landing it: its commits after the change cherry-picked onto the pipeline branch, the approval certified at the change.
  const APPROVAL = "threads/4-reviewer-a-implementer-implementation.md";
  function land(change) {
    git(root, "cherry-pick", `${change}..demo-review-a`);
    const anchor = head();
    const out = run("stamp", abs(P(APPROVAL)), "--at", change);
    if (out.status === 0) commitAll("stamp");
    return { anchor, out };
  }
  function approveAtChange() {
    const change = approveInLane();
    const { anchor, out } = land(change);
    assert.equal(out.status, 0, out.stderr);
    return { change, anchor };
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

  it("anchors an approval to the pipeline-branch commit it lands on", () => {
    scenario();
    const { anchor } = approveAtChange();
    assert.equal(certification(APPROVAL).reviewed, anchor);
    execFileSync("git", ["merge-base", "--is-ancestor", anchor, "demo"], { cwd: root });
    assert.deepEqual(reviewOf(), { lane: "a", approved: true });
  });

  it("stamps an approval landing after other lanes' thread commits", () => {
    scenario();
    const change = approveInLane();
    write("threads/5-reviewer-a-b-implementer-implementation.md", withFrontmatter({ status: "open", ...REVIEW("a-b") }, "\n## reviewer-a-b — abc1234\n\nA point.\n"));
    commitAll("another lane lands");
    assert.equal(land(change).out.status, 0);
    assert.deepEqual(reviewOf(), { lane: "a", approved: true });
  });

  it("stops stamping an approval whose anchor's code differs from the change it reviewed, writing nothing", () => {
    scenario();
    const change = approveInLane();
    writeFile("src/app.js", "export const a = 3;\n");
    commitAll("code moves after the build");
    const { out } = land(change);
    assert.equal(out.status, 1);
    assert.match(out.stderr, new RegExp(`HEAD differs from ${change}, the change it reviewed, outside \\.pipelines`));
    assert.equal(certification(APPROVAL), null);
  });

  it("leaves an approval stale on a later input that reached the pipeline branch after its change was built", () => {
    pipeline(3, { lanes: [lane("reviewer", "a")] });
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("work");
    const change = approveInLane();
    write("0-intent/failure-1.md", later(NOTES, "\nIt broke.\n"));
    commitAll("a failure lands while the reviewer works");
    assert.equal(land(change).out.status, 0);
    assert.deepEqual(reviewOf(), { lane: "a", approved: false, stale: ["0-intent/failure-1.md"] });
    revise(NOTES, "failure-1 does not reproduce.");
    commitAll("notes certified");
    assert.deepEqual(JSON.parse(rp("check", abs(PIPELINE), "--json")).frontier, [{ action: "review", target: "a", threads: [], changed: ["0-intent/failure-1.md"] }]);
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
    writeFile(`.wt/${PIPELINE}/threads/2-reviewer-a-implementer-implementation.md`, withFrontmatter({ status: "open", ...REVIEW("a") }, "\n## reviewer-a — abc1234\n\nUnlanded.\n"));
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
