import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { RP, commitAll, git, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

const CONFIG = '---\n{"format": 8, "target-phase": 4, "base": "main"}\n---\n';
function recordPipeline(folder, issue, extra = "") {
  writeFile(`${folder}/run-config.md`, CONFIG);
  writeFile(`${folder}/0-intent/intent.md`, `---\nissue: ${issue}\nstarts-from: main\n---\n\n# Intent\n${extra}`);
}
const discover = (...args) => JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--json", ...args)).map(({ state, ref, folder, origins }) => ({ state, ref, folder, origins }));
const formats = (...args) => JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--json", ...args)).map(({ state, format, ref, folder, origins }) => `${state} ${format} ${ref} ${folder} ${origins.join(",")}`);

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

  it("prints one line per pipeline: <state> <format> <ref> <folder>", () => {
    scenario();
    assert.equal(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--issue", "2"), "live 8 live .pipelines/fresh-work\nlive 8 origin/live .pipelines/fresh-work\n");
    assert.equal(rp("pipelines", `${root}/.pipelines`, "--base", "main", "--issue", "9"), "");
  });

  it("decides live and merged against the --base branch's history, not each run-config.md's base", () => {
    scenario();
    git(root, "branch", "release", "old");
    assert.deepEqual(JSON.parse(rp("pipelines", `${root}/.pipelines`, "--base", "release", "--json")).map(({ state, ref, folder }) => `${state} ${ref} ${folder}`), [
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
    ["a run-config.md without frontmatter", { "run-config.md": "format: 7\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["a run-config.md with malformed JSON", { "run-config.md": "---\n{format: 7\n---\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["a run-config.md that is a folder", { "run-config.md/x": "x\n", "0-intent/intent.md": "origin: issue 5\n" }, "earlier", "issue 5"],
    ["an intent that is a folder in an earlier pipeline", { "0-intent/intent.md/x": "origin: issue 5\n" }, "earlier", ""],
    ["an earlier intent with unclosed frontmatter", { "0-intent/intent.md": "---\n{\norigin: issue 5\n" }, "earlier", ""],
    ["format 6, whose origins are body lines", { "run-config.md": '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n', "0-intent/intent.md": "---\nissue: 4\n---\norigin: issue 5\norigin: starts-from main\n\n# I\n" }, 6, "issue 5,starts-from main"],
    ["format 7, whose origins are its intent's frontmatter", { "run-config.md": '---\n{"format": 7, "target-phase": 4, "base": "main", "lanes": []}\n---\n', "0-intent/intent.md": "---\nissue: 5\n---\n" }, 7, "issue 5"],
    ["format 8 with keys check would reject", { "run-config.md": '---\n{"format": 8, "workflow": "x"}\n---\n', "0-intent/intent.md": "---\nissue: 5\n---\n" }, 8, "issue 5"],
    ["an intent whose frontmatter is outside the subset", { "run-config.md": CONFIG, "0-intent/intent.md": "---\nissue: #5\n---\n" }, 8, ""],
    ["an intent with unclosed frontmatter", { "run-config.md": CONFIG, "0-intent/intent.md": "---\nissue: 5\n" }, 8, ""],
    ["an intent whose origins are body lines only", { "run-config.md": CONFIG, "0-intent/intent.md": "origin: issue 5\n\n# I\n" }, 8, ""],
    ["a newer format", { "run-config.md": '---\n{"format": 9}\n---\n', "0-intent/intent.md": "---\nissue: 5\n---\n" }, 9, "issue 5"],
    ["malformed files discovery does not read", { "run-config.md": CONFIG, "0-intent/intent.md": "---\nissue: 5\nstatus: x\n---\n", "threads/1-x.md": "status: nope\n", "1-spec/spec.md/x": "x\n" }, 8, "issue 5"],
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
    it(`stops on a format 8 pipeline with ${what}`, () => {
      git(root, "checkout", "--quiet", "-b", "broken", "main");
      writeFile(".pipelines/broken/run-config.md", CONFIG);
      if (intent) writeFile(`.pipelines/broken/${intent}`, "x\n");
      commitAll("broken");
      const out = run("pipelines", `${root}/.pipelines`, "--base", "main");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /cannot read broken:\.pipelines\/broken\/0-intent\/intent\.md: missing/);
    });

  it("lists the pipelines of an issue in format 6 and format 8, each with its format and its origins", () => {
    git(root, "checkout", "--quiet", "-b", "old-work", "main");
    writeFile(".pipelines/old/run-config.md", '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n');
    writeFile(".pipelines/old/0-intent/intent.md", "origin: issue 9\n\n# Intent\n");
    commitAll("format 6");
    git(root, "checkout", "--quiet", "-b", "new-work", "old-work");
    recordPipeline(".pipelines/new", 9);
    commitAll("format 8");
    assert.deepEqual(formats("--issue", "9"), ["live 8 new-work .pipelines/new issue 9,starts-from main", "live 6 new-work .pipelines/old issue 9", "live 6 old-work .pipelines/old issue 9"]);
  });

  it("reads a format-8 intent's origins from its frontmatter as the text written, in the order written", () => {
    git(root, "checkout", "--quiet", "-b", "p", "main");
    writeFile(".pipelines/p/run-config.md", CONFIG);
    writeFile(".pipelines/p/0-intent/intent.md", "---\nre-attempts: old-slug\nissue: 0368\nstarts-from: 'feature/x'\n---\n\n# Intent\n");
    writeFile(".pipelines/q/run-config.md", CONFIG);
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
