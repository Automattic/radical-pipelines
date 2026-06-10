import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

/**
 * Resolve a reference file under `skills/radical-pipelines/reference/` relative
 * to this test file, so the suite is location-independent.
 *
 * @param {string} name File name within the reference directory.
 * @returns {string} The file's contents.
 */
function reference(name) {
  return readFileSync(
    fileURLToPath(
      new URL(`../../skills/radical-pipelines/reference/${name}`, import.meta.url),
    ),
    "utf8",
  );
}

const createPipeline = reference("create-pipeline.md");
const manageIssues = reference("manage-issues.md");
const workOnAnIssue = reference("work-on-an-issue.md");
const autonomousWorkflow = reference("autonomous-workflow.md");
const assistedWorkflow = reference("assisted-workflow.md");
const forkPipeline = reference("fork-pipeline.md");
const resumePipeline = reference("resume-pipeline.md");
const pipelineVersioning = reference("pipeline-versioning.md");

/**
 * The reference files the step-4 rewrite is asserted NOT to have changed. The
 * step-4 rewrite delegates to and is pointed at by these; Task 7 locks the
 * cross-file invariants that keep them coherent without editing them.
 */
const NEIGHBORS = {
  "manage-issues.md": manageIssues,
  "work-on-an-issue.md": workOnAnIssue,
  "autonomous-workflow.md": autonomousWorkflow,
  "assisted-workflow.md": assistedWorkflow,
  "fork-pipeline.md": forkPipeline,
  "resume-pipeline.md": resumePipeline,
  "pipeline-versioning.md": pipelineVersioning,
};

