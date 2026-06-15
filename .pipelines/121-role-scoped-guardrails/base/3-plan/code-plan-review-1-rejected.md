# Code Plan Review

## Verdict: rejected

## Summary

The plan is complete in coverage and faithful to the spec and design: all eleven acceptance criteria map to a task, the four-file confinement (AC11) is preserved, the grounded file-state claims check out against the live tree, and the task decomposition (one task per file, Task 1 as the definitional foundation) is sound. It is rejected for one feasibility/completeness gap in Task 4: the restructure of `agents/code-reviewer.md` invalidates two in-text cross-references that the task's Changes and Acceptance never require to be fixed, so a writer executing the task strictly by its acceptance criteria would ship an internally inconsistent file.

## Issues

### Issue 1: Task 4 omits the cross-reference updates its own restructure invalidates

**Task:** Task 4: Restructure `code-reviewer.md` — guardrails become their own step with fail-fast

**What's wrong:** Task 4 removes the guardrail bullet from step 2 and inserts the guardrail run as a new step after step 3, renumbering "Write the review" and "Commit and report". Two existing in-text references break under that restructure, and the task neither lists them in Changes nor covers them in Acceptance:

1. `agents/code-reviewer.md:36` — step 3's disclaimer ends "…separate from running the guardrails **in step 2**." After the restructure, guardrails no longer run in step 2; the sentence must point at the new guardrail step.
2. `agents/code-reviewer.md:84` — "Commit the file you wrote **in step 4**…" must become the renumbered "Write the review" step number. "Subsequent steps are renumbered consistently" plausibly covers the headings but does not explicitly bind in-text step references.

The plan itself demonstrates the needed clause: Task 3 ends with "Every internal cross-reference to the guardrail step (including step 3's disclaimer) is accurate after the retitle." Task 4 has no analogous requirement, and its final acceptance bullet ("No docs-phase behavior, the verdict/filename logic, or the commit-and-report behavior is changed **beyond the renumbering**") can even be read as forbidding the step-3 edit. Task blocks are self-contained by design — the code-writer does not read the design doc — so the task block is the only contract; per-task Acceptance is what the writer implements against and what the batch reviewer enforces.

**Where:** Task 4 (Changes and Acceptance), against `agents/code-reviewer.md:36` and `agents/code-reviewer.md:84`

**Expected:** Task 4's Changes note that the restructure must leave every internal cross-reference accurate — naming at least the step-3 disclaimer's "in step 2" phrase and the "file you wrote in step 4" reference in Commit and report — and its Acceptance gains a clause mirroring Task 3's: every internal cross-reference to the guardrail step and to the renumbered steps is accurate after the restructure. The final acceptance bullet should be reworded so it cannot be read as forbidding those reference fixes.
