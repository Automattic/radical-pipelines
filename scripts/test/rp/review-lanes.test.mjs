import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  NOTES, P, PIPELINE, REVIEW, TO_SPEC,
  abs, apply, certification, check, commitAll, commitIn, git, ignore, land, landRole, lane, laneWorktree, later, pipeline, read, revise, root, rp, thread, useRepo, withFrontmatter, write, writeFile,
} from "./fixture.mjs";

const LANES = [lane("reviewer", "a"), lane("reviewer", "a-b")];
// The review head rp next --apply built for a lane: the commit its branch holds, and the review base below it.
const built = (id = "a") => {
  const reviewHead = git(root, "rev-parse", `demo-review-${id}`).trim();
  return { reviewHead, base: git(root, "rev-parse", `${reviewHead}^`).trim() };
};
const head = () => git(root, "rev-parse", "HEAD").trim();
const files = (commit) => git(root, "ls-tree", "-r", "--name-only", commit).split("\n").filter(Boolean).sort();
const patchId = (diff) => execFileSync("git", ["patch-id", "--stable"], { cwd: root, input: diff, encoding: "utf8" }).split(" ")[0];
const netChange = (tip) => git(root, "diff", git(root, "merge-base", "main", tip).trim(), tip, "--", ".", ":(exclude).pipelines");
// A thread a review lane's reviewer opened, answered by the implementer: it awaits the reviewer.
const answered = (n, id) => thread({ n, ...REVIEW(id), messages: [[`reviewer-${id}`, head()], ["implementer", head()]] });

// A pipeline on `demo` with a code change, every kind of pipeline file, another pipeline, and threads of three lanes,
// each awaiting its reviewer.
function scenario() {
  git(root, "checkout", "--quiet", "main");
  writeFile(".pipelines/other/config.json", '{"target-phase": 4, "base-branch": "main", "worktree-folder-root": ".worktrees"}\n');
  writeFile(".pipelines/other/0-intent/intent.md", "---\nissue: 1\n---\n");
  commitAll("another pipeline");
  git(root, "checkout", "--quiet", "demo");
  git(root, "merge", "--quiet", "--no-edit", "main");
  pipeline(3, { lanes: LANES });
  writeFile("src/app.js", "export const a = 2;\n");
  write("0-intent/constraint-1.md", later(NOTES));
  land(NOTES);
  thread({ ...TO_SPEC, status: "resolved" });
  answered(2, "a");
  thread({ n: 3, opener: "reviewer-a", recipient: "owner", about: "intent", status: "answered" });
  answered(2, "a-b");
  write("1-spec/spec/evidence.txt", "x\n");
  return commitAll("work");
}

