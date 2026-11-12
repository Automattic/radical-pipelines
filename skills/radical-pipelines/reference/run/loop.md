# The loop

You enter from triage with a pipeline folder, branch, and worktree; `config.json` holds the pipeline configuration. Start health monitoring (`../conventions/health-monitoring.md`), then repeat § One step until the frontier is `complete` or `escalate`. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` defines every term and frontier line used here, and `../../scripts/README.md` § `next` every line of a plan.

Throughout the run:

- Address worktree files by absolute path.
- Pass every `rp` command the pipeline worktree's absolute pipeline folder; it derives the repository from that argument and needs no `cd`.
- Run every Git operation through `git -C <worktree>`.
- Record each direction the owner gives for the run in `owner-directions`, and commit it (`state.md` § Pipeline configuration).

## One step

To plan, apply, wake, and land, you run no Git command, open no thread or assignment, and pass only the pipeline folder and the paths the plan prints.

1. **Plan.** Run `rp next <pipeline folder>`. When the plan names turns to land, land each (step 6), then plan again.
2. **Terminate.** Terminate each role the plan names, firing `before-terminating-agent` and `after-terminating-agent` around each.
3. **Apply.** Fire the plan's `before-removing-worktree` and `before-creating-worktree` hooks, then run `rp next <pipeline folder> --apply`. Then fire its `after-removing-worktree` and `after-creating-worktree` hooks and each `phase-started`.
4. **Stop or fix.** On `escalate`, the step ends at § Owner escalation; on `complete`, at close-out (`close-out.md`). A `fix` line names a malformed phase-0 file: fix it as you record phase 0, outside the step, and plan again.
5. **Wake.** Wake each role the plan names (§ Waking a role).
6. **Land.** While roles work, end your turn with health monitoring active; their reports and health ticks resume the run. A role has ended its turn when its report ends with "Completion declared: no work remains." or reports a blocker (§ Waking a role); after any other report the role is still working: wait for it. When a role ends its turn:
   - A role that reported a blocker is not landed: repair what it names, and the next step wakes it again for the same work.
   - Otherwise run `rp land <pipeline folder> --role <role>`, a lane's role between `before-landing-lane` and `after-landing-lane`. Fire `phase-completed` for each phase it prints, then give the owner a one-line report naming the role, what changed, and anything worth surfacing.
   - When `rp land` stops, nothing landed and `after-landing-lane` does not fire. A stop on malformed files is repaired by the next step, which wakes their author; on any other stop, tell the owner its message; the run stops through close-out.
7. **Repeat.** Once every role the step woke has ended its turn, and you ran `rp land` for each that reported no blocker, go to 1.

A blocking `before-` hook that fails keeps its action from happening — the plan is not applied, or the turn not landed — and the run stops through close-out. When `rp next --apply` stops, tell the owner its message and the smallest owner action that would repair it, such as an untracked file to commit or delete in a worktree to remove; you delete no file in a lane's worktree yourself. Once the owner has repaired it, run it again without firing its `before-` hooks again; once it completes, fire the `after-` hooks of the plan it first printed.

## Waking a role

- Spawn, seat, resume, and terminate per `tools/<tool>.md`. Seat each role in the worktree its plan names, under the instance name its profile and lane give (`state.md` § Names), on the model name the plan names resolved per `tools/<tool>.md` § Models, or on your own model when the plan names none.
- The message that starts a turn, spawn and resume alike, is exactly `Read your assignment: <the assignment path the plan names>.`.
- Wake a role by resuming its instance when `tools/<tool>.md` can resume it with a message. Spawn a new instance when the role has none or it is gone, when the plan names `new`, when the tool cannot resume the role, and when your context was compacted. Fire `before-spawning-agent` and `after-spawning-agent` around each spawn.
- When you message a running role, say only what is yours to say — the repairs you made, the permissions you granted, the results of checks you ran — and what it does next. Your view of the work never goes in a message: roles reach each other only through threads.
- A **blocker** names something the role was given that failed it — its materials, its seat, or the seat's environment. If the environment is genuinely down, stop and tell the owner.

## Owner escalation

A thread with `status: escalated` asks the owner what the intent means or demands. Fire `escalation-raised`; the run stops through close-out with the dossier: the thread and what its `cites` names, verbatim, and the intent items and artifact clauses they cite. Explain the choice and its consequences in the owner's terms.

Record the answer through `../entries/intent-format.md` § Later input, as `state.md` § Owner territory defines it, and commit it. Then append to the thread a message headed `## owner — <that commit>` naming the input's path, set its `status` to `answered`, and commit.
