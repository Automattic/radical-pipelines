import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  identity,
  parseFrontmatter,
} from "../../skills/radical-pipelines/scripts/rp.mjs";

/** Absolute path to the state-tooling CLI. */
const RP_PATH = fileURLToPath(
  new URL("../../skills/radical-pipelines/scripts/rp.mjs", import.meta.url),
);

/** Repository-relative path to the pipeline fixture. */
const PIPELINE = ".pipelines/demo";

/**
 * Run a git command in a fixture repository.
 *
 * @param {string} root - Fixture repository root.
 * @param {...string} args - Arguments passed to git.
 * @returns {string} Command output.
 */
function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

/**
 * Return a fixture file's repository-relative path.
 *
 * @param {string} relativePath - Path relative to the pipeline folder.
 * @returns {string} Path relative to the repository root.
 */
function pipelineFile(relativePath) {
  return `${PIPELINE}/${relativePath}`;
}

/**
 * Write a pipeline fixture file, creating parent directories as needed.
 *
 * @param {string} root - Fixture repository root.
 * @param {string} relativePath - Path relative to the pipeline folder.
 * @param {string} contents - File contents.
 */
function writePipelineFile(root, relativePath, contents) {
  const path = join(root, pipelineFile(relativePath));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/**
 * Create an initialized git repository containing a minimal pipeline.
 *
 * @returns {string} Absolute path to the fixture repository.
 */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(root, "init", "--quiet");
  git(root, "config", "user.email", "rp-test@example.com");
  git(root, "config", "user.name", "RP Test");
  writePipelineFile(root, "0-intent/intent.md", "# Intent\n\nOriginal intent.\n");
  writePipelineFile(root, "1-spec/spec.md", "# Spec\n\nRequirement R1.\n");
  writePipelineFile(root, "2-design-doc/design-doc.md", "# Design doc\n\nDecision D1.\n");
  writePipelineFile(root, "3-build/build-plan.md", "# Build plan\n\nTask T1.\n");
  return root;
}

/**
 * Invoke the state-tooling CLI in a fixture repository.
 *
 * @param {string} root - Fixture repository root.
 * @param {...string} args - CLI arguments.
 * @returns {string} Command output.
 */
