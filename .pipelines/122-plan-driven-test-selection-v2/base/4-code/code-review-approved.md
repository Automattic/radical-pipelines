# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed: T1–T8 (all of `code-plan.md`).

- Task 1: Add the two planner sections, the Type field, and invert test-planning rules in `agents/code-plan-writer.md`
- Task 2: Add the execution step, coverage checks, and reworked unit-test check in `agents/code-plan-reviewer.md`
- Task 3: Create `agents/code-writer-tdd.md`
- Task 4: Create `agents/code-writer-e2e.md`
- Task 5: Delete `agents/code-writer.md`
- Task 6: Add reviewer-side e2e re-drive while keeping verification + evidence byte-identical in `agents/code-reviewer.md`
- Task 7: Update the phase-4 reference, the `setup.md` enumeration, and the README roster (lockstep)
- Task 8: Update assisted phase-3 with the new sections, Type field, inverted rules, and self-checks

## Summary

The batch implements the full feature exactly as specified by `spec.md`, `design-doc.md`, and `code-plan.md`, correctly resolving the code plan's two documented divergences (A: `load.md` carries no gate-running enumeration in the post-#121 codebase, so the enumeration edits land in `setup.md` L183/L185 and `load.md` is untouched; B: the new writers match the post-`a0e3fd9` "Run the guardrails" three-bullet shape and reintroduce none of the removed vocabulary). I manually re-drove all 8 E2E test plan Flows against the worktree; every Flow's Expected outcome holds with captured grep/inspection evidence. `npm test` passes (115), including 93 new structural-check assertions across the 7 added test files, which are substantive (not vacuous). No defects found.

## Checks

<!-- `.rp.md` defines no Guardrails convention for this repo, so there is no project-wide guardrails channel; the required-test-commands floor is `npm test`. -->

| Check | Command | Result |
| ----- | ------- | ------ |
| tests | `npm test` | pass (115) |

## Behavior verification

The user-observable behavior of this feature is the content of the shipped skill/agent files. I re-drove each of the 8 Flows in the plan's E2E test plan; evidence below.

**Flow 1 (AC1) — planner owns the two new sections; old prohibition and false phrase gone.** `agents/code-plan-writer.md` has `## Required test commands` (L30) and `## E2E test plan` (L37) between `## Overview` (L26) and `## Tasks` (L47), in that order; `- **Type:** tdd | e2e` (L54) sits between `- **Goal:**` (L53) and `- **Files to change:**` (L55). `git grep "Do NOT plan tests"` and `git grep "derived from browser verification"` over the file both return no matches. The "Do NOT plan tests" guideline is replaced by the positive "Plan the test floor and the e2e flows" guideline (L82); the per-task-acceptance guideline (L78) attributes unit tests to "the tdd writer ... in the RED phase." PASS.

**Flow 2 (AC2) — plan-reviewer executes commands, judges coverage, checks e2e, reworks the check.** `agents/code-plan-reviewer.md` has new step 2 "Validate the required-test-commands" (L17-19): execute each command exactly as written, single question "did the command's runner resolve and terminate?", zero/missing tests legitimate (not a rejection), unrunnable IS a rejection, per-command and independent, judge-before-running-destructive caveat, no `setup.md` reference; "Review the plan" pushed to step 3. Checklist has "Required-test-commands coverage" (L27) and "E2E coverage" (L28). The old "No test planning" check is reworked to scoped "No unit-test planning" (L34) that flags only prescribing specific unit tests and notes the floor/e2e plan are planner-owned, not violations. `git grep "derived from browser verification"` returns no matches. PASS.

