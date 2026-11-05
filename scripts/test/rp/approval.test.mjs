import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, NOTES, P, SPEC, abs, approve, check, commitAll, configure, frontier, git, pipeline, read, root, rp, run, stampAt, thread, REVIEW, useRepo, write, writeFile } from "./fixture.mjs";

const head = () => git(root, "rev-parse", "HEAD").trim();
const review = () => check().reviews[0];
// A file whose edit sits among repeated lines: `}` closes every function.
const FUNCTIONS = (body = {}) => ["function a() {", `  ${body.a ?? "return 1;"}`, "}", "", "function b() {", `  ${body.b ?? "return 1;"}`, "}", "", "function c() {", `  ${body.c ?? "return 1;"}`, "}", ""].join("\n");
function onBase(change) {
  git(root, "checkout", "--quiet", "main");
  change();
  commitAll("base moves");
  git(root, "checkout", "--quiet", "demo");
}
// The pipeline edits function b in src/f.js, and a reviewer approves it.
function approvedEdit() {
  onBase(() => writeFile("src/f.js", FUNCTIONS()));
  git(root, "merge", "--quiet", "--no-edit", "main");
  pipeline(3);
  writeFile("src/f.js", FUNCTIONS({ b: "return 2;" }));
  commitAll("edit b");
  approve();
  assert.deepEqual(review(), { lane: "default", approved: true });
}

