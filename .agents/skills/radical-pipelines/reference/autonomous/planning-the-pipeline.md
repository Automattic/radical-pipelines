# Planning the Pipeline (Autonomous Workflow)

Run this workflow at the start of every autonomous run, after the task has been identified and before any worktree, artifacts, or commits are created. Its purpose is to gather a complete plan with the owner so the autonomous run executes without further interruptions afterwards.

The plan has two parts:

- **Target phase** — the highest phase to run in this autonomous run.
- **Per-phase decisions** — for each phase from the next-to-run up to the target, the choices that govern how that phase is executed.

Collect everything up-front. Once the autonomous run starts, do not ask the owner additional questions until the target phase finishes.

## 1. Frame the conversation

When you start the planning conversation, tell the owner explicitly that this is the autonomous workflow and that you will collect all the decisions up-front so the run can then proceed without interruptions.

## 2. Ask the target phase

Ask the owner where the autonomous run should stop. Frame it in plain language; do not show the owner internal phase numbers unless they ask. Today the only meaningful choices are:

- Stop after phase 0 (only the prompt artifact is created).
- Run through phase 1 (the spec is also produced).

If the owner does not specify, default to the highest implemented phase (today: phase 1).

When more phases are implemented, expand this list using the **Phases** table in `SKILL.md`.

## 3. Collect per-phase decisions

For each phase included in the autonomous run, read its reference and look at the `Decisions` section. Ask the owner about any choice the owner has not already specified. Use the documented default if the owner declines to choose.

Phase references:

| Phase           | Reference                       |
| --------------- | ------------------------------- |
| 1 (Spec)        | `running-the-spec-phase.md`     |

Phase 0 (creating the prompt artifact) has no decisions — it is purely setup.

## 4. Confirm the plan

Restate the full plan back to the owner in plain language: that this is an autonomous run, the target phase, and any non-default per-phase decisions. If the owner accepts, proceed. If they want changes, revise and confirm again.

## 5. Hand off

Return control to the calling workflow (`starting-a-pipeline.md`). It will run phase 0 first and then continue to subsequent phases per the plan, stopping at the target phase.
