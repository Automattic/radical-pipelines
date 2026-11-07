import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, PIPELINE, REVIEW, SPEC, TO_OWNER, TO_SPEC,
  abs, apply, commitAll, commitIn, conventions, git, lane, laneWorktree, landRole, pipeline, plan, read, remove, root, run, thread, useRepo, wakeOf, withFrontmatter, write, writeFile,
} from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b")];
const candidate = (id) => `1-spec/lanes/${id}/spec.md`;
const head = (at = root) => git(at, "rev-parse", "HEAD").trim();
const at = () => realpathSync(root);
const gitDir = (worktree) => realpathSync(git(worktree, "rev-parse", "--path-format=absolute", "--git-dir").trim());
const worktreePaths = () => git(root, "worktree", "list", "--porcelain").split("\n").filter((line) => line.startsWith("worktree ")).map((line) => realpathSync(line.slice(9)));
// Everything a plan may change: every ref, every worktree with its status, and every file in each worktree's
// private git directory under rp/, the assignments and the step record among them.
function snapshot() {
  return {
    refs: git(root, "for-each-ref", "--format=%(refname) %(objectname)").split("\n").filter(Boolean),
    worktrees: worktreePaths().map((path) => {
      const prepared = join(gitDir(path), "rp");
      return [path, git(path, "status", "--porcelain", "--untracked-files=all"), existsSync(prepared) ? readdirSync(prepared).sort().map((name) => [name, readFileSync(join(prepared, name), "utf8")]) : []];
    }),
  };
}
// The lines of a plan that name what applying does.
const ACTIONS = /^(?:remove-worktree|delete-branch|create-branch|move-branch|create-worktree) /;
const actions = (lines) => lines.filter((line) => ACTIONS.test(line));
// Whether each line appears in `lines`, in this order.
const inOrder = (lines, ...expected) => {
  const at = expected.map((line) => lines.indexOf(line));
  assert.ok(at.every((index, i) => index !== -1 && (i === 0 || index > at[i - 1])), `${expected.join("\n")}\nin order among:\n${lines.join("\n")}`);
};
// Lands each spec lane's candidate through its worktree.
function produceCandidates(ids = ["a", "b"]) {
  for (const id of ids) {
    commitIn(laneWorktree(`demo-spec-${id}`), { [candidate(id)]: `# Candidate ${id}\n` }, `Add ${id} candidate`);
    landRole(`spec-producer-${id}`);
  }
}

