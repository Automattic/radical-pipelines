# Code Plan Review

## Verdict: rejected

## Summary

The plan is thorough and almost ship-ready. All ten acceptance criteria are covered by traceable tasks (AC1→T4, AC2→T4, AC3→T5, AC4→T6/T10, AC5→T2/T6/T10, AC6→T7/T10, AC7→T1/T3, AC8→T8/T9, AC9→T11, AC10→T1/T2/T3/T10/T11). The ten-file edit set maps one-to-one onto Tasks 1–10 and matches the design; the untouched-by-design set (`code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`, `README.md`, `## E2E test plan`) is asserted by the Task 11 sweep. Every line reference cited in the tasks is accurate against the live tree (setup.md 185/197, load.md 38, code-plan-writer 30/34/82, code-plan-reviewer 17/27/34, code-writer-tdd 14/56, code-writer-e2e 14/15/49, assisted 30/118/132). The floor-token sweep confirms the design's "six files carry floor tokens, all within the ten" claim, and `.rp.md` declares no Guardrails, so the plan's `## Plan-completed guardrails` and `## E2E test plan` correctly read "None". The contract-defined-once discipline is faithful: Task 1 is the sole home, Tasks 2/3 state *when* only.

One ordering defect blocks approval: Task 3 introduces a forward reference to a section that a later task creates, violating the self-consistent-at-every-commit requirement. It is a one-line dependency fix with no content change.

## Issues

### Issue 1: Task 3 references `## Plan-completed guardrails` but does not depend on Task 6, which introduces it

**What's wrong:** Task 3 edits `reference/autonomous-phases/4 - code.md` to say the orchestrator resolves marked gates "substituting each marked agent's feature command from `## Plan-completed guardrails` into that agent's resolved `Guardrails:` line." That section name is net-new to this pipeline and is introduced into the producer (`agents/code-plan-writer.md`) only by **Task 6** (which renames `## Required test commands` → `## Plan-completed guardrails`). Task 3's stated `Depends on:` is **Task 1 only** — there is no edge to Task 6.

Under the declared dependencies (and the default numeric execution order 1, 2, 3, …), Task 3 commits **before** Task 6. At that commit, `4 - code.md` names `## Plan-completed guardrails`, but no skill file yet produces a section by that name — `code-plan-writer.md` still emits `## Required test commands` until Task 6. An orchestrator reading the skill in that intermediate state hits a forward reference to a section that does not yet exist anywhere in the tree.

I confirmed Task 1 does **not** establish the section name first: its `Guardrails:` resolution clause references `code-plan.md` but not `## Plan-completed guardrails` (verified against the planned change and the live `autonomous-workflow.md`). So `4 - code.md` is the first file in the reading path to name the section, and absent a Task 6 dependency it lands before the section exists.

This is distinct from the unavoidable producer/consumer rename split (Task 6 → Tasks 8/9, correctly ordered): Task 3 neither produces nor reads the section — it only *names* it in a *when*-clause — so the forward reference is fully avoidable by ordering.

**Where in plan:** Task 3, `**Depends on:** Task 1`.

**Suggestion:** Add Task 6 to Task 3's dependencies: `**Depends on:** Task 1, Task 6 (names the `## Plan-completed guardrails` section this *when*-clause references; Task 6 introduces it in the producer)`. Equivalently, re-sequence so Task 6 precedes Task 3. No task content changes. (Tasks 7, 8, 9, 10 — the other tasks that touch the section name — already depend on Task 6 correctly; Task 3 is the only one missing the edge.)

**Why it matters:** The charter requires the skill stay self-consistent at every commit — no file may reference a construct a later task introduces. The plan otherwise satisfies this; this single missing edge produces a dangling forward reference in `4 - code.md` in the default execution order. The skill is the product, so a commit that leaves a phase file pointing at an undefined section is exactly the inconsistency plan-ordering review exists to prevent.
