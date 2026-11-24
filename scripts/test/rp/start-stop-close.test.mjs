import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  PIPELINE, RP, abs, apply, commitAll, commitIn, configure, git, lane, laneWorktree, landRole, newRepo, pipeline, root, run, useRepo, writeFile,
} from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b")];
const CONFIG = { "target-phase": 4, "base-branch": "main", "worktree-folder-root": ".worktrees" };
const at = () => realpathSync(root);
const commit = (ref, where = root) => git(where, "rev-parse", ref).trim();
const branches = () => git(root, "for-each-ref", "--format=%(refname:short)", "refs/heads").split("\n").filter(Boolean).sort();
const worktrees = () => git(root, "worktree", "list", "--porcelain").split("\n").filter((line) => line.startsWith("worktree ")).map((line) => realpathSync(line.slice(9))).sort();
const snapshot = () => ({ refs: git(root, "for-each-ref", "--format=%(refname) %(objectname)"), worktrees: worktrees(), status: git(root, "status", "--porcelain", "--untracked-files=all") });
// The lines a command prints, failing on a stop.
function lines(...args) {
  const out = run(...args);
  if (out.status !== 0) throw new Error(`rp ${args.join(" ")} failed: ${out.stderr}`);
  return out.stdout.split("\n").filter(Boolean);
}

describe("rp start", () => {
  useRepo();
  let scratch, configFile;
  // A configuration file outside the repository, holding `data` over the required keys.
  const config = (data = {}) => { writeFileSync(configFile, `${JSON.stringify({ ...CONFIG, ...data }, null, 2)}\n`); return configFile; };
  const start = (branch, ...args) => lines("start", abs(PIPELINE), "--branch", branch, "--config", configFile, ...args);
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "rp-start-"));
    configFile = join(scratch, "config.json");
    config();
    git(root, "checkout", "--quiet", "main");
    git(root, "branch", "--quiet", "-D", "demo");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));
  const seat = (branch) => join(at(), ".worktrees", branch);
  const folder = (branch) => join(seat(branch), PIPELINE);

  it("plans the branch at the base branch, the worktree, and the configuration, and changes nothing", () => {
    const before = snapshot();
    assert.deepEqual(start("demo"), [
      "hook before-creating-branch pipeline",
      `hook before-creating-worktree pipeline ${seat("demo")}`,
      `create-branch demo ${commit("main")}`,
      `create-worktree pipeline demo ${seat("demo")}`,
      `write-config ${join(folder("demo"), "config.json")}`,
      "hook after-creating-branch pipeline",
      `hook after-creating-worktree pipeline ${seat("demo")}`,
      `pipeline-folder ${folder("demo")}`,
    ]);
    assert.deepEqual(snapshot(), before);
  });

  it("applies the plan, and applying again repeats nothing", () => {
    start("demo", "--apply");
    assert.equal(commit("demo"), commit("main"));
    assert.equal(git(seat("demo"), "symbolic-ref", "--short", "HEAD").trim(), "demo");
    assert.equal(spawnSync("git", ["rev-parse", "--abbrev-ref", "demo@{upstream}"], { cwd: root }).status !== 0, true);
    assert.deepEqual(readFileSync(join(folder("demo"), "config.json")), readFileSync(configFile));
    assert.deepEqual(start("demo", "--apply"), [`pipeline-folder ${folder("demo")}`]);
  });

  it("starts the branch at another pipeline's branch when that is the base branch", () => {
    git(root, "checkout", "--quiet", "-b", "other");
    const tip = commitAll("other work");
    git(root, "checkout", "--quiet", "main");
    config({ "base-branch": "other" });
    start("demo", "--apply");
    assert.equal(commit("demo"), tip);
  });

  it("creates a branch a remote holds from it, tracking it", () => {
    const remote = newRepo();
    try {
      git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
      git(remote, "branch", "--quiet", "demo");
      git(root, "remote", "add", "origin", remote);
      git(root, "fetch", "--quiet", "origin");
      const held = commit("refs/remotes/origin/demo");
      assert.ok(start("demo", "--apply").includes(`create-branch demo ${held}`));
      assert.equal(commit("demo"), held);
      assert.equal(git(root, "rev-parse", "--abbrev-ref", "demo@{upstream}").trim(), "origin/demo");
    } finally { rmSync(remote, { recursive: true, force: true }); }
  });

  it("stops on a branch several remotes hold", () => {
    const remote = newRepo();
    try {
      git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
      git(remote, "branch", "--quiet", "demo");
      for (const name of ["origin", "fork"]) git(root, "remote", "add", name, remote);
      git(root, "fetch", "--quiet", "--all");
      const out = run("start", abs(PIPELINE), "--branch", "demo", "--config", configFile, "--apply");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /several remotes hold demo/);
      assert.deepEqual(branches(), ["main"]);
    } finally { rmSync(remote, { recursive: true, force: true }); }
  });

  it("creates only the worktree of a branch that exists", () => {
    git(root, "branch", "--quiet", "demo");
    assert.deepEqual(start("demo").filter((line) => /^(?:create|hook)/.test(line)), [
      `hook before-creating-worktree pipeline ${seat("demo")}`, `create-worktree pipeline demo ${seat("demo")}`, `hook after-creating-worktree pipeline ${seat("demo")}`]);
  });

  it("uses the worktree that has the branch checked out, the main checkout included", () => {
    assert.deepEqual(start("main", "--apply"), [`write-config ${join(at(), PIPELINE, "config.json")}`, `pipeline-folder ${join(at(), PIPELINE)}`]);
    assert.deepEqual(worktrees(), [at()]);
    config({ "target-phase": 2 });
    assert.deepEqual(start("main", "--apply"), [`write-config ${join(at(), PIPELINE, "config.json")}`, `pipeline-folder ${join(at(), PIPELINE)}`]);
    assert.deepEqual(readFileSync(join(at(), PIPELINE, "config.json")), readFileSync(configFile));
  });

  it("reads the configuration from standard input", () => {
    const out = spawnSync(process.execPath, [RP, "start", abs(PIPELINE), "--branch", "demo", "--config", "-", "--apply"], { cwd: tmpdir(), encoding: "utf8", input: readFileSync(configFile, "utf8") });
    assert.equal(out.status, 0, out.stderr);
    assert.deepEqual(readFileSync(join(folder("demo"), "config.json")), readFileSync(configFile));
  });

  const stops = [
    ["a malformed configuration", () => writeFileSync(configFile, JSON.stringify({ "target-phase": 9, "base-branch": "main", "worktree-folder-root": ".worktrees" })), "demo", /start: --config: target-phase/],
    ["a configuration that is missing", () => rmSync(configFile), "demo", /start: cannot read/],
    ["a base branch that does not resolve", () => config({ "base-branch": "absent" }), "demo", /base-branch/],
    ["a name that is no branch", () => {}, "a..b", /--branch names no branch/],
  ];
  for (const [what, arrange, branch, message] of stops)
    it(`stops on ${what}, creating nothing`, () => {
      arrange();
      const before = snapshot();
      const out = run("start", abs(PIPELINE), "--branch", branch, "--config", configFile, "--apply");
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.deepEqual(snapshot(), before);
    });

  for (const [what, args] of [["--branch", ["--config", "x"]], ["--config", ["--branch", "demo"]]])
    it(`requires ${what}`, () => {
      const out = run("start", abs(PIPELINE), ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, new RegExp(`${what}.*is required\\nusage: node rp.mjs start`));
    });
});

