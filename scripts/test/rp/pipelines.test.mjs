import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { RP, commitAll, git, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

const CONFIG = '{"target-phase": 4, "base": "main", "worktree-folder-root": ".worktrees"}\n';
function recordPipeline(folder, issue, extra = "") {
  writeFile(`${folder}/run-config.json`, CONFIG);
  writeFile(`${folder}/0-intent/intent.md`, `---\nissue: ${issue}\nstarts-from: main\n---\n\n# Intent\n${extra}`);
}
const discover = (...args) => JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--json", ...args)).map(({ state, ref, folder, origins }) => ({ state, ref, folder, origins }));
// Each listed pipeline as `<state> <ref> <folder> <origins>`.
const listed = (...args) => discover(...args).map(({ state, ref, folder, origins }) => `${state} ${ref} ${folder} ${origins.join(",")}`);

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

  it("filters by the issue the intent names, not by folder or branch name", () => {
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

  it("prints one line per pipeline, <state> <ref> <folder>, and with --json each pipeline's state, ref, commit, folder, and origins", () => {
    scenario();
    assert.equal(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--issue", "2"), "live live .pipelines/fresh-work\nlive origin/live .pipelines/fresh-work\n");
    assert.equal(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--issue", "9"), "");
    assert.deepEqual(JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--issue", "2", "--json"))[0],
      { state: "live", ref: "live", commit: git(root, "rev-parse", "live").trim(), folder: ".pipelines/fresh-work", origins: ["issue 2", "starts-from main"] });
  });

  it("decides live and merged against the --base branch's history, not each run-config.json's base", () => {
    scenario();
    git(root, "branch", "release", "old");
    assert.deepEqual(JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "release", "--json")).map(({ state, ref, folder }) => `${state} ${ref} ${folder}`), [
      "live live .pipelines/fresh-work",
      "live origin/live .pipelines/fresh-work",
      "live followup .pipelines/merged",
      "merged release .pipelines/merged",
    ]);
  });

  it("lists only the folders holding run-config.json, live and merged, whatever else a folder of the root holds", () => {
    // Folders of the root without run-config.json, each with an intent naming issue 5 where it has one.
    const others = {
      "run-config-md/run-config.md": '---\n{"format": 7, "target-phase": 4, "base": "main"}\n---\n', "run-config-md/0-intent/intent.md": "---\nissue: 5\n---\n",
      "phase-folder/1-spec/spec.md": "# S\n", "phase-folder/0-intent/intent.md": "origin: issue 5\n",
      "prompt/prompt.md": "p\n", "base/base/0-intent/intent.md": "origin: issue 5\n", "intent-only/0-intent/intent.md": "---\nissue: 5\n---\n",
      "bin/env.mjs": "tooling\n", "README.md": "notes\n",
    };
    git(root, "checkout", "--quiet", "main");
    for (const [rel, contents] of Object.entries(others)) writeFile(`.pipelines/${rel}`, contents);
    recordPipeline(".pipelines/merged", 5);
    commitAll("merged folders");
    git(root, "checkout", "--quiet", "-b", "work", "main");
    for (const [rel, contents] of Object.entries(others)) writeFile(`.pipelines/live-${rel}`, contents);
    recordPipeline(".pipelines/live", 5);
    commitAll("live folders");
    assert.deepEqual(listed("--issue", "5"), ["live work .pipelines/live issue 5,starts-from main", "merged main .pipelines/merged issue 5,starts-from main"]);
  });

  // [what, the listed pipeline's files, its origins]
  const intents = [
    ["a run-config.json check would reject", { "run-config.json": '{"workflow": "x"}\n', "0-intent/intent.md": "---\nissue: 5\n---\n" }, "issue 5"],
    ["an intent whose frontmatter is outside the subset", { "run-config.json": CONFIG, "0-intent/intent.md": "---\nissue: #5\n---\n" }, ""],
    ["an intent with unclosed frontmatter", { "run-config.json": CONFIG, "0-intent/intent.md": "---\nissue: 5\n" }, ""],
    ["an intent whose origins are body lines only", { "run-config.json": CONFIG, "0-intent/intent.md": "origin: issue 5\n\n# I\n" }, ""],
    ["malformed files discovery does not read", { "run-config.json": CONFIG, "0-intent/intent.md": "---\nissue: 5\nstatus: x\n---\n", "threads/1-x.md": "status: nope\n", "1-spec/spec.md/x": "x\n" }, "issue 5"],
  ];
  for (const [what, files, origins] of intents)
    it(`lists a pipeline with ${what}, reading only its intent's origins`, () => {
      git(root, "checkout", "--quiet", "-b", "work", "main");
      for (const [rel, contents] of Object.entries(files)) writeFile(`.pipelines/p/${rel}`, contents);
      commitAll("pipeline");
      assert.deepEqual(listed(), [`live work .pipelines/p ${origins}`]);
    });

  // Discovery from a pipelines folder root given at `cwd`: the folders it lists.
  const discoverAt = (cwd, given) => {
    const out = spawnSync(process.execPath, [RP, "pipelines", given, "--base", "main", "--json"], { cwd, encoding: "utf8" });
    assert.equal(out.status, 0, out.stderr);
    return JSON.parse(out.stdout).map(({ ref, folder }) => `${ref} ${folder}`);
  };
  function twoRoots() {
    git(root, "checkout", "--quiet", "-b", "a", "main");
    for (const folder of ["work/one", ".pipelines/two"]) recordPipeline(folder, 4);
    commitAll("pipelines");
    git(root, "update-ref", "refs/remotes/origin/a", "a");
    git(root, "checkout", "--quiet", "main");
  }
  const givenRoots = [
    ["absolute", () => [tmpdir(), `${root}/work`]],
    ["relative to the process directory", () => [root, "work"]],
    ["relative from a subfolder, with a trailing slash", () => { writeFile("src/x", "x\n"); return [`${root}/src`, "../work/"]; }],
    ["inside a linked worktree", () => { git(root, "worktree", "add", "--quiet", "-b", "linked", ".wt", "main"); return [tmpdir(), `${root}/.wt/work`]; }],
  ];
  for (const [what, given] of givenRoots)
    it(`lists the pipelines under a root given ${what}, at local and remote-tracking tips, absent from the working tree`, () => {
      twoRoots();
      assert.deepEqual(discoverAt(...given()), ["a work/one", "origin/a work/one"]);
    });

  const badRoots = [
    ["a file", () => { writeFile("work", "x\n"); return `${root}/work`; }, /pipelines: not a folder: .*\/work/],
    ["the repository root", () => root, /the pipelines folder root is a folder inside the repository, not its root/],
    ["a folder outside any repository", () => mkdtempSync(join(tmpdir(), "rp-norepo-")), /cannot locate a git repository/],
  ];
  for (const [what, given, message] of badRoots)
    it(`stops on a pipelines folder root that is ${what}`, () => {
      const out = run("pipelines", given(), "--base", "main");
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });

  for (const [what, intent] of [["no intent", null], ["an intent that is a folder", "0-intent/intent.md/x"]])
    it(`stops on a pipeline with ${what}`, () => {
      git(root, "checkout", "--quiet", "-b", "broken", "main");
      writeFile(".pipelines/broken/run-config.json", CONFIG);
      if (intent) writeFile(`.pipelines/broken/${intent}`, "x\n");
      commitAll("broken");
      const out = run("pipelines", `${root}/.pipelines`, "--base", "main");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /cannot read broken:\.pipelines\/broken\/0-intent\/intent\.md: missing/);
    });

  it("reads an intent's origins from its frontmatter as the text written, in the order written", () => {
    git(root, "checkout", "--quiet", "-b", "p", "main");
    writeFile(".pipelines/p/run-config.json", CONFIG);
    writeFile(".pipelines/p/0-intent/intent.md", "---\nre-attempts: old-slug\nissue: 0368\nstarts-from: 'feature/x'\n---\n\n# Intent\n");
    writeFile(".pipelines/q/run-config.json", CONFIG);
    writeFile(".pipelines/q/0-intent/intent.md", '---\nissue: "#368"\n---\n');
    commitAll("pipelines");
    assert.deepEqual(discover(), [
      { state: "live", ref: "p", folder: ".pipelines/p", origins: ["re-attempts old-slug", "issue 0368", "starts-from feature/x"] },
      { state: "live", ref: "p", folder: ".pipelines/q", origins: ["issue #368"] },
    ]);
    assert.deepEqual(discover("--issue", "0368").map(({ folder }) => folder), [".pipelines/p"]);
    assert.deepEqual(discover("--issue", "#368").map(({ folder }) => folder), [".pipelines/q"]);
  });

  for (const [what, args, message] of [
    ["--base missing", [], /--base <artifact base branch> is required/],
    ["a --base that does not resolve", ["--base", "gone"], /--base does not resolve to a commit: gone/],
  ])
    it(`stops on ${what}`, () => {
      const out = run("pipelines", `${root}/.pipelines`, ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });
});
