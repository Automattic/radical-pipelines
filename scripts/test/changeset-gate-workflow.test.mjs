import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Flow 8 (CI wiring): the drift check runs on PRs to `trunk` but not the bot PR.
 *
 * The check is wired as a step in the existing `changeset` job, so it inherits
 * that job's `pull_request → trunk` trigger and its `if` bot-PR exemption rather
 * than introducing a new job or workflow. These assertions verify the in-tree
 * wiring; whether the workflow is a *required* status check that blocks merge is
 * GitHub branch-protection configuration, not expressible in-tree.
 */

/** Absolute path to the Changeset Gate workflow, resolved from this test file. */
const WORKFLOW_PATH = fileURLToPath(
  new URL("../../.github/workflows/changeset-gate.yml", import.meta.url),
);

const workflow = readFileSync(WORKFLOW_PATH, "utf8");

/**
 * Slice the YAML text covering a single top-level job's block: everything from
 * the job key (indented two spaces under `jobs:`) up to the next job key at the
 * same indentation, or end of file. This scopes assertions to that job so a
 * step in some *other* job cannot satisfy them.
 *
 * @param {string} text The full workflow YAML.
 * @param {string} jobId The job key to extract (e.g. `changeset`).
 * @returns {string} The text block belonging to that job.
 */
function jobBlock(text, jobId) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === `  ${jobId}:`);
  assert.notEqual(start, -1, `expected a job named "${jobId}"`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    // Next two-space-indented key marks the start of a sibling job.
    if (/^ {2}\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

describe("changeset-gate workflow wiring (Flow 8)", () => {
  test("triggers on pull_request to trunk", () => {
    assert.match(workflow, /\bon:/);
    assert.match(workflow, /pull_request:/);
    assert.match(workflow, /branches:\s*\[trunk\]/);
  });

  test("exactly one `changeset` job exists", () => {
    const occurrences = workflow.match(/^ {2}changeset:$/gm) ?? [];
    assert.equal(occurrences.length, 1);
  });

  test("the changeset job carries the bot-PR `if` exemption", () => {
    const block = jobBlock(workflow, "changeset");
    assert.match(block, /if:\s*github\.head_ref != 'changeset-release\/trunk'/);
  });

  test("the changeset job runs the drift check as a step", () => {
    const block = jobBlock(workflow, "changeset");
    assert.match(block, /run:\s*node scripts\/check-version-sync\.mjs/);
  });

  test("no new job or duplicate setup is introduced for the drift check", () => {
    // Single checkout and single Node setup keep the step inheriting the job's
    // existing environment rather than re-establishing it.
    assert.equal((workflow.match(/uses: actions\/checkout@/g) ?? []).length, 1);
    assert.equal((workflow.match(/uses: actions\/setup-node@/g) ?? []).length, 1);
    // Only `changeset` appears as a job under `jobs:` — no new workflow/job.
    const jobsSection = workflow.slice(workflow.indexOf("\njobs:"));
    assert.equal((jobsSection.match(/^ {2}\S+:$/gm) ?? []).length, 1);
  });
});
