import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { commitAll, git, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

const CONFIG = '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n';
function recordPipeline(folder, issue, extra = "") {
  writeFile(`${folder}/run-config.md`, CONFIG);
  writeFile(`${folder}/0-intent/intent.md`, `origin: issue ${issue}\norigin: starts-from main\n\n# Intent\n${extra}`);
}
const discover = (...args) => JSON.parse(rp("pipelines", root, "--base", "main", "--json", ...args)).map(({ state, ref, folder, origins }) => ({ state, ref, folder, origins }));
const formats = (...args) => JSON.parse(rp("pipelines", root, "--base", "main", "--json", ...args)).map(({ state, format, ref, folder, origins }) => `${state} ${format} ${ref} ${folder} ${origins.join(",")}`);

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

  it("prints one line per pipeline: <state> <format> <ref> <folder>", () => {
    scenario();
    assert.equal(rp("pipelines", root, "--base", "main", "--issue", "2"), "live 6 live .pipelines/fresh-work\nlive 6 origin/live .pipelines/fresh-work\n");
    assert.equal(rp("pipelines", root, "--base", "main", "--issue", "9"), "");
  });

  it("decides live and merged against the --base branch's history, not each run-config.md's base", () => {
    scenario();
    git(root, "branch", "release", "old");
    assert.deepEqual(JSON.parse(rp("pipelines", root, "--base", "release", "--json")).map(({ state, ref, folder }) => `${state} ${ref} ${folder}`), [
      "live live .pipelines/fresh-work",
      "live origin/live .pipelines/fresh-work",
      "live followup .pipelines/merged",
      "merged release .pipelines/merged",
    ]);
  });

  // [what, how the pipeline folder is written, its format, its origins]
  const kinds = [
    ["a v3 run-config.md", { "run-config.md": '---\n{"workflow": "autonomous", "target-phase": 4}\n---\n', "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["no run-config.md", { "1-spec/spec.md": "# S\n", "0-intent/intent.md": "---\n{\"origin\": \"issue 5\"}\n---\norigin: issue 5\n# I\n" }, "earlier", "issue 5"],
    ["no run-config.md and no intent", { "1-spec/spec.md": "# S\n" }, "earlier", ""],
    ["a run-config.md without frontmatter", { "run-config.md": "format: 6\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["a run-config.md with malformed JSON", { "run-config.md": "---\n{format: 6\n---\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["a run-config.md that is a folder", { "run-config.md/x": "x\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["an intent that is a folder in an earlier pipeline", { "0-intent/intent.md/x": "origin: issue 5\n" }, "earlier", ""],
    ["an intent with malformed frontmatter", { "0-intent/intent.md": "---\n{\norigin: issue 5\n" }, "earlier", ""],
    ["format 6 with keys check would reject", { "run-config.md": '---\n{"format": 6, "workflow": "x"}\n---\n', "0-intent/intent.md": "origin: issue 5\n" }, 6, "issue 5"],
    ["a newer format", { "run-config.md": '---\n{"format": 7}\n---\n', "0-intent/intent.md": "origin: issue 5\n" }, 7, "issue 5"],
    ["malformed files discovery does not read", { "run-config.md": CONFIG, "0-intent/intent.md": "origin: issue 5\n", "threads/1-x.md": "status: nope\n", "1-spec/spec.md/x": "x\n" }, 6, "issue 5"],
  ];
  for (const [what, files, format, origins] of kinds)
    it(`lists a pipeline with ${what} as format ${format}`, () => {
      git(root, "checkout", "--quiet", "-b", "old-work", "main");
      for (const [rel, contents] of Object.entries(files)) writeFile(`.pipelines/p/${rel}`, contents);
      commitAll("pipeline");
      assert.deepEqual(formats(), [`live ${format} old-work .pipelines/p ${origins}`]);
    });

  it("lists merged pipelines of an earlier format in the base branch", () => {
    git(root, "checkout", "--quiet", "main");
    writeFile(".pipelines/v3/run-config.md", '---\n{"workflow": "autonomous"}\n---\n');
    writeFile(".pipelines/v2/0-intent/intent.md", "origin: issue 8\n");
    commitAll("history");
    assert.deepEqual(formats(), ["merged earlier main .pipelines/v2 issue 8", "merged earlier main .pipelines/v3 "]);
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
    const linked = JSON.parse(rp("pipelines", `${root}/.wt`, "--base", "main", "--json")).map(({ folder }) => folder);
    assert.deepEqual(linked, ["local/two"]);
    rmSync(`${root}/.rp.local.md`);
    assert.deepEqual(JSON.parse(rp("pipelines", `${root}/.wt/src`, "--base", "main", "--json")).map(({ folder }) => folder), ["work/one"]);
  });

  it("stops on a Pipelines folder root heading without a usable value", () => {
    writeFile(".rp.local.md", "### Pipelines folder root\n\n../outside\n");
    const out = run("pipelines", root, "--base", "main");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /\.rp\.local\.md: Pipelines folder root must be a relative folder/);
  });

  for (const [what, intent] of [["no intent", null], ["an intent that is a folder", "0-intent/intent.md/x"]])
    it(`stops on a format 6 pipeline with ${what}`, () => {
      git(root, "checkout", "--quiet", "-b", "broken", "main");
      writeFile(".pipelines/broken/run-config.md", CONFIG);
      if (intent) writeFile(`.pipelines/broken/${intent}`, "x\n");
      commitAll("broken");
      const out = run("pipelines", root, "--base", "main");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /cannot read broken:\.pipelines\/broken\/0-intent\/intent\.md: missing/);
    });

  for (const [what, args, message] of [
    ["--base missing", [], /--base <artifact base branch> is required/],
    ["a --base that does not resolve", ["--base", "gone"], /--base does not resolve to a commit: gone/],
  ])
    it(`stops on ${what}`, () => {
      const out = run("pipelines", root, ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });
});
