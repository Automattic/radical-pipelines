# Code Review

## Verdict: rejected

## Summary

The batch is faithful to the plan: all 10 tasks landed in the planned order, every file the plan names is touched and nothing else is, the format file matches the C-format verbatim, the extended predicate and the generalized layout sentences read cleanly together, no step-number cross-reference broke under the renumbering in `review-pipeline.md` and `fork-pipeline.md`, the agent definition matches the house style of `doc-writer.md` (including the blocker payload), the `.rp.md` row aligns and matches the agent name, and the changeset matches the `pipeline-reviews` precedent. Tasks 1, 3, 4, 7, 8, and 9 pass their acceptance with no findings.

It is rejected for three wording defects in the skill prose — the deliverable here — each violating either internal consistency or the project's binding skill-authoring rules: `review-pipeline.md`'s new step instructs delivery "before mode dispatch" while its own bullets deliver at phase 1, and carries a non-operational rationale clause; and `fork-pipeline.md`'s new step restates the format-resolution rule it simultaneously references. Three minor nits ride along. All fixes are single-sentence edits; nothing structural.

## Issues

### Issue 1 (Task 5): Step 7 instructs delivery "before mode dispatch," but delivery happens at phase 1

**What's wrong:** `review-pipeline.md` step 7 says "Deliver the collected summaries (in run order) as **content** before mode dispatch — …:" — yet its own bullets deliver at phase 1 (autonomous: phase-1 spawn prompts; assisted: while authoring the phase-1 artifacts), which happens only after step 8 dispatches the mode. The mode determines the delivery channel, so delivery cannot precede dispatch. What precedes dispatch is **collection** — the design pins exactly this ("Collection happens before mode dispatch, so both modes get it"). As written, the operative sentence and its bullets contradict each other.
**Where:** `skills/radical-pipelines/reference/review-pipeline.md:52`.
**Suggestion:** Make collection the thing this step does before dispatch and let the bullets define per-mode delivery into phase 1 — e.g. "Collection happens before mode dispatch, so both modes receive the summaries. Deliver them, in run order, as **content**:" followed by the two existing bullets.
**Why it matters:** Skill prose is the executable. An orchestrator following the sentence literally is told to deliver through a channel that does not exist yet.

### Issue 2 (Task 5): Non-operational rationale clause in step 7

**What's wrong:** The clause "— this is the first step that collects across all prior runs, which is why the order is made explicit" directs no behavior; it explains the design's novelty. That violates two skill rules: every word must serve a purpose, and the skill describes the system as designed, not its history ("the first step that…" is change-relative commentary). Task 5's acceptance does not require it — it is the plan's own rationale leaked into skill text.
**Where:** `skills/radical-pipelines/reference/review-pipeline.md:52`.
**Suggestion:** Delete the clause (folds naturally into the Issue 1 rewrite of the same sentence).
**Why it matters:** The project's minimalism rule is a hard constraint on every skill edit; rationale prose accretes and dilutes the operative instructions.

### Issue 3 (Task 6): Fork step 7 restates the resolution rule it already references

**What's wrong:** `fork-pipeline.md` step 7 reads "with the resolved summary format (project override else the skill default `reference/run-summary-format.md`), exactly as in step 6 of the phase-5 procedure". The parenthetical restates the resolution rule that is already reachable twice on this reading path: `conventions/load.md` owns the rule (Task 2), and the referenced phase-5 step 6 carries the identical gloss. The plan's Task 6 directs "reference it rather than restating", and the project's no-duplication rule requires a repeated instruction to live once, referenced elsewhere.
**Where:** `skills/radical-pipelines/reference/fork-pipeline.md:51`.
**Suggestion:** Drop the parenthetical: "launch a fresh `run-summary-writer` for the fork's `base` run — with the resolved summary format, exactly as in step 6 of the phase-5 procedure — to write and commit `run-summary.md` …". (Step 6 of the phase-5 procedure keeps its gloss — that wording is plan-pinned.)
**Why it matters:** Duplicated rules drift independently; the no-duplication rule exists precisely so a future change to the resolution semantics is a one-file edit.

### Minor issues (fix in passing)

- **(Task 4)** Step 6's aside "— exactly once for this run —" repeats the Required agents row ("One fresh instance per run"); the doc-writer precedent's steps say only "launch a fresh …". Drop the aside. `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:40`.
- **(Task 2)** The new `load.md` table row writes run-summary.md without backticks; the skill backticks filenames everywhere else, including `setup.md`'s matching entry. `skills/radical-pipelines/reference/conventions/load.md:22`.
- **(Task 10)** "override via an optional convention file" misnames the mechanism — the override is via an optional convention (which names a format file). Say "via an optional convention". `.changeset/run-summary.md`.
