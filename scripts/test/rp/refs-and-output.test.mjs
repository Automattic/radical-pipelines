import assert from "node:assert/strict";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, laneFingerprint, parseFrontmatter, renderFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { PIPELINE, git, P, write, read, rp, root, lane, standard, configure, check, SPEC, review, pairs, registered, stampSpec, approveSpec, writeTasks, stampPlan, approvePlan, report, approveChain, useFixture } from "./fixture.mjs";

describe("rp refs and output", () => {
  useFixture();

  test("check --ref reads a pipeline from a branch without checking it out", () => {
    approveChain(1);
    configure({ targetPhase: 1 });
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "spec approved");
    git(root, "branch", "other");
    write(root, "1-spec/spec.md", "# Spec\n\nChanged on the working tree.\n");
    configure({ targetPhase: 4 });
    assert.match(rp(root, "check", PIPELINE, "--ref", "other"), /frontier complete/);
    assert.match(rp(root, "check", PIPELINE), /approved \(stale\)/);
  });

  test("stamp and check derive the worktree repository from their argument", () => {
    const seat = `${root}-seat`;
    git(root, "worktree", "add", "--quiet", "-b", "seat-branch", seat);
    try {
      writeFileSync(join(seat, "seat-work.js"), "export default 1;\n");
      git(seat, "add", "-A");
      git(seat, "commit", "--quiet", "-m", "seat work");
      const seatHead = git(seat, "rev-parse", "--short=12", "HEAD").trim();
      rp(root, "stamp", join(seat, P("1-spec/spec.md")), "--pin", P("0-intent/intent.md"));
      assert.equal(parseFrontmatter(readFileSync(join(seat, P("1-spec/spec.md")), "utf8")).data.get("head"), seatHead);
      assert.match(rp(root, "diff", join(seat, PIPELINE)), /^diff --git a\/seat-work\.js b\/seat-work\.js$/m);
    } finally {
      git(root, "worktree", "remove", "--force", seat);
    }
  });

  test("state cannot be forged: mirrors come from the body, reviewed is immutable, identities are exact", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nverdict: rejected\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((f) => ["--reviewed", P(f)]), "--mirror");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    // A hand-written pin with an empty or short identity is never fresh.
    registered("2-design-doc/design-doc.md", { pins: ["0-intent/intent.md@", "1-spec/spec.md@abc"] }, "# Design doc\n");
    assert.match(check(root), /artifact 2-design-doc\/design-doc\.md\s+STALE/);
  });

  test("mirrors are the body's projection: a declaration the body lost never survives in the frontmatter", () => {
    stampSpec();
    approveSpec();
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier complete/);
    // The verdict is deleted from the body; the frontmatter still says approved.
    const stamped = read(root, "1-spec/spec-review-1.md");
    write(root, "1-spec/spec-review-1.md", stamped.replace(/^verdict: approved\n/m, ""));
    configure({ targetPhase: 1 });
    let output = check(root);
    assert.match(output, /mirror\s+1-spec\/spec-review-1\.md\s+differs from the body: verdict/);
    assert.doesNotMatch(output, /APPROVED|frontier complete/);
    assert.match(output, /frontier stamp 1-spec\/spec-review-1\.md/);
    // Re-mirroring a stamped file is legitimate: reviewed stays, the mirror set is recomputed whole.
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    const text = read(root, "1-spec/spec-review-1.md");
    assert.equal(parseFrontmatter(text).data.has("verdict"), false);
    assert.equal(parseFrontmatter(text).data.has("reviewed"), true);
    configure({ targetPhase: 1 });
    output = check(root);
    assert.doesNotMatch(output, /mirror\s/);
    assert.match(output, /frontier INVALID REVIEW 1-spec\/spec-review-1\.md: no verdict line/);
    // A claim keeps the target identity it landed with while its target is the same.
    review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-goal\n");
    const landed = parseFrontmatter(read(root, "1-spec/spec-review-2.md")).data.get("target-identity");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, "1-spec/spec-review-2.md")).data.get("target-identity"), landed);
    write(root, "1-spec/spec-review-2.md", read(root, "1-spec/spec-review-2.md").replace(/^verdict: unsatisfiable\n/m, "verdict: approved\n").replace(/^target:.*\n/m, ""));
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.doesNotMatch(read(root, "1-spec/spec-review-2.md"), /target/);
  });

  test("every attempt is validated: a report without an outcome is invalid until its body declares one and is re-mirrored", () => {
    approveChain(3);
    write(root, "3-build/tasks/build-task-1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1-report-1.md"), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror");
    let output = check(root);
    assert.match(output, /frontier INVALID REPORT 3-build\/tasks\/build-task-1-report-1\.md: no outcome line/);
    appendFileSync(join(root, P("3-build/tasks/build-task-1-report-1.md")), "\noutcome: blocked\n");
    output = check(root);
    assert.match(output, /mirror\s+3-build\/tasks\/build-task-1-report-1\.md\s+differs from the body: outcome/);
    assert.match(output, /frontier stamp 3-build\/tasks\/build-task-1-report-1\.md/);
    rp(root, "stamp", P("3-build/tasks/build-task-1-report-1.md"), "--mirror");
    report("build-task-1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[build-task-1\]/);
    assert.match(output, /frontier task 3-build\/build-task-2/);
    // An unstamped task file is a contradiction too: its dependencies are declared in the body.
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1\n");
    assert.match(check(root), /frontier stamp 3-build\/tasks\/build-task-2\.md/);
  });

  test("a lane's fingerprint covers id, brief, materials, and after", () => {
    const base = laneFingerprint({ id: "security", brief: "Verify security surfaces in depth" });
    assert.match(base, /^[0-9a-f]{12}$/);
    assert.equal(laneFingerprint({ id: "security", brief: "  Verify security surfaces in depth " }), base);
    assert.notEqual(laneFingerprint({ id: "a11y", brief: "Verify security surfaces in depth" }), base);
    assert.notEqual(laneFingerprint({ id: "security", brief: "Verify accessibility" }), base);
    assert.notEqual(laneFingerprint({ id: "security", brief: "Verify security surfaces in depth", materials: ["intent", "diff"] }), base);
    assert.notEqual(laneFingerprint({ id: "security", brief: "Verify security surfaces in depth", after: ["event-driven"] }), base);
    const recordedFingerprint = identity("combined\nCombine\n\na+b\n");
    assert.equal(laneFingerprint({ id: "combined", brief: "Combine", after: ["a", "b"] }), recordedFingerprint);

    const combined = lane("spec-producer", "combined", { brief: "Combine", after: ["a", "b"] });
    configure({ targetPhase: 1, lanes: [standard.a, standard.b, combined] });
    write(root, "1-spec/combined/spec.md", "# Combined\n");
    write(root, "1-spec/combined/spec-research.md", "# Record\n");
    registered("1-spec/combined/spec.md", {
      pins: pairs(["0-intent/intent.md"]),
      lane: recordedFingerprint,
    });
    const state = JSON.parse(check(root, "--json"));
    assert.doesNotMatch(state.lanes.find((entry) => entry.lane === "1-spec/combined/").stale.join(", "), /lane declaration/);
  });

  test("stamp derives lane fingerprints from review and production paths", () => {
    const reviewer = lane("spec-reviewer", "security", { brief: "Verify security surfaces in depth" });
    const producer = lane("spec-producer", "a", { brief: "Explore an event-driven design" });
    configure({ targetPhase: 1, lanes: [reviewer, producer] });
    stampSpec();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "approved", SPEC, "brief: Verify security surfaces in depth\n");
    assert.equal(parseFrontmatter(read(root, "1-spec/spec-review-security-1.md")).data.get("lane"), laneFingerprint(reviewer));
    assert.equal(parseFrontmatter(read(root, "1-spec/spec-review-1.md")).data.has("lane"), false);
    const implicit = parseFrontmatter(read(root, "1-spec/spec-review-1.md"));
    implicit.data.set("lane", laneFingerprint(reviewer));
    write(root, "1-spec/spec-review-1.md", renderFrontmatter(implicit.data, implicit.body));
    rmSync(join(root, P("run-config.md")));
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "1-spec/spec-review-1.md")).data.has("lane"), false);
    configure({ targetPhase: 1, lanes: [reviewer, producer] });
    write(root, "1-spec/a/spec.md", "# Spec a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    assert.equal(parseFrontmatter(read(root, "1-spec/a/spec.md")).data.get("lane"), laneFingerprint(producer));
    assert.equal(parseFrontmatter(read(root, "1-spec/a/spec-review-1.md")).data.has("lane"), false);
    review("1-spec/a/spec-review-security-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    assert.equal(parseFrontmatter(read(root, "1-spec/a/spec-review-security-1.md")).data.get("lane"), laneFingerprint(reviewer));
    const record = parseFrontmatter(read(root, "1-spec/a/spec-research.md"));
    record.data = record.data ?? new Map();
    record.data.set("lane", laneFingerprint(producer));
    write(root, "1-spec/a/spec-research.md", renderFrontmatter(record.data, record.body));
    rmSync(join(root, P("run-config.md")));
    rp(root, "stamp", P("1-spec/a/spec-research.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "1-spec/a/spec-research.md")).data.has("lane"), false);
    configure({ targetPhase: 1, lanes: [reviewer, producer] });
    assert.deepEqual(JSON.parse(rp(root, "check", PIPELINE, "--json")).configuration, {
      workflow: "autonomous",
      targetPhase: 1,
      base: "main",
      lanes: [
        { ...reviewer, fingerprint: laneFingerprint(reviewer) },
        { ...producer, fingerprint: laneFingerprint(producer) },
      ],
    });
  });

  test("a changed lane brief makes its stamped review stale", () => {
    const reviewer = lane("spec-reviewer", "security", { brief: "Verify security" });
    configure({ targetPhase: 1, lanes: [reviewer] });
    stampSpec();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "approved", SPEC);
    assert.match(rp(root, "check", PIPELINE), /frontier complete/);
    configure({ targetPhase: 1, lanes: [{ ...reviewer, brief: "Verify accessibility" }] });
    assert.match(rp(root, "check", PIPELINE), /security:approved \(stale\)/);
  });

  test("a path naming an undeclared lane is rejected by stamp", () => {
    stampSpec();
    approveSpec();
    write(root, "1-spec/rogue/spec.md", "# Rogue\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/rogue/spec.md"), "--pin", P("0-intent/intent.md")), /undeclared lane/);
    write(root, "1-spec/rogue/spec-review-1.md", "# Review\n\nverdict: rejected\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/rogue/spec-review-1.md"), "--mirror"), /undeclared lane/);
    write(root, "1-spec/spec-review-extra-2.md", "# Review\n\nverdict: rejected\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-extra-2.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror"), /undeclared lane/);
    const output = check(root);
    assert.match(output, /lane\s+1-spec\/rogue\/\s+UNDECLARED/);
    assert.match(output, /lane\s+1-spec\/spec-review-extra-2\.md\s+UNDECLARED/);
  });

  test("a claim is pending only while it is its lane's latest verdict; a held claim ends with the wave that approved", () => {
    const reviewer = lane("spec-reviewer", "b");
    configure({ targetPhase: 1, lanes: [reviewer] });
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-goal\n");
    review("1-spec/spec-review-b-1.md", "rejected", SPEC);
    let output = rp(root, "check", PIPELINE);
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*held \(a lane rejected/);
    assert.match(output, /frontier converge 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    review("1-spec/spec-review-b-2.md", "approved", SPEC);
    output = rp(root, "check", PIPELINE);
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*superseded \(its lane reviewed again\)/);
    assert.doesNotMatch(output, /PENDING|held|wave open/);
    assert.match(output, /frontier complete/);
  });

  test("run configuration validation rejects every malformed field", () => {
    const run = () => rp(root, "check", PIPELINE, "--json");
    const raw = (frontmatter, body = "") => write(root, "run-config.md", `---\n${frontmatter}\n---\n${body}`);
    rmSync(join(root, P("run-config.md")));
    assert.throws(run, /missing run-config\.md/);
    raw("not JSON");
    assert.throws(run, /invalid JSON/);
    for (const value of ["[]", '"text"', "null"]) {
      raw(value);
      assert.throws(run, /JSON object/);
    }
    const invalid = [
      [{ workflow: "manual", "target-phase": 1 }, /workflow/],
      [{ workflow: "autonomous", "target-phase": 0 }, /target-phase/],
      [{ workflow: "autonomous", "target-phase": 5 }, /target-phase/],
      [{ workflow: "autonomous", "target-phase": 1.5 }, /target-phase/],
      [{ workflow: "autonomous", "target-phase": "1" }, /target-phase/],
      [{ workflow: "autonomous", "target-phase": 1, extra: true }, /unknown key/],
      ...[undefined, 7, "", " main", "a..b", "HEAD"].map((base) => [{ workflow: "autonomous", "target-phase": 1, base }, /base must be a branch name/]),
      [{ workflow: "autonomous", "target-phase": 1, "": true }, /unknown key/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [] }, /lanes must be non-empty when present/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: {} }, /lanes must be an array/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: ["lane"] }, /must be an object/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, "": true }] }, /unknown key/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ profile: 7, id: "x", brief: "x" }] }, /profile must be a string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ profile: "unknown", id: "x", brief: "x" }] }, /profile is unknown/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, extra: true }] }, /unknown key/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, id: 7 }] }, /id must be a string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, id: true }] }, /id must be a string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, id: ["focus"] }] }, /id must be a string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-reviewer", "Bad")] }, /id is invalid/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-reviewer", "tasks")] }, /reserved/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [standard.security, standard.security] }, /duplicate lane id/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, brief: " " }] }, /non-empty string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, brief: 1 }] }, /non-empty string/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, materials: "path" }] }, /materials must be an array/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, materials: [] }] }, /non-empty when present/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, materials: ["1-spec/spec.md", "1-spec/spec.md"] }] }, /duplicate paths/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.a, materials: ["1-spec/spec.md"] }] }, /review lanes only/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [{ ...standard.security, after: ["x"] }] }, /production lanes only/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-producer", "a", { after: "b" })] }, /after must be an array/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-producer", "a", { after: [] })] }, /non-empty when present/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-producer", "a", { after: ["b", "b"] }), standard.b] }, /duplicate lane ids/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-producer", "a", { after: ["missing"] })] }, /undeclared lane/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [lane("spec-producer", "a", { after: ["b"] }), lane("spec-producer", "b", { after: ["a"] })] }, /cycle/],
      [{ workflow: "assisted", "target-phase": 1, lanes: [standard.security] }, /assisted workflow/],
      [{ workflow: "autonomous", "target-phase": 1, lanes: [standard.security, standard.a, lane("spec-producer", "a-review-security")] }, /same auxiliary branch/],
    ];
    for (const [object, error] of invalid) {
      raw(JSON.stringify({ base: "main", ...object }));
      assert.throws(run, error);
    }
    configure({ targetPhase: 3 });
    approveChain(2);
    writeTasks();
    report("build-task-1", 1, "completed");
    stampPlan();
    configure({ targetPhase: 3, lanes: [lane("build-plan-reviewer", "focus", { materials: ["3-build/tasks/build-task-1-report-1.md"] })] });
    assert.throws(run, /materials .* outside the 3-build\/build-plan\.md package/);
  });

  test("an unfinished report and cyclic plan are flagged; an invalid attempt is rejected before publication", () => {
    approveChain(3);
    write(root, "3-build/tasks/build-task-1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1-report-1.md"), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror");
    assert.match(check(root), /frontier INVALID REPORT 3-build\/tasks\/build-task-1-report-1\.md: no outcome line/);
    rmSync(join(root, P("3-build/tasks/build-task-1-report-1.md")));
    assert.throws(() => report("build-task-1", 2, "completed"), /INVALID REPORT .*expected attempt 1/);
    rmSync(join(root, P("3-build/tasks/build-task-1-report-2.md")));
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1\n\ndepends-on: build-task-2\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");
    approvePlan(2);
    assert.match(check(root), /frontier invalid plan: 3-build\/tasks\/build-task-1\.md depends on a cycle/);
  });

  test("attempt numbering counts landed reports, not draft filenames", () => {
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");
    for (const attempt of [1, 2]) write(root, `3-build/tasks/build-task-1-report-${attempt}.md`, `# Report ${attempt}\n\noutcome: blocked\n`);
    rp(root, "stamp", P("3-build/tasks/build-task-1-report-1.md"), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror");
    rp(root, "stamp", P("3-build/tasks/build-task-1-report-2.md"), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/build-task-1-report-1.md")).data.get("attempt"), "1");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/build-task-1-report-2.md")).data.get("attempt"), "2");
  });
});
