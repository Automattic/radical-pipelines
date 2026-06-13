# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Task 1: Add the two planner sections and invert test-planning rules in `code-plan-writer.md`
- Task 2: Add the three validation duties and rework the test-planning check in `code-plan-reviewer.md`
- Task 3: Split `code-writer.md` into `code-writer-tdd.md` and `code-writer-e2e.md`
- Task 4: Add planned-e2e re-drive to behavior verification in `code-reviewer.md`
- Task 5: Dispatch by task type in the phase-4 reference `4 - code.md`
- Task 6: Update the gate-running enumeration, Agents field, and README roster in lockstep
- Task 7: Add the two planner sections, inverted rules, and validation self-checks to assisted `3 - plan.md`

## Summary

This is a prose-only change to the repository's own Radical Pipelines skill. The repo has no executable test suite, no configured guardrails, and the plan's Required-test-commands floor is "None", so acceptance is verified by reading the resulting Markdown. The full batch (T1–T7) is correct, complete, and confined to the ten planned paths (`code-writer.md`→`code-writer-tdd.md` rename, `code-writer-e2e.md` added, plus eight modifications). Every task's Acceptance bullets are met, every spec AC (AC1–AC8) is satisfied, and the design-doc deliverable map (§1–§8) is honored. No migration or backward-compatibility text was introduced. Nothing strays outside the plan.

## Checks

<!-- No guardrails configured and the plan's Required-test-commands floor is "None"; no gate commands to run. This review is judgment-based reading. -->

| Check | Command | Result |
| ----- | ------- | ------ |
| None  | —       | —      |

## Behavior verification

Not applicable. This change edits skill Markdown only — there is no application, CLI, or generated artifact to drive end-to-end, and the plan declares no `### Flow N` blocks to re-drive (every task is `tdd`, a prose edit verified by reading the result). Verification is the reading recorded below.

Per-task and cross-cutting verification performed by reading the live files against the spec, design doc, and code plan:

- **T1 — `code-plan-writer.md` (AC1):** `## Required test commands` and `## E2E test plan` inserted in correct order between `## Overview` and `## Tasks`, with the design §1 comments, the `| Name | Command | Covers |` table (no `Agents` column), and the `### Flow N` block shape (Steps/Expected/Traces to). `- **Type:** tdd | e2e` is directly after `- **Goal:**`. The "Do NOT plan tests" guideline is replaced by "Plan the test floor and e2e flows, not unit tests." The per-task-acceptance actor is narrowed to "the **tdd writer** turns them into unit tests in the RED phase." "derived from browser verification" is gone from the file.
- **T2 — `code-plan-reviewer.md` (AC2):** New execution step at position 2 ("Validate the required-test-commands") carries the design §2 inline text verbatim (runner resolve/terminate; zero-or-missing-tests legitimate and NOT a rejection; unrunnable IS a rejection; per-command and independent; write/deploy/destroy caution), with no reference to setup.md. Review/Write/Commit renumbered to 3/4/5 and the internal cross-reference updated to "the file you wrote in step 4". The "Required-test-commands coverage" and "E2E coverage" judgment items are added next to Coverage/Feasibility. "No test planning" is reworked to a scoped "No unit-test planning" noting the floor and e2e plan are planner-owned and not violations. "derived from browser verification" is gone.
- **T3 — writer split (AC3):** `agents/code-writer.md` no longer exists. `code-writer-tdd.md` has `name: code-writer-tdd`, four steps (Gather context / Implement with TDD / Run the gates / Commit and report), keeps RED/GREEN/REFACTOR, the public-symbol documentation block, and the conditional UI-conventions duty, states "this writer writes unit tests only", names `code-writer-tdd` in its guardrail-read line, and carries the floor input. `code-writer-e2e.md` has `name: code-writer-e2e`, the same four-step shape, an Implement step that realizes each named flow's Steps/Expected as an automated e2e test with the light confirm (no RED/GREEN/REFACTOR, no public-symbol block, no UI duty), names `code-writer-e2e` in its guardrail-read line, and carries the both-sections self-containment carve-out. Neither file contains a behavior-verification step, an e2e-self-derivation step, or "derived from browser verification". Both "Run the gates" steps are identical except for the agent name each correctly names, and state the single shared two-question outcome model covering BOTH the guardrail selection AND the required-test-commands floor (drift = blocker; runs-non-zero = work).
- **T4 — `code-reviewer.md` (AC4):** Step 3 free-form body and the evidence sentence ("A verification claim without evidence is not a verification…") are byte-identical; the re-drive sentence ("Additionally, manually re-drive each flow…capturing evidence as above.") is inserted immediately before the evidence sentence, so the evidence requirement closes over both. The L29 test-quality check takes the in-scope tie-to-plan rephrase ("…the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan)"). The review-template Behavior verification block and the Guidelines verification text are unchanged.
- **T5 — `4 - code.md` (AC6):** Overview describes type-based dispatch naming both `code-writer-tdd` and `code-writer-e2e`. The required-agents table has two writer rows; neither attributes behavior verification to the writer, and both use "runs the gates". Step 1 captures each task's Type. The step-3.1 launch is type-conditional (tdd→`code-writer-tdd`, e2e→`code-writer-e2e`) and the parenthetical field list includes `Type`. No required-agents row or step dispatches a bare `code-writer`; the shared-worktree plural "code-writer(s)" mentions and the mermaid "Code Writer" node are intact.
- **T6 — lockstep trio (AC5, AC7 roster, AC8):** load.md's enumeration and setup.md's Agents-field option list both name exactly `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer` and agree with each other; neither names a bare `code-writer`. setup.md's illustrative `typecheck` row uses `code-writer-tdd`. README.md's shipped-agent roster lists `code-writer-tdd`, `code-writer-e2e` and no longer lists `code-writer`. No migration text in any of the three.
- **T7 — assisted `3 - plan.md` (AC7):** The code-plan.md skeleton gained `## Required test commands` and `## E2E test plan` (same order and shapes as the autonomous schema) and `- **Type:** tdd | e2e` after Goal. Constraint L30 is inverted to the planner-owns-floor-and-e2e rule and synthesis guideline L175 is narrowed to "unit test"/"tdd writer", both with the §1 boundary. The step-4 self-check now has a scoped "No unit-test planning", an "E2E coverage", and a "Required-test-commands validate" item (driver executes and surfaces to the owner, with the plan-time zero/missing-tests-is-fine twist). The abstract singular `code-writer` role mentions are left untouched, per design §8.
- **AC7/AC8 cross-cutting:** Every remaining bare `code-writer` in a live skill file is an abstract phase-4-role reference or incidental example (code-reviewer.md's "completed code-writer work"/"every code-writer in the batch"; the planner/assisted "a code-writer never makes a design decision mid-task"; 4-code.md's shared-worktree sequencing plurals; doc-writer.md:64's example) — none presents `code-writer` as a current agent in a roster or dispatch target. These are explicitly preserved by design §5 and §8. No migration or backward-compatibility text appears anywhere in the diff.

## Issues

None.

## Notes

Minor, non-blocking: in assisted `3 - plan.md` the new "E2E coverage" self-check item landed at the end of the step-4 checklist rather than directly adjacent to the existing coverage items as design §8 loosely suggested. Task 7's Acceptance only requires the item be present, which it is, so this is not a defect — recorded for awareness only.
