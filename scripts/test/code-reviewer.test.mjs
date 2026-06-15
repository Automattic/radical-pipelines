import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the code-reviewer agent, resolved relative to this test file. */
const AGENT_PATH = fileURLToPath(
  new URL("../../agents/code-reviewer.md", import.meta.url),
);

const agent = readFileSync(AGENT_PATH, "utf8");

/** The "### 3. Behavior verification" step, sliced up to the next ### heading. */
const step3 =
  agent.match(/###\s*3\.\s*Behavior verification[\s\S]*?(?=\n### )/)?.[0] ?? "";

/** The evidence sentence that must remain byte-identical and close the step. */
const EVIDENCE_SENTENCE =
  "A verification claim without evidence is not a verification — either produce the evidence or reject the batch.";

/** The free-form verification body that must remain byte-identical. */
const FREEFORM_BODY =
  "If any task in the batch changes user-observable behavior — UI, CLI output, generated files, API responses, log output, anything a user or downstream consumer can see — exercise it end-to-end yourself: drive the changed path the way a user or downstream consumer would reach it, and confirm the new behavior actually happens. Decide the evidence appropriate to what changed and capture it (screenshots, transcripts, output samples, response diffs). This is behavior verification, not a guardrail — it is a step you perform here, separate from running the guardrails in step 4.";

describe("code-reviewer step 3 behavior verification", () => {
  test("retains the free-form verification body byte-identical", () => {
    assert.ok(
      step3.includes(FREEFORM_BODY),
      "step 3 must keep the free-form verification body byte-identical",
    );
  });

  test("retains the evidence sentence byte-identical", () => {
    assert.ok(
      step3.includes(EVIDENCE_SENTENCE),
      "step 3 must keep the evidence sentence byte-identical",
    );
  });

  test("adds a re-drive sentence tied to the plan's E2E test plan", () => {
    assert.match(
      step3,
      /re-drive/i,
      "step 3 must instruct the reviewer to re-drive the planned flows",
    );
    assert.match(
      step3,
      /E2E test plan section of `code-plan\.md`/,
      "the re-drive sentence must name the E2E test plan section of code-plan.md",
    );
    assert.match(
      step3,
      /Steps/,
      "the re-drive sentence must instruct performing the flow's Steps",
    );
    assert.match(
      step3,
      /Expected outcome/,
      "the re-drive sentence must instruct confirming the flow's Expected outcome",
    );
  });

  test("positions the re-drive sentence before the evidence sentence", () => {
    const reDriveAt = step3.search(/re-drive/i);
    const evidenceAt = step3.indexOf(EVIDENCE_SENTENCE);
    assert.notEqual(reDriveAt, -1, "step 3 must contain a re-drive sentence");
    assert.notEqual(evidenceAt, -1, "step 3 must contain the evidence sentence");
    assert.ok(
      reDriveAt < evidenceAt,
      "the re-drive sentence must precede the evidence sentence",
    );
  });

  test("keeps the free-form body before the re-drive sentence", () => {
    const bodyAt = step3.indexOf(FREEFORM_BODY);
    const reDriveAt = step3.search(/re-drive/i);
    assert.ok(
      bodyAt !== -1 && bodyAt < reDriveAt,
      "the free-form body must precede the re-drive sentence",
    );
  });
});

describe("code-reviewer test-quality check", () => {
  /** The "### 2. Review the changes" step, sliced up to the next ### heading. */
  const step2 =
    agent.match(/###\s*2\.\s*Review the changes[\s\S]*?(?=\n### )/)?.[0] ?? "";

  /** The single "- **Test quality** — …" bullet line. */
  const testQuality =
    step2.match(/- \*\*Test quality\*\* —[^\n]*/)?.[0] ?? "";

  test("ties end-to-end presence to the plan's E2E test plan", () => {
    assert.match(
      testQuality,
      /E2E test plan/,
      "the test-quality check must tie e2e presence to the plan's E2E test plan",
    );
  });

  test("no longer ties e2e presence to behavior the batch changed", () => {
    assert.doesNotMatch(
      testQuality,
      /any user-observable behavior the batch changed/,
      "the test-quality check must not tie e2e presence to derived behavior",
    );
  });

  test("still ties unit tests to per-task Acceptance", () => {
    assert.match(
      testQuality,
      /unit tests trace to per-task Acceptance/,
      "the test-quality check must keep the unit-test clause",
    );
  });
});

describe("code-reviewer untouched regions", () => {
  test("review template's Behavior verification section is byte-identical", () => {
    assert.ok(
      agent.includes(
        "## Behavior verification\n\n<!-- Only if applicable. The evidence you captured exercising the changed behavior end-to-end. -->",
      ),
      "the review template's Behavior verification section must be unchanged",
    );
  });

  test("the Run the guardrails guideline is byte-identical", () => {
    assert.ok(
      agent.includes(
        "- **Run the guardrails.** Don't just read the code. A review without verification evidence is not a review. When your step-2/3 judgment leaves no rejection finding, run every gate per step 4 and approve only if all pass. If you already reject on judgment, skip them and go to step 5.",
      ),
      "the Run the guardrails guideline must be unchanged",
    );
  });
});
