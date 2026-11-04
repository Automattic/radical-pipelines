import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { identity, splitFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import {
  DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, SPEC, TO_SPEC, UPSTREAM,
  abs, check, commitAll, configure, git, land, lane, pipeline, read, remove, revise, root, rp, run, stamp, stampAt, thread, useRepo, write, writeFile,
} from "./fixture.mjs";

const id = (rel) => identity(readFileSync(abs(P(rel))));
const pin = (rel) => `${rel}@${id(rel)}`;
const inputsOf = (rel) => JSON.parse(splitFrontmatter(readFileSync(abs(P(rel)))).json).inputs;
const frontmatterOf = (rel) => JSON.parse(splitFrontmatter(readFileSync(abs(P(rel)))).json);

describe("identity", () => {
  useRepo();

  it("is the first 12 hex of the git blob hash of the body below the frontmatter", () => {
    const body = "# Spec\r\n\nNo trailing newline";
    write(SPEC, `---\n{"inputs": []}\n---\n${body}`);
    const blob = execFileSync("git", ["hash-object", "--stdin", "--no-filters"], { cwd: root, input: body, encoding: "utf8" });
    assert.equal(id(SPEC), blob.slice(0, 12));
  });

  it("is the whole file's blob hash when there is no frontmatter", () => {
    write(INTENT, "# Intent\n");
    assert.equal(id(INTENT), git(root, "hash-object", abs(P(INTENT))).slice(0, 12));
  });

  it("is unchanged by stamping", () => {
    pipeline(0);
    write(SPEC, "# Spec\r\nBody without final newline");
    const before = id(SPEC);
    land(SPEC);
    assert.equal(id(SPEC), before);
    assert.equal(splitFrontmatter(readFileSync(abs(P(SPEC)))).body.toString("latin1"), "# Spec\r\nBody without final newline");
  });
});

describe("stamp derives the required inputs", () => {
  useRepo();

  // [subject, its upstream artifacts, its root, whether it pins the later inputs targeting its root]
  const subjects = [
    [SPEC, UPSTREAM[SPEC], SPEC, true],
    [DESIGN, UPSTREAM[DESIGN], DESIGN, true],
    [NOTES, UPSTREAM[NOTES], NOTES, true],
    ["1-spec/lanes/a/spec.md", UPSTREAM[SPEC], SPEC, false],
    ["2-design-doc/lanes/a/design-doc.md", UPSTREAM[DESIGN], DESIGN, false],
  ];
  for (const [subject, upstream, root, pinsLater] of subjects)
    it(`of ${subject}: its upstream artifacts${pinsLater ? " and the later inputs targeting it" : ", not the later inputs targeting " + root}`, () => {
      pipeline(3, { lanes: [lane("spec-producer", "a"), lane("design-doc-producer", "a")] });
      write("0-intent/constraint-1.md", `target: ${root}#item-1\n`);
      write("0-intent/proposal-1.md", `target: ${[SPEC, DESIGN, NOTES].find((path) => path !== root)}\n`);
      write(subject, "# Body\n");
      land(subject);
      assert.deepEqual(inputsOf(subject), [...upstream, ...(pinsLater ? ["0-intent/constraint-1.md"] : [])].sort().map(pin));
    });

  // How the input changes after the turn's commit: [what, change].
  const later = [
    ["uncommitted", () => write(INTENT, `${read(INTENT)}Uncommitted.\n`)],
    ["committed after the turn's commit", () => { write(INTENT, `${read(INTENT)}Committed later.\n`); commitAll("intent later"); }],
  ];
  for (const [what, change] of later)
    it(`pins the identities at the --at commit, not an input changed ${what}`, () => {
      pipeline(0);
      write(SPEC, "# Spec\n");
      const turn = commitAll("turn");
      const atTurn = id(INTENT);
      change();
      stampAt(turn, SPEC);
      assert.deepEqual(inputsOf(SPEC), [`${INTENT}@${atTurn}`]);
      assert.notEqual(id(INTENT), atTurn);
      assert.deepEqual(check().phases[0].stale, [INTENT]);
    });

  it("makes a response that leaves the artifact unchanged fresh", () => {
    pipeline(3);
    write(INTENT, `${read(INTENT)}Clarified.\n`);
    const turn = commitAll("intent changes");
    assert.deepEqual(check().phases[0].stale, [INTENT]);
    stampAt(turn, SPEC);
    assert.equal(check().phases[0].state, "fresh");
    assert.deepEqual(check().frontier, [{ action: "review", target: "default", threads: [] }]);
  });

  it("pins the inputs at a turn's commit even when the artifact is not committed yet", () => {
    pipeline(0);
    const turn = git(root, "rev-parse", "HEAD").trim();
    write(SPEC, "# Spec\n");
    stampAt(turn, SPEC);
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT)]);
  });

  it("pins the inputs a revision of the body read", () => {
    pipeline(1);
    write(INTENT, `${read(INTENT)}Changed.\n`);
    revise(SPEC);
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT)]);
    assert.equal(check().phases[0].state, "fresh");
  });

  it("drops a pin that is no longer required", () => {
    pipeline(1);
    write("0-intent/failure-1.md", `target: ${SPEC}\n`);
    revise(SPEC);
    assert.equal(inputsOf(SPEC).length, 2);
    write("0-intent/failure-1.md", `target: ${DESIGN}\n`);
    revise(SPEC, "Again.");
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT)]);
  });

  it("changes nothing when stamped twice", () => {
    pipeline(3);
    for (const rel of [SPEC, DESIGN, NOTES]) stamp(rel);
    assert.equal(git(root, "status", "--porcelain"), "");
  });

  it("records the candidates --pin names on a consolidated root, and keeps them on a later stamp", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a"), lane("spec-producer", "b")] });
    for (const id of ["a", "b"]) { write(`1-spec/lanes/${id}/spec.md`, `# ${id}\n`); land(`1-spec/lanes/${id}/spec.md`); }
    write(SPEC, "# Spec\n");
    land(SPEC, "1-spec/lanes/a/spec.md", "1-spec/lanes/b/spec.md");
    const recorded = [pin(INTENT), pin("1-spec/lanes/a/spec.md"), pin("1-spec/lanes/b/spec.md")];
    assert.deepEqual(inputsOf(SPEC), recorded);
    commitAll("stamp");
    write("1-spec/lanes/a/spec.md", "# changed\n");
    remove("1-spec/lanes/b/spec.md");
    write(INTENT, `${read(INTENT)}More.\n`);
    revise(SPEC);
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT), ...recorded.slice(1)]);
    stamp(SPEC, "1-spec/lanes/a/spec.md");
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT), pin("1-spec/lanes/a/spec.md")]);
  });

  // How a --pin names a candidate: [what, the argument for a pipeline-relative path].
  const pinForms = [["relative to the pipeline folder", (rel) => rel], ["absolute", (rel) => abs(P(rel))]];
  for (const [what, form] of pinForms)
    it(`accepts a --pin path ${what}, whatever the process directory`, () => {
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      write("1-spec/lanes/a/spec.md", "# a\n");
      land("1-spec/lanes/a/spec.md");
      write(SPEC, "# Spec\n");
      rp("stamp", abs(P(SPEC)), "--at", commitAll("consolidate"), "--pin", form("1-spec/lanes/a/spec.md"));
      assert.deepEqual(inputsOf(SPEC), [pin(INTENT), pin("1-spec/lanes/a/spec.md")]);
    });

  it("reports a relative --pin that is no file by the path it tried", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    write(SPEC, "# Spec\n");
    const out = run("stamp", abs(P(SPEC)), "--at", commitAll("consolidate"), "--pin", "lanes/a/spec.md");
    assert.equal(out.status, 1);
    assert.equal(out.stderr, `rp: stamp: cannot read --pin ${join(realpathSync(root), PIPELINE, "lanes/a/spec.md")}: not a file\n`);
  });

  it("reports a --pin file missing at the turn's commit as missing there", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    write(SPEC, "# Spec\n");
    const turn = commitAll("consolidate");
    write("1-spec/lanes/a/spec.md", "# a\n");
    const out = run("stamp", abs(P(SPEC)), "--at", turn, "--pin", "1-spec/lanes/a/spec.md");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot pin .*1-spec\/lanes\/a\/spec.md: missing/);
  });
});

