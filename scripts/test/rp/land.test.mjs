import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, SPEC, TO_SPEC, UPSTREAM,
  abs, apply, certification, check, commitAll, commitIn, conventions, git, landRole, lane, laneWorktree, later, pipeline, read, root, run, thread, useRepo, withFrontmatter, write,
} from "./fixture.mjs";

const head = (at = root) => git(at, "rev-parse", "HEAD").trim();
const id = (rel, at = "HEAD") => git(root, "rev-parse", `${at}:${P(rel)}`).slice(0, 12);
const pin = (rel, at) => `${rel}@${id(rel, at)}`;
const subjects = (...range) => git(root, "log", "--format=%s", ...range).split("\n").filter(Boolean);
const candidate = (id, phase = "1-spec", name = "spec.md") => `${phase}/lanes/${id}/${name}`;
// Everything a stopped landing leaves as it was: every ref, the pipeline worktree's status, and each certification.
const untouched = () => [git(root, "for-each-ref", "--format=%(refname) %(objectname)"), git(root, "status", "--porcelain", "--untracked-files=all"),
  git(root, "ls-tree", "-r", "HEAD", "--", P("certification"))];
const LANDING = { "landing-commit": "{subject} (orchestrator)" };

describe("rp land", () => {
  useRepo();

  describe("lands a turn", () => {
    it("of a production lane: merges its branch, certifies its candidate at its turn commit, and commits", () => {
      conventions(LANDING);
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      const turn = head();
      apply();
      write(INTENT, `${read(INTENT)}Changed while the lane worked.\n`);
      commitAll("the intent changes");
      const work = commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "Add a candidate");
      const before = head();
      assert.equal(landRole("spec-producer-a"), "");
      git(root, "merge-base", "--is-ancestor", work, "demo");
      assert.deepEqual(subjects(`--first-parent`, `${before}..HEAD`), ["Certify spec lane a candidate (orchestrator)", "Merge spec lane a (orchestrator)"]);
      assert.equal(read(candidate("a")), "# Candidate\n");
      assert.deepEqual(certification(candidate("a")), { inputs: [pin(INTENT, turn)] });
      assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), "");
      assert.deepEqual(check().phases[0].lanes, [{ id: "a", path: candidate("a"), state: "stale", stale: [INTENT] }]);
    });

    it("of a review lane: picks its commits after its change onto the pipeline branch, none that built the change", () => {
      conventions();
      pipeline(3);
      apply();
      const wt = laneWorktree("demo-review-default"), change = head(wt);
      const path = "threads/1-reviewer-default-implementer-implementation.md";
      commitIn(wt, { [path]: withFrontmatter({ status: "approved", ...REVIEW() }, `\n## reviewer-default — ${change}\n\nMerge it.\n`) }, "Approve");
      const before = head();
      assert.equal(landRole("reviewer-default"), "hook phase-completed 4\n");
      assert.deepEqual(subjects(`${before}..HEAD`), ["Certify review lane default approval", "Approve"]);
      assert.deepEqual(certification(path), { inputs: [pin(INTENT, change)], reviewed: git(root, "rev-parse", "HEAD^").trim() });
      assert.deepEqual(subjects(`${before}..HEAD`).filter((subject) => subject.startsWith("rp review")), []);
      assert.deepEqual(check().reviews, [{ lane: "default", approved: true }]);
    });

    it("of a consolidation in the pipeline worktree: certifies the root at the turn commit, pinning the intent and the later inputs targeting it there", () => {
      conventions(LANDING);
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "Add a candidate");
      landRole("spec-producer-a");
      write("0-intent/constraint-1.md", later(SPEC));
      write("0-intent/proposal-2.md", later(DESIGN));
      commitAll("later inputs");
      const turn = head();
      apply();
      write(SPEC, "# Spec\n");
      commitAll("Consolidate the spec (spec-producer)");
      assert.equal(landRole("spec-producer"), "hook phase-completed 1\n");
      assert.deepEqual(certification(SPEC), { inputs: [pin("0-intent/constraint-1.md", turn), pin(INTENT, turn)] });
      assert.deepEqual([subjects("-1"), git(root, "status", "--porcelain", "--untracked-files=all")], [["Certify spec (orchestrator)"], ""]);
      assert.equal(check().phases[0].state, "fresh");
    });

    it("of each role a rejected thread woke in the pipeline worktree: each one's artifact at its turn commit", () => {
      conventions();
      pipeline(2);
      const path = thread({ ...TO_SPEC, status: "pending" });
      write(INTENT, `${read(INTENT)}Changed.\n`);
      const turn = commitAll("a rejected thread, and a changed intent");
      apply();
      write(path, read(path).replace("status: pending", "status: open"));
      commitAll("Repair the thread (spec-producer)");
      for (const role of ["spec-producer", "design-doc-producer"]) landRole(role);
      assert.deepEqual([certification(SPEC).inputs, certification(DESIGN).inputs], [[pin(INTENT, turn)], [pin(SPEC, turn)]]);
    });

    for (const rel of [SPEC, DESIGN, NOTES])
      it(`certifying ${rel} with its upstream artifacts and the later inputs targeting it`, () => {
        conventions();
        pipeline(3, { targetPhase: 3 });
        write("0-intent/constraint-1.md", later(`${rel}#item-1`));
        write("0-intent/proposal-1.md", later([SPEC, DESIGN, NOTES].find((path) => path !== rel)));
        const turn = commitAll("later inputs");
        const owner = { [SPEC]: "spec-producer", [DESIGN]: "design-doc-producer", [NOTES]: "implementer" }[rel];
        let lines = apply();
        while (!lines.some((line) => line === `wake ${owner} profile ${owner}`)) {
          const woken = lines.find((line) => /^wake \S+ profile /.test(line)).split(" ")[1];
          landRole(woken);
          lines = apply();
        }
        const at = head();
        write(rel, `${read(rel)}Revised.\n`);
        commitAll("revise");
        landRole(owner);
        assert.deepEqual(certification(rel).inputs, [...UPSTREAM[rel].map((path) => pin(path, at)), pin("0-intent/constraint-1.md", turn)].sort());
      });

    for (const [rel, upTo, profile, target] of [[candidate("a"), 0, "spec-producer", SPEC], [candidate("a", "2-design-doc", "design-doc.md"), 1, "design-doc-producer", DESIGN]])
      it(`certifying ${rel} with its root's upstream artifacts alone, not the later inputs targeting its root`, () => {
        conventions();
        pipeline(upTo, { lanes: [lane(profile, "a")] });
        write("0-intent/constraint-1.md", later(target));
        const turn = commitAll("a later input");
        apply();
        commitIn(laneWorktree(`demo-${target === SPEC ? "spec" : "design-doc"}-a`), { [rel]: "# Candidate\n" }, "Add a candidate");
        landRole(`${profile}-a`);
        assert.deepEqual(certification(rel).inputs, UPSTREAM[target].map((path) => pin(path, turn)));
      });

    it("that left its artifact unchanged, making the artifact fresh at the inputs the turn read", () => {
      conventions();
      pipeline(3);
      write(INTENT, `${read(INTENT)}Clarified.\n`);
      commitAll("the intent changes");
      apply();
      landRole("spec-producer");
      assert.equal(check().phases[0].state, "fresh");
    });

    it("whose role's artifact no longer pins an input it no longer requires", () => {
      conventions();
      pipeline(1);
      write("0-intent/failure-1.md", later(SPEC));
      commitAll("a failure");
      apply();
      landRole("spec-producer");
      assert.equal(certification(SPEC).inputs.length, 2);
      write("0-intent/failure-1.md", later(DESIGN));
      thread({ ...TO_SPEC, messages: [["design-doc-producer", head()]] });
      commitAll("the failure moves, a thread to the spec");
      apply();
      landRole("spec-producer");
      assert.deepEqual(certification(SPEC).inputs, [pin(INTENT)]);
    });

    it("making no commit when it changes no certification and brings no commit", () => {
      conventions(LANDING);
      pipeline(3);
      const path = thread({ ...TO_SPEC, opener: "implementer", messages: [["implementer", head()]] });
      commitAll("a thread to the spec");
      apply();
      write(path, `${read(path)}\n## spec-producer — ${head()}\n\nIt stands.\n`);
      const answered = commitAll("Answer the thread (spec-producer)");
      landRole("spec-producer");
      assert.equal(head(), answered);
    });

    it("with each commit's subject alone without a landing commit template", () => {
      conventions();
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "Add a candidate");
      const before = head();
      landRole("spec-producer-a");
      assert.deepEqual(subjects(`--first-parent`, `${before}..HEAD`), ["Certify spec lane a candidate", "Merge spec lane a"]);
    });
  });

  describe("prints the phases its landing made complete", () => {
    it("for a consolidation that makes the spec fresh, phase 1, and for a production lane while the root is missing, none", () => {
      conventions();
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# Candidate\n" }, "Add a candidate");
      assert.equal(landRole("spec-producer-a"), "");
      apply();
      write(SPEC, "# Spec\n");
      commitAll("Consolidate the spec");
      assert.equal(landRole("spec-producer"), "hook phase-completed 1\n");
    });

    it("for one review lane's approval while another is not approved, none, and for the last one's, phase 4", () => {
      conventions();
      pipeline(3, { lanes: [lane("reviewer", "a"), lane("reviewer", "b")] });
      apply();
      const approve = (laneId, n) => {
        const wt = laneWorktree(`demo-review-${laneId}`);
        commitIn(wt, { [`threads/${n}-reviewer-${laneId}-implementer-implementation.md`]: withFrontmatter({ status: "approved", ...REVIEW(laneId) }, `\n## reviewer-${laneId} — ${head(wt)}\n`) }, "Approve");
        return landRole(`reviewer-${laneId}`);
      };
      assert.deepEqual([approve("a", 1), approve("b", 1)], ["", "hook phase-completed 4\n"]);
    });

    it("for the spec-producer's answer to the implementer's thread, the spec unchanged and notes.md not done, phases 1 and 2", () => {
      conventions();
      pipeline(2);
      const path = thread({ ...TO_SPEC, opener: "implementer", messages: [["implementer", head()]] });
      commitAll("a thread to the spec");
      apply();
      write(path, `${read(path)}\n## spec-producer — ${head()}\n\nIt stands.\n`);
      commitAll("Answer the thread");
      assert.equal(landRole("spec-producer"), "hook phase-completed 1\nhook phase-completed 2\n");
    });

    it("for the second of two landings of one step that each leave a phase complete, none", () => {
      conventions();
      pipeline(2);
      const path = thread({ ...TO_SPEC, status: "pending", messages: [["design-doc-producer", "abc1234"], ["spec-producer", "abc1234"]] });
      commitAll("a rejected thread");
      apply();
      write(path, read(path).replace("status: pending", "status: approved"));
      commitAll("Repair the thread");
      assert.deepEqual([landRole("spec-producer"), landRole("design-doc-producer")], ["hook phase-completed 1\nhook phase-completed 2\n", ""]);
    });
  });

  describe("stops, landing nothing", () => {
    it("on a role whose branch lacks its turn commit, naming its worktree", () => {
      conventions();
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      const wt = laneWorktree("demo-spec-a");
      git(wt, "reset", "--quiet", "--hard", "main");
      const before = untouched();
      const out = run("land", abs(PIPELINE), "--role", "spec-producer-a");
      assert.equal(out.status, 1);
      assert.match(out.stderr, new RegExp(`^rp: land: ${wt}: demo-spec-a does not hold the turn commit [0-9a-f]{40}$`, "m"));
      assert.deepEqual(untouched(), before);
    });

    // [what, the lane, the phase it starts at, its role, its branch, the file and its contents, the reason]
    const rejections = [
      ["a candidate with frontmatter", [lane("spec-producer", "a")], 0, "spec-producer-a", "demo-spec-a", candidate("a"), withFrontmatter({ status: "done" }, "# a\n"), "carries no frontmatter"],
      ["a review thread with status pending", [lane("reviewer", "a")], 3, "reviewer-a", "demo-review-a", "threads/1-reviewer-a-implementer-implementation.md",
        withFrontmatter({ status: "pending", ...REVIEW("a") }, "\n## reviewer-a — abc1234\n"), "status must be one of open | approved | withdrawn | answered | disagreement"],
    ];
    for (const [what, lanes, upTo, role, branch, file, contents, reason] of rejections)
      it(`on ${what} the turn brings, naming it with the reason rp check gives`, () => {
        conventions();
        pipeline(upTo, { lanes });
        apply();
        const wt = laneWorktree(branch);
        commitIn(wt, { [file]: contents }, "turn");
        const before = untouched();
        const out = run("land", abs(PIPELINE), "--role", role);
        assert.deepEqual([out.status, out.stdout], [1, ""]);
        assert.equal(out.stderr, `rp: land: ${wt}: rp check rejects files the turn brings:\nINVALID ${file}: ${reason}\n`);
        assert.deepEqual(untouched(), before);
      });

    it("on a landing that conflicts", () => {
      conventions();
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      apply();
      commitIn(laneWorktree("demo-spec-a"), { [candidate("a")]: "# The lane's\n" }, "candidate");
      write(candidate("a"), "# Another\n");
      commitAll("the same path on the pipeline branch");
      const before = untouched();
      const out = run("land", abs(PIPELINE), "--role", "spec-producer-a");
      assert.equal(out.status, 1);
      assert.match(out.stderr, new RegExp(`^rp: land: ${laneWorktree("demo-spec-a")}: landing demo-spec-a conflicts on ${P(candidate("a")).replaceAll(".", "\\.")}$`, "m"));
      assert.deepEqual(untouched(), before);
    });
  });

  it("certifies at the turn commit whatever it holds that the certification does not read", () => {
    conventions();
    pipeline(3);
    const path = thread({ ...TO_SPEC, status: "pending" });
    write(NOTES, "---\nstatus: [done]\n---\n");
    commitAll("a rejected thread, a rejected notes.md");
    apply();
    write(path, read(path).replace("status: pending", "status: open"));
    commitAll("Repair the thread");
    landRole("spec-producer");
    assert.ok(certification(SPEC));
  });
});
