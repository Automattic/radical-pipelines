---
{
  "inputs": [
    "0-intent/intent.md@bbb4e5c14599",
    "1-spec/lanes/demands/spec.md@6b88fbd4c571",
    "1-spec/lanes/omits/spec.md@f872d98b61be"
  ]
}
---
# Spec: Run each loop step with `rp next` and `rp land`

## Overview

Today a step of the loop is mostly the orchestrator's own Git and path work. It runs `rp check`, creates, updates, and removes lane branches and worktrees, and runs `rp review` and `rp assign` per role. To land the step's turns, it reads each turn commit from an assignment, runs `rp stamp` on each file, commits, merges or cherry-picks each lane, and compares checks to learn which phases completed. Landing also has gaps: a role's file that `rp` rejects still lands, a turn that ended with a blocker is certified as if its work were done, repeating a step fails or builds a new review change, and a changed input can be diffed from a commit older than the artifact's last landing.

After the change, a step is `rp` plus the agentic tool. `rp next <pipeline folder>` prints the step's plan and changes nothing. The orchestrator fires the plan's `before-` hooks, runs `rp next <pipeline folder> --apply`, which does exactly what the plan states, fires the `after-` hooks, and drives the roles with its tool. When a role's turn ends, `rp land <pipeline folder> --role <role>` lands it in one command and reports which phases became complete. Applying again repeats nothing already done. Throughout the loop, the orchestrator runs no Git command, computes no path, and reads no thread or assignment.

## Requirements

spec-requirement-1: `rp next <pipeline folder>` prints the plan for the pipeline's next step and changes nothing: no file in any worktree, no branch or other ref, no worktree, and no assignment.

origin: from-intent intent-goal, intent-constraint-2, intent-proposal-1

observed: `rp` has no `next` or `land` command: each stops with `rp: unknown command`, and the usage lists `check`, `stamp`, `pipelines`, `review`, and `assign` (`1-spec/spec/rp-today.txt`).

spec-requirement-2: The plan states everything the step does and everything the orchestrator needs to act on it:

- The frontier it dispatches.
- Each worktree applying creates: its absolute path, its branch, and the role it is for.
- Each worktree applying removes, and the role it was for.
- Each branch applying creates, moves, or deletes, and where it leaves it.
- Each assignment applying writes: its absolute path and its role.
- The roles to terminate before applying, each by profile and lane.
- The roles to wake, each with its profile, its lane, its model name as the run gives it or that the run gives none, the names of the resources its assignment carries, the absolute path of the worktree it sits in, its assignment's absolute path, the phase it works in, and whether its turn needs a fresh instance.
- The lifecycle hooks the step fires (spec-requirement-10), each with its moment and the worktree or role it concerns.
- Each rejected file no role writes, with its reason.

origin: from-intent intent-goal, intent-constraint-2

observed: today the orchestrator works each of these out itself. It composes each lane worktree's path from the **Worktree folder root** and the lane's branch (`skills/radical-pipelines/reference/run/state.md` § Names). It creates, merges into, and removes lane branches and worktrees with Git, and takes each assignment's path and the role's model from `rp assign`'s output, which prints no model when the run gives none (`skills/radical-pipelines/reference/run/loop.md` § Waking a role, § Production lanes, § Review lanes; `skills/radical-pipelines/scripts/README.md` § `assign`; `1-spec/spec/loop-walk.txt`). Resources reach a role only through its assignment, selected by its profile (`scripts/README.md` § Conventions data). A consolidation needs a fresh instance (`loop.md` § Waking a role), and `phase-started` fires the first time a step wakes a role of a phase (`loop.md` § One step).

spec-requirement-3: Each worktree a plan creates is where the project's **Worktree folder root** convention places it: in this repository, `.worktrees/<branch>`. `rp` reads that convention as conventions data, never from prose.

origin: derived intent-goal: the orchestrator computes no path, and the lane worktrees it creates today sit under the Worktree folder root, one per branch (`.rp.md` § Worktree folder root; `state.md` § Names), which Claude Code needs inside the repository to seat a role (`skills/radical-pipelines/tools/claude-code.md` § Seating).

observed: the Worktree folder root is a prose section of `.rp.md`, which `rp` does not read (`skills/radical-pipelines/reference/conventions/load.md` § Conventions), and `rp assign` stops while a lane's worktree is missing (`1-spec/spec/loop-edges.txt` E3).

spec-requirement-4: The plan dispatches each frontier line as the loop does today:

