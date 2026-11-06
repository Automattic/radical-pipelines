import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, REVIEW, SPEC, TO_SPEC, UPSTREAM,
  abs, certification, check, commitAll, configure, git, land, lane, later, pipeline, read, remove, revise, root, run, stamp, stampAt, thread, useRepo, write, writeFile,
} from "./fixture.mjs";

const id = (rel) => git(root, "rev-parse", `HEAD:${P(rel)}`).slice(0, 12);
const pin = (rel) => `${rel}@${id(rel)}`;
const inputsOf = (rel) => certification(rel).inputs;

describe("identity", () => {
  useRepo();

  it("is the first 12 hex of the blob id git stores for the whole file, frontmatter included", () => {
    pipeline(0);
    write(SPEC, "# Spec\r\n\nNo trailing newline");
    land(SPEC);
    assert.deepEqual(inputsOf(SPEC), [`${INTENT}@${git(root, "hash-object", abs(P(INTENT))).slice(0, 12)}`]);
    assert.match(read(INTENT), /^---\nissue: 7\n---\n/);
  });
});

describe("landing", () => {
  useRepo();

  // [what, how the turn writes its file, the file certified]
  const turns = [
    ["an artifact", () => write(SPEC, "# Spec\r\nBody without final newline"), SPEC],
    ["a candidate", () => write("1-spec/lanes/a/spec.md", "# Candidate\n"), "1-spec/lanes/a/spec.md"],
    ["an approval", () => thread({ status: "approved", ...REVIEW(), messages: [["reviewer-default", "abc1234"]] }), "threads/1-reviewer-default-implementer-implementation.md"],
  ];
  for (const [what, writeTurn, rel] of turns)
    it(`of ${what} changes no byte of the files its turn committed, and writes only its certification`, () => {
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      const turn = git(root, "rev-parse", "HEAD").trim();
      writeTurn();
      const landed = commitAll("turn");
      stampAt(turn, rel);
      assert.equal(git(root, "diff", "--name-only", landed), "");
      assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), `?? ${P(`certification/${rel}.json`)}\n`);
      assert.deepEqual(inputsOf(rel), [pin(INTENT)]);
    });

  it("leaves a landed file fresh when its writer rewrites it from the content it committed", () => {
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    write("1-spec/lanes/a/spec.md", "# Candidate\n");
    land("1-spec/lanes/a/spec.md");
    commitAll("certified");
    const committed = read("1-spec/lanes/a/spec.md");
    remove("1-spec/lanes/a/spec.md");
    write("1-spec/lanes/a/spec.md", committed);
    assert.deepEqual(check().phases[0].lanes, [{ id: "a", path: "1-spec/lanes/a/spec.md", state: "fresh" }]);
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
      write("0-intent/constraint-1.md", later(`${root}#item-1`));
      write("0-intent/proposal-1.md", later([SPEC, DESIGN, NOTES].find((path) => path !== root)));
      write(subject, "# Body\n");
      land(subject);
      assert.deepEqual(inputsOf(subject), [...upstream, ...(pinsLater ? ["0-intent/constraint-1.md"] : [])].sort().map(pin));
    });

  // How the input changes after the turn's commit: [what, change].
  const changes = [
    ["uncommitted", () => write(INTENT, `${read(INTENT)}Uncommitted.\n`)],
    ["committed after the turn's commit", () => { write(INTENT, `${read(INTENT)}Committed later.\n`); commitAll("intent later"); }],
  ];
  for (const [what, change] of changes)
    it(`pins the identities at the --at commit, not an input changed ${what}`, () => {
      pipeline(0);
      write(SPEC, "# Spec\n");
      const turn = commitAll("turn");
      const atTurn = id(INTENT);
      change();
      stampAt(turn, SPEC);
      assert.deepEqual(inputsOf(SPEC), [`${INTENT}@${atTurn}`]);
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
    write("0-intent/failure-1.md", later(SPEC));
    revise(SPEC);
    assert.equal(inputsOf(SPEC).length, 2);
    write("0-intent/failure-1.md", later(DESIGN));
    revise(SPEC, "Again.");
    assert.deepEqual(inputsOf(SPEC), [pin(INTENT)]);
  });

  it("changes nothing when stamped twice", () => {
    pipeline(3);
    for (const rel of [SPEC, DESIGN, NOTES]) stamp(rel);
    assert.equal(git(root, "status", "--porcelain"), "");
  });
});