describe("approval freshness", () => {
  useRepo();

  it("is fresh when the approved commit is the tip", () => {
    pipeline(3);
    const tip = head();
    thread({ status: "closed: approved", ...REVIEW(), messages: [["reviewer-default", tip]] });
    stampAt(tip, "threads/1-reviewer-default-implementer-implementation.md");
    assert.equal(check().tip, tip);
    assert.deepEqual(review(), { lane: "default", approved: true });
  });

  it("stays fresh after commits inside the pipelines folder root", () => {
    approvedEdit();
    write("threads/notes.txt", "x\n");
    writeFile(".pipelines/other/x.md", "x\n");
    commitAll("pipeline only");
    assert.deepEqual(frontier(), ["complete"]);
  });

  for (const [what, change] of [
    ["other files", () => writeFile("src/other.js", "export const b = 1;\n")],
    ["the repeated lines of a neighboring function", () => writeFile("src/f.js", FUNCTIONS({ a: "return 0;", c: "return 0;" }))],
    ["the start of the file, shifting line numbers", () => writeFile("src/f.js", `// header\n${FUNCTIONS()}`)],
  ])
    it(`stays fresh after a clean merge of a base that changed ${what}`, () => {
      approvedEdit();
      onBase(change);
      git(root, "merge", "--quiet", "--no-edit", "main");
      assert.deepEqual(review(), { lane: "default", approved: true });
      assert.deepEqual(frontier(), ["complete"]);
    });

  it("stays fresh when the base moves and the tip has not merged it", () => {
    approvedEdit();
    onBase(() => writeFile("src/f.js", FUNCTIONS({ a: "return 0;" })));
    assert.deepEqual(review(), { lane: "default", approved: true });
  });

  it("goes stale after a conflicting merge's resolution", () => {
    approvedEdit();
    onBase(() => writeFile("src/f.js", FUNCTIONS({ b: "return 5;" })));
    assert.throws(() => git(root, "merge", "--quiet", "--no-edit", "main"));
    writeFile("src/f.js", FUNCTIONS({ b: "return 2;" }));
    commitAll("resolve keeping ours");
    assert.deepEqual(review(), { lane: "default", approved: false, codeChanged: true });
    assert.deepEqual(frontier(), ["review default"]);
  });

  for (const [what, change] of [
    ["changes code", () => writeFile("src/f.js", FUNCTIONS({ b: "return 3;" }))],
    ["adds a file", () => writeFile("docs/new.md", "# New\n")],
    ["changes only whitespace", () => writeFile("src/f.js", FUNCTIONS({ b: "return  2;" }))],
    ["moves the same edit to a sibling function", () => writeFile("src/f.js", FUNCTIONS({ c: "return 2;" }))],
    ["reverts and redoes the edit elsewhere in the same commit range", () => { writeFile("src/f.js", FUNCTIONS()); commitAll("revert"); writeFile("src/f.js", FUNCTIONS({ a: "return 2;" })); }],
  ])
    it(`goes stale after an implementer commit that ${what}`, () => {
      approvedEdit();
      change();
      commitAll("implementer");
      assert.deepEqual(review(), { lane: "default", approved: false, codeChanged: true });
      assert.deepEqual(frontier(), ["review default"]);
    });

  // A change to a pipeline file after the approval: [what, change, the approval's stale inputs].
  for (const [what, change, stale] of [
    ["the intent changes", () => write(INTENT, `${read(INTENT)}Changed.\n`), [INTENT]],
    ["a later input targeting the spec lands", () => write("0-intent/constraint-1.md", `target: ${SPEC}\n`), ["0-intent/constraint-1.md"]],
    ["a later input targeting notes.md lands", () => write("0-intent/failure-1.md", `target: ${NOTES}\n`), ["0-intent/failure-1.md"]],
    ["the spec changes", () => write(SPEC, `${read(SPEC)}Changed.\n`), null],
    ["the design doc changes", () => write(DESIGN, `${read(DESIGN)}Changed.\n`), null],
    ["notes.md changes", () => write(NOTES, `${read(NOTES)}Changed.\n`), null],
  ])
    it(`${stale ? "goes stale" : "stays fresh"} when ${what}`, () => {
      approvedEdit();
      change();
      commitAll("pipeline file");
      assert.deepEqual(review(), stale ? { lane: "default", approved: false, stale } : { lane: "default", approved: true });
    });

  it("prints the net change as <base>..<tip> and the approval's reasons", () => {
    approvedEdit();
    onBase(() => writeFile("src/other.js", "x\n"));
    git(root, "merge", "--quiet", "--no-edit", "main");
    write(INTENT, `${read(INTENT)}Changed.\n`);
    writeFile("src/f.js", FUNCTIONS({ b: "return 3;" }));
    commitAll("both");
    const lines = rp("check", abs(P(""))).split("\n");
    assert.ok(lines.includes(`net-change ${git(root, "rev-parse", "main").trim()}..${head()}`));
    assert.ok(lines.includes(`review default stale ${INTENT} code`));
  });

  it("uses the merge-base with the base run-config.md names", () => {
    pipeline(3);
    git(root, "branch", "release", "main");
    onBase(() => writeFile("src/main-only.js", "x\n"));
    configure({ base: "release" });
    assert.equal(check().netChange, `${git(root, "rev-parse", "release").trim()}..${head()}`);
  });

  it("stops the check when the base does not resolve", () => {
    pipeline(3);
    configure({ base: "missing" });
    const out = run("check", abs(P("")));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /base does not resolve to a commit: missing/);
  });

  it("stops the check when the approved commit does not resolve", () => {
    pipeline(3);
    write("threads/1-reviewer-default-implementer-implementation.md",
      `---\n${JSON.stringify({ inputs: [], reviewed: "1".repeat(40) })}\n---\nstatus: closed: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — abc1234\n`);
    const out = run("check", abs(P("")));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /reviewed does not resolve to a commit/);
  });

  it("compares code outside the pipelines folder root that is the pipeline folder's parent, whatever .rp.md says", () => {
    writeFile(".rp.md", "### Pipelines folder root\n\n`elsewhere/`\n");
    const files = { "run-config.md": '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n', "0-intent/intent.md": "# I\n", "1-spec/spec.md": "# S\n" };
    for (const [rel, contents] of Object.entries(files)) writeFile(`work/pipes/demo/${rel}`, contents);
    const turn = commitAll("pipeline");
    const approval = "work/pipes/demo/threads/1-reviewer-default-implementer-implementation.md";
    writeFile(approval, `status: closed: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — ${turn}\n`);
    rp("stamp", abs(approval), "--at", turn);
    writeFile("work/pipes/other.md", "inside the root\n");
    commitAll("inside");
    const reviews = () => JSON.parse(rp("check", abs("work/pipes/demo"), "--json")).reviews;
    assert.deepEqual(reviews(), [{ lane: "default", approved: true }]);
    writeFile(".pipelines/x.md", "outside the root\n");
    commitAll("outside");
    assert.deepEqual(reviews(), [{ lane: "default", approved: false, codeChanged: true }]);
  });
});
