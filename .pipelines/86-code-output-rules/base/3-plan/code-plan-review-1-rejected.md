# Code Plan Review

## Verdict: rejected

## Summary

The plan's substance is strong: every spec requirement and acceptance criterion (R1–R8, AC1–AC9) maps to at least one task, every design decision is executed, the file paths and line numbers it cites are accurate against the current codebase, the ordering and dependencies are sound, the name-handle/skill-file constraints are correctly applied, and it avoids prescribing specific tests or documentation work. However, the plan does not conform to the required `code-plan.md` structure that the Code phase depends on to dispatch and execute it. It is missing two mandatory top-level sections (`## Guardrail scopes` and `## E2E test plan`) and — most consequentially — none of its nine tasks carries the mandatory `Type:` field, which the phase file uses to choose which writer to spawn. As written, the orchestrator cannot dispatch this plan. These are structural conformance defects, not disagreements about content, so the revision should be quick.

## Issues

### Issue 1: No task has the mandatory `Type:` field, so the plan cannot be dispatched

**What's wrong:** The `code-plan-writer` task format requires a `**Type:** tdd | e2e` field on every task (`agents/code-plan-writer.md:54`), and the Code phase dispatches the writer *by that field*: "Launch a fresh writer chosen by the task's `Type` — `code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task — with the verbatim task block (Goal / Files / Changes / Type / Depends on / Traces to / Acceptance)" (`skills/radical-pipelines/reference/autonomous-phases/4 - code.md:35`). None of the nine tasks in this plan declares a `Type`. The orchestrator therefore has no basis to choose a writer for any task.
**Where in plan:** All tasks (Task 1–Task 9); the per-task field set in each task block.
**Suggestion:** Add a `**Type:**` field to every task. Since this feature is entirely prose edits to skill/agent `.md` files with no executable product behavior, every task is non-e2e; the writer should classify each accordingly per the format's two allowed values. If the plan-writer judges that the `tdd`/`e2e` dichotomy cannot honestly apply to prose-only edits (no behavior to unit-test, and the project forbids structural tests of skill files — see `CLAUDE.md`), that is a genuine mismatch between this feature and the Code-phase machinery and should be raised as a blocker to the orchestrator rather than papered over — but the plan cannot simply omit the field.
**Why it matters:** Without `Type`, the phase file's dispatch step has no input; the plan is literally non-executable as delivered.

### Issue 2: Missing the mandatory `## E2E test plan` section

**What's wrong:** The required structure includes a top-level `## E2E test plan` section that transforms the spec's acceptance criteria and edge cases into explicit end-to-end flows (`agents/code-plan-writer.md:37-45`, guideline at `:83`). The plan has only two H2 sections — `## Overview` and `## Tasks` — and no E2E test plan.
**Where in plan:** Document structure (top level).
**Suggestion:** Add the `## E2E test plan` section. If — as appears to be the case for a prose-only skill/profile change with no runnable product surface — there are no end-to-end flows to automate, the section must still be present and explicitly state that no e2e flows apply and why, so the omission reads as a deliberate, reasoned decision rather than a forgotten section. (This is consistent with how the plan handles the `Type` classification in Issue 1; the two judgments must agree.)
**Why it matters:** The `code-writer-e2e` and the `code-reviewer` both read this section (the writer to implement flows, the reviewer to manually re-drive them per `code-reviewer.md:35`). A standalone, conformant plan must account for it explicitly rather than silently drop it.

### Issue 3: Missing the mandatory `## Guardrail scopes` section

**What's wrong:** The required structure includes a top-level `## Guardrail scopes` section recording the chosen `{scope}` per scoped gate, or "None" when none were passed (`agents/code-plan-writer.md:30-35`, guideline at `:82`). The plan omits this section entirely.
**Where in plan:** Document structure (top level).
**Suggestion:** Add the `## Guardrail scopes` section. If the orchestrator passed no scoped gates (no `Guardrail scopes to fill:` input), record `None` per the guideline. Do not leave the section absent.
**Why it matters:** The section is part of the plan's contract with the Code phase; its absence means the plan is not the standalone, format-conformant artifact the downstream phase expects, and an absent section is indistinguishable from an overlooked one.

### Issue 4: Task 7's `Depends on` field is self-contradictory as written

**What's wrong:** Task 7's `Depends on` line opens by listing "Task 1, Task 9 (the phase file that actually inlines the rules …)", then reasons about why Task 9 is not a textual dependency, and finally instructs "Mark **Depends on: Task 1**." The verbatim task block handed to the writer/orchestrator therefore contains two different answers to "what does this task depend on?" in one field.
**Where in plan:** Task 7, `Depends on` (plan line 129).
**Suggestion:** Reduce the `Depends on` field to its resolved value (`Task 1`) and move the reasoning about Task 9 — if it needs to be retained at all — into the task's `Changes`/prose, not the dependency field. The field must state one unambiguous answer, as Task 8's already does.
**Why it matters:** The phase file passes the task block verbatim; a dependency field that argues with itself is exactly the kind of ambiguity that lets two executors order the work differently, and it undercuts the plan's otherwise-clean dependency graph.

## Notes (not blocking on their own)

- Coverage and traceability are sound: R1/AC1, R2/AC2/AC3, R3/AC4, R4/AC6, R5, R6/AC9, R7/AC8, R8/AC7, and AC5 each map to at least one task, and every design Key Decision (tool-defaults placement, "state once," canonical `output-rules.md`, referent-based discriminator, reviewer-style enforcement + writer self-check, confining the provenance tag to artifact-only commits) is executed by a task.
- All cited file paths and line numbers verified against the codebase: `setup.md` Commit format (lines 54–60), `.rp.md` Commit format (lines 49–58, agent parenthetical at 51), `code-writer-tdd.md` line 33 / commit step 49, `code-writer-e2e.md` commit step 40, `docs-writer.md` commit step 52, `code-reviewer.md` diff input 19 / checklist 23–31, `docs-reviewer.md` diff input 21 / checklist 25–33, and both phase files' step 4 at line 37 with the `summary-format.md` pass. The `summary-format.md` precedent is referenced only from the two phase files and never from a profile, exactly as the plan relies on; the "your launch prompt" handle exists in both reviewer profiles; none of the five profiles currently references any skill file. No prior `code-plan-review-*-rejected.md` exists, so this is iteration N=1.
