import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { identity, splitFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { execFileSync } from "node:child_process";
import { DESIGN, INTENT, NOTES, P, SPEC, abs, check, commitAll, git, pipeline, read, REVIEW, root, run, stamp, thread, TO_SPEC, useRepo, write, writeFile } from "./fixture.mjs";

describe("identity", () => {
  useRepo();

  it("is the first 12 hex of the git blob hash of the body below the frontmatter", () => {
    const body = "# Spec\r\n\nNo trailing newline";
    write(SPEC, `---\n{"inputs": []}\n---\n${body}`);
    const blob = execFileSync("git", ["hash-object", "--stdin", "--no-filters"], { cwd: root, input: body, encoding: "utf8" });
    assert.equal(identity(readFileSync(abs(P(SPEC)))), blob.slice(0, 12));
  });

  it("is the whole file's blob hash when there is no frontmatter", () => {
    write(INTENT, "# Intent\n");
    assert.equal(identity(readFileSync(abs(P(INTENT)))), git(root, "hash-object", abs(P(INTENT))).slice(0, 12));
  });

  it("is unchanged by stamping", () => {
    pipeline(0);
    write(SPEC, "# Spec\r\nBody without final newline");
    const before = identity(readFileSync(abs(P(SPEC))));
    stamp(SPEC, INTENT);
    assert.equal(identity(readFileSync(abs(P(SPEC)))), before);
    assert.equal(splitFrontmatter(readFileSync(abs(P(SPEC)))).body.toString("latin1"), "# Spec\r\nBody without final newline");
  });
});

describe("stamp", () => {
  useRepo();

  it("records inputs as <path>@<identity>, sorted, replacing the previous set", () => {
    pipeline(2);
    write(NOTES, "# Notes\n");
    stamp(NOTES, DESIGN, SPEC);
    const pins = (rel) => `${rel}@${identity(readFileSync(abs(P(rel))))}`;
    assert.deepEqual(JSON.parse(splitFrontmatter(readFileSync(abs(P(NOTES)))).json).inputs, [pins(SPEC), pins(DESIGN)]);
    stamp(NOTES, SPEC);
    assert.deepEqual(JSON.parse(splitFrontmatter(readFileSync(abs(P(NOTES)))).json).inputs, [pins(SPEC)]);
  });

  it("is idempotent: a second identical stamp leaves the bytes unchanged", () => {
    pipeline(1);
    const first = read(SPEC);
    stamp(SPEC, INTENT);
    assert.equal(read(SPEC), first);
  });

  it("pins a lane candidate", () => {
    pipeline(1);
    write("1-spec/lanes/a/spec.md", "# Candidate\n");
    write(DESIGN, "# Design\n");
    stamp(DESIGN, SPEC, "1-spec/lanes/a/spec.md");
    assert.match(read(DESIGN), /1-spec\/lanes\/a\/spec\.md@[0-9a-f]{12}/);
  });

  it("records reviewed on a review thread closed approved as the net change at its last message's commit", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    const reviewedAt = commitAll("change");
    const atReview = check().netChange;
    const path = thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", "abc1234"], ["implementer", "abc1234"], ["reviewer-default", reviewedAt.slice(0, 9)]] });
    writeFile("src/app.js", "export const a = 3;\n");
    commitAll("later change");
    const out = run("stamp", abs(P(path)), "--reviewed");
    assert.equal(out.status, 0, out.stderr);
    const reviewed = JSON.parse(splitFrontmatter(readFileSync(abs(P(path)))).json).reviewed;
    assert.equal(reviewed, atReview);
    assert.notEqual(reviewed, check().netChange);
    assert.match(read(path), /^---\n[\s\S]*\n---\nstatus: closed: approved\n/);
  });

  it("refuses --reviewed when the last message's commit does not resolve", () => {
    pipeline(3);
    const path = thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", "abcdef1"]] });
    const out = run("stamp", abs(P(path)), "--reviewed");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /the last message's commit does not resolve to a commit: abcdef1/);
  });

  const refusals = [
    ["no option", () => [P(SPEC)], /nothing to stamp/],
    ["the intent", () => [P(INTENT), "--pin", P(SPEC)], /not an artifact or thread/],
    ["a later input", () => [P("0-intent/constraint-1.md"), "--pin", P(INTENT)], /not an artifact or thread/],
    ["--pin on a thread", () => [P("threads/1-design-doc-producer-spec-producer-spec.md"), "--pin", P(INTENT)], /--pin applies to an artifact/],
    ["--pin outside the pipeline", () => [P(SPEC), "--pin", "src/app.js"], /outside the pipeline folder/],
    ["--pin of a thread", () => [P(SPEC), "--pin", P("threads/1-design-doc-producer-spec-producer-spec.md")], /names no pipeline artifact/],
    ["--pin of a missing file", () => [P(SPEC), "--pin", P(DESIGN)], /cannot read/],
    ["the same pin twice", () => [P(SPEC), "--pin", P(INTENT), "--pin", P(INTENT)], /twice/],
    ["--reviewed on an artifact", () => [P(SPEC), "--reviewed"], /--reviewed applies to a thread/],
    ["--reviewed on a thread that is not a review thread", () => [P("threads/1-design-doc-producer-spec-producer-spec.md"), "--reviewed"], /review thread closed: approved/],
    ["--reviewed on an open review thread", () => [P("threads/2-reviewer-default-implementer-implementation.md"), "--reviewed"], /review thread closed: approved/],
    ["run-config.md", () => [P("run-config.md"), "--pin", P(INTENT)], /not an artifact or thread/],
    ["a file outside the pipelines folder root", () => ["src/app.js", "--pin", P(INTENT)], /not inside the pipelines folder root/],
    ["an unknown option", () => [P(SPEC), "--mirror"], /unknown option/],
  ];
  for (const [name, args, message] of refusals)
    it(`refuses ${name}`, () => {
      pipeline(1);
      write("0-intent/constraint-1.md", "target: 1-spec/spec.md\n");
      thread({ status: "closed: approved", ...TO_SPEC });
      thread({ n: 2, ...REVIEW() });
      const before = read(SPEC);
      const out = run("stamp", ...args().map((arg) => arg.startsWith("--") ? arg : abs(arg)));
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(read(SPEC), before);
    });

  it("refuses a file whose frontmatter is malformed, leaving it untouched", () => {
    pipeline(0);
    write(SPEC, "---\nnot json\n---\n# Spec\n");
    const out = run("stamp", abs(P(SPEC)), "--pin", abs(P(INTENT)));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not valid JSON/);
    assert.equal(read(SPEC), "---\nnot json\n---\n# Spec\n");
  });

  it("writes nothing when the stamp records what the file already holds", () => {
    pipeline(1);
    stamp(SPEC, INTENT);
    assert.equal(git(root, "status", "--porcelain", "--", P(SPEC)), "");
  });
});
