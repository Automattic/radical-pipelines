import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { RP, PIPELINE, git, P, write, read, rp, root, standard, configure, check, SPEC, DESIGN, review, commitAll, pairs, registered, registeredVerdict, gitShim, useFixture } from "./fixture.mjs";

describe("rp ref and worktree readers", () => {
  useFixture();

  test("ref reader: large binary inputs and records retain their body identities", () => {
    const input = "0-intent/context\t雪\n.bin", record = "1-spec/spec-research.md";
    write(root, input, Buffer.alloc(1500000, 0xff));
    write(root, record, `# Research\n${"Evidence λ.\n".repeat(140000)}`);
    const inputPin = `${input}@${git(root, "hash-object", P(input)).trim().slice(0, 12)}`;
    registered("1-spec/spec.md", { pins: [...pairs(["0-intent/intent.md"]), inputPin] });
    const judged = [...pairs(SPEC), inputPin];
    registeredVerdict("1-spec/spec-review-1.md", judged);
    configure({ targetPhase: 1 });
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "large inputs");
    configure({ targetPhase: 1 });
    const { ref: workingRef, ...working } = JSON.parse(check(root, "--json"));
    configure({ targetPhase: 1 });
    const { ref: committedRef, ...committed } = JSON.parse(check(root, "--ref", "HEAD", "--json"));
    assert.equal(working.complete, true);
    assert.deepEqual(committed, working);
    assert.equal(committedRef, git(root, "rev-parse", "HEAD").trim());
  });

  test("ref reader: four phases and resolved challenges match the worktree in one batch", (t) => {
    const challenge = "0-intent/proposal-1.md";
    registered(challenge, { target: ["1-spec/spec.md#spec-requirement-1"], origin: "issue 9" }, "# Proposal\ntarget: 1-spec/spec.md#spec-requirement-1\norigin: issue 9\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", challenge]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, challenge]));
    write(root, "2-design-doc/design-doc-research.md", `# Research\n${"Evidence λ.\n".repeat(140000)}`);
    registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const buildInputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "2-design-doc/design-doc-research.md"];
    registered("3-build/build-plan.md", { pins: pairs(buildInputs) });
    const buildTask = "3-build/tasks/build-task-1.md", buildReport = "3-build/tasks/build-task-1-report-1.md";
    registered(buildTask, { "depends-on": [] }, "# Task\ndepends-on: none\n");
    registered(buildReport, { reviewed: pairs([buildTask]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
    const buildPackage = ["3-build/build-plan.md", "3-build/build-plan-research.md", ...buildInputs, buildTask];
    registeredVerdict("3-build/build-plan-review-1.md", pairs(buildPackage));
    registeredVerdict("3-build/build-review-1.md", pairs([...buildPackage, buildReport]));
    const docInputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md", buildTask, buildReport];
    registered("4-document/document-plan.md", { pins: pairs(docInputs) }, "# Document plan\n");
    write(root, "4-document/document-plan-research.md", "# Record\n");
    const docTask = "4-document/tasks/document-task-1.md", docReport = "4-document/tasks/document-task-1-report-1.md";
    registered(docTask, { "depends-on": [] }, "# Task\ndepends-on: none\n");
    registered(docReport, { reviewed: pairs([docTask]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
    const docPackage = ["4-document/document-plan.md", "4-document/document-plan-research.md", ...docInputs, docTask];
    registeredVerdict("4-document/document-plan-review-1.md", pairs(docPackage));
    registeredVerdict("4-document/document-review-1.md", pairs([...docPackage, docReport]));
    commitAll("complete pipeline");
    assert.equal(git(root, "status", "--porcelain"), "");
    const start = performance.now();
    const { ref: workingRef, ...working } = JSON.parse(check(root, "--json"));
    const worktreeMs = performance.now() - start;
    const { log, env } = gitShim();
    const refStart = performance.now();
    const { ref: committedRef, ...committed } = JSON.parse(execFileSync(process.execPath, [RP, "check", PIPELINE, "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8" }));
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
    configure({ targetPhase: 1 });
    assert.equal(JSON.parse(check(root, "--json")).complete, true);
    const env = protocolShim("cat-file", "missing", oid);
    assert.throws(() => execFileSync(process.execPath, [RP, "check", PIPELINE, "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => {
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
      assert.throws(() => execFileSync(process.execPath, [RP, "check", PIPELINE, "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => {
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
      assert.throws(() => execFileSync(process.execPath, ["--import", preload, RP, "check", PIPELINE, "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), readFailure(`worktree:${P(file)}`, /ENOENT|no longer a regular file|EACCES/));
    });

  for (const mode of ["worktree", "ref"])
    test(`reader contract: ${mode} permits a review that has not been written`, () => {
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      configure({ targetPhase: 1 });
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "artifact ready for its first review");
      configure({ targetPhase: 1 });
      const state = JSON.parse(check(root, "--json", ...(mode === "ref" ? ["--ref", "HEAD"] : [])));
      assert.deepEqual(state.contradictions, []);
      assert.equal(state.artifacts[0].state, "fresh");
      assert.equal(state.artifacts[0].lanes[0].verdict, "none");
      assert.equal(state.frontier, "review wave 1-spec/spec.md");
    });

  function protocolShim(command, mutation, targetOID = null) {
    const script = join(root, ".git", "protocol.mjs");
    writeFileSync(script, `import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2), mutation = ${JSON.stringify(mutation)}, target = ${JSON.stringify(targetOID)};
const input = args[0] === 'cat-file' ? readFileSync(0) : undefined;
let output;
if (args[0] === 'cat-file' && target) {
  const requests = input.toString('ascii').trim().split('\\n').filter(Boolean);
  output = Buffer.concat(requests.map((oid) => oid === target && mutation === 'missing'
    ? Buffer.from(oid + ' missing\\n')
    : execFileSync(process.env.RP_REAL_GIT, args, { input: Buffer.from(oid + '\\n') })));
} else {
  output = execFileSync(process.env.RP_REAL_GIT, args, { input });
}
if (args[0] === 'cat-file' && !target) {
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
        const run = () => execFileSync(process.execPath, [RP, "check", PIPELINE, "--ref", "HEAD", "--json"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        if (mutation === "valid") {
          const { ref: fromCommit, ...committed } = JSON.parse(run());
          const { ref: fromWorktree, ...working } = JSON.parse(check(root, "--json"));
          assert.deepEqual(committed, working);
        } else {
          const reason = command === "ls-tree" ? /invalid ls-tree/ : mutation === "terminator" ? /invalid batch object terminator/ : mutation === "trailing" ? /unexpected trailing batch output/ : /invalid batch response/;
          assert.throws(run, readFailure(`${ref}:${PIPELINE}/`, reason));
        }
      });

  // Pipeline state is the files at the pipeline folder's root, directly in a phase folder, in its tasks/,
  // and in each lanes/<lane>/. Every other location is ignored by both readers: never read, never stamped.
  const STATE_LOCATIONS = ["notes.md", "0-intent/notes.md", "1-spec/notes.md", "3-build/tasks/notes.md", "1-spec/lanes/a/notes.md"];
  const IGNORED_LOCATIONS = [
    "notes/notes.md", "notes/tasks/notes.md", "0-intent/evidence/notes.md", "1-spec/evidence/notes.md", "1-spec/a/spec.md",
    "1-spec/lanes/notes.md", "1-spec/spec-review-1/notes.md", "3-build/tasks/build-task-1-report-1/notes.md", "1-spec/lanes/a/spec/notes.md",
  ];
  const CONTENTS = { valid: "# Notes\n\nverdict: approved\n", malformed: "---\nnot JSON\n---\n# Notes\n" };
  function recordedSpecWithLane() {
    configure({ targetPhase: 1, lanes: [standard.a] });
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    commitAll("recorded state");
  }
  const stateAt = (reader) => {
    const { ref, ...state } = JSON.parse(reader === "ref" ? check(root, "--json", "--ref", "HEAD") : check(root, "--json"));
    return state;
  };
  for (const reader of ["worktree", "ref"])
    for (const path of [...STATE_LOCATIONS, ...IGNORED_LOCATIONS])
      test(`pipeline state: ${path} read from the ${reader}`, () => {
        recordedSpecWithLane();
        const before = stateAt(reader);
        for (const [kind, contents] of Object.entries(CONTENTS)) {
          write(root, path, contents);
          commitAll(`${kind} ${path}`);
          const after = stateAt(reader);
          if (STATE_LOCATIONS.includes(path)) assert.match(after.frontier, new RegExp(`^(stamp|INVALID [A-Z]+) ${path.replaceAll(".", "\\.")}$`), kind);
          else {
            assert.deepEqual(after, before, kind);
            assert.throws(() => rp(root, "stamp", P(path), "--mirror"), /not pipeline state/);
          }
        }
      });

  test("pipeline state: an unreadable ignored folder or file is never read; unreadable state stops the check", () => {
    recordedSpecWithLane();
    const before = stateAt("worktree");
    const folders = ["notes", "1-spec/evidence", "1-spec/lanes/a/spec"].map((folder) => join(root, P(folder)));
    for (const folder of folders) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, "notes.md"), CONTENTS.malformed);
      chmodSync(folder, 0);
    }
    const file = join(root, P("1-spec/lanes/notes.md"));
    writeFileSync(file, CONTENTS.malformed);
    chmodSync(file, 0);
    folders.push(file);
    try {
      assert.deepEqual(stateAt("worktree"), before);
      chmodSync(folders[2], 0o755);
      chmodSync(join(root, P("1-spec/lanes/a")), 0);
      assert.throws(() => check(root, "--json"), /cannot read worktree:.*EACCES/);
    } finally {
      for (const folder of [join(root, P("1-spec/lanes/a")), ...folders]) chmodSync(folder, 0o755);
    }
  });

  for (const [ignored, state] of [["1-spec/support", "1-spec/lanes/a"], ["1-spec/lanes/notes.md", "1-spec/lanes/a/notes.md"]])
    test(`pipeline state: the unreadable ignored ${ignored} is never read from a ref; the unreadable ${state} stops the check`, () => {
      recordedSpecWithLane();
      write(root, "1-spec/support/notes.md", "# Support only\n");
      write(root, "1-spec/lanes/notes.md", "# Directly under lanes only\n");
      write(root, "1-spec/lanes/a/notes.md", "# Lane only\n");
      commitAll("ignored and state entries");
      const before = stateAt("ref");
      const looseObject = (path) => {
        const oid = git(root, "rev-parse", `HEAD:${P(path)}`).trim();
        return join(root, ".git", "objects", oid.slice(0, 2), oid.slice(2));
      };
      rmSync(looseObject(ignored));
      assert.deepEqual(stateAt("ref"), before);
      rmSync(looseObject(state));
      assert.throws(() => check(root, "--json", "--ref", "HEAD"), /cannot read [0-9a-f]+:.*1-spec\/lanes/);
    });

  // A path is state by its position, whatever entry occupies it: a directory there holds state, a file
  // holds none, and a symlink is a defect — in both readers.
  for (const reader of ["worktree", "ref"])
    for (const [path, child] of [["1-spec", "notes.md"], ["3-build/tasks", "notes.md"], ["1-spec/lanes", "a/notes.md"], ["1-spec/lanes/a", "notes.md"]])
      test(`pipeline state: the entry at the state folder ${path} read from the ${reader}`, () => {
        recordedSpecWithLane();
        const at = join(root, P(path));
        write(root, `${path}/${child}`, CONTENTS.valid);
        commitAll("directory");
        assert.match(stateAt(reader).frontier, new RegExp(`^(stamp|INVALID [A-Z]+) ${path}/${child}$`.replaceAll(".", "\\.")));
        rmSync(at, { recursive: true });
        commitAll("absent");
        const absent = stateAt(reader);
        writeFileSync(at, "not a folder\n");
        commitAll("file");
        assert.deepEqual(stateAt(reader), absent);
        rmSync(at);
        mkdirSync(join(root, "elsewhere"), { recursive: true });
        symlinkSync(join(root, "elsewhere"), at);
        commitAll("symlink");
        const linked = stateAt(reader);
        assert.equal(linked.frontier, `symlink ${path}`);
        assert.deepEqual(linked.contradictions, [{ path, symlink: true }]);
      });
});
