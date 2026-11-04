import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { identity, splitFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { execFileSync } from "node:child_process";
import { DESIGN, INTENT, NOTES, P, SPEC, abs, check, commitAll, git, pipeline, read, root, run, stamp, thread, useRepo, write, writeFile } from "./fixture.mjs";

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

  it("records reviewed on a reviewer's approved thread as the net-change patch id", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    thread("1-reviewer-implementer-notes.md", { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
    const out = run("stamp", abs(P("threads/1-reviewer-implementer-notes.md")), "--reviewed");
    assert.equal(out.status, 0, out.stderr);
    const reviewed = JSON.parse(splitFrontmatter(readFileSync(abs(P("threads/1-reviewer-implementer-notes.md")))).json).reviewed;
    assert.equal(reviewed, check().netChange);
    assert.match(read("threads/1-reviewer-implementer-notes.md"), /^---\n[\s\S]*\n---\nstatus: closed: approved\n/);
  });

  const refusals = [
    ["no option", () => [P(SPEC)], /nothing to stamp/],
    ["--pin on the intent", () => [P(INTENT), "--pin", P(SPEC)], /--pin applies to an artifact with inputs/],
    ["--pin on a later input", () => [P("0-intent/constraint-1.md"), "--pin", P(INTENT)], /--pin applies/],
    ["--pin outside the pipeline", () => [P(SPEC), "--pin", "src/app.js"], /outside the pipeline folder/],
    ["--pin of a thread", () => [P(SPEC), "--pin", P("threads/1-implementer-spec-producer-spec.md")], /names no pipeline artifact/],
    ["--pin of a missing file", () => [P(SPEC), "--pin", P(DESIGN)], /cannot read/],
    ["the same pin twice", () => [P(SPEC), "--pin", P(INTENT), "--pin", P(INTENT)], /twice/],
    ["--reviewed on an artifact", () => [P(SPEC), "--reviewed"], /--reviewed applies to a thread/],
    ["--reviewed on an open thread", () => [P("threads/1-implementer-spec-producer-spec.md"), "--reviewed"], /closed: approved/],
    ["run-config.md", () => [P("run-config.md"), "--pin", P(INTENT)], /not a pipeline artifact or thread/],
    ["a file outside the pipelines folder root", () => ["src/app.js", "--pin", P(INTENT)], /not inside the pipelines folder root/],
    ["an unknown option", () => [P(SPEC), "--mirror"], /unknown option/],
  ];
  for (const [name, args, message] of refusals)
    it(`refuses ${name}`, () => {
      pipeline(1);
      write("0-intent/constraint-1.md", "target: 1-spec/spec.md\n");
      thread("1-implementer-spec-producer-spec.md", { opener: "implementer", owner: "spec-producer", artifact: SPEC });
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