- `lane <artifact> <lane>`: the lane's branch and worktree hold the pipeline tip, created when absent. The lane's producer is woken there, and the lanes run in parallel.
- `consolidate <artifact>`: the phase's production lanes are terminated first, and their worktrees and branches removed. A fresh root producer is woken in the pipeline worktree.
- `produce <artifact>` and `respond <artifact>`: the artifact's owner is woken in the pipeline worktree.
- `review <lane>`: the lane's branch is at a change built from the pipeline tip, with a worktree on it. The lane's reviewer is woken there, and the lanes run in parallel.
- `INVALID <path>: <reason>`: each role that writes a rejected file is woken with that file's line among its Malformed files, a reviewer with its repair request in its lane's worktree. A rejected file no role writes, such as the intent or a later input, wakes no role; the plan names it for the orchestrator to fix.
- `escalate <thread>` and `complete`: nothing is created, removed, terminated, or woken. The plan names the frontier, which the orchestrator dispatches to owner escalation or close-out.

origin: derived intent-goal: a step dispatches every line of its frontier (`loop.md` § One step and its frontier table).

observed: `loop.md`'s frontier table, § Production lanes, and § Review lanes dispatch each line this way. On `INVALID threads/1-design-doc-producer-spec-producer-spec.md`, `rp assign` writes assignments for both `spec-producer` and `design-doc-producer` in the pipeline worktree (`loop-edges.txt` E7); on `INVALID 0-intent/intent.md`, it wakes no role (`1-spec/spec/invalid-intent-today.txt`). A lane worktree left from an earlier step stays at its old tip until the pipeline branch is merged into it (`loop-edges.txt` E8).

spec-requirement-5: `rp next <pipeline folder> --apply` does exactly what the plan states and nothing else. It creates and removes the worktrees the plan names, creates, moves, and deletes the branches it names, and writes the assignments it names. It leaves the pipeline branch where it is, changes no file in the pipeline worktree's tree, changes no worktree or branch the plan does not name, and starts, messages, and stops no agent.

origin: from-intent intent-constraint-1, intent-constraint-2, intent-proposal-1

observed: no step of today's dispatch commits to the pipeline branch; only landing does (`loop.md` § One step; `loop-walk.txt`).

spec-requirement-6: Applying a plan a second time changes nothing while the pipeline tip has not moved: every worktree, branch, and assignment stays as the first application left it, a review lane's branch and worktree at the change it built included. A plan printed after it names no worktree to create or remove and no branch to move.

origin: from-intent intent-constraint-7

observed: today repeating a step fails or redoes it. `git branch` and `git worktree add` stop when the branch or path exists, and `git commit` stops with nothing to commit (`loop-edges.txt` E5). `rp review` run twice, a second apart, on an unchanged pipeline tip builds two different changes (`1-spec/spec/review-twice.txt`).

spec-requirement-7: When applying stops partway, `rp next --apply` exits with a non-zero status, naming the action that failed and its reason. Applying again once the cause is repaired completes the remaining actions and repeats none that are done. Each lifecycle hook still fires once per action of the plan: its `before-` hook before the action, and its `after-` hook after the action completes.

origin: from-intent intent-constraint-7, intent-constraint-3

observed: `git worktree remove` stops on a worktree holding an untracked file, and removes one holding only ignored files such as installed dependencies (`loop-edges.txt` E6).

spec-requirement-8: A role's assignment, worktree, and branch stay as they were when it was woken until its turn has ended and landed, or has ended with a blocker. No later plan is applied before then.

origin: derived intent-constraint-2: a run resumed after the orchestrator's context is compacted finds roles still running and lands them when they end their turn (`skills/radical-pipelines/SKILL.md`), and a role rereads its assignment after compaction (`agents/spec-producer.md` § Role).

observed: today the actions a plan takes rewrite a seat: `rp assign` replaces the previous turn's assignment, and `rp review` runs `git reset --hard` to the new change in the lane's worktree (`scripts/README.md` § `assign` step 5, § `review`). A dead role is respawned with the assignment already written (`skills/radical-pipelines/reference/conventions/health-monitoring.md` § Recovery).

spec-requirement-9: Applying a plan never discards a lane's commits that have not landed on the pipeline branch. They reach the pipeline branch with a landing of that lane.

origin: derived intent-goal: a lane's turn can end without landing before the next step is planned, as when the orchestrator's context is compacted (`SKILL.md`) or a step never lands (`health-monitoring.md` § Each tick step 6).

observed: today `rp review` stops on a lane branch holding commits the pipeline branch lacks, naming them (`loop-edges.txt` E2), and the loop has the orchestrator land them first (`loop.md` § Review lanes step 1).

spec-requirement-10: Every lifecycle hook a project writes today still fires at its moment, knowing what its instructions need, and the plan names each one the step fires:

