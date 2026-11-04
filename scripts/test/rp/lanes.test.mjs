import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, P, SPEC, TO_SPEC, abs, check, frontier, lane, pipeline, read, remove, rp, stamp, thread, useRepo, write } from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b"), lane("reviewer", "security")];
const candidate = (id, folder = "1-spec", name = "spec.md") => `${folder}/lanes/${id}/${name}`;
function produce(id) {
  write(candidate(id), `# Spec candidate ${id}\n`);
  stamp(candidate(id));
}
function consolidate() {
  write(SPEC, "# Spec\n");
  stamp(SPEC, candidate("a"), candidate("b"));
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
    write("0-intent/constraint-1.md", `target: ${SPEC}\n`);
    assert.deepEqual(frontier(), [`lane ${SPEC} a`, `lane ${SPEC} b`]);
    stamp(candidate("a"));
    assert.deepEqual(check().frontier, [{ action: "lane", target: SPEC, lane: "b", threads: [], changed: ["0-intent/constraint-1.md"] }]);
    assert.deepEqual(check().phases[0].lanes.map((entry) => [entry.id, entry.state]), [["a", "fresh"], ["b", "stale"]]);
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
    stamp(candidate("x", "2-design-doc", "design-doc.md"));
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
      stamp(candidate("a", "2-design-doc", "design-doc.md"));
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

    it("a thread awaiting a lane no longer configured is still its work", () => {
      pipeline(2, { lanes: [lane("reviewer", "x")] });
      toSpec("gone", 1, true);
      assert.deepEqual(frontier(), [`lane ${DESIGN} gone`]);
    });

    it("a removed lane's closed threads stay valid history", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ status: "closed: withdrawn", opener: "design-doc-producer-gone", owner: "spec-producer", artifact: "spec" });
      thread({ status: "closed: approved", opener: "reviewer-gone", owner: "spec-producer", artifact: "spec" });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });
});
