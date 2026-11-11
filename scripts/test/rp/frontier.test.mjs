import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, REVIEW, SPEC, TO_DESIGN, TO_OWNER, TO_SPEC,
  abs, approve, check, commitAll, configure, frontier, lane, later, pipeline, read, remove, revise, rp, run, thread, useRepo, withFrontmatter, write, writeFile,
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
      write(INTENT, withFrontmatter({ issue: 7, pins: "x" }, "\n# Intent\n"));
      assert.equal(rp("check", abs(P(""))).trim(), `frontier INVALID ${INTENT}: unexpected frontmatter key: pins`);
    });

    // [what, how the file is broken, its path, the reason]
    const files = [
      ["unclosed frontmatter", () => write(INTENT, "---\nissue: 7\n"), INTENT, "frontmatter has no closing --- line"],
      ["frontmatter on the spec", () => write(SPEC, "---\n---\n# Spec\n"), SPEC, "carries no frontmatter"],
      ["frontmatter on a design doc", () => write(DESIGN, withFrontmatter({ status: "done" })), DESIGN, "carries no frontmatter"],
      ["frontmatter on a candidate", () => { configure({ lanes: [lane("spec-producer", "a")] }); write("1-spec/lanes/a/spec.md", withFrontmatter({ issue: 7 })); }, "1-spec/lanes/a/spec.md", "carries no frontmatter"],
      ["an unknown key on notes.md", () => write(NOTES, withFrontmatter({ status: "done", inputs: "x" })), NOTES, "unexpected frontmatter key: inputs"],
      ["a later input whose target is a body line only", () => write("0-intent/constraint-1.md", `# Constraint 1\n\ntarget: ${SPEC}\n`), "0-intent/constraint-1.md", "frontmatter has no target"],
      ["a later input targeting a non-artifact", () => write("0-intent/proposal-1.md", later(INTENT)), "0-intent/proposal-1.md", `target must name ${SPEC}, ${DESIGN}, ${NOTES}: ${INTENT}`],
      ["a candidate of an unconfigured lane", () => write("1-spec/lanes/x/spec.md", "# C\n"), "1-spec/lanes/x/spec.md", "production lane is not configured: spec-producer x"],
      ["a thread whose values are body lines only", () => write("threads/1-x.md", "status: open\n"), "threads/1-x.md", "frontmatter has no status"],
    ];
    for (const [name, mutate, path, reason] of files)
      it(`holds for ${name}`, () => {
        pipeline(1);
        mutate();
        assert.deepEqual(check().frontier, [{ action: "INVALID", target: path, reason }]);
      });

    // A file's frontmatter outside the YAML subset: [what, the frontmatter, the reason naming the key or the construct].
    const subset = [
      ["a nested map", "issue: 7\nstarts-from:\n  branch: main", "frontmatter starts-from: a nested map or a multi-line value"],
      ["a multi-line value", "issue: 7\nstarts-from: a\n  b", "frontmatter starts-from: a nested map or a multi-line value"],
      ["a list", "issue:\n- 7\n- 8", "frontmatter issue: a list"],
      ["a key given twice", "issue: 7\nissue: 8", "frontmatter issue: given twice"],
      ["a comment line", "# origins\nissue: 7", "frontmatter line 2: a comment"],
      ["a line that is no key and value", "issue 7", "frontmatter line 2 is not <key>: <value>"],
      ["an unquoted value that opens with #", "issue: #368", "frontmatter issue: a comment"],
      ["a value followed by a comment", "issue: 368 # the export issue", "frontmatter issue: a comment"],
      ["a flow sequence", "issue: [368]", "frontmatter issue: a flow collection"],
      ["a flow map", "issue: {id: 368}", "frontmatter issue: a flow collection"],
      ["an anchor", "issue: &a 368", "frontmatter issue: an anchor"],
      ["an alias", "issue: *a", "frontmatter issue: an alias"],
      ["a tag", "issue: !!str 368", "frontmatter issue: a tag"],
      ["a block scalar", "issue: |", "frontmatter issue: a block scalar"],
      ["a double-quoted escape", 'issue: "a\\tb"', "frontmatter issue: a quoted value with an escape"],
      ["a single-quoted escape", "issue: 'it''s'", "frontmatter issue: a quoted value with an escape"],
      ["text after a quoted value", "issue: '368' # a comment", "frontmatter issue: text after the closing quote"],
      ["an unclosed quote", 'issue: "368', "frontmatter issue: an unclosed quote"],
      ["a value holding a mapping", "issue: see: 368", "frontmatter issue: a plain value YAML rejects"],
      ["a value opening with a reserved indicator", "issue: @368", "frontmatter issue: a plain value YAML rejects"],
      ["a value that is a sequence entry", "issue: - 368", "frontmatter issue: a plain value YAML rejects"],
    ];
    for (const [what, frontmatter, reason] of subset)
      it(`holds for ${what} in a frontmatter, naming it`, () => {
        pipeline(1);
        write(INTENT, `---\n${frontmatter}\n---\n\n# Intent\n`);
        assert.deepEqual(check().frontier, [{ action: "INVALID", target: INTENT, reason }]);
      });

    it("reads a quoted value without its quotes and every plain value as the text written", () => {
      pipeline(1);
      write("0-intent/constraint-1.md", withFrontmatter({ target: `"${SPEC}"`, origin: "'#368'" }));
      write("0-intent/proposal-1.md", withFrontmatter({ target: ` ${DESIGN}#design-doc-decision-1 \t`, origin: "https://example.com/issues/368#comment-2" }));
      write(INTENT, withFrontmatter({ issue: "0368", "starts-from": "true", "re-attempts": "" }, "\n# Intent\n"));
      assert.deepEqual(frontier(), [`respond ${SPEC}`]);
      assert.deepEqual(check().phases[0].stale, [INTENT, "0-intent/constraint-1.md"]);
    });
  });

  describe("a configuration that cannot be read stops the command", () => {
    const CONFIG = { "target-phase": 4, base: "main", "worktree-folder-root": ".worktrees" };
    // A run-config.json holding CONFIG with `changes` over it, a key given as undefined removed.
    const writeConfig = (changes) => write("run-config.json", JSON.stringify({ ...CONFIG, ...changes }));
    const configurations = [
      ["a run-config.md in its place", () => { remove("run-config.json"); write("run-config.md", '---\n{"format": 7, "target-phase": 4, "base": "main"}\n---\n'); },
        /cannot read \.pipelines\/demo\/run-config\.json: missing/],
      ["run-config.json that is not JSON", () => write("run-config.json", '---\n{"target-phase": 4}\n---\n'), /\.pipelines\/demo\/run-config\.json: not valid JSON: /],
      ["run-config.json that is not an object", () => write("run-config.json", "[]\n"), /\.pipelines\/demo\/run-config\.json: must be a JSON object/],
      ["target-phase out of range", () => configure({ targetPhase: 5 }), /run-config\.json: target-phase: must be an integer from 1 to 4/],
      ["target-phase not an integer", () => configure({ targetPhase: "4" }), /run-config\.json: target-phase: must be an integer from 1 to 4/],
      ["an empty base", () => configure({ base: " " }), /run-config\.json: base: must be a revision/],
      ["the worktree folder root missing", () => writeConfig({ "worktree-folder-root": undefined }), /run-config\.json: worktree-folder-root: missing/],
      ["an unknown key", () => configure({ workflow: "autonomous" }), /run-config\.json: unexpected key: workflow/],
      ["a lanes list", () => writeConfig({ lanes: [{ profile: "reviewer", id: "a" }] }), /run-config\.json: unexpected key: lanes/],
      ["owner directions given as null", () => configure({ "owner-directions": null }), /run-config\.json: owner-directions: must be a list of strings/],
      ["owner directions holding other than strings", () => configure({ "owner-directions": ["Keep it local.", 2] }), /run-config\.json: owner-directions: must be a list of strings/],
      ["agents that are not an object", () => configure({ agents: [] }), /run-config\.json: agents: must be a JSON object/],
      ["agents naming an unknown profile", () => configure({ agents: { implementor: {} } }), /agents: unexpected key: implementor/],
      ["a profile with an unknown key", () => configure({ agents: { implementer: { subagent: "sonnet" } } }), /agents.implementer: unexpected key: subagent/],
      ["a model that is no name", () => configure({ agents: { reviewer: { model: " " } } }), /agents.reviewer.model: must be a model name/],
      ["implementer lanes", () => configure({ agents: { implementer: { lanes: { a: {} } } } }), /agents.implementer: unexpected key: lanes/],
      ["an empty lanes object", () => configure({ agents: { reviewer: { lanes: {} } } }), /agents.reviewer.lanes: must name a lane/],
      ["a lane with an empty brief", () => configure({ lanes: [{ profile: "reviewer", id: "a", brief: " " }] }), /agents.reviewer.lanes.a.brief: must be a text/],
      ["a lane with a brief given as a list of lines", () => configure({ lanes: [{ profile: "spec-producer", id: "a", brief: ["One.", "Two."] }] }), /agents.spec-producer.lanes.a.brief: must be a text/],
      ["a lane with a malformed id", () => configure({ lanes: [lane("reviewer", "A b")] }), /agents.reviewer.lanes."A b": a lane id must match/],
      ["a lane with a subagent model that is no name", () => configure({ lanes: [{ profile: "reviewer", id: "a", subagents: 5 }] }), /agents.reviewer.lanes.a.subagents: must be a model name/],
      ["a lane with an unknown key", () => configure({ lanes: [{ profile: "reviewer", id: "a", profile_: "x" }] }), /agents.reviewer.lanes.a: unexpected key: profile_/],
      ["the intent missing", () => remove(INTENT), /cannot read \.pipelines\/demo\/0-intent\/intent.md: missing/],
    ];
    for (const [name, mutate, message] of configurations)
      it(`on ${name}`, () => {
        pipeline(1);
        mutate();
        const out = run("check", abs(P("")));
        assert.equal(out.status, 1);
        assert.match(out.stderr, message);
        assert.doesNotMatch(out.stderr, /format/);
      });

    // [what, lanes, the frontier on a pipeline missing its spec, the frontier on a done implementation]
    const briefless = [
      ["production lanes without a brief", [{ profile: "spec-producer", id: "a" }, lane("spec-producer", "b")], ["lane 1-spec/spec.md a", "lane 1-spec/spec.md b"], ["review default"]],
      ["review lanes without a brief", [{ profile: "reviewer", id: "a" }, lane("reviewer", "b")], ["produce 1-spec/spec.md"], ["review a", "review b"]],
      ["default declared alongside another review lane", [{ profile: "reviewer", id: "default" }, lane("reviewer", "b")], ["produce 1-spec/spec.md"], ["review default", "review b"]],
      ["default declared with a brief", [lane("reviewer", "default")], ["produce 1-spec/spec.md"], ["review default"]],
      ["lanes with models and a brief of several lines", [{ profile: "spec-producer", id: "a", brief: "One.\n\nTwo.", model: "opus", subagents: "sonnet" }, { profile: "reviewer", id: "b", model: "openai/gpt-6-astra#high" }],
        ["lane 1-spec/spec.md a"], ["review b"]],
    ];
    for (const [what, lanes, missingSpec, done] of briefless)
      it(`accepts ${what}`, () => {
        pipeline(0, { lanes });
        assert.deepEqual(frontier(), missingSpec);
        pipeline(3, { lanes });
        assert.deepEqual(frontier(), done);
      });

    it("accepts the same lane id under different profiles", () => {
      pipeline(3, { lanes: [lane("spec-producer", "a"), lane("reviewer", "a")] });
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
      thread({ ...TO_OWNER, status: "answered", messages: [["spec-producer", "aaaaaaa"], ["owner", "bbbbbbb"]] });
      assert.deepEqual(frontier(), ["complete"]);
    });
  });

  describe("3. the lowest phase whose role has work", () => {
    for (const [upTo, artifact] of [[0, SPEC], [1, DESIGN], [2, NOTES]])
      it(`produces ${artifact} when it is the lowest missing artifact`, () => {
        pipeline(upTo);
        assert.deepEqual(frontier(), [`produce ${artifact}`]);
      });

    it("produces the implementation while notes.md's frontmatter status is not done, whatever its body says", () => {
      pipeline(3);
      write(NOTES, read(NOTES).replace("status: done\n", "status: in progress\n"));
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
      write(NOTES, "status: done\n\n# Notes\n");
      assert.deepEqual(frontier(), [`produce ${NOTES}`]);
      assert.equal(check().phases[2].state, "missing");
      write(NOTES, withFrontmatter({ status: "done" }, "status: in progress\n"));
      assert.equal(check().phases[2].state, "fresh");
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

    it("a missing or stale artifact beyond the target is no work", () => {
      pipeline(1, { targetPhase: 1 });
      write(DESIGN, "# Unstamped design\n");
      assert.deepEqual(frontier(), ["complete"]);
    });

    for (const [targetPhase, upTo, parties, expected] of [
      [1, 1, TO_DESIGN, `respond ${DESIGN}`],
      [2, 2, REVIEW(), `respond ${NOTES}`],
      [3, 3, { ...REVIEW(), owner: "spec-producer", artifact: "spec", replied: true }, "review default"],
    ])
      it(`a thread awaiting a role beyond target phase ${targetPhase} is still its work: ${expected}`, () => {
        pipeline(upTo, { targetPhase });
        const { replied: wasReplied, ...fields } = parties;
        if (wasReplied) replied(fields); else thread(fields);
        assert.deepEqual(frontier(), [expected]);
      });

    it("closed threads await nobody", () => {
      pipeline(3, { targetPhase: 3 });
      thread({ status: "withdrawn", ...TO_SPEC });
      replied({ status: "approved", ...TO_DESIGN }, 2);
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

    it("an approval goes stale when the implementer commits code", () => {
      pipeline(3);
      approve();
      commitAll("approval");
      assert.deepEqual(frontier(), ["complete"]);
      writeFile("src/app.js", "export const a = 3;\n");
      commitAll("change");
      assert.deepEqual(frontier(), ["review default"]);
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false, codeChanged: true }]);
    });

    it("an approval goes stale when a required input changes or a later input lands", () => {
      pipeline(3);
      approve();
      assert.deepEqual(frontier(), ["complete"]);
      write("0-intent/proposal-1.md", later(NOTES));
      assert.deepEqual(frontier(), [`respond ${NOTES}`]);
      revise(NOTES);
      assert.deepEqual(check().frontier, [{ action: "review", target: "default", threads: [], changed: ["0-intent/proposal-1.md"] }]);
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false, stale: ["0-intent/proposal-1.md"] }]);
      approve("default", 2);
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("an approval whose pins match but whose code changed is not approved", () => {
      pipeline(3);
      approve();
      writeFile("src/app.js", "export const a = 9;\n");
      commitAll("change");
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false, codeChanged: true }]);
    });

    it("only the lane's highest-numbered review thread counts", () => {
      pipeline(3);
      approve("default", 1);
      thread({ n: 2, status: "withdrawn", ...REVIEW() });
      assert.deepEqual(frontier(), ["review default"]);
      approve("default", 3);
      assert.deepEqual(frontier(), ["complete"]);
    });

    it("a reviewer's approved thread to another owner does not approve", () => {
      pipeline(3);
      replied({ status: "approved", ...REVIEW(), owner: "spec-producer", artifact: "spec" });
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
