# Code Plan Review

## Verdict: rejected

## Summary

The review-1 blocking issue is fixed: the section-defining writer task (`code-plan-writer.md`, now Task 7) precedes its consumer (`4 - code.md`, now Task 8). The full dependency graph is acyclic with every `Depends on` pointing strictly backward — 2→1, 3→1, 4→1, 5→2, 6→2, 7→{1,2}, 8→{1,7}, 9→{1,2,7}, 10→{1,2,7}, 11→{1,2,9,10}, 12→{1,8,10}, 13→{1,7,10}, 14→2, 15→1–14 — with no forward references and no cycles. Task 12 correctly stays after both 8 and 10, as review-1 required. The renumber updated every `Depends on` line and the one back-pointing body reference in Task 12 (`Task 8 … in 4 - code.md`).

But the reorder introduced one new internal contradiction it did not catch: Task 13's body text still cross-references "Task 8's code-plan-writer block," when after the swap that block lives in Task 7 and Task 8 is now `4 - code.md` (which has no such block). Task 13's own `Depends on` line correctly cites Task 7 for the same block, so the plan now contradicts itself. The fix is a one-word edit; this is a single-issue rejection.

## Issues

### Issue 1: Stale cross-reference in Task 13 — "Task 8's code-plan-writer block" should be Task 7

**What's wrong:** Task 13's **Code-plan synthesis skeleton** changes bullet (line 255) says to replace the assisted `## Plan-completed guardrails` block with the `## Guardrail scopes` block "identical to **Task 8's** code-plan-writer block." After the review-1 reorder, the code-plan-writer's `## Guardrail scopes` block is authored in **Task 7** ("Author and validate `## Guardrail scopes` in `code-plan-writer.md`", line 143). Task 8 is now "Resolve scoped gates before spawn in autonomous `4 - code.md`" (line 160) — a phase file with no code-plan-writer block at all. So the bullet points the Task 13 executor at a task that does not contain the block it names.

This is self-contradictory within the task: Task 13's `Depends on` line (line 260) was correctly updated to `Task 7 (the code-plan `## Guardrail scopes` block shape)`, but the body still says Task 8 for that same block. The reorder fixed the four `Depends on` lines and Task 12's body pointer but missed this one body reference.

**Where in plan:** Task 13, **Code-plan synthesis skeleton** bullet (line 255: "… identical to Task 8's code-plan-writer block."). For contrast, the correct, already-updated reference is Task 13's `Depends on` line (line 260) and the doc-plan analog (line 257, "mirroring Task 10"), both of which point at the right tasks.

**Suggestion:** Change "identical to Task 8's code-plan-writer block" to "identical to Task 7's code-plan-writer block" (matching the `Depends on` line and the design's "Plan output" decision). No other edit is needed — this is the only stale token; the remaining "Task 8" mentions (the Task 8 header at line 160, Task 12's `Depends on` at line 240, and Task 15's full list at line 286) are all correct.

**Why it matters:** As written, the plan instructs the code-writer executing Task 13 to mirror a block that the named task (Task 8 = `4 - code.md`) does not contain, while the same task's `Depends on` names a different task (Task 7) for that block. A reviewer at the next gate checking the plan for internal consistency — the same wrong-reference standard that produced review-1 — would flag this. One-word fix makes the plan self-consistent.
