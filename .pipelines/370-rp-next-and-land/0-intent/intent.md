origin: issue 370
origin: starts-from 369-conventions-as-data

# Run each loop step with rp next and rp land

## Goal

A step of the loop is `rp` plus the agentic tool. `rp` plans the step; the orchestrator fires the hooks the plan names and drives the roles with its tool; `rp` applies the plan and lands each turn. To run the loop, the orchestrator runs no Git command, computes no path, and reads no thread or assignment.

## Constraints

intent-constraint-1: Spawning, waking, terminating, and watching roles stay the orchestrator's, through its tool's mechanics. `rp` never starts, messages, or stops an agent.

intent-constraint-2: The plan is read-only, and applying it does exactly what it states: the worktrees it creates and removes and the role each one is for, the branches it moves, the assignments it writes, the roles to terminate first, and the roles to wake, each with its profile, lane, model, and the resources it receives.

intent-constraint-3: Every lifecycle hook a project writes today still fires at its moment, with what its instructions need: `before-` hooks fire before the plan is applied and `after-` hooks after it, and a worktree's hooks know which role the worktree is for. A hook may be renamed, merged, or removed when the same instructions still run at the same moment. `before-`/`after-creating-branch` may go: a branch is a ref with no effect on any environment.

intent-constraint-4: Landing a turn — verifying its commits, merging or cherry-picking a lane, recording the certification, and committing it — is one `rp` command, bracketed by `before-`/`after-merging-lanes` when it lands a lane. A file that does not validate stops landing, naming the file and the reason.

intent-constraint-5: Landing reports which phases became complete.

intent-constraint-6: What `rp` can derive from the tree and the assignments it wrote is never a parameter: the candidates a consolidated root merged, a role's turn commit, the lanes the frontier names, and the commit each changed input is diffed from.

intent-constraint-7: Applying a plan twice, or again after a partial failure, completes it without repeating what is done.

## Context

intent-context-1: Today one step of the loop has the orchestrator run `rp check`; compute each role's paths; create or update lane branches and worktrees; run `rp review` for each review lane; save the diff for a reviewer's later turn after reading its thread; find the commit that last changed each changed input; fill and write each assignment; and spawn or wake. At landing it reads each turn commit from the assignment, runs `rp stamp` on each file, commits the stamps, cherry-picks a review lane's commits and stamps its approvals at `HEAD`, merges a production lane's branch, and works out which phases completed by comparing checks. The last five changes to `rp` before this series fixed orchestrator errors in exactly these steps.

intent-context-2: Projects rely on worktree and agent hooks. `after-creating-worktree` installs dependencies and starts environments, blocking, and does more for a worktree that will run the implementer; `before-removing-worktree` stops a worktree's environments before it goes; `before-spawning-agent` resets an environment only when the agent receives a given resource; `after-terminating-agent` deletes the agent's own environment.

intent-context-3: This change starts from the change that makes project conventions data and has `rp` write each role's assignment.

## Proposals

intent-proposal-1: `rp next <pipeline folder>` prints the plan, `rp next <pipeline folder> --apply` applies it, and `rp land <pipeline folder> [--lane <lane>]` lands a turn.

intent-proposal-2: `rp check --json` also reports, for each changed input, the commit it is diffed from, and the phases that are complete.
