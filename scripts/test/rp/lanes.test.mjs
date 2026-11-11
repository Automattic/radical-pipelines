import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, P, SPEC, TO_SPEC, abs, certification, certifyAt, check, commitAll, frontier, git, ignore, lane, later, pipeline, read, land, remove, revise, root, rp, thread, useRepo, write, writeFile } from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b"), lane("reviewer", "security")];
const candidate = (id, folder = "1-spec", name = "spec.md") => `${folder}/lanes/${id}/${name}`;
function produce(id) {
  write(candidate(id), `# Spec candidate ${id}\n`);
  land(candidate(id));
}
function consolidate() {
  write(SPEC, "# Spec\n");
  land(SPEC);
}

describe("production lanes", () => {
  useRepo();

  it("wake every configured lane of the lowest missing artifact", () => {
    pipeline(0, { lanes: SPEC_LANES });
    assert.deepEqual(frontier(), [`lane ${SPEC} a`, `lane ${SPEC} b`]);
    assert.equal(check().frontier[0].lane, "a");
  });

  it("wake only the lanes whose candidate is missing", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    assert.deepEqual(frontier(), [`lane ${SPEC} b`]);
  });

  it("wake a lane whose candidate is stale while the root is missing, with its changed inputs", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    write(INTENT, `${read(INTENT)}More.\n`);
    assert.deepEqual(frontier(), [`lane ${SPEC} a`, `lane ${SPEC} b`]);
    revise(candidate("a"));
    assert.deepEqual(check().frontier, [{ action: "lane", target: SPEC, lane: "b", changed: [INTENT] }]);
    assert.deepEqual(check().phases[0].lanes.map((entry) => [entry.id, entry.state]), [["a", "fresh"], ["b", "stale"]]);
  });

  // [root, its lanes, what the lanes read]
  const roots = [
    [SPEC, SPEC_LANES, 0, (id) => candidate(id)],
    [DESIGN, [lane("design-doc-producer", "a"), lane("design-doc-producer", "b")], 1, (id) => candidate(id, "2-design-doc", "design-doc.md")],
  ];
  for (const [root, lanes, upTo, candidateOf] of roots)
    it(`leave the candidates fresh on a later input targeting ${root}, which the consolidated root pins`, () => {
      pipeline(upTo, { lanes });
      for (const id of ["a", "b"]) {
        write(candidateOf(id), `# Candidate ${id}\n`);
        land(candidateOf(id));
      }
      write("0-intent/constraint-1.md", later(root));
      assert.deepEqual(frontier(), [`consolidate ${root}`]);
      assert.deepEqual(check().phases[upTo].lanes.map((entry) => entry.state), ["fresh", "fresh"]);
      write(root, "# Root\n");
      land(root);
      assert.equal(check().phases[upTo].state, "fresh");
      assert.ok(certification(root).inputs.some((pin) => pin.startsWith("0-intent/constraint-1.md@")));
    });

  it("consolidate once every candidate exists and is fresh", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    assert.deepEqual(frontier(), [`consolidate ${SPEC}`]);
  });

  it("a thread a waiting lane producer opened upstream wakes the upstream owner first", () => {
    pipeline(1, { lanes: [lane("design-doc-producer", "x")] });
    thread(TO_SPEC);
    assert.deepEqual(frontier(), [`respond ${SPEC}`]);
  });

  it("end once the root exists: a candidate change neither stales the root nor re-lanes", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    consolidate();
    assert.deepEqual(frontier(), [`produce ${DESIGN}`]);
    write(candidate("a"), "# Changed candidate\n");
    remove(candidate("b"));
    assert.deepEqual(frontier(), [`produce ${DESIGN}`]);
    assert.deepEqual(check().phases[0], { phase: "1-spec", artifact: SPEC, state: "fresh", lanes: [] });
  });

  it("end once the root exists: a stale root is responded to", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    consolidate();
    write(INTENT, `${read(INTENT)}More.\n`);
    assert.deepEqual(frontier(), [`respond ${SPEC}`]);
  });

  it("apply to the design doc with its own profile", () => {
    pipeline(1, { lanes: [...SPEC_LANES, lane("design-doc-producer", "x")] });
    assert.deepEqual(frontier(), [`lane ${DESIGN} x`]);
    write(candidate("x", "2-design-doc", "design-doc.md"), "# Design candidate\n");
    land(candidate("x", "2-design-doc", "design-doc.md"));
    assert.deepEqual(frontier(), [`consolidate ${DESIGN}`]);
  });

  it("are not configured by a review lane", () => {
    pipeline(0, { lanes: [lane("reviewer", "a")] });
    assert.deepEqual(frontier(), [`produce ${SPEC}`]);
  });

  it("candidates of a lane not configured for that profile are INVALID", () => {
    pipeline(0, { lanes: [lane("design-doc-producer", "a")] });
    write(candidate("a"), "# C\n");
    assert.deepEqual(frontier(), [`INVALID ${candidate("a")}`]);
  });

  it("files deeper in a lane folder are not pipeline files", () => {
    pipeline(0, { lanes: SPEC_LANES });
    write("1-spec/lanes/a/spec/spec.md", "# evidence\n");
    write("1-spec/lanes/a/evidence.txt", "x\n");
    assert.deepEqual(frontier(), [`lane ${SPEC} a`, `lane ${SPEC} b`]);
  });

  it("land in their own worktrees from one tip and merge into the pipeline branch, and it back into them, without conflict", () => {
    pipeline(0, { lanes: SPEC_LANES });
    const tip = commitAll("lanes woken");
    ignore(".wt-*/");
    for (const id of ["a", "b"]) {
      const worktree = `${root}/.wt-${id}`;
      git(root, "worktree", "add", "--quiet", "-b", `demo-spec-${id}`, worktree, tip);
      writeFile(`.wt-${id}/${P(candidate(id))}`, `# Spec candidate ${id}\n`);
      git(worktree, "add", "-A");
      git(worktree, "commit", "--quiet", "-m", `candidate ${id}`);
      certifyAt(tip, candidate(id), { worktree });
      git(worktree, "add", "-A");
      git(worktree, "commit", "--quiet", "-m", `land ${id}`);
    }
    for (const id of ["a", "b"]) git(root, "merge", "--quiet", "--no-edit", `demo-spec-${id}`);
    assert.deepEqual(check().phases[0].lanes.map((entry) => [entry.id, entry.state]), [["a", "fresh"], ["b", "fresh"]]);
    assert.deepEqual(frontier(), [`consolidate ${SPEC}`]);
    git(`${root}/.wt-a`, "merge", "--quiet", "--no-edit", "demo");
    assert.equal(git(`${root}/.wt-a`, "rev-parse", "HEAD^{tree}"), git(root, "rev-parse", "HEAD^{tree}"));
  });

  it("print one line per open lane above its artifact", () => {
    pipeline(0, { lanes: SPEC_LANES, targetPhase: 1 });
    produce("a");
    assert.equal(rp("check", abs(P(""))), `frontier lane ${SPEC} b\nlane ${SPEC} a fresh\nlane ${SPEC} b missing\nartifact ${SPEC} missing\n`);
  });

  describe("lane roles", () => {
    // [what, lanes configured, thread fields, INVALID reason or null]
    const awaitingLane = (opener, owner, artifact, ownerLast = false) => ({ opener, owner, artifact, messages: [[opener, "aaaaaaa"], ...(ownerLast ? [[owner, "bbbbbbb"]] : [])] });
    const NO_THREADS = "production lanes open no threads";
    const NOT_CONFIGURED = "lane not configured; close the thread withdrawn";
    const DOC_LANE = [lane("design-doc-producer", "a")];
    const cases = [
      ["an open thread opened by a production lane", DOC_LANE, awaitingLane("design-doc-producer-a", "spec-producer", "spec"), NO_THREADS],
      ["an open thread addressed to a production lane", DOC_LANE, awaitingLane("design-doc-producer", "design-doc-producer-a", "design-doc"), NO_THREADS],
      ["a disagreement opened by a production lane", [], { ...awaitingLane("spec-producer-a", "owner", "intent"), status: "disagreement" }, NO_THREADS],
      ["a withdrawn thread opened by a production lane", [], { ...awaitingLane("design-doc-producer-gone", "spec-producer", "spec", true), status: "withdrawn" }, NO_THREADS],
      ["an approved thread addressed to a production lane", [], { ...awaitingLane("implementer", "spec-producer-gone", "spec", true), status: "approved" }, NO_THREADS],
      ["an answered thread opened by a production lane", [], { ...awaitingLane("spec-producer-gone", "owner", "intent"), status: "answered" }, NO_THREADS],
      ["an open thread awaiting a dropped review lane", [lane("reviewer", "x")], awaitingLane("reviewer-gone", "implementer", "implementation", true), NOT_CONFIGURED],
      ["an open thread awaiting reviewer-default once review lanes are configured", [lane("reviewer", "x")], awaitingLane("reviewer-default", "implementer", "implementation", true), NOT_CONFIGURED],
      ["an open thread awaiting reviewer-default with no review lane configured", [], awaitingLane("reviewer-default", "implementer", "implementation", true), null],
      ["an open thread awaiting a configured review lane", [lane("reviewer", "x")], awaitingLane("reviewer-x", "implementer", "implementation", true), null],
      ["an open thread of a dropped review lane awaiting a configured role", [lane("reviewer", "x")], awaitingLane("reviewer-gone", "implementer", "implementation"), null],
    ];
    for (const [what, lanes, fields, reason] of cases)
      it(`${reason ? "rejects" : "accepts"} ${what}`, () => {
        pipeline(3, { lanes: lanes.length ? lanes : undefined });
        const path = thread(fields);
        const invalid = check().frontier.filter((entry) => entry.action === "INVALID");
        assert.deepEqual(invalid, reason ? [{ action: "INVALID", target: path, reason }] : []);
      });

    it("a removed lane's closed threads stay valid history", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ status: "withdrawn", opener: "reviewer-gone", owner: "implementer", artifact: "implementation" });
      thread({ status: "approved", opener: "reviewer-gone", owner: "spec-producer", artifact: "spec" });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });
});
