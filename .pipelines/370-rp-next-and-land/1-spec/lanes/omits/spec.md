---
{
  "inputs": [
    "0-intent/intent.md@bbb4e5c14599"
  ]
}
---
# Spec: Run each loop step with rp next and rp land

## Overview

A step of the loop today leaves the orchestrator running Git and `rp` commands, computing each role's paths, creating or updating lane branches and worktrees, finding the commits assignments are built from, reading assignments for turn commits, stamping and committing certifications, merging or cherry-picking lanes, and comparing two checks to learn which phases completed (observed: `production-lanes-today.out`, `review-lane-today.out`, and `changed-inputs-today.out`, and the skill's `reference/run/loop.md`; evidence files cited by bare name are in `1-spec/lanes/omits/spec/`). The last five changes to `rp` fixed orchestrator errors in exactly these steps (intent-context-1).

The change makes a step of the loop `rp` plus the agentic tool. `rp next` prints the plan for the frontier and `rp next --apply` applies it; the orchestrator fires the hooks the plan names and spawns, wakes, terminates, and watches roles through its tool. `rp land` lands each role's turn and reports which phases became complete. To run the loop, the orchestrator runs no Git command, computes no path, and reads no thread or assignment.

## Requirements

spec-requirement-1: `rp next <pipeline folder>` prints the plan for the pipeline's frontier and changes nothing: no worktree, branch, file, assignment, or commit.

origin: from-intent intent-proposal-1, intent-constraint-2

observed: `rp next` and `rp land` do not exist today; both print `rp: unknown command` (`commands-today.out`). Every existing command takes one pipeline-folder argument and named options (`skills/radical-pipelines/scripts/README.md`, opening grammar), so `next [--apply]` and `land [--lane <lane>]` fit the grammar. The proposal's command names are adopted.

spec-requirement-2: The plan states, for the step: each worktree it creates and each it removes, with the role the worktree is for; each branch it moves; each assignment it writes; each role to terminate first; and each role to wake, with its profile, its lane when it has one, its model or that it has none, and the names of the resources it receives.

origin: from-intent intent-constraint-2

observed: today `rp assign` prints the assignment's path and the role's model, and prints no model when the run gives none (`production-lanes-today.out` step 4; README § `assign`). Resources reach a role through its assignment, selected by the role's profile (README § Conventions data).

spec-requirement-3: The plan names every path and name the orchestrator needs to run the step: each created worktree's path, each branch, each assignment's path, and the worktree each woken role sits in. A created worktree sits where the project's Worktree folder root convention puts it; in this repository, `.worktrees/<branch>`.

origin: from-intent Goal

observed: today `rp assign` stops while a lane's worktree is missing, leaving the orchestrator to create it (`production-lanes-today.out` step 2). The Worktree folder root convention of this repository is prose in `.rp.md`'s body, and the frontmatter data holds no worktree location (`.rp.md`).

spec-requirement-4: The plan covers every action of the frontier, all of its lanes at once:
- `lane <artifact> <id>`: a worktree for the lane's producer on the lane's branch at the pipeline branch's tip, created, or brought to the tip when it exists; the lane's producer to wake.
- `consolidate <artifact>`: the lane producers to terminate first; their worktrees removed; a producer to wake in the pipeline worktree.
- `produce <artifact>`, `respond <artifact>`: the artifact's owner to wake in the pipeline worktree.
- `review <lane>`: the lane's review branch moved to the change built from the pipeline branch's tip, its worktree on that branch created when missing, and its reviewer to wake.
- `INVALID <path>: <reason>` for a file some role writes: that role to wake, a reviewer to repair; for a file no role writes, such as the intent: the file and reason, and no role to wake for it.
- `complete` and `escalate <thread>`: no action.

origin: derived Goal, a step of the loop dispatches each line its frontier holds

observed: the dispatch table of `reference/run/loop.md` gives these actions per line today; `rp assign` stops for a role the frontier does not wake, including every role on an `INVALID` intent (`invalid-phase0-today.out`).

spec-requirement-5: `rp next <pipeline folder> --apply` applies the plan and does exactly what it states: it creates and removes the planned worktrees, moves the planned branches, and writes the planned assignments, and nothing else. It starts, messages, and stops no agent.

origin: from-intent intent-proposal-1, intent-constraint-1, intent-constraint-2

assumed: comparing the repository's worktrees, branch tips, files, and the agent tool's sessions before and after confirms it.

