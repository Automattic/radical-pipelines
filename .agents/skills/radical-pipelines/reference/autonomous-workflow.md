# Running the Autonomous Workflow

This is the entry point of the **autonomous workflow**. It collects the run plan with the owner up-front and then runs subsequent phases per the plan, stopping at the target phase.

The plan has three parts:

- **Next phase** — the phase after the current phase. This is where the run starts.
- **Target phase** — the highest phase to run in this autonomous run. This is where the run stops.
- **Per-phase decisions** — for each phase from the next phase up to the target phase, the choices that govern how that phase is executed.

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

Run each phase from the next phase up to the target phase, in order.

| Phase          | Subfolder      | Reference                             |
| -------------- | -------------- | ------------------------------------- |
| 0 - Prompt     | `0-prompt`     | Already in place                      |
| 1 - Spec       | `1-spec`       | `autonomous-phases/1 - spec.md`       |
| 2 - Design doc | `2-design-doc` | `autonomous-phases/2 - design-doc.md` |
| 3 - Plan       | `3-plan`       | `autonomous-phases/3 - plan.md`       |
| 4 - Code       | `4-code`       | `autonomous-phases/4 - code.md`       |
| 5 - Docs       | `5-docs`       | `autonomous-phases/5 - docs.md`       |

For each phase:

1. Create the phase subfolder inside the artifacts folder. Creating the folder marks the phase as **in progress**; completion is determined separately by the **Per-phase completion** predicate in `pipeline-versioning.md`.
2. Read its phase reference.
3. Run the phase per its reference, applying the per-phase decisions collected in step 3.
4. When the phase's completion predicate is satisfied, give the owner a short report before moving on: which phase completed, where its artifacts live, and any notes worth surfacing (e.g. number of rejected review iterations, deviations from defaults). Do not ask questions — this is informational only.
5. Continue with the following phase, until the target phase has completed.

If a phase fails, stop and report to the owner.

Important:

- Follow the **Team spawning** convention for how to define and launch teams of agents.
- Each time you spawn an agent, include the following project conventions in its initial prompt:
  - **Artifact folder** — the absolute and full path to this pipeline's artifact folder.
  - **Commit format** — the commit message format the agent must use.
- Agents commit their own artifacts following the **Commit format** convention. The orchestrator does not commit on their behalf.

## 6. Handle blockers

Agents are instructed to stop and report a blocker — instead of inventing a missing decision — when a required input is missing, contradictory, or would force them to make a choice that belongs to a prior phase. Every agent that reports a blocker is expected to include the same payload:

- **What is missing or contradictory** — the specific gap or conflict.
- **Which prior-phase artifact must change to unblock it** — for example, `<artifacts-folder>/2-design-doc/design-doc.md`.
- **(If known) The smallest revision that would unblock** — a sentence or two the prior-phase agent could act on.

When a blocker arrives:

1. Stop the autonomous run immediately. Do not advance to the next phase, and do not relaunch the blocked agent without an input change.
2. Surface the blocker to the owner verbatim, including the three fields above and the path to any partial artifact the agent committed (most agents do not commit a partial artifact; some — see `spec-consolidator` — leave clearly-marked TODOs and commit, which is a documented exception).
3. Name the prior phase the owner needs to re-run to address the gap.

Resume is currently manual: the owner re-runs the prior phase in a fresh session (treating the blocker payload as feedback), confirms the new artifact is committed, then re-launches the blocked phase. Automatic backtracking is out of scope for this version of the workflow.

## 7. Close out the run

Once the target phase has been reported, tell the owner that the autonomous run is complete.
