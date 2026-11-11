import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, NOTES, P, SPEC, UPSTREAM, abs, certification, check, commitAll, git, later, pipeline, read, remove, revise, root, useRepo, withFrontmatter, write } from "./fixture.mjs";

const states = () => Object.fromEntries(check().phases.map((phase) => [phase.path, phase.state === "stale" ? phase.stale : phase.state]));
const change = (rel) => write(rel, read(rel).replace(/\n$/, "\nChanged.\n"));
const pin = (rel) => `${rel}@${git(root, "hash-object", abs(P(rel))).slice(0, 12)}`;
const certify = (rel, inputs) => write(`certification/${rel}.json`, `${JSON.stringify({ inputs }, null, 2)}\n`);

describe("stale", () => {
  useRepo();

  it("a pipeline whose every pin matches is fresh", () => {
    pipeline(3);
    assert.deepEqual(states(), { [SPEC]: "fresh", [DESIGN]: "fresh", [NOTES]: "fresh" });
  });

  for (const [artifact, inputs] of Object.entries(UPSTREAM))
    for (const input of inputs) {
      it(`${artifact} goes stale when its pinned ${input} changes`, () => {
        pipeline(3);
        change(input);
        assert.deepEqual(states()[artifact], [input]);
      });

      it(`${artifact} goes stale when its certification does not pin ${input}`, () => {
        pipeline(3);
        certify(artifact, certification(artifact).inputs.filter((entry) => !entry.startsWith(`${input}@`)));
        assert.deepEqual(states()[artifact], [input]);
      });
    }

  // An input whose frontmatter alone changes: [what, the input, how its frontmatter changes, the artifact pinning it].
  const frontmatterChanges = [
    ["the intent's issue", INTENT, () => write(INTENT, read(INTENT).replace("issue: 7", "issue: 8")), SPEC],
    ["a later input's origin", "0-intent/constraint-1.md", () => write("0-intent/constraint-1.md", later(`${DESIGN}\norigin: issue 8`, "\nKeep it small.\n")), DESIGN],
    ["a later input's target, to another clause", "0-intent/constraint-1.md", () => write("0-intent/constraint-1.md", later(`${DESIGN}#design-doc-decision-2\norigin: issue 7`, "\nKeep it small.\n")), DESIGN],
  ];
  for (const [what, input, alter, artifact] of frontmatterChanges)
    it(`${artifact} goes stale on ${input} when only ${what} changes, once committed`, () => {
      pipeline(3);
      write("0-intent/constraint-1.md", later(`${DESIGN}\norigin: issue 7`, "\nKeep it small.\n"));
      revise(DESIGN);
      commitAll("certified");
      assert.equal(states()[artifact], "fresh");
      alter();
      commitAll("frontmatter changes");
      assert.deepEqual(states()[artifact], [input]);
      assert.deepEqual(Object.fromEntries(check("--ref", "HEAD").phases.map((phase) => [phase.path, phase.stale ?? phase.state]))[artifact], [input]);
    });

  for (const artifact of Object.keys(UPSTREAM))
    it(`a later input targeting ${artifact} makes it stale until pinned, and again when it changes`, () => {
      pipeline(3);
      write("0-intent/constraint-1.md", later(`${artifact}#item-1, ${artifact}\norigin: issue 7`, "\n# Constraint 1: limit\n\nKeep it small.\n"));
      assert.deepEqual(states()[artifact], ["0-intent/constraint-1.md"]);
      revise(artifact);
      assert.equal(states()[artifact], "fresh");
      change("0-intent/constraint-1.md");
      assert.deepEqual(states()[artifact], ["0-intent/constraint-1.md"]);
    });

  it("a later input targets only the artifacts it names", () => {
    pipeline(3);
    write("0-intent/proposal-1.md", later(DESIGN));
    assert.deepEqual(states(), { [SPEC]: "fresh", [DESIGN]: ["0-intent/proposal-1.md"], [NOTES]: "fresh" });
  });

  it("a pin of a file that is not a required input never makes an artifact stale", () => {
    pipeline(3);
    write("0-intent/failure-1.md", later(SPEC));
    write("0-intent/proposal-1.md", later(DESIGN));
    certify(SPEC, ["0-intent/failure-1.md", INTENT, "0-intent/proposal-1.md"].map(pin));
    remove("0-intent/failure-1.md");
    change("0-intent/proposal-1.md");
    assert.equal(states()[SPEC], "fresh");
  });

  it("an unstamped artifact is stale on every input it must pin", () => {
    pipeline(2);
    write(NOTES, withFrontmatter({ status: "done" }));
    assert.deepEqual(states()[NOTES], [SPEC, DESIGN]);
  });
});
