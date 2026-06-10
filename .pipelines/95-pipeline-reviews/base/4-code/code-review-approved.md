# Code Review — APPROVED

**Batch:** Tasks 1–12 (the initial code batch for the "Reviews" feature, GitHub issue #95).
**Diff inspected:** `1265233..HEAD` (12 code-writer commits, `fd4a61d` … `f7cb69b`).
**Verdict:** Approved.

## Checks

| Check | Command / method | Result |
| --- | --- | --- |
| JS tooling regression gate | `node --test scripts/test/*.test.mjs` (Node v20.20.1; `npm test` avoided per its Node≥21 `**` glob) | PASS — 22 pass, 0 fail |
| Commits present | `git log --oneline 1265233..HEAD` | 12 commits, one per task, correct commit format |
| Files changed | `git diff --name-only 1265233..HEAD` | 19 files — exactly the planned set (2 new + 17 edited); no out-of-batch files |
| Substantive verification | Read each diff + grep each Acceptance criterion against edited files | All criteria met (per-task + cross-cutting) |

## Per-task verification

- **Task 1 (`pipeline-versioning.md`).** `### Runs within a pipeline` and `### Reviewer base ref` subsections added under `## Model`, with run definition, `<artifacts-folder>/<run>/<phase>` path shape, `base` always-first, `review-N-<short-description>` naming with `N` as per-pipeline monotonic counter, and the four "a run is NOT" negations. The six predicate-table rows are textually unchanged (verified: diff shows no `+`/`-` on the rows); exactly one new sentence after the table binds the predicate to `<artifacts-folder>/<run>/<phase>`. State now reads from the latest run, distinguishes pipeline state vs. per-run completion, and uses "next phase" (not "active phase") for the prompt-only-review case. Both `git rev-parse` lineage/tree paths read `…/base/<phase>`, and the prose states the tree is built over `base/` only and reviews are not nodes. Reviewer base-ref rule resolves review→prior-run tip and base→merge-base, captured once. Rendering bullet describes the `base → review-1-… → …` chain as metadata, not nodes. No legacy/migration/dual-shape language.

- **Task 2 (`prompt-format.md`, new).** Exists with `## Schema and rendering` (Title, Goal required, Constraints, Context, Assumptions; omit-empty / no-`N/A`; "vague idea → Title + Goal" sentence) and `## Authoring discipline` (the four discipline points). Contains NO Origin hook and NO tracker-write rule (the intro line merely names "a tracker issue body, a base prompt, or a review prompt" — not a hook).

- **Task 3 (`create-pipeline.md`).** Step 4 creates `base/0-prompt/` and writes to `<artifacts-folder>/base/0-prompt/prompt.md`, cross-referencing "Runs within a pipeline". Asset sub-bullet uses `base/0-prompt/`. Discipline restatement removed; transform bullet now points to `prompt-format.md` and keeps the base-site-specific issue→prompt instruction. No flat path remains.

- **Task 4 (`manage-issues.md`).** Schema bullets, omit-empty rule, and the four discipline bullets removed and replaced with `prompt-format.md` pointers. Issue↔prompt sentence retained and now reads `base/0-prompt/prompt.md`. Tracker-only "do not write to the tracker until the owner approves" rule kept. Steps 1–5 and Close out unchanged (the only step-region diff line is the removed discipline bullet that moved to `prompt-format.md`; the step-4 heading "Reflect hypotheses back as open" is a pre-existing operational step, not restated format prose).

- **Task 5 (`fork-pipeline.md`).** `cp -r` command in step 5 has the `base/` prefix on both source (`…/base/<phase>`) and destination (`<artifacts-folder>/base/<phase>`). Step 4 and step 5 prose state the fork seeds a fresh `base/` from the parent's `base/` and never inherits `review-*`. Step 7 adds the run-layer continuation note. No legacy handling.

- **Task 6 (`autonomous-workflow.md`, `assisted-workflow.md`).** Autonomous **Artifact folder** handoff bullet now hands the active run's folder (`<artifacts-folder>/<run>/`) and states the agent never sees the run name. Autonomous "For each phase" step 1 and assisted "Execute the phase" both name the active run's folder; the "in progress"/predicate wording is otherwise unchanged. A single base-ref capture-at-start line is added as run-wide setup (after the health-monitor line, before the phase table), referencing the **Reviewer base ref** rule. No agent profile changed by this task.

- **Task 7 (`resume-pipeline.md`).** Step 3 evaluates state within the pipeline's latest run and reads artifacts inside that run's folder. Step 4 scopes the resume point to "the latest run's completed phase"; rollback still reverts only the active phase. The two re-attach headings ("Cancel any leftover health monitor", "Re-attach to the branch and worktree") are unchanged verbatim.

- **Task 8 (`4 - code.md`, `5 - docs.md`).** Both reviewer-launch steps now reference the **Reviewer base ref** rule in `pipeline-versioning.md` at the base-ref handoff, symmetrically; neither restates the derivation; reviewer inputs otherwise unchanged.

- **Task 9 (`review-pipeline.md`, new).** Seven ordered steps in the required sequence (preconditions → advisories → re-attach + base-ref capture → create run folder → author+commit prompt → re-assert version → return to dispatch). Step 1 re-checks both gates, steers to resume/fork on completeness failure and to a new issue on merged, and states these are the only preconditions. Step 2 runs both advisories as non-gating and confirms count/boundaries before any run folder. Step 3 cites resume's two headings by name, skips rollback, never creates a branch, captures the prior-run-tip base ref before the prompt commit. Step 5 authors at `review-N-<short-description>/0-prompt/prompt.md` via a `prompt-format.md` pointer (no restatement) and specifies a mandatory, self-contained, review-only Origin section plus the review-source asset rule. Step 6 re-asserts (does not change) the version. Step 7 returns to `work-on-an-issue.md` step 3, notes assisted-only incompleteness, and carries the generic R27 obligations pointer (no Linear/push/version specifics) including existing-issue/no-new-issue and monitor lifecycle. Ends "Return to `work-on-an-issue.md`." No legacy handling, no recovery note.

- **Task 10 (`work-on-an-issue.md`).** Review bullet reads `review-pipeline.md` then "continue to step 3". Merge and Close bullets present and textually unchanged (still unwired). RESUME/REVIEW/FORK decision-rule block inserted at the top-level bullet indent (sibling of Resume/Fork, NOT nested in the phase-5 sub-block) with the three definitions and the same-branch-build-on-existing vs. new-branch-from-main discriminator.

- **Task 11 (six reviewer profiles).** All six Approved bullets now read "(no number; only one ever exists in this artifact folder)"; none reads "per pipeline"; none uses "per run". No other line in any of the six changed; no other agent profile changed.

- **Task 12 (`.rp.md`).** Version-label trigger list now reads "(creating, resuming, forking, or reviewing)". Per-phase status bullet carries the one-sentence note that a review re-cycles from `1 - Spec` through `5 - Docs` and that `0 - Prompt` fires only at pipeline creation. Run-start/run-end/push/both-modes lines unchanged.

## Cross-cutting acceptance (whole-feature)

- **No prompt-format duplication.** The schema, omit-empty rule, the "vague idea" sentence, the "Users can export their data as JSON" example, and the four discipline points appear in exactly one place — `prompt-format.md`. `manage-issues.md`, `create-pipeline.md`, and `review-pipeline.md` each only point to it. (The `manage-issues.md` step-4 heading "Reflect hypotheses back as open" is a pre-existing operational step that names the discipline by use, not a restatement of the discipline prose.) PASS.
- **All new cross-references resolve.** "Runs within a pipeline", "Reviewer base ref", "Per-phase completion", "Listing pipelines for an issue", and "Model" all exist as headings in `pipeline-versioning.md` (count 1 each). `prompt-format.md` and `review-pipeline.md` exist. `review-pipeline.md`'s citations of resume's two re-attach headings match `resume-pipeline.md` verbatim. PASS.
- **Review hook wired; Merge/Close intact and dangling.** `work-on-an-issue.md` routes Review to `review-pipeline.md` and continues to step 3; Merge and Close bullets unchanged; `merge-pipeline.md` and `close-pipeline.md` remain absent. PASS.
- **Silent on the legacy no-`base/` shape.** Grep for migration/grandfather/dual-shape/flat-layout/"lacks a base"/"no base" across `skills/radical-pipelines/`, the six agent profiles, and `.rp.md` returns nothing. PASS.
- **Agents stay run-agnostic.** No agent profile names a run, says "per run", or constructs the artifact-folder path (the only `review-N` hits in agents are the pre-existing `*-review-N-rejected.md` filenames; agents only append `/<phase>/<file>` to the handed folder). The only agent-profile edits are the six bounded "per pipeline" → "in this artifact folder" corrections. Run binding lives solely on the orchestrator side (the two Task-6 workflow lines). PASS.
- **Base path consistent.** No flat `<artifacts-folder>/<phase>` creation/fork path remains in `create-pipeline.md` or `fork-pipeline.md` (both base-scoped). Both workflows' phase-subfolder-creation steps name the active run's folder. The remaining flat `<artifacts-folder>/<phase>` paths (e.g. `<artifacts-folder>/0-prompt/prompt.md` in the phase references) are agent/executor-facing input/output paths read from the handed run folder — correctly NOT base-scoped, as base-scoping them would be wrong and would leak the run concept; the cross-cutting check is scoped to creation/fork paths only. PASS.

## Notes

No scope creep, no design changes, no out-of-batch work observed. The 12 commits map one-to-one to the 12 tasks, the feature composes coherently (anchors `pipeline-versioning.md`/`prompt-format.md` land first and every consumer resolves against them), and the skill stays silent on the legacy shape as required.