describe("create-pipeline neighbors — Task 7 delegation targets exist (no dangling cross-references)", () => {
  test("create-pipeline.md step 4 cross-references manage-issues.md (the delegation source)", () => {
    // The step-4 rewrite delegates the canonical format, the heading taxonomy,
    // the input→section classification rule, and the render→show→approve idiom
    // to manage-issues.md instead of re-listing them. The cross-reference must
    // actually be present for the rest of these assertions to matter.
    assert.match(createPipeline, /manage-issues\.md/);
  });

  test("manage-issues.md still carries the canonical issue/intent format step 4 points to", () => {
    // The delegation target heading must exist: this is the section that owns
    // the format step 4 says is "defined in manage-issues.md".
    assert.match(manageIssues, /##\s+The issue format/);
    // And it must still state the issue body IS the phase-0 intent written to
    // 0-intent/intent.md — so the "turns the issue into intent.md" framing that
    // create-pipeline.md implements stays the source description.
    assert.match(manageIssues, /0-intent\/intent\.md/);
    assert.match(manageIssues, /phase-0 intent/i);
  });

  test("manage-issues.md still enumerates exactly the four body headings the gate delegates to", () => {
    // Clause A of the skip gate admits "the four recognized headings, spelled
    // exactly as in manage-issues.md". Those four must be present and spelled
    // exactly here, or step 4's "spelled exactly as in manage-issues.md" and
    // "four recognized headings" dangle.
    assert.match(manageIssues, /\*\*Goal\*\*/);
    assert.match(manageIssues, /\*\*Constraints\*\*/);
    assert.match(manageIssues, /\*\*Context\*\*/);
    assert.match(manageIssues, /\*\*Assumptions \/ directions to explore\*\*/);
  });

  test("manage-issues.md still carries the input→section classification rule the synthesis arm delegates to", () => {
    // The synthesis arm sorts each piece "per the format in manage-issues.md —
    // that file supplies … the input→section classification rule". Lock that
    // the classification mapping lives here (not re-listed in create-pipeline).
    assert.match(manageIssues, /→\s+\*\*Constraints\*\*/);
    assert.match(manageIssues, /→\s+\*\*Context\*\*/);
    assert.match(manageIssues, /→\s+\*\*Assumptions/);
  });

  test("manage-issues.md still carries the content guardrails the synthesis arm delegates to", () => {
    // "Goal as an outcome, hypotheses labeled open, never substitute a different
    // goal" — the guardrails create-pipeline.md says manage-issues.md supplies.
    assert.match(manageIssues, /outcome/i);
    assert.match(manageIssues, /labeled open|labelled open/i);
    assert.match(manageIssues, /never silently substitute a different goal/i);
  });

  test("manage-issues.md still carries the render→show→approve idiom the confirm loop delegates to", () => {
    // The synthesis arm "follow[s] the render→show→approve idiom of
    // manage-issues.md". Lock that draft/show/approve step still exists there.
    assert.match(manageIssues, /Draft, confirm, write/);
    assert.match(manageIssues, /until the owner explicitly approves|owner explicitly approves|owner approves/i);
  });
});

describe("create-pipeline neighbors — Task 7 pointers and phase-0 framing stay accurate", () => {
  test("work-on-an-issue.md still routes pipeline creation through create-pipeline.md", () => {
    // The pointer is a bare delegation, so it picks up the step-4 rewrite with
    // no edit. Lock that the pointer still exists and still names the file.
    assert.match(workOnAnIssue, /create-pipeline\.md/);
  });

  test("both workflow files still mark phase 0 as Already in place (no phase-0 reference to run)", () => {
    // Phase 0 is produced by create-pipeline.md before either workflow starts,
    // so the workflow dispatch tables must keep treating it as already done —
    // never pointing at a 0-intent phase reference of their own.
    assert.match(autonomousWorkflow, /0\s*-\s*Intent[\s\S]*?Already in place/);
    assert.match(assistedWorkflow, /0\s*-\s*Intent[\s\S]*?Already in place/);
  });

  test("the autonomous 'no questions' rule is scoped to after the run starts", () => {
    // create-pipeline.md step 4's synthesis arm may ask the owner to confirm the
    // intent. That happens during phase-0 creation, BEFORE the autonomous run
    // starts — so the autonomous "do not ask the owner" rule, which is scoped to
    // after the run starts, needs no carve-out. Lock that scoping.
    assert.match(
      autonomousWorkflow,
      /Once the autonomous run starts,\s+do not ask the owner/i,
    );
  });
});

describe("create-pipeline neighbors — Task 7 fork/resume/versioning invariants vs. the no-approval-file decision", () => {
  test("pipeline-versioning.md keeps the phase-0 predicate as the single file 0-intent/intent.md", () => {
    // The no-approval-file decision rests on phase 0 completing with exactly one
    // content artifact. Lock that the phase-0 completion predicate is precisely
    // `0-intent/intent.md` — no companion approval/review file.
    assert.match(pipelineVersioning, /0\s*–?-?\s*Intent[^\n]*`0-intent\/intent\.md`/);
    // No phase-0 review/approved companion file is part of the predicate.
    assert.doesNotMatch(pipelineVersioning, /0-intent\/[^\s`]*review-approved/);
    assert.doesNotMatch(pipelineVersioning, /intent-review-approved/);
  });

  test("pipeline-versioning.md keeps 0-intent as the always-shared root via byte-identity", () => {
    // The shared-root invariant: 0-intent is byte-identical across every pipeline
    // of an issue, so it is always the shared root. Writing no approval file (one
    // content file + assets) keeps this true; lock the invariant text.
    assert.match(pipelineVersioning, /byte-identical/);
    assert.match(pipelineVersioning, /`0-intent`[\s\S]*shared root|always the shared root/);
  });

  test("fork-pipeline.md still copies 0-intent verbatim from the parent", () => {
    // Forks copy the inherited phase folders verbatim (cp -r), starting at
    // 0-intent. With no approval file, 0-intent is just intent.md + assets, so
    // the verbatim copy stays correct. Lock the verbatim-copy instruction.
    assert.match(forkPipeline, /cp -r .*<phase>/);
    assert.match(forkPipeline, /`0-intent`/);
    assert.match(forkPipeline, /Copy only the phase folders being inherited/);
  });

  test("resume-pipeline.md never re-runs phase 0 (resume point is at or after the completed phase)", () => {
    // Resume re-attaches and resumes at the active phase or the phase after the
    // completed one — it never re-creates phase 0. So the step-4 rewrite (which
    // only ever runs once, at creation) is never re-triggered on resume.
    assert.match(
      resumePipeline,
      /resume point is the phase \*\*after\*\* the completed phase|active phase[\s\S]*resume point/i,
    );
    assert.doesNotMatch(resumePipeline, /re-?run[\s\S]{0,40}phase 0/i);
    assert.doesNotMatch(resumePipeline, /create-pipeline\.md/);
  });
});

describe("create-pipeline neighbors — Task 7 confinement: no feature-introduced tool leakage in neighbors", () => {
  test("no neighbor file names a concrete gh/--json tool (reads stay at Issues-convention altitude)", () => {
    // The feature deliberately keeps issue/comment reads at the abstract Issues
    // convention altitude (no `gh`, no `--json`). None of the neighbors should
    // have acquired a concrete tool name as a side effect of this change.
    for (const [name, contents] of Object.entries(NEIGHBORS)) {
      assert.doesNotMatch(contents, /\bgh\b/, `${name} must not name the gh CLI`);
      assert.doesNotMatch(contents, /--json/, `${name} must not name --json`);
    }
  });

  test("no neighbor file mentions the legacy phase-name 'Prompt' as a heading or phase label", () => {
    // The feature renames the phase-0 framing away from "Prompt"/"prompt"; the
    // neighbors must not reintroduce a "# Prompt" H1 or a "Prompt" phase label.
    for (const [name, contents] of Object.entries(NEIGHBORS)) {
      assert.doesNotMatch(
        contents,
        /(^|\n)#\s+Prompt\b/i,
        `${name} must not carry a # Prompt heading`,
      );
      assert.doesNotMatch(
        contents,
        /\bPrompt\s*\|/,
        `${name} must not label a phase "Prompt"`,
      );
    }
  });
});