**Flow 3 (AC3) — old writer gone; two new writers exist and are correctly shaped.** `ls agents/code-writer.md` → not found; `agents/code-writer-tdd.md` and `agents/code-writer-e2e.md` both exist. Frontmatter `name: code-writer-tdd` and `name: code-writer-e2e`. The tdd writer writes unit tests via RED/GREEN/REFACTOR only (L18-24), carries the conditional UI-conventions duty (L26), and keeps the public-symbol doc block (L28-34). The e2e writer implements the planner's named flows as automated e2e tests with an explicit no-RED/GREEN/REFACTOR light-confirm (L17-25) and a one-line test-code-convention guideline (L51) instead of the doc block. `git grep "Behavior verification\|Derive end-to-end"` and `git grep "guardrail selection\|two-question\|two questions"` over both files return no matches. Both have a "Run the guardrails" step running the guardrails convention's gates AND the required-test-commands floor with the three-bullet sort (tdd L36-46, e2e L29-39). Neither Gather context has a self-naming guardrail-read line; tdd names task block + Required test commands (L12,14), e2e names task block + E2E test plan + Required test commands (L12,14,15); self-containment guidelines match (tdd L56, e2e L49). The new writers faithfully extend the pre-batch `code-writer.md` shape (confirmed against `git show 2a5c74b:agents/code-writer.md`). PASS.

**Flow 4 (AC4) — reviewer keeps free-form verification + evidence byte-identical and adds the re-drive.** `git diff` of `agents/code-reviewer.md` is exactly two changed lines: the test-quality check (L28) tie-to-plan rephrase, and step 3 (L34) where the original free-form body and the evidence sentence ("A verification claim without evidence is not a verification — either produce the evidence or reject the batch.") are byte-identical and the new re-drive sentence ("Additionally, manually re-drive each flow in the E2E test plan section of `code-plan.md`: perform the flow's Steps and confirm its Expected outcome, capturing evidence as above.") is inserted before the evidence sentence. The review template `## Behavior verification` block and the "Run the guardrails" guideline (L110) are untouched. PASS.

**Flow 5 (AC5) — gate-running enumeration and Agents-field name the two writers and agree.** `setup.md` L183 lists `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`; L185 reminder names `code-writer-tdd`s, `code-writer-e2e`s, and `doc-writer`s vs `code-reviewer`s and `doc-reviewer`s — the two views agree on the writer set, no bare `code-writer` remains, and the once-per-task/once-per-pipeline meaning is preserved. `load.md` diff is empty (unchanged), consistent with divergence A. PASS.

**Flow 6 (AC6) — phase-4 reference dispatches by Type with two writer rows.** `4 - code.md` overview (L3) and step 3.1 launch (L34) dispatch by `Type` (tdd→`code-writer-tdd`, e2e→`code-writer-e2e`), with `Type` in the launch field list; the Required-agents table has two writer rows (L25-26), neither attributing behavior verification ("runs the gates, commits"). `git grep "\`code-writer\`"` over the file returns no match for the exact backticked token in a row/step; the surviving unquoted `code-writer`/`code-writers` hits (L34-36) are the allowed generic plural sequencing prose. PASS.

**Flow 7 (AC7) — assisted phase-3 + README roster + no contradicting live `code-writer`.** Assisted `3 - plan.md` skeleton gains `## Required test commands`, `## E2E test plan`, and `- **Type:** tdd | e2e` after Goal; the L30 constraint is inverted to planner-owns-floor-and-e2e/unit-stays-writer's; the self-check adds an "E2E coverage" item and reworks "No test planning" into "Required-test-commands validate" (driver executes, surfaces to owner, runner-resolves-and-terminates, zero/missing fine, unrunnable a problem, per-command independent); L152 narrowed to "The tdd writer turns it into unit tests in phase 4 (TDD)." `README.md` L112 roster names both new writers, no bare `code-writer`. Full-worktree `code-writer` sweep (both backtick-quoted and unquoted, excluding `.pipelines/` and `.rp.md`): every surviving hit is an abstract phase-4-role mention (code-plan-writer/reviewer, assisted 2 L48/L81/L100, assisted 3 L25/L59/L96/L115/L168), an illustrative example (`agents/doc-writer.md:64`, `website/demo.js:96,103`), a test-assertion string (`scripts/test/phase-4-writer-split.test.mjs`), or the out-of-scope historical `.changeset/agent-scoped-guardrails.md` — none presents `code-writer` as a current shipped/dispatched agent. PASS.

**Flow 8 (AC8) — no migration or backward-compatibility text introduced.** Scanning all added (`+`) lines of the full feature diff (excluding `.pipelines/`) for migration/backward-compat/deprecation/legacy vocabulary returns matches only inside `scripts/test/phase-4-writer-split.test.mjs`, where the strings are the *assertion* that no such text exists — not introduced migration prose. PASS.

## Issues

None.