- `before-creating-worktree` and `before-removing-worktree` fire before the plan is applied, and `after-creating-worktree` and `after-removing-worktree` after it. Each knows the worktree and the role it is for.
- `before-terminating-agent` and `after-terminating-agent` fire around each termination the plan names, before the plan is applied and before the `before-removing-worktree` of the terminated role's worktree. Each knows the terminated role.
- `before-spawning-agent` and `after-spawning-agent` fire around each spawn of a role the plan wakes, after the `after-creating-worktree` of its worktree. Each knows the role and the names of the resources its assignment carries.
- `phase-started` fires the first time a step wakes a role of a phase, and again when work on it resumes, knowing the phase.
- `before-merging-lanes` fires before `rp land` lands a lane's role, and `after-merging-lanes` after it. Landing a role in the pipeline worktree fires neither.
- `phase-completed` fires after a landing, once for each phase that landing reports complete, in phase order.
- No hook fires for a lane branch.

A blocking instruction that fails stops the run through close-out. One in a `before-` hook first keeps its action from happening: the plan is not applied, or the lane is not landed. Each hook block a project's `.rp.md` holds today runs its instructions at the same moment after the change; where the change renames or merges its hook, setup's migration moves the block, with the owner's confirmation.

origin: from-intent intent-constraint-3, intent-constraint-4, intent-context-2

observed: `skills/radical-pipelines/reference/conventions/lifecycle-hooks.md` defines each moment and the blocking rule. `loop.md` § One step fires `phase-started`, `phase-completed`, and the merging-lanes pair at these moments, and every branch and worktree the orchestrator creates, a lane's included, fires its creating hooks (`skills/radical-pipelines/reference/entries/triage.md` § 5). This repository writes `after-creating-worktree`, blocking, `run-started`, `phase-completed`, `run-ended`, and `after-merging-pr` (`.rp.md` § Lifecycle hooks). Migration applies heading renames with the owner's confirmation (`skills/radical-pipelines/reference/conventions/setup.md` § Migration).

spec-requirement-11: `rp land <pipeline folder> --role <role>` lands that role's turn in one command, the role named as the plan names it, whether it sits in the pipeline worktree or in a lane's. Landing:

- verifies that the turn's commits are on the role's branch, descending from its turn commit, and otherwise stops, naming the worktree and the reason, and lands nothing;
- certifies the role's artifact or candidate at the turn's commit, when it exists, and each review thread the turn closed `approved`, recording as its approved commit the pipeline commit that holds it;
- commits the certifications, leaving nothing of the landing uncommitted;
- brings a lane's commits onto the pipeline branch: a production lane's, and a review lane's own commits without those that built its change.

Afterwards, `rp check` reports the artifact or candidate fresh, or the review lane approved.

origin: from-intent intent-goal, intent-constraint-4, intent-proposal-1

observed: today these are separate steps the orchestrator runs: it reads the turn commit from the assignment, runs `rp stamp --at`, `git add`, and `git commit`, then `git merge` for a production lane or `git cherry-pick` of the commits after the change for a review lane. A reviewer's assignment has no Turn commit field, so the orchestrator took the change from `rp review`'s output (`loop.md` § One step step 4; `state.md` § Certification; `loop-walk.txt`, Step 1 and Step 5 landings).

spec-requirement-12: A file the landed turn changed that does not validate stops landing. `rp land` exits with a non-zero status, names each such file with the reason `rp check` gives for it, and lands nothing: it writes and commits no certification, and no commit of a lane's turn reaches the pipeline branch.

origin: from-intent intent-constraint-4

observed: today a production lane's candidate with frontmatter stops `rp stamp` (`carries no frontmatter`), yet the loop has no stop, so merging the lane puts it on the pipeline branch, where `rp check` reports it `INVALID`. A review thread with `status: pending` is no approval, so nothing stamps it, and the cherry-pick lands it (`loop-edges.txt` E1a, E1b).

spec-requirement-13: After landing stops on a file, the next step wakes that file's author in the worktree where it wrote the file, with the file's line among its Malformed files, or, for a reviewer, with its repair request. The author's commits on its branch are kept, and once its repaired turn lands, the commits of both turns are on the pipeline branch.

origin: derived intent-constraint-4: role-written files that `rp check` rejects arise in use. The frontmatter grammar rejects a value such as an unquoted `#368` (`state.md` § Frontmatter), the loop wakes a rejected file's author (`loop.md`'s frontier table), and the reviewer has a repair request for exactly this (`skills/radical-pipelines/templates/reviewer-repair.md`).

observed: `rp check` reads the pipeline branch's tree, where a lane's files arrive only when the lane lands (`loop-edges.txt` E1a), and it cannot read a review lane's tree, which holds no `run-config.md`: it stops with `pipeline of an earlier format` there (`loop-edges.txt` E1b).

spec-requirement-14: Landing a turn whose certifications do not change succeeds and makes no commit, as for a turn that only answered a thread while its artifact and inputs stayed as they were.

origin: derived intent-constraint-4: a role answers a finding with "why it stands, with evidence", leaving its artifact unchanged (`agents/spec-producer.md` § Threads).

observed: stamping an unchanged file twice writes nothing, and the commit that follows stops with nothing to commit (`loop-edges.txt` E5).