spec-requirement-6: Applying the plan a second time, or after a partial failure of an earlier application, completes what remains and repeats nothing done: a worktree, branch, or assignment that already is as the plan states is left as it is, and the plan printed after an application lists none of them again.

origin: from-intent intent-constraint-7

assumed: applying twice and applying after an interrupted application, then comparing state, confirms it.

spec-requirement-7: While a review lane's branch holds commits the pipeline branch lacks, `rp next` and `rp next --apply` stop, name those commits, and move nothing.

origin: derived intent-constraint-7, a review lane whose turn ended but was never landed, which a step planned again

observed: `rp review` stops this way today (`unlanded-today.out`); the health tick treats "steps that never land" as an input of intended use (`reference/conventions/health-monitoring.md` § Each tick, 6).

spec-requirement-8: Every lifecycle hook a project writes fires at its moment, with what its instructions need, and the plan names the hooks the orchestrator fires, each with the role it concerns. The hooks of the worktrees the plan creates and removes bracket the plan's application: `before-` hooks fire before it, `after-` hooks after it, each knowing the role its worktree is for. The hooks of the agents the plan terminates and wakes bracket those actions: a role is terminated, with its hooks, before its worktree's removal hooks, and a role's worktree creation hooks fire before its spawning hooks, which know the resources the role receives. No hook fires for creating a branch.

origin: from-intent intent-constraint-3

observed: this repository writes `after-creating-worktree`, `run-started`, `phase-completed`, `run-ended`, and `after-merging-pr` (`.rp.md`); `reference/conventions/lifecycle-hooks.md` defines every moment.

spec-requirement-9: `rp land <pipeline folder>` lands the turn of the role that sits in the pipeline worktree, and `rp land <pipeline folder> --lane <lane>` lands the turn of that lane's role, each as one command. It verifies the turn's commits, brings a lane's work onto the pipeline branch (a production lane's commits, and a review lane's own commits but not the commits that built its change), records the certification of the role's artifact and of every review thread the turn closed `approved`, and commits it. Afterwards `rp check` shows the artifact fresh or the review lane approved, and the pipeline worktree has nothing uncommitted from the landing.

origin: from-intent intent-constraint-4, intent-proposal-1

observed: today these are separate orchestrator steps (`production-lanes-today.out` steps 6 and 7; `review-lane-today.out`, landing). `rp check` shows `review default approved` once they are done (`review-lane-today.out`).

spec-requirement-10: Landing stops, names the reason, and lands nothing when the role's commits are not on its branch: the role's worktree is not on the role's branch, or its branch lacks the turn commit.

origin: from-intent intent-constraint-4

observed: "verify its commits are on its branch" is a landing step today (`reference/run/state.md` § Certification).

spec-requirement-11: A pipeline file the turn changed that does not validate stops landing, naming the file and the reason, as `rp: <path>: <reason>`; no commit of the turn reaches the pipeline branch. A review thread the turn closed `approved` that `rp stamp` rejects stops landing the same way.

origin: from-intent intent-constraint-4

observed: `rp check` names a malformed thread (`frontier INVALID threads/1-bad.md: frontmatter has no opener`) while `rp stamp` of a candidate in the same tree succeeds without reading it (`production-lanes-today.out` step 8; README § `stamp`).

spec-requirement-12: A landing of a lane brackets with `before-merging-lanes` and `after-merging-lanes`; a landing of a role without a lane fires neither.

origin: from-intent intent-constraint-4

observed: a role without a lane commits in the pipeline worktree itself, so nothing merges (`reference/run/state.md` § Certification).

spec-requirement-13: Landing reports which phases became complete: each phase through the target that was not complete before the landing and is complete after it. A phase is complete when the frontier lies beyond it: no role of that phase or of a phase below it has work. The frontier `complete` completes every phase through the target. A landing that completes no phase reports none; phase 0 is never reported.

origin: from-intent intent-constraint-5

observed: the frontier is the lowest phase with work (`reference/run/state.md` § The frontier); `phase-completed` fires "when a phase becomes complete" (`reference/conventions/lifecycle-hooks.md`), and today the orchestrator finds it by comparing checks (intent-context-1).

spec-requirement-14: What `rp` derives from the tree and the assignments it wrote is never an argument: `rp next` and `rp land` take the pipeline folder, `--apply`, and `--lane` only, and the turn commit, the lanes of the step, the candidates a consolidation merges, and the commit each changed input is diffed from are never given.

origin: from-intent intent-constraint-6

