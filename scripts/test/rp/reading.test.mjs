import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { describe, it } from "node:test";

import { DESIGN, INTENT, P, SPEC, abs, check, commitAll, frontier, git, lane, pipeline, read, remove, root, rp, run, useRepo, write, writeFile } from "./fixture.mjs";

describe("reading a pipeline", () => {
  useRepo();

  it("--ref reads the pipeline and the tip from a commit instead of the working tree", () => {
    const first = pipeline(1);
    write(DESIGN, "# Design\n");
    commitAll("design");
    remove(SPEC);
    write("threads/1-x.md", "malformed\n");
    assert.deepEqual(frontier(), ["INVALID threads/1-x.md"]);
    assert.deepEqual(frontier("--ref", "HEAD"), [`respond ${DESIGN}`]);
    assert.deepEqual(frontier("--ref", first), [`produce ${DESIGN}`]);
    assert.equal(check("--ref", "demo").tip, git(root, "rev-parse", "demo").trim());
  });

  it("--ref reads a pipeline folder absent from the working tree", () => {
    pipeline(1);
    git(root, "checkout", "--quiet", "main");
    assert.deepEqual(frontier("--ref", "demo"), [`produce ${DESIGN}`]);
  });

  const failures = [
    ["a --ref that names no commit", () => ["--ref", "nope"], /--ref does not resolve to a commit: nope/],
    ["a pipeline folder absent at the ref", () => ["--ref", "main"], /no such folder/],
  ];
  for (const [what, args, message] of failures)
    it(`stops on ${what}`, () => {
      pipeline(1);
      const out = run("check", abs(P("")), ...args());
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });

  for (const ref of [false, true])
    it(`stops on a symlinked pipeline file${ref ? " at a ref" : ""}`, () => {
      pipeline(1);
      mkdirSync(abs(P("threads")));
      symlinkSync("../1-spec/spec.md", abs(P("threads/1-implementer-spec-producer-spec.md")));
      if (ref) commitAll("symlink");
      const out = run("check", abs(P("")), ...(ref ? ["--ref", "HEAD"] : []));
      assert.equal(out.status, 1);
      assert.match(out.stderr, /threads\/1-implementer-spec-producer-spec\.md: not a regular file/);
    });

  // [what, how it is made, the reason]
  const wrongKinds = [
    ["a file where the threads folder belongs", () => writeFile(P("threads"), "x\n"), /threads: a file where a folder belongs/],
    ["a file where a lane folder belongs", () => writeFile(P("1-spec/lanes/a"), "x\n"), /1-spec\/lanes\/a: a file where a folder belongs/],
    ["a folder where the spec belongs", () => { remove(SPEC); writeFile(P(`${SPEC}/x.md`), "x\n"); }, /1-spec\/spec.md: a folder where a pipeline file belongs/],
    ["a folder where a thread belongs", () => writeFile(P("threads/1-x.md/y"), "x\n"), /threads\/1-x.md: a folder where a pipeline file belongs/],
    ["a folder where run-config.md belongs", () => { remove("run-config.md"); writeFile(P("run-config.md/x"), "x\n"); }, /run-config.md: a folder where a pipeline file belongs/],
  ];
  for (const [what, make, message] of wrongKinds)
    for (const ref of [false, true])
      it(`stops on ${what}${ref ? " at a ref" : " in the working tree"}`, () => {
        pipeline(1, { lanes: [lane("spec-producer", "a")] });
        make();
        if (ref) commitAll("wrong kind");
        const out = run("check", abs(P("")), ...(ref ? ["--ref", "HEAD"] : []));
        assert.equal(out.status, 1);
        assert.match(out.stderr, message);
      });

  it("ignores files that are not pipeline files", () => {
    pipeline(3);
    write("0-intent/screenshot.png", "png");
    write("0-intent/failure-1/output.log", "log");
    write("1-spec/draft.md", "# draft\n");
    write("notes.md", "x\n");
    assert.deepEqual(frontier(), ["review default"]);
  });

  it("the identity of a CRLF intent is its bytes", () => {
    pipeline(1);
    write(INTENT, read(INTENT).replace(/\n/g, "\r\n"));
    assert.deepEqual(frontier(), [`respond ${SPEC}`]);
  });
});

describe("command line", () => {
  useRepo();

  const errors = [
    ["an unknown command", ["diff", ".pipelines/demo"], /unknown command: diff/],
    ["an unknown option", ["check", ".pipelines/demo", "--review", "x"], /check: unknown option: --review/],
    ["a repeated single option", ["check", ".pipelines/demo", "--ref", "HEAD", "--ref", "HEAD"], /--ref may appear only once/],
    ["a missing option value", ["check", ".pipelines/demo", "--ref"], /--ref expects a value/],
    ["a second positional argument", ["check", ".pipelines/demo", "extra"], /unexpected argument: extra/],
    ["a missing positional argument", ["check"], /missing <pipeline folder>/],
    ["a path inside a pipeline folder", ["check", ".pipelines/demo/1-spec"], /cannot read run-config.md: missing/],
    ["a folder without parent", ["check", ".pipelines"], /a pipeline folder is <pipelines folder root>\/<pipeline slug>: \.pipelines/],
  ];
  for (const [what, [command, ...args], message] of errors)
    it(`stops on ${what}`, () => {
      pipeline(1);
      const out = run(command, ...args.map((arg) => arg.startsWith(".pipelines") ? abs(arg) : arg));
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });

  it("stops on a path outside any repository", () => {
    const out = run("check", "/");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot locate a git repository/);
  });

  it("prints usage without a command", () => {
    assert.match(rp(), /node rp\.mjs check <pipeline folder>/);
  });
});