spec-requirement-15: A turn that ended with a blocker is not landed: the orchestrator runs no `rp land` for its role, and its artifact or candidate stays as missing or stale as it was. Once the orchestrator repairs what the blocker names, the next step wakes that role again for the same work.

origin: derived intent-constraint-4: a role reports a blocker when its materials, its seat, or its environment fail it (each profile's § Protocol, **Blocker**), and the orchestrator then repairs it and wakes the role again (`loop.md` § Waking a role).

observed: landing certifies an artifact at its turn commit whether or not the turn changed it, so a landed turn that changed nothing leaves a stale artifact fresh (`scripts/README.md` § `stamp`; `loop-edges.txt` E4). Today the loop lands every role that ended its turn, a blocker included (`loop.md` § One step step 4).

spec-requirement-16: Each commit `rp land` makes has an imperative, sentence-case subject with no final period, naming what it landed, shaped by a template the project's conventions data declare for the commits `rp` makes, such as one that appends `(orchestrator)`. Without such a template, the commit has the subject alone. `rp` never interprets the prose commit format that roles follow.

origin: derived intent-goal: landing's commits move from the orchestrator to `rp`, and the orchestrator commits per the **Commit format** convention (`triage.md` § 5). This repository's landing commits read `Stamp spec (orchestrator)` and `Stamp review approvals (orchestrator)` (`git log 369-conventions-as-data`).

observed: `.rp.md`'s `commit-format` asks for an imperative, sentence-case subject with no final period, ending with the profile name in parentheses.

spec-requirement-17: `rp land` reports which phases its landing made complete: each phase from 1 through the target that is complete after the landing (spec-requirement-18), was not complete when the step's turns began, and no earlier landing of the step reported, in phase order. A landing that completes no phase reports none.

origin: from-intent intent-constraint-5

observed: today `rp check` reports each artifact as `missing`, `fresh`, or `stale` and each review lane as approved or not, and names no phase complete; the orchestrator works out completion by comparing checks (`1-spec/spec/check-json-today.txt`; intent-context-1). A role in the pipeline worktree commits on the pipeline branch itself (`state.md` § Certification), so a thread it answered awaits its opener before its turn lands (`state.md` § Threads, **Awaits**). One step can wake two roles whose landings each leave the same phase complete: an `INVALID` thread between `spec-producer` and `design-doc-producer` wakes both (`loop-edges.txt` E7).

spec-requirement-18: A phase from 1 through the target is complete when every phase from 1 below it is complete and:

- Phase 1 or 2: its artifact exists and is fresh, and no open thread awaits its producer.
- Phase 3: `notes.md` has `status: done` and is fresh, and no open thread awaits the implementer.
- Phase 4: every configured review lane is approved, and no open thread awaits a reviewer.

origin: derived intent-constraint-5: this repository's `phase-completed` hook sets the issue's status to the phase that completed, from `1 - Spec` to `4 - Review`, and its `run-ended` hook acts "when the run completed through phase 4" (`.rp.md` § Lifecycle hooks). The status then names the highest phase whose work is done.

observed: a phase's role has work while its artifact is missing or stale or a thread awaits it (`state.md` § The frontier), and `rp check` computes phase states only through the target (`scripts/README.md` § `check`, Output).

spec-requirement-19: Whenever `rp check --json` reports the phases, it also reports which are complete (spec-requirement-18).

origin: from-intent intent-proposal-2

observed: today `rp check --json` reports each phase's state and each frontier entry's changed inputs, and no completeness (`1-spec/spec/check-json-today.txt`). Close-out reports the phases completed (`skills/radical-pipelines/reference/run/close-out.md` step 6), and a run resumed after compaction recomputes its state with `rp check` (`SKILL.md`).

spec-requirement-20: `rp next` takes only the pipeline folder and `--apply`, and `rp land` takes only the pipeline folder and `--role`: the role whose turn ended, which only the orchestrator's tool reports. Neither takes anything `rp` can derive from the tree and the assignments it wrote: no turn commit, no list of the lanes the frontier names, no candidate a consolidated root merged, and no commit a changed input is diffed from.

origin: from-intent intent-constraint-6, intent-proposal-1

observed: today `rp stamp` takes the turn commit as `--at`, which the orchestrator reads from the assignment, and `rp review --lane` and `rp assign --role` take the lanes and roles the frontier names (`scripts/README.md`; `loop.md` § One step). A turn's end reaches the orchestrator only through its tool (`loop.md` § One step step 4; `tools/claude-code.md` § Turn end; `skills/radical-pipelines/tools/opencode.md` § Turn end).

spec-requirement-21: Each changed input in a role's assignment names a commit at which that input is as the artifact's certification pins it, or at which it is absent when the certification does not pin it. The diff from that commit to the turn commit shows only what changed since the artifact last landed, including after a landed turn that left the artifact unchanged.

origin: derived intent-constraint-6: a turn often lands with its artifact unchanged, as "a response that leaves its artifact unchanged becomes fresh" (`scripts/README.md` § `stamp`), and its input may change again after that landing.

observed: today the commit is the last one that changed the artifact (`skills/radical-pipelines/scripts/rp.mjs`, `cmdAssign`). A design-doc-producer whose design doc stood when the spec went from v1 to v2 is woken for v3 with the commit before v2, and the diff from it shows v1 to v3, though the design doc's certification pins v2 (`loop-edges.txt` E4). In format 6, the stamp commit changed the artifact file itself, so that commit was the last landing (`1-spec/spec/format-6-stamps.txt`).

spec-requirement-22: To run the loop, the orchestrator runs no Git command, computes no path, and reads no thread or assignment. In a loop step, for every frontier line, from planning the step to landing its turns, it runs `rp next`, `rp next --apply`, and `rp land`, follows its hooks' instructions, and drives the roles with its tool from what those commands print. The steps spec-exclusion-2 keeps outside a loop step keep their own commands.

origin: from-intent intent-goal

observed: today the orchestrator runs Git in the pipeline and lane worktrees, composes lane worktree and certification paths, and reads each turn commit from the role's assignment (`loop.md` § One step step 4; `loop-walk.txt`).

spec-requirement-23: Spawning, waking, terminating, and watching roles stay the orchestrator's, through its tool's mechanics, and `rp` never starts, messages, or stops an agent. The orchestrator spawns or wakes each role the plan names in the worktree the plan gives, on its model name resolved for its tool, with the message `Read your assignment: <its assignment's path>.`.

origin: from-intent intent-constraint-1

observed: `tools/opencode.md` § Spawn seats a role by its worktree's absolute path, and `tools/claude-code.md` § Seating changes into it. The message that starts a turn is exactly `Read your assignment: <printed path>.` (`loop.md` § Waking a role).

## Acceptance criteria

spec-acceptance-criterion-1: Given a pipeline whose frontier wakes roles, when `rp next <pipeline folder>` runs, then it prints the plan, and every file, ref, worktree, and assignment in the repository is as it was before.

spec-acceptance-criterion-2: Given a frontier `lane 1-spec/spec.md a` and `lane 1-spec/spec.md b` and no lane worktrees, in this repository's conventions, when `rp next` runs, then its plan names, for each lane, the worktree to create for `spec-producer-<lane>` at `.worktrees/<lane branch>`, on a new branch at the pipeline tip. It names the assignment written there, the hooks bracketing the creation, and the role to wake, with profile `spec-producer`, its lane, its model name, its resource names, that worktree, that assignment's path, and phase 1.

spec-acceptance-criterion-3: Given a lane whose worktree remains from an earlier step and whose candidate is stale after the intent changed, when its plan is applied, then the lane's branch holds the pipeline tip, no worktree is created for it, and its assignment's turn commit is the lane branch's new tip.

spec-acceptance-criterion-4: Given a frontier `consolidate 1-spec/spec.md` with lanes `a` and `b`, when `rp next` runs, then the plan names `spec-producer-a` and `spec-producer-b` to terminate first, their worktrees and branches to remove, and `spec-producer` to wake in the pipeline worktree as a fresh instance. When the plan is applied, those worktrees and branches are gone.

spec-acceptance-criterion-5: Given a frontier `review default` and `review second`, when the plan is applied, then each lane's branch is at a change built from the pipeline tip with a worktree on it, and each reviewer's assignment there is its request for that change.

spec-acceptance-criterion-6: Given an `INVALID` frontier, when `rp next` runs, then:

- On `INVALID threads/1-design-doc-producer-spec-producer-spec.md: <reason>`, the plan wakes both `spec-producer` and `design-doc-producer` in the pipeline worktree, each with that line among its Malformed files.
- On an `INVALID` line for review lane `default`'s review thread, it wakes `reviewer-default` in its lane's worktree with its repair request, naming no resource.
- On `INVALID 0-intent/intent.md: <reason>`, it wakes no role and names the intent and its reason for the orchestrator to fix.

spec-acceptance-criterion-7: Given a frontier `escalate <thread>` or `complete`, when `rp next` runs, then the plan names that frontier and creates, removes, terminates, and wakes nothing.

spec-acceptance-criterion-8: Given a plan `rp next` printed and no change to the repository since, when `rp next --apply` runs, then the worktrees, branches, and assignments it changed are exactly those the plan named. The pipeline branch's tip and the pipeline worktree's tree are unchanged, and no agent was started, messaged, or stopped.

spec-acceptance-criterion-9: Given a plan that has been applied, when `rp next --apply` runs again, then every worktree, branch, review change, and assignment is as the first application left it, and `rp next` names no worktree to create or remove and no branch to move.

spec-acceptance-criterion-10: Given an application of a plan that stops partway, when it stops, then it exits with a non-zero status naming the failed action and its reason. When it runs again after the cause is repaired, it completes the remaining actions and repeats none of the done ones, and each `before-` and `after-` hook of the plan has run once per action.

spec-acceptance-criterion-11: Given a role still running its turn when the orchestrator resumes after its context was compacted, when the orchestrator continues the loop, then that role's assignment, worktree, and branch are unchanged until the role has ended its turn and that turn has landed, or the role has reported a blocker.

spec-acceptance-criterion-12: Given a lane's branch holding commits of a turn that did not land, when a plan for that lane is applied, then those commits are still on the lane's branch, and they reach the pipeline branch with a landing of that lane.

spec-acceptance-criterion-13: Given a project whose `after-creating-worktree` installs dependencies and starts environments, doing more for one role's worktree than another's, and whose `before-removing-worktree` stops a worktree's environments, when one step creates `spec-producer-a`'s worktree and a later one removes it, then the install runs after the worktree exists, knowing it is for `spec-producer-a`. The environments stop before the worktree is removed, knowing the same role.

spec-acceptance-criterion-14: Given a resource `staging` the implementer and the reviewer receive, a `before-spawning-agent` that resets an environment only for an agent that receives `staging`, and an `after-terminating-agent` that deletes the agent's own environment, then:

- When a plan wakes the implementer, whose assignment carries `staging`, the reset runs before the implementer is spawned.
- When a plan wakes the spec-producer, whose assignment does not carry it, no reset runs.
- When a plan creates `reviewer-default`'s worktree and wakes the reviewer, the worktree's `after-creating-worktree` runs before the reset.
- When a consolidation terminates `spec-producer-a`, the deletion runs after that termination, for `spec-producer-a`, and before its worktree's `before-removing-worktree`.

spec-acceptance-criterion-15: Given a project with a hook for each worktree, branch, and agent moment, when a step creates a lane's branch and worktree, then the plan names the worktree's hooks and no branch hook.

spec-acceptance-criterion-16: Given a blocking `before-` hook that fails, when the orchestrator follows the step, then the plan is not applied, or the lane is not landed, and the run stops through close-out.

spec-acceptance-criterion-17: Given a run's steps, when the orchestrator follows them, then:

- `before-merging-lanes` runs before each landing of a lane's role and `after-merging-lanes` after it, and neither runs around landing a role in the pipeline worktree.
- `phase-completed` runs once for each phase a landing reports, in phase order.
- `phase-started` runs once on the first step that wakes a role of a phase, and again on a step that resumes work on it.

spec-acceptance-criterion-18: Given this repository's `.rp.md`, when setup migrates it to the change's conventions and the owner confirms each action, then each of its hook blocks runs its instructions at the moment it runs today.

spec-acceptance-criterion-19: Given `spec-producer-a` ended its turn having committed its candidate, when `rp land <pipeline folder> --role spec-producer-a` runs, then the pipeline branch holds the candidate and its certification, which pins the intent as it was at the lane's turn commit, and `rp check` reports the candidate fresh.

spec-acceptance-criterion-20: Given `reviewer-default` closed its review thread `approved`, when `rp land <pipeline folder> --role reviewer-default` runs, then the lane's commits after its change are on the pipeline branch and none of the commits that built the change is. The approval's certification records as approved the pipeline commit holding it, and `rp check` reports `review default approved`.

spec-acceptance-criterion-21: Given turns that ended in the pipeline worktree, when `rp land <pipeline folder> --role <role>` runs for each of their roles, then:

- For a spec-producer's consolidation that committed `1-spec/spec.md`, the spec's certification pins the intent and the later inputs targeting it as they were at its turn commit and is committed on the pipeline branch, the worktree holds nothing uncommitted from the landing, and `rp check` reports the spec fresh.
- For the turns of the spec-producer and the design-doc-producer that one rejected thread woke, each one's artifact is certified at its turn commit.

spec-acceptance-criterion-22: Given a role whose branch lacks its turn commit, when `rp land` runs for it, then it exits with a non-zero status naming the worktree and the reason, and the pipeline branch and every certification are as they were.

spec-acceptance-criterion-23: Given a lane's turn that committed a candidate with frontmatter, or a review thread with `status: pending`, when `rp land --role` runs for it, then it exits with a non-zero status and names the file and the reason as `rp check` names them. The pipeline branch and every certification are as they were.

spec-acceptance-criterion-24: Given a landing that stopped on a lane's file, when the next step runs, then the file's author is woken in its lane's worktree with that file's line among its Malformed files, or, for a reviewer, with its repair request. Once its repaired turn lands, the commits of both turns are on the pipeline branch.

spec-acceptance-criterion-25: Given a turn that only answered a thread, its artifact and inputs as they were, when it is landed, then landing succeeds and makes no commit.

spec-acceptance-criterion-26: Given a role whose respond turn ended with a blocker, its artifact stale, when the step's turns are landed, then that artifact is still stale. After the repair, the next step wakes that role in Respond for the same changed inputs.

spec-acceptance-criterion-27: Given this repository's conventions, which declare a template for `rp`'s commits that appends `(orchestrator)`, when `rp land` makes a commit, then its subject is imperative and sentence case, has no final period, and ends with `(orchestrator)`. Given conventions that declare no such template, its subject has no suffix.

spec-acceptance-criterion-28: Given a turn to land, when `rp land` lands it, then:

- For a consolidation that makes the spec fresh, with no thread awaiting the spec-producer, it reports phase 1.
- For a production lane's landing while the root spec is missing, it reports no phase.
- For one review lane's approval while another lane is not approved, it reports no phase.
- For the last review lane's approval, with phases 1 to 3 complete, it reports phase 4.
- For the spec-producer's answer to a thread the implementer opened, the spec unchanged, the design doc fresh, and `notes.md` not done, it reports phases 1 and 2.
- For the second of two landings of one step, each leaving phase 1 complete, after the first reported it, it reports no phase.

spec-acceptance-criterion-29: Given a pipeline whose frontier is not `INVALID`, when `rp check --json` runs, then the phases it reports complete are those spec-requirement-18 defines.

spec-acceptance-criterion-30: Given `rp next` or `rp land` with any option beyond the pipeline folder, `--apply`, and `--role`, such as a commit, a path, or a lane list, when it runs, then it stops naming the option.

spec-acceptance-criterion-31: Given a design doc whose landed turn left it unchanged when the spec went from v1 to v2, and a spec now at v3, when the design-doc-producer is woken, then its changed input names a commit at which the spec is v2, and the diff from that commit to its turn commit shows only the change from v2 to v3.

spec-acceptance-criterion-32: Given the skill after the change, when the orchestrator follows a loop step for any frontier line through landing its turns, then the commands it runs in the step, outside the steps spec-exclusion-2 names, are `rp next`, `rp next --apply`, `rp land`, those its hooks' instructions name, and its tool's spawn, wake, and terminate calls. It spawns or wakes each role in the worktree the plan names, on the role's model name resolved for its tool, with `Read your assignment: <the path the plan names>.`, passes only paths `rp` printed, and opens no thread or assignment file.

## Exclusions

spec-exclusion-1: `rp` does not spawn, seat, wake, message, terminate, or watch a role, does not decide that a role has ended its turn, and does not run a lifecycle hook's instructions.

spec-exclusion-2: The steps outside a loop step stay as they are: triage creating the pipeline branch and worktree, recording phase 0, fixing a rejected intent or later input included, run-configuration changes, owner escalation with its dossier and recorded answer, health monitoring, close-out with its pushing, terminating the remaining agents, and removing the remaining worktrees and branches, and the closure actions.

spec-exclusion-3: The frontier rules, the artifact formats, the meaning of a certification, which role each frontier action wakes, in which mode and seat, and every assignment's content stay as they are, except where spec-requirement-13 and spec-requirement-21 say otherwise.

## Considered and not required

- Close-out's removal of lane worktrees and branches through `rp`, a reading of intent-goal not taken — close-out runs when the run stops for any cause, the owner cancelling and a failure included, where no step plans it (`close-out.md`), and the Goal's step is `loop.md` § One step, repeated until the frontier is `complete` or `escalate`.
- Fixing a rejected intent or later input inside the step, through `rp`, a reading of intent-goal not taken — those are phase-0 files the orchestrator writes on the owner's approval (`state.md` § Files), and the plan names them for the orchestrator to fix (spec-requirement-4).
- `rp` reading the escalated thread for the owner's dossier, a reading of intent-goal not taken — the dossier explains the choice in the owner's terms after the loop has stopped, which takes judgment over the thread's text (`loop.md` § Owner escalation).
- `before-creating-branch` and `after-creating-branch` firing for lane branches — intent-constraint-3 lets them go, and no project in intended use writes them: observed: this repository's `.rp.md` writes neither, and intent-context-2 names neither.
- Production lane branches left in place at consolidation until close-out, a reading of intent-constraint-2 not taken — today's loop removes them at consolidation (`loop.md` § Production lanes step 2), and intent-goal moves that step into the plan.
- `rp next` stopping on a lane's unlanded commits, as `rp review` does today, rather than keeping them for the lane's next landing — either delivers spec-requirement-9; which one is how it is built.
- No requirement on a role still running when a plan is applied, a reading of intent-goal not taken — a run resumed after compaction finds roles still running (`SKILL.md`), and a role rereads its assignment after compaction (`agents/spec-producer.md` § Role).
- A repository that changes between `rp next` and its `--apply` — no intended use produces it: observed: the loop plans a step once the previous step's turns have landed (`loop.md` § One step), and the hooks intent-context-2 and `.rp.md` describe write no pipeline file; spec-requirement-8 keeps that true after compaction.
- A phase that counts as complete on its own artifact, whatever the phases below it, a reading of intent-constraint-5 not taken — the issue's status would name phase 1 after a landing while phases 2 and 3 are done (`.rp.md` § Lifecycle hooks, `phase-completed`).
- A phase that counts as complete while an open thread awaits its role, a reading of intent-constraint-5 not taken — the frontier counts that thread as the phase's work (`state.md` § The frontier).
- A phase beyond the target reported complete — `rp check` computes phase states only through the target (`scripts/README.md` § `check`, Output).
- `rp check --json` reporting no complete phases, a reading of intent-proposal-2 not taken — close-out reports the phases completed (`close-out.md` step 6), and a run resumed after compaction recomputes its state with `rp check`, where no landing's report survives (`SKILL.md`).
- `rp check --json` reporting, for each changed input, the commit it is diffed from (intent-proposal-2, in part) — no consumer: the role reads the commit in its assignment, the orchestrator reads no assignment (intent-goal), and the report entry renders phase states and answers history from Git history (`skills/radical-pipelines/reference/entries/report.md`).
- The diff-from commit of a changed input kept as the last commit that changed the artifact, a reading of intent-constraint-6 not taken — after a landed turn that left the artifact unchanged, the diff from it shows changes the artifact has already absorbed (`loop-edges.txt` E4).
- A machine-readable form of the plan — no consumer is shown: the orchestrator reads `rp assign`'s printed lines today (`loop.md` § Waking a role).
- `rp land` landing every turn of a step in one call, a reading of intent-proposal-1 not taken — `before-merging-lanes` and `after-merging-lanes` bracket each lane branch's landing (`lifecycle-hooks.md`), and the orchestrator learns of each turn's end through its tool.
- Landing a turn that has already landed, or repeating a landing that stopped — no intended use produces it: observed: the loop lands each ended turn once (`loop.md` § One step step 4), and a resumed run lands only the roles still running (`SKILL.md`); a landing that stops lands nothing (spec-requirement-11, spec-requirement-12).
- Landing stopping on a rejected file the turn did not change, such as the intent, a reading of intent-constraint-4 not taken — the plan names that file for the orchestrator to fix, and a role woken for its own file cannot repair another's.
- An approval whose last message heading names a commit other than its change — no intended use produces it: observed: the reviewer's request gives the heading with the change (`skills/radical-pipelines/templates/reviewer-first.md`, `reviewer-later.md`).
- A role ending its turn with uncommitted changes in its worktree — no source shows a role doing so: observed: each producer's profile commits before ending its turn (`agents/spec-producer.md` § Turn step 5), and each reviewer's request ends with "Commit your review" (`reviewer-first.md`).
- A lane that a run-configuration change drops mid-run — triage handles it when the configuration changes: observed: the commit that drops a lane removes its candidate folder and closes its open threads, and agents working under it are terminated (`state.md` § Run configuration).
- Creating the pipeline's own worktree in a step — it exists before the loop starts (`loop.md`, opening).
- Hooks `run-started`, `run-ended`, `escalation-raised`, and the pipeline and pull request hooks in the plan — their moments lie outside a step (`lifecycle-hooks.md`).
- Reading intent-constraint-3's "`before-` hooks fire before the plan is applied and `after-` hooks after it" as covering the agent hooks, not taken — spawns follow the application, so a `before-spawning-agent` fired before it would reset an environment before `after-creating-worktree` starts it (`loop.md` § Review lanes, § Waking a role).
- Reading intent-constraint-4's merging-lanes bracket as covering a role without a lane, not taken — nothing merges: such a role commits on the pipeline branch itself (`state.md` § Certification).
- Whether `rp` keeps `assign`, `review`, and `stamp` as commands — how it is built; the Goal asks only that the loop runs through `next` and `land`.
- README and `docs/` passages that describe today's loop, a reading of intent-goal not taken — the intent asks for no outcome of its own there, and the `documentation` guardrail has the implementer keep them true (`AGENTS.md` § Repository rules).

## Open assumptions

spec-assumption-1: The plan's entries are all an orchestrator needs to spawn, seat, wake, and terminate each role on opencode and on Claude Code — assumed: a step run on each tool from the plan alone. `tools/opencode.md` § Spawn needs the worktree's absolute path and the instance title `<pipeline slug> <profile>[ <lane>]`, and `tools/claude-code.md` § Seating changes into the worktree.

spec-assumption-2: The hooks intent-context-2 describes need nothing beyond the pipeline, the run, the phase, the role a worktree is for, and a woken role's resources — assumed: running each of them from the plan's entries.