describe("stamp of an approval", () => {
  useRepo();

  it("pins the intent and every later input at the turn's commit, and records that commit as reviewed", () => {
    pipeline(3);
    write("0-intent/constraint-1.md", `target: ${NOTES}\n`);
    write("0-intent/proposal-1.md", `target: ${DESIGN}\n`);
    writeFile("src/app.js", "export const a = 2;\n");
    const turn = commitAll("change");
    const pins = [pin("0-intent/constraint-1.md"), pin(INTENT), pin("0-intent/proposal-1.md")];
    const path = thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", turn.slice(0, 9)]] });
    write("0-intent/proposal-1.md", `target: ${DESIGN}\nChanged after the turn.\n`);
    commitAll("later");
    stampAt(turn.slice(0, 9), path);
    assert.deepEqual(frontmatterOf(path), { inputs: pins, reviewed: turn });
    assert.match(read(path), /^---\n[\s\S]*\n---\nstatus: closed: approved\n/);
    const before = read(path);
    stampAt(turn, path);
    assert.equal(read(path), before);
  });
});

describe("stamp validates only what it reads at the turn's commit", () => {
  useRepo();

  // [what, how the turn's commit is broken and the working tree repaired, the file stamped, the reason it stops or null]
  const cases = [
    ["a malformed thread, repaired since", () => {
      write("threads/1-x.md", "status: open\n");
      const turn = commitAll("malformed thread");
      remove("threads/1-x.md");
      thread(TO_SPEC);
      commitAll("repaired");
      return turn;
    }, DESIGN, null],
    ["a malformed artifact that is not an input", () => { write(NOTES, "---\n{\n---\n"); return commitAll("bad notes"); }, SPEC, null],
    ["a candidate of an unconfigured lane in another phase", () => { write("2-design-doc/lanes/x/design-doc.md", "# x\n"); return commitAll("stray"); }, SPEC, null],
    ["a folder where an unrelated thread belongs", () => { write("threads/1-x.md/y", "x\n"); return commitAll("folder"); }, SPEC, null],
    ["a malformed later input targeting the artifact", () => { write("0-intent/constraint-1.md", `---\n{}\n---\ntarget: ${DESIGN}\n`); return commitAll("bad input"); }, DESIGN, /constraint-1.md: carries no frontmatter/],
    ["a later input whose target: line is malformed", () => { write("0-intent/proposal-1.md", "target: elsewhere.md\n"); return commitAll("bad target"); }, DESIGN, /proposal-1.md: target must name/],
    ["a malformed required input", () => { write(SPEC, "---\n{\n---\n# Spec\n"); return commitAll("bad spec"); }, DESIGN, /1-spec\/spec.md: frontmatter is not valid JSON/],
    ["a folder where a required input belongs", () => { remove(SPEC); write(`${SPEC}/x`, "x\n"); return commitAll("spec folder"); }, DESIGN, /1-spec\/spec.md: a folder where a pipeline file belongs/],
    ["a run-config.md of an earlier format", () => { write("run-config.md", '---\n{"target-phase": 4, "base": "main"}\n---\n'); return commitAll("old config"); }, DESIGN, /run-config.md: pipeline of an earlier format; it is not continued/],
    ["a run-config.md of a newer format", () => { write("run-config.md", '---\n{"format": 7}\n---\n'); return commitAll("new config"); }, DESIGN, /run-config.md: pipeline of a newer format 7; update the skill/],
    ["a malformed run-config.md", () => { write("run-config.md", '---\n{"format": 6}\n---\n'); return commitAll("bad config"); }, DESIGN, /run-config.md: target-phase/],
  ];
  for (const [what, setup, file, reason] of cases)
    it(`${reason ? "stops on" : "ignores"} ${what}`, () => {
      pipeline(3);
      const turn = setup();
      const out = run("stamp", abs(P(file)), "--at", turn);
      assert.equal(out.status, reason ? 1 : 0, out.stderr);
      if (reason) assert.match(out.stderr, reason);
    });

  it("stops on a malformed candidate --pin names", () => {
    pipeline(1, { lanes: [lane("design-doc-producer", "a")] });
    write("2-design-doc/lanes/a/design-doc.md", "---\n[]\n---\n# a\n");
    write(DESIGN, "# Design\n");
    const out = run("stamp", abs(P(DESIGN)), "--at", commitAll("consolidate"), "--pin", abs(P("2-design-doc/lanes/a/design-doc.md")));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /lanes\/a\/design-doc.md: frontmatter must be a JSON object/);
  });

  it("reads only the stamped file from the working tree", () => {
    pipeline(3);
    write("threads", "a file where a folder belongs\n");
    stamp(SPEC);
    assert.equal(run("check", abs(P(""))).status, 1);
  });
});