describe("rp stop", () => {
  useRepo();
  const stop = (...args) => lines("stop", abs(PIPELINE), ...args);
  const candidate = (id) => ({ [`1-spec/lanes/${id}/spec.md`]: `# Candidate ${id}\n` });
  const removes = (role, branch) => [`hook before-removing-worktree ${role} ${laneWorktree(branch)}`, `remove-worktree ${role} ${laneWorktree(branch)}`, `delete-branch ${branch}`, `hook after-removing-worktree ${role} ${laneWorktree(branch)}`];
  const sameLines = (actual, expected) => assert.deepEqual([...actual].sort(), [...expected].sort());

  it("prints what it removes and changes nothing", () => {
    pipeline(0, { lanes: SPEC_LANES });
    apply();
    const before = snapshot();
    sameLines(stop(), [...removes("spec-producer-a", "demo-spec-a"), ...removes("spec-producer-b", "demo-spec-b")]);
    assert.deepEqual(snapshot(), before);
  });

  it("orders the hooks around the actions, worktrees before branches", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    assert.deepEqual(stop(), removes("spec-producer-a", "demo-spec-a"));
  });

  // [the lane's state, how it is reached, whether its worktree and branch are removed]
  const states = [
    ["at the tip", () => {}, true],
    ["holding unlanded commits", () => commitIn(laneWorktree("demo-spec-a"), candidate("a")), false],
    ["whose commits landed", () => { commitIn(laneWorktree("demo-spec-a"), candidate("a")); landRole("spec-producer-a"); }, true],
  ];
  for (const [state, reach, removed] of states)
    it(`${removed ? "removes" : "keeps"} the worktree and branch of a production lane ${state}`, () => {
      pipeline(0, { lanes: SPEC_LANES });
      apply();
      reach();
      const tip = commit("demo");
      stop("--apply");
      assert.equal(branches().includes("demo-spec-a"), !removed);
      assert.equal(existsSync(laneWorktree("demo-spec-a")), !removed);
      assert.equal(branches().includes("demo-spec-b"), false);
      assert.equal(commit("demo"), tip);
      assert.deepEqual(stop(), []);
    });

  it("removes a review lane's worktree and branch, whose review base and review head are not unlanded commits", () => {
    pipeline(3, { lanes: [lane("reviewer", "a")] });
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("code");
    apply();
    assert.ok(existsSync(laneWorktree("demo-review-a")));
    stop("--apply");
    assert.deepEqual(branches(), ["demo", "main"]);
    assert.deepEqual(worktrees(), [at()]);
  });

  it("removes the worktree and branch of a lane the configuration no longer declares", () => {
    pipeline(0, { lanes: SPEC_LANES });
    apply();
    configure({ lanes: [lane("spec-producer", "a")] });
    commitAll("drop lane b");
    sameLines(stop(), [...removes("spec-producer-a", "demo-spec-a"), ...removes("spec-producer-b", "demo-spec-b")]);
  });

  it("stops on an untracked file in a lane's worktree, keeping the worktree and its branch", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    writeFileSync(join(laneWorktree("demo-spec-a"), "scratch.txt"), "kept\n");
    const out = run("stop", abs(PIPELINE), "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /^rp: stop --apply: remove-worktree /);
    assert.ok(existsSync(join(laneWorktree("demo-spec-a"), "scratch.txt")));
    assert.ok(branches().includes("demo-spec-a"));
  });

  it("stops on a configuration it cannot read", () => {
    pipeline(0);
    rmSync(abs(`${PIPELINE}/config.json`));
    const out = run("stop", abs(PIPELINE));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /config\.json: missing/);
  });
});

