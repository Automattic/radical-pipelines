# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed (Tasks 1–10, the full initial batch from `code-plan.md`):

- Task 1: Capture the verification baseline
- Task 2: Rename run-creation tokens in `pipeline-versioning.md`
- Task 3: Rename the command file and its in-file tokens (`review-pipeline.md` → `revision-pipeline.md`)
- Task 4: Update the dispatcher reference and advisory in `work-on-an-issue.md`
- Task 5: Rename the intent type in `intent-format.md`
- Task 6: Update orchestrator-update prose and the action-list verb in `.rp.md`
- Task 7: Rename the base-ref inbound reference in `autonomous-workflow.md`
- Task 8: Rename only the base-ref substring in `autonomous-phases/4 - code.md`
- Task 9: Rename only the base-ref substring in `autonomous-phases/5 - docs.md`
- Task 10: Re-grep verification — prove the bucket boundaries held

## Summary

The batch executes the scoped, mechanical rename of the follow-up run and its run-creation activity from "review"/"reviewing" to "revision"/"revising" exactly as the design's authoritative bucket-A map prescribes: 39 line-edits across 8 files plus the history-preserving rename of `review-pipeline.md` → `revision-pipeline.md`. Every one of the six re-grep E2E flows was re-driven independently and passes. The phase-auditing meaning of "review" is preserved byte-for-byte (the `agents/` diff is empty; the only changes to the keep set are the three intended base-ref-heading substrings), the 32-line generic-`revis` baseline is unchanged, every newly-introduced `revision`/`revise` token lands on a run/run-creation concept and none on a phase-audit concept, the run is always qualified as "revision run" or `revision-N` (never a bare "revision" denoting the run), and the renamed command document is reachable and correctly titled. No scope creep: only the 8 in-scope files and `.rp.md` changed; all other diffs are this run's own pipeline artifacts under `.pipelines/`.

## Checks

No guardrails are defined for this project — there are no gates to run.

| Check | Command | Result |
| ----- | ------- | ------ |
| (none defined) | — | — |

## Behavior verification

This change is to skill prose; its user-observable behavior surface is the going-forward instruction text, verified via the plan's six re-grep E2E flows. All greps were run from the worktree root over `skills/ agents/ .rp.md`; the keep-set diff is `git diff 8350faa..HEAD`.

**Flow 1 — No run/run-creation concept is still named "review":**
- `grep -rni 'review' skills/ agents/ .rp.md | wc -l` → 216. Every hit inspected; all denote phase-auditing concepts (reviewer agent names, `*-review-approved.md`, `*-review-N-rejected.md`, `# Spec Review`/`# Code Review`/`# Design Doc Review`/`# Code Plan Review`/`# Docs Plan Review` headings, "review-style check", "Review with the owner" steps, and generic owner-review-of-artifacts: `SKILL.md:15` "humans can review, revise, and relaunch", `SKILL.md:29`/`assisted-workflow.md:3` "owner reviews and approves", and "a PR review" on `revision-pipeline.md:39`).
- `grep -rniE 'review run|review intent|new review|review-[0-9]+-<short' skills/ agents/ .rp.md` → zero hits.

**Flow 2 — Every new "revision"/"revise" token lands only on a run/run-creation concept:**
- `grep -rni 'revis' … | wc -l` → 71 (32 generic baseline + 39 newly introduced). The 32 baseline `revis` lines from `8350faa` are all still present verbatim (zero missing under a line-number-normalized `comm`).
- Each of the 39 new `revision`/`revise` lines inspected: all name the run, the act of creating it, the command document, the route, the intent, the dispatch label, or the base-ref heading. None lands on a phase-audit concept. The run is always written "revision run" or `revision-N` (the formerly-bare run senses on `pipeline-versioning.md:55` — "a new review may start", "a review is in flight", "that review's phase 1" — are now qualified as "a new revision run may start", "a revision run is in flight", "that revision run's phase 1").

**Flow 3 — Command document renamed, retitled, reachable:**
- `grep -rn 'review-pipeline' …` → zero hits. `revision-pipeline.md` exists; `review-pipeline.md` does not. The rename is history-preserving (git detects it at 30% similarity; `git log --follow` traces back through the original file to its creation commit `fa9e5e6`). H1 reads "# Revising a Pipeline". The dispatcher reference resolves: `work-on-an-issue.md:36` → `**Revise** read `revision-pipeline.md``. The in-file direct route reads `"revise this pipeline"` (`revision-pipeline.md:9`).

**Flow 4 — Base-ref heading renamed, no inbound reference dangles:**
- `grep -rn 'Reviewer base ref' …` → zero. `grep -rn 'Revision base ref' …` → exactly 5: 1 definition (`pipeline-versioning.md:21`) + 4 inbound (`autonomous-workflow.md:39`, `revision-pipeline.md:29`, `autonomous-phases/4 - code.md:37`, `autonomous-phases/5 - docs.md:37`). `**Base run**` (`pipeline-versioning.md:26`) is unchanged.

**Flow 5 — Phase-audit "review" preserved byte-for-byte:**
- `git diff 8350faa..HEAD -- agents/` → 0 lines (no reviewer agent profile touched). The full in-scope changed-line diff confirms the only keep-set changes are the base-ref substrings on the three inbound files: whole line on `autonomous-workflow.md:39`, and the `**Reviewer base ref**` → `**Revision base ref**` substring only on `4 - code.md:37` and `5 - docs.md:37` — where `code-reviewer`/`docs-reviewer`, `code-review-N-rejected.md`/`docs-review-N-rejected.md`, and `code-review-approved.md`/`docs-review-approved.md` remain byte-unchanged. `.rp.md` per-phase status labels (`0 - Intent` … `5 - Docs`), the `(spec-reviewer)` commit example, and all six reviewer model-table rows are byte-unchanged. "a PR review" on `revision-pipeline.md:39` is kept verbatim.

**Flow 6 — Run-folder naming convention and globs flip to revision-only:**
- `pipeline-versioning.md` names follow-up runs `revision-N-<short-description>`; `base` unchanged. Next-number rule reads "the next integer after the existing `revision-*` folders" (`:17`); latest-run rule reads "the highest-numbered `revision-N` run, or `base` if there are no revisions" (`:53`). No `review-*`/`review-N` run-folder glob remains; no dual-recognition (`review-* OR revision-*`) glob exists anywhere. The chain reads `base → revision-1-<short-description> → revision-2-<short-description> …` (`:117`).

**Additional invariants:** Collision check passes — run names (`revision-N`) and rejection iterations (`spec-review-N-rejected`, etc.) occupy unambiguously distinct namespaces. The abbreviation `rev` is not used as a run name (the only `rev-` hits are `git rev-parse`). The intent type reads "revision intent" with its mandatory **Origin** section name preserved (`intent-format.md:3,33`). The dispatch label and same-issue advisory read "Revise" (`work-on-an-issue.md:36,40`). The generic `pipeline-versioning.md:112` "revised the spec"/"revised the **intent**" is unchanged.
