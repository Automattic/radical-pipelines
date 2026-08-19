# Running the Autonomous Workflow

This is the entry point of the **autonomous workflow**. It collects the run plan with the owner up-front and then runs subsequent phases per the plan, stopping at the target phase.

The plan has three parts:

- **Next phase** — where the run starts: the pipeline's next phase per `pipeline-versioning.md`.
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

At run start:

1. Ensure the run branch's worktree exists per the **Worktree root** convention.
2. Start a recurring health monitor for the run per `health-monitoring.md`.

You own all branch and worktree topology: you create every branch and worktree (including lane branches and worktrees before lane agents spawn) and remove worktrees when their work is done — branches remain. Agents only occupy the worktrees you prepared. Address every tree explicitly — `git -C <worktree> …`, absolute paths for reads and writes, `git show <ref>:<path>` for any branch; your own working directory changes only to seat an agent.

| Phase          | Subfolder      | Reference                             |
| -------------- | -------------- | ------------------------------------- |
| 0 - Intent     | `0-intent`     | Already in place                      |
| 1 - Spec       | `1-spec`       | `autonomous-phases/1 - spec.md`       |
| 2 - Design doc | `2-design-doc` | `autonomous-phases/2 - design-doc.md` |
| 3 - Build      | `3-build`      | `autonomous-phases/3 - build.md`      |
| 4 - Document   | `4-document`   | `autonomous-phases/4 - document.md`   |

For each phase:

1. Create the phase subfolder inside the run folder (`<pipeline-family-folder>/<run>/<phase>` per `pipeline-versioning.md`).
2. Read its phase reference.
3. Run the phase per its reference, applying the per-phase decisions collected in step 3.
4. Verify the phase's completion predicate per `pipeline-versioning.md` ("Per-phase completion").
5. Give the owner a short report before moving on: which phase completed, where its artifacts live, and any notes worth surfacing (e.g. number of rejected review iterations, deviations from defaults). Do not ask questions — this is informational only.
6. Continue with the following phase, until the target phase has completed.

If a phase fails, stop and report to the owner.

Every three consecutive rejections in a producer/reviewer loop, inspect the rejection records for their cause. If the same pattern is repeating and could perpetuate indefinitely, stop the run: surface the latest rejection to the owner and perform the close-out (step 7). Otherwise let the loop continue.

Each time you spawn an agent:

- Follow the **Team spawning** convention to spawn the agent seated in its worktree — started inside it, its branch checked out.
- Give the agent a name unique within the run and hold its identifier — the handle that directs a message to that agent alone, assigned at spawn or returned by it per the **Team spawning** convention. Address every message to an agent by its identifier.
- Include the `## Conventions` block at the top of its initial prompt per `conventions/passing.md`.
- Resolve its model and settings via the **Agent models** convention and apply them as parameters of the spawn itself.
- When a launch prompt carries prior-phase evidence — such as a rejection's issues — pass it whole: as the committed file's path when one holds it, verbatim otherwise, never interpreted or framed.

Agents message you when their work completes, when they need research or a decision, and when they hit a blocker; an agent serving a request answers its requester. Every message you send an agent carries work it must act on.

## 6. Handle blockers

Agents are instructed to stop and report a blocker — instead of inventing a missing decision — when a required input is missing, contradictory, or would force them to make a choice that belongs to a prior phase. Every agent that reports a blocker is expected to include the same payload:

- **What is missing or contradictory** — the specific gap or conflict.
- **Which approved artifact must change to unblock it** — for example, `<pipeline-family-folder>/<run>/2-design-doc/design-doc.md`.
- **(If identifiable) The smallest revision that would unblock** — a sentence or two the prior-phase agent could act on.

When a blocker arrives:

1. Stop the autonomous run immediately. Do not advance to the next phase, and do not relaunch the blocked agent without an input change.
2. Surface the blocker to the owner verbatim, including the three fields above and the path to any partial artifact the agent committed.
3. Name the phase whose artifact must change. The route to change it is a fork cut below that phase (`fork-pipeline.md`), re-running it with the blocker payload as input.

A blocker stops the run: perform the close-out (step 7).

## 7. Close out the run

Close-out fires whenever the run stops — target phase completed, a blocker, an owner cancellation, or a failure:

1. Stop the health monitor (see `health-monitoring.md` for the cancellation command).
2. Push the run branch and any remaining lane branches.
3. Tell the owner that the autonomous run is complete.