describe("stamp of an approval", () => {
  useRepo();

  it("pins the intent and every later input at the change it reviewed, and records the HEAD holding it as reviewed", () => {
    pipeline(3);
    write("0-intent/constraint-1.md", later(NOTES));
    write("0-intent/proposal-1.md", later(DESIGN));
    writeFile("src/app.js", "export const a = 2;\n");
    const change = commitAll("change");
    const pins = [pin("0-intent/constraint-1.md"), pin(INTENT), pin("0-intent/proposal-1.md")];
    const path = thread({ status: "approved", ...REVIEW(), messages: [["reviewer-default", "abc1234"]] });
    write("0-intent/proposal-1.md", later(DESIGN, "Changed after the change was built.\n"));
    const anchor = commitAll("approval lands after a later input");
    stampAt(change.slice(0, 9), path);
    assert.deepEqual(certification(path), { inputs: pins, reviewed: anchor });
    assert.deepEqual(check().reviews, [{ lane: "default", approved: false, stale: ["0-intent/proposal-1.md"] }]);
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
    ["a malformed artifact that is not an input", () => { write(NOTES, "---\nstatus: [done]\n---\n"); return commitAll("bad notes"); }, SPEC, null],
    ["a candidate of an unconfigured lane in another phase", () => { write("2-design-doc/lanes/x/design-doc.md", "# x\n"); return commitAll("stray"); }, SPEC, null],
    ["a folder where an unrelated thread belongs", () => { write("threads/1-x.md/y", "x\n"); return commitAll("folder"); }, SPEC, null],
    ["a malformed later input targeting the artifact", () => { write("0-intent/constraint-1.md", later(`${DESIGN}\nlane: x`)); return commitAll("bad input"); }, DESIGN, /constraint-1.md: unexpected frontmatter key: lane/],
    ["a later input whose target is malformed", () => { write("0-intent/proposal-1.md", later("elsewhere.md")); return commitAll("bad target"); }, DESIGN, /proposal-1.md: target must name/],
    ["a malformed required input", () => { write(SPEC, "---\n---\n# Spec\n"); return commitAll("bad spec"); }, DESIGN, /1-spec\/spec.md: carries no frontmatter/],
    ["a folder where a required input belongs", () => { remove(SPEC); write(`${SPEC}/x`, "x\n"); return commitAll("spec folder"); }, DESIGN, /1-spec\/spec.md: a folder where a pipeline file belongs/],
    ["a run-config.md of an earlier format", () => { write("run-config.md", '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n'); return commitAll("old config"); }, DESIGN, /run-config.md: pipeline of an earlier format; it is not continued/],
    ["a run-config.md of a newer format", () => { write("run-config.md", '---\n{"format": 8}\n---\n'); return commitAll("new config"); }, DESIGN, /run-config.md: pipeline of a newer format 8; update the skill/],
    ["a malformed run-config.md", () => { write("run-config.md", '---\n{"format": 7}\n---\n'); return commitAll("bad config"); }, DESIGN, /run-config.md: target-phase/],
  ];
  for (const [what, setup, file, reason] of cases)
    it(`${reason ? "stops on" : "ignores"} ${what}`, () => {
      pipeline(3);
      const turn = setup();
      const out = run("stamp", abs(P(file)), "--at", turn);
      assert.equal(out.status, reason ? 1 : 0, out.stderr);
      if (reason) assert.match(out.stderr, reason);
    });

  it("reads only run-config.md and the stamped file from the working tree", () => {
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
    ["a thread that is not a review thread", () => [P("threads/1-design-doc-producer-spec-producer-spec.md")], /only an approved review thread is stamped/],
    ["an open review thread", () => [P("threads/2-reviewer-default-implementer-implementation.md")], /only an approved review thread is stamped/],
    ["--pin, an option that no longer exists", () => [P(SPEC), "--pin", P("1-spec/lanes/a/spec.md")], /stamp: unknown option: --pin/],
  ];
  for (const [name, args, message] of refusals)
    it(name, () => {
      pipeline(3, { lanes: [lane("spec-producer", "a")] });
      write("0-intent/constraint-1.md", later(SPEC));
      write("1-spec/lanes/a/spec.md", "# a\n");
      thread({ status: "approved", ...TO_SPEC });
      thread({ n: 2, ...REVIEW() });
      commitAll("setup");
      const before = git(root, "status", "--porcelain", "--untracked-files=all");
      const out = run("stamp", ...args().map((arg) => arg.startsWith("--") ? arg : abs(arg)), "--at", "HEAD");
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), before);
    });

  it("a required input that is missing", () => {
    pipeline(0);
    write(DESIGN, "# Design\n");
    commitAll("design");
    const out = run("stamp", abs(P(DESIGN)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /cannot pin .*1-spec\/spec.md: missing/);
  });

  it("while another pipeline file it reads is INVALID", () => {
    pipeline(1);
    write("0-intent/constraint-1.md", "target: 1-spec/spec.md\n");
    write(SPEC, `${read(SPEC)}Revised.\n`);
    commitAll("revise");
    const out = run("stamp", abs(P(SPEC)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /constraint-1.md: frontmatter has no target/);
  });

  it("a file that is malformed itself, leaving it untouched and certifying nothing", () => {
    pipeline(0);
    write(SPEC, "---\nstatus: done\n---\n# Spec\n");
    commitAll("malformed");
    const out = run("stamp", abs(P(SPEC)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /1-spec\/spec.md: carries no frontmatter/);
    assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), "");
  });

  for (const [what, args, message] of [
    ["--at missing", [], /--at <commit> names the turn's commit and is required/],
    ["--at that names no commit", ["--at", "nope"], /--at does not resolve to a commit: nope/],
    ["--at a commit without the pipeline", ["--at", "main"], /no such folder/],
  ])
    it(what, () => {
      pipeline(1);
      const out = run("stamp", abs(P(SPEC)), ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), "");
    });

  it("a folder that has no parent pipelines folder root", () => {
    for (const [rel, contents] of [["demo/run-config.md", '---\n{"format": 7, "target-phase": 1, "base": "main"}\n---\n'], ["demo/0-intent/intent.md", "# I\n"], ["demo/1-spec/spec.md", "# S\n"]]) writeFile(rel, contents);
    const out = run("stamp", abs("demo/1-spec/spec.md"), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /a pipeline folder is <pipelines folder root>\/<pipeline slug>: demo/);
    configure();
  });

  it("a certification path of the wrong kind, writing nothing", () => {
    pipeline(0);
    write(SPEC, "# Spec\n");
    write("certification/1-spec/spec.md.json/x", "x\n");
    const out = run("stamp", abs(P(SPEC)), "--at", "HEAD");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /certification\/1-spec\/spec.md.json: a folder where a certification belongs/);
    assert.equal(readFileSync(abs(P("certification/1-spec/spec.md.json/x")), "utf8"), "x\n");
  });
});
