import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { P, write, read, rp, root, configure, check, PLAN_BASE, review, pairs, registered, stampPlan, TASKS, report, approveChain, buildDone, useFixture } from "./fixture.mjs";

describe("rp tasks, reports, phase reviews", () => {
  useFixture();

  test("the frontier walks phases in order and names the next task from the task files", () => {
    assert.match(check(root), /frontier stamp 1-spec\/spec\.md/);
    approveChain(1);
    assert.match(check(root), /frontier stamp 2-design-doc\/design-doc\.md/);
    approveChain(3);
    assert.match(check(root), /tasks\s+3-build: planned 2\s+done \[\]\s+next build-task-1[\s\S]*frontier task 3-build\/build-task-1/);
    report("build-task-1", 1, "completed");
    assert.match(check(root), /frontier task 3-build\/build-task-2/);
    report("build-task-2", 1, "completed", ["build-task-1"]);
    assert.match(check(root), /frontier build review/);
  });

  test("a report reviews its task and its dependencies, immutably; a replan reopens completed work by computation", () => {
    approveChain(3);
    assert.throws(() => report("build-task-2", 1, "completed"), /reviews exactly its task and its dependencies/);
    report("build-task-1", 1, "completed");
    report("build-task-2", 1, "completed", ["build-task-1"]);
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/build-task-2-report-1.md")).data.get("attempt"), "1");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/build-task-2-report-1.md"), "--reviewed", P("3-build/tasks/build-task-2.md"), "--reviewed", P("3-build/tasks/build-task-1.md")), /immutable/);
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1: revised\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");
    const output = check(root);
    assert.match(output, /open \[build-task-1:completed \(stale\), build-task-2:completed \(stale\)\]/);
    assert.match(output, /build-plan\.md .*approved \(stale\)/);
  });

  test("a later task report stamp preserves its recorded package", () => {
    approveChain(3);
    report("build-task-1", 1, "completed");
    report("build-task-2", 1, "completed", ["build-task-1"]);
    const recorded = parseFrontmatter(read(root, "3-build/tasks/build-task-2-report-1.md")).data.get("reviewed");
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: replanned\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror");
    assert.doesNotThrow(() => rp(root, "stamp", P("3-build/tasks/build-task-2-report-1.md"), "--mirror"));
    assert.deepEqual(parseFrontmatter(read(root, "3-build/tasks/build-task-2-report-1.md")).data.get("reviewed"), recorded);
  });

  for (const [phase, tp] of [["3-build", "build-task"], ["4-document", "document-task"]])
    test(`${phase} report stamp and check share task dependency requirements`, () => {
      if (phase === "4-document") write(root, "4-document/document-plan.md", "# Plan\n");
      const task = `${phase}/tasks/${tp}-2.md`, report = `${phase}/tasks/${tp}-2-report-1.md`;
      const dependency = `${phase}/tasks/${tp}-1.md`, extra = `${phase}/tasks/${tp}-3.md`;
      registered(dependency, { "depends-on": [] }, "# Task\ndepends-on: none\n");
      registered(extra, { "depends-on": [] }, "# Extra\ndepends-on: none\n");
      registered(task, { "depends-on": [`${tp}-1`] }, `# Task\ndepends-on: ${tp}-1\n`);
      for (const paths of [[task], [task, dependency, extra]]) {
        write(root, report, "# Report\noutcome: completed\n");
        assert.throws(() => rp(root, "stamp", P(report), "--mirror", ...paths.flatMap((path) => ["--reviewed", P(path)])), /reviews exactly its task and its dependencies/);
        registered(report, { reviewed: pairs(paths), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.tasks[phase].done.includes(`${tp}-2`), false);
      }
      write(root, report, "# Report\noutcome: completed\n");
      rp(root, "stamp", P(report), "--mirror", "--reviewed", P(dependency), "--reviewed", P(task));
      assert.deepEqual(parseFrontmatter(read(root, report)).data.get("reviewed"), pairs([dependency, task]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes(`${tp}-2`), true);
      registered(task, { "depends-on": [`${tp}-1`, `${tp}-3`] }, `# Task\ndepends-on: ${tp}-1, ${tp}-3\n`);
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes(`${tp}-2`), false);
      const next = `${phase}/tasks/${tp}-2-report-2.md`;
      write(root, next, "# Report\noutcome: completed\n");
      assert.throws(() => rp(root, "stamp", P(next), "--mirror", "--reviewed", P(task), "--reviewed", P(dependency)), /reviews exactly its task and its dependencies/);
      rp(root, "stamp", P(next), "--mirror", ...[extra, task, dependency].flatMap((path) => ["--reviewed", P(path)]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes(`${tp}-2`), true);
    });

  test("a failed report blocks its task only until adjudicated or the task changes", () => {
    approveChain(3);
    report("build-task-1", 1, "failed");
    assert.match(check(root), /frontier converge 3-build\/build-plan\.md/);
    stampPlan(["3-build/tasks/build-task-1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/build-task-1-report-1.md"]);
    let output = check(root);
    assert.match(output, /build-task-1-report-1\.md .*resolved/);
    assert.match(output, /frontier task 3-build\/build-task-1/);
    report("build-task-1", 2, "failed");
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1: replanned\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");
    output = check(root);
    assert.doesNotMatch(output, /challenge .*build-task-1-report-2/);
  });

  test("a phase-review schema deduplicates a failed report pinned by its plan", () => {
    approveChain(3);
    report("build-task-1", 1, "failed");
    stampPlan(["3-build/tasks/build-task-1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, "3-build/tasks/build-task-1-report-1.md", ...TASKS]);
    report("build-task-1", 2, "completed");
    report("build-task-2", 1, "completed", ["build-task-1"]);
    review("3-build/build-review-1.md", "approved", [...PLAN_BASE, "3-build/tasks/build-task-1-report-1.md", ...TASKS, "3-build/tasks/build-task-1-report-2.md", "3-build/tasks/build-task-2-report-1.md"]);
    configure({ targetPhase: 3 });
    assert.match(check(root), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
  });

  test("a blocked report is never a challenge: its task stays pending for the orchestrator until a later attempt lands", () => {
    approveChain(3);
    report("build-task-1", 1, "blocked");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/build-task-1-report-1.md")).data.get("outcome"), "blocked");
    let output = check(root);
    assert.doesNotMatch(output, /challenge/);
    assert.match(output, /open \[build-task-1:blocked\]/);
    assert.match(output, /frontier blocked 3-build\/build-task-1/);
    assert.equal(JSON.parse(check(root, "--json")).tasks["3-build"].blocked, "build-task-1");
    report("build-task-1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[build-task-1\]/);
    assert.match(output, /frontier task 3-build\/build-task-2/);
  });

  test("a phase review names the plan package, its inputs, every task and report, and goes stale when a report lands", () => {
    buildDone();
    configure({ targetPhase: 3 });
    assert.match(check(root), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
    report("build-task-2", 2, "completed", ["build-task-1"]);
    configure({ targetPhase: 3 });
    const output = check(root);
    assert.match(output, /build\s+review: ·:approved \(stale\)/);
    assert.match(output, /frontier build review/);
  });

  test("the document phase runs on the build's approval: plan requires the build plan and its approving review", () => {
    buildDone();
    write(root, "4-document/document-plan.md", "# Document plan\n\n## Order\n\n- document-task-1\n");
    write(root, "4-document/document-plan-research.md", "# Doc research\n");
    write(root, "4-document/tasks/document-task-1.md", "# document-task-1: guide\n\ndepends-on: none\n");
    rp(root, "stamp", P("4-document/tasks/document-task-1.md"), "--mirror");
    const BUILD_WORK = [...TASKS, "3-build/tasks/build-task-1-report-1.md", "3-build/tasks/build-task-2-report-1.md"];
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"));
    assert.match(check(root), /document-plan\.md\s+STALE — package members/);
    assert.match(check(root), /frontier converge 4-document\/document-plan\.md/);
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"), ...BUILD_WORK.flatMap((f) => ["--pin", P(f)]));
    const DOC = ["4-document/document-plan.md", "4-document/document-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md", ...BUILD_WORK];
    review("4-document/document-plan-review-1.md", "approved", [...DOC, "4-document/tasks/document-task-1.md"]);
    assert.match(check(root), /frontier task 4-document\/document-task-1/);
    write(root, "4-document/tasks/document-task-1-report-1.md", "# Task report\n\noutcome: completed\n");
    rp(root, "stamp", P("4-document/tasks/document-task-1-report-1.md"), "--reviewed", P("4-document/tasks/document-task-1.md"), "--mirror");
    assert.match(check(root), /frontier document review/);
    review("4-document/document-review-1.md", "approved", [...DOC, "4-document/tasks/document-task-1.md", "4-document/tasks/document-task-1-report-1.md"]);
    assert.match(check(root), /complete through phase 4 — target reached[\s\S]*frontier complete/);
  });
});