observed: the commit each changed input is diffed from is already written in the producer's assignment (`changed-inputs-today.out`: `changed since ec7de09…`); a command takes only its options and one positional argument (README, opening grammar).

spec-requirement-15: A step of the loop needs from the orchestrator only: `rp` commands, firing the hooks the plan and the landing name, and spawning, waking, terminating, and watching roles through its tool. In a step it runs no Git command, passes only paths `rp` printed, and reads no thread or assignment.

origin: from-intent Goal

assumed: a run through production lanes, consolidation, implementation, and review, with the orchestrator's tool calls inspected, confirms it.

## Acceptance criteria

spec-acceptance-criterion-1: Given a pipeline whose frontier names two production lanes, when `rp next <pipeline folder>` runs, then its output names for each lane the worktree to create with its path under the project's Worktree folder root (`.worktrees/<branch>` here), the branch, the assignment's path, and the role to wake with profile, lane, model, and resource names, and afterwards `git worktree list`, the branch tips, and `git status` are as before.

spec-acceptance-criterion-2: Given that pipeline, when `rp next <pipeline folder> --apply` runs, then exactly the planned worktrees exist on the planned branches at the pipeline tip, with the planned assignments written, and the agent tool shows no agent started, messaged, or stopped.

spec-acceptance-criterion-3: Given the production lanes' candidates landed, when `rp next` runs, then its output names the lane roles to terminate first, the lane worktrees to remove, and the producer to wake in the pipeline worktree; after `--apply` the lane worktrees are gone.

spec-acceptance-criterion-4: Given a frontier naming review lanes, when `rp next --apply` runs, then each lane's review branch is at the change built from the pipeline tip, each lane has a worktree on it, and the plan named a reviewer to wake for each.

spec-acceptance-criterion-5: Given a malformed intent, when `rp next` runs, then its output names the file and the reason and wakes no role for it; given a malformed spec committed in the pipeline worktree, when `rp next` runs, then it plans the spec producer's repair turn.

spec-acceptance-criterion-6: Given a `complete` or an `escalate` frontier, when `rp next` runs, then its output plans no worktree, branch, assignment, or role.

spec-acceptance-criterion-7: Given a plan applied once, when it is applied again, then worktrees, branches, and assignments are unchanged and the command succeeds; given an application that stopped after creating some of its worktrees, when it is applied again, then the missing worktrees exist and the others are unchanged.

spec-acceptance-criterion-8: Given a review lane whose reviewer committed a turn that was not landed, when `rp next` or `rp next --apply` runs, then it exits non-zero naming the unlanded commits and the lane's branch and worktree are unchanged.

spec-acceptance-criterion-9: Given a project with a hook for each worktree and agent moment, when a step plans a review lane's worktree and reviewer, then the plan names the worktree hooks with the role `reviewer-<lane>`, the spawning hooks with the resource names the reviewer receives, and no branch hook.

spec-acceptance-criterion-10: Given a role without a lane that committed its artifact in the pipeline worktree, when `rp land <pipeline folder>` runs, then `rp check` reports the artifact fresh, the certification is committed, the worktree has nothing uncommitted from it, and the output reports the phase when it became complete.

spec-acceptance-criterion-11: Given a production lane that committed its candidate, when `rp land <pipeline folder> --lane <lane>` runs, then the pipeline branch holds the candidate and its certification, and `rp check` reports the candidate fresh.

spec-acceptance-criterion-12: Given a review lane that closed its review thread `approved` at the change, when `rp land <pipeline folder> --lane <lane>` runs, then `rp check` reports the lane approved and fresh, and the output reports phase 4 only when every lane is approved.

spec-acceptance-criterion-13: Given a role whose branch lacks the turn commit, or a turn whose changed pipeline file does not validate, when `rp land` runs, then it exits non-zero printing `rp: <reason>` or `rp: <path>: <reason>`, and the pipeline branch's tip is as before.

spec-acceptance-criterion-14: Given any step, when `rp next` or `rp land` runs with an option for the turn commit, the lanes, the candidates, or a diff commit, then it rejects the option.

spec-acceptance-criterion-15: Given a landing of a lane, when the orchestrator runs it, then `before-merging-lanes` fired before the command and `after-merging-lanes` after it; given a landing without `--lane`, then neither fired.

spec-acceptance-criterion-16: Given a run from the first production lane through review, when the orchestrator's tool calls are inspected, then every step holds only `rp` commands, hook instructions, and agent-tool calls; no Git command, no read of a file under `threads/` or of an assignment, and every path it passed appears in `rp` output.