describe("rp close", () => {
  useRepo();
  let seat;
  const folder = () => join(seat, PIPELINE);
  const close = (...args) => lines("close", folder(), ...args);
  // The pipeline, with a spec lane `a`, in its own worktree, its lane's worktree created.
  beforeEach(() => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    git(root, "checkout", "--quiet", "main");
    seat = join(at(), ".worktrees", "demo");
    git(root, "worktree", "add", "--quiet", seat, "demo");
    lines("next", folder(), "--apply");
  });

  it("prints the lane's and the pipeline's worktrees to remove, the pipeline's last, and changes nothing", () => {
    const before = snapshot();
    const lane = laneWorktree("demo-spec-a");
    assert.deepEqual(close(), [
      `hook before-removing-worktree spec-producer-a ${lane}`, `hook before-removing-worktree pipeline ${seat}`,
      `remove-worktree spec-producer-a ${lane}`, `remove-worktree pipeline ${seat}`, "delete-branch demo-spec-a",
      `hook after-removing-worktree spec-producer-a ${lane}`, `hook after-removing-worktree pipeline ${seat}`,
    ]);
    assert.deepEqual(snapshot(), before);
  });

  it("removes every worktree of the pipeline and keeps the pipeline branch", () => {
    const tip = commit("demo");
    close("--apply");
    assert.deepEqual(worktrees(), [at()]);
    assert.deepEqual(branches(), ["demo", "main"]);
    assert.equal(commit("demo"), tip);
  });

  it("removes the worktree of a lane holding unlanded commits and keeps its branch", () => {
    const unlanded = commitIn(laneWorktree("demo-spec-a"), { "1-spec/lanes/a/spec.md": "# Candidate\n" });
    assert.ok(!close().includes("delete-branch demo-spec-a"));
    close("--apply");
    assert.deepEqual(worktrees(), [at()]);
    assert.equal(commit("demo-spec-a"), unlanded);
  });

  it("stops on an untracked file in the pipeline worktree, which it keeps", () => {
    writeFileSync(join(seat, "scratch.txt"), "kept\n");
    const out = run("close", folder(), "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /^rp: close --apply: remove-worktree /);
    assert.ok(existsSync(join(seat, "scratch.txt")));
  });

  it("keeps a pipeline worktree that is the main checkout", () => {
    close("--apply");
    git(root, "checkout", "--quiet", "demo");
    assert.deepEqual(lines("close", abs(PIPELINE), "--apply"), []);
    assert.deepEqual(worktrees(), [at()]);
  });
});
