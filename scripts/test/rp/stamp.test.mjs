import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { identity, splitFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import {
  DESIGN, INTENT, NOTES, P, REVIEW, SPEC, TO_SPEC, UPSTREAM,
  abs, check, commitAll, configure, git, land, lane, pipeline, read, remove, revise, root, run, stamp, thread, useRepo, write, writeFile,
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

  const subjects = [
    [SPEC, UPSTREAM[SPEC]],
    [DESIGN, UPSTREAM[DESIGN]],
    [NOTES, UPSTREAM[NOTES]],
    ["1-spec/lanes/a/spec.md", UPSTREAM[SPEC], SPEC],
    ["2-design-doc/lanes/a/design-doc.md", UPSTREAM[DESIGN], DESIGN],
  ];
  for (const [subject, upstream, root = subject] of subjects)
    it(`of ${subject}: its upstream artifacts and the later inputs targeting ${root}`, () => {
      pipeline(3, { lanes: [lane("spec-producer", "a"), lane("design-doc-producer", "a")] });
      write("0-intent/constraint-1.md", `target: ${root}#item-1\n`);
      write("0-intent/proposal-1.md", `target: ${[SPEC, DESIGN, NOTES].find((path) => path !== root)}\n`);
      write(subject, "# Body\n");
      land(subject);
      assert.deepEqual(inputsOf(subject), [...upstream, "0-intent/constraint-1.md"].sort().map(pin));
    });

  // How the input changes after the artifact's commit: [what, change].
  const later = [
    ["uncommitted", () => write(INTENT, `${read(INTENT)}Uncommitted.\n`)],
    ["committed after the artifact", () => { write(INTENT, `${read(INTENT)}Committed later.\n`); commitAll("intent later"); }],
    ["committed after a stamp commit of the artifact", () => { commitAll("stamp"); write(INTENT, `${read(INTENT)}Later.\n`); commitAll("intent later"); }],
  ];
  for (const [what, change] of later)
    it(`pins the identities at the commit that last changed the artifact's body, not an input changed ${what}`, () => {
      pipeline(0);
      write(SPEC, "# Spec\n");
      const atCommit = id(INTENT);
      land(SPEC);
      change();
      stamp(SPEC);
      assert.deepEqual(inputsOf(SPEC), [`${INTENT}@${atCommit}`]);
      assert.notEqual(id(INTENT), atCommit);
      assert.deepEqual(check().phases[0].stale, [INTENT]);
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
});

describe("stamp of an approval", () => {
  useRepo();

  it("pins the intent, every later input, and the spec, and records the net change at its last message's commit", () => {
    pipeline(3);
    write("0-intent/constraint-1.md", `target: ${NOTES}\n`);
    write("0-intent/proposal-1.md", `target: ${DESIGN}\n`);
    writeFile("src/app.js", "export const a = 2;\n");
    const reviewedAt = commitAll("change");
    const atReview = check().netChange;
    const path = thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", "abc1234"], ["implementer", "abc1234"], ["reviewer-default", reviewedAt.slice(0, 9)]] });
    writeFile("src/app.js", "export const a = 3;\n");
    commitAll("later change");
    stamp(path);
    assert.deepEqual(frontmatterOf(path), {
      inputs: [pin("0-intent/constraint-1.md"), pin(INTENT), pin("0-intent/proposal-1.md"), pin(SPEC)],
      reviewed: atReview,
    });
    assert.notEqual(atReview, check().netChange);
    assert.match(read(path), /^---\n[\s\S]*\n---\nstatus: closed: approved\n/);
    const before = read(path);
    stamp(path);
    assert.equal(read(path), before);
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
    ["--pin naming a missing candidate", () => [P(SPEC), "--pin", P("1-spec/lanes/b/spec.md")], /cannot pin .*1-spec\/lanes\/b\/spec.md: missing/],
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
      const out = run("stamp", ...args().map((arg) => arg.startsWith("--") ? arg : abs(arg)));
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(read(SPEC), before);
    });

  it("a required input that is missing", () => {
    pipeline(0);
    write(DESIGN, "# Design\n");
    commitAll("design");
    const out = run("stamp", abs(P(DESIGN)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot pin .*1-spec\/spec.md: missing/);
  });

  it("while another pipeline file is INVALID", () => {
    pipeline(1);
    write("0-intent/constraint-1.md", "no target\n");
    write(SPEC, `${read(SPEC)}Revised.\n`);
    commitAll("revise");
    const out = run("stamp", abs(P(SPEC)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /constraint-1.md: later input has no target/);
  });

  it("a file whose own frontmatter is malformed, leaving it untouched", () => {
    pipeline(0);
    write(SPEC, "---\nnot json\n---\n# Spec\n");
    commitAll("malformed");
    const out = run("stamp", abs(P(SPEC)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not valid JSON/);
    assert.equal(read(SPEC), "---\nnot json\n---\n# Spec\n");
  });

  it("an approval whose last message's commit does not resolve", () => {
    pipeline(3);
    const path = thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", "abcdef1"]] });
    commitAll("approve");
    const out = run("stamp", abs(P(path)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /the last message's commit does not resolve to a commit: abcdef1/);
  });

  it("an artifact with no commit", () => {
    pipeline(0);
    write(SPEC, "# Spec\n");
    const out = run("stamp", abs(P(SPEC)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /1-spec\/spec.md has no commit: commit its body before stamping/);
  });

  it("an artifact whose body has uncommitted changes", () => {
    pipeline(1);
    write(SPEC, `${read(SPEC)}Uncommitted.\n`);
    const out = run("stamp", abs(P(SPEC)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /has body changes HEAD does not hold/);
  });

  it("a folder that has no parent pipelines folder root", () => {
    for (const [rel, contents] of [["demo/run-config.md", '---\n{"target-phase": 1, "base": "main"}\n---\n'], ["demo/0-intent/intent.md", "# I\n"], ["demo/1-spec/spec.md", "# S\n"]]) writeFile(rel, contents);
    const out = run("stamp", abs("demo/1-spec/spec.md"));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /a pipeline folder is <pipelines folder root>\/<pipeline slug>: demo/);
    configure();
  });
});
