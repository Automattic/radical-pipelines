import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, REVIEW, SPEC, TO_DESIGN, TO_OWNER, TO_SPEC,
  abs, approve, check, commitAll, configure, frontier, lane, pipeline, read, remove, rp, run, thread, useRepo, write, writeFile,
} from "./fixture.mjs";

const replied = (parties, n = 1) => thread({ n, ...parties, messages: [[parties.opener, "aaaaaaa"], [parties.owner, "bbbbbbb"]] });

describe("frontier", () => {
  useRepo();

  describe("1. INVALID", () => {
    it("names every malformed file and precedes every other rule", () => {
      pipeline(0);
      thread(TO_OWNER);
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
      ["unclosed frontmatter", () => write(SPEC, "---\n{}\n"), SPEC],
      ["frontmatter that is not an object", () => write(SPEC, "---\n[]\n---\n"), SPEC],
      ["frontmatter on the intent", () => write(INTENT, "---\n{}\n---\n# I\n"), INTENT],
      ["frontmatter on a later input", () => write("0-intent/proposal-1.md", `---\n{}\n---\ntarget: ${SPEC}\n`), "0-intent/proposal-1.md"],
      ["an inputs entry without identity", () => write(SPEC, `---\n{"inputs": ["${INTENT}"]}\n---\n`), SPEC],
      ["an inputs entry naming a non-artifact", () => write(SPEC, '---\n{"inputs": ["notes.txt@0123456789ab"]}\n---\n'), SPEC],
      ["an input pinned twice", () => write(SPEC, `---\n{"inputs": ["${INTENT}@0123456789ab", "${INTENT}@0123456789ac"]}\n---\n`), SPEC],
      ["a later input without target", () => write("0-intent/constraint-1.md", "# Constraint 1\n"), "0-intent/constraint-1.md"],
      ["a later input targeting a non-artifact", () => write("0-intent/proposal-1.md", "target: 0-intent/intent.md\n"), "0-intent/proposal-1.md"],
      ["a candidate of an unconfigured lane", () => write("1-spec/lanes/x/spec.md", "# C\n"), "1-spec/lanes/x/spec.md"],
      ["a malformed thread header", () => write("threads/1-x.md", "status: open\n"), "threads/1-x.md"],
    ];
    for (const [name, mutate, path] of files)
      it(`holds for ${name}`, () => {
        pipeline(1);
        mutate();
        assert.deepEqual(frontier().map((line) => line.split(" ").slice(0, 2).join(" ")), [`INVALID ${path}`]);
      });
  });

  describe("a configuration that cannot be read stops the command", () => {
    const configurations = [
      ["run-config.md missing", () => remove("run-config.md"), /cannot read run-config.md: missing/],
      ["run-config.md without frontmatter", () => write("run-config.md", "target-phase: 4\n"), /run-config.md: no frontmatter/],
      ["target-phase out of range", () => configure({ targetPhase: 5 }), /target-phase/],
      ["target-phase not an integer", () => configure({ targetPhase: "4" }), /target-phase/],
      ["an empty base", () => configure({ base: " " }), /base must be/],
      ["an unknown key", () => write("run-config.md", '---\n{"target-phase": 4, "base": "main", "workflow": "autonomous"}\n---\n'), /unexpected frontmatter key: workflow/],
      ["an empty lanes list", () => configure({ lanes: [] }), /lanes must be a non-empty list/],
      ["a lane with an unknown profile", () => configure({ lanes: [lane("spec-reviewer", "a")] }), /lane profile/],
      ["a lane without brief", () => configure({ lanes: [{ profile: "reviewer", id: "a" }] }), /needs a brief/],
      ["a lane with a malformed id", () => configure({ lanes: [lane("reviewer", "A b")] }), /lane id/],
      ["a lane with a model", () => configure({ lanes: [{ ...lane("reviewer", "a"), model: "x" }] }), /unexpected lane key: model/],
      ["a duplicate lane", () => configure({ lanes: [lane("reviewer", "a"), lane("reviewer", "a")] }), /duplicate lane/],
      ["the intent missing", () => remove(INTENT), /cannot read 0-intent\/intent.md: missing/],
    ];
    for (const [name, mutate, message] of configurations)
      it(`on ${name}`, () => {
        pipeline(1);
        mutate();
        const out = run("check", abs(P("")));
        assert.equal(out.status, 1);
        assert.match(out.stderr, message);
      });

    it("accepts the same lane id under different profiles and ignores the body", () => {
      pipeline(3, { lanes: [lane("spec-producer", "a"), lane("reviewer", "a")] });
      write("run-config.md", `${read("run-config.md")}\nModels: spec-producer a on a large model.\n`);
      assert.deepEqual(frontier(), ["review a"]);
    });
  });

  describe("2. escalate", () => {
    it("holds for every disagreement thread, before a missing artifact", () => {
      pipeline(0);
      thread(TO_OWNER);
      thread({ n: 2, ...TO_OWNER, opener: "reviewer-default" });
      assert.deepEqual(frontier(), ["escalate threads/1-spec-producer-owner-intent.md", "escalate threads/2-reviewer-default-owner-intent.md"]);
    });

    it("does not hold once the thread is closed answered", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ ...TO_OWNER, status: "closed: answered", messages: [["spec-producer", "aaaaaaa"], ["owner", "bbbbbbb"]] });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });

  describe("3. the lowest phase whose role has work", () => {
    for (const [upTo, artifact] of [[0, SPEC], [1, DESIGN], [2, NOTES]])
      it(`produces ${artifact} when it is the lowest missing artifact`, () => {
        pipeline(upTo);
        assert.deepEqual(frontier(), [`produce ${artifact}`]);
      });

    it("produces the implementation while notes.md's first body line is not status: done", () => {
      pipeline(3);
      write(NOTES, read(NOTES).replace("status: done\n", "status: in progress\n"));
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
      write(NOTES, read(NOTES).replace("status: in progress\n", "\nstatus: done\n"));
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
      assert.equal(check().phases[2].state, "missing");
    });

    it("responds on the lowest stale artifact, with its changed inputs", () => {
      pipeline(3);
      write(SPEC, read(SPEC).replace("Requirement.", "Requirement changed."));
      assert.deepEqual(check().frontier, [{ action: "respond", target: DESIGN, threads: [], changed: [SPEC] }]);
    });

    it("responds on an artifact with threads awaiting its owner, listing them", () => {
      pipeline(3);
      thread(TO_SPEC);
      thread({ n: 2, ...REVIEW(), owner: "spec-producer", artifact: "spec" });
      assert.deepEqual(check().frontier, [{ action: "respond", target: SPEC, threads: ["threads/1-design-doc-producer-spec-producer-spec.md", "threads/2-reviewer-default-spec-producer-spec.md"] }]);
    });

    it("wakes the opener's role when the owner wrote last", () => {
      pipeline(3);
      replied(TO_SPEC);
      assert.deepEqual(check().frontier, [{ action: "respond", target: DESIGN, threads: ["threads/1-design-doc-producer-spec-producer-spec.md"] }]);
    });

    it("produces the opener's missing artifact with the threads awaiting it", () => {
      pipeline(2);
      replied(TO_DESIGN);
      assert.deepEqual(check().frontier, [{ action: "produce", target: NOTES, threads: ["threads/1-implementer-design-doc-producer-design-doc.md"] }]);
    });

    it("a role waiting on a thread it opened is not woken for its missing artifact", () => {
      pipeline(1);
      thread(TO_SPEC);
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    });

    it("a missing lower artifact precedes a thread awaiting a higher phase's role", () => {
      pipeline(1);
      thread(REVIEW());
      assert.deepEqual(frontier(), [`produce ${DESIGN}`]);
    });

    it("phases beyond the target have no work", () => {
      pipeline(1, { targetPhase: 1 });
      thread(TO_DESIGN);
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("closed threads await nobody", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ status: "closed: withdrawn", ...TO_SPEC });
      replied({ status: "closed: approved", ...TO_DESIGN }, 2);
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("a message by owner leaves the thread awaiting its owner", () => {
      pipeline(3);
      thread({ ...TO_SPEC, messages: [["design-doc-producer", "aaaaaaa"], ["spec-producer", "bbbbbbb"], ["owner", "ccccccc"]] });
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    });
  });

  describe("phase 4: review", () => {
    it("wakes the default lane when no review lane is configured", () => {
      pipeline(3);
      assert.deepEqual(frontier(), ["review default"]);
    });

    it("wakes every configured review lane not approved at the current net change", () => {
      pipeline(3, { lanes: [lane("reviewer", "security"), lane("reviewer", "a11y")] });
      assert.deepEqual(frontier(), ["review security", "review a11y"]);
      approve("security");
      assert.deepEqual(frontier(), ["review a11y"]);
      approve("a11y");
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("wakes an approved lane with a thread awaiting its reviewer", () => {
      pipeline(3);
      approve();
      replied({ ...REVIEW(), owner: "spec-producer", artifact: "spec" }, 2);
      assert.deepEqual(check().frontier, [{ action: "review", target: "default", threads: ["threads/2-reviewer-default-spec-producer-spec.md"] }]);
    });

    it("an approval goes stale when the net change changes", () => {
      pipeline(3);
      approve();
      commitAll("approval");
      assert.deepEqual(frontier(), ["complete"]);
      writeFile("src/app.js", "export const a = 3;\n");
      commitAll("change");
      assert.deepEqual(frontier(), ["review default"]);
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false }]);
    });

    it("only the lane's highest-numbered review thread counts", () => {
      pipeline(3);
      approve("default", 1);
      thread({ n: 2, status: "closed: withdrawn", ...REVIEW() });
      assert.deepEqual(frontier(), ["review default"]);
      approve("default", 3);
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("a reviewer's approved thread to another owner does not approve", () => {
      pipeline(3);
      replied({ status: "closed: approved", ...REVIEW(), owner: "spec-producer", artifact: "spec" });
      assert.deepEqual(frontier(), ["review default"]);
    });

    it("another lane's approval does not count", () => {
      pipeline(3, { lanes: [lane("reviewer", "security"), lane("reviewer", "a11y")] });
      approve("security", 1);
      approve("security", 2);
      assert.deepEqual(frontier(), ["review a11y"]);
    });

    it("does not apply below target phase 4", () => {
      pipeline(3, { targetPhase: 3 });
      assert.deepEqual(frontier(), ["complete"]);
      assert.equal(check().reviews, undefined);
    });
  });

  describe("complete", () => {
    for (const [targetPhase, upTo] of [[1, 1], [2, 2], [3, 3]])
      it(`holds at target phase ${targetPhase} once every artifact through it is fresh`, () => {
        pipeline(upTo, { targetPhase });
        assert.deepEqual(frontier(), ["complete"]);
        assert.deepEqual(check().phases.map((phase) => phase.artifact), [SPEC, DESIGN, NOTES].slice(0, targetPhase));
      });
  });

  it("prints the frontier, then one line per artifact, open lane, review, and thread", () => {
    pipeline(3);
    write(DESIGN, read(DESIGN).replace("Decision.", "Decision changed."));
    thread(REVIEW());
    const id = check().netChange;
    assert.equal(rp("check", abs(P(""))), [
      `frontier respond ${NOTES}`,
      `artifact ${SPEC} fresh`,
      `artifact ${DESIGN} fresh`,
      `artifact ${NOTES} stale ${DESIGN}`,
      `net-change ${id}`,
      "review default unapproved",
      "thread threads/1-reviewer-default-implementer-implementation.md open awaits implementer",
      "",
    ].join("\n"));
  });
});
