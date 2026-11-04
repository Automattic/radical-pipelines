import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, P, SPEC, TO_SPEC, abs, check, frontier, lane, pipeline, read, land, remove, revise, rp, thread, useRepo, write } from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b"), lane("reviewer", "security")];
const candidate = (id, folder = "1-spec", name = "spec.md") => `${folder}/lanes/${id}/${name}`;
function produce(id) {
  write(candidate(id), `# Spec candidate ${id}\n`);
  land(candidate(id));
}
function consolidate() {
  write(SPEC, "# Spec\n");
  land(SPEC, candidate("a"), candidate("b"));
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
    assert.deepEqual(check().frontier, [{ action: "lane", target: SPEC, lane: "b", threads: [], changed: [INTENT] }]);
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
      write("0-intent/constraint-1.md", `target: ${root}\n`);
      assert.deepEqual(frontier(), [`consolidate ${root}`]);
      assert.deepEqual(check().phases[upTo].lanes.map((entry) => entry.state), ["fresh", "fresh"]);
      write(root, "# Root\n");
      land(root, candidateOf("a"), candidateOf("b"));
      assert.equal(check().phases[upTo].state, "fresh");
      assert.match(read(root), /0-intent\/constraint-1\.md@/);
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

  it("print one line per open lane above its artifact", () => {
    pipeline(0, { lanes: SPEC_LANES, targetPhase: 1 });
    produce("a");
    assert.equal(rp("check", abs(P(""))), `frontier lane ${SPEC} b\nlane ${SPEC} a fresh\nlane ${SPEC} b missing\nartifact ${SPEC} missing\n`);
  });

  describe("lane roles", () => {
    const LANES = [lane("design-doc-producer", "a"), lane("design-doc-producer", "b")];
    const toSpec = (laneId, n = 1, replied = false) => thread({ n, opener: `design-doc-producer-${laneId}`, owner: "spec-producer", artifact: "spec",
      messages: [[`design-doc-producer-${laneId}`, "aaaaaaa"], ...(replied ? [["spec-producer", "bbbbbbb"]] : [])] });

    it("two lanes open threads with the same number to the upstream owner", () => {
      pipeline(1, { lanes: LANES });
      toSpec("a");
      toSpec("b");
      assert.deepEqual(check().frontier, [{ action: "respond", target: SPEC, threads: ["threads/1-design-doc-producer-a-spec-producer-spec.md", "threads/1-design-doc-producer-b-spec-producer-spec.md"] }]);
    });

    it("a reply wakes the lane that opened the thread, with the thread, even when its candidate is fresh", () => {
      pipeline(1, { lanes: LANES });
      write(candidate("a", "2-design-doc", "design-doc.md"), "# a\n");
      land(candidate("a", "2-design-doc", "design-doc.md"));
      toSpec("a", 1, true);
      assert.deepEqual(check().frontier, [
        { action: "lane", target: DESIGN, lane: "b", threads: [] },
        { action: "lane", target: DESIGN, lane: "a", threads: ["threads/1-design-doc-producer-a-spec-producer-spec.md"] },
      ]);
    });

    it("a thread awaiting a lane is its work after the root exists", () => {
      pipeline(2, { lanes: LANES });
      thread({ opener: "design-doc-producer", owner: "design-doc-producer-b", artifact: "design-doc" });
      assert.deepEqual(frontier(), [`lane ${DESIGN} b`]);
    });

    // [what, lanes configured, thread fields, INVALID]
    const awaitingLane = (opener, owner, artifact, ownerLast = false) => ({ opener, owner, artifact, messages: [[opener, "aaaaaaa"], ...(ownerLast ? [[owner, "bbbbbbb"]] : [])] });
    const dropped = [
      ["a disagreement opened by a dropped lane", [], awaitingLane("spec-producer-gone", "owner", "intent"), false],
      ["an open thread awaiting a dropped design doc lane", [], awaitingLane("design-doc-producer-gone", "spec-producer", "spec", true), true],
      ["an open thread awaiting a dropped spec lane, as owner", [], awaitingLane("design-doc-producer", "spec-producer-gone", "spec"), true],
      ["an open thread awaiting a dropped review lane", [lane("reviewer", "x")], awaitingLane("reviewer-gone", "implementer", "implementation", true), true],
      ["an open thread awaiting reviewer-default once review lanes are configured", [lane("reviewer", "x")], awaitingLane("reviewer-default", "implementer", "implementation", true), true],
      ["an open thread awaiting reviewer-default with no review lane configured", [], awaitingLane("reviewer-default", "implementer", "implementation", true), false],
      ["an open thread awaiting a configured lane", [lane("design-doc-producer", "a")], awaitingLane("design-doc-producer-a", "spec-producer", "spec", true), false],
      ["an open thread of a dropped lane awaiting a configured role", [], awaitingLane("design-doc-producer-gone", "spec-producer", "spec"), false],
      ["a withdrawn thread of a dropped lane", [], { ...awaitingLane("design-doc-producer-gone", "spec-producer", "spec", true), status: "closed: withdrawn" }, false],
    ];
    for (const [what, lanes, fields, isInvalid] of dropped)
      it(`${isInvalid ? "rejects" : "accepts"} ${what}`, () => {
        pipeline(3, { lanes: lanes.length ? lanes : undefined });
        if (fields.owner === "owner") fields.status = "disagreement";
        const path = thread(fields);
        const invalid = check().frontier.filter((entry) => entry.action === "INVALID");
        assert.deepEqual(invalid, isInvalid ? [{ action: "INVALID", target: path, reason: "lane not configured; close the thread withdrawn" }] : []);
      });

    it("a removed lane's closed threads stay valid history", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ status: "closed: withdrawn", opener: "design-doc-producer-gone", owner: "spec-producer", artifact: "spec" });
      thread({ status: "closed: approved", opener: "reviewer-gone", owner: "spec-producer", artifact: "spec" });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });
});
