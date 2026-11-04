import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { commitAll, git, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

const CONFIG = '---\n{"target-phase": 4, "base": "main"}\n---\n';
function recordPipeline(folder, issue, extra = "") {
  writeFile(`${folder}/run-config.md`, CONFIG);
  writeFile(`${folder}/0-intent/intent.md`, `origin: issue ${issue}\norigin: starts-from main\n\n# Intent\n${extra}`);
}
const discover = (...args) => JSON.parse(rp("pipelines", root, "--json", ...args)).map(({ state, ref, folder, origins }) => ({ state, ref, folder, origins }));

describe("pipelines", () => {
  useRepo();

  // main holds a merged pipeline; `old` still points at its pre-merge tip; `live` and `origin/live` carry a live one;
  // `followup` changes the merged one after the merge.
  function scenario() {
    git(root, "checkout", "--quiet", "-b", "old", "main");
    recordPipeline(".pipelines/merged", 1);
    commitAll("merged pipeline");
    git(root, "checkout", "--quiet", "main");
    git(root, "merge", "--quiet", "--no-ff", "--no-edit", "old");
    git(root, "checkout", "--quiet", "-b", "live", "main");
    recordPipeline(".pipelines/fresh-work", 2);
    commitAll("live pipeline");
    git(root, "update-ref", "refs/remotes/origin/live", "live");
    git(root, "checkout", "--quiet", "-b", "followup", "main");
    recordPipeline(".pipelines/merged", 1, "\nFollow-up.\n");
    commitAll("followup");
    git(root, "checkout", "--quiet", "main");
  }

  it("lists live pipelines at every branch tip and merged ones from the base", () => {
    scenario();
    assert.deepEqual(discover(), [
      { state: "live", ref: "live", folder: ".pipelines/fresh-work", origins: ["issue 2", "starts-from main"] },
      { state: "live", ref: "origin/live", folder: ".pipelines/fresh-work", origins: ["issue 2", "starts-from main"] },
      { state: "live", ref: "followup", folder: ".pipelines/merged", origins: ["issue 1", "starts-from main"] },
      { state: "merged", ref: "main", folder: ".pipelines/merged", origins: ["issue 1", "starts-from main"] },
    ]);
  });

  it("filters by the intent's origin issue line, not by folder or branch name", () => {
    scenario();
    git(root, "checkout", "--quiet", "-b", "issue-1", "main");
    recordPipeline(".pipelines/issue-1", 3);
    commitAll("named after another issue");
    assert.deepEqual(discover("--issue", "1").map(({ state, ref, folder }) => `${state} ${ref} ${folder}`), [
      "live followup .pipelines/merged",
      "merged main .pipelines/merged",
    ]);
    assert.deepEqual(discover("--issue", "3").map(({ ref }) => ref), ["issue-1"]);
    assert.deepEqual(discover("--issue", "9"), []);
  });

  it("prints one line per pipeline: <state> <ref> <folder>", () => {
    scenario();
    assert.equal(rp("pipelines", root, "--issue", "2"), "live live .pipelines/fresh-work\nlive origin/live .pipelines/fresh-work\n");
    assert.equal(rp("pipelines", root, "--issue", "9"), "");
  });

  const roots = [
    ["no conventions", {}, ".pipelines"],
    [".rp.md", { ".rp.md": "work/" }, "work"],
    [".rp.local.md over .rp.md", { ".rp.md": "work/", ".rp.local.md": "`local`" }, "local"],
    [".rp.md when .rp.local.md has no heading", { ".rp.md": "work/", ".rp.local.md": null }, "work"],
  ];
  for (const [what, files, expectedRoot] of roots)
    it(`reads the pipelines folder root from ${what} in the working tree`, () => {
      for (const [name, value] of Object.entries(files)) writeFile(name, value === null ? "# Local\n\n### Other\n\nx\n" : `# Conventions\n\n### Pipelines folder root\n\n${value}\n\n### Other\n\ny\n`);
      git(root, "checkout", "--quiet", "-b", "a", "main");
      for (const folder of ["work/one", "local/two", ".pipelines/three"]) recordPipeline(folder, 4);
      commitAll("pipelines");
      assert.deepEqual(discover().map(({ folder }) => folder.split("/")[0]), [expectedRoot]);
    });

  it("reads the conventions from the main checkout when run in a linked worktree", () => {
    git(root, "checkout", "--quiet", "main");
    writeFile(".git/info/exclude", ".rp.local.md\n.wt/\n");
    writeFile(".rp.md", "### Pipelines folder root\n\nwork/\n");
    git(root, "add", ".rp.md");
    git(root, "commit", "--quiet", "-m", "conventions");
    writeFile(".rp.local.md", "### Pipelines folder root\n\nlocal/\n");
    git(root, "checkout", "--quiet", "-b", "a", "main");
    for (const folder of ["work/one", "local/two"]) recordPipeline(folder, 4);
    commitAll("pipelines");
    git(root, "worktree", "add", "--quiet", "-b", "linked", ".wt", "main");
    const linked = JSON.parse(rp("pipelines", `${root}/.wt`, "--json")).map(({ folder }) => folder);
    assert.deepEqual(linked, ["local/two"]);
    rmSync(`${root}/.rp.local.md`);
    assert.deepEqual(JSON.parse(rp("pipelines", `${root}/.wt/src`, "--json")).map(({ folder }) => folder), ["work/one"]);
  });

  it("stops on a Pipelines folder root heading without a usable value", () => {
    writeFile(".rp.local.md", "### Pipelines folder root\n\n../outside\n");
    const out = run("pipelines", root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /\.rp\.local\.md: Pipelines folder root must be a relative folder/);
  });

  it("stops when a pipeline folder at a tip has no readable run-config.md", () => {
    git(root, "checkout", "--quiet", "-b", "broken", "main");
    writeFile(".pipelines/broken/0-intent/intent.md", "origin: issue 5\n");
    commitAll("broken");
    const out = run("pipelines", root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot read broken:\.pipelines\/broken\/run-config\.md/);
  });

  it("stops when a pipeline's base does not resolve", () => {
    git(root, "checkout", "--quiet", "-b", "orphan", "main");
    writeFile(".pipelines/orphan/run-config.md", '---\n{"target-phase": 4, "base": "gone"}\n---\n');
    writeFile(".pipelines/orphan/0-intent/intent.md", "origin: issue 5\n");
    commitAll("orphan");
    const out = run("pipelines", root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /base of orphan:\.pipelines\/orphan does not resolve/);
  });
});
