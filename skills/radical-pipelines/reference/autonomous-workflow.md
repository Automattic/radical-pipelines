# Running the Autonomous Workflow

This is the entry point of the **autonomous workflow**. It collects the run plan with the owner up-front and then runs subsequent phases per the plan, stopping at the target phase.

The plan has three parts:

- **Next phase** — where the run starts. This is the pipeline's active phase if one exists; otherwise the phase after the completed phase (see `pipeline-versioning.md`).
- **Target phase** — the highest phase to run in this autonomous run. This is where the run stops.
- **Per-phase decisions** — for each phase from the next phase up to the target phase, the choices that govern how that phase is executed.

Collect everything up-front. Once the autonomous run starts, do not ask the owner additional questions until the target phase finishes.

## 1. Frame the conversation

Tell the owner explicitly that this is the autonomous workflow and that you will collect all the decisions up-front so the run can then proceed without interruptions.

## 2. Ask the target phase

Ask the owner where the autonomous run should stop. Frame it in plain language; do not show the owner internal phase numbers unless they ask.

If the owner does not specify, default to the last phase.

## 3. Collect per-phase decisions

For each phase included in the autonomous run, read its reference and look at the `Decisions` section. Ask the owner about any choice the owner has not already specified — the lane count for the spec and design-doc phases, and the lane mode (isolated or divergent) for the design-doc phase.

## 4. Confirm the plan

Restate the full plan back to the owner in plain language: that this is an autonomous run, the target phase, and any non-default per-phase decisions. If the owner accepts, proceed. If they want changes, revise and confirm again.

## 5. Execute the planned phases

Run each phase from the next phase up to the target phase, in order.

At run start:

1. Create the run branch and its worktree per the **Branch names** and **Worktrees** conventions, starting the branch per `pipeline-versioning.md` ("Branches").
2. Start a recurring health monitor for the run per `reference/health-monitoring.md`.

You own all branch and worktree topology: you create every branch and worktree (including lane branches and worktrees before lane agents spawn) and remove worktrees when their work is done — branches remain. Agents only occupy the worktrees you prepared. You never change your own working directory: address every tree explicitly — `git -C <worktree> …`, absolute paths for reads and writes, `git show <ref>:<path>` for any branch.

| Phase          | Subfolder      | Reference                             |
| -------------- | -------------- | ------------------------------------- |
| 0 - Intent     | `0-intent`     | Already in place                      |
| 1 - Spec       | `1-spec`       | `autonomous-phases/1 - spec.md`       |
| 2 - Design doc | `2-design-doc` | `autonomous-phases/2 - design-doc.md` |
| 3 - Build      | `3-build`      | `autonomous-phases/3 - build.md`      |
| 4 - Document   | `4-document`   | `autonomous-phases/4 - document.md`   |

For each phase:

1. Create the phase subfolder inside the run folder (`<artifact-folder>/<run>/<phase>` per `pipeline-versioning.md`). Creating the folder marks the phase as **in progress**.
2. Read its phase reference.
3. Run the phase per its reference, applying the per-phase decisions collected in step 3.
4. Verify the phase's completion predicate per `pipeline-versioning.md` ("Per-phase completion").
5. Give the owner a short report before moving on: which phase completed, where its artifacts live, and any notes worth surfacing (e.g. number of rejected review iterations, deviations from defaults). Do not ask questions — this is informational only.
6. Continue with the following phase, until the target phase has completed.

If a phase fails, stop and report to the owner.

Each time you spawn an agent:

- Follow the **Team spawning** convention.
- Include the `## Conventions` block at the top of its initial prompt per `reference/conventions/passing.md`.
- Resolve its model and settings via the **Agent models** convention and apply them as parameters of the spawn itself.

## 6. Handle blockers

Agents are instructed to stop and report a blocker — instead of inventing a missing decision — when a required input is missing, contradictory, or would force them to make a choice that belongs to a prior phase. Every agent that reports a blocker is expected to include the same payload:

- **What is missing or contradictory** — the specific gap or conflict.
- **Which prior-phase artifact must change to unblock it** — for example, `<artifact-folder>/<run>/2-design-doc/design-doc.md`.
- **(If identifiable) The smallest revision that would unblock** — a sentence or two the prior-phase agent could act on.

When a blocker arrives:

1. Stop the autonomous run immediately. Do not advance to the next phase, and do not relaunch the blocked agent without an input change.
2. Surface the blocker to the owner verbatim, including the three fields above and the path to any partial artifact the agent committed.
3. Name the prior phase the owner needs to re-run to address the gap.

The owner re-runs the prior phase treating the blocker payload as revision input, then relaunches the blocked phase.

## 7. Close out the run

Once the target phase has been reported:

1. Stop the health monitor (see `reference/health-monitoring.md` for the cancellation command).
2. Push the run branch and its lane branches, and apply the project's other run-end obligations from its conventions.
3. Tell the owner that the autonomous run is complete.
