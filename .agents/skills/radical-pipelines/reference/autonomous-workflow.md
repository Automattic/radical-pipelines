# Running the Autonomous Workflow

This is the entry point of the **autonomous workflow**. It collects the run plan with the owner up-front and then runs subsequent phases per the plan, stopping at the target phase.

The plan has two parts:

- **Target phase** — the highest phase to run in this autonomous run.
- **Per-phase decisions** — for each phase from the next-to-run up to the target, the choices that govern how that phase is executed.

Collect everything up-front. Once the autonomous run starts, do not ask the owner additional questions until the target phase finishes.

## 1. Frame the conversation

Tell the owner explicitly that this is the autonomous workflow and that you will collect all the decisions up-front so the run can then proceed without interruptions.

## 2. Ask the target phase

Ask the owner where the autonomous run should stop. Frame it in plain language; do not show the owner internal phase numbers unless they ask.

If the owner does not specify, default to the last phase.

## 3. Collect per-phase decisions

For each phase included in the autonomous run, read its reference and look at the `Decisions` section. Ask the owner about any choice the owner has not already specified.

## 4. Confirm the plan

Restate the full plan back to the owner in plain language: that this is an autonomous run, the target phase, and any non-default per-phase decisions. If the owner accepts, proceed. If they want changes, revise and confirm again.

## 5. Execute the planned phases

Run each phase from the next-to-run up to the target, in order. The next-to-run is the phase immediately after the highest committed phase captured when the pipeline was located (see `work-on-an-issue.md`, step 2).

| Phase             | Subfolder         | Reference                                |
| ----------------- | ----------------- | ---------------------------------------- |
| 0 (Prompt)        | `0-prompt`        | Already in place                         |
| 1 (Spec)          | `1-spec`          | `autonomous-phases/1 - spec.md`          |
| 2 (Design doc)    | `2-design-doc`    | `autonomous-phases/2 - design-doc.md`    |
| 3 (Plan)          | `3-plan`          | `autonomous-phases/3 - plan.md`          |
| 4 (Code)          | `4-code`          | `autonomous-phases/4 - code.md`          |
| 5 (Documentation) | `5-documentation` | `autonomous-phases/5 - documentation.md` |

For each phase:

1. Create the phase subfolder inside the artifacts folder.
2. Read its phase reference.
3. Run the phase per its reference, applying the per-phase decisions collected in step 3.
4. When the phase finishes, give the owner a short report before moving on: which phase completed, where its artifacts live, and any notes worth surfacing (e.g. number of review iterations, deviations from defaults). Do not ask questions — this is informational only.
5. Move to the next phase, until the target phase has finished.

If a phase fails, stop and report to the owner.

Important:

- Follow the **Team spawning** convention for how to define and launch teams of agents.
- Each time you spawn an agent, include the following project conventions in its initial prompt:
  - **Artifact folder** — the absolute and full path to this pipeline's artifact folder.
  - **Commit format** — the commit message format the agent must use.
- Agents commit their own artifacts following the **Commit format** convention. The orchestrator does not commit on their behalf.

## 6. Close out the run

Once the target phase has been reported, tell the owner that the autonomous run is complete.