spec-acceptance-criterion-17: Given a landing that leaves the frontier in the same phase, such as a production lane's landing while the root is missing, when `rp land` runs, then its output reports no completed phase; given a landing after which the frontier is `complete`, then it reports every phase through the target that was not complete before, and never phase 0.

## Exclusions

spec-exclusion-1: `rp` does not start, message, or stop an agent, and does not decide a role has ended its turn.

spec-exclusion-2: `rp` fires no lifecycle hook; the plan names them and the orchestrator fires them.

spec-exclusion-3: The steps outside the loop stay as they are: creating a pipeline and its worktree, triage, recording phase 0, changing the run configuration, the owner escalation and its dossier, health monitoring, close-out including terminating the remaining agents and removing the remaining worktrees and branches, and opening, merging, or closing a pull request.

spec-exclusion-4: `rp next` and `rp land` fetch, push, and contact no remote.

spec-exclusion-5: Assignments, templates, artifact formats, the frontier rules, and the meaning of a certification stay as they are: landing records the certification `rp stamp` records today and adds no pipeline file kind.

spec-exclusion-6: `rp check` gains no output.

## Considered and not required

- `rp check --json` reporting, for each changed input, the commit it is diffed from, and the phases that are complete (intent-proposal-2) — no intended use reads them from `rp check`: the commit already reaches the producer in its assignment (observed: `changed-inputs-today.out`), `rp land` reports completed phases (spec-requirement-13), and the report entry renders phase states only (observed: `reference/entries/report.md`).
- A machine-readable (`--json`) form of the plan — the orchestrator reads `rp assign`'s printed lines today (observed: `reference/run/loop.md` § Waking a role); no consumer is shown.
- Removing a production lane's branch at consolidation — the intent lists the branches the plan moves; the lane branch holds only landed commits and no step reads it afterwards (observed: `production-lanes-today.out` step 7); close-out removes the remaining branches.
- Landing a turn twice, or after a partial failure of a landing — intent-constraint-7 names applying a plan; a landing that stops lands nothing (spec-requirement-11).
- A role that ends its turn with uncommitted changes — the intent verifies the role's commits, not its worktree (observed: `reference/run/state.md` § Certification).
- Landing every ended role in one command — the intent lands "a turn", and the orchestrator lands each ended role (observed: `reference/run/loop.md` § One step, 4).
- Two lanes of different profiles sharing an id in one step — the frontier's actions belong to one phase, except `INVALID` lines, and no source shows the candidates of two phases malformed at once (observed: `reference/run/state.md` § The frontier).
- Applying a plan while the roles an earlier step woke still run — the loop lands them before it plans again and `rp` watches no agent (observed: `reference/run/loop.md` § One step, 4).
- Hooks `run-started`, `run-ended`, `escalation-raised`, the pipeline and pull request hooks in the plan — their moments lie outside a step (observed: `reference/conventions/lifecycle-hooks.md`).
- Reading intent-constraint-3's "`before-` hooks fire before the plan is applied and `after-` hooks after it" as covering the agent hooks — not taken: the spawn follows the application, so `before-spawning-agent` before it would reset an environment before `after-creating-worktree` starts it, which changes today's order (observed: `reference/run/loop.md` § Review lanes and § Waking a role).
- Creating the pipeline's own worktree in a step — the worktree exists before the loop starts (observed: `reference/run/loop.md`, opening).
- Reading intent-constraint-4's "bracketed by `before-`/`after-merging-lanes` when it lands a lane" as covering a role without a lane — not taken: nothing merges (spec-requirement-12).

## Open assumptions

spec-assumption-1: After a partial failure, the `after-` hooks of the actions the failed application completed, such as a worktree it created, still fire before a role works there, although a repeated plan does not list the action — assumed: an application interrupted after creating a worktree, then repeated, shows the worktree's `after-creating-worktree` instructions run exactly once.

spec-assumption-2: After landing stops on a malformed file, the file's author repairs it and the run continues, rather than stopping the run for the owner — assumed: a lane reviewer's malformed thread, refused at landing, is repaired by that reviewer and landed.

spec-assumption-3: The commits landing makes satisfy the project's commit-format convention, which this repository ends with the profile name in parentheses, `(orchestrator)` on the orchestrator's commits — assumed: the subject of a landing's commit in this repository matches the form of `Stamp review approvals (orchestrator)`.