describe("stamp refuses", () => {
  useRepo();

  const refusals = [
    ["the intent", () => [P(INTENT)], /not an artifact or thread/],
    ["a later input", () => [P("0-intent/constraint-1.md")], /not an artifact or thread/],
    ["run-config.md", () => [P("run-config.md")], /not an artifact or thread/],
    ["a file outside a pipeline folder", () => ["src/app.js"], /not a pipeline file/],
    ["a thread that is not a review thread", () => [P("threads/1-design-doc-producer-spec-producer-spec.md")], /only a review thread closed: approved is stamped/],
    ["an open review thread", () => [P("threads/2-reviewer-default-implementer-implementation.md")], /only a review thread closed: approved is stamped/],
    ["--pin on notes.md", () => [P(NOTES), "--pin", P("1-spec/lanes/a/spec.md")], /--pin applies to a spec or design doc/],
    ["--pin on a candidate", () => [P("1-spec/lanes/a/spec.md"), "--pin", P("1-spec/lanes/a/spec.md")], /--pin applies to a spec or design doc/],
    ["--pin naming something other than a candidate", () => [P(SPEC), "--pin", P(INTENT)], /--pin must name a candidate/],
    ["--pin naming another phase's candidate", () => [P(DESIGN), "--pin", P("1-spec/lanes/a/spec.md")], /--pin must name a candidate/],
    ["--pin naming a path that is no file", () => [P(SPEC), "--pin", P("1-spec/lanes/b/spec.md")], /cannot read --pin .*1-spec\/lanes\/b\/spec.md: not a file/],
    ["--pin naming a folder", () => [P(SPEC), "--pin", P("1-spec/lanes/a")], /cannot read --pin .*1-spec\/lanes\/a: not a file/],
    ["an option that no longer exists", () => [P(SPEC), "--reviewed"], /unknown option: --reviewed/],
  ];
  for (const [name, args, message] of refusals)
    it(name, () => {
      pipeline(3, { lanes: [lane("spec-producer", "a"), lane("spec-producer", "b")] });
      write("0-intent/constraint-1.md", "target: 1-spec/spec.md\n");
      write("1-spec/lanes/a/spec.md", "# a\n");
      thread({ status: "closed: approved", ...TO_SPEC });
      thread({ n: 2, ...REVIEW() });
      commitAll("setup");
      const before = read(SPEC);
      const out = run("stamp", ...args().map((arg) => arg.startsWith("--") ? arg : abs(arg)), "--at", "HEAD");
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(read(SPEC), before);
    });

  it("a required input that is missing", () => {
    pipeline(0);
    write(DESIGN, "# Design\n");
    commitAll("design");
    const out = run("stamp", abs(P(DESIGN)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot pin .*1-spec\/spec.md: missing/);
  });

  it("while another pipeline file is INVALID", () => {
    pipeline(1);
    write("0-intent/constraint-1.md", "no target\n");
    write(SPEC, `${read(SPEC)}Revised.\n`);
    commitAll("revise");
    const out = run("stamp", abs(P(SPEC)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /constraint-1.md: later input has no target/);
  });

  it("a file whose own frontmatter is malformed, leaving it untouched", () => {
    pipeline(0);
    write(SPEC, "---\nnot json\n---\n# Spec\n");
    commitAll("malformed");
    const out = run("stamp", abs(P(SPEC)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not valid JSON/);
    assert.equal(read(SPEC), "---\nnot json\n---\n# Spec\n");
  });

  for (const [what, args, message] of [
    ["--at missing", [], /--at <commit> names the turn's commit and is required/],
    ["--at that names no commit", ["--at", "nope"], /--at does not resolve to a commit: nope/],
    ["--at a commit without the pipeline", ["--at", "main"], /no such folder/],
  ])
    it(what, () => {
      pipeline(1);
      const before = read(SPEC);
      const out = run("stamp", abs(P(SPEC)), ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(read(SPEC), before);
    });

  it("a folder that has no parent pipelines folder root", () => {
    for (const [rel, contents] of [["demo/run-config.md", '---\n{"format": 6, "target-phase": 1, "base": "main"}\n---\n'], ["demo/0-intent/intent.md", "# I\n"], ["demo/1-spec/spec.md", "# S\n"]]) writeFile(rel, contents);
    const out = run("stamp", abs("demo/1-spec/spec.md"), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /a pipeline folder is <pipelines folder root>\/<pipeline slug>: demo/);
    configure();
  });
});
