import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { identity, parseFrontmatter } from "../../skills/radical-pipelines/scripts/rp.mjs";

const RP = fileURLToPath(new URL("../../skills/radical-pipelines/scripts/rp.mjs", import.meta.url));
const PIPELINE = ".pipelines/demo";

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
const P = (rel) => `${PIPELINE}/${rel}`;

function write(root, rel, contents) {
  const path = join(root, P(rel));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
const read = (root, rel) => readFileSync(join(root, P(rel)), "utf8");

function rp(root, ...args) {
  return execFileSync(process.execPath, [RP, ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
// The artifact base branch is `main`; the pipeline branch, `demo`, is cut from it.
const check = (root, ...args) => rp(root, "check", PIPELINE, "--base", "main", ...args);

function initRepo() {
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(root, "init", "--quiet", "--initial-branch=main");
  git(root, "config", "user.email", "rp-test@example.com");
  git(root, "config", "user.name", "RP Test");
  write(root, "0-intent/intent.md", "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal intent.\n");
  write(root, "1-spec/spec.md", "# Spec\n\n- R1 Requirement.\n");
  write(root, "1-spec/spec-research.md", "# Spec research\n");
  write(root, "2-design-doc/design-doc.md", "# Design doc\n\n- D1 Decision.\n");
  write(root, "2-design-doc/design-doc-research.md", "# Design research\n");
  write(root, "3-build/build-plan.md", "# Build plan\n\n## Order\n\n- T1\n- T2 <- T1\n");
  write(root, "3-build/build-plan-research.md", "# Plan research\n");
  rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "-m", "intent");
  git(root, "checkout", "--quiet", "-b", "demo");
  return root;
}

describe("rp state tooling", () => {
  let root;
  const FPS = {
    security: "111111111111",
    a11y: "222222222222",
    event: "333333333333",
    contrarian: "444444444444",
    a: "aaaaaaaaaaaa",
    b: "bbbbbbbbbbbb",
    c: "cccccccccccc",
  };
  beforeEach(() => {
    root = initRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // --- helpers over the model -------------------------------------------------

  const SPEC = ["1-spec/spec.md", "1-spec/spec-research.md", "0-intent/intent.md"];
  // A review names the artifact, its record, and everything the artifact pins.
  const DESIGN = ["2-design-doc/design-doc.md", "2-design-doc/design-doc-research.md", "0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
  const PLAN_BASE = ["3-build/build-plan.md", "3-build/build-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];

  function review(rel, verdict, reviewed, sets = [], extra = "") {
    write(root, rel, `# Review\n\nVerdict: ${verdict}\n${extra}`);
    rp(root, "stamp", P(rel), ...reviewed.flatMap((f) => ["--reviewed", P(f)]), ...sets.flatMap((kv) => ["--set", kv]), "--mirror");
  }
  function registeredReview(rel, reviewed, lane = null) {
    const pins = reviewed.map((path) => `${path}@${identity(parseFrontmatter(read(root, path)).body)}`);
    write(root, rel, `---\nreviewed:\n${pins.map((pin) => `  - ${pin}`).join("\n")}\nverdict: approved\n${lane ? `lane: ${lane}\n` : ""}---\n# Review\n\nVerdict: approved\n`);
  }
  function pairs(paths) {
    return paths.map((path) => `${path}@${identity(read(root, path))}`);
  }
  function registered(rel, fields, body = parseFrontmatter(read(root, rel)).body) {
    write(root, rel, `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}\n`).join("")}---\n${body}`);
  }
  function registeredVerdict(rel, pins, verdict = "approved", lane = null) {
    registered(rel, { reviewed: pins, verdict, ...(lane ? { lane } : {}) }, `# Review\n\nVerdict: ${verdict}\n`);
  }
  function registeredRoot(artifact, reference, reviews, lane = null) {
    const scope = dirname(artifact);
    const binding = pairs([artifact, `${scope}/spec-research.md`, ...reviews]);
    const pins = [...pairs(["0-intent/intent.md"]), ...binding];
    registered("1-spec/spec.md", { pins, "lane-packages": [JSON.stringify([artifact, binding, reference])] });
    const judged = [...pairs(["1-spec/spec.md", "1-spec/spec-research.md"]), ...pins];
    registeredVerdict("1-spec/spec-review-1.md", judged);
    if (lane) registeredVerdict("1-spec/spec-review-security-1.md", judged, "approved", lane);
  }
  function stampSpec() {
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"));
  }
  function approveSpec(wave = 1) {
    review(`1-spec/spec-review-${wave}.md`, "approved", SPEC);
  }
  function stampDesign() {
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"), "--pin", P("1-spec/spec-review-1.md"));
  }
  function approveDesign(wave = 1) {
    review(`2-design-doc/design-doc-review-${wave}.md`, "approved", DESIGN);
  }
  function writeTasks() {
    write(root, "3-build/tasks/T1.md", "# T1: first\n\n- **Depends on:** none\n");
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
  }
  function stampPlan(extraPins = []) {
    rp(root, "stamp", P("3-build/build-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), ...extraPins.flatMap((f) => ["--pin", P(f)]));
  }
  const TASKS = ["3-build/tasks/T1.md", "3-build/tasks/T2.md"];
  function approvePlan(wave = 1) {
    review(`3-build/build-plan-review-${wave}.md`, "approved", [...PLAN_BASE, ...TASKS]);
  }
  function report(id, k, outcome, deps = []) {
    write(root, `3-build/tasks/${id}-report-${k}.md`, `# Task report\n\nOutcome: ${outcome}\n`);
    rp(root, "stamp", P(`3-build/tasks/${id}-report-${k}.md`), "--reviewed", P(`3-build/tasks/${id}.md`), ...deps.flatMap((d) => ["--reviewed", P(`3-build/tasks/${d}.md`)]), "--mirror");
  }
  function approveChain(upTo) {
    stampSpec();
    approveSpec();
    if (upTo < 2) return;
    stampDesign();
    approveDesign();
    if (upTo < 3) return;
    writeTasks();
    stampPlan();
    approvePlan();
  }
  function buildDone() {
    approveChain(3);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    review("3-build/build-review-1.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/T1-report-1.md", "3-build/tasks/T2-report-1.md"]);
  }

  function gitShim(action = "") {
    const bin = join(root, ".git", "test-bin"), log = join(root, ".git", "git-calls");
    mkdirSync(bin);
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    writeFileSync(join(bin, "git"), `#!/bin/sh\nprintf '%s\\n' "$*" >> "$RP_GIT_LOG"\n${action}\nexec "$RP_REAL_GIT" "$@"\n`, { mode: 0o755 });
    return { log, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RP_REAL_GIT: realGit, RP_GIT_LOG: log } };
  }

  test("ref reader: large binary inputs and records retain their body identities", () => {
    const input = "0-intent/context\t雪\n.bin", record = "1-spec/spec-research.md";
    write(root, input, Buffer.alloc(1500000, 0xff));
    write(root, record, `# Research\n${"Evidence λ.\n".repeat(140000)}`);
    const inputPin = `${input}@${git(root, "hash-object", P(input)).trim().slice(0, 12)}`;
    registered("1-spec/spec.md", { pins: [...pairs(["0-intent/intent.md"]), inputPin] });
    const judged = [...pairs(SPEC), inputPin];
    registeredVerdict("1-spec/spec-review-1.md", judged);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "large inputs");
    const { ref: workingRef, ...working } = JSON.parse(check(root, "--target-phase", "1", "--json"));
    const { ref: committedRef, ...committed } = JSON.parse(check(root, "--target-phase", "1", "--ref", "HEAD", "--json"));
    assert.equal(working.complete, true);
    assert.deepEqual(committed, working);
    assert.equal(committedRef, git(root, "rev-parse", "HEAD").trim());
  });

  test("ref reader: four phases and resolved challenges match the worktree in one batch", (t) => {
    const challenge = "0-intent/correction-1.md";
    registered(challenge, { target: ["1-spec/spec.md#R1"], "target-identity": [identity(read(root, "1-spec/spec.md"))], origin: "issue 9" }, "# Correction\nTarget: 1-spec/spec.md#R1\nOrigin: issue 9\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", challenge]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, challenge]));
    write(root, "2-design-doc/design-doc-research.md", `# Research\n${"Evidence λ.\n".repeat(140000)}`);
    registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const buildInputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "2-design-doc/design-doc-research.md"];
    registered("3-build/build-plan.md", { pins: pairs(buildInputs) });
    const buildTask = "3-build/tasks/T1.md", buildReport = "3-build/tasks/T1-report-1.md";
    registered(buildTask, { depends: [] }, "# Task\nDepends on: none\n");
    registered(buildReport, { reviewed: pairs([buildTask]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
    const buildPackage = ["3-build/build-plan.md", "3-build/build-plan-research.md", ...buildInputs, buildTask];
    registeredVerdict("3-build/build-plan-review-1.md", pairs(buildPackage));
    registeredVerdict("3-build/build-review-1.md", pairs([...buildPackage, buildReport]));
    const docInputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md", buildTask, buildReport];
    registered("4-document/document-plan.md", { pins: pairs(docInputs) }, "# Document plan\n");
    write(root, "4-document/document-plan-research.md", "# Record\n");
    const docTask = "4-document/tasks/T1.md", docReport = "4-document/tasks/T1-report-1.md";
    registered(docTask, { depends: [] }, "# Task\nDepends on: none\n");
    registered(docReport, { reviewed: pairs([docTask]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
    const docPackage = ["4-document/document-plan.md", "4-document/document-plan-research.md", ...docInputs, docTask];
    registeredVerdict("4-document/document-plan-review-1.md", pairs(docPackage));
    registeredVerdict("4-document/document-review-1.md", pairs([...docPackage, docReport]));
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "complete pipeline");
    assert.equal(git(root, "status", "--porcelain"), "");
    const start = performance.now();
    const { ref: workingRef, ...working } = JSON.parse(check(root, "--json"));
    const worktreeMs = performance.now() - start;
    const { log, env } = gitShim();
    const refStart = performance.now();
    const { ref: committedRef, ...committed } = JSON.parse(execFileSync(process.execPath, [RP, "check", PIPELINE, "--base", "main", "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8" }));
    t.diagnostic(`worktree: ${worktreeMs.toFixed(1)} ms; batch ref: ${(performance.now() - refStart).toFixed(1)} ms`);
    assert.equal(working.frontier, "complete");
    assert.equal(working.completeThrough, 4);
    assert.equal(working.challenges[0].state, "resolved");
    assert.deepEqual(committed, working);
    const calls = readFileSync(log, "utf8").trim().split("\n");
    assert.equal(calls.filter((call) => call === "cat-file --batch").length, 1);
    assert.equal(calls.some((call) => call.startsWith("show ")), false);
  });

  test("ref reader: an unreadable committed blob aborts without computing staleness", () => {
    const file = "1-spec/spec-research.md";
    write(root, file, "# Unique record\nObject deliberately removed after commit.\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "record blob");
    const oid = git(root, "rev-parse", `HEAD:${P(file)}`).trim(), ref = git(root, "rev-parse", "HEAD").trim();
    rmSync(join(root, ".git", "objects", oid.slice(0, 2), oid.slice(2)));
    assert.equal(JSON.parse(check(root, "--target-phase", "1", "--json")).complete, true);
    assert.throws(() => check(root, "--ref", "HEAD", "--json"), (error) => {
      assert.equal(error.status, 1);
      assert.equal(error.stdout, "");
      assert.ok(error.stderr.includes(`cannot read ${ref}:${P(file)}`));
      assert.match(error.stderr, /missing/);
      assert.doesNotMatch(error.stderr, /STALE|frontier/);
      return true;
    });
  });

  for (const failure of ["truncated object", "nonzero exit"])
    test(`ref reader: ${failure} aborts with ref and path`, () => {
      const action = failure === "truncated object" ? 'if [ "$1" = "cat-file" ]; then read oid; printf "%s blob 100\\nshort" "$oid"; exit 0; fi' : 'if [ "$1" = "cat-file" ]; then "$RP_REAL_GIT" "$@"; exit 7; fi';
      const { env } = gitShim(action), ref = git(root, "rev-parse", "HEAD").trim();
      assert.throws(() => execFileSync(process.execPath, [RP, "check", PIPELINE, "--base", "main", "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => {
        assert.equal(error.status, 1);
        assert.equal(error.stdout, "");
        assert.ok(error.stderr.includes(`cannot read ${ref}:${PIPELINE}/`));
        assert.match(error.stderr, failure === "truncated object" ? /unexpected end of batch object/ : /git cat-file exited 7/);
        return true;
      });
    });

  const readFailure = (context, reason) => (error) => {
    assert.equal(error.status, 1);
    assert.equal(error.stdout, "");
    assert.ok(error.stderr.includes(`cannot read ${context}`), error.stderr);
    assert.match(error.stderr, reason);
    assert.doesNotMatch(error.stderr, /frontier|STALE|UNSTAMPED/);
    return true;
  };

  for (const mode of ["worktree", "ref"])
    for (const kind of ["absent", "file"])
      test(`reader contract: ${mode} rejects a pipeline root that is ${kind}`, () => {
        rmSync(join(root, PIPELINE), { recursive: true });
        if (kind === "file") writeFileSync(join(root, PIPELINE), "not a pipeline directory\n");
        git(root, "add", "-A");
        git(root, "commit", "--quiet", "-m", "invalid pipeline root");
        const ref = git(root, "rev-parse", "HEAD").trim();
        assert.throws(() => check(root, "--json", ...(mode === "ref" ? ["--ref", "HEAD"] : [])), readFailure(`${mode === "ref" ? ref : mode}:${PIPELINE}`, /expected a pipeline tree|ENOENT/));
      });

  for (const file of ["1-spec/spec.md", "1-spec/spec-research.md"])
    test(`reader contract: a gitlink at ${file} is an error, not a missing document`, () => {
      git(root, "rm", "--quiet", P(file));
      const commit = git(root, "rev-parse", "HEAD").trim();
      git(root, "update-index", "--add", "--cacheinfo", `160000,${commit},${P(file)}`);
      git(root, "commit", "--quiet", "-m", "gitlink instead of a document");
      const ref = git(root, "rev-parse", "HEAD").trim();
      assert.throws(() => check(root, "--ref", "HEAD", "--json"), readFailure(`${ref}:${P(file)}`, /not a regular blob/));
    });

  for (const file of ["1-spec/spec.md", "1-spec/spec-research.md"])
    test(`reader contract: a worktree directory at ${file} is not a missing document`, () => {
      rmSync(join(root, P(file)));
      mkdirSync(join(root, P(file)));
      assert.throws(() => check(root, "--json"), readFailure(`worktree:${P(file)}`, /not a regular blob: tree/));
    });

  for (const failure of ["missing", "directory", "read error"])
    test(`reader contract: listed worktree document becoming ${failure} aborts`, () => {
      const file = "1-spec/spec-research.md", path = join(root, P(file));
      const preload = join(root, ".git", "read-race.mjs");
      writeFileSync(preload, `import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { resolve, dirname } from 'node:path';
const target = fs.realpathSync(${JSON.stringify(path)}), failure = ${JSON.stringify(failure)};
const read = fs.readFileSync, list = fs.readdirSync;
let scheduled = false;
fs.readdirSync = function(path, ...args) {
  const result = list.call(this, path, ...args);
  if (!scheduled && resolve(String(path)) === dirname(target)) {
    scheduled = true;
    queueMicrotask(() => {
      if (failure === 'read error') return;
      fs.unlinkSync(target);
      if (failure === 'directory') fs.mkdirSync(target);
    });
  }
  return result;
};
fs.readFileSync = function(path, ...args) {
  if (failure === 'read error' && typeof path === 'string' && resolve(path) === target) throw new Error('injected EACCES');
  return read.call(this, path, ...args);
};
syncBuiltinESMExports();
`);
      assert.throws(() => execFileSync(process.execPath, ["--import", preload, RP, "check", PIPELINE, "--base", "main", "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), readFailure(`worktree:${P(file)}`, /ENOENT|no longer a regular file|EACCES/));
    });

  for (const mode of ["worktree", "ref"])
    test(`reader contract: ${mode} permits a review that has not been written`, () => {
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "artifact ready for its first review");
      const state = JSON.parse(check(root, "--target-phase", "1", "--json", ...(mode === "ref" ? ["--ref", "HEAD"] : [])));
      assert.deepEqual(state.contradictions, []);
      assert.equal(state.artifacts[0].state, "fresh");
      assert.equal(state.artifacts[0].lanes[0].verdict, "none");
      assert.equal(state.frontier, "review wave 1-spec/spec.md");
    });

  function protocolShim(command, mutation) {
    const script = join(root, ".git", "protocol.mjs");
    writeFileSync(script, `import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2), mutation = ${JSON.stringify(mutation)};
let output = execFileSync(process.env.RP_REAL_GIT, args, { input: args[0] === 'cat-file' ? readFileSync(0) : undefined });
if (args[0] === 'cat-file') {
  const end = output.indexOf(10), header = output.subarray(0, end).toString('ascii');
  const [oid, type, size] = header.split(' ');
  const changed = { missing: oid + ' missing', 'non-blob': oid + ' tree ' + size, extra: header + ' extra', space: header + ' ', cr: header + '\\r', size: oid + ' blob -1' }[mutation];
  if (changed) output = Buffer.concat([Buffer.from(changed + '\\n'), output.subarray(end + 1)]);
  if (mutation === 'terminator') output[end + 1 + Number(size)] = 88;
  if (mutation === 'trailing') output = Buffer.concat([output, Buffer.from('extra')]);
} else {
  let changed = false;
  output = Buffer.from(output.toString('utf8').split('\\0').map(line => {
    const tab = line.indexOf('\\t'), header = line.slice(0, tab), path = line.slice(tab + 1);
    if (changed || !path.startsWith(${JSON.stringify(PIPELINE + "/")})) return line;
    changed = true;
    const malformed = { extra: header + ' extra', space: header + ' ', cr: header + '\\r', mode: header.replace(/^[0-7]+/, '100000'), type: header.replace(' tree ', ' blob ').replace(' blob ', ' commit ') }[mutation];
    return (malformed ?? header) + '\\t' + path;
  }).join('\\0'));
}
process.stdout.write(output);
`);
    const { env } = gitShim(`if [ "$1" = "${command}" ]; then exec "$RP_NODE" "$RP_PROTOCOL" "$@"; fi`);
    return { ...env, RP_NODE: process.execPath, RP_PROTOCOL: script };
  }

  for (const [command, mutations] of [["cat-file", ["valid", "missing", "non-blob", "extra", "space", "cr", "size", "terminator", "trailing"]], ["ls-tree", ["valid", "extra", "space", "cr", "mode", "type"]]])
    for (const mutation of mutations)
      test(`reader protocol: ${command} ${mutation} satisfies the complete grammar or aborts`, () => {
        const env = protocolShim(command, mutation), ref = git(root, "rev-parse", "HEAD").trim();
        const run = () => execFileSync(process.execPath, [RP, "check", PIPELINE, "--base", "main", "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        if (mutation === "valid") {
          const { ref: fromCommit, ...committed } = JSON.parse(run());
          const { ref: fromWorktree, ...working } = JSON.parse(check(root, "--json"));
          assert.deepEqual(committed, working);
        } else {
          const reason = command === "ls-tree" ? /invalid ls-tree/ : mutation === "terminator" ? /invalid batch object terminator/ : mutation === "trailing" ? /unexpected trailing batch output/ : /invalid batch response/;
          assert.throws(run, readFailure(`${ref}:${PIPELINE}/`, reason));
        }
      });

  // --- identity and stamps -----------------------------------------------------

  test("identity is the body's hash: stamping never changes it", () => {
    const before = identity(read(root, "1-spec/spec.md"));
    stampSpec();
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=111111111111");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=222222222222");
    assert.equal(identity(read(root, "1-spec/spec.md")), before);
    assert.match(read(root, "1-spec/spec.md"), /pins:\n  - 0-intent\/intent\.md@[0-9a-f]{12}/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "note=no"), /--set accepts only lane/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=no"), /12-character hexadecimal fingerprint/);
  });

  test("empty frontmatter preserves a dependency-free task's body identity", () => {
    const body = "# T1\n\n- **Depends on:** none\n";
    const expected = execFileSync("git", ["hash-object", "--stdin"], { input: body, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "3-build/tasks/T1.md", body);

    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");

    const stamped = read(root, "3-build/tasks/T1.md");
    const parsed = parseFrontmatter(stamped);
    assert.deepEqual(parsed.data, new Map());
    assert.equal(parsed.body, body);
    assert.equal(identity(stamped), expected);
  });

  for (const [name, rel, body, flags] of [
    ["no declarations", "3-build/tasks/T1.md", "# T1\n\nImplement the change.\n", ["--mirror"]],
    ["empty frontmatter", "3-build/tasks/T1.md", "---\n---\n# T1\n", ["--mirror"]],
    ["fenced declarations", "0-intent/notes.md", "# Notes\n\n```text\nVerdict: not a verdict\n```\n", ["--mirror"]],
    ["no flags", "0-intent/notes.md", "# Notes\n", []],
  ]) test(`empty stamp projection: ${name} succeeds without writing`, () => {
    write(root, rel, body);
    const path = join(root, P(rel));
    const before = statSync(path, { bigint: true });
    assert.equal(rp(root, "stamp", P(rel), ...flags), `nothing to mirror ${P(rel)}\n`);
    assert.equal(read(root, rel), body);
    const after = statSync(path, { bigint: true });
    assert.equal(after.mtimeNs, before.mtimeNs);
    assert.equal(after.ctimeNs, before.ctimeNs);
  });

  test("empty stamp projection: declared dependencies still produce mirrors", () => {
    const rel = "3-build/tasks/T2.md", body = "# T2\n\nDepends on: T1\n";
    write(root, rel, body);
    assert.equal(rp(root, "stamp", P(rel), "--mirror"), `stamped ${P(rel)}\n`);
    const parsed = parseFrontmatter(read(root, rel));
    assert.deepEqual(parsed.data.get("depends"), ["T1"]);
    assert.equal(parsed.body, body);
  });

  test("empty stamp projection: invalid fixed lines still fail without writing", () => {
    const rel = "3-build/tasks/T1.md", body = "# T1\n\nDepends on: maybe\n";
    write(root, rel, body);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /INVALID Depends on:/);
      assert.doesNotMatch(error.stdout, /nothing to mirror/);
      return true;
    });
    assert.equal(read(root, rel), body);
  });

  test("a body edit makes a pin stale; a frontmatter edit does not", () => {
    stampSpec();
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    rp(root, "stamp", P("0-intent/intent.md"), "--set", "lane=111111111111");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  test("--mirror copies Verdict, Brief, Target, Outcome, Prior finding, Depends on, and every Origin line", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nBrief: security\nTarget: 0-intent/intent.md#goal\n\n### Issue 1\n\nPrior finding: 1-spec/spec-review-0.md#Issue-2, resolution failed\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const fm = read(root, "1-spec/spec-review-1.md");
    assert.match(fm, /verdict: unsatisfiable/);
    assert.match(fm, /brief: security/);
    assert.deepEqual(parseFrontmatter(fm).data.get("target"), ["0-intent/intent.md#goal"]);
    assert.deepEqual(parseFrontmatter(fm).data.get("target-identity"), [identity(read(root, "0-intent/intent.md"))]);
    assert.match(fm, /recurs:\n  - 1-spec\/spec-review-0\.md#Issue-2/);
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /origin: issue 7/);
    write(root, "0-intent/intent.md", "Origin: issue 7\nOrigin: starts-from 6-other\n\n# Intent\n\n## Goal\n\nx\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /origin:\n  - issue 7\n  - starts-from 6-other/);
    write(root, "3-build/tasks/T2.md", "# T2\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.match(read(root, "3-build/tasks/T2.md"), /depends:\n  - T1/);
  });

  test("reviewed pins are immutable; head moves only with pins", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "one");
    stampSpec();
    const head1 = read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1];
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "two");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=abc123def456");
    assert.equal(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
    stampSpec();
    assert.notEqual(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
  });

  test("malformed frontmatter is reported before its fields are read", () => {
    const cases = [
      ["---\npins:\n  - 0-intent/intent.md@abc\n# no close\n", /missing closing --- delimiter/],
      ["---\npins:\nnot yaml\n---\n# Spec\n", /malformed line: not yaml/],
      ["---\npins: one\n---\n# Spec\n", /pins must be a list/],
      ["---\nhead: [unterminated\n---\n# Spec\n", /malformed inline list under head/],
      ["---\npins:\n  - 0-intent\/intent.md@abc\n    - nested\n---\n# Spec\n", /malformed list item/],
      ["---\npins: [[nested]]\n---\n# Spec\n", /list item under pins must be a scalar/],
      ["---\npins:\n  - path: nested\n---\n# Spec\n", /list item under pins must be a scalar/],
      ['---\nhead: "unterminated\n---\n# Spec\n', /malformed double-quoted scalar/],
    ];
    for (const [text, reason] of cases) {
      write(root, "1-spec/spec.md", text);
      const output = check(root, "--target-phase", "1");
      assert.match(output, /frontier INVALID FRONTMATTER 1-spec\/spec\.md/);
      assert.match(output, reason);
      assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--mirror"), /INVALID FRONTMATTER/);
    }
    write(root, "0-intent/intent.md", "---\norigin: starts-from main\n# no close\n");
    const output = rp(root, "check", PIPELINE, "--target-phase", "1");
    assert.match(output, /frontier INVALID FRONTMATTER 0-intent\/intent\.md/);
    assert.doesNotMatch(output, /complete through|commits\s/);
  });

  test("representation contradictions are reported before base-dependent state", () => {
    write(root, "1-spec/spec.md", "# Spec\n\nOutcome: not-an-outcome\n");
    const output = rp(root, "check", PIPELINE, "--base", "missing-branch", "--target-phase", "1", "--json");
    const state = JSON.parse(output);
    assert.equal(state.frontier, "INVALID LINE 1-spec/spec.md");
    assert.deepEqual(state.artifacts, []);
    assert.equal("base" in state, false);
  });

  test("stamped scalars with YAML punctuation round-trip through frontmatter", () => {
    const brief = "Check: all [paths] # deeply";
    stampSpec();
    write(root, "1-spec/spec-review-1.md", `# Review\n\nVerdict: rejected\nBrief: ${brief}\n`);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const stamped = read(root, "1-spec/spec-review-1.md");
    assert.match(stamped, /brief: "Check: all \[paths\] # deeply"/);
    assert.equal(parseFrontmatter(stamped).data.get("brief"), brief);
    assert.deepEqual(parseFrontmatter("---\npins: ['a,b', \"c: d\"]\n---\nbody\n").data.get("pins"), ["a,b", "c: d"]);
    assert.doesNotMatch(check(root, "--target-phase", "1"), /INVALID FRONTMATTER/);
  });

  test("pins to non-Markdown files are checked in the working tree and at a ref", () => {
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x61]));
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.txt"));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin context");
    git(root, "branch", "pinned-context");
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x62]));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE/);
    assert.match(check(root, "--ref", "pinned-context", "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("ref reads preserve non-ASCII paths and tabs", () => {
    writeFileSync(join(root, P("0-intent/café.txt")), "context\n");
    writeFileSync(join(root, P("0-intent/with\ttab.txt")), "context\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/café.txt"), "--pin", P("0-intent/with\ttab.txt"));
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin path context");
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    assert.match(check(root, "--ref", "HEAD", "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  // --- reviews, waves, inputs --------------------------------------------------

  test("a review names its artifact, its record, and the artifact's inputs; a changed input stales the approval", () => {
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-1.md", "approved", ["1-spec/spec.md", "1-spec/spec-research.md"]), /INVALID REVIEW PACKAGE/);
    approveSpec();
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nNew constraint.\n");
    stampSpec(); // a re-synthesis that needed no edit refreshes the pins
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:approved \(stale\)/);
    assert.match(check(root, "--target-phase", "1"), /frontier review wave 1-spec\/spec\.md/);
  });

  test("a changed input makes an approval non-current before artifact reconfirmation", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.artifacts[0].state, "stale");
    assert.equal(state.artifacts[0].lanes[0].fresh, false);
    assert.equal(state.artifacts[0].lanes[0].waveApproved, false);
    assert.equal(state.artifacts[0].approved, false);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("waves are per artifact and shared by lanes; the implicit lane needs no id", () => {
    stampSpec();
    const lanes = `spec=security@${FPS.security}`;
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "rejected", SPEC, [`lane=${FPS.security}`]);
    assert.match(check(root, "--lanes", lanes), /reviews: ·:approved security:rejected/);
    assert.match(check(root, "--lanes", lanes), /frontier adjudicate 1-spec\/spec\.md/);
    review("1-spec/spec-review-security-2.md", "approved", SPEC, [`lane=${FPS.security}`]);
    // wave 2 is open until the implicit lane reports it
    assert.match(check(root, "--lanes", lanes), /frontier review wave 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /APPROVED[\s\S]*frontier complete/);
  });

  test("the episode counts waves since every lane approved together; it is a counter, never a gate", () => {
    stampSpec();
    const lanes = `spec=security@${FPS.security}`;
    for (let w = 1; w <= 3; w++) {
      review(`1-spec/spec-review-${w}.md`, w % 2 ? "approved" : "rejected", SPEC);
      review(`1-spec/spec-review-security-${w}.md`, w % 2 ? "rejected" : "approved", SPEC, [`lane=${FPS.security}`]);
    }
    const out = check(root, "--lanes", lanes);
    assert.match(out, /counter\s+spec: 3 waves this episode/);
    assert.match(out, /frontier adjudicate 1-spec\/spec\.md/);
    assert.doesNotMatch(out, /AUDIT|VALVE/);
  });

  test("an episode counts only approvals current on the live reference", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("1-spec/spec.md")), "\n- R2 Requirement.\n");
    stampSpec();
    review("1-spec/spec-review-2.md", "rejected", SPEC);
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.counters.spec.episode, 2);
    assert.equal(state.frontier, "adjudicate 1-spec/spec.md");
  });

  test("an unstamped review is the frontier, never a new wave", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    assert.match(check(root), /frontier stamp 1-spec\/spec-review-1\.md/);
  });

  test("a review counts only in its artifact's phase and lane scope", () => {
    stampSpec();
    review("2-design-doc/spec-review-1.md", "approved", SPEC);
    review("1-spec/archive/old/spec-review-1.md", "approved", SPEC);
    const output = check(root, "--lanes", `design-doc=|a@${FPS.a}`, "--target-phase", "1");
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md[\s\S]*APPROVED/);
    assert.doesNotMatch(output, /claim\s+2-design-doc\/a\/spec-review-1\.md/);
    assert.match(output, /frontier review wave 1-spec\/spec\.md/);
    const misplaced = "2-design-doc/a/spec-review-1.md";
    assert.throws(() => review(misplaced, "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n"), /only challenges may carry target fields/);
    registered(misplaced, { verdict: "unsatisfiable", reviewed: pairs(SPEC), target: ["0-intent/intent.md#goal"], "target-identity": [identity(read(root, "0-intent/intent.md"))] }, "# Review\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n");
    const invalid = JSON.parse(check(root, "--lanes", `design-doc=|a@${FPS.a}`, "--target-phase", "1", "--json"));
    assert.equal(invalid.frontier, `INVALID FRONTMATTER ${misplaced}`);
    assert.deepEqual(invalid.claims, []);
  });

  // --- challenges and claims ---------------------------------------------------

  function checkWithClassification(excluded, ...args) {
    // Change only the classifier in an isolated executable; exercise the real checker.
    const script = join(root, ".git", "classified-rp.mjs");
    const source = readFileSync(RP, "utf8");
    writeFileSync(script, excluded ? source.replace("function challengeKind(rel, data) {", `function challengeKind(rel, data) { if (rel === ${JSON.stringify(excluded)}) return null;`) : source);
    return JSON.parse(execFileSync(process.execPath, [script, "check", PIPELINE, "--base", "main", "--json", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  }

  for (const enabled of [true, false])
    for (const fresh of [true, false])
      test(`challenge classifier: report enabled=${enabled}, fresh=${fresh} governs collection and task holds`, () => {
        registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
        registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
        registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
        registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
        const inputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
        registered("3-build/build-plan.md", { pins: pairs(inputs) });
        const task = "3-build/tasks/T1.md", report = "3-build/tasks/T1-report-1.md";
        registered(task, { depends: [] }, "# Task\nDepends on: none\n");
        registered(report, { outcome: "failed", attempt: "1", reviewed: pairs([task]), ...(enabled ? { target: ["3-build/build-plan.md#T1"], "target-identity": [identity(read(root, "3-build/build-plan.md"))] } : {}) }, "# Report\nOutcome: failed\n");
        registeredVerdict("3-build/build-plan-review-1.md", pairs([...PLAN_BASE, task]));
        if (!fresh) registered(task, { depends: [] }, "# Changed task\nDepends on: none\n");
        const state = checkWithClassification(enabled ? null : report, "--target-phase", "3");
        assert.deepEqual(state.contradictions, []);
        assert.equal(state.challenges.length, enabled && fresh ? 1 : 0);
        assert.equal(state.tasks["3-build"].next, enabled && fresh ? null : "T1");
        if (fresh) assert.equal(state.frontier, enabled ? `challenge ${report} → 3-build/build-plan.md#T1` : "task 3-build/T1");
      });

  for (const enabled of [true, false])
    for (const fresh of [true, false])
      for (const escalation of [true, false])
        test(`challenge classifier: claim enabled=${enabled}, fresh=${fresh}, origin=${escalation} governs claims and resolution`, () => {
          const challenge = "0-intent/correction-1.md", review = "1-spec/spec-review-1.md";
          const inputs = ["0-intent/intent.md", ...(escalation ? [challenge] : [])];
          if (escalation) registered(challenge, { target: ["1-spec/spec.md#R1"], "target-identity": [identity(read(root, "1-spec/spec.md"))], origin: "issue 9" }, "# Correction\nTarget: 1-spec/spec.md#R1\nOrigin: issue 9\n");
          registered("1-spec/spec.md", { pins: pairs(inputs) });
          registered(review, { verdict: "unsatisfiable", reviewed: pairs(["1-spec/spec.md", "1-spec/spec-research.md", ...inputs]), ...(enabled ? { target: ["0-intent/intent.md#goal"], "target-identity": [identity(read(root, "0-intent/intent.md"))] } : {}), ...(escalation ? { origin: challenge } : {}) }, `# Review\nVerdict: unsatisfiable\n${enabled ? "Target: 0-intent/intent.md#goal\n" : ""}${escalation ? `Origin: ${challenge}\n` : ""}`);
          if (!fresh) write(root, "1-spec/spec-research.md", "# Changed record\n");
          const state = checkWithClassification(enabled ? null : review, "--target-phase", "1");
          assert.deepEqual(state.contradictions, []);
          assert.equal(state.claims.length, enabled ? 1 : 0);
          if (enabled) assert.match(state.claims[0].state, fresh ? /^PENDING/ : /^moot/);
          if (escalation) assert.equal(state.challenges[0].state, enabled && fresh ? "resolved" : "adjudicated");
          if (!enabled) assert.doesNotMatch(state.frontier, /^claim /);
        });

  function correction(target = "1-spec/spec.md#R1") {
    write(root, "0-intent/correction-1.md", `# Correction 1\n\nTarget: ${target}\nOrigin: decision-1\n\n## Request\n\nFix R1.\n`);
    rp(root, "stamp", P("0-intent/correction-1.md"), "--mirror");
  }

  function frontierChain(extraArtifact = null) {
    const artifacts = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "4-document/document-plan.md"];
    const records = artifacts.map((path) => path.replace(/\.md$/, "-research.md"));
    const reviews = artifacts.map((path) => path.replace(/\.md$/, "-review-1.md"));
    const tasks = ["3-build/tasks/T1.md", "4-document/tasks/T1.md"];
    const reports = tasks.map((path) => path.replace(/\.md$/, "-report-1.md"));
    for (const [i, task] of tasks.entries()) {
      registered(task, { depends: [] }, "# T1\nDepends on: none\n");
      registered(reports[i], { reviewed: pairs([task]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
    }
    const inputs = [
      ["0-intent/intent.md"],
      ["0-intent/intent.md", artifacts[0], reviews[0]],
      [artifacts[0], artifacts[1], reviews[0], reviews[1]],
      [artifacts[0], artifacts[1], artifacts[2], reviews[0], reviews[1], reviews[2], "3-build/build-review-1.md", tasks[0], reports[0]],
    ];
    const context = "0-intent/context.md";
    write(root, context, "# Context\nOriginal evidence.\n");
    const packages = [];
    const phasePackages = [];
    for (const [i, artifact] of artifacts.entries()) {
      if (artifact === extraArtifact) inputs[i].push(context);
      registered(artifact, { pins: pairs(inputs[i]) }, `# Artifact\n\n- ${["R1", "D1", "A1", "A1"][i]} Clause.\n`);
      write(root, records[i], "# Record\n");
      packages[i] = [artifact, records[i], ...inputs[i], ...(i >= 2 ? [tasks[i - 2]] : [])];
      phasePackages[i] = [...packages[i], ...(i >= 2 ? [reports[i - 2]] : [])];
      registeredVerdict(reviews[i], pairs(packages[i]));
      if (i >= 2) registeredVerdict(`${i === 2 ? "3-build/build" : "4-document/document"}-review-1.md`, pairs(phasePackages[i]));
    }
    return { artifacts, records, reviews, inputs, packages, phasePackages, tasks, reports, context };
  }

  for (const kind of ["correction", "claim"])
    for (const targetIndex of [0, 1, 2, 3])
      for (const currency of ["current", "stale input", "missing input approval"])
        test(`challenge frontier inputs: ${kind}, phase ${targetIndex + 1}, ${currency}`, () => {
          const paths = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "4-document/document-plan.md"];
          const chain = frontierChain(targetIndex > 0 ? paths[targetIndex - 1] : null);
          const artifact = chain.artifacts[targetIndex];
          let lanes = [];
          if (targetIndex === 0) {
            const lane = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md", review = "1-spec/a/spec-review-1.md";
            registered(lane, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a }, "# Candidate\n- R1 Clause.\n");
            write(root, record, "# Record\n");
            registeredVerdict(review, pairs([lane, record, "0-intent/intent.md"]));
            registeredRoot(lane, pairs([lane, record, "0-intent/intent.md"]), [review]);
            lanes = ["--lanes", `spec=|a@${FPS.a}`];
          }
          const sourceIndex = Math.min(targetIndex + 1, 3);
          const challenge = kind === "correction" ? "0-intent/correction-1.md"
            : targetIndex === 3 ? "4-document/document-review-1.md" : chain.reviews[sourceIndex];
          const target = kind === "correction" ? artifact : `${artifact}#${["R1", "D1", "A1", "A1"][targetIndex]}`;
          registered(challenge, {
            target: [target], "target-identity": [identity(read(root, artifact))],
            ...(kind === "correction" ? { origin: "issue 9" } : { verdict: "unsatisfiable", reviewed: pairs(targetIndex === 3 ? chain.phasePackages[sourceIndex] : chain.packages[sourceIndex]) }),
          }, `# Challenge\n${kind === "correction" ? "Origin: issue 9" : "Verdict: unsatisfiable"}\nTarget: ${target}\n`);
          if (currency === "stale input") appendFileSync(join(root, P(targetIndex === 0 ? "0-intent/intent.md" : chain.context)), "\nChanged evidence.\n");
          if (currency === "missing input approval") rmSync(join(root, P(targetIndex === 0 ? "1-spec/a/spec-review-1.md" : targetIndex === 3 ? "3-build/build-review-1.md" : chain.reviews[targetIndex - 1])));
          const state = JSON.parse(check(root, ...lanes, "--json"));
          assert.deepEqual(state.contradictions, []);
          const expected = currency === "current" ? `${kind === "claim" ? "claim" : "challenge"} ${challenge} → ${target}`
            : currency === "stale input" ? `re-synthesize ${chain.artifacts[Math.max(0, targetIndex - 1)]}`
            : ["review wave 1-spec/a/spec.md", "review wave 1-spec/spec.md", "review wave 2-design-doc/design-doc.md", "build review"][targetIndex];
          assert.equal(state.frontier, expected);
          const reported = kind === "correction" ? state.challenges[0] : state.claims[0];
          assert.equal(reported.target, target);
          if (kind === "correction" || currency === "current") {
            assert.match(reported.state, /^(pending|PENDING)$/);
            assert.deepEqual(state.artifacts.find((a) => a.artifact === artifact).pendingChallenges, [challenge]);
          } else assert.match(reported.state, /^moot/);
        });

  for (const targetIndex of [2, 3])
    for (const currency of ["current", "stale input", "missing input approval"])
      test(`challenge frontier inputs: failed report, phase ${targetIndex + 1}, ${currency}`, () => {
        const chain = frontierChain(targetIndex === 2 ? "2-design-doc/design-doc.md" : "3-build/build-plan.md");
        const artifact = chain.artifacts[targetIndex], task = chain.tasks[targetIndex - 2], report = chain.reports[targetIndex - 2];
        registered(report, { reviewed: pairs([task]), outcome: "failed", attempt: "1", target: [`${artifact}#T1`], "target-identity": [identity(read(root, artifact))] }, "# Report\nOutcome: failed\n");
        if (currency === "stale input") appendFileSync(join(root, P(chain.context)), "\nChanged evidence.\n");
        if (currency === "missing input approval") rmSync(join(root, P(targetIndex === 2 ? chain.reviews[1] : "3-build/build-review-1.md")));
        const state = JSON.parse(check(root, "--json"));
        assert.deepEqual(state.contradictions, []);
        assert.equal(state.challenges[0].state, "pending");
        const expected = currency === "current" ? `challenge ${report} → ${artifact}#T1`
          : currency === "stale input" ? `re-synthesize ${chain.artifacts[targetIndex - 1]}`
          : targetIndex === 2 ? "review wave 2-design-doc/design-doc.md" : "build review";
        assert.equal(state.frontier, expected);
        assert.deepEqual(state.artifacts.find((a) => a.artifact === artifact).pendingChallenges, [report]);
      });

  test("a fresh pending claim waits when its target lacks a current input approval", () => {
    const chain = frontierChain();
    const claim = "1-spec/spec-review-2.md", target = `${chain.artifacts[1]}#D1`;
    registered(claim, { verdict: "unsatisfiable", reviewed: pairs(chain.packages[0]), target: [target], "target-identity": [identity(read(root, chain.artifacts[1]))] }, `# Review\nVerdict: unsatisfiable\nTarget: ${target}\n`);
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.claims[0].state, "PENDING");
    assert.equal(state.frontier, "adjudicate 1-spec/spec.md");
    assert.deepEqual(state.artifacts[1].pendingChallenges, [claim]);
    assert.match(check(root).split("\n").find((line) => line.startsWith("artifact 2-design-doc/design-doc.md ")), /pending challenges: 1-spec\/spec-review-2\.md/);
  });

  for (const verdict of ["absent", "rejected"])
    test(`a challenge needs current inputs but no target approval: ${verdict}`, () => {
      const chain = frontierChain();
      const challenge = "0-intent/correction-1.md", target = chain.artifacts[1];
      registered(challenge, { target: [target], "target-identity": [identity(read(root, target))], origin: "issue 9" }, `# Correction\nTarget: ${target}\nOrigin: issue 9\n`);
      if (verdict === "absent") rmSync(join(root, P(chain.reviews[1])));
      else registeredVerdict(chain.reviews[1], pairs(chain.packages[1]), verdict);
      assert.equal(JSON.parse(check(root, "--json")).frontier, `challenge ${challenge} → ${target}`);
    });

  test("a correction along spec, design and plan is carried by each target's re-synthesis", () => {
    const chain = frontierChain();
    const [spec, design, plan] = chain.artifacts;
    const correction = "0-intent/correction-1.md";
    const targets = [spec, design, plan];
    registered(correction, { target: targets, "target-identity": targets.map((path) => identity(read(root, path))), origin: "issue 9" }, `# Correction\nTarget: ${targets.join(", ")}\nOrigin: issue 9\n`);
    const state = () => JSON.parse(check(root, "--target-phase", "3", "--json"));
    const pendingOn = (path) => {
      const snapshot = state();
      assert.equal(snapshot.frontier, `re-synthesize ${path}`);
      assert.deepEqual(snapshot.artifacts.find((a) => a.artifact === path).pendingChallenges, [correction]);
      const line = check(root, "--target-phase", "3").split("\n").find((line) => line.startsWith(`artifact ${path} `));
      assert.match(line, /pending challenges: 0-intent\/correction-1\.md/);
    };
    assert.equal(state().frontier, `challenge ${correction} → ${spec}`);
    registered(spec, { pins: pairs(["0-intent/intent.md", correction]) }, "# Spec\n- R1 Revised.\n");
    assert.equal(state().frontier, `review wave ${spec}`);
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, correction]));
    pendingOn(design);
    const designInputs = ["0-intent/intent.md", spec, "1-spec/spec-review-2.md", correction];
    registered(design, { pins: pairs(designInputs) }, "# Design\n- D1 Revised.\n");
    assert.equal(state().frontier, `review wave ${design}`);
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs([design, chain.records[1], ...designInputs]));
    pendingOn(plan);
    const planInputs = [spec, design, "1-spec/spec-review-2.md", "2-design-doc/design-doc-review-2.md", correction];
    registered(plan, { pins: pairs(planInputs) }, "# Plan\n- A1 Revised.\n");
    assert.equal(state().frontier, `review wave ${plan}`);
    const planPackage = [plan, chain.records[2], ...planInputs, chain.tasks[0]];
    registeredVerdict("3-build/build-plan-review-2.md", pairs(planPackage));
    assert.equal(state().frontier, "build review");
    registeredVerdict("3-build/build-review-2.md", pairs([...planPackage, chain.reports[0]]));
    const complete = state();
    assert.equal(complete.frontier, "complete");
    assert.equal(complete.complete, true);
    assert.deepEqual(complete.challenges.map((c) => [c.state, c.challengeResolved]), targets.map(() => ["resolved", true]));
  });

  for (const clause of [false, true])
    test(`challenge targets: direct two-target lifecycle with ${clause ? "clauses" : "whole artifacts"}`, () => {
      const build = "3-build/build-plan.md", document = "4-document/document-plan.md";
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
      registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
      const inputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
      const task = "3-build/tasks/T1.md", report = "3-build/tasks/T1-report-1.md";
      registered(task, { depends: [] }, "# Task\nDepends on: none\n");
      registered(report, { reviewed: pairs([task]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
      registered(build, { pins: pairs(inputs) }, "# Plan\nAssumption A1.\n");
      const buildPackage = [build, "3-build/build-plan-research.md", ...inputs, task];
      registeredVerdict("3-build/build-plan-review-1.md", pairs(buildPackage));
      registeredVerdict("3-build/build-review-1.md", pairs([...buildPackage, report]));
      const documentInputs = [...inputs, build, "3-build/build-plan-review-1.md", "3-build/build-review-1.md", task, report];
      registered(document, { pins: pairs(documentInputs) }, "# Plan\nAssumption A1.\n");
      write(root, "4-document/document-plan-research.md", "# Record\n");
      const documentPackage = [document, "4-document/document-plan-research.md", ...documentInputs];
      registeredVerdict("4-document/document-plan-review-1.md", pairs(documentPackage));
      const state = (...args) => JSON.parse(check(root, ...args, "--json"));
      assert.equal(state().artifacts[3].approved, true);

      const challenge = "0-intent/correction-1.md";
      const targets = [document, build].map((path) => `${path}${clause ? "#A1" : ""}`);
      registered(challenge, { target: targets, "target-identity": targets.map((t) => identity(read(root, t.split("#")[0]))), origin: "issue 9" }, `# Correction\nTarget: ${targets.join(", ")}\nOrigin: issue 9\n`);
      const pending = state();
      assert.equal(pending.frontier, `challenge ${challenge} → ${targets[1]}`);
      assert.deepEqual(pending.challenges.map((t) => [t.target, t.state, t.challengeResolved]), [[targets[1], "pending", false], [targets[0], "pending", false]]);
      assert.equal(state("--target-phase", "3").challenges.find((t) => t.target === targets[0]).inScope, false);

      registered(build, { pins: pairs([...inputs, challenge]) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["adjudicated", "pending"]);
      registeredVerdict("3-build/build-plan-review-2.md", pairs([...buildPackage, challenge]));
      const built = state();
      assert.deepEqual(built.challenges.map((t) => t.state), ["resolved", "pending"]);
      assert.equal(built.frontier, "build review");
      assert.deepEqual(built.artifacts[3].pendingChallenges, [challenge]);
      assert.equal(built.artifacts[3].state, "stale");
      assert.deepEqual(built.artifacts[3].stale, ["package members"]);
      assert.equal(built.challenges.every((t) => !t.challengeResolved), true);

      registeredVerdict("3-build/build-review-2.md", pairs([...buildPackage, report, challenge]));
      assert.equal(state("--target-phase", "3").complete, true);
      assert.equal(state().frontier, `re-synthesize ${document}`);
      assert.deepEqual(state().artifacts[3].pendingChallenges, [challenge]);
      const repinned = [...inputs, build, "3-build/build-plan-review-2.md", "3-build/build-review-2.md", task, report, challenge];
      registered(document, { pins: pairs(repinned) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["resolved", "adjudicated"]);
      registeredVerdict("4-document/document-plan-review-2.md", pairs([document, "4-document/document-plan-research.md", ...repinned]));
      const resolved = state();
      assert.deepEqual(resolved.challenges.map((t) => t.state), ["resolved", "resolved"]);
      assert.equal(resolved.challenges.every((t) => t.challengeResolved), true);
      assert.equal(resolved.artifacts[3].approved, true);
      assert.doesNotMatch(resolved.frontier, /^challenge /);
    });

  for (const targets of [["3-build/build-plan.md"], ["3-build/build-plan.md", "1-spec/spec.md#R1"]])
    test(`challenge targets: stamp mirrors ${targets.length} targets and preserves each landing identity`, () => {
      correction(targets.join(", "));
      const rel = "0-intent/correction-1.md";
      const data = () => parseFrontmatter(read(root, rel)).data;
      assert.deepEqual(data().get("target"), targets);
      const identities = targets.map((t) => identity(read(root, t.split("#")[0])));
      assert.deepEqual(data().get("target-identity"), identities);
      write(root, "1-spec/spec.md", "# Spec\nClause removed.\n");
      write(root, "3-build/build-plan.md", "# Plan changed\n");
      write(root, rel, read(root, rel).replace(`Target: ${targets.join(", ")}`, `Target: ${[...targets].reverse().join(", ")}`));
      rp(root, "stamp", P(rel), "--mirror");
      assert.deepEqual(data().get("target-identity"), [...identities].reverse());
      assert.deepEqual(data().get("target"), [...targets].reverse());
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "land targets");
      const { ref: workingRef, ...working } = JSON.parse(check(root, "--json"));
      const { ref: committedRef, ...committed } = JSON.parse(check(root, "--ref", "HEAD", "--json"));
      assert.deepEqual(working, committed);
    });

  test("challenge targets: corroboration resolves only the target whose wave names the origin", () => {
    const challenge = "0-intent/correction-1.md", targets = ["1-spec/spec.md", "2-design-doc/design-doc.md"];
    registered(challenge, { target: targets, "target-identity": targets.map((t) => identity(read(root, t))), origin: "issue 9" }, `# Correction\nTarget: ${targets.join(", ")}\nOrigin: issue 9\n`);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", challenge]) });
    registered("1-spec/spec-review-1.md", {
      reviewed: pairs([...SPEC, challenge]), verdict: "unsatisfiable", target: ["0-intent/intent.md#goal"],
      "target-identity": [identity(read(root, "0-intent/intent.md"))], origin: challenge,
    }, `# Review\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\nOrigin: ${challenge}\n`);
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(state.challenges.map((t) => t.state), ["resolved", "pending"]);
    assert.match(state.challenges[0].detail, /^escalated by/);
    assert.equal(state.challenges.every((t) => !t.challengeResolved), true);
    assert.equal(state.frontier, "claim 1-spec/spec-review-1.md → 0-intent/intent.md#goal (owner escalation)");
    assert.deepEqual(state.artifacts[1].pendingChallenges, [challenge]);
  });

  test("challenge targets: new targets validate atomically while retained targets keep landing facts", () => {
    const rel = "0-intent/correction-1.md";
    correction("1-spec/spec.md#R1");
    const landed = parseFrontmatter(read(root, rel)).data.get("target-identity")[0];
    write(root, "1-spec/spec.md", "# Changed\nClause removed.\n");
    const invalid = read(root, rel).replace("Target: 1-spec/spec.md#R1", "Target: 1-spec/spec.md#R1, 2-design-doc/design-doc.md#D99");
    write(root, rel, invalid);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET 2-design-doc\/design-doc.md#D99/);
    assert.equal(read(root, rel), invalid);
    write(root, rel, invalid.replace("#D99", "#D1"));
    rp(root, "stamp", P(rel), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, rel)).data.get("target-identity"), [landed, identity(read(root, "2-design-doc/design-doc.md"))]);
  });

  for (const targets of ["3-build/build-plan.md, 1-spec/spec.md#R99", "3-build/build-plan.md, 0-intent/intent.md#goal", "3-build/build-plan.md, 2-design-doc/design-doc-research.md"])
    test(`challenge targets: rejects the whole correction list containing ${targets.split(", ")[1]}`, () => {
      const rel = "0-intent/correction-1.md", body = `# Correction\nTarget: ${targets}\nOrigin: issue 9\n`;
      write(root, rel, body);
      assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET/);
      assert.equal(read(root, rel), body);
    });

  for (const target of ["1-spec/spec.md", "1-spec/spec.md#R1, 0-intent/intent.md#goal"])
    test(`challenge targets: a claim rejects ${target}`, () => {
      const rel = "1-spec/spec-review-1.md", body = `# Review\nVerdict: unsatisfiable\nTarget: ${target}\n`;
      write(root, rel, body);
      assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET/);
      assert.equal(read(root, rel), body);
    });

  test("challenge targets: failed reports land on one clause and reject whole-artifact targets", () => {
    const rel = "3-build/tasks/T1-report-1.md", task = "3-build/tasks/T1.md";
    registered(task, { depends: [] }, "# T1\nDepends on: none\n");
    write(root, rel, "# Report\nOutcome: failed\nTarget: 3-build/build-plan.md\n");
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET/);
    write(root, rel, "# Report\nOutcome: failed\n");
    rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task));
    assert.deepEqual(parseFrontmatter(read(root, rel)).data.get("target"), ["3-build/build-plan.md#T1"]);
    assert.equal(JSON.parse(check(root, "--json")).challenges[0].target, "3-build/build-plan.md#T1");
  });

  test("challenge fields: a review may name a target after declaring unsatisfiable", () => {
    stampSpec();
    const rel = "1-spec/spec-review-1.md";
    write(root, rel, "# Review\nVerdict: approved\nTarget: 0-intent/intent.md#goal\n");
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror", ...SPEC.flatMap((path) => ["--reviewed", P(path)])), /only challenges may carry target fields/);
    const body = read(root, rel).replace(/^Verdict: approved$/m, "Verdict: unsatisfiable");
    write(root, rel, body);
    rp(root, "stamp", P(rel), "--mirror", ...SPEC.flatMap((path) => ["--reviewed", P(path)]));
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(state.contradictions, []);
    assert.match(state.claims[0].state, /^PENDING — owner escalation$/);
  });

  for (const kind of ["approved review", "rejected review", "artifact", "record", "task"])
    for (const representation of ["declaration", "mirrored", "target", "target-identity"])
      test(`challenge fields: ${kind} rejects ${representation} at stamp and check`, () => {
        const review = kind.endsWith("review");
        const rel = review ? "1-spec/spec-review-1.md" : { artifact: "1-spec/spec.md", record: "1-spec/spec-research.md", task: "3-build/tasks/T1.md" }[kind];
        const fields = review ? { verdict: kind.split(" ")[0], reviewed: pairs(SPEC) } : kind === "artifact" ? { pins: pairs(["0-intent/intent.md"]) } : kind === "task" ? { depends: [] } : {};
        const target = "1-spec/spec.md#R1";
        const body = `# File\n${review ? `Verdict: ${fields.verdict}\n` : kind === "task" ? "Depends on: none\n" : ""}${["declaration", "mirrored"].includes(representation) ? `Target: ${target}\n` : ""}`;
        if (["target", "mirrored"].includes(representation)) fields.target = [target];
        if (["target-identity", "mirrored"].includes(representation)) fields["target-identity"] = [identity(read(root, "1-spec/spec.md"))];
        if (representation === "declaration") {
          write(root, rel, body);
          const unstamped = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
          assert.equal(unstamped.frontier, `stamp ${rel}`);
          assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /only challenges may carry target fields/);
          assert.equal(read(root, rel), body);
        }
        registered(rel, fields, body);
        const before = read(root, rel);
        assert.throws(() => rp(root, "stamp", P(rel), ...(representation === "mirrored" ? ["--mirror"] : [])), /only challenges may carry target fields/);
        assert.equal(read(root, rel), before);
        const state = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /only challenges may carry target fields/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.claims, []);
        assert.deepEqual(state.artifacts, []);
      });

  for (const phase of ["3-build", "4-document"])
    for (const destination of ["spec", "design", "other phase", "other task"])
      test(`challenge review: ${phase} report rejects ${destination} at stamp and check`, () => {
        write(root, "4-document/document-plan.md", "# Plan\n");
        for (const folder of ["3-build", "4-document"])
          for (const id of ["T1", "T2"]) registered(`${folder}/tasks/${id}.md`, { depends: [] }, `# ${id}\nDepends on: none\n`);
        const task = `${phase}/tasks/T1.md`, rel = `${phase}/tasks/T1-report-1.md`;
        const plan = phase === "3-build" ? "3-build/build-plan.md" : "4-document/document-plan.md";
        const other = phase === "3-build" ? "4-document/document-plan.md" : "3-build/build-plan.md";
        const target = { spec: "1-spec/spec.md#R1", design: "2-design-doc/design-doc.md#D1", "other phase": `${other}#T1`, "other task": `${plan}#T2` }[destination];
        const body = `# Report\nOutcome: failed\nTarget: ${target}\n`;
        write(root, rel, body);
        assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET.*expected its own task/);
        assert.equal(read(root, rel), body);
        registered(rel, { outcome: "failed", attempt: "1", reviewed: pairs([task]), target: [target], "target-identity": [identity(read(root, target.split("#")[0]))] }, body);
        const state = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target: expected its own task/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.artifacts, []);
      });

  for (const phase of ["3-build", "4-document"])
    for (const outcome of ["completed", "blocked"])
      test(`challenge re-review: ${phase} ${outcome} report cannot have a target`, () => {
        const plan = phase === "3-build" ? "3-build/build-plan.md" : "4-document/document-plan.md";
        const task = `${phase}/tasks/T1.md`, rel = `${phase}/tasks/T1-report-1.md`;
        write(root, plan, "# Plan\n");
        registered(task, { depends: [] }, "# Task\nDepends on: none\n");
        const target = `${plan}#T1`, body = `# Report\nOutcome: ${outcome}\nTarget: ${target}\n`;
        write(root, rel, body);
        assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET.*only challenges/);
        assert.equal(read(root, rel), body);
        registered(rel, { outcome, attempt: "1", reviewed: pairs([task]), target: [target], "target-identity": [identity(read(root, plan))] }, body);
        const state = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target: only challenges/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.tasks, {});
      });

  for (const frontmatter of ["absent", "empty", "missing identity"])
    test(`challenge re-review: correction with ${frontmatter} frontmatter has the correct repair frontier`, () => {
      const rel = "0-intent/correction-1.md", body = "# Correction\nTarget: 1-spec/spec.md#R1\nOrigin: issue 9\n";
      if (frontmatter === "absent") write(root, rel, body);
      else registered(rel, frontmatter === "empty" ? {} : { target: ["1-spec/spec.md#R1"], origin: "issue 9" }, body);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "record correction before stamp");
      const state = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
      assert.equal(state.frontier, `${frontmatter === "absent" ? "stamp" : "INVALID FRONTMATTER"} ${rel}`);
      assert.deepEqual(state.challenges, []);
      assert.deepEqual(state.artifacts, []);
      if (frontmatter === "absent") {
        assert.deepEqual(state.contradictions[0].mirrors, ["target", "origin"]);
        assert.equal(state.contradictions[0].invalid, undefined);
      } else assert.match(state.contradictions[0].invalid, /target-identity/);
      rp(root, "stamp", P(rel), "--mirror");
      const stamped = JSON.parse(check(root, "--json"));
      assert.deepEqual(stamped.contradictions, []);
      assert.equal(stamped.frontier, "stamp 1-spec/spec.md");
      assert.deepEqual(stamped.artifacts[0].pendingChallenges, [rel]);
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      assert.equal(JSON.parse(check(root, "--json")).frontier, `challenge ${rel} → 1-spec/spec.md#R1`);
    });

  for (const kind of ["correction", "claim", "failed report"])
    for (const defect of ["absent", "short", "long", "invalid"])
      test(`challenge review: ${kind} rejects ${defect} target identities before facts`, () => {
        const task = "3-build/tasks/T1.md";
        registered(task, { depends: [] }, "# Task\nDepends on: none\n");
        const rel = { correction: "0-intent/correction-1.md", claim: "1-spec/spec-review-1.md", "failed report": "3-build/tasks/T1-report-1.md" }[kind];
        const targets = { correction: ["1-spec/spec.md", "2-design-doc/design-doc.md"], claim: ["0-intent/intent.md#goal"], "failed report": ["3-build/build-plan.md#T1"] }[kind];
        const identities = targets.map((t) => identity(read(root, t.split("#")[0])));
        const fields = { target: targets, ...(kind === "claim" ? { verdict: "unsatisfiable", reviewed: pairs(SPEC) } : kind === "failed report" ? { outcome: "failed", attempt: "1", reviewed: pairs([task]) } : { origin: "issue 9" }) };
        if (defect !== "absent") fields["target-identity"] = { short: identities.slice(1), long: [...identities, identities[0]], invalid: identities.map(() => "not-a-hash") }[defect];
        const declaration = kind === "claim" ? "Verdict: unsatisfiable" : kind === "failed report" ? "Outcome: failed" : "Origin: issue 9";
        registered(rel, fields, `# Challenge\n${declaration}\nTarget: ${targets.join(", ")}\n`);
        const before = read(root, rel);
        const state = JSON.parse(rp(root, "check", PIPELINE, "--base", "missing-branch", "--json"));
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target-identity/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.claims, []);
        assert.deepEqual(state.artifacts, []);
        assert.equal(state.base, undefined);
        assert.throws(() => rp(root, "stamp", P(rel)), /INVALID FRONTMATTER.*target-identity/);
        assert.equal(read(root, rel), before);
      });

  for (const targets of [["1-spec/spec.md", "1-spec/spec.md#R1"], ["1-spec/spec.md#R1", "1-spec/spec.md#R2"]])
    test(`challenge review: one artifact adjudicates ${targets.join(", ")} together`, () => {
      const artifact = "1-spec/spec.md", challenge = "0-intent/correction-1.md";
      write(root, artifact, "# Spec\nRequirement R1.\nRequirement R2.\n");
      registered(challenge, { target: targets, "target-identity": targets.map(() => identity(read(root, artifact))), origin: "issue 9" }, `# Correction\nTarget: ${targets.join(", ")}\nOrigin: issue 9\n`);
      assert.doesNotThrow(() => rp(root, "stamp", P(challenge), "--mirror"));
      const state = () => JSON.parse(check(root, "--target-phase", "1", "--json"));
      assert.deepEqual(state().challenges.map((t) => t.state), ["pending", "pending"]);
      assert.deepEqual(state().artifacts[0].pendingChallenges, [challenge]);
      registered(artifact, { pins: pairs(["0-intent/intent.md", challenge]) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["adjudicated", "adjudicated"]);
      registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, challenge]));
      const resolved = state();
      assert.deepEqual(resolved.challenges.map((t) => t.state), ["resolved", "resolved"]);
      assert.equal(resolved.challenges.every((t) => t.challengeResolved), true);
      assert.equal(resolved.complete, true);
      assert.equal(resolved.frontier, "complete");
    });

  test("challenge review: an exact repeated target is rejected atomically", () => {
    const rel = "0-intent/correction-1.md", body = "# Correction\nTarget: 1-spec/spec.md#R1, 1-spec/spec.md#R1\nOrigin: issue 9\n";
    write(root, rel, body);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID Target/);
    assert.equal(read(root, rel), body);
  });

  test("challenge review: reversed design and spec targets follow the dependency chain", () => {
    const spec = "1-spec/spec.md", design = "2-design-doc/design-doc.md", challenge = "0-intent/correction-1.md";
    registered(spec, { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    const inputs = ["0-intent/intent.md", spec, "1-spec/spec-review-1.md"];
    registered(design, { pins: pairs(inputs) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const targets = [design, spec];
    registered(challenge, { target: targets, "target-identity": targets.map((t) => identity(read(root, t))), origin: "issue 9" }, `# Correction\nTarget: ${targets.join(", ")}\nOrigin: issue 9\n`);
    const state = () => JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.equal(state().frontier, `challenge ${challenge} → ${spec}`);
    registered(spec, { pins: pairs(["0-intent/intent.md", challenge]) });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, challenge]));
    const first = state();
    assert.equal(first.artifacts[0].approved, true);
    assert.equal(first.artifacts[1].state, "stale");
    assert.deepEqual(first.artifacts[1].stale, ["package members"]);
    assert.deepEqual(first.challenges.map((t) => t.state), ["resolved", "pending"]);
    assert.equal(first.frontier, `re-synthesize ${design}`);
    assert.deepEqual(first.artifacts[1].pendingChallenges, [challenge]);
    const current = ["0-intent/intent.md", spec, "1-spec/spec-review-2.md", challenge];
    registered(design, { pins: pairs(current) });
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs([design, "2-design-doc/design-doc-research.md", ...current]));
    const final = state();
    assert.deepEqual(final.challenges.map((t) => t.state), ["resolved", "resolved"]);
    assert.equal(final.challenges.every((t) => t.challengeResolved), true);
    assert.equal(final.complete, true);
    assert.equal(final.frontier, "complete");
  });

  test("a challenge is pending, then adjudicated when its target pins it, then resolved when the target is approved carrying the pin", () => {
    stampSpec();
    approveSpec();
    correction();
    assert.match(check(root), /challenge .*correction-1\.md .*PENDING/);
    assert.match(check(root), /frontier challenge 0-intent\/correction-1\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/correction-1.md"));
    assert.match(check(root), /adjudicated \(by 1-spec\/spec\.md, awaiting approval\)/);
    appendFileSync(join(root, P("1-spec/spec-research.md")), "\n## Adjudications\n\nAdopted.\n");
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/correction-1.md"]);
    assert.match(check(root, "--target-phase", "1"), /resolved \(1-spec\/spec\.md approved carrying it\)[\s\S]*frontier complete/);
  });

  test("a changed input withdraws challenge resolution until the target wave is current", () => {
    stampSpec();
    approveSpec();
    correction();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/correction-1.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/correction-1.md"]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.match(state.challenges[0].state, /^adjudicated/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("a changed input makes a claim moot before upstream routing", () => {
    approveChain(2);
    review("2-design-doc/design-doc-review-2.md", "unsatisfiable", DESIGN, [], "Target: 1-spec/spec.md#R1\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.match(state.claims[0].state, /^moot/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("a claim escalated one layer up resolves the challenge below it; intent targets are owner escalations", () => {
    stampSpec();
    correction();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/correction-1.md"));
    review("1-spec/spec-review-1.md", "unsatisfiable", [...SPEC, "0-intent/correction-1.md"], [], "Target: 0-intent/intent.md#goal\nOrigin: 0-intent/correction-1.md\n");
    const output = check(root);
    assert.match(output, /challenge .*resolved \(escalated by 1-spec\/spec-review-1\.md\)/);
    assert.match(output, /claim .*#goal\s+PENDING — owner escalation/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal \(owner escalation\)/);
  });

  test("a claim stands only when its wave closed without a rejection; consumers lacking its approval are moot", () => {
    stampSpec();
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"));
    const DESIGN_NO_APPROVAL = DESIGN.filter((f) => !f.includes("spec-review"));
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN_NO_APPROVAL, [], "Target: 1-spec/spec.md#R1\n");
    let output = check(root);
    assert.match(output, /design-doc-review-1\.md → 1-spec\/spec\.md#R1\s+moot/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal \(owner escalation\)/);
    // A second lane still to report keeps a claim open; a rejecting lane holds it.
    output = check(root, "--lanes", `spec=a11y@${FPS.a11y}`);
    assert.match(output, /spec-review-1\.md .*wave open/);
    review("1-spec/spec-review-a11y-1.md", "rejected", SPEC, [`lane=${FPS.a11y}`]);
    assert.match(check(root, "--lanes", `spec=a11y@${FPS.a11y}`), /spec-review-1\.md .*held \(a lane rejected/);
  });

  test("a claim about a changed artifact is moot; a changed target supersedes it", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAnswered.\n");
    assert.match(check(root), /superseded \(target changed\)/);
  });

  test("a changed target supersedes a stamped claim after its id is removed", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN, [], "Target: 1-spec/spec.md#R1\n");
    write(root, "1-spec/spec.md", "# Spec\n\n- R2 Replaces the target.\n");
    assert.match(check(root), /design-doc-review-1\.md .*superseded \(target changed\)/);
  });

  test("stamp rejects challenge targets whose id is absent or outside their territory", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => correction("1-spec/spec.md#R9"), /INVALID TARGET 1-spec\/spec\.md#R9/);
    assert.throws(() => correction("3-build/build-plan.md#T9"), /INVALID TARGET 3-build\/build-plan\.md#T9/);
    assert.throws(() => correction("0-intent/intent.md#goal"), /INVALID TARGET 0-intent\/intent\.md#goal/);
    write(root, "0-intent/intent.md", "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## Constraints\n\n- constraint-1 First.\n\n## Decisions\n\n- decision-1 Later.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#constraint-2\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-3.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#constraint-0\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-4.md", "unsatisfiable", SPEC), /INVALID TARGET \?/);
  });

  for (const [kind, section] of [["constraint", "Constraints"], ["decision", "Decisions"]])
    for (const presence of ["first bullet", "absent", "backtick fence", "tilde fence"])
      test(`intent ${kind}-2 landing uses its explicit token: ${presence}`, () => {
        const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
        const target = `${intent}#${kind}-2`;
        const item = `- ${kind}-2 Owner item.\n`;
        const items = presence === "first bullet" ? item
          : presence === "absent" ? `- ${kind}-20 Another item.\n- ${kind}-21 Later item.\n`
          : presence === "backtick fence" ? `\`\`\`markdown\n${item}\`\`\`\n`
          : `~~~markdown\n${item}~~~\n`;
        const ids = presence === "first bullet" ? [`${kind}-2`] : presence === "absent" ? [`${kind}-20`, `${kind}-21`] : [];
        registered(intent, { origin: "issue 7", "intent-ids": ids }, `Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## ${section}\n\n${items}`);
        registered("1-spec/spec.md", { pins: pairs([intent]) });
        registered(claim, { reviewed: pairs(SPEC) }, `# Review\n\nVerdict: unsatisfiable\nTarget: ${target}\n`);
        if (presence === "first bullet") {
          rp(root, "stamp", P(claim), "--mirror");
          assert.deepEqual(parseFrontmatter(read(root, claim)).data.get("target"), [target]);
          const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
          assert.equal(state.claims[0].target, target);
          assert.equal(state.claims[0].state, "PENDING — owner escalation");
        } else {
          assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#(?:constraint|decision)-2/);
        }
      });

  for (const [presence, body, valid] of [
    ["section", "## Goal\n\nOriginal.\n", true],
    ["fenced section", "```markdown\n## Goal\n```\n", false],
    ["word only", "The goal is an outcome.\n", false],
  ])
    test(`#goal landing addresses its section: ${presence}`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      registered(intent, { origin: "issue 7" }, `Origin: issue 7\n\n# Intent\n\n${body}`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, { reviewed: pairs(SPEC) }, "# Review\n\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n");
      if (valid) {
        rp(root, "stamp", P(claim), "--mirror");
        const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
        assert.equal(state.claims[0].state, "PENDING — owner escalation");
      } else {
        assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#goal/);
      }
    });

  for (const [kind, section] of [["context", "Context"], ["assumption", "Assumptions / directions to explore"]])
    test(`intent ${kind} ids remain outside claim territory`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      registered(intent, { origin: "issue 7" }, `Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## ${section}\n\n- ${kind}-1 Owner item.\n`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, { reviewed: pairs(SPEC) }, `# Review\n\nVerdict: unsatisfiable\nTarget: ${intent}#${kind}-1\n`);
      assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#(?:context|assumption)-1/);
    });

  for (const [kind, section] of [["constraint", "Constraints"], ["decision", "Decisions"]])
    test(`a landed claim follows the ${kind} lifecycle when its target item is removed`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      const target = `${intent}#${kind}-2`;
      const body = "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n";
      const fields = { origin: "issue 7", "intent-ids": [`${kind}-2`] };
      registered(intent, fields, `${body}\n## ${section}\n\n- ${kind}-2 Owner item.\n`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, {
        reviewed: pairs(SPEC), verdict: "unsatisfiable", target, "target-identity": identity(read(root, intent)),
      }, `# Review\n\nVerdict: unsatisfiable\nTarget: ${target}\n`);
      const landed = read(root, claim);
      assert.equal(JSON.parse(check(root, "--target-phase", "1", "--json")).claims[0].state, "PENDING — owner escalation");
      registered(intent, { ...fields, ...(kind === "constraint" ? { "retired-ids": [`${kind}-2`] } : {}) }, body);
      const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
      if (kind === "decision") {
        assert.equal(state.frontier, `INVALID FRONTMATTER ${intent}`);
        assert.deepEqual(state.claims, []);
      } else {
        assert.equal(state.claims[0].target, target);
        assert.equal(state.claims[0].state, "superseded (target changed)");
      }
      assert.equal(read(root, claim), landed);
    });

  for (const [artifact, id] of [["1-spec/spec.md", "R1"], ["2-design-doc/design-doc.md", "D1"]])
    test(`textual target ${id} must occur outside fences in ${artifact}`, () => {
      const correction = "0-intent/correction-1.md";
      write(root, artifact, `# Artifact\n\n\`\`\`markdown\n${id}\n\`\`\`\n`);
      write(root, correction, `# Correction\n\nTarget: ${artifact}#${id}\nOrigin: decision-1\n`);
      assert.throws(() => rp(root, "stamp", P(correction), "--mirror"), /INVALID TARGET/);
      appendFileSync(join(root, P(artifact)), `\n- ${id} Target item.\n`);
      rp(root, "stamp", P(correction), "--mirror");
      assert.deepEqual(parseFrontmatter(read(root, correction)).data.get("target"), [`${artifact}#${id}`]);
    });

  for (const [artifact, id, source = artifact] of [
    ["0-intent/intent.md", "constraint-2"],
    ["0-intent/intent.md", "decision-2"],
    ["1-spec/spec.md", "R2"],
    ["2-design-doc/design-doc.md", "D2"],
    ["3-build/build-plan.md", "A2"],
    ["4-document/document-plan.md", "A2"],
    ["3-build/build-plan.md", "T2", "3-build/tasks/T2.md"],
    ["4-document/document-plan.md", "T2", "4-document/tasks/T2.md"],
  ])
    for (const form of ["bullet", "heading", "mention", "other item reference", "prefix", "fenced"])
      test(`target declaration: ${artifact}#${id}, ${form}`, () => {
        const target = `${artifact}#${id}`, claim = "1-spec/spec-review-1.md";
        const declarations = {
          bullet: `- ${id} Item.\n`,
          heading: `## ${id}: Item\n`,
          mention: `See ${id}.\n`,
          "other item reference": `- decision-9 See ${id}.\n`,
          prefix: `- ${id}-old Former item.\n`,
          fenced: `\`\`\`markdown\n- ${id} Item.\n\`\`\`\n`,
        };
        write(root, artifact, "# Artifact\n");
        write(root, source, `# Artifact\n\n${declarations[form]}`);
        write(root, claim, `# Review\n\nVerdict: unsatisfiable\nTarget: ${target}\n`);
        if (["bullet", "heading"].includes(form)) {
          rp(root, "stamp", P(claim), "--mirror");
          assert.deepEqual(parseFrontmatter(read(root, claim)).data.get("target"), [target]);
        } else {
          assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET/);
        }
      });

  test("the first intent stamp records only declared item ids, preserving body identity", () => {
    const intent = "0-intent/intent.md";
    registered(intent, { origin: "issue 7" }, "Origin: issue 7\n\n# Intent\n\n## Goal\n\nSee constraint-9.\n\n## Constraints\n\n- constraint-1 Boundary.\n\n## Context\n\n- context-1 Motivation.\n\n## Assumptions\n\n- assumption-1 Hypothesis.\n\n## Decisions\n\n- decision-1 Answer.\n\n```markdown\n- constraint-2 Example.\n```\n");
    const before = identity(read(root, intent));
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `stamp ${intent}`);
    assert.deepEqual(state.artifacts, []);
    rp(root, "stamp", P(intent));
    const { data } = parseFrontmatter(read(root, intent));
    assert.deepEqual(data.get("intent-ids"), ["constraint-1", "context-1", "assumption-1", "decision-1"]);
    assert.equal(data.has("retired-ids"), false);
    assert.equal(identity(read(root, intent)), before);
  });

  for (const kind of ["constraint", "context", "assumption", "decision"])
    for (const change of ["retire", "reuse", "add"])
      test(`intent id history: ${kind}, ${change}`, () => {
        const intent = "0-intent/intent.md";
        const seen = [`${kind}-1`, `${kind}-2`];
        const retired = kind === "decision" && change !== "reuse" ? [] : change === "retire" ? [`${kind}-1`] : [`${kind}-2`];
        const items = change === "retire" ? `See ${kind}-2.\n`
          : `- ${kind}-1 Kept.\n${kind === "decision" && change === "add" ? "- decision-2 Kept.\n" : ""}- ${kind}-${change === "reuse" ? 2 : 3} Added.\n`;
        registered(intent, { origin: "issue 7", "intent-ids": seen, "retired-ids": retired }, `Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n${items}`);
        const before = read(root, intent);
        if (change === "reuse" || (kind === "decision" && change === "retire")) {
          const error = kind === "decision" ? /INVALID FRONTMATTER .*decision id .* must remain active/ : /INVALID FRONTMATTER .*retired id .* is declared again/;
          assert.throws(() => rp(root, "stamp", P(intent), "--mirror"), error);
          assert.equal(read(root, intent), before);
          const state = JSON.parse(check(root, "--json"));
          assert.equal(state.frontier, `INVALID FRONTMATTER ${intent}`);
          assert.deepEqual(state.artifacts, []);
          assert.deepEqual(state.claims, []);
        } else {
          rp(root, "stamp", P(intent), "--mirror");
          const stamped = read(root, intent), { data } = parseFrontmatter(stamped);
          assert.deepEqual(data.get("intent-ids"), change === "add" ? [...seen, `${kind}-3`] : seen);
          assert.deepEqual(data.get("retired-ids") ?? [], change === "retire" ? seen : retired);
          assert.equal(identity(stamped), identity(before));
          assert.deepEqual(JSON.parse(check(root, "--json")).contradictions, []);
          rp(root, "stamp", P(intent));
          assert.equal(read(root, intent), stamped);
        }
      });

  for (const kind of ["constraint", "context", "assumption", "decision"])
    for (const change of kind === "decision" ? ["add"] : ["add", "retire"])
      for (const stamped of [false, true])
        test(`intent history projection: ${kind}, ${change}, ${stamped ? "stamped" : "unstamped"}`, () => {
          const intent = "0-intent/intent.md";
          const decisions = kind === "decision" ? [] : ["decision-1"];
          const before = [...decisions, `${kind}-1`, ...(change === "retire" ? [`${kind}-2`] : [])];
          const current = [...decisions, `${kind}-1`, ...(change === "add" ? [`${kind}-2`] : [])];
          registered(intent, {
            origin: "issue 7",
            "intent-ids": stamped ? [...decisions, `${kind}-1`, `${kind}-2`] : before,
            "retired-ids": stamped && change === "retire" ? [`${kind}-2`] : [],
          }, `Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n${current.map((id) => `- ${id} Item.\n`).join("")}`);
          registered("1-spec/spec.md", { pins: pairs([intent]) });
          registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
          const recorded = read(root, intent);
          const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
          assert.equal(read(root, intent), recorded);
          if (stamped) {
            assert.equal(state.frontier, "complete");
            assert.deepEqual(state.contradictions, []);
            assert.equal(state.artifacts[0].approved, true);
          } else {
            assert.equal(state.frontier, `stamp ${intent}`);
            assert.equal(state.contradictions[0].path, intent);
            assert.deepEqual(state.artifacts, []);
            assert.deepEqual(state.claims, []);
            assert.deepEqual(state.challenges, []);
            assert.deepEqual(state.lanes, []);
            assert.deepEqual(state.tasks, {});
          }
        });

  for (const change of ["add", "retire"])
    test(`intent history projection at a ref: unstamped ${change}`, () => {
      const intent = "0-intent/intent.md";
      const ids = ["constraint-1", "constraint-2"];
      registered(intent, { origin: "issue 7", "intent-ids": change === "add" ? ids.slice(0, 1) : ids }, `Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n${(change === "add" ? ids : ids.slice(0, 1)).map((id) => `- ${id} Item.\n`).join("")}`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "intent body awaiting stamp");
      const ref = git(root, "rev-parse", "HEAD").trim();
      rp(root, "stamp", P(intent));
      assert.equal(JSON.parse(check(root, "--target-phase", "1", "--json")).frontier, "complete");
      const state = JSON.parse(check(root, "--ref", ref, "--target-phase", "1", "--json"));
      assert.equal(state.frontier, `stamp ${intent}`);
      assert.deepEqual(state.artifacts, []);
    });

  test("intent history projection compares id sets independently of list and body order", () => {
    const intent = "0-intent/intent.md";
    registered(intent, {
      origin: "issue 7", "intent-ids": ["constraint-3", "decision-1", "constraint-2", "constraint-1"], "retired-ids": ["constraint-2", "constraint-3"],
    }, "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n- constraint-1 Kept.\n- decision-1 Kept.\n");
    registered("1-spec/spec.md", { pins: pairs([intent]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.frontier, "complete");
    assert.deepEqual(state.contradictions, []);
  });

  for (const [label, fields] of [
    ["scalar seen ids", { "intent-ids": "constraint-1" }],
    ["scalar retired ids", { "intent-ids": ["constraint-1"], "retired-ids": "constraint-1" }],
    ["invalid id", { "intent-ids": ["constraint-0"] }],
    ["duplicate seen id", { "intent-ids": ["constraint-1", "constraint-1"] }],
    ["duplicate retired id", { "intent-ids": ["constraint-1"], "retired-ids": ["constraint-1", "constraint-1"] }],
    ["unseen retired id", { "intent-ids": ["constraint-1"], "retired-ids": ["constraint-2"] }],
  ])
    test(`invalid intent id history stops stamp and check: ${label}`, () => {
      const intent = "0-intent/intent.md";
      registered(intent, { origin: "issue 7", ...fields });
      assert.throws(() => rp(root, "stamp", P(intent), "--mirror"), /INVALID FRONTMATTER/);
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.frontier, `INVALID FRONTMATTER ${intent}`);
      assert.deepEqual(state.artifacts, []);
    });

  test("intent id history belongs only to the intent", () => {
    registered("1-spec/spec.md", { "intent-ids": ["constraint-1"] });
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md")), /INVALID FRONTMATTER.*belong to the intent/);
    assert.match(check(root), /frontier INVALID FRONTMATTER 1-spec\/spec\.md/);
  });

  test("a retired id remains invalid at a ref and when a new claim tries to land", () => {
    const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
    registered(intent, { origin: "issue 7", "intent-ids": ["constraint-2"], "retired-ids": ["constraint-2"] }, "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## Constraints\n\n- constraint-2 Reused.\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "recorded invalid intent");
    const ref = git(root, "rev-parse", "HEAD").trim();
    write(root, claim, "# Review\n\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#constraint-2\n");
    assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID FRONTMATTER.*retired id constraint-2/);
    const state = JSON.parse(check(root, "--ref", ref, "--json"));
    assert.equal(state.frontier, `INVALID FRONTMATTER ${intent}`);
    assert.deepEqual(state.claims, []);
  });

  test("a landed correction resolves after its target id is removed", () => {
    stampSpec();
    approveSpec();
    correction();
    write(root, "1-spec/spec.md", "# Spec\n\n- R2 New requirement.\n");
    rp(root, "stamp", P("0-intent/correction-1.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/correction-1.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/correction-1.md"]);
    const output = check(root, "--target-phase", "1");
    assert.match(output, /challenge .*spec\.md#R1\s+resolved/);
    assert.doesNotMatch(output, /INVALID TARGET/);
  });

  test("spec and design assumptions are valid targets when their A ids exist", () => {
    write(root, "1-spec/spec.md", "# Spec\n\n- R1 Requirement.\n- A1 Assumption.\n");
    write(root, "2-design-doc/design-doc.md", "# Design doc\n\n- D1 Decision.\n- A1 Assumption.\n");
    stampSpec();
    approveSpec();
    correction("1-spec/spec.md#A1");
    let output = check(root);
    assert.match(output, /challenge .*spec\.md#A1\s+PENDING/);
    write(root, "0-intent/correction-1.md", "# Correction 1\n\nTarget: 2-design-doc/design-doc.md#A1\nOrigin: decision-1\n");
    rp(root, "stamp", P("0-intent/correction-1.md"), "--mirror");
    output = check(root);
    assert.match(output, /challenge .*design-doc\.md#A1\s+PENDING/);
  });

  test("a sealed artifact becomes stale when its required package changes membership", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    approveDesign();
    approveSpec(2);
    const output = check(root, "--target-phase", "2");
    assert.match(output, /artifact 2-design-doc\/design-doc\.md\s+STALE — package members/);
    assert.match(output, /frontier re-synthesize 2-design-doc\/design-doc\.md/);
  });

  test("every recorded member remains consumed regardless of its filename class", () => {
    write(root, "1-spec/tasks/T9.md", "# Historical input\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/tasks/T9.md"));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("1-spec/tasks/T9.md")), "\nChanged.\n");
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE — package identities: 1-spec\/tasks\/T9\.md/);
  });

  test("an artifact cannot consume its sibling record", () => {
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec-research.md")), /never pins its sibling record/);
    stampSpec();
    const forged = read(root, "1-spec/spec.md").replace(/^head:/m, `  - 1-spec/spec-research.md@${identity(read(root, "1-spec/spec-research.md"))}\nhead:`);
    write(root, "1-spec/spec.md", forged);
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE — package members/);
  });

  test("challenges and claims beyond the target phase are reported, not the frontier", () => {
    stampSpec();
    approveSpec();
    correction("2-design-doc/design-doc.md#D1");
    const output = check(root, "--target-phase", "1");
    assert.match(output, /pending, beyond the target phase/);
    assert.match(output, /frontier complete/);
  });

  // --- tasks, reports, phase reviews ------------------------------------------

  test("the frontier walks phases in order and names the next task from the task files", () => {
    assert.match(check(root), /frontier stamp 1-spec\/spec\.md/);
    approveChain(1);
    assert.match(check(root), /frontier stamp 2-design-doc\/design-doc\.md/);
    approveChain(3);
    assert.match(check(root), /tasks\s+3-build: planned 2\s+done \[\]\s+next T1[\s\S]*frontier task 3-build\/T1/);
    report("T1", 1, "completed");
    assert.match(check(root), /frontier task 3-build\/T2/);
    report("T2", 1, "completed", ["T1"]);
    assert.match(check(root), /frontier build review/);
  });

  test("a report reviews its task and its dependencies, immutably; a replan reopens completed work by computation", () => {
    approveChain(3);
    assert.throws(() => report("T2", 1, "completed"), /reviews exactly its task and its dependencies/);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    assert.match(read(root, "3-build/tasks/T2-report-1.md"), /attempt: 1/);
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md")), /immutable/);
    write(root, "3-build/tasks/T1.md", "# T1: revised\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    const output = check(root);
    assert.match(output, /open \[T1:completed \(stale\), T2:completed \(stale\)\]/);
    assert.match(output, /build-plan\.md .*approved \(stale\)/);
  });

  test("a later task report stamp preserves its recorded package", () => {
    approveChain(3);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    write(root, "3-build/tasks/T2.md", "# T2: replanned\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.doesNotThrow(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--mirror"));
    assert.match(read(root, "3-build/tasks/T2-report-1.md"), /reviewed:\n  - 3-build\/tasks\/T2\.md@[0-9a-f]{12}\n  - 3-build\/tasks\/T1\.md@[0-9a-f]{12}/);
  });

  for (const phase of ["3-build", "4-document"])
    test(`verify-7: ${phase} report stamp and check share task dependency requirements`, () => {
      if (phase === "4-document") write(root, "4-document/document-plan.md", "# Plan\n");
      const task = `${phase}/tasks/T2.md`, report = `${phase}/tasks/T2-report-1.md`;
      const dependency = `${phase}/tasks/T1.md`, extra = `${phase}/tasks/T3.md`;
      registered(dependency, { depends: [] }, "# Task\nDepends on: none\n");
      registered(extra, { depends: [] }, "# Extra\nDepends on: none\n");
      registered(task, { depends: ["T1"] }, "# Task\nDepends on: T1\n");
      for (const paths of [[task], [task, dependency, extra]]) {
        write(root, report, "# Report\nOutcome: completed\n");
        assert.throws(() => rp(root, "stamp", P(report), "--mirror", ...paths.flatMap((path) => ["--reviewed", P(path)])), /reviews exactly its task and its dependencies/);
        registered(report, { reviewed: pairs(paths), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.tasks[phase].done.includes("T2"), false);
      }
      write(root, report, "# Report\nOutcome: completed\n");
      rp(root, "stamp", P(report), "--mirror", "--reviewed", P(dependency), "--reviewed", P(task));
      assert.deepEqual(parseFrontmatter(read(root, report)).data.get("reviewed"), pairs([dependency, task]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), true);
      registered(task, { depends: ["T1", "T3"] }, "# Task\nDepends on: T1, T3\n");
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), false);
      const next = `${phase}/tasks/T2-report-2.md`;
      write(root, next, "# Report\nOutcome: completed\n");
      assert.throws(() => rp(root, "stamp", P(next), "--mirror", "--reviewed", P(task), "--reviewed", P(dependency)), /reviews exactly its task and its dependencies/);
      rp(root, "stamp", P(next), "--mirror", ...[extra, task, dependency].flatMap((path) => ["--reviewed", P(path)]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), true);
    });

  test("a failed report blocks its task only until adjudicated or the task changes", () => {
    approveChain(3);
    report("T1", 1, "failed");
    assert.match(check(root), /frontier challenge 3-build\/tasks\/T1-report-1\.md/);
    stampPlan(["3-build/tasks/T1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/T1-report-1.md"]);
    let output = check(root);
    assert.match(output, /T1-report-1\.md .*resolved/);
    assert.match(output, /frontier task 3-build\/T1/);
    report("T1", 2, "failed");
    write(root, "3-build/tasks/T1.md", "# T1: replanned\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    output = check(root);
    assert.doesNotMatch(output, /challenge .*T1-report-2/);
  });

  test("a phase-review schema deduplicates a failed report pinned by its plan", () => {
    approveChain(3);
    report("T1", 1, "failed");
    stampPlan(["3-build/tasks/T1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, "3-build/tasks/T1-report-1.md", ...TASKS]);
    report("T1", 2, "completed");
    report("T2", 1, "completed", ["T1"]);
    review("3-build/build-review-1.md", "approved", [...PLAN_BASE, "3-build/tasks/T1-report-1.md", ...TASKS, "3-build/tasks/T1-report-2.md", "3-build/tasks/T2-report-1.md"]);
    assert.match(check(root, "--target-phase", "3"), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
  });

  test("a blocked report is never a challenge: its task stays pending for the orchestrator until a later attempt lands", () => {
    approveChain(3);
    report("T1", 1, "blocked");
    assert.match(read(root, "3-build/tasks/T1-report-1.md"), /outcome: blocked/);
    let output = check(root);
    assert.doesNotMatch(output, /challenge/);
    assert.match(output, /open \[T1:blocked\]/);
    assert.match(output, /frontier blocked 3-build\/T1/);
    assert.equal(JSON.parse(check(root, "--json")).tasks["3-build"].blocked, "T1");
    report("T1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[T1\]/);
    assert.match(output, /frontier task 3-build\/T2/);
  });

  test("a phase review names the plan package, its inputs, every task and report, and goes stale when a report lands", () => {
    buildDone();
    assert.match(check(root, "--target-phase", "3"), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
    report("T2", 2, "completed", ["T1"]);
    const output = check(root, "--target-phase", "3");
    assert.match(output, /build\s+review: ·:approved \(stale\)/);
    assert.match(output, /frontier build review/);
  });

  test("the document phase runs on the build's approval: plan requires the build plan and its approving review", () => {
    buildDone();
    write(root, "4-document/document-plan.md", "# Document plan\n\n## Order\n\n- T1\n");
    write(root, "4-document/document-plan-research.md", "# Doc research\n");
    write(root, "4-document/tasks/T1.md", "# T1: guide\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("4-document/tasks/T1.md"), "--mirror");
    const BUILD_WORK = [...TASKS, "3-build/tasks/T1-report-1.md", "3-build/tasks/T2-report-1.md"];
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"));
    assert.match(check(root), /document-plan\.md\s+STALE — package members/);
    assert.match(check(root), /frontier re-synthesize 4-document\/document-plan\.md/);
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"), ...BUILD_WORK.flatMap((f) => ["--pin", P(f)]));
    const DOC = ["4-document/document-plan.md", "4-document/document-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md", ...BUILD_WORK];
    review("4-document/document-plan-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md"]);
    assert.match(check(root), /frontier task 4-document\/T1/);
    write(root, "4-document/tasks/T1-report-1.md", "# Task report\n\nOutcome: completed\n");
    rp(root, "stamp", P("4-document/tasks/T1-report-1.md"), "--reviewed", P("4-document/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier document review/);
    review("4-document/document-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md", "4-document/tasks/T1-report-1.md"]);
    assert.match(check(root), /complete through phase 4 — target reached[\s\S]*frontier complete/);
  });

  // --- production lanes ---------------------------------------------------------

  function approveSpecLaneA(reviewed = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]) {
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", reviewed);
  }

  const LANE_A_PACKAGE = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];

  function approvalMatrixCase(context, complete, concordant, allLanes) {
    write(root, "0-intent/context.md", "# Context\n");
    const scope = context === "closed lane" ? "1-spec/a/" : "1-spec/";
    const artifact = `${scope}spec.md`;
    const record = `${scope}spec-research.md`;
    if (context === "closed lane") {
      write(root, artifact, "# Candidate a\n");
      write(root, record, "# Record a\n");
    }
    registered(artifact, { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]), ...(context === "closed lane" ? { lane: FPS.a } : {}) });
    const full = [artifact, record, "0-intent/intent.md", "0-intent/context.md"];
    const judged = complete ? full : full.slice(0, -1);
    const implicit = `${scope}spec-review-1.md`;
    registeredReview(implicit, judged);
    const named = `${scope}spec-review-security-1.md`;
    if (allLanes) registeredReview(named, concordant ? judged : (judged.includes("0-intent/context.md") ? judged.slice(0, -1) : [...judged, "0-intent/context.md"]), FPS.security);
    const declaration = context === "closed lane" ? `spec=security@${FPS.security}|a@${FPS.a}` : `spec=security@${FPS.security}`;
    if (context === "closed lane") {
      const laneReviews = [implicit, ...(allLanes ? [named] : [])];
      registeredRoot(artifact, pairs(full), laneReviews, FPS.security);
      const state = JSON.parse(check(root, "--lanes", declaration, "--target-phase", "1", "--json"));
      return state.lanes[0].closed && state.artifacts[0].approved && state.complete;
    }
    const state = JSON.parse(check(root, "--lanes", declaration, "--target-phase", "1", "--json"));
    return state.artifacts[0].approved && state.complete;
  }

  for (const context of ["closed lane", "root"])
    for (const complete of [true, false])
      for (const concordant of [true, false])
        for (const allLanes of [true, false]) {
          const name = `wave matrix: ${complete ? "complete" : "incomplete"} pins, ${concordant ? "concordant" : "discordant"} pins, ${allLanes ? "all lanes" : "missing lane"}, ${context}`;
          test(name, () => assert.equal(approvalMatrixCase(context, complete, concordant, allLanes), complete && concordant && allLanes));
        }

  // 4 pair-set changes × 2 independent references × 3 disagreement arrangements.
  // The third arrangement keeps reviewers concordant while changing their reference.
  for (const change of ["add member", "remove member", "change identity", "equal"])
    for (const context of ["live artifact", "closed lane"])
      for (const who of ["one lane vs reference", "two lanes differ", "all lanes equal before reference change"])
        test(`pair-set matrix: ${change}; ${context}; ${who}`, () => {
          const sc = context === "closed lane" ? "1-spec/a/" : "1-spec/";
          const artifact = `${sc}spec.md`, record = `${sc}spec-research.md`;
          write(root, artifact, "# Candidate\n");
          write(root, record, "# Record\n");
          write(root, "0-intent/context.md", "# Context v1\n");
          write(root, "0-intent/extra.md", "# Extra\n");
          write(root, "0-intent/other.md", "# Other\n");
          const input = pairs(["0-intent/intent.md", "0-intent/context.md"]);
          registered(artifact, { pins: input, ...(context === "closed lane" ? { lane: FPS.a } : {}) });
          let reference = [...pairs([artifact, record]), ...input];
          const reviews = [`${sc}spec-review-1.md`, `${sc}spec-review-security-1.md`];
          const mutate = (pins, salt = "v2") => {
            if (change === "add member") return [...pins, ...pairs([salt === "v2" ? "0-intent/extra.md" : "0-intent/other.md"])];
            if (change === "remove member") return pins.filter((p) => !p.startsWith(salt === "v2" ? "0-intent/context.md@" : "0-intent/intent.md@"));
            if (change === "change identity") return pins.map((p) => p.startsWith("0-intent/context.md@") ? `0-intent/context.md@${identity(`# Context ${salt}\n`)}` : p);
            return [...pins].reverse();
          };
          let first = [...reference], second = [...reference];
          if (who === "one lane vs reference") first = mutate(first);
          else if (who === "two lanes differ") {
            first = mutate(first);
            second = mutate(second, "v3");
          } else {
            reference = mutate(reference);
            if (context === "live artifact") {
              const inputs = reference.filter((p) => !p.startsWith(`${artifact}@`) && !p.startsWith(`${record}@`));
              if (change === "change identity") write(root, "0-intent/context.md", "# Context v2\n");
              registered(artifact, { pins: inputs });
            }
          }
          registeredVerdict(reviews[0], first);
          registeredVerdict(reviews[1], second, "approved", FPS.security);
          if (context === "closed lane") registeredRoot(artifact, reference, reviews, FPS.security);
          const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=security@${FPS.security}${context === "closed lane" ? `|a@${FPS.a}` : ""}`, "--json"));
          const valid = change === "equal";
          assert.equal(state.complete, valid);
          if (context === "closed lane") assert.equal(state.lanes[0].closed, valid);
          else assert.equal(state.artifacts[0].approved, valid);
          assert.equal(state.frontier === "complete", valid);
          if (who !== "all lanes equal before reference change") assert.equal(state.frontier.startsWith("consolidate"), false);
        });

  test("verify-5: concordant reviews of an unconsumed identity cannot close a lane", () => {
    const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
    write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
    write(root, "0-intent/context.md", "# Context v1\n");
    const pins = pairs(["0-intent/intent.md", "0-intent/context.md"]);
    registered(artifact, { pins, lane: FPS.a });
    const reference = [...pairs([artifact, record]), ...pins];
    write(root, "0-intent/context.md", "# Context v2\n");
    const reviews = ["1-spec/a/spec-review-1.md", "1-spec/a/spec-review-security-1.md"];
    const judged = pairs([artifact, record, "0-intent/intent.md", "0-intent/context.md"]);
    registeredVerdict(reviews[0], judged);
    registeredVerdict(reviews[1], judged, "approved", FPS.security);
    registeredRoot(artifact, reference, reviews, FPS.security);
    const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=security@${FPS.security}|a@${FPS.a}`, "--json"));
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.lanes[0].approved, false);
    assert.equal(state.complete, false);
  });

  for (const omitted of ["0-intent/intent.md", "0-intent/context.md"])
    test(`F01 / verify-2: a registered review omitting ${omitted} cannot close`, () => {
      const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
      write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
      write(root, "0-intent/context.md", "# Context\n");
      registered(artifact, { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]), lane: FPS.a });
      const reference = pairs([artifact, record, "0-intent/intent.md", "0-intent/context.md"]);
      registeredVerdict("1-spec/a/spec-review-1.md", reference.filter((pin) => !pin.startsWith(`${omitted}@`)));
      registeredRoot(artifact, reference, ["1-spec/a/spec-review-1.md"]);
      const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
      assert.equal(state.lanes[0].closed, false);
      assert.equal(state.frontier, "review wave 1-spec/a/spec.md");
      assert.equal(state.complete, false);
    });

  test("F02 / R7.1.3 / verify #1: registered roots retain a and consolidate b", () => {
    const a = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];
    write(root, a[0], "# A\n"); write(root, a[1], "# A record\n");
    registered(a[0], { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    const reference = pairs([...a.slice(0, 2), "0-intent/intent.md"]);
    registeredVerdict(a[2], reference); registeredRoot(a[0], reference, [a[2]]);
    const original = parseFrontmatter(read(root, "1-spec/spec.md")).data.get("lane-packages");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAdd b after a.\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a]), "lane-packages": original });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, ...a]));
    const reconfirmed = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
    assert.equal(reconfirmed.artifacts[0].state, "fresh");
    assert.equal(reconfirmed.complete, true);
    const state = () => JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a},b@${FPS.b}<a`, "--json"));
    assert.equal(state().lanes[0].closed, true);
    assert.equal(state().frontier, "synthesize 1-spec/b/spec.md");
    const b = ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "1-spec/b/spec-review-1.md"];
    write(root, b[0], "# B\n"); write(root, b[1], "# B record\n");
    registered(b[0], { pins: pairs(["0-intent/intent.md", ...a]), lane: FPS.b });
    const bReference = pairs([...b.slice(0, 2), "0-intent/intent.md", ...a]);
    registeredVerdict(b[2], bReference);
    assert.equal(state().frontier, "consolidate 1-spec/spec.md");
    assert.deepEqual(state().artifacts[0].laneCandidates.map((lane) => lane.package), [a, b]);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a, ...b]), "lane-packages": [...original, JSON.stringify([b[0], pairs(b), bReference])] });
    registeredVerdict("1-spec/spec-review-3.md", pairs([...SPEC, ...a, ...b]));
    assert.equal(state().complete, true);
    assert.deepEqual(state().lanes.map((lane) => lane.closed), [true, true]);
  });

  test("verify #2/#3: registered sibling records stale; materials stay within the package", () => {
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec-research.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    let state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
    assert.equal(state.complete, false);
    write(root, "0-intent/context.md", "# Context\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    const lanes = `spec=security@${FPS.security}[materials=0-intent/context.md]`;
    assert.throws(() => check(root, "--target-phase", "1", "--lanes", lanes), /outside the .* package/);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]) });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, "0-intent/context.md"]));
    registeredVerdict("1-spec/spec-review-security-2.md", pairs(["0-intent/context.md"]), "approved", FPS.security);
    state = JSON.parse(check(root, "--target-phase", "1", "--lanes", lanes, "--json"));
    assert.equal(state.complete, true);
  });

  test("verify-3: registered claims become moot and resolutions adjudicated on input change", () => {
    const correction = "0-intent/correction-1.md";
    registered(correction, { target: ["1-spec/spec.md#R1"], "target-identity": [identity(read(root, "1-spec/spec.md"))], origin: "issue 8" }, "# Correction\nTarget: 1-spec/spec.md#R1\nOrigin: issue 8\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", correction]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, correction]));
    const designPins = ["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
    registered("2-design-doc/design-doc.md", { pins: pairs(designPins) });
    registered("2-design-doc/design-doc-review-1.md", {
      reviewed: pairs(["2-design-doc/design-doc.md", "2-design-doc/design-doc-research.md", ...designPins]),
      verdict: "unsatisfiable", target: "1-spec/spec.md#R1", "target-identity": identity(read(root, "1-spec/spec.md")),
    }, "# Review\nVerdict: unsatisfiable\nTarget: 1-spec/spec.md#R1\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged input.\n");
    const state = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.equal(state.artifacts[0].approved, false);
    assert.equal(state.challenges[0].state, "adjudicated");
    assert.match(state.claims[0].state, /^moot/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  for (const scope of ["root", "production lane"])
    for (const update of ["later input wave", "new input review lane"])
      for (const verdict of ["approved", "unsatisfiable"])
        test(`verify-6: ${scope}, ${update}, ${verdict} uses the complete required package`, () => {
          registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
          registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          write(root, artifact, "# Design\n- D1 Decision.\n"); write(root, record, "# Record\n");
          const inputs = ["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
          const lane = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...lane });
          const judged = pairs([artifact, record, ...inputs]);
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, judged);
          else registered(review, {
            reviewed: judged, verdict, target: "0-intent/intent.md#goal", "target-identity": identity(read(root, "0-intent/intent.md")),
          }, "# Review\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n");
          const declarations = scope === "root" ? [] : [`design-doc=|a@${FPS.a}`];
          const checkState = () => JSON.parse(check(root, "--target-phase", "2", "--lanes", declarations.join(";"), "--json"));
          const consumer = (state) => scope === "root" ? state.artifacts[1] : state.lanes[0];
          const before = checkState();
          assert.equal(consumer(before).state, "fresh");
          assert.equal(consumer(before).approved, verdict === "approved");
          if (verdict === "unsatisfiable") assert.match(before.claims[0].state, /^PENDING/);

          // Bodies and identities of both artifacts stay unchanged; only approval paths change.
          const newReviews = ["1-spec/spec-review-2.md"];
          registeredVerdict(newReviews[0], pairs(SPEC));
          if (update === "new input review lane") {
            declarations.push(`spec=security@${FPS.security}`);
            newReviews.push("1-spec/spec-review-security-2.md");
            registeredVerdict(newReviews[1], pairs(SPEC), "approved", FPS.security);
          }
          const changed = checkState();
          assert.equal(changed.artifacts[0].approved, true);
          assert.equal(consumer(changed).state, "stale");
          assert.deepEqual(consumer(changed).stale, ["package members"]);
          assert.equal(consumer(changed).approved, false);
          assert.equal(consumer(changed).lanes[0].fresh, false);
          assert.equal(consumer(changed).episode, 1);
          assert.equal(changed.frontier, `re-synthesize ${artifact}`);
          assert.equal(changed.complete, false);
          assert.match(check(root, "--target-phase", "2", "--lanes", declarations.join(";")), /STALE — package members/);
          if (verdict === "unsatisfiable") assert.match(changed.claims[0].state, /^moot/);

          // Reconfirmation includes every lane of the input's current wave.
          const currentInputs = ["0-intent/intent.md", "1-spec/spec.md", ...newReviews];
          registered(artifact, { pins: pairs(currentInputs), ...lane });
          registeredVerdict(`${sc}design-doc-review-2.md`, pairs([artifact, record, ...currentInputs]));
          const confirmed = checkState();
          assert.equal(consumer(confirmed).state, "fresh");
          assert.equal(consumer(confirmed).approved, true);
          assert.equal(consumer(confirmed).episode, 0);
          assert.equal(confirmed.claims.some((claim) => claim.state.startsWith("PENDING")), false);
        });

  for (const scope of ["root", "production lane"])
    for (const inputState of ["changed package", "stale approval", "no approval", "rejected new lane"])
      for (const verdict of ["approved", "unsatisfiable"])
        test(`verify-7: ${scope}, ${inputState}, ${verdict} waits for a current input approval`, () => {
          const intent = "0-intent/intent.md", spec = "1-spec/spec.md";
          const specInputs = [intent];
          if (inputState === "stale approval") {
            write(root, "0-intent/context.md", "# Context\nOriginal evidence.\n");
            specInputs.push("0-intent/context.md");
          }
          let specPackage = ["1-spec/spec.md", "1-spec/spec-research.md", ...specInputs];
          registered(spec, { pins: pairs(specInputs) });
          const inputs = [intent, spec];
          if (inputState !== "no approval") {
            registeredVerdict("1-spec/spec-review-1.md", pairs(specPackage));
            inputs.push("1-spec/spec-review-1.md");
          }
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          const lane = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...lane }, "# Design\n- D1 Decision.\n");
          write(root, record, "# Record\n");
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, pairs([artifact, record, ...inputs]));
          else registered(review, {
            reviewed: pairs([artifact, record, ...inputs]), verdict, target: `${intent}#goal`, "target-identity": identity(read(root, intent)),
          }, `# Review\nVerdict: unsatisfiable\nTarget: ${intent}#goal\n`);
          const declarations = scope === "root" ? [] : [`design-doc=|a@${FPS.a}`];
          const state = () => JSON.parse(check(root, "--target-phase", "2", "--lanes", declarations.join(";"), "--json"));
          const consumer = (s) => scope === "root" ? s.artifacts[1] : s.lanes[0];
          if (inputState !== "no approval") {
            const before = state();
            assert.equal(consumer(before).state, "fresh");
            assert.equal(consumer(before).approved, verdict === "approved");
            if (verdict === "unsatisfiable") assert.match(before.claims[0].state, /^PENDING/);
          }
          if (inputState === "changed package") {
            write(root, "0-intent/context.md", "# Context\nNew evidence.\n");
            registered(spec, { pins: pairs([intent, "0-intent/context.md"]) });
            specPackage = [...SPEC, "0-intent/context.md"];
          } else if (inputState === "stale approval") {
            write(root, "0-intent/context.md", "# Context\nRevised evidence.\n");
          } else if (inputState === "rejected new lane") {
            declarations.push(`spec=security@${FPS.security}`);
            registeredVerdict("1-spec/spec-review-2.md", pairs(SPEC));
            registeredVerdict("1-spec/spec-review-security-2.md", pairs(SPEC), "rejected", FPS.security);
          }
          const blocked = state();
          assert.equal(blocked.artifacts[0].approved, false);
          assert.equal(consumer(blocked).state, "stale");
          assert.equal(consumer(blocked).approved, false);
          assert.equal(consumer(blocked).lanes[0].fresh, false);
          assert.equal(consumer(blocked).episode, 1);
          assert.equal(blocked.complete, false);
          const action = inputState === "rejected new lane" ? "adjudicate" : inputState === "stale approval" ? "re-synthesize" : "review wave";
          assert.equal(blocked.frontier, `${action} 1-spec/spec.md`);
          assert.equal(blocked.claims.some((c) => c.state.startsWith("PENDING")), false);
          if (verdict === "unsatisfiable") assert.match(blocked.claims[0].state, /^moot/);

          const wave = inputState === "rejected new lane" ? 3 : 2;
          if (inputState === "stale approval") registered(spec, { pins: pairs(specInputs) });
          const approvals = [`1-spec/spec-review-${wave}.md`];
          registeredVerdict(approvals[0], pairs(specPackage));
          if (inputState === "rejected new lane") {
            approvals.push(`1-spec/spec-review-security-${wave}.md`);
            registeredVerdict(approvals[1], pairs(specPackage), "approved", FPS.security);
          }
          const restored = state();
          assert.equal(restored.artifacts[0].approved, true);
          assert.equal(consumer(restored).approved, false);
          assert.deepEqual(consumer(restored).stale, ["package members"]);
          assert.equal(restored.frontier, `re-synthesize ${artifact}`);
          if (verdict === "unsatisfiable") assert.match(restored.claims[0].state, /^moot/);
          const repinned = [intent, spec, ...approvals];
          registered(artifact, { pins: pairs(repinned), ...lane });
          registeredVerdict(`${sc}design-doc-review-2.md`, pairs([artifact, record, ...repinned]));
          const confirmed = state();
          assert.equal(consumer(confirmed).state, "fresh");
          assert.equal(consumer(confirmed).approved, true);
          assert.equal(consumer(confirmed).episode, 0);
        });

  test("verify-6: another consumer wave with the same pair set preserves currency", () => {
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const before = JSON.parse(check(root, "--target-phase", "2", "--json"));
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs(DESIGN).reverse());
    const after = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.equal(after.frontier, before.frontier);
    assert.equal(after.complete, true);
    assert.equal(after.artifacts[1].state, "fresh");
    assert.equal(after.artifacts[1].approved, true);
    assert.equal(after.artifacts[1].episode, 0);
    assert.deepEqual(after.artifacts[1].stale, []);
    // Reordering an input approval's identical pairs changes no requirement either.
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC).reverse());
    assert.deepEqual(JSON.parse(check(root, "--target-phase", "2", "--json")), after);
  });

  for (const phase of ["build-plan", "document-plan"])
    test(`verify-6: the ${phase} table includes every required approval lane and adjudicated challenge`, () => {
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
      registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
      const buildPins = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
      registered("3-build/build-plan.md", { pins: pairs(buildPins) });
      registered("3-build/tasks/T1.md", { depends: [] }, "# Task\nDepends on: none\n");
      const planPackage = [...PLAN_BASE, "3-build/tasks/T1.md"];
      registeredVerdict("3-build/build-plan-review-1.md", pairs(planPackage));
      registered("3-build/tasks/T1-report-1.md", { reviewed: pairs(["3-build/tasks/T1.md"]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
      const buildPackage = [...planPackage, "3-build/tasks/T1-report-1.md"];
      registeredVerdict("3-build/build-review-1.md", pairs(buildPackage));

      const artifact = phase === "build-plan" ? "3-build/build-plan.md" : "4-document/document-plan.md";
      const record = phase === "build-plan" ? "3-build/build-plan-research.md" : "4-document/document-plan-research.md";
      const correction = "0-intent/correction-1.md";
      write(root, artifact, "# Plan\nAssumption A1.\n");
      registered(correction, { target: [`${artifact}#A1`], "target-identity": [identity(read(root, artifact))], origin: "issue 8" }, `# Correction\nTarget: ${artifact}#A1\nOrigin: issue 8\n`);
      const inputs = phase === "build-plan" ? [...buildPins, correction] : [
        "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md",
        "3-build/build-plan-review-1.md", "3-build/tasks/T1.md", "3-build/tasks/T1-report-1.md", "3-build/build-review-1.md", correction,
      ];
      registered(artifact, { pins: pairs(inputs) }, "# Plan\n- A1 Assumption.\n");
      write(root, record, "# Record\n");
      const judged = [artifact, record, ...inputs, ...(phase === "build-plan" ? ["3-build/tasks/T1.md"] : [])];
      registeredVerdict(`${dirname(artifact)}/${phase}-review-1.md`, pairs(judged));
      const targetPhase = phase === "build-plan" ? "3" : "4";
      const before = JSON.parse(check(root, "--target-phase", targetPhase, "--json"));
      assert.equal(before.artifacts.at(-1).approved, true);
      assert.equal(before.challenges[0].state, "resolved");
      const inputPrefix = phase === "build-plan" ? "design-doc" : "build";
      const inputPhase = phase === "build-plan" ? "2-design-doc" : "3-build";
      const inputPackage = phase === "build-plan" ? DESIGN : buildPackage;
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-2.md`, pairs(inputPackage));
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-security-2.md`, pairs(inputPackage), "approved", FPS.security);
      const state = JSON.parse(check(root, "--target-phase", targetPhase, "--lanes", `${inputPrefix}=security@${FPS.security}`, "--json"));
      assert.equal(state.artifacts.at(-1).state, "stale");
      assert.deepEqual(state.artifacts.at(-1).stale, ["package members"]);
      assert.equal(state.artifacts.at(-1).approved, false);
      assert.equal(state.artifacts.at(-1).episode, 1);
      assert.equal(state.challenges[0].state, "adjudicated");
      assert.equal(state.frontier, `re-synthesize ${artifact}`);
      assert.equal(state.complete, false);
    });

  test("root pins alone do not replace an independent consolidation reference", () => {
    const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
    write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    registeredVerdict("1-spec/a/spec-review-1.md", pairs([artifact, record, "0-intent/intent.md"]));
    const binding = [artifact, record, "1-spec/a/spec-review-1.md"];
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...binding]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, ...binding]));
    const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.complete, false);
    assert.equal(state.frontier, "consolidate 1-spec/spec.md");
  });

  test("a registered task report cannot omit its dependency from the reference", () => {
    buildDone();
    registered("3-build/tasks/T2-report-1.md", { reviewed: pairs(["3-build/tasks/T2.md"]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
    const state = JSON.parse(check(root, "--target-phase", "3", "--json"));
    assert.deepEqual(state.tasks["3-build"].done, ["T1"]);
    assert.equal(state.frontier, "task 3-build/T2");
    assert.equal(state.complete, false);
  });

  for (const change of ["add member", "remove member", "change identity"])
    test(`verify-4/5: closed reference survives candidate ${change}`, () => {
      const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
      write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
      write(root, "0-intent/context.md", "# Context v1\n");
      write(root, "0-intent/extra.md", "# Extra\n");
      let inputs = ["0-intent/intent.md", "0-intent/context.md"];
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      const reference = pairs([artifact, record, ...inputs]);
      registeredVerdict("1-spec/a/spec-review-1.md", reference);
      registeredRoot(artifact, reference, ["1-spec/a/spec-review-1.md"]);
      const before = read(root, "1-spec/spec.md");
      if (change === "add member") inputs.push("0-intent/extra.md");
      if (change === "remove member") inputs.pop();
      if (change === "change identity") write(root, "0-intent/context.md", "# Context v2\n");
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      registeredVerdict("1-spec/a/spec-review-2.md", pairs([artifact, record, ...inputs]), "rejected");
      const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
      assert.equal(state.lanes[0].closed, true);
      assert.equal(state.lanes[0].episode, 1);
      assert.equal(state.artifacts[0].state, "fresh");
      assert.equal(state.artifacts[0].approved, true);
      assert.equal(state.complete, true);
      assert.equal(read(root, "1-spec/spec.md"), before);
    });

  test("a root cannot complete from a lane review omitting consumed context", () => {
    write(root, "0-intent/context.md", "# Context\n");
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.md"), "--set", `lane=${FPS.a}`);
    write(root, "1-spec/a/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/a/spec-review-1.md"), "--reviewed", P("1-spec/a/spec.md"), "--reviewed", P("1-spec/a/spec-research.md"), "--reviewed", P("0-intent/intent.md"), "--mirror"), /INVALID REVIEW PACKAGE/);
    const lanePackage = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...lanePackage.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...lanePackage]);
    const state = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json"));
    assert.notEqual(state.complete, true);
    assert.equal(state.frontier, "stamp 1-spec/a/spec-review-1.md");
  });

  test("declared production lanes are sub-pipelines; `after` waits; the root must pin every lane", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    rmSync(join(root, P("1-spec/spec-research.md")));
    const lanes = `spec=|event-driven@${FPS.event},contrarian@${FPS.contrarian}<event-driven`;
    let output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+MISSING/);
    assert.match(output, /lane\s+1-spec\/contrarian\/spec\.md\s+MISSING\s+waiting for event-driven/);
    assert.match(output, /frontier synthesize 1-spec\/event-driven\/spec\.md/);
    for (const id of ["event-driven"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.event}`);
      review(`1-spec/${id}/spec-review-1.md`, "approved", [`1-spec/${id}/spec.md`, `1-spec/${id}/spec-research.md`, "0-intent/intent.md"]);
    }
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier synthesize 1-spec\/contrarian\/spec\.md/);
    write(root, "1-spec/contrarian/spec.md", "# Spec contrarian\n");
    write(root, "1-spec/contrarian/spec-research.md", "# Record contrarian\n");
    rp(root, "stamp", P("1-spec/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--set", `lane=${FPS.contrarian}`);
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/contrarian\/spec\.md\s+STALE — package members/);
    assert.match(output, /frontier re-synthesize 1-spec\/contrarian\/spec\.md/);
    rp(root, "stamp", P("1-spec/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--set", `lane=${FPS.contrarian}`);
    review("1-spec/contrarian/spec-review-1.md", "approved", ["1-spec/contrarian/spec.md", "1-spec/contrarian/spec-research.md", "0-intent/intent.md", "1-spec/event-driven/spec.md", "1-spec/event-driven/spec-research.md", "1-spec/event-driven/spec-review-1.md"]);
    assert.match(check(root, "--lanes", lanes), /artifact 1-spec\/spec\.md\s+MISSING — every lane approved: consolidate/);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    write(root, "1-spec/spec-research.md", "# Consolidated record\n");
    // A lane closes only when the root records its complete package.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"));
    output = check(root, "--lanes", lanes);
    assert.doesNotMatch(output, /closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    // One complete lane closes independently while an incomplete one stays open.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--pin", P("1-spec/contrarian/spec.md"), "--pin", P("1-spec/contrarian/spec-review-1.md"));
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.doesNotMatch(output, /lane\s+1-spec\/contrarian\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--pin", P("1-spec/contrarian/spec.md"), "--pin", P("1-spec/contrarian/spec-research.md"), "--pin", P("1-spec/contrarian/spec-review-1.md"));
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:none/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /frontier re-synthesize 1-spec\/spec\.md/);
    assert.doesNotMatch(output, /frontier re-synthesize 1-spec\/(?:event-driven|contrarian)\/spec\.md/);
  });

  test("production-lane closure preserves the concordant approved package consumed by the root", () => {
    const lanes = `spec=security@${FPS.security}|a@${FPS.a}`;
    write(root, "1-spec/a/spec.md", "# Spec a v1\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    write(root, "1-spec/a/spec.md", "# Spec a v2\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-security-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"], [`lane=${FPS.security}`]);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    const lanePackage = ["0-intent/intent.md", "1-spec/a/spec.md", "1-spec/a/spec-research.md"];
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/a/spec-review-1.md", "1-spec/a/spec-review-security-1.md"].flatMap((path) => ["--pin", P(path)]));
    assert.doesNotMatch(check(root, "--lanes", lanes, "--target-phase", "1"), /lane\s+1-spec\/a\/spec\.md\s+closed/);

    review("1-spec/a/spec-review-2.md", "approved", lanePackage);
    review("1-spec/a/spec-review-security-2.md", "approved", lanePackage, [`lane=${FPS.security}`]);
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/a/spec-review-2.md", "1-spec/a/spec-review-security-2.md"].flatMap((path) => ["--pin", P(path)]));
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /lane\s+1-spec\/a\/spec\.md\s+closed/);
  });

  test("an incomplete approval package cannot close a production lane", () => {
    assert.throws(() => approveSpecLaneA(["1-spec/a/spec.md", "1-spec/a/spec-research.md"]), /INVALID REVIEW PACKAGE/);
  });

  test("a root reconfirmation preserves its closed lane package", () => {
    approveSpecLaneA();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\n## Decisions\n\n- decision-1 New input.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    const output = check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH[\s\S]*frontier complete/);
  });

  test("repinning a closed lane candidate preserves its package and episode", () => {
    write(root, "0-intent/context.md", "# Context v1\n");
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    const inputs = ["0-intent/intent.md", "0-intent/context.md"];
    rp(root, "stamp", P("1-spec/a/spec.md"), ...inputs.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", ...inputs]);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    assert.equal(JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json")).frontier, "complete");
    write(root, "0-intent/context.md", "# Context v2\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), ...inputs.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-2.md", "rejected", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", ...inputs]);
    const state = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json"));
    assert.equal(state.lanes[0].closed, true);
    assert.equal(state.counters["1-spec/a/spec"].episode, 1);
    assert.equal(state.artifacts[0].state, "fresh");
    assert.equal(state.artifacts[0].approved, true);
    assert.equal(state.frontier, "complete");
  });

  test("a new production lane leaves closed lanes outside the frontier", () => {
    approveSpecLaneA();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    assert.match(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1"), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\n## Decisions\n\n- decision-1 Add lane b.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const output = check(root, "--lanes", `spec=|a@${FPS.a},b@${FPS.b}`, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+closed/);
    assert.match(output, /lane\s+1-spec\/b\/spec\.md\s+MISSING/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE/);
    assert.match(output, /frontier synthesize 1-spec\/b\/spec\.md/);
    write(root, "1-spec/b/spec.md", "# Candidate b\n");
    write(root, "1-spec/b/spec-research.md", "# Record b\n");
    rp(root, "stamp", P("1-spec/b/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.b}`);
    review("1-spec/b/spec-review-1.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md", ...LANE_A_PACKAGE]);
    const ready = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a},b@${FPS.b}<a`, "--target-phase", "1", "--json"));
    assert.equal(ready.frontier, "consolidate 1-spec/spec.md");
    assert.deepEqual(ready.artifacts[0].laneCandidates, [
      { lane: "1-spec/a/", package: LANE_A_PACKAGE },
      { lane: "1-spec/b/", package: ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "1-spec/b/spec-review-1.md"] },
    ]);
  });

  test("an after lane waits for each dependency's recursively complete package", () => {
    const lanes = `spec=|z@999999999999,b@${FPS.b}<z,c@${FPS.c}<b`;
    for (const [id, fp] of [["z", "999999999999"], ["b", FPS.b]]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      const dependencyPins = id === "b" ? ["1-spec/z/spec.md", "1-spec/z/spec-research.md"] : [];
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), ...dependencyPins.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${fp}`);
    }
    review("1-spec/b/spec-review-1.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md", "1-spec/z/spec.md", "1-spec/z/spec-research.md"]);
    const output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/c\/spec\.md\s+MISSING\s+waiting for b/);
    assert.match(output, /frontier review wave 1-spec\/z\/spec\.md/);
    assert.doesNotMatch(output, /frontier synthesize 1-spec\/c\/spec\.md/);
  });

  test("a claim raised inside a production lane reaches the frontier, and lanes have counters", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    const lanes = `spec=|a@${FPS.a},b@${FPS.b}`;
    for (const id of ["a", "b"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS[id]}`);
    }
    review("1-spec/a/spec-review-1.md", "unsatisfiable", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"], [], "Target: 0-intent/intent.md#goal\n");
    review("1-spec/b/spec-review-1.md", "rejected", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/b/spec-review-2.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md"]);
    const output = check(root, "--lanes", lanes);
    assert.match(output, /claim\s+1-spec\/a\/spec-review-1\.md → 0-intent\/intent\.md#goal\s+PENDING — owner escalation/);
    assert.match(output, /counter\s+1-spec\/a\/spec: 1 wave this episode/);
    assert.doesNotMatch(output, /counter\s+1-spec\/b\/spec/);
  });

  // --- refs and output ----------------------------------------------------------

  test("check --ref reads a pipeline from a branch without checking it out", () => {
    approveChain(1);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "spec approved");
    git(root, "branch", "other");
    write(root, "1-spec/spec.md", "# Spec\n\nChanged on the working tree.\n");
    assert.match(check(root, "--ref", "other", "--target-phase", "1"), /frontier complete/);
    assert.match(check(root, "--target-phase", "1"), /approved \(stale\)/);
  });

  test("stamp and check derive the worktree repository from their argument", () => {
    const seat = `${root}-seat`;
    git(root, "worktree", "add", "--quiet", "-b", "seat-branch", seat);
    try {
      writeFileSync(join(seat, "seat-work.js"), "export default 1;\n");
      git(seat, "add", "-A");
      git(seat, "commit", "--quiet", "-m", "seat work");
      const seatHead = git(seat, "rev-parse", "--short=12", "HEAD").trim();
      rp(root, "stamp", join(seat, P("1-spec/spec.md")), "--pin", P("0-intent/intent.md"));
      assert.match(readFileSync(join(seat, P("1-spec/spec.md")), "utf8"), new RegExp(`head: ${seatHead}`));
      assert.match(rp(root, "check", join(seat, PIPELINE), "--base", "main", "--target-phase", "1"), new RegExp(`unclaimed by any task report: ${seatHead.slice(0, 7)}`));
    } finally {
      git(root, "worktree", "remove", "--force", seat);
    }
  });

  test("state cannot be forged: mirrors come from the body, reviewed is immutable, identities are exact", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: rejected\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md"), "--set", "verdict=approved"), /--set accepts only lane/);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((f) => ["--reviewed", P(f)]), "--mirror");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    // A hand-written pin with an empty or short identity is never fresh.
    write(root, "2-design-doc/design-doc.md", "---\npins:\n  - 0-intent/intent.md@\n  - 1-spec/spec.md@abc\n---\n# Design doc\n");
    assert.match(check(root), /artifact 2-design-doc\/design-doc\.md\s+STALE/);
  });

  test("mirrors are the body's projection: a declaration the body lost never survives in the frontmatter", () => {
    stampSpec();
    approveSpec();
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
    // The verdict is deleted from the body; the frontmatter still says approved.
    const stamped = read(root, "1-spec/spec-review-1.md");
    write(root, "1-spec/spec-review-1.md", stamped.replace(/^Verdict: approved\n/m, ""));
    let output = check(root, "--target-phase", "1");
    assert.match(output, /mirror\s+1-spec\/spec-review-1\.md\s+differs from the body: verdict/);
    assert.doesNotMatch(output, /APPROVED|frontier complete/);
    assert.match(output, /frontier stamp 1-spec\/spec-review-1\.md/);
    // Re-mirroring a stamped file is legitimate: reviewed stays, the mirror set is recomputed whole.
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    const text = read(root, "1-spec/spec-review-1.md");
    assert.doesNotMatch(text, /verdict:/);
    assert.match(text, /reviewed:/);
    output = check(root, "--target-phase", "1");
    assert.doesNotMatch(output, /mirror\s/);
    assert.match(output, /frontier INVALID REVIEW 1-spec\/spec-review-1\.md: no Verdict line/);
    // A claim keeps the target identity it landed with while its target is the same.
    review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    const landed = parseFrontmatter(read(root, "1-spec/spec-review-2.md")).data.get("target-identity");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, "1-spec/spec-review-2.md")).data.get("target-identity"), landed);
    write(root, "1-spec/spec-review-2.md", read(root, "1-spec/spec-review-2.md").replace(/^Verdict: unsatisfiable\n/m, "Verdict: approved\n").replace(/^Target:.*\n/m, ""));
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.doesNotMatch(read(root, "1-spec/spec-review-2.md"), /target/);
  });

  test("every attempt is validated: a report without an outcome is invalid until its body declares one and is re-mirrored", () => {
    approveChain(3);
    write(root, "3-build/tasks/T1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    let output = check(root);
    assert.match(output, /frontier INVALID REPORT 3-build\/tasks\/T1-report-1\.md: no Outcome line/);
    appendFileSync(join(root, P("3-build/tasks/T1-report-1.md")), "\nOutcome: blocked\n");
    output = check(root);
    assert.match(output, /mirror\s+3-build\/tasks\/T1-report-1\.md\s+differs from the body: outcome/);
    assert.match(output, /frontier stamp 3-build\/tasks\/T1-report-1\.md/);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--mirror");
    report("T1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[T1\]/);
    assert.match(output, /frontier task 3-build\/T2/);
    // An unstamped task file is a contradiction too: its dependencies are declared in the body.
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    assert.match(check(root), /frontier stamp 3-build\/tasks\/T2\.md/);
  });

  test("a lane's identity is its whole declaration: the fingerprint covers id, brief, materials, and after", () => {
    const fp = (...args) => rp(root, "fingerprint", ...args).trim();
    const base = fp("security", "--brief", "Verify security surfaces in depth");
    assert.match(base, /^[0-9a-f]{12}$/);
    assert.equal(fp("security", "--brief", "  Verify security surfaces in depth "), base);
    assert.notEqual(fp("a11y", "--brief", "Verify security surfaces in depth"), base);
    assert.notEqual(fp("security", "--brief", "Verify accessibility"), base);
    assert.notEqual(fp("security", "--brief", "Verify security surfaces in depth", "--materials", "intent,diff"), base);
    assert.notEqual(fp("security", "--brief", "Verify security surfaces in depth", "--after", "event-driven"), base);
    assert.throws(() => rp(root, "fingerprint"), /missing <lane id>/);
  });

  test("a declared fingerprint must match the `lane` a review or lane artifact was stamped with", () => {
    stampSpec();
    const fp = rp(root, "fingerprint", "security", "--brief", "Verify security surfaces in depth").trim();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "approved", SPEC, [`lane=${fp}`], "Brief: Verify security surfaces in depth\n");
    assert.match(check(root, "--lanes", `spec=security@${fp}`, "--target-phase", "1"), /frontier complete/);
    const other = rp(root, "fingerprint", "security", "--brief", "Verify accessibility").trim();
    assert.match(check(root, "--lanes", `spec=security@${other}`, "--target-phase", "1"), /security:approved \(stale\)/);
    // A review stamped without `lane` never satisfies a declared fingerprint.
    review("1-spec/spec-review-security-2.md", "approved", SPEC);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root, "--lanes", `spec=security@${fp}`, "--target-phase", "1"), /security:approved \(stale\)/);
    // Production lanes alike: the lane artifact carries the fingerprint it was produced under.
    for (const f of ["1-spec/spec.md", "1-spec/spec-review-security-1.md", "1-spec/spec-review-security-2.md"]) rmSync(join(root, P(f)));
    const pfp = rp(root, "fingerprint", "a", "--brief", "Explore an event-driven design").trim();
    write(root, "1-spec/a/spec.md", "# Spec a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    const lanes = `spec=|a@${pfp}`;
    let output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+STALE — lane declaration/);
    assert.match(output, /frontier re-synthesize 1-spec\/a\/spec\.md/);
    rp(root, "stamp", P("1-spec/a/spec.md"), "--set", `lane=${pfp}`);
    output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier consolidate 1-spec\/spec\.md/);
  });

  test("a review lane names exactly its declared material paths", () => {
    stampSpec();
    approveSpec();
    const materials = ["1-spec/spec.md", "0-intent/intent.md"];
    const fp = rp(root, "fingerprint", "security", "--materials", materials.join(",")).trim();
    review("1-spec/spec-review-security-1.md", "approved", materials, [`lane=${fp}`]);
    const lanes = `spec=security@${fp}[materials=${materials.join("+")}]`;
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /security:approved[\s\S]*frontier complete/);
    assert.throws(() => check(root, "--lanes", `spec=security@${fp}[materials=1-spec/spec.md+1-spec/spec.md]`), /duplicate material path/);
    assert.throws(() => check(root, "--lanes", `spec=security@${fp}[materials=diff]`), /invalid material path/);
  });

  test("review material paths expand only inside the production lane's declared scope", () => {
    const fp = rp(root, "fingerprint", "security", "--materials", "1-spec/spec.md,0-intent/intent.md").trim();
    const lanes = `spec=security@${fp}[materials=1-spec/spec.md+0-intent/intent.md]|a@${FPS.a}`;
    write(root, "1-spec/a/spec.md", "# Spec a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    write(root, "1-spec/a/intent.md", "# Coincidental local name\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/a/spec-review-security-1.md", "approved", ["1-spec/a/spec.md", "0-intent/intent.md"], [`lane=${fp}`]);
    const output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+FRESH[\s\S]*security:approved\s+APPROVED/);
  });

  test("a lane the declaration lacks is a defect, never an implicit lane; reserved names are refused", () => {
    stampSpec();
    approveSpec();
    write(root, "1-spec/rogue/spec.md", "# Rogue\n");
    let output = check(root, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/rogue\/\s+UNDECLARED/);
    assert.match(output, /frontier undeclared lane 1-spec\/rogue\//);
    rmSync(join(root, P("1-spec/rogue")), { recursive: true });
    // An undeclared review lane is diagnosed before wave state.
    review("1-spec/spec-review-extra-2.md", "rejected", SPEC);
    output = check(root, "--target-phase", "1");
    assert.match(output, /frontier undeclared lane 1-spec\/spec-review-extra-2\.md/);
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md/);
    assert.throws(() => check(root, "--lanes", "spec=|tasks"), /reserved name/);
    assert.throws(() => check(root, "--lanes", "spec=tasks"), /reserved name/);
  });

  test("a claim is pending only while it is its lane's latest verdict; a held claim ends with the wave that approved", () => {
    stampSpec();
    const lanes = `spec=b@${FPS.b}`;
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("1-spec/spec-review-b-1.md", "rejected", SPEC, [`lane=${FPS.b}`]);
    let output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*held \(a lane rejected/);
    assert.match(output, /frontier adjudicate 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    review("1-spec/spec-review-b-2.md", "approved", SPEC, [`lane=${FPS.b}`]);
    output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*superseded \(its lane reviewed again\)/);
    assert.doesNotMatch(output, /PENDING|held|wave open/);
    assert.match(output, /frontier complete/);
  });

  test("invalid lane declarations are rejected before any state is computed", () => {
    assert.throws(() => check(root, "--lanes", "sepc=security"), /unknown artifact/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<missing`), /undeclared lane/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<b,b@${FPS.b}<a`), /cycle/);
    assert.throws(() => check(root, "--lanes", `build-plan=|a@${FPS.a}`), /spec and design doc only/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a};spec=b@${FPS.b}`), /duplicate artifact declaration/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a},a@${FPS.a}`), /duplicate lane declaration/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a}|a@${FPS.a}`), /duplicate lane declaration/);
    for (const declaration of ["spec=a@abc@def", "spec=|a<b<c", "spec=a=b", "spec=a|b|c"]) {
      assert.throws(() => check(root, "--lanes", declaration), /invalid (?:lane|artifact) declaration/);
    }
    assert.throws(() => check(root, "--lanes", "spec=a<b"), /review lane .* cannot declare after/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<b++c,b@${FPS.b},c@${FPS.c}`), /invalid after dependency/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<`), /empty after dependency list/);
    assert.throws(() => check(root, "--lanes", "spec=security"), /requires a fingerprint/);
    assert.throws(() => check(root, "--lanes", `spec=security@${FPS.security}|a@${FPS.a},a-review-security@${FPS.b}`), /same auxiliary branch/);
    assert.throws(() => check(root, "--lanes", `spec=security@${FPS.security}|review-security@${FPS.a}`), /same auxiliary branch/);
    approveChain(2);
    writeTasks();
    report("T1", 1, "completed");
    stampPlan();
    assert.throws(() => check(root, "--lanes", `build-plan=focus@${FPS.a}[materials=3-build/tasks/T1-report-1.md]`), /materials .* outside the 3-build\/build-plan\.md package/);
  });

  test("an unfinished report and cyclic plan are flagged; an invalid attempt is rejected before publication", () => {
    approveChain(3);
    write(root, "3-build/tasks/T1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier INVALID REPORT 3-build\/tasks\/T1-report-1\.md: no Outcome line/);
    rmSync(join(root, P("3-build/tasks/T1-report-1.md")));
    assert.throws(() => report("T1", 2, "completed"), /INVALID REPORT .*expected attempt 1/);
    rmSync(join(root, P("3-build/tasks/T1-report-2.md")));
    write(root, "3-build/tasks/T1.md", "# T1\n\n- **Depends on:** T2\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    approvePlan(2);
    assert.match(check(root), /frontier invalid plan: 3-build\/tasks\/T1\.md depends on a cycle/);
  });

  test("attempt numbering counts landed reports, not draft filenames", () => {
    write(root, "3-build/tasks/T1.md", "# T1\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    for (const attempt of [1, 2]) write(root, `3-build/tasks/T1-report-${attempt}.md`, `# Report ${attempt}\n\nOutcome: blocked\n`);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    rp(root, "stamp", P("3-build/tasks/T1-report-2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/T1-report-1.md")).data.get("attempt"), "1");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/T1-report-2.md")).data.get("attempt"), "2");
  });

  test("a commit outside the pipelines folder that no task report claims is the frontier", () => {
    buildDone();
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    writeFileSync(join(root, "src.js"), "console.log(1);\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "hand-made change");
    const output = check(root, "--target-phase", "3");
    assert.match(output, /commits\s+unclaimed by any task report/);
    assert.match(output, /frontier unclaimed commits/);
    const sha = git(root, "rev-parse", "--short", "HEAD").trim();
    write(root, "3-build/tasks/T2-report-2.md", `# Task report\n\nOutcome: completed\n\n## Commits\n\n- ${sha} — hand-made change\n`);
    rp(root, "stamp", P("3-build/tasks/T2-report-2.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "3"), /unclaimed/);
  });

  test("a pipeline's own commits follow its base: the starts-from branch when the intent declares one, else --base; an unresolvable base is an error", () => {
    buildDone();
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    writeFileSync(join(root, "lib.js"), "1\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "work of demo");
    assert.match(check(root, "--target-phase", "3"), /frontier unclaimed commits/);
    // A stacked pipeline starts from demo's tip: demo's commits are not its own.
    const S = ".pipelines/stacked";
    git(root, "checkout", "--quiet", "-b", "stacked");
    mkdirSync(join(root, S, "0-intent"), { recursive: true });
    writeFileSync(join(root, S, "0-intent/intent.md"), "Origin: issue 8\nOrigin: starts-from demo\n\n# Intent\n\n## Goal\n\nStacked.\n");
    rp(root, "stamp", `${S}/0-intent/intent.md`, "--mirror");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "stacked intent");
    assert.doesNotMatch(rp(root, "check", S, "--target-phase", "1"), /unclaimed/);
    writeFileSync(join(root, "more.js"), "2\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "work of stacked");
    const sha = git(root, "rev-parse", "--short=7", "HEAD").trim();
    const own = new RegExp(`unclaimed by any task report: ${sha}\\n`);
    assert.match(rp(root, "check", S, "--target-phase", "1"), own);
    assert.match(rp(root, "check", S, "--base", "main", "--target-phase", "1"), own);
    assert.match(rp(root, "check", S, "--base", "main", "--ref", "stacked", "--target-phase", "1"), own);
    // Without starts-from, --base is required and must resolve; a starts-from branch must too.
    assert.throws(() => rp(root, "check", PIPELINE, "--target-phase", "3"), /--base <ref> is required/);
    assert.throws(() => rp(root, "check", PIPELINE, "--base", "nope", "--target-phase", "3"), /--base does not resolve: nope/);
    git(root, "branch", "-D", "demo");
    assert.throws(() => rp(root, "check", S, "--base", "main", "--target-phase", "1"), /the starts-from branch does not resolve: demo/);
  });

  test("a fixed line is mirrored whole or not at all: prose after Depends on is INVALID, never mined", () => {
    approveChain(3);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1, T3 (T1's fence work is shipped; T3 …)\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: expected none or task ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1, T1\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: duplicate ids/);
    assert.match(check(root, "--target-phase", "3"), /INVALID LINE 3-build\/tasks\/T2.md: Depends on: duplicate ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n- **Depends on:** later\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: expected none or task ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "3"), /INVALID LINE/);
  });

  test("every fixed line is validated against its grammar", () => {
    const cases = [
      ["Verdict: approved with caveats", /Verdict: expected approved \| rejected \| unsatisfiable/],
      ["Outcome: done", /Outcome: expected completed \| failed \| blocked/],
      ["Target: 1-spec\/spec.md##R1", /Target: expected <path>\[#<id>\]/],
      ["Prior finding: 1-spec\/spec-review-1.md#Issue-1 resolved", /Prior finding: expected <review>#<issue>, resolution failed/],
      ["Origin: owner request", /Origin: expected issue <reference>, a source declaration, or a path/],
      ["Origin: PROJECT-42", /Origin: expected issue <reference>, a source declaration, or a path/],
      ["Brief:", /Brief: expected text/],
    ];
    for (const [line, error] of cases) {
      write(root, "1-spec/bad.md", `# Bad\n\n${line}\n`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), error);
      assert.match(check(root, "--target-phase", "1"), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
    rmSync(join(root, P("1-spec/bad.md")));
    write(root, "1-spec/spec-review-1.md", "# Good\n\nVerdict: unsatisfiable\nOutcome: failed\nTarget: 1-spec/spec.md#R1\nPrior finding: 1-spec/spec-review-1.md#Issue-1, resolution failed\nOrigin: decision-1\nOrigin: 0-intent/correction-1.md\nBrief: focused\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "1"), /INVALID LINE/);

    write(root, "0-intent/intent.md", "Origin: issue PROJECT-42 canonical reference\n\n# Intent\n\n## Goal\n\nOriginal.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "0-intent/intent.md")).data.get("origin"), "issue PROJECT-42 canonical reference");
  });

  test("fixed lines stay on one line and singleton declarations occur once", () => {
    for (const body of [
      "Brief:\nOrigin: decision-1\n",
      "Target:\n1-spec/spec.md#R1\n",
      "Depends on:\nT1\n",
      "Verdict: approved\nVerdict: rejected\n",
      "Brief: one\nBrief: two\n",
      "Target: 1-spec/spec.md#R1\nTarget: 1-spec/spec.md#R1\n",
      "Outcome: completed\nOutcome: failed\n",
    ]) {
      write(root, "1-spec/bad.md", `# Bad\n\n${body}`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), /INVALID/);
      assert.match(check(root, "--target-phase", "1"), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
  });

  test("a --- block inside a body is ordinary body text", () => {
    approveChain(1);
    const text = "# Spec Research\n\n---\nkey: value\n---\n\nBody.\n";
    write(root, "1-spec/spec-research.md", text);
    const out = check(root, "--target-phase", "1");
    assert.doesNotMatch(out, /INVALID FRONTMATTER 1-spec\/spec-research.md|differs from the body/);
    assert.deepEqual(parseFrontmatter(text), { data: null, body: text });
  });

  test("frontmatter delimiters and fixed lines inside fenced code are ordinary body text", () => {
    approveChain(1);
    write(root, "1-spec/example.md", "# Example\n\n```yaml\n---\nkey: value\n---\n```\n");
    write(root, "1-spec/long-fence.md", "# Example\n\n````markdown\n```\n---\nkey: value\n---\nOutcome: success\n```\n````\n");
    write(root, "1-spec/tilde-fence.md", "# Example\n\n~~~yaml\n---\nOutcome: success\n---\n~~~\n");
    const output = check(root, "--target-phase", "1");
    assert.doesNotMatch(output, /INVALID FRONTMATTER 1-spec\/(?:example|long-fence|tilde-fence)\.md/);
    assert.doesNotMatch(output, /INVALID LINE 1-spec\/(?:long-fence|tilde-fence)\.md/);
  });

  test("identity equals git's blob hash of the body, computed without git", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    for (const body of ["", "x", "# Spec\n", "ñ — unicode\n", "a\r\nb"]) assert.equal(identity(`---\npins:\n  - a@b\n---\n${body}`), gitHash(body));
  });

  test("a report's Commits section is mirrored whole, whatever the line format, and names only commits that exist", () => {
    approveChain(3);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    const shas = [];
    for (const [i, subject] of ["first", "second", "third"].entries()) {
      writeFileSync(join(root, `src${i}.js`), `${i}\n`);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", subject);
      shas.push(git(root, "rev-parse", "--short=10", "HEAD").trim());
    }
    write(root, "3-build/tasks/T1-report-1.md", `# Task report\n\nOutcome: completed\n\n## Commits\n\n- ${shas[0]} — first\n\`${shas[1]}\` second, in backticks\n${shas[2]} third, plain\n\n## Checks\n\n- 1234567 is not a commit: prose stays prose\n`);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    // Short hashes in the body are stored canonical: the full hash.
    const full = shas.map((s) => git(root, "rev-parse", s).trim());
    assert.match(read(root, "3-build/tasks/T1-report-1.md"), new RegExp(`commits:\\n  - ${full[0]}\\n  - ${full[1]}\\n  - ${full[2]}\\n`));
    assert.doesNotMatch(check(root, "--target-phase", "3"), /unclaimed/);
    write(root, "3-build/tasks/T2-report-1.md", "# Task report\n\nOutcome: completed\n\n## Commits\n\n- 0badc0ffee1 — never made\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror"), /names a commit that does not exist or is ambiguous: 0badc0ffee1/);
  });

  test("frontmatter lists are read in block and inline form; an empty inline list is empty", () => {
    assert.deepEqual(parseFrontmatter("---\ncommits: [abc1234, def5678]\n---\n").data.get("commits"), ["abc1234", "def5678"]);
    assert.deepEqual(parseFrontmatter("---\ncommits: []\n---\n").data.get("commits"), []);
    assert.deepEqual(parseFrontmatter("---\ncommits:\n  - abc1234\n---\n").data.get("commits"), ["abc1234"]);
    assert.deepEqual(parseFrontmatter("---\norigin: [owner's-note.md]\n---\n").data.get("origin"), ["owner's-note.md"]);
  });

  test("identity is the body's exact bytes as git hashes them: CRLF is never normalized; only delimiter lines tolerate a \\r", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "1-spec/spec.md", "# Spec\r\n");
    assert.equal(identity(read(root, "1-spec/spec.md")), gitHash("# Spec\r\n"));
    assert.notEqual(identity("# Spec\r\n"), identity("# Spec\n"));
    stampSpec();
    const text = read(root, "1-spec/spec.md");
    assert.match(text, /^---\npins:\n[\s\S]*---\n# Spec\r\n$/);
    assert.equal(identity(text), gitHash("# Spec\r\n"));
    // Delimiter lines may carry a \r; the closing one may end the file.
    assert.equal(identity("---\r\nnote: x\r\n---\r\n# Spec\r\n"), gitHash("# Spec\r\n"));
    assert.deepEqual(parseFrontmatter("---\nnote: x\n---"), { data: new Map([["note", "x"]]), body: "" });
    assert.deepEqual(parseFrontmatter("---\n---\nbody\n"), { data: new Map(), body: "body\n" });
  });

  test("the pipeline tree holds no symlinks: stamp refuses them, check reports them without following", () => {
    stampSpec();
    approveSpec();
    const victim = join(root, "victim.md");
    writeFileSync(victim, "# Victim\n");
    execFileSync("ln", ["-sf", victim, join(root, P("1-spec/link.md"))]);
    assert.throws(() => rp(root, "stamp", P("1-spec/link.md"), "--mirror"), /symlinked/);
    // A cyclic folder symlink never aborts the walk.
    execFileSync("ln", ["-s", "..", join(root, P("1-spec/loop"))]);
    const pinned = read(root, "1-spec/spec.md").replace("pins:\n", "pins:\n  - 1-spec/loop@aaaaaaaaaaaa\n");
    write(root, "1-spec/spec.md", pinned);
    let output = check(root, "--target-phase", "1");
    assert.match(output, /symlink\s+1-spec\/link\.md\n/);
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "with symlinks");
    output = check(root, "--ref", "demo", "--target-phase", "1");
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    execFileSync("ln", ["-s", "1-spec", join(root, PIPELINE, "alias")]);
    assert.throws(() => rp(root, "stamp", P("alias/spec.md"), "--mirror"), /symlinked/);
  });

  test("the CLI validates its inputs and fails aloud: no gate is silently disabled, no option silently ignored", () => {
    stampSpec();
    approveSpec();
    for (const bad of ["0", "5", "abc", "1.5", "-1"]) assert.throws(() => check(root, "--target-phase", bad), /--target-phase expects an integer from 1 to 4/);
    assert.throws(() => check(root, "--force"), /option --force is not allowed/);
    assert.throws(() => check(root, "--set", "verdict=garbage"), /check: option --set is not allowed/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--json"), /stamp: option --json is not allowed/);
    assert.throws(() => rp(root, "fingerprint", "security", "extra"), /unexpected positional argument/);
    assert.throws(() => rp(root, "check", PIPELINE, "extra", "--base", "main"), /unexpected positional argument/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin"), /--pin expects a value/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=111111111111", "--set", "lane=222222222222"), /--set may appear only once/);
    const invalid = ".pipelines/bad_name";
    mkdirSync(join(root, invalid, "0-intent"), { recursive: true });
    writeFileSync(join(root, invalid, "0-intent/intent.md"), "# Intent\n");
    assert.throws(() => rp(root, "check", invalid, "--base", "main"), /pipeline folder name must be one segment without \/ or _/);
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
  });

  test("--help defines body identity and mandatory named-lane fingerprints", () => {
    const help = rp(root, "--help");
    assert.match(help, /first 12 hexadecimal characters of\ngit's blob hash of every body byte/);
    assert.match(help, /each named\nlane carries the fingerprint/);
  });

  test("check --json carries the state", () => {
    const state = JSON.parse(check(root, "--json"));
    for (const key of ["pipeline", "challenges", "claims", "lanes", "artifacts", "tasks", "counters", "frontier", "completeThrough", "complete"]) {
      assert.ok(key in state, `missing ${key}`);
    }
  });
});
