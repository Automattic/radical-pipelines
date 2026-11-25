import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
// The turn record of the pipeline branch `branch`.
const recordOf = (branch = "demo") => join(realpathSync(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir").trim()), "rp-turns", `${branch}.json`);
// Writes the turn record of `demo`: a turn of each role, by its name, on `branch` in `worktree`, at HEAD.
function record(turns) {
  mkdirSync(dirname(recordOf()), { recursive: true });
  writeFileSync(recordOf(), JSON.stringify({ folder: PIPELINE, woke: [], complete: [], reported: [],
    turns: Object.fromEntries(Object.entries(turns).map(([role, { branch, worktree }]) => [role, { branch, worktree, commit: commit("HEAD") }])) }));
}
// A branch at HEAD with a worktree under `.worktrees`, as a lane's is, built with Git alone.
function seatAt(branch) {
  const path = join(at(), ".worktrees", branch);
  git(root, "worktree", "add", "--quiet", "-b", branch, path);
  return path;
}
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
    assert.deepEqual(JSON.parse(readFileSync(recordOf(), "utf8")), { folder: PIPELINE, turns: {}, woke: [], complete: [], reported: [] });
    assert.equal(commit("demo"), commit("main"));
    assert.equal(git(seat("demo"), "symbolic-ref", "--short", "HEAD").trim(), "demo");
    assert.equal(spawnSync("git", ["rev-parse", "--abbrev-ref", "demo@{upstream}"], { cwd: root }).status !== 0, true);
    assert.deepEqual(readFileSync(join(folder("demo"), "config.json")), readFileSync(configFile));
    assert.deepEqual(start("demo", "--apply"), [`pipeline-folder ${folder("demo")}`]);
  });

  it("applies again only what a failed action left", () => {
    writeFile(".worktrees/demo/occupied.txt", "in the way\n");
    const out = run("start", abs(PIPELINE), "--branch", "demo", "--config", configFile, "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /^rp: start --apply: create-worktree /m);
    assert.ok(branches().includes("demo"));
    rmSync(seat("demo"), { recursive: true, force: true });
    assert.deepEqual(start("demo", "--apply").filter((line) => !line.startsWith("hook ")),
      [`create-worktree pipeline demo ${seat("demo")}`, `write-config ${join(folder("demo"), "config.json")}`, `pipeline-folder ${folder("demo")}`]);
  });

  it("stops on a pipeline branch whose turn record names another pipeline folder, creating nothing", () => {
    start("demo", "--apply");
    const before = snapshot();
    const out = run("start", abs(".pipelines/other"), "--branch", "demo", "--config", configFile, "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /^rp: start: demo is the pipeline branch of \.pipelines\/demo, not \.pipelines\/other$/m);
    assert.deepEqual(snapshot(), before);
  });

  it("makes a pipeline that stop keeps and close removes before its configuration is committed", () => {
    start("demo", "--apply");
    assert.deepEqual(lines("stop", abs(PIPELINE), "--branch", "demo", "--apply"), []);
    rmSync(join(folder("demo"), "config.json"));
    lines("close", abs(PIPELINE), "--branch", "demo", "--apply");
    assert.deepEqual(worktrees(), [at()]);
    assert.equal(existsSync(recordOf()), false);
  });

  it("writes no config.json the branch already holds as given", () => {
    git(root, "checkout", "--quiet", "-b", "demo");
    writeFile(`${PIPELINE}/config.json`, readFileSync(configFile));
    commitAll("the configuration");
    git(root, "checkout", "--quiet", "main");
    assert.ok(!start("demo").some((line) => line.startsWith("write-config ")));
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

  it("finds the branch where a remote's fetch refspec maps it", () => {
    const remote = newRepo();
    try {
      git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
      git(remote, "branch", "--quiet", "demo");
      git(root, "remote", "add", "other", remote);
      git(root, "config", "remote.other.fetch", "+refs/heads/*:refs/remotes/team/*");
      git(root, "fetch", "--quiet", "other");
      start("demo", "--apply");
      assert.equal(commit("demo"), commit("refs/remotes/team/demo"));
    } finally { rmSync(remote, { recursive: true, force: true }); }
  });

  // [the remote's fetch refspecs, the ref the branch starts at]
  const refspecs = [
    ["two destinations for the branch", ["+refs/heads/*:refs/remotes/other/*", "+refs/heads/*:refs/remotes/mirror/*"], "refs/remotes/other/demo"],
    ["a negative refspec that excludes the branch", ["+refs/heads/*:refs/remotes/other/*", "^refs/heads/demo"], "main"],
  ];
  for (const [what, specs, starts] of refspecs)
    it(`reads a remote with ${what}`, () => {
      const remote = newRepo();
      try {
        git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
        git(remote, "branch", "--quiet", "demo");
        git(root, "remote", "add", "other", remote);
        git(root, "fetch", "--quiet", "other");
        git(root, "config", "--unset-all", "remote.other.fetch");
        for (const spec of specs.filter((each) => !each.startsWith("^"))) git(root, "config", "--add", "remote.other.fetch", spec);
        git(root, "fetch", "--quiet", "other");
        for (const spec of specs.filter((each) => each.startsWith("^"))) git(root, "config", "--add", "remote.other.fetch", spec);
        start("demo", "--apply");
        assert.equal(commit("demo"), commit(starts));
      } finally { rmSync(remote, { recursive: true, force: true }); }
    });

  it("takes a branch a remote holds under a name that starts with the remote's", () => {
    const remote = newRepo();
    try {
      git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
      for (const name of ["topic", "origin/topic"]) git(remote, "branch", "--quiet", name);
      git(root, "remote", "add", "origin", remote);
      git(root, "fetch", "--quiet", "origin");
      start("origin/topic", "--apply");
      assert.equal(commit("refs/heads/origin/topic"), commit("refs/remotes/origin/origin/topic"));
    } finally { rmSync(remote, { recursive: true, force: true }); }
  });

  it("stops on a remote-tracking branch's name, creating nothing", () => {
    const remote = newRepo();
    try {
      git(remote, "commit", "--quiet", "--allow-empty", "-m", "remote work");
      git(remote, "branch", "--quiet", "demo");
      git(root, "remote", "add", "origin", remote);
      git(root, "fetch", "--quiet", "origin");
      const out = run("start", abs(PIPELINE), "--branch", "origin/demo", "--config", configFile, "--apply");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /names a remote-tracking branch/);
      assert.deepEqual(branches(), ["main"]);
    } finally { rmSync(remote, { recursive: true, force: true }); }
  });

  // [what the pipeline branch holds where config.json is written, how it is committed]
  const outside = [
    ["a symbolic link as config.json", (target) => { mkdirSync(abs(PIPELINE), { recursive: true }); symlinkSync(target, abs(`${PIPELINE}/config.json`)); }],
    ["a symbolic link as the pipeline folder", (target) => { mkdirSync(abs(dirname(PIPELINE)), { recursive: true }); symlinkSync(dirname(target), abs(PIPELINE)); }],
  ];
  for (const [what, build] of outside)
    it(`stops on ${what}, writing nothing through it`, () => {
      const target = join(scratch, "elsewhere", "config.json");
      mkdirSync(dirname(target));
      writeFileSync(target, "kept\n");
      git(root, "checkout", "--quiet", "-b", "demo");
      build(target);
      commitAll("a link");
      git(root, "checkout", "--quiet", "main");
      const out = run("start", abs(PIPELINE), "--branch", "demo", "--config", configFile, "--apply");
      assert.equal(out.status, 1);
      assert.match(out.stderr, /^rp: start --apply: write-config .*cannot write/m);
      assert.equal(readFileSync(target, "utf8"), "kept\n");
    });

  it("stops on a pipeline worktree whose folder is missing", () => {
    start("demo", "--apply");
    rmSync(seat("demo"), { recursive: true, force: true });
    const out = run("start", abs(PIPELINE), "--branch", "demo", "--config", configFile);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /^rp: the worktree of demo is missing: .*git worktree prune/);
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
  const stop = (...args) => lines("stop", abs(PIPELINE), "--branch", "demo", ...args);
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

  it("reads the pipeline from its branch, from any worktree", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    git(root, "checkout", "--quiet", "main");
    assert.deepEqual(stop(), removes("spec-producer-a", "demo-spec-a"));
  });

  // A lane holds work that has not landed while its branch holds unlanded commits or its worktree holds stray files.
  // [the lane's state, how it is reached, whether stop removes its worktree and branch]
  const states = [
    ["at the tip", () => {}, true],
    ["holding unlanded commits", () => commitIn(laneWorktree("demo-spec-a"), candidate("a")), false],
    ["whose commits landed", () => { commitIn(laneWorktree("demo-spec-a"), candidate("a")); landRole("spec-producer-a"); }, true],
    ["holding a merge commit the tip does not reach", () => {
      const wt = laneWorktree("demo-spec-a");
      git(wt, "checkout", "--quiet", "-b", "side");
      commitIn(wt, candidate("a"), "side work");
      git(wt, "checkout", "--quiet", "demo-spec-a");
      git(wt, "merge", "--quiet", "--no-ff", "-m", "merge side", "side");
    }, false],
    ["holding an untracked file", () => writeFileSync(join(laneWorktree("demo-spec-a"), "scratch.txt"), "kept\n"), false],
    ["holding a modified file", () => writeFileSync(join(laneWorktree("demo-spec-a"), "src/app.js"), "export const a = 9;\n"), false],
    ["holding an untracked file the status configuration hides", () => {
      git(root, "config", "status.showUntrackedFiles", "no");
      writeFileSync(join(laneWorktree("demo-spec-a"), "scratch.txt"), "kept\n");
    }, false],
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

  it("keeps a review lane holding a merge commit, which git cherry leaves out", () => {
    pipeline(3, { lanes: [lane("reviewer", "a")] });
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("code");
    apply();
    const wt = laneWorktree("demo-review-a");
    git(wt, "checkout", "--quiet", "-b", "side");
    writeFileSync(join(wt, "notes.txt"), "side\n");
    git(wt, "add", "-A");
    git(wt, "commit", "--quiet", "-m", "side");
    git(wt, "checkout", "--quiet", "demo-review-a");
    git(wt, "merge", "--quiet", "--no-ff", "--no-commit", "side");
    writeFileSync(join(wt, "evil.txt"), "only in the merge\n");
    git(wt, "add", "-A");
    git(wt, "commit", "--quiet", "-m", "merge side");
    git(wt, "branch", "--quiet", "-D", "side");
    git(root, "cherry-pick", "--quiet", git(root, "rev-parse", "demo-review-a^2").trim());
    assert.deepEqual(stop(), []);
  });

  it("removes the worktree and branch of a lane the configuration no longer declares", () => {
    pipeline(0, { lanes: SPEC_LANES });
    apply();
    configure({ lanes: [lane("spec-producer", "a")] });
    commitAll("drop lane b");
    sameLines(stop(), [...removes("spec-producer-a", "demo-spec-a"), ...removes("spec-producer-b", "demo-spec-b")]);
  });

  it("removes nothing of a pipeline branch with no turn record, which rp start did not make on this machine", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    git(root, "worktree", "add", "--quiet", "-b", "unrelated", join(at(), ".worktrees", "unrelated"), "main");
    const before = snapshot();
    for (const command of ["stop", "close"]) assert.deepEqual(lines(command, abs(PIPELINE), "--branch", "unrelated", "--apply"), []);
    assert.deepEqual(snapshot(), before);
  });

  it("has next and land stop on a turn record that names another pipeline folder", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    writeFileSync(recordOf(), JSON.stringify({ ...JSON.parse(readFileSync(recordOf(), "utf8")), folder: ".pipelines/other" }));
    for (const args of [["next"], ["land", "--role", "spec-producer-a"]]) {
      const out = run(args[0], abs(PIPELINE), ...args.slice(1));
      assert.equal(out.status, 1);
      assert.match(out.stderr, new RegExp(`^rp: ${args[0]}: demo is the pipeline branch of \\.pipelines/other, not \\.pipelines/demo$`, "m"));
    }
  });

  it("stops on a pipeline folder other than the one the turn record names, removing nothing", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    const before = snapshot();
    for (const command of ["stop", "close"]) {
      const out = run(command, abs(".pipelines/tooling"), "--branch", "demo", "--apply");
      assert.equal(out.status, 1);
      assert.match(out.stderr, new RegExp(`^rp: ${command}: demo is the pipeline branch of \\.pipelines/demo, not \\.pipelines/tooling$`, "m"));
    }
    assert.deepEqual(snapshot(), before);
  });

  it("requires --branch", () => {
    const out = run("stop", abs(PIPELINE));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /--branch <pipeline branch> is required\nusage: node rp.mjs stop/);
  });

  it("takes each deleted lane out of the turn record as its branch goes, before a later action stops it", () => {
    pipeline(0, { lanes: SPEC_LANES });
    apply();
    writeFileSync(abs(".git/refs/heads/demo-spec-b.lock"), "");
    assert.equal(run("stop", abs(PIPELINE), "--branch", "demo", "--apply").status, 1);
    assert.deepEqual(branches(), ["demo", "demo-spec-b", "main"]);
    rmSync(abs(".git/refs/heads/demo-spec-b.lock"));
    seatAt("demo-spec-a");
    assert.deepEqual(stop("--apply"), ["delete-branch demo-spec-b"]);
    assert.ok(branches().includes("demo-spec-a"));
  });

  // A lane is the pipeline's by its recorded turn on the branch the pipeline branch gives it, never by a name alone.
  // [what holds the lane's name, the turn record, whether stop removes it]
  const owned = [
    ["a branch and worktree no turn is recorded on", () => seatAt("demo-spec-a"), false],
    ["a branch and worktree another role's turn is recorded on", () => { seatAt("demo-spec-a"); record({ "spec-producer-b": { branch: "demo-spec-b", worktree: join(at(), ".worktrees", "demo-spec-b") } }); }, false],
    ["a turn recorded for another pipeline branch", () => record({ "spec-producer-a": { branch: "other-spec-a", worktree: seatAt("other-spec-a") } }), false],
    ["a turn recorded on a branch of its name that lacks the turn commit", () => {
      const path = join(at(), ".worktrees", "demo-spec-a");
      git(root, "worktree", "add", "--quiet", "-b", "demo-spec-a", path, "main");
      record({ "spec-producer-a": { branch: "demo-spec-a", worktree: path } });
    }, false],
    ["a turn recorded on its branch", () => record({ "spec-producer-a": { branch: "demo-spec-a", worktree: seatAt("demo-spec-a") } }), true],
  ];
  for (const [what, build, removed] of owned)
    it(`${removed ? "removes" : "keeps"} ${what}`, () => {
      pipeline(0, { lanes: SPEC_LANES });
      build();
      const before = snapshot();
      stop("--apply");
      assert.equal(snapshot().refs !== before.refs, removed);
      assert.equal(worktrees().length, removed ? 1 : 2);
    });

  it("leaves alone a branch and worktree created under the name of a lane it removed", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    stop("--apply");
    seatAt("demo-spec-a");
    assert.deepEqual(stop(), []);
    assert.deepEqual(lines("close", abs(PIPELINE), "--branch", "demo"), []);
  });

  it("takes out of the turn record, when applied again, a turn whose branch went while the record could not be written", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    chmodSync(recordOf(), 0o444);
    const out = run("stop", abs(PIPELINE), "--branch", "demo", "--apply");
    chmodSync(recordOf(), 0o644);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /its turn stays in the turn record/);
    assert.deepEqual(branches(), ["demo", "main"]);
    stop("--apply");
    seatAt("demo-spec-a");
    assert.deepEqual(stop(), []);
  });

  it("stops on a recorded worktree left detached while another has the lane's branch checked out", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    git(laneWorktree("demo-spec-a"), "checkout", "--quiet", "--detach");
    git(root, "worktree", "add", "--quiet", join(at(), ".worktrees", "elsewhere"), "demo-spec-a");
    const before = snapshot();
    const out = run("stop", abs(PIPELINE), "--branch", "demo", "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /no longer has demo-spec-a checked out/);
    assert.deepEqual(snapshot(), before);
  });

  it("stops on a recorded worktree that no longer has the lane's branch checked out", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    git(laneWorktree("demo-spec-a"), "checkout", "--quiet", "--detach");
    const out = run("stop", abs(PIPELINE), "--branch", "demo", "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /no longer has demo-spec-a checked out/);
    assert.ok(branches().includes("demo-spec-a"));
  });

  it("stops on a lane's worktree whose folder is missing", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    rmSync(laneWorktree("demo-spec-a"), { recursive: true, force: true });
    const out = run("stop", abs(PIPELINE), "--branch", "demo", "--apply");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /the worktree of demo-spec-a is missing/);
    assert.ok(branches().includes("demo-spec-a"));
  });

  it("names the lanes of a pipeline branch that shares its name with a tag", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    git(root, "tag", "demo");
    assert.deepEqual(stop(), removes("spec-producer-a", "demo-spec-a"));
  });
});