describe("rp next", () => {
  useRepo();

  describe("prints the plan and changes nothing", () => {
    // [what, how the step is reached]
    const steps = [
      ["lanes to create", () => pipeline(0, { lanes: SPEC_LANES })],
      ["lanes to remove at a consolidation", () => { pipeline(0, { lanes: SPEC_LANES }); apply(); produceCandidates(); }],
      ["review lanes to build", () => { pipeline(3, { lanes: [lane("reviewer", "a"), lane("reviewer", "b")] }); writeFile("src/app.js", "export const a = 2;\n"); commitAll("code"); }],
    ];
    for (const [what, reach] of steps)
      it(`with ${what}: no file, ref, worktree, assignment, or step record`, () => {
        conventions();
        reach();
        const before = snapshot();
        assert.ok(actions(plan()).length);
        assert.deepEqual(snapshot(), before);
      });
  });

  describe("names what each frontier line dispatches", () => {
    it("lane: each lane's branch at the tip and its worktree under the worktree folder root, the hooks around its creation and no branch hook, and the role to wake there", () => {
      conventions({ resources: { suite: { resource: "The suite.", profiles: ["spec-producer"] }, "browser tools": { resource: "A browser.", profiles: ["spec-producer", "implementer"] }, other: { resource: "X.", profiles: ["implementer"] } } });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", model: "opus" }, lane("spec-producer", "b")] });
      const tip = head(), lines = plan();
      assert.deepEqual(lines.slice(0, 2), [`frontier lane ${SPEC} a`, `frontier lane ${SPEC} b`]);
      for (const [id, model] of [["a", "opus"], ["b", undefined]]) {
        const branch = `demo-spec-${id}`, role = `spec-producer-${id}`, path = join(at(), ".worktrees", branch);
        inOrder(lines, `hook before-creating-worktree ${role} ${path}`, `create-branch ${branch} ${tip}`, `create-worktree ${role} ${branch} ${path}`,
          `hook after-creating-worktree ${role} ${path}`, `hook before-spawning-agent ${role}`, `wake ${role} profile spec-producer`, `hook after-spawning-agent ${role}`,
          `hook before-merging-lanes ${role}`, `hook after-merging-lanes ${role}`);
        assert.deepEqual(wakeOf(lines, role), {
          profile: "spec-producer", lane: id, ...(model ? { model } : {}), phase: "1", worktree: path,
          assignment: join(gitDir(root), "worktrees", branch, "rp/spec-producer.md"), resources: ["suite", "browser tools"],
        });
      }
      assert.deepEqual(lines.filter((line) => /branch/.test(line) && line.startsWith("hook ")), []);
      assert.ok(lines.includes("hook phase-started 1"));
    });

    it("consolidate: the lanes to terminate first, their worktrees and branches to remove, and the root producer to wake on a fresh instance in the pipeline worktree", () => {
      conventions();
      pipeline(0, { lanes: SPEC_LANES });
      apply();
      produceCandidates();
      const lines = plan();
      assert.equal(lines[0], `frontier consolidate ${SPEC}`);
      for (const id of ["a", "b"]) {
        const role = `spec-producer-${id}`, path = laneWorktree(`demo-spec-${id}`);
        inOrder(lines, `hook before-terminating-agent ${role}`, `terminate ${role} profile spec-producer`, `terminate ${role} lane ${id}`, `hook after-terminating-agent ${role}`,
          `hook before-removing-worktree ${role} ${path}`, `remove-worktree ${role} ${path}`, `delete-branch demo-spec-${id}`, `hook after-removing-worktree ${role} ${path}`);
      }
      assert.deepEqual(wakeOf(lines, "spec-producer"), { profile: "spec-producer", phase: "1", worktree: at(), assignment: join(gitDir(root), "rp/spec-producer.md"), resources: [], fresh: true });
      assert.deepEqual(lines.filter((line) => line.startsWith("hook ") && / spec-producer$/.test(line)), ["hook before-spawning-agent spec-producer", "hook after-spawning-agent spec-producer"]);
      apply();
      assert.deepEqual([git(root, "branch", "--list", "demo-spec-*"), worktreePaths()], ["", [at()]]);
    });

    it("produce and respond: the artifact's owner in the pipeline worktree, and nothing to create", () => {
      conventions();
      pipeline(1);
      let lines = plan();
      assert.deepEqual([actions(lines), wakeOf(lines, "design-doc-producer").worktree, wakeOf(lines, "design-doc-producer").phase], [[], at(), "2"]);
      pipeline(3);
      thread(TO_SPEC);
      commitAll("thread");
      lines = plan();
      assert.deepEqual([lines[0], actions(lines), wakeOf(lines, "spec-producer").worktree], [`frontier respond ${SPEC}`, [], at()]);
    });

    it("review: each lane's branch at the change built from the tip, a worktree on it, and its reviewer to wake there with its first request", () => {
      conventions();
      pipeline(3, { lanes: [lane("reviewer", "default"), lane("reviewer", "second")] });
      writeFile("src/app.js", "export const a = 2;\n");
      const tip = commitAll("code");
      const lines = apply();
      for (const id of ["default", "second"]) {
        const branch = `demo-review-${id}`, path = laneWorktree(branch), change = git(root, "rev-parse", branch).trim();
        assert.ok(lines.includes(`create-branch ${branch} change`) && lines.includes(`create-worktree reviewer-${id} ${branch} ${path}`));
        assert.deepEqual([git(root, "log", "-1", "--format=%s", change), git(root, "log", "-1", "--format=%s", `${change}^`)], ["rp review change\n", "rp review base\n"]);
        assert.equal(git(root, "rev-parse", `${change}^^`).trim(), git(root, "merge-base", "main", tip).trim());
        assert.equal(git(root, "diff", tip, change, "--", ".", ":(exclude).pipelines"), "");
        assert.equal(head(path), change);
        assert.deepEqual([wakeOf(lines, `reviewer-${id}`).worktree, wakeOf(lines, `reviewer-${id}`).phase], [path, "4"]);
        assert.ok(readFileSync(wakeOf(lines, `reviewer-${id}`).assignment, "utf8").includes(` thread open ${join(path, PIPELINE)} --role reviewer-${id} `));
      }
    });

    it("INVALID: each role that writes a rejected file, where it sits, and each rejected file no role writes", () => {
      conventions({ resources: { suite: { resource: "The suite.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } } });
      pipeline(3);
      const between = thread({ n: 1, ...TO_SPEC, status: "pending" });
      const review = thread({ n: 2, ...REVIEW(), status: "pending" });
      write(INTENT, withFrontmatter({ issue: 7, pins: "x" }, "\n# Intent\n"));
      commitAll("rejected files");
      const STATUS = "status must be one of open | approved | withdrawn | answered | disagreement";
      const lines = apply();
      assert.deepEqual(lines.filter((line) => line.startsWith("frontier ") || line.startsWith("fix ")), [
        `frontier INVALID ${INTENT}: unexpected frontmatter key: pins`, `frontier INVALID ${between}: ${STATUS}`, `frontier INVALID ${review}: ${STATUS}`,
        `fix INVALID ${INTENT}: unexpected frontmatter key: pins`,
      ]);
      for (const role of ["spec-producer", "design-doc-producer"]) {
        assert.deepEqual([wakeOf(lines, role).worktree, wakeOf(lines, role).resources], [at(), ["suite"]]);
        assert.match(readFileSync(wakeOf(lines, role).assignment, "utf8"), new RegExp(`## Malformed files\n\nINVALID ${between}: ${STATUS.replaceAll("|", "\\|")}\n`));
      }
      const reviewer = wakeOf(lines, "reviewer-default");
      assert.deepEqual([reviewer.worktree, reviewer.resources], [laneWorktree("demo-review-default"), []]);
      assert.match(readFileSync(reviewer.assignment, "utf8"), /rejects these files you wrote/);
      assert.equal(wakeOf(lines, "implementer").worktree, at());
    });

    it("INVALID on a file no role writes: the file to fix, and no role to wake", () => {
      conventions();
      pipeline(1);
      write(INTENT, withFrontmatter({ issue: 7, pins: "x" }, "\n# Intent\n"));
      commitAll("a rejected intent");
      assert.deepEqual(plan(), [`frontier INVALID ${INTENT}: unexpected frontmatter key: pins`, `fix INVALID ${INTENT}: unexpected frontmatter key: pins`]);
    });

    it("escalate and complete: the frontier alone", () => {
      conventions();
      pipeline(3);
      const escalated = thread(TO_OWNER);
      commitAll("escalation");
      assert.deepEqual(plan(), [`frontier escalate ${escalated}`]);
      remove(escalated);
      pipeline(3, { targetPhase: 3 });
      assert.deepEqual(plan(), ["frontier complete"]);
    });
  });

  describe("with --apply", () => {
    it("changes exactly the worktrees, branches, and assignments the plan names, and applying again changes nothing", () => {
      conventions();
      pipeline(3, { lanes: [lane("reviewer", "a"), lane("reviewer", "b")] });
      writeFile("src/app.js", "export const a = 2;\n");
      const tip = commitAll("code"), status = git(root, "status", "--porcelain", "--untracked-files=all");
      const before = snapshot(), lines = apply(), after = snapshot();
      const named = lines.filter((line) => /-branch /.test(line) && !line.startsWith("hook ")).map((line) => `refs/heads/${line.split(" ")[1]}`);
      assert.deepEqual(after.refs.filter((ref) => !before.refs.includes(ref)).map((ref) => ref.split(" ")[0]), named);
      assert.deepEqual(before.refs.filter((ref) => !after.refs.includes(ref)), []);
      assert.deepEqual(after.worktrees.map(([path]) => path).slice(1), lines.filter((line) => line.startsWith("create-worktree ")).map((line) => line.split(" ").slice(3).join(" ")));
      assert.deepEqual(after.worktrees[0][2].map(([name]) => name), ["step.json"]);
      for (const id of ["a", "b"]) assert.equal(existsSync(wakeOf(lines, `reviewer-${id}`).assignment), true);
      assert.deepEqual([head(), git(root, "status", "--porcelain", "--untracked-files=all")], [tip, status]);
      const again = apply();
      assert.deepEqual(snapshot(), after);
      assert.deepEqual([actions(again), actions(plan())], [[], []]);
    });

    it("moves a remaining lane's branch and worktree forward to the tip, creating no worktree, its turn commit the new tip", () => {
      conventions();
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      produceCandidates(["a"]);
      write(INTENT, `${read(INTENT)}More.\n`);
      const tip = commitAll("the intent changes");
      const lines = apply(), wt = laneWorktree("demo-spec-a");
      assert.deepEqual(actions(lines), [`move-branch demo-spec-a ${tip}`]);
      assert.equal(head(wt), tip);
      assert.match(readFileSync(wakeOf(lines, "spec-producer-a").assignment, "utf8"), new RegExp(`- Turn commit: ${tip}\n[\\s\\S]*## Mode\n\nRespond\n`));
    });

    it("stops on a failed action naming it and its reason, keeps the actions it completed, and applies only the rest once the cause is gone", () => {
      conventions();
      pipeline(0, { lanes: SPEC_LANES });
      const blocked = laneWorktree("demo-spec-b");
      writeFile(".worktrees/demo-spec-b", "in the way\n");
      const first = run("next", abs(PIPELINE), "--apply");
      assert.equal(first.status, 1);
      assert.match(first.stderr, new RegExp(`^rp: next --apply: create-worktree ${blocked}: git worktree add .*already exists`, "m"));
      assert.deepEqual(worktreePaths(), [at(), laneWorktree("demo-spec-a")]);
      rmSync(abs(".worktrees/demo-spec-b"));
      const rest = plan();
      assert.deepEqual(rest.filter((line) => ACTIONS.test(line) || /-creating-worktree /.test(line)), [
        `hook before-creating-worktree spec-producer-b ${blocked}`, `create-worktree spec-producer-b demo-spec-b ${blocked}`, `hook after-creating-worktree spec-producer-b ${blocked}`,
      ]);
      const lines = apply();
      assert.deepEqual(worktreePaths(), [at(), laneWorktree("demo-spec-a"), blocked]);
      for (const id of ["a", "b"]) assert.equal(existsSync(wakeOf(lines, `spec-producer-${id}`).assignment), true);
    });
  });

  describe("keeps a lane's commits that did not land", () => {
    it("naming its turn alone to land, which applying leaves as it is", () => {
      conventions();
      pipeline(0, { lanes: SPEC_LANES });
      apply();
      const unlanded = commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate a\n" }, "candidate a");
      write(INTENT, `${read(INTENT)}More.\n`);
      commitAll("the intent changes");
      const before = snapshot();
      const expected = [`frontier lane ${SPEC} a`, `frontier lane ${SPEC} b`, "hook before-merging-lanes spec-producer-a", "land spec-producer-a", "hook after-merging-lanes spec-producer-a"];
      assert.deepEqual(apply(), expected);
      assert.deepEqual(snapshot(), before);
      landRole("spec-producer-a");
      git(root, "merge-base", "--is-ancestor", unlanded, "demo");
    });

    // [what, the lane, its role, its branch, the rejected file and its contents, the reason, the repaired contents]
    const repairs = [
      ["a production lane", [lane("spec-producer", "a")], 0, "spec-producer-a", "demo-spec-a", candidate("a"), withFrontmatter({ status: "done" }, "# a\n"), "carries no frontmatter", "# a\n"],
      ["a review lane", [lane("reviewer", "a")], 3, "reviewer-a", "demo-review-a", "threads/1-reviewer-a-implementer-implementation.md",
        withFrontmatter({ status: "pending", ...REVIEW("a") }, "\n## reviewer-a — abc1234\n\nFindings.\n"), "status must be one of open | approved | withdrawn | answered | disagreement",
        withFrontmatter({ status: "open", ...REVIEW("a") }, "\n## reviewer-a — abc1234\n\nFindings.\n")],
    ];
    for (const [what, lanes, upTo, role, branch, file, rejected, reason, repaired] of repairs)
      it(`waking ${what} whose landing would reject a file it wrote in its worktree as it stands, its next landing bringing both turns`, () => {
        conventions();
        pipeline(upTo, { lanes });
        apply();
        const wt = laneWorktree(branch), turn1 = commitIn(wt, { [file]: rejected }, "first turn");
        const stopped = run("land", abs(PIPELINE), "--role", role);
        assert.equal(stopped.status, 1);
        write(INTENT, `${read(INTENT)}More.\n`);
        commitAll("the intent changes");
        const lines = apply();
        assert.ok(lines.includes(`repair ${role} INVALID ${file}: ${reason}`), lines.join("\n"));
        assert.deepEqual([actions(lines), head(wt), wakeOf(lines, role).worktree], [[], turn1, wt]);
        assert.match(readFileSync(wakeOf(lines, role).assignment, "utf8"), new RegExp(`${turn1}[\\s\\S]*INVALID ${file}: ${reason.replaceAll("|", "\\|")}`));
        const turn2 = commitIn(wt, { [file]: repaired }, "repair");
        landRole(role);
        const unlanded = git(root, "cherry", "demo", turn2).split("\n").filter((line) => line.startsWith("+ ")).map((line) => line.slice(2));
        assert.deepEqual(unlanded.filter((commit) => [turn1, turn2].includes(commit)), []);
        assert.ok(read(file).includes(repaired.trim().split("\n").at(-1)));
      });
  });

  describe("names phase-started", () => {
    it("on the first step that wakes a role of a phase and on a step that resumes it, never on a step applied again", () => {
      conventions();
      pipeline(0);
      assert.ok(apply().includes("hook phase-started 1"));
      assert.deepEqual([plan(), apply()].map((lines) => lines.filter((line) => line.startsWith("hook phase-started"))), [[], []]);
      write(SPEC, "# Spec\n");
      commitAll("Add spec");
      landRole("spec-producer");
      assert.deepEqual(apply().filter((line) => line.startsWith("hook phase-started")), ["hook phase-started 2"]);
      thread({ ...TO_SPEC, messages: [["design-doc-producer", head()]] });
      commitAll("Open a thread to the spec");
      landRole("design-doc-producer");
      assert.deepEqual(apply().filter((line) => line.startsWith("hook phase-started")), ["hook phase-started 1"]);
    });
  });

  it("wakes a role whose turn did not land for the same work, with the same changed inputs and commits", () => {
    conventions();
    pipeline(2);
    write(INTENT, `${read(INTENT)}Changed.\n`);
    commitAll("the intent changes");
    const first = apply(), assignment = readFileSync(wakeOf(first, "spec-producer").assignment, "utf8");
    assert.match(assignment, /## Mode\n\nRespond\n[\s\S]*Changed inputs: .*intent\.md — changed since [0-9a-f]{40}/);
    const second = apply();
    assert.deepEqual([second, readFileSync(wakeOf(second, "spec-producer").assignment, "utf8")], [first.filter((line) => !line.startsWith("hook phase-started")), assignment]);
  });

  describe("and rp land take only their own options", () => {
    // [the arguments after the pipeline folder, what the message names]
    const misuses = [
      [["next", "--ref", "HEAD"], /^rp: next: unknown option: --ref$/m],
      [["next", "--role", "implementer"], /^rp: next: unknown option: --role$/m],
      [["next", "--lanes", "a,b"], /^rp: next: unknown option: --lanes$/m],
      [["next", "x"], /^rp: next: unexpected argument: x$/m],
      [["land", "--role", "implementer", "--at", "HEAD"], /^rp: land: unknown option: --at$/m],
      [["land", "--role", "implementer", "--candidates", "a"], /^rp: land: unknown option: --candidates$/m],
      [["land", "--apply"], /^rp: land: unknown option: --apply$/m],
      [["land"], /^rp: land: --role <role> is required$/m],
      [["land", "--role", "spec-producer-z"], /^rp: land: no turn of spec-producer-z is recorded/m],
    ];
    for (const [[command, ...args], message] of misuses)
      it(`stopping on rp ${command} ${args.join(" ")}`, () => {
        conventions();
        pipeline(1);
        const before = snapshot();
        const out = run(command, abs(PIPELINE), ...args);
        assert.deepEqual([out.status, out.stdout], [1, ""]);
        assert.match(out.stderr, message);
        assert.deepEqual(snapshot(), before);
      });

    for (const command of ["assign", "review", "stamp"])
      it(`and rp has no ${command} command`, () => {
        assert.match(run(command, abs(PIPELINE)).stderr, new RegExp(`^rp: unknown command: ${command}$`, "m"));
      });
  });

  it("reads a step record it wrote, and stops naming one that is malformed", () => {
    conventions();
    pipeline(1);
    apply();
    const record = join(gitDir(root), "rp/step.json");
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(record, "utf8"))), ["turns", "woke", "complete", "reported"]);
    const written = JSON.parse(readFileSync(record, "utf8"));
    assert.deepEqual(written.turns["design-doc-producer"], { worktree: at(), branch: "demo", commit: head() });
    const turn = { worktree: at(), branch: "demo-review-default", commit: head() };
    // [what, the record, the reason]
    const malformed = [
      ["a phase that is no phase", { ...written, woke: ["1"] }, "woke: must be a list of phases"],
      ["a turn commit that is no full commit hash", { ...written, turns: { "design-doc-producer": { ...turn, commit: "abc1234" } } }, "turns.design-doc-producer.commit: must be a full commit hash"],
      ["a reviewer's turn without its change", { ...written, turns: { "reviewer-default": turn } }, "turns.reviewer-default.change: must be a full commit hash"],
    ];
    for (const [what, data, reason] of malformed) {
      writeFile(".git/rp/step.json", `${JSON.stringify(data)}\n`);
      for (const args of [["next"], ["land", "--role", "reviewer-default"]])
        assert.match(run(args[0], abs(PIPELINE), ...args.slice(1)).stderr, new RegExp(`^rp: ${record.replaceAll(".", "\\.")}: ${reason}$`, "m"), what);
    }
  });
});