describe("review lanes", () => {
  useRepo();

  describe("are built from the pipeline tip", () => {
    it("as a review head whose tree holds the code, the intent, later inputs, and the lane's own threads only", () => {
      scenario();
      apply();
      assert.deepEqual(files(built("a").reviewHead), [
        `${PIPELINE}/0-intent/constraint-1.md`,
        `${PIPELINE}/0-intent/intent.md`,
        `${PIPELINE}/threads/2-reviewer-a-implementer-implementation.md`,
        `${PIPELINE}/threads/3-reviewer-a-owner-intent.md`,
        "src/app.js",
      ]);
    });

    it("on a review base holding the merge-base's code and the same pipeline files, on the merge-base, with no pipeline commit in its history", () => {
      const tip = scenario();
      apply();
      const { base, reviewHead: change } = built("a");
      const mergeBase = git(root, "merge-base", "main", tip).trim();
      assert.equal(git(root, "rev-parse", `${base}^`).trim(), mergeBase);
      assert.deepEqual(files(base), files(change));
      assert.equal(git(root, "show", `${base}:src/app.js`), "export const a = 1;\n");
      for (const commit of git(root, "rev-list", `${base}^`).split("\n").filter(Boolean))
        execFileSync("git", ["merge-base", "--is-ancestor", commit, "main"], { cwd: root });
    });

    it("so the diff from the review base to the review head is the net change", () => {
      const tip = scenario();
      apply();
      const { base, reviewHead: change } = built("a");
      assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(tip)));
    });

    // A pipelines folder root holding, in the base, tooling, folders without config.json, and another pipeline, and
    // tooling the pipeline branch changed, with the pipeline worktree's copy of the tooling differing from its HEAD.
    function tooling() {
      git(root, "checkout", "--quiet", "main");
      const files = {
        ".pipelines/bin/env.mjs": "base env\n", ".pipelines/bin/node_modules/agent-browser/SKILL.md": "skill\n", ".pipelines/README.md": "root notes\n",
        ".pipelines/v0/prompt.md": "v0\n", ".pipelines/v1/0-prompt/prompt.md": "v1\n", ".pipelines/v3/base/0-intent/intent.md": "v3\n",
        ".pipelines/v3-spec/1-spec/spec.md": "spec only\n", ".pipelines/v6/run-config.md": "---\n{\"format\": 6}\n---\n",
        ".pipelines/v7/config.json": '{"target-phase": 4, "base-branch": "main", "worktree-folder-root": ".worktrees"}\n', ".pipelines/v7/0-intent/intent.md": "---\nissue: 2\n---\n",
      };
      for (const [path, contents] of Object.entries(files)) writeFile(path, contents);
      commitAll("tooling, folders without config.json, and another pipeline");
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

    it("keeping the root's tooling and every folder without config.json at the tip's version in both commits, and dropping every other pipeline", () => {
      const tip = tooling();
      apply();
      const { base, reviewHead: change } = built("a");
      const inRoot = (commit) => files(commit).filter((path) => path.startsWith(".pipelines/"));
      assert.deepEqual(inRoot(change), [
        ".pipelines/README.md", ".pipelines/bin/env.mjs", ".pipelines/bin/node_modules/agent-browser/SKILL.md", `${PIPELINE}/0-intent/intent.md`,
        ".pipelines/v0/prompt.md", ".pipelines/v1/0-prompt/prompt.md", ".pipelines/v3-spec/1-spec/spec.md", ".pipelines/v3/base/0-intent/intent.md", ".pipelines/v6/run-config.md",
      ]);
      assert.deepEqual(inRoot(base), inRoot(change));
      for (const commit of [base, change]) assert.equal(git(root, "show", `${commit}:.pipelines/bin/env.mjs`), "pipeline env\n");
      assert.equal(git(root, "show", `${base}:src/app.js`), "export const a = 1;\n");
      assert.equal(git(root, "diff", base, change, "--", ".pipelines"), "");
      assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(tip)));
    });

    it("from commits alone, whatever the pipeline worktree holds", () => {
      tooling();
      const before = git(root, "status", "--porcelain");
      apply();
      assert.equal(git(root, "status", "--porcelain"), before);
      assert.equal(readFileSync(abs(".pipelines/bin/env.mjs"), "utf8"), "unstaged env\n");
    });

    it("following the base branch merged into the pipeline branch after the pipeline started", () => {
      scenario();
      git(root, "checkout", "--quiet", "main");
      writeFile("src/base.js", "export const b = 1;\n");
      const moved = commitAll("base moves");
      git(root, "checkout", "--quiet", "demo");
      git(root, "merge", "--quiet", "--no-edit", "main");
      apply();
      const { base, reviewHead: change } = built("a");
      assert.equal(git(root, "rev-parse", `${base}^`).trim(), moved);
      assert.equal(git(root, "show", `${base}:src/base.js`), "export const b = 1;\n");
      assert.equal(patchId(git(root, "diff", base, change)), patchId(netChange(head())));
      assert.equal(git(root, "diff", "--stat", base, change, "--", "src/base.js"), "");
    });

    it("as a review head changing nothing when the net change is empty", () => {
      pipeline(3, { lanes: LANES });
      apply();
      const { base, reviewHead: change } = built("a");
      assert.equal(git(root, "rev-parse", `${base}^{tree}`).trim(), git(root, "rev-parse", `${change}^{tree}`).trim());
    });

    it("keeping a lane's threads apart from a lane whose id extends it", () => {
      scenario();
      apply();
      assert.deepEqual(files(built("a-b").reviewHead).filter((path) => path.includes("/threads/")), [`${PIPELINE}/threads/2-reviewer-a-b-implementer-implementation.md`]);
    });

    it("giving a lane with no threads yet only the intent", () => {
      pipeline(3, { lanes: [lane("reviewer", "c")] });
      thread({ ...TO_SPEC, status: "resolved" });
      commitAll("thread");
      apply();
      assert.deepEqual(files(built("c").reviewHead).filter((path) => path.startsWith(PIPELINE)), [`${PIPELINE}/0-intent/intent.md`]);
    });

    it("again once the last turn's commits landed, moving the lane's worktree to the new review head", () => {
      scenario();
      apply();
      const wt = laneWorktree("demo-review-a"), first = built("a").reviewHead;
      const reviewThread = "threads/2-reviewer-a-implementer-implementation.md";
      commitIn(wt, { [reviewThread]: `${readFileSync(join(wt, PIPELINE, reviewThread), "utf8")}\n## reviewer-a — ${first}\n\nAnother point.\n` }, "review");
      landRole("reviewer-a");
      write(reviewThread, `${read(reviewThread)}\n## implementer — ${head()}\n\nAnswered.\n`);
      commitAll("answer");
      apply();
      const second = built("a").reviewHead;
      assert.notEqual(second, first);
      assert.equal(git(wt, "rev-parse", "HEAD").trim(), second);
      assert.match(readFileSync(join(wt, PIPELINE, reviewThread), "utf8"), /Another point\.[\s\S]*## implementer — [0-9a-f]+\n\nAnswered\./);
      assert.equal(git(wt, "status", "--porcelain"), "");
    });
  });

  describe("land an approval", () => {
    const APPROVAL = "threads/4-reviewer-a-implementer-implementation.md";
    // A lane's turn approving the change it was given: the reviewer's commit in its worktree.
    function approveInLane() {
      apply();
      const { reviewHead: change } = built("a");
      commitIn(laneWorktree("demo-review-a"), { [APPROVAL]: withFrontmatter({ status: "approved", ...REVIEW("a") }, `\n## reviewer-a — ${change}\n\nMerge it.\n`) }, "approve");
      return change;
    }
    const reviewOf = (at = root) => JSON.parse(rp("check", `${at}/${PIPELINE}`, "--json")).reviews.find((entry) => entry.lane === "a");
    const moveBase = () => {
      git(root, "checkout", "--quiet", "main");
      writeFile(".pipelines/other/0-intent/intent.md", "---\nissue: 1\n---\n\nFollow-up.\n");
      writeFile("src/base.js", "export const b = 1;\n");
      commitAll("base moves, another pipeline changes");
      git(root, "checkout", "--quiet", "demo");
    };

    it("anchored to the pipeline-branch commit that holds it", () => {
      scenario();
      const change = approveInLane();
      landRole("reviewer-a");
      const anchor = git(root, "rev-parse", "HEAD^").trim();
      assert.deepEqual(certification(APPROVAL), { inputs: certification(APPROVAL).inputs, "approved-commit": anchor });
      assert.equal(git(root, "show", `HEAD^:${P(APPROVAL)}`).includes(`## reviewer-a — ${change}`), true);
      assert.deepEqual(reviewOf(), { lane: "a", approved: true });
    });

    it("after other lanes' thread commits landed", () => {
      scenario();
      approveInLane();
      write("threads/5-reviewer-a-b-implementer-implementation.md", withFrontmatter({ status: "open", ...REVIEW("a-b") }, "\n## reviewer-a-b — abc1234\n\nA point.\n"));
      commitAll("another lane lands");
      landRole("reviewer-a");
      assert.deepEqual(reviewOf(), { lane: "a", approved: true });
    });

    it("uncertified when the pipeline commit holding it has code other than the review head's, and the lane is not approved", () => {
      scenario();
      approveInLane();
      writeFile("src/app.js", "export const a = 3;\n");
      commitAll("code moves after the build");
      landRole("reviewer-a");
      assert.equal(read(APPROVAL).includes("Merge it."), true);
      assert.equal(certification(APPROVAL), null);
      assert.deepEqual(reviewOf(), { lane: "a", approved: false, stale: ["0-intent/intent.md", "0-intent/constraint-1.md"] });
    });

    it("uncertified when its reviewer's last heading names no commit, removing the certification its path held", () => {
      pipeline(3, { lanes: [lane("reviewer", "a")] });
      approveInLane();
      landRole("reviewer-a");
      assert.ok(certification(APPROVAL));
      write(APPROVAL, read(APPROVAL).replace("status: approved", "status: pending"));
      commitAll("the approval is rejected");
      apply();
      const wt = laneWorktree("demo-review-a");
      const repaired = readFileSync(join(wt, PIPELINE, APPROVAL), "utf8").replace("status: pending", "status: approved").replace(/## reviewer-a — [0-9a-f]+/, "## reviewer-a — deadbeef");
      commitIn(wt, { [APPROVAL]: repaired }, "repair");
      const before = head();
      assert.equal(landRole("reviewer-a"), "hook phase-completed 1\nhook phase-completed 2\nhook phase-completed 3\n");
      assert.deepEqual(git(root, "log", "--first-parent", "--format=%s", `${before}..HEAD`).trim().split("\n"), ["Remove the certification of review lane a approval", "repair"]);
      assert.equal(certification(APPROVAL), null);
      assert.deepEqual(reviewOf(), { lane: "a", approved: false, stale: ["0-intent/intent.md"] });
    });

    it("stale on a later input that reached the pipeline branch after its review head was built", () => {
      pipeline(3, { lanes: [lane("reviewer", "a")] });
      writeFile("src/app.js", "export const a = 2;\n");
      commitAll("work");
      approveInLane();
      write("0-intent/failure-1.md", later(NOTES, "\nIt broke.\n"));
      commitAll("a failure lands while the reviewer works");
      landRole("reviewer-a");
      assert.deepEqual(reviewOf(), { lane: "a", approved: false, stale: ["0-intent/failure-1.md"] });
      revise(NOTES, "failure-1 does not reproduce.");
      commitAll("notes certified");
      assert.deepEqual(check().frontier, [{ action: "review", lane: "a", threads: [], changed: ["0-intent/failure-1.md"] }]);
    });

    // How the pipeline branch moves after the approval: [what, move, approved].
    const after = [
      ["the base moves without being merged", () => moveBase(), true],
      ["the base, touching another pipeline, is merged", () => { moveBase(); git(root, "merge", "--quiet", "--no-edit", "main"); }, true],
      ["the code changes", () => { writeFile("src/app.js", "export const a = 3;\n"); commitAll("code moves"); }, false],
    ];
    for (const [what, move, approved] of after)
      it(`fresh ${approved ? "still" : "no longer"} when ${what}`, () => {
        scenario();
        approveInLane();
        landRole("reviewer-a");
        move();
        assert.deepEqual(reviewOf(), approved ? { lane: "a", approved: true } : { lane: "a", approved: false, "code-changed": true });
      });

    it("readable on a clone of the pipeline branch that never had the review head", () => {
      scenario();
      const change = approveInLane();
      landRole("reviewer-a");
      ignore(".clone/");
      git(root, "clone", "--quiet", "--no-local", "--single-branch", "--branch", "demo", root, `${root}/.clone`);
      git(`${root}/.clone`, "fetch", "--quiet", "origin", "main:main");
      assert.throws(() => execFileSync("git", ["cat-file", "-e", `${change}^{commit}`], { cwd: `${root}/.clone`, stdio: "ignore" }));
      assert.deepEqual(reviewOf(`${root}/.clone`), { lane: "a", approved: true });
    });
  });
});