describe("rp close", () => {
  useRepo();
  let seat;
  const folder = () => join(seat, PIPELINE);
  const close = (...args) => lines("close", abs(PIPELINE), "--branch", "demo", ...args);
  // The pipeline, with a spec lane `a`, in its own worktree, its lane's worktree created; the main checkout on `main`.
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
      `remove-worktree spec-producer-a ${lane}`, "delete-branch demo-spec-a", `remove-worktree pipeline ${seat}`,
      `hook after-removing-worktree spec-producer-a ${lane}`, `hook after-removing-worktree pipeline ${seat}`,
    ]);
    assert.deepEqual(snapshot(), before);
  });

  it("removes every worktree of the pipeline and its turn record, keeps the pipeline branch, and applied again does nothing", () => {
    const tip = commit("demo");
    close("--apply");
    assert.deepEqual(worktrees(), [at()]);
    assert.deepEqual(branches(), ["demo", "main"]);
    assert.equal(commit("demo"), tip);
    assert.equal(existsSync(recordOf()), false);
    assert.deepEqual(close("--apply"), []);
  });

  it("removes the worktree of a lane holding unlanded commits, keeps its branch and turn, and lands it once the pipeline worktree is created again", () => {
    const unlanded = commitIn(laneWorktree("demo-spec-a"), { "1-spec/lanes/a/spec.md": "# Candidate\n" });
    assert.ok(!close().includes("delete-branch demo-spec-a"));
    close("--apply");
    assert.deepEqual(worktrees(), [at()]);
    assert.equal(commit("demo-spec-a"), unlanded);
    git(root, "worktree", "add", "--quiet", seat, "demo");
    assert.deepEqual(lines("next", folder()).filter((line) => line.startsWith("land ")), ["land spec-producer-a"]);
    lines("land", folder(), "--role", "spec-producer-a");
    assert.ok(git(root, "merge-base", "--is-ancestor", unlanded, "demo") === "");
  });

  // [the worktree holding files its branch lacks]
  for (const [what, worktree] of [["a lane's worktree", () => laneWorktree("demo-spec-a")], ["the pipeline worktree", () => seat]])
    it(`stops while it plans, before any hook, on ${what} holding files its branch lacks, naming each, and closes once they are gone`, () => {
      git(root, "config", "status.showUntrackedFiles", "no");
      writeFileSync(join(worktree(), "scratch.txt"), "kept\n");
      writeFileSync(join(worktree(), "src/app.js"), "export const a = 9;\n");
      const before = snapshot();
      for (const args of [[], ["--apply"]]) {
        const out = run("close", abs(PIPELINE), "--branch", "demo", ...args);
        assert.deepEqual([out.status, out.stdout], [1, ""]);
        assert.equal(out.stderr, `rp: close: worktrees to remove hold files their branches lack: commit or delete them, then plan again:\n${worktree()}: src/app.js, scratch.txt\n`);
      }
      assert.deepEqual(snapshot(), before);
      rmSync(join(worktree(), "scratch.txt"));
      git(worktree(), "checkout", "--quiet", "--", "src/app.js");
      close("--apply");
      assert.deepEqual(worktrees(), [at()]);
      assert.deepEqual(branches(), ["demo", "main"]);
    });

  it("removes the turn record that holds turns of roles without a lane, whose next turns rp next records again", () => {
    commitIn(laneWorktree("demo-spec-a"), { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "candidate");
    lines("land", folder(), "--role", "spec-producer-a");
    assert.ok(lines("next", folder(), "--apply").includes("frontier consolidate spec"));
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(recordOf(), "utf8")).turns), ["spec-producer"]);
    close("--apply");
    assert.equal(existsSync(recordOf()), false);
  });

  it("keeps in the turn record the turn of a lane whose branch it keeps, and no other", () => {
    record({ "spec-producer-a": { branch: "demo-spec-a", worktree: laneWorktree("demo-spec-a") }, "spec-producer": { branch: "demo", worktree: seat } });
    commitIn(laneWorktree("demo-spec-a"), { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "candidate");
    close("--apply");
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(recordOf(), "utf8")).turns), ["spec-producer-a"]);
  });

  it("keeps a pipeline worktree that is the main checkout", () => {
    close("--apply");
    git(root, "checkout", "--quiet", "demo");
    assert.deepEqual(close("--apply"), []);
    assert.deepEqual(worktrees(), [at()]);
  });
});
