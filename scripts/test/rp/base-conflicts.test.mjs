import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NOTES, P, PIPELINE, abs, approve, check, commitAll, frontier, git, later, pipeline, root, rp, useRepo, withFrontmatter, write, writeFile } from "./fixture.mjs";

const implementation = () => check().phases.find((phase) => phase.artifact === "implementation");
function onBase(change) {
  git(root, "checkout", "--quiet", "main");
  change();
  commitAll("base moves");
  git(root, "checkout", "--quiet", "demo");
}
// The pipeline and its base branch both change `src/app.js`, and the tip has not merged the base.
function conflicting(config) {
  pipeline(3, config);
  writeFile("src/app.js", "export const a = 2;\n");
  commitAll("edit");
  onBase(() => writeFile("src/app.js", "export const a = 3;\n"));
}

describe("a base branch that conflicts with the tip", () => {
  useRepo();

  it("makes notes.md stale on the paths that conflict, and wakes the implementer before any review", () => {
    conflicting();
    approve();
    assert.deepEqual(implementation(), { phase: 3, artifact: "implementation", path: NOTES, state: "stale", stale: [], "base-conflicts": ["src/app.js"], lanes: [] });
    assert.deepEqual(check().frontier, [{ action: "respond", target: "implementation", threads: [], changed: [], "base-conflicts": ["src/app.js"] }]);
    assert.deepEqual(check().complete, [1, 2]);
    assert.ok(rp("check", abs(PIPELINE)).split("\n").includes("artifact implementation stale base"));
  });

  it("is stale on a changed input and on the base branch together", () => {
    conflicting();
    write("0-intent/proposal-1.md", later(NOTES));
    commitAll("proposal");
    assert.deepEqual(check().frontier, [{ action: "respond", target: "implementation", threads: [], changed: ["0-intent/proposal-1.md"], "base-conflicts": ["src/app.js"] }]);
    assert.ok(rp("check", abs(PIPELINE)).split("\n").includes("artifact implementation stale 0-intent/proposal-1.md base"));
  });

  it("is resolved by merging it: notes.md is fresh and the approval stale on the code", () => {
    conflicting();
    approve();
    assert.throws(() => git(root, "merge", "--quiet", "--no-edit", "main"));
    writeFile("src/app.js", "export const a = 4;\n");
    commitAll("resolve");
    assert.equal(implementation().state, "fresh");
    assert.deepEqual(frontier(), ["review default"]);
  });

  it("names the path of a conflict that leaves no file unmerged", () => {
    pipeline(3);
    onBase(() => { writeFile("old/a.js", "a\n"); writeFile("old/b.js", "b\n"); });
    git(root, "merge", "--quiet", "--no-edit", "main");
    for (const [file, folder] of [["a.js", "x"], ["b.js", "y"]]) { writeFile(`${folder}/${file}`, `${file[0]}\n`); git(root, "rm", "--quiet", `old/${file}`); }
    commitAll("split old");
    onBase(() => writeFile("old/c.js", "c\n"));
    assert.deepEqual(check().frontier, [{ action: "respond", target: "implementation", threads: [], changed: [], "base-conflicts": ["old"] }]);
  });

  it("leaves notes.md fresh while the base branch merges cleanly", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("edit");
    onBase(() => writeFile("src/other.js", "export const b = 1;\n"));
    approve();
    assert.deepEqual(frontier(), ["complete"]);
  });

  it("leaves notes.md fresh when the conflict is inside the pipelines folder root", () => {
    pipeline(3);
    onBase(() => writeFile(P(NOTES), withFrontmatter({ status: "done" }, "\n# Notes the base holds\n")));
    approve();
    assert.deepEqual(frontier(), ["complete"]);
  });

  it("leaves notes.md missing while it is not done", () => {
    conflicting();
    write(NOTES, withFrontmatter({ status: "in-progress" }, "\n# Notes\n"));
    commitAll("in progress");
    assert.deepEqual(check().frontier, [{ action: "produce", target: "implementation", threads: [] }]);
  });

  for (const [targetPhase, expected] of [[3, ["respond implementation"]], [2, ["complete"]]])
    it(`at target phase ${targetPhase}, the frontier is ${expected}`, () => {
      conflicting({ targetPhase });
      assert.deepEqual(frontier(), expected);
    });
});
