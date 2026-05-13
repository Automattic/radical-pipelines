# Running the Autonomous Workflow

This is the entry point of the **autonomous workflow**. It collects the run plan with the owner up-front, runs phase 0 to set up the workspace, and then continues to subsequent phases per the plan, stopping at the target phase.

The plan has two parts:

- **Target phase** — the highest phase to run in this autonomous run.
- **Per-phase decisions** — for each phase from the next-to-run up to the target, the choices that govern how that phase is executed.

Collect everything up-front. Once the autonomous run starts, do not ask the owner additional questions until the target phase finishes.

## 1. Frame the conversation and verify setup conventions

When you greet the owner, tell them explicitly that this is the autonomous workflow and that you will collect all the decisions up-front so the run can then proceed without interruptions.

Before asking workflow questions, load the stored project conventions:

- If conventions declare the repository ownership mode and all required ownership details are present, continue without asking the owner to reconfirm them.
- If ownership is missing or incomplete, stop and run setup before asking the target phase or per-phase questions.
- If the repository is not-owned, verify the current worktree/branch is using the configured fork. If it is not, stop and switch to the configured fork workflow before creating artifacts or launching agents.

Repository ownership is collected once during setup and stored in conventions. Do not ask it again on every autonomous launch unless the stored convention is missing, incomplete, or contradicted by the current checkout.

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

## 5. Set up phase 0

Read `../starting-a-pipeline.md` and run that workflow. It identifies the task, creates the worktree and artifacts folder, writes `prompt.md`, and commits.

## 6. Continue per plan

If the plan's target phase is phase 0, stop here. The autonomous run ends with the prompt artifact ready for review.

If the plan extends to phase 1, read `running-the-spec-phase.md` and run that workflow with the per-phase decisions collected in step 3.
