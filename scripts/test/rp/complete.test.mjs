import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, NOTES, REVIEW, SPEC, TO_DESIGN, TO_SPEC, approve, check, commitAll, lane, pipeline, remove, revise, thread, useRepo, withFrontmatter, write } from "./fixture.mjs";

const complete = () => check().complete;

describe("complete phases", () => {
  useRepo();

  // [what, how the pipeline is built, the complete phases]
  const cases = [
    ["no artifact", () => pipeline(0), []],
    ["the spec fresh", () => pipeline(1), [1]],
    ["the spec fresh and a thread awaiting the spec-producer", () => { pipeline(2); thread(TO_SPEC); }, []],
    ["the spec stale", () => { pipeline(3); write("0-intent/intent.md", "---\nissue: 7\n---\n\n# Intent\n\nChanged.\n"); }, []],
    ["the design doc fresh above a stale spec", () => { pipeline(2); write("0-intent/intent.md", "---\nissue: 7\n---\n\n# Intent\n\nChanged.\n"); }, []],
    ["the spec and the design doc fresh, a thread awaiting the design-doc-producer", () => { pipeline(2); thread(TO_DESIGN); }, [1]],
    ["notes.md fresh but not done", () => { pipeline(2); write(NOTES, withFrontmatter({ status: "in progress" }, "\n# Notes\n")); revise(NOTES, ""); }, [1, 2]],
    ["notes.md done and fresh, no review lane approved", () => pipeline(3), [1, 2, 3]],
    ["notes.md done, a thread awaiting the implementer", () => { pipeline(3); thread(REVIEW()); }, [1, 2]],
    ["every review lane approved", () => { pipeline(3); approve(); }, [1, 2, 3, 4]],
    ["one of two review lanes approved", () => { pipeline(3, { lanes: [lane("reviewer", "a"), lane("reviewer", "b")] }); approve("a"); }, [1, 2, 3]],
    ["every review lane approved, a thread awaiting a reviewer", () => {
      pipeline(3);
      approve();
      thread({ n: 2, opener: "reviewer-default", owner: "spec-producer", artifact: "spec", messages: [["reviewer-default", "aaaaaaa"], ["spec-producer", "bbbbbbb"]] });
    }, [1, 2, 3]],
    ["phases beyond the target", () => pipeline(3, { targetPhase: 2 }), [1, 2]],
    ["the spec missing below a fresh design doc", () => { pipeline(2); remove(SPEC); commitAll("spec removed"); }, []],
  ];
  for (const [what, build, phases] of cases)
    it(`are, with ${what}, ${phases.length ? phases.join(", ") : "none"}`, () => {
      build();
      assert.deepEqual(complete(), phases);
    });

  it("are not reported on an INVALID frontier, as the phases are not", () => {
    pipeline(3);
    write(DESIGN, "---\n---\n# Design doc\n");
    const report = check();
    assert.deepEqual([report.phases, report.complete], [undefined, undefined]);
  });
});