function runRp(root, ...args) {
  return execFileSync(process.execPath, [RP_PATH, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Write an amendment targeting the fixture specification.
 *
 * @param {string} root - Fixture repository root.
 */
function writeAmendment(root) {
  writePipelineFile(
    root,
    "0-intent/1-amendment.md",
    "---\ntarget: 1-spec/spec.md#R1\norigin: external\n---\n# Amendment\n\nRevise R1.\n",
  );
}

describe("rp state tooling", () => {
  /** Active fixture repository. */
  let root;

  beforeEach(() => {
    root = makeRepo();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("stamping frontmatter leaves the exported body identity unchanged", () => {
    const file = pipelineFile("1-spec/spec.md");
    const path = join(root, file);
    const original = identity(readFileSync(path, "utf8"));

    runRp(root, "stamp", file, "--set", "k=first");
    const first = identity(readFileSync(path, "utf8"));
    runRp(root, "stamp", file, "--set", "k=second");
    const stamped = readFileSync(path, "utf8");

    assert.equal(first, original);
    assert.equal(identity(stamped), original);
    assert.equal(parseFrontmatter(stamped).data.get("k"), "second");
  });

  test("stamp writes pipeline-relative pins that check reports fresh", () => {
    const spec = pipelineFile("1-spec/spec.md");
    runRp(root, "stamp", spec, "--pin", pipelineFile("0-intent/intent.md"));

    const { data } = parseFrontmatter(readFileSync(join(root, spec), "utf8"));
    assert.match(data.get("pins")[0], /^0-intent\/intent\.md@[0-9a-f]{12}$/);
    assert.match(runRp(root, "check", PIPELINE), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("check reports stale after a pinned file's body changes", () => {
    runRp(
      root,
      "stamp",
      pipelineFile("1-spec/spec.md"),
      "--pin",
      pipelineFile("0-intent/intent.md"),
    );

    appendFileSync(join(root, pipelineFile("0-intent/intent.md")), "\nChanged body.\n");

    assert.match(runRp(root, "check", PIPELINE), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  test("check stays fresh after only a pinned file's frontmatter changes", () => {
    runRp(
      root,
      "stamp",
      pipelineFile("1-spec/spec.md"),
      "--pin",
      pipelineFile("0-intent/intent.md"),
    );

    runRp(root, "stamp", pipelineFile("0-intent/intent.md"), "--set", "origin=updated");

    assert.match(runRp(root, "check", PIPELINE), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("stamp --mirror copies review declarations into frontmatter", () => {
    const review = pipelineFile("1-spec/spec-review-1.md");
    writePipelineFile(
      root,
      "1-spec/spec-review-1.md",
      "# Review\n\nVerdict: unsatisfiable\nTarget: 1-spec/spec.md#R1\nOutcome: failed\nPrior finding: 1-spec/spec-review-1.md#F1, resolution failed\n",
    );

    runRp(
      root,
      "stamp",
      review,
      "--set",
      "lane=r1",
      "--set",
      "iteration=1",
      "--reviewed",
      pipelineFile("1-spec/spec.md"),
      "--mirror",
    );

    const { data } = parseFrontmatter(readFileSync(join(root, review), "utf8"));
    assert.equal(data.get("verdict"), "unsatisfiable");
    assert.equal(data.get("target"), "1-spec/spec.md#R1");
    assert.equal(
      data.get("target-identity"),
      identity(readFileSync(join(root, pipelineFile("1-spec/spec.md")), "utf8")),
    );
    assert.equal(data.get("outcome"), "failed");
    assert.deepEqual(data.get("recurs"), ["1-spec/spec-review-1.md#F1"]);
  });

  test("review pins cannot be replaced without --force", () => {
    const review = pipelineFile("1-spec/spec-review-1.md");
    writePipelineFile(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    runRp(root, "stamp", review, "--reviewed", pipelineFile("1-spec/spec.md"));

    assert.throws(
      () =>
        runRp(
          root,
          "stamp",
          review,
          "--reviewed",
          pipelineFile("2-design-doc/design-doc.md"),
        ),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, /review pins are immutable/);
        return true;
      },
    );
  });

  test("an amendment stays pending until its target pins it", () => {
    writeAmendment(root);

    assert.match(
      runRp(root, "check", PIPELINE),
      /trigger\s+0-intent\/1-amendment\.md \(amendment\) → 1-spec\/spec\.md#R1\s+PENDING/,
    );

    runRp(
      root,
      "stamp",
      pipelineFile("1-spec/spec.md"),
      "--pin",
      pipelineFile("0-intent/1-amendment.md"),
    );

    assert.match(
      runRp(root, "check", PIPELINE),
      /trigger\s+0-intent\/1-amendment\.md .*pinned by 1-spec\/spec\.md/,
    );
  });

  test("an approved target review adjudicates its originating amendment", () => {
    writeAmendment(root);
    const review = pipelineFile("1-spec/spec-review-1.md");
    writePipelineFile(root, "1-spec/spec-review-1.md", "# Review\n\nApproved.\n");
    runRp(
      root,
      "stamp",
      review,
      "--reviewed",
      pipelineFile("1-spec/spec.md"),
      "--set",
      "lane=r1",
      "--set",
      "iteration=1",
      "--set",
      "verdict=approved",
      "--set",
      "origin=0-intent/1-amendment.md",
    );

    assert.match(
      runRp(root, "check", PIPELINE),
      /trigger\s+0-intent\/1-amendment\.md .*refuted by 1-spec\/spec-review-1\.md/,
    );
  });

  test("an unsatisfiable claim is pending until its target body changes", () => {
    const review = pipelineFile("1-spec/spec-review-1.md");
    writePipelineFile(
      root,
      "1-spec/spec-review-1.md",
      "# Review\n\nVerdict: unsatisfiable\nTarget: 1-spec/spec.md#R1\n",
    );
    runRp(
      root,
      "stamp",
      review,
      "--reviewed",
      pipelineFile("1-spec/spec.md"),
      "--set",
      "lane=r1",
      "--set",
      "iteration=1",
      "--mirror",
    );

    assert.match(
      runRp(root, "check", PIPELINE),
      /claim\s+1-spec\/spec-review-1\.md → 1-spec\/spec\.md#R1\s+PENDING/,
    );

    appendFileSync(join(root, pipelineFile("1-spec/spec.md")), "\nChanged requirement.\n");

    assert.match(
      runRp(root, "check", PIPELINE),
      /claim\s+1-spec\/spec-review-1\.md .*superseded \(target changed\)/,
    );
  });

  test("latest task attempts determine the done-set and failed-task triggers", () => {
    const reports = [
      ["T1", 1, "failed"],
      ["T1", 2, "completed"],
      ["T2", 1, "completed"],
      ["T2", 2, "failed"],
    ];
    for (const [taskId, attempt, outcome] of reports) {
      const relativePath = `3-build/tasks/task-${taskId}-${attempt}.md`;
      writePipelineFile(root, relativePath, `# Task report\n\nOutcome: ${outcome}\n`);
      runRp(
        root,
        "stamp",
        pipelineFile(relativePath),
        "--set",
        `task=${taskId}`,
        "--set",
        `attempt=${attempt}`,
        "--mirror",
      );
    }

    const output = runRp(root, "check", PIPELINE);
    assert.match(output, /tasks\s+3-build: done \[T1\]\s+open \[T2:failed\]/);
    assert.match(
      output,
      /trigger\s+3-build\/tasks\/task-T2-2\.md \(failed task T2\) → 3-build\/build-plan\.md\s+PENDING/,
    );
    assert.doesNotMatch(output, /failed task T1/);
  });

  test("production lanes are sub-pipelines: lane reviews never approve the root", () => {
    rmSync(join(root, pipelineFile("1-spec/spec.md")));
    for (const k of [1, 2]) {
      writePipelineFile(root, `1-spec/lane-${k}/spec.md`, `# Spec lane ${k}\n`);
      writePipelineFile(root, `1-spec/lane-${k}/spec-research.md`, `# Record ${k}\n`);
      runRp(root, "stamp", pipelineFile(`1-spec/lane-${k}/spec.md`), "--pin", pipelineFile("0-intent/intent.md"));
    }
    writePipelineFile(root, "1-spec/lane-1/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    runRp(root, "stamp", pipelineFile("1-spec/lane-1/spec-review-1.md"),
      "--reviewed", pipelineFile("1-spec/lane-1/spec.md"), "--reviewed", pipelineFile("1-spec/lane-1/spec-research.md"),
      "--set", "lane=r1", "--set", "iteration=1", "--mirror");

    let output = runRp(root, "check", PIPELINE, "--lanes", "r1");
    assert.match(output, /lane\s+1-spec\/lane-1\/spec\.md\s+FRESH\s+reviews: r1:approved\s+APPROVED/);
    assert.match(output, /lane\s+1-spec\/lane-2\/spec\.md\s+FRESH\s+reviews: r1:none/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+MISSING — lanes in progress/);

    writePipelineFile(root, "1-spec/lane-2/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    runRp(root, "stamp", pipelineFile("1-spec/lane-2/spec-review-1.md"),
      "--reviewed", pipelineFile("1-spec/lane-2/spec.md"), "--reviewed", pipelineFile("1-spec/lane-2/spec-research.md"),
      "--set", "lane=r1", "--set", "iteration=1", "--mirror");
    output = runRp(root, "check", PIPELINE, "--lanes", "r1");
    assert.match(output, /artifact 1-spec\/spec\.md\s+MISSING — every lane approved: consolidate/);

    writePipelineFile(root, "1-spec/spec.md", "# Consolidated spec\n");
    writePipelineFile(root, "1-spec/spec-research.md", "# Consolidated record\n");
    runRp(root, "stamp", pipelineFile("1-spec/spec.md"), "--pin", pipelineFile("0-intent/intent.md"),
      "--pin", pipelineFile("1-spec/lane-1/spec.md"), "--pin", pipelineFile("1-spec/lane-2/spec.md"));
    output = runRp(root, "check", PIPELINE, "--lanes", "r1");
    assert.match(output, /lane\s+1-spec\/lane-1\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: r1:none\n/);
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md.*APPROVED/);
  });

  function review(relPath, body, reviewed, sets = []) {
    writePipelineFile(root, relPath, body);
    runRp(root, "stamp", pipelineFile(relPath), ...reviewed.flatMap((f) => ["--reviewed", pipelineFile(f)]), ...sets.flatMap((kv) => ["--set", kv]), "--mirror");
  }

  test("a trigger escalated one layer up (unsatisfiable review with origin) is resolved", () => {
    writePipelineFile(root, "0-intent/1-amendment.md", "# Amendment 1\n\nTarget: 1-spec/spec.md#R1\nOrigin: owner request\n");
    runRp(root, "stamp", pipelineFile("0-intent/1-amendment.md"), "--mirror");
    review("1-spec/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n", ["1-spec/spec.md"], ["lane=r1", "iteration=1", "origin=0-intent/1-amendment.md"]);
    const output = runRp(root, "check", PIPELINE);
    assert.match(output, /trigger\s+0-intent\/1-amendment\.md .*escalated by 1-spec\/spec-review-1\.md/);
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal\s+PENDING — owner escalation/);
  });

  test("a claim is suspended behind the pending claim of its target, including an owner escalation", () => {
    review("1-spec/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n", ["1-spec/spec.md"], ["lane=r1", "iteration=1"]);
    review("2-design-doc/design-doc-review-1.md", "# Review\n\nVerdict: unsatisfiable\nTarget: 1-spec/spec.md#R1\n", ["2-design-doc/design-doc.md"], ["lane=r1", "iteration=1"]);
    const output = runRp(root, "check", PIPELINE);
    assert.match(output, /claim\s+2-design-doc\/design-doc-review-1\.md → 1-spec\/spec\.md#R1\s+suspended \(behind 1-spec\/spec-review-1\.md\)/);
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal\s+PENDING — owner escalation/);
  });

  test("waves this episode count per lane, not reviews", () => {
    review("1-spec/spec-review-r1-1.md", "# Review\n\nVerdict: rejected\n", ["1-spec/spec.md"], ["lane=r1", "iteration=1"]);
    review("1-spec/spec-review-r2-1.md", "# Review\n\nVerdict: rejected\n", ["1-spec/spec.md"], ["lane=r2", "iteration=1"]);
    assert.match(runRp(root, "check", PIPELINE), /counter\s+spec: 1 wave this episode/);
  });

  test("--lanes declares lanes per artifact; the assisted workflow declares owner", () => {
    review("1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n", ["1-spec/spec.md"], ["lane=owner", "iteration=1"]);
    review("2-design-doc/design-doc-review-r1-1.md", "# Review\n\nVerdict: approved\n", ["2-design-doc/design-doc.md"], ["lane=r1", "iteration=1"]);
    const output = runRp(root, "check", PIPELINE, "--lanes", "spec=owner;design-doc=r1,r2");
    assert.match(output, /artifact 1-spec\/spec\.md .*owner:approved.*APPROVED/);
    assert.match(output, /artifact 2-design-doc\/design-doc\.md .*r1:approved r2:none\n/);
    assert.doesNotMatch(runRp(root, "check", PIPELINE, "--lanes", "spec=r1"), /artifact 1-spec\/spec\.md .*APPROVED/);
  });

  test("--target-phase reports completion", () => {
    runRp(root, "stamp", pipelineFile("1-spec/spec.md"), "--pin", pipelineFile("0-intent/intent.md"));
    review("1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n", ["1-spec/spec.md"], ["lane=r1", "iteration=1"]);
    assert.match(runRp(root, "check", PIPELINE, "--lanes", "r1", "--target-phase", "1"), /complete through phase 1 — target reached/);
    assert.match(runRp(root, "check", PIPELINE, "--lanes", "r1", "--target-phase", "2"), /complete through phase 1 \(target 2\)/);
  });

  test("every Origin line is mirrored, and head records the commit the stamp observed", () => {
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "seed");
    writePipelineFile(root, "0-intent/intent.md", "Origin: issue 7\nOrigin: starts-from 6-other\n\n# Intent\n");
    runRp(root, "stamp", pipelineFile("0-intent/intent.md"), "--mirror");
    const text = readFileSync(join(root, pipelineFile("0-intent/intent.md")), "utf8");
    assert.match(text, /origin:\n  - issue 7\n  - starts-from 6-other/);
    const head1 = text.match(/head: ([0-9a-f]{12})/)[1];
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "second");
    runRp(root, "stamp", pipelineFile("0-intent/intent.md"), "--mirror");
    const head2 = readFileSync(join(root, pipelineFile("0-intent/intent.md")), "utf8").match(/head: ([0-9a-f]{12})/)[1];
    assert.notEqual(head2, head1);
  });

  test("a claim raised inside a production lane reaches the frontier, and lanes have counters", () => {
    rmSync(join(root, pipelineFile("1-spec/spec.md")));
    for (const k of [1, 2]) {
      writePipelineFile(root, `1-spec/lane-${k}/spec.md`, `# Spec lane ${k}\n`);
      writePipelineFile(root, `1-spec/lane-${k}/spec-research.md`, `# Record ${k}\n`);
      runRp(root, "stamp", pipelineFile(`1-spec/lane-${k}/spec.md`), "--pin", pipelineFile("0-intent/intent.md"));
    }
    review("1-spec/lane-1/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n", ["1-spec/lane-1/spec.md", "1-spec/lane-1/spec-research.md"], ["lane=r1", "iteration=1"]);
    review("1-spec/lane-2/spec-review-1.md", "# Review\n\nVerdict: rejected\n", ["1-spec/lane-2/spec.md", "1-spec/lane-2/spec-research.md"], ["lane=r1", "iteration=1"]);
    review("1-spec/lane-2/spec-review-2.md", "# Review\n\nVerdict: approved\n", ["1-spec/lane-2/spec.md", "1-spec/lane-2/spec-research.md"], ["lane=r1", "iteration=2"]);
    const output = runRp(root, "check", PIPELINE, "--lanes", "r1");
    assert.match(output, /claim\s+1-spec\/lane-1\/spec-review-1\.md → 0-intent\/intent\.md#goal\s+PENDING — owner escalation/);
    assert.match(output, /lane\s+1-spec\/lane-1\/spec\.md\s+FRESH\s+reviews: r1:unsatisfiable/);
    assert.match(output, /counter\s+1-spec\/lane-1\/spec: 1 wave this episode/);
    assert.doesNotMatch(output, /counter\s+1-spec\/lane-2\/spec/);
  });

  test("check --json emits the complete state shape", () => {
    const state = JSON.parse(runRp(root, "check", PIPELINE, "--json"));

    for (const key of ["pipeline", "triggers", "claims", "artifacts", "tasks", "counters", "completeThrough", "complete"]) {
      assert.ok(key in state, `missing ${key}`);
    }
  });
});
