import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { identity } from "../../skills/radical-pipelines/scripts/rp.mjs";

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
const check = (root, ...args) => rp(root, "check", PIPELINE, ...args);

function initRepo() {
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(root, "init", "--quiet");
  git(root, "config", "user.email", "rp-test@example.com");
  git(root, "config", "user.name", "RP Test");
  write(root, "0-intent/intent.md", "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal intent.\n");
  write(root, "1-spec/spec.md", "# Spec\n\nRequirement R1.\n");
  write(root, "1-spec/spec-research.md", "# Spec research\n");
  write(root, "2-design-doc/design-doc.md", "# Design doc\n\nDecision D1.\n");
  write(root, "2-design-doc/design-doc-research.md", "# Design research\n");
  write(root, "3-build/build-plan.md", "# Build plan\n\n## Order\n\n- T1\n- T2 <- T1\n");
  write(root, "3-build/build-plan-research.md", "# Plan research\n");
  return root;
}

describe("rp state tooling", () => {
  let root;
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

  // --- identity and stamps -----------------------------------------------------

  test("identity is the body's hash: stamping never changes it", () => {
    const before = identity(read(root, "1-spec/spec.md"));
    stampSpec();
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "note=one");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "note=two");
    assert.equal(identity(read(root, "1-spec/spec.md")), before);
    assert.match(read(root, "1-spec/spec.md"), /pins:\n  - 0-intent\/intent\.md@[0-9a-f]{12}/);
  });

  test("a body edit makes a pin stale; a frontmatter edit does not", () => {
    stampSpec();
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    rp(root, "stamp", P("0-intent/intent.md"), "--set", "note=x");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  test("--mirror copies Verdict, Brief, Target, Outcome, Prior finding, Depends on, and every Origin line", () => {
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nBrief: security\nTarget: 0-intent/intent.md#goal\n\n### Issue 1\n\nPrior finding: 1-spec/spec-review-0.md#Issue-2, resolution failed\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md"), "--mirror");
    const fm = read(root, "1-spec/spec-review-1.md");
    assert.match(fm, /verdict: unsatisfiable/);
    assert.match(fm, /brief: security/);
    assert.match(fm, /target: 0-intent\/intent\.md#goal/);
    assert.match(fm, /target-identity: [0-9a-f]{12}/);
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
    approveSpec();
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "one");
    stampSpec();
    const head1 = read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1];
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "two");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "audited-spec=1");
    assert.equal(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
    stampSpec();
    assert.notEqual(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
  });

  // --- reviews, waves, inputs --------------------------------------------------

  test("a review names its artifact, its record, and the artifact's inputs; a changed input stales the approval", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "approved", ["1-spec/spec.md", "1-spec/spec-research.md"]);
    assert.match(check(root), /reviews: ·:approved \(stale\)/);
    approveSpec(2);
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nNew constraint.\n");
    stampSpec(); // a re-synthesis that needed no edit refreshes the pins
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:approved \(stale\)/);
    assert.match(check(root, "--target-phase", "1"), /frontier review wave 1-spec\/spec\.md/);
  });

  test("waves are per artifact and shared by lanes; the implicit lane needs no id", () => {
    stampSpec();
    const lanes = "spec=security";
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "rejected", SPEC);
    assert.match(check(root, "--lanes", lanes), /reviews: ·:approved security:rejected/);
    assert.match(check(root, "--lanes", lanes), /frontier adjudicate 1-spec\/spec\.md/);
    review("1-spec/spec-review-security-2.md", "approved", SPEC);
    // wave 2 is open until the implicit lane reports it
    assert.match(check(root, "--lanes", lanes), /frontier review wave 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /APPROVED[\s\S]*frontier complete/);
  });

  test("the episode counts waves since every lane approved together; audited and episode-start are namespaced per series", () => {
    stampSpec();
    const lanes = "spec=security";
    for (let w = 1; w <= 3; w++) {
      review(`1-spec/spec-review-${w}.md`, w % 2 ? "approved" : "rejected", SPEC);
      review(`1-spec/spec-review-security-${w}.md`, w % 2 ? "rejected" : "approved", SPEC);
    }
    assert.match(check(root, "--lanes", lanes), /counter\s+spec: 3 waves this episode/);
    assert.match(check(root, "--lanes", lanes), /frontier AUDIT → adjudicate 1-spec\/spec\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "audited-spec=3");
    assert.match(check(root, "--lanes", lanes), /frontier adjudicate 1-spec\/spec\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "episode-start-spec=3");
    assert.match(check(root, "--lanes", lanes), /counter\s+spec: 0 waves|frontier adjudicate/);
  });

  test("an unstamped review is the frontier, never a new wave", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    assert.match(check(root), /frontier stamp 1-spec\/spec-review-1\.md/);
  });

  // --- triggers and claims -----------------------------------------------------

  function amendment(target = "1-spec/spec.md#R1") {
    write(root, "0-intent/1-amendment.md", `# Amendment 1\n\nTarget: ${target}\nOrigin: owner request\n\n## Request\n\nFix R1.\n`);
    rp(root, "stamp", P("0-intent/1-amendment.md"), "--mirror");
  }

  test("a trigger is pending, then adjudicated when its target pins it, then resolved when the target is approved carrying the pin", () => {
    stampSpec();
    approveSpec();
    amendment();
    assert.match(check(root), /trigger .*1-amendment\.md .*PENDING/);
    assert.match(check(root), /frontier trigger 0-intent\/1-amendment\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    assert.match(check(root), /adjudicated \(by 1-spec\/spec\.md, awaiting approval\)/);
    appendFileSync(join(root, P("1-spec/spec-research.md")), "\n## Adjudications\n\nAdopted.\n");
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/1-amendment.md"]);
    assert.match(check(root, "--target-phase", "1"), /resolved \(1-spec\/spec\.md approved carrying it\)[\s\S]*frontier complete/);
  });

  test("a claim escalated one layer up resolves the trigger below it; intent targets are owner escalations", () => {
    stampSpec();
    amendment();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    review("1-spec/spec-review-1.md", "unsatisfiable", [...SPEC, "0-intent/1-amendment.md"], [], "Target: 0-intent/intent.md#goal\nOrigin: 0-intent/1-amendment.md\n");
    const output = check(root);
    assert.match(output, /trigger .*resolved \(escalated by 1-spec\/spec-review-1\.md\)/);
    assert.match(output, /claim .*#goal\s+PENDING — owner escalation/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal \(owner escalation\)/);
  });

  test("a claim stands only when its wave closed without a rejection; it is suspended behind its target's own claim", () => {
    stampSpec();
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"));
    const DESIGN_NO_APPROVAL = DESIGN.filter((f) => !f.includes("spec-review"));
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN_NO_APPROVAL, [], "Target: 1-spec/spec.md#R1\n");
    let output = check(root);
    assert.match(output, /design-doc-review-1\.md → 1-spec\/spec\.md#R1\s+suspended \(behind 1-spec\/spec-review-1\.md\)/);
    // A second lane still to report keeps a claim open; a rejecting lane holds it.
    output = check(root, "--lanes", "design-doc=a11y");
    assert.match(output, /design-doc-review-1\.md .*wave open/);
    review("2-design-doc/design-doc-review-a11y-1.md", "rejected", DESIGN_NO_APPROVAL);
    assert.match(check(root, "--lanes", "design-doc=a11y"), /design-doc-review-1\.md .*held \(a lane rejected/);
  });

  test("a claim about a changed artifact is moot; a changed target supersedes it; invalid targets are flagged", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAnswered.\n");
    assert.match(check(root), /superseded \(target changed\)/);
    review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#context-1\n");
    assert.match(check(root), /INVALID TARGET/);
    amendment("0-intent/intent.md#goal");
    assert.match(check(root), /trigger .*INVALID TARGET/);
  });

  test("triggers and claims beyond the target phase are reported, not the frontier", () => {
    stampSpec();
    approveSpec();
    amendment("4-document/document-plan.md#T1");
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
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--force"), /immutable/);
    write(root, "3-build/tasks/T1.md", "# T1: revised\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    const output = check(root);
    assert.match(output, /open \[T1:completed \(stale\), T2:completed \(stale\)\]/);
    assert.match(output, /build-plan\.md .*approved \(stale\)/);
  });

  test("a failed report blocks its task only until adjudicated or the task changes", () => {
    approveChain(3);
    report("T1", 1, "failed");
    assert.match(check(root), /frontier trigger 3-build\/tasks\/T1-report-1\.md/);
    stampPlan(["3-build/tasks/T1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/T1-report-1.md"]);
    let output = check(root);
    assert.match(output, /T1-report-1\.md .*resolved/);
    assert.match(output, /frontier task 3-build\/T1/);
    report("T1", 2, "failed");
    write(root, "3-build/tasks/T1.md", "# T1: replanned\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    output = check(root);
    assert.doesNotMatch(output, /trigger .*T1-report-2/);
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
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"));
    const DOC = ["4-document/document-plan.md", "4-document/document-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md"];
    review("4-document/document-plan-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md"]);
    assert.match(check(root), /frontier task 4-document\/T1/);
    write(root, "4-document/tasks/T1-report-1.md", "# Task report\n\nOutcome: completed\n");
    rp(root, "stamp", P("4-document/tasks/T1-report-1.md"), "--reviewed", P("4-document/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier document review/);
    review("4-document/document-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md", "4-document/tasks/T1-report-1.md"]);
    assert.match(check(root), /complete through phase 4 — target reached[\s\S]*frontier complete/);
  });

  // --- production lanes ---------------------------------------------------------

  test("declared production lanes are sub-pipelines; `after` waits; the root must pin every lane", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    rmSync(join(root, P("1-spec/spec-research.md")));
    const lanes = "spec=|event-driven,contrarian<event-driven";
    let output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+MISSING/);
    assert.match(output, /lane\s+1-spec\/contrarian\/spec\.md\s+MISSING\s+waiting for event-driven/);
    assert.match(output, /frontier synthesize 1-spec\/event-driven\/spec\.md/);
    for (const id of ["event-driven"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"));
      review(`1-spec/${id}/spec-review-1.md`, "approved", [`1-spec/${id}/spec.md`, `1-spec/${id}/spec-research.md`, "0-intent/intent.md"]);
    }
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier synthesize 1-spec\/contrarian\/spec\.md/);
    write(root, "1-spec/contrarian/spec.md", "# Spec contrarian\n");
    write(root, "1-spec/contrarian/spec-research.md", "# Record contrarian\n");
    rp(root, "stamp", P("1-spec/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"));
    review("1-spec/contrarian/spec-review-1.md", "approved", ["1-spec/contrarian/spec.md", "1-spec/contrarian/spec-research.md", "0-intent/intent.md", "1-spec/event-driven/spec.md"]);
    assert.match(check(root, "--lanes", lanes), /artifact 1-spec\/spec\.md\s+MISSING — every lane approved: consolidate/);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    write(root, "1-spec/spec-research.md", "# Consolidated record\n");
    // A root that pins only one lane is not a consolidation: lanes stay open, the root has incomplete pins.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"));
    output = check(root, "--lanes", lanes);
    assert.doesNotMatch(output, /closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+INCOMPLETE PINS/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--pin", P("1-spec/contrarian/spec.md"), "--pin", P("1-spec/contrarian/spec-research.md"), "--pin", P("1-spec/contrarian/spec-review-1.md"));
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:none/);
  });

  test("a claim raised inside a production lane reaches the frontier, and lanes have counters", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    const lanes = "spec=|a,b";
    for (const id of ["a", "b"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"));
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

  test("state cannot be forged: mirrors come from the body, reviewed is immutable, identities are exact", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: rejected\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md"), "--set", "verdict=approved"), /never by --set/);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((f) => ["--reviewed", P(f)]), "--mirror");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md"), "--force"), /immutable/);
    // A hand-written pin with an empty or short identity is never fresh.
    write(root, "2-design-doc/design-doc.md", "---\npins:\n  - 0-intent/intent.md@\n  - 1-spec/spec.md@abc\n---\n# Design doc\n");
    assert.match(check(root), /artifact 2-design-doc\/design-doc\.md\s+STALE/);
  });

  test("a declared brief fingerprint must match the review's brief", () => {
    stampSpec();
    const fp = rp(root, "fingerprint", "Verify security surfaces in depth").trim();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "approved", SPEC, [], "Brief: Verify security surfaces in depth\n");
    assert.match(check(root, "--lanes", `spec=security@${fp}`, "--target-phase", "1"), /frontier complete/);
    const other = rp(root, "fingerprint", "Verify accessibility").trim();
    assert.match(check(root, "--lanes", `spec=security@${other}`, "--target-phase", "1"), /security:approved \(stale\)/);
  });

  test("a pending claim persists past a later review of the same lane", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("1-spec/spec-review-2.md", "approved", SPEC);
    const output = check(root, "--target-phase", "1");
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*PENDING — owner escalation/);
    assert.doesNotMatch(output, /frontier complete/);
  });

  test("invalid lane declarations are rejected before any state is computed", () => {
    assert.throws(() => check(root, "--lanes", "sepc=security"), /unknown artifact/);
    assert.throws(() => check(root, "--lanes", "spec=|a<missing"), /undeclared lane/);
    assert.throws(() => check(root, "--lanes", "spec=|a<b,b<a"), /cycle/);
    assert.throws(() => check(root, "--lanes", "build-plan=|a"), /spec and design doc only/);
  });

  test("a report without an outcome, a cyclic plan, and non-sequential attempts are flagged, never dispatched", () => {
    approveChain(3);
    write(root, "3-build/tasks/T1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier stamp 3-build\/tasks\/T1-report-1\.md/);
    rmSync(join(root, P("3-build/tasks/T1-report-1.md")));
    report("T1", 2, "completed");
    assert.match(check(root), /frontier invalid reports: attempts of 3-build\/tasks\/T1 are not 1\.\.n/);
    rmSync(join(root, P("3-build/tasks/T1-report-2.md")));
    write(root, "3-build/tasks/T1.md", "# T1\n\n- **Depends on:** T2\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    approvePlan(2);
    assert.match(check(root), /frontier invalid plan: 3-build\/tasks\/T1\.md depends on a cycle/);
  });

  test("a commit outside the pipelines folder that no task report claims is the frontier", () => {
    buildDone();
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    git(root, "checkout", "--quiet", "-b", "work");
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

  test("CRLF frontmatter is parsed, and symlinked paths are refused", () => {
    write(root, "1-spec/spec.md", "---\r\nnote: x\r\n---\r\n# Spec\r\n");
    stampSpec();
    const text = read(root, "1-spec/spec.md");
    assert.equal(text.split("---").length, 3);
    assert.match(text, /note: x/);
    const victim = join(root, "victim.md");
    writeFileSync(victim, "# Victim\n");
    execFileSync("ln", ["-sf", victim, join(root, P("1-spec/link.md"))]);
    assert.throws(() => rp(root, "stamp", P("1-spec/link.md"), "--mirror"), /symlinked/);
  });

  test("check --json carries the state", () => {
    const state = JSON.parse(check(root, "--json"));
    for (const key of ["pipeline", "triggers", "claims", "lanes", "artifacts", "tasks", "counters", "frontier", "completeThrough", "complete"]) {
      assert.ok(key in state, `missing ${key}`);
    }
  });
});
