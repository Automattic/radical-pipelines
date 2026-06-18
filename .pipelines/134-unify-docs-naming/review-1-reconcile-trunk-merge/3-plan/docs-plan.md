# Docs Plan: Reconcile docs-naming with the merged trunk

## Overview

This is a REVIEW run of the `134-unify-docs-naming` pipeline. The code change is a
prose-only identifier/wording rename: a single anchor-relaxed substitution applied to 2
trunk-introduced skill reference files
(`skills/radical-pipelines/reference/guardrails.md` and
`skills/radical-pipelines/reference/conventions/passing.md`), converting the 10 remaining
singular documentation-phase concept tokens `doc` → `docs`. The two files being edited are
themselves skill prose; the code task rewrites them in place, so it already produces every
word that lands in them.

This plan is the result of an end-to-end sweep for documentation surfaces that the rename
affects or that reference the renamed documentation-phase concept and could now be out of
sync. **The sweep found no documentation work needed beyond what the code task already
covers, and confirmed the existing changeset stub already satisfies the Changeset Gate.**
The tasks below are therefore verification/assessment tasks recording that conclusion, not
new authoring work. The justification is in each task.

## Tasks

### Task 1: Confirm no out-of-sync documentation surface beyond the two in-scope files

- **Goal:** Verify, by re-running the acceptance oracle and re-sweeping the tree, that no
  documentation surface outside the two files the code task edits still references the
  documentation-phase concept in the singular or otherwise contradicts the rename — i.e.
  there is no additional doc to write or update.
- **Audience:** Maintainers and pipeline contributors who read the skill, the agent
  rosters, and the project's top-level docs.
- **Files to change:** None expected. This task verifies the rest of the tree is already
  in sync; if the sweep surfaces a genuine straggler outside the two in-scope files, that
  is a blocker to report to the orchestrator (it would mean the spec's "only 2 files carry
  stragglers" premise is wrong), not a doc to silently add here.
- **Sections / scope:** The whole tracked tree except the frozen records the spec excludes
  (`.pipelines/**`, the published `CHANGELOG.md`, and `pr-description.md`). Concept-bearing
  surfaces already confirmed in sync and therefore needing no change: the README agent
  roster, the `.rp.md` Agent models table, the four `docs-*` agent profiles, `SKILL.md`,
  the conventions `setup.md`, the assisted/autonomous phase-2/3 files, the phase-5
  `5 - docs.md`, `pipeline-versioning.md`, and `website/demo.js` — all already plural,
  having survived the base run's rename through the trunk merge. README's prose about the
  Guardrails convention (the convention overview and the `.rp.md` shared-section list)
  describes the convention generically and links to the loader/setup files; it does not
  restate the `guardrails.md` / `passing.md` agent roster or the `doc plan` / `doc-run`
  phrasing, so the rename does not touch it.
- **Depends on:** none
- **Traces to:** Spec Acceptance Criterion "Acceptance oracle (Option B) → 0"; Spec "Out
  of Scope → Everything else in the post-merge tree, already correct"; Design "Out of
  scope". Documents the same surfaces touched/left by Code task 1.
- **Acceptance:**
  - After the code change, the Option-B acceptance oracle (all tracked files except
    `.pipelines/`, `CHANGELOG.md`, `pr-description.md`) returns 0, demonstrating no
    documentation-phase concept straggler survives anywhere in the in-scope tree — i.e. no
    other documentation surface is left referencing the singular concept form.
  - The README agent roster and the `.rp.md` Agent models table read in the plural
    documentation-phase concept form, with no edit required by this review.
  - No file outside the two in-scope skill reference files is modified by the
    documentation phase.

### Task 2: Confirm the changeset entry satisfies the Changeset Gate (no new entry needed)

- **Goal:** Assess whether the review's incremental change needs a changeset entry and
  record the conclusion: the change touches only `skills/**` (release-relevant under the
  Changeset Gate), and the pre-existing empty `.changeset/unify-docs-naming.md` already
  satisfies both gate checks, so no new or modified changeset is required.
- **Audience:** Contributors and reviewers who need to know whether this PR clears the
  Changeset Gate, and the maintainer merging it.
- **Files to change:** None. The existing `.changeset/unify-docs-naming.md` is left as-is;
  `CONTRIBUTING.md` (which documents the gate) and the changeset README need no edits —
  the rename introduces no new behavior, path, or policy for them to describe.
- **Sections / scope:** The Changeset Gate as documented in `CONTRIBUTING.md` (the
  "release-relevant paths" list, the Shape + Presence checks, the empty-changeset / `none`
  bump for prose-only edits to a release-relevant file) and the canonical-empty form the
  validator (`scripts/validate-changesets.mjs`) accepts. The assessment, not an edit to
  these files.
- **Depends on:** none
- **Traces to:** The Changeset Gate convention in `CONTRIBUTING.md` ("a changeset is
  required when a PR changes any release-relevant path"; `skills/**` is release-relevant);
  Spec "Out of Scope → The empty `.changeset/unify-docs-naming.md` is an intentional
  base-run stub, not a breakage"; Code task 1 (which edits only files under `skills/**`).
- **Acceptance:**
  - The assessment records that the change is release-relevant (it edits files under
    `skills/**`) and is a prose-only rename that should not bump the version, so the
    correct artifact is an empty (`none`) changeset.
  - The assessment records that the pre-existing `.changeset/unify-docs-naming.md` is in
    the validator's canonical-empty form (empty front matter and empty body) and therefore
    passes the gate's Shape check, and that its mere presence satisfies the gate's Presence
    check — so no changeset needs to be added or modified for this review.
  - The conclusion is "no changeset work needed", with the reasoning above, rather than an
    instruction to author a changeset.

## Guardrail scopes

None.
