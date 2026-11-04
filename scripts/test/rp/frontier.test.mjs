import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, NOTES, P, SPEC, abs, check, commitAll, configure, frontier, lane, pipeline, read, remove, rp, stamp, thread, useRepo, write, writeFile } from "./fixture.mjs";

const T = (name) => `threads/${name}`;
// A reviewer's thread closed approved at the current net change.
function approve(name, laneId = "review") {
  thread(name, { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: laneId });
  rp("stamp", abs(P(T(name))), "--reviewed");
}
const awaitingSpec = (name = "1-design-doc-producer-spec-producer-spec.md") =>
  thread(name, { opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC });
const repliedBySpec = (name = "1-design-doc-producer-spec-producer-spec.md") =>
  thread(name, { opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC, messages: [["design-doc-producer", "abc1234"], ["spec-producer", "def5678"]] });

describe("frontier", () => {
  useRepo();

  describe("1. INVALID", () => {
    it("names every malformed file and precedes every other rule", () => {
      pipeline(0);
      thread("1-reviewer-orchestrator-intent.md", { status: "disagreement", opener: "reviewer", owner: "orchestrator", artifact: INTENT, lane: "review", territory: "owner" });
      write(DESIGN, "---\n{\n---\n");
      write("threads/2-x.md", "status: open\n");
      const report = check();
      assert.deepEqual(report.frontier.map((entry) => `${entry.action} ${entry.target}`), [`INVALID ${DESIGN}`, "INVALID threads/2-x.md"]);
      assert.ok(report.frontier.every((entry) => entry.reason));
      assert.equal(report.phases, undefined);
    });

    it("prints INVALID <path>: <reason> as the frontier line", () => {
      pipeline(0);
      write(SPEC, "---\n{\"pins\": []}\n---\n");
      assert.equal(rp("check", abs(P(""))).trim(), `frontier INVALID ${SPEC}: unexpected frontmatter key: pins`);
    });

    const files = [
      ["run-config.md missing", () => remove("run-config.md"), "run-config.md"],
      ["run-config.md without frontmatter", () => write("run-config.md", "target-phase: 4\n"), "run-config.md"],
      ["target-phase out of range", () => configure({ targetPhase: 5 }), "run-config.md"],
      ["target-phase not an integer", () => configure({ targetPhase: "4" }), "run-config.md"],
      ["an empty base", () => configure({ base: " " }), "run-config.md"],
      ["an unknown run-config key", () => write("run-config.md", '---\n{"target-phase": 4, "base": "main", "workflow": "autonomous"}\n---\n'), "run-config.md"],
      ["a lane with an unknown profile", () => configure({ lanes: [lane("spec-reviewer", "a")] }), "run-config.md"],
      ["a lane without brief", () => configure({ lanes: [{ profile: "reviewer", id: "a" }] }), "run-config.md"],
      ["a lane with a malformed id", () => configure({ lanes: [lane("reviewer", "A b")] }), "run-config.md"],
      ["a lane with an unknown key", () => configure({ lanes: [{ ...lane("reviewer", "a"), after: [] }] }), "run-config.md"],
      ["a duplicate lane", () => configure({ lanes: [lane("reviewer", "a"), lane("reviewer", "a")] }), "run-config.md"],
      ["unclosed frontmatter", () => write(SPEC, "---\n{}\n"), SPEC],
      ["frontmatter that is not an object", () => write(SPEC, "---\n[]\n---\n"), SPEC],
      ["inputs on the intent", () => write(INTENT, '---\n{"inputs": []}\n---\n# I\n'), INTENT],
      ["an inputs entry without identity", () => write(SPEC, `---\n{"inputs": ["${INTENT}"]}\n---\n`), SPEC],
      ["an inputs entry naming a non-artifact", () => write(SPEC, '---\n{"inputs": ["notes.txt@0123456789ab"]}\n---\n'), SPEC],
      ["an input pinned twice", () => write(SPEC, `---\n{"inputs": ["${INTENT}@0123456789ab", "${INTENT}@0123456789ac"]}\n---\n`), SPEC],
      ["a later input without target", () => write("0-intent/constraint-1.md", "# Constraint 1\n"), "0-intent/constraint-1.md"],
      ["a later input targeting a non-artifact", () => write("0-intent/proposal-1.md", "target: 0-intent/intent.md\n"), "0-intent/proposal-1.md"],
      ["a candidate of an unconfigured lane", () => write("1-spec/lanes/x/spec.md", "# C\n"), "1-spec/lanes/x/spec.md"],
    ];
    for (const [name, mutate, path] of files)
      it(`holds for ${name}`, () => {
        pipeline(1);
        mutate();
        assert.deepEqual(frontier().map((line) => line.split(" ").slice(0, 2).join(" ")), [`INVALID ${path}`]);
      });
  });

  describe("2. escalation", () => {
    it("holds for a disagreement on owner territory, before a missing artifact", () => {
      pipeline(0);
      thread("1-design-doc-producer-spec-producer-spec.md", { status: "disagreement", opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC, territory: "owner" });
      thread("2-reviewer-implementer-notes.md", { status: "disagreement", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", territory: "owner" });
      assert.deepEqual(frontier(), ["escalation threads/1-design-doc-producer-spec-producer-spec.md", "escalation threads/2-reviewer-implementer-notes.md"]);
    });

    it("does not hold for a disagreement outside owner territory: the addressee of the last message acts", () => {
      pipeline(3);
      thread("1-design-doc-producer-spec-producer-spec.md", { status: "disagreement", opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC });
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    });

    it("does not hold for an open thread on owner territory", () => {
      pipeline(3);
      thread("1-design-doc-producer-spec-producer-spec.md", { opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC, territory: "owner" });
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    });
  });

  describe("3. produce or respond, lowest phase first", () => {
    it("produces the intent when it is missing", () => {
      configure();
      write(SPEC, "# Spec\n");
      assert.deepEqual(frontier(), [`produce ${INTENT}`]);
    });

    for (const [upTo, artifact] of [[0, SPEC], [1, DESIGN], [2, NOTES]])
      it(`produces ${artifact} when it is the lowest missing artifact`, () => {
        pipeline(upTo);
        assert.deepEqual(frontier(), [`produce ${artifact}`]);
      });

    it("produces the implementation while notes.md does not declare status: done", () => {
      pipeline(3);
      write(NOTES, read(NOTES).replace("status: done\n", "status: in progress\n"));
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
      write(NOTES, read(NOTES).replace("status: in progress\n", "\nstatus: done\n"));
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
    });

    it("responds on the lowest stale artifact", () => {
      pipeline(3);
      write(SPEC, read(SPEC).replace("Requirement.", "Requirement changed."));
      assert.deepEqual(frontier(), [`respond ${DESIGN}`]);
    });

    it("responds on an artifact with a thread awaiting its owner, listing the threads", () => {
      pipeline(3);
      awaitingSpec();
      thread("2-reviewer-spec-producer-spec.md", { opener: "reviewer", owner: "spec-producer", artifact: SPEC, lane: "review" });
      const report = check();
      assert.deepEqual(report.frontier, [{ action: "respond", target: SPEC, threads: ["threads/1-design-doc-producer-spec-producer-spec.md", "threads/2-reviewer-spec-producer-spec.md"] }]);
    });

    it("a thread awaiting a lower phase's owner precedes a missing higher artifact", () => {
      pipeline(1);
      awaitingSpec();
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    });

    it("a missing lower artifact precedes a thread awaiting a higher phase's owner", () => {
      pipeline(1);
      thread("1-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
      assert.deepEqual(frontier(), [`produce ${DESIGN}`]);
    });

    it("a thread to the orchestrator about a later input makes the intent's owner respond", () => {
      pipeline(3);
      write("0-intent/constraint-1.md", `target: ${SPEC}\n`);
      stamp(SPEC, INTENT, "0-intent/constraint-1.md");
      thread("1-spec-producer-orchestrator-constraint-1.md", { opener: "spec-producer", owner: "orchestrator", artifact: "0-intent/constraint-1.md" });
      assert.deepEqual(frontier(), [`respond ${INTENT}`]);
    });

    it("a thread awaiting the owner of an artifact beyond the target phase still wakes it", () => {
      pipeline(1, { targetPhase: 1 });
      thread("1-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
      assert.deepEqual(frontier(), [`respond ${NOTES}`]);
    });
  });

  describe("4. reply", () => {
    it("wakes the opener of every thread whose owner replied last", () => {
      pipeline(3);
      repliedBySpec();
      thread("2-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", messages: [["reviewer", "aaaaaaa"], ["implementer", "bbbbbbb"]] });
      assert.deepEqual(frontier(), ["reply threads/1-design-doc-producer-spec-producer-spec.md", "reply threads/2-reviewer-implementer-notes.md"]);
    });

    it("follows produce and respond", () => {
      pipeline(2);
      repliedBySpec();
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
    });

    it("precedes review", () => {
      pipeline(3);
      thread("1-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", messages: [["reviewer", "aaaaaaa"], ["implementer", "bbbbbbb"]] });
      assert.deepEqual(frontier(), ["reply threads/1-reviewer-implementer-notes.md"]);
    });

    it("closed threads await nobody", () => {
      pipeline(3, { targetPhase: 3 });
      thread("1-design-doc-producer-spec-producer-spec.md", { status: "closed: withdrawn", opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC });
      thread("2-implementer-design-doc-producer-design-doc.md", { status: "closed: approved", opener: "implementer", owner: "design-doc-producer", artifact: DESIGN, messages: [["implementer", "aaaaaaa"], ["design-doc-producer", "bbbbbbb"]] });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });

  describe("6. review", () => {
    it("wakes the implicit review lane when no review lane is configured", () => {
      pipeline(3);
      assert.deepEqual(frontier(), ["review review"]);
    });

    it("wakes every configured review lane not approved at the current net change", () => {
      pipeline(3, { lanes: [lane("reviewer", "security"), lane("reviewer", "a11y")] });
      assert.deepEqual(frontier(), ["review security", "review a11y"]);
      approve("1-reviewer-implementer-notes.md", "security");
      assert.deepEqual(frontier(), ["review a11y"]);
      approve("2-reviewer-implementer-notes.md", "a11y");
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("an approval goes stale when the net change changes", () => {
      pipeline(3);
      approve("1-reviewer-implementer-notes.md");
      commitAll("approval");
      assert.deepEqual(frontier(), ["complete"]);
      writeFile("src/app.js", "export const a = 3;\n");
      commitAll("change");
      assert.deepEqual(frontier(), ["review review"]);
      assert.deepEqual(check().reviews, [{ lane: "review", approved: false }]);
    });

    it("an approval of another lane does not count", () => {
      pipeline(3, { lanes: [lane("reviewer", "security"), lane("reviewer", "a11y")] });
      approve("1-reviewer-implementer-notes.md", "security");
      approve("2-reviewer-implementer-notes.md", "security");
      assert.deepEqual(frontier(), ["review a11y"]);
    });

    it("does not apply below target phase 4", () => {
      pipeline(3, { targetPhase: 3 });
      assert.deepEqual(frontier(), ["complete"]);
      assert.equal(check().reviews, undefined);
    });
  });

  describe("7. complete", () => {
    for (const [targetPhase, upTo] of [[1, 1], [2, 2], [3, 3]])
      it(`holds at target phase ${targetPhase} once every artifact through it is fresh`, () => {
        pipeline(upTo, { targetPhase });
        assert.deepEqual(frontier(), ["complete"]);
        assert.deepEqual(check().phases.map((phase) => phase.artifact), [INTENT, SPEC, DESIGN, NOTES].slice(0, targetPhase + 1));
      });
  });

  it("prints one status line per artifact, lane, review, and thread, then the frontier", () => {
    pipeline(3, { lanes: [lane("spec-producer", "a")] });
    thread("1-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
    const out = rp("check", abs(P("")));
    const id = check().netChange;
    assert.equal(out, [
      `artifact ${INTENT} fresh`,
      "lane 1-spec/a missing",
      `artifact ${SPEC} fresh`,
      `artifact ${DESIGN} fresh`,
      `artifact ${NOTES} done`,
      `net-change ${id}`,
      "review review unapproved",
      "thread threads/1-reviewer-implementer-notes.md open awaits implementer",
      `frontier respond ${NOTES}`,
      "",
    ].join("\n"));
  });
});
