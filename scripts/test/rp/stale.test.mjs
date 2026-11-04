import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { splitFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { DESIGN, INTENT, NOTES, SPEC, UPSTREAM, check, pipeline, read, remove, stamp, useRepo, write } from "./fixture.mjs";

const states = () => Object.fromEntries(check().phases.map((phase) => [phase.artifact, phase.state === "stale" ? phase.stale : phase.state]));
const change = (rel) => write(rel, read(rel).replace(/\n$/, "\nChanged.\n"));

describe("stale", () => {
  useRepo();

  it("a pipeline whose every pin matches is fresh", () => {
    pipeline(3);
    assert.deepEqual(states(), { [INTENT]: "fresh", [SPEC]: "fresh", [DESIGN]: "fresh", [NOTES]: "fresh" });
  });

  for (const [artifact, inputs] of Object.entries(UPSTREAM))
    for (const input of inputs) {
      it(`${artifact} goes stale when its pinned ${input} changes`, () => {
        pipeline(3);
        change(input);
        assert.deepEqual(states()[artifact], [input]);
      });

      it(`${artifact} stays fresh when only ${input}'s frontmatter changes`, () => {
        pipeline(3);
        const { json, body } = splitFrontmatter(Buffer.from(read(input)));
        write(input, `---\n${JSON.stringify(JSON.parse(json ?? "{}"))}\n---\n${body}`);
        assert.notEqual(read(input), `${body}`);
        assert.equal(states()[artifact], "fresh");
      });

      it(`${artifact} goes stale when it does not pin ${input}`, () => {
        pipeline(3);
        const { json, body } = splitFrontmatter(Buffer.from(read(artifact)));
        const inputsKept = JSON.parse(json).inputs.filter((pin) => !pin.startsWith(`${input}@`));
        write(artifact, `---\n${JSON.stringify({ inputs: inputsKept })}\n---\n${body}`);
        assert.deepEqual(states()[artifact], [input]);
      });
    }

  for (const artifact of Object.keys(UPSTREAM))
    it(`a later input targeting ${artifact} makes it stale until pinned, and again when it changes`, () => {
      pipeline(3);
      write("0-intent/constraint-1.md", `# Constraint 1: limit\n\ntarget: ${artifact}#item-1, ${artifact}\norigin: issue 7\n\nKeep it small.\n`);
      assert.deepEqual(states()[artifact], ["0-intent/constraint-1.md"]);
      stamp(artifact, ...UPSTREAM[artifact], "0-intent/constraint-1.md");
      assert.equal(states()[artifact], "fresh");
      change("0-intent/constraint-1.md");
      assert.deepEqual(states()[artifact], ["0-intent/constraint-1.md"]);
    });

  it("a later input targets only the artifacts it names", () => {
    pipeline(3);
    write("0-intent/proposal-1.md", `target: ${DESIGN}\n`);
    assert.deepEqual(states(), { [INTENT]: "fresh", [SPEC]: "fresh", [DESIGN]: ["0-intent/proposal-1.md"], [NOTES]: "fresh" });
  });

  it("a pin of a file that no longer exists is stale", () => {
    pipeline(3);
    write("0-intent/failure-1.md", `target: ${SPEC}\n`);
    stamp(SPEC, INTENT, "0-intent/failure-1.md");
    remove("0-intent/failure-1.md");
    assert.deepEqual(states()[SPEC], ["0-intent/failure-1.md"]);
  });

  it("an unstamped artifact is stale on every input it must pin", () => {
    pipeline(2);
    write(NOTES, "status: done\n");
    assert.deepEqual(states()[NOTES], [SPEC, DESIGN]);
  });

  it("the intent pins nothing and is never stale", () => {
    pipeline(3);
    change(INTENT);
    assert.equal(states()[INTENT], "fresh");
  });
});
