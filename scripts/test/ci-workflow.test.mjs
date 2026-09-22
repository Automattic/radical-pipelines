import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

/** Absolute path to the pull-request CI workflow. */
const WORKFLOW_PATH = fileURLToPath(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
);

/** Raw text of the CI workflow (formatting-preserving read). */
const RAW = readFileSync(WORKFLOW_PATH, "utf8");

/** Workflow lines, trailing newline excluded so the last entry is real content. */
const LINES = RAW.replace(/\n$/, "").split("\n");

/**
 * Index of the first line whose trimmed text equals `needle`, or `-1` when no
 * line matches. Used to assert relative ordering of workflow steps by the line
 * that carries their `run:` command or `name:`.
 *
 * @param {string} needle - Exact trimmed line text to locate.
 * @returns {number} Zero-based line index, or `-1` if absent.
 */
function lineIndex(needle) {
  return LINES.findIndex((line) => line.trim() === needle);
}

/**
 * Number of lines whose trimmed text equals `needle`. Used to assert a step
 * or guard is present in every job exactly once.
 *
 * @param {string} needle - Exact trimmed line text to count.
 * @returns {number} Count of matching lines.
 */
function lineCount(needle) {
  return LINES.filter((line) => line.trim() === needle).length;
}

/** The four jobs the CI workflow must define, in order. */
const JOBS = ["changeset:", "rp:", "opencode-plugin:", "opencode-integration:"];

describe("ci.yml pull-request checks", () => {
  test("the workflow defines exactly the four checks", () => {
    // Job names are the 2-space-indented keys inside the top-level `jobs:` block.
    const jobsIdx = LINES.indexOf("jobs:");
    assert.ok(jobsIdx !== -1, "expected a top-level `jobs:` block");
    const jobHeaders = LINES.slice(jobsIdx + 1)
      .filter((line) => /^ {2}\w[\w-]*:$/.test(line))
      .map((line) => line.trim());
    assert.deepEqual(jobHeaders, JOBS, "only the four checks may exist");
  });

  test("every job carries the bot-PR exemption", () => {
    assert.equal(
      lineCount("if: github.head_ref != 'changeset-release/trunk' # bot-PR exemption"),
      JOBS.length,
      "each job must exempt the Version Packages PR",
    );
  });

  test("every job sets up Node 22 with the npm cache", () => {
    assert.equal(lineCount("node-version: 22"), JOBS.length);
    assert.equal(lineCount("cache: npm"), JOBS.length);
  });

  test("every job installs before testing", () => {
    assert.equal(lineCount("- run: npm ci"), JOBS.length);
  });

  test("each job runs its own suite", () => {
    assert.ok(lineIndex("- run: npm run test:release") !== -1, "changeset runs test:release");
    assert.ok(lineIndex("- run: npm run test:rp") !== -1, "rp runs test:rp");
    assert.ok(
      lineIndex("- run: npm run test:opencode-unit") !== -1,
      "opencode-plugin runs test:opencode-unit",
    );
    assert.ok(
      lineIndex("- run: npm run test:opencode") !== -1,
      "opencode-integration runs test:opencode",
    );
  });

  test("the changeset job fetches full history for the base comparison", () => {
    assert.ok(lineIndex("fetch-depth: 0") !== -1, "checkout must fetch all refs");
  });

  test("the changeset job runs the drift guard", () => {
    assert.ok(
      lineIndex("run: node scripts/check-version-sync.mjs") !== -1,
      "expected a step running `node scripts/check-version-sync.mjs`",
    );
  });

  test("the drift-guard step carries a descriptive name", () => {
    const runIdx = lineIndex("run: node scripts/check-version-sync.mjs");
    const nameIdx = runIdx - 1;
    assert.ok(
      LINES[nameIdx].trim().startsWith("- name:"),
      "drift-guard `run:` must be preceded by a `- name:` line, mirroring the existing named steps",
    );
  });

  test("the drift guard runs after `npm ci` and `npm run test:release`", () => {
    // `npm ci`/`npm run test:release` are bare inline-`run` list items
    // (`- run: …`), whereas the named steps place `run:` on its own line;
    // match either form.
    const ciIdx = lineIndex("- run: npm ci");
    const testIdx = lineIndex("- run: npm run test:release");
    const guardIdx = lineIndex("run: node scripts/check-version-sync.mjs");

    assert.ok(ciIdx !== -1 && testIdx !== -1, "expected `npm ci` and `test:release` steps");
    assert.ok(guardIdx > ciIdx, "drift guard must run after `npm ci`");
    assert.ok(guardIdx > testIdx, "drift guard must run after `test:release`");
  });

  test("the drift guard is adjacent to the changeset-shape validation step", () => {
    const guardIdx = lineIndex("run: node scripts/check-version-sync.mjs");
    const validateIdx = lineIndex("run: node scripts/validate-changesets.mjs");

    assert.ok(validateIdx !== -1, "expected the existing changeset-shape validation step");
    // Adjacent steps: each is a `- name:` header followed by its `run:` line, so
    // the two `run:` lines sit three lines apart (run, blank, name, run).
    assert.equal(
      Math.abs(guardIdx - validateIdx),
      3,
      "drift guard step must sit directly beside the validate-changesets step",
    );
  });

  test("the require-a-changeset step is unaltered", () => {
    assert.ok(
      lineIndex(
        "run: npx changeset status --since=origin/${{ github.event.pull_request.base.ref }}",
      ) !== -1,
      "the existing changeset-status step must remain verbatim",
    );
  });

  test("job-level permissions are unchanged", () => {
    assert.ok(lineIndex("contents: read") !== -1, "`contents: read` must remain");
    assert.ok(
      lineIndex("pull-requests: read") !== -1,
      "`pull-requests: read` must remain",
    );
  });

  test("the concurrency block is unchanged", () => {
    assert.ok(
      lineIndex("group: ci-${{ github.head_ref || github.ref }}") !== -1,
      "concurrency `group` must remain",
    );
    assert.ok(
      lineIndex("cancel-in-progress: true") !== -1,
      "concurrency `cancel-in-progress` must remain",
    );
  });

  test("the workflow is well-formed YAML: every step is a single mapping entry", () => {
    // A built-in structural check (the project ships no YAML parser): each step
    // begins with a `- ` list marker and the file uses consistent 2-space indent.
    const stepMarkers = LINES.filter((line) => /^ {6}- /.test(line)).length;
    assert.ok(stepMarkers >= 19, "expected all four jobs' steps to remain");
    // No tab characters: tabs are illegal indentation in YAML.
    assert.ok(!RAW.includes("\t"), "YAML indentation must not contain tab characters");
    // The file ends in exactly one trailing newline.
    assert.ok(RAW.endsWith("\n") && !RAW.endsWith("\n\n"), "file must end in one newline");
  });
});
