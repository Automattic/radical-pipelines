# Code Plan Review

## Verdict: rejected

## Summary

The plan is strong: it targets exactly the right set of files, every one of the eight files carrying an old-model token (`setup.md`, `load.md`, `autonomous-workflow.md`, autonomous `3 - plan.md` and `4 - code.md`, `code-plan-writer.md`, `code-plan-reviewer.md`, assisted `3 - plan.md`) is claimed by a task, the two new references are correctly created new, the five running agents are correctly left untouched (verified clean), and all seven acceptance criteria map to tasks. Line references in the assisted-phase task (Task 13) check out against the worktree, and the design's value-not-command / placeholder-marks-scoped / two-references decisions are faithfully executed. One real defect blocks approval: Task 7 declares a dependency on Task 8 but is numbered (and therefore executed) before it — a forward dependency that the code-phase dispatches in violation of, and that the `code-plan-reviewer` is itself mandated to reject as "wrong order." The fix is mechanical (reorder, or downgrade the dependency to a non-blocking note), so this is a single-issue rejection.

## Issues

### Issue 1: Task 7 depends on Task 8 but runs before it — wrong dependency order

**What's wrong:** Task 7 ("Resolve scoped gates before spawn in autonomous `4 - code.md`") lists `**Depends on:** Task 1 …, Task 8 (names `## Guardrail scopes`, introduced in the code-plan-writer)`. Task 8 is numbered after Task 7, so in the code phase — which dispatches tasks "in the order specified" (`skills/radical-pipelines/reference/autonomous-phases/4 - code.md:32-33`) — the writer for Task 7 is launched before Task 8's writer has produced the `## Guardrail scopes` section Task 7's depends-on says it relies on. This is precisely the failure the `code-plan-reviewer` is instructed to flag: "Ordering and dependencies — can each task actually run after the tasks it depends on? Flag cycles, missing prerequisites, and **wrong order**" (`agents/code-plan-reviewer.md:33`). A plan that ships with a task ordered ahead of its own declared prerequisite is internally inconsistent and would be rejected at the next gate.

The same shared fact (the section is named `## Guardrail scopes`) is design-fixed — it appears in the design doc's "Plan output" (`2-design-doc/design-doc.md:55`) and in Task 7's own description — so the dependency is arguably over-declared rather than genuinely blocking; the writer of Task 7 already knows the section name without Task 8 having landed. But as written, the plan asserts the dependency and then violates it by ordering.

**Where in plan:** Task 7 (`**Depends on:**` line) versus Task 8's position; Task 12 also points back to Task 7 (`**Depends on:** … Task 7 …`), so any reorder must keep Task 12 after both.

**Suggestion:** Pick one and make the plan self-consistent:
- **(a) Reorder** so the section-defining writer task (current Task 8, `code-plan-writer`) precedes the consumer (current Task 7, `4 - code.md`). Renumber and update every `Depends on` / "Traces to" reference; verify Task 12's `Depends on` (currently Task 7, Task 10) still points only at earlier tasks after the swap. No other task depends on Task 7, so a 7↔8 swap is safe.
- **(b) Downgrade the dependency:** drop `Task 8` from Task 7's `Depends on` (keep only Task 1) and note inline that `## Guardrail scopes` is the design-fixed section name (cite `guardrails.md` / the design), so Task 7's edit needs no prior task to have authored it. This preserves the current numbering.

**Why it matters:** If the plan keeps a task ahead of its declared prerequisite, the autonomous code phase dispatches Task 7's writer with the prerequisite unmet, and the `code-plan-reviewer` will reject the plan for wrong order — stalling the run. Resolving it now (reorder or downgrade) makes the dependency graph consistent with the execution order the code phase actually follows.
