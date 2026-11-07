# The loop

You enter from triage with a pipeline folder, branch, and worktree; `run-config.md` holds the run configuration. Start health monitoring (`../conventions/health-monitoring.md`), then repeat § One step until the frontier is `complete` or `escalate`. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` defines every term and frontier line used here.

Throughout the run:

- Address worktree files by absolute path.
- Pass every `rp` command the worktree's pipeline file or folder path; it derives the repository from that argument and needs no `cd`.
- Run every Git operation through `git -C <worktree>`.

## One step

1. Run `rp check <worktree's absolute pipeline folder>`.
2. Dispatch every line of its frontier (table below). `phase-started` fires the first time a step wakes a role of a phase, and again when work on it resumes.
3. While roles work, end your turn with health monitoring active; their reports and health ticks resume the run.
4. A role has ended its turn when its report ends with "Completion declared: no work remains." or reports a blocker (§ Waking a role); after any other report the role is still working: wait for it. When every role the step woke has ended its turn, land each:
   1. Land it (`state.md` § Certification); its turn commit is in its assignment file. A review lane's cherry-pick fires `before-`/`after-merging-lanes`.
   2. Merge a production lane's branch into the pipeline branch (`before-`/`after-merging-lanes`).
   3. Fire `phase-completed` when a phase becomes complete.
   4. Give the owner a one-line report naming the role, what changed, and anything worth surfacing.
5. Go to 1.

| `frontier` | Dispatch |
| --- | --- |
| `INVALID <path>: <reason>` | Wake the file's author — a reviewer through § Review lanes — or fix it yourself when you wrote it |
| `escalate <thread>` | § Owner escalation |
| `lane <artifact> <id>` | § Production lanes |
| `consolidate <artifact>` | § Production lanes |
| `produce <artifact>` | Wake its owner |
| `respond <artifact>` | Wake its owner |
| `review <lane>` | § Review lanes |
| `complete` | Close-out (`close-out.md`) |

## Waking a role

- Before every spawn and every wake, run `rp assign <pipeline worktree's absolute pipeline folder> --role <role>` (`state.md`). It writes the role's assignment for the turn the frontier gives it, and prints the assignment's path and the role's model.
- When `rp assign` stops naming a step of yours that is missing — the role's worktree, or a review lane's change — do that step and run it again. On any other stop, tell the owner its message; the run stops through close-out.
- Keep a role's instance between its turns when `tools/<tool>.md` can wake it with a message; spawn a fresh instance when the tool cannot, when the instance is gone, when your context was compacted, and for a consolidation. The message that starts a turn, spawn and wake alike, is exactly `Read your assignment: <printed path>.`.
- Terminate the production lanes' instances at consolidation and every other instance at close-out.
- Spawn, seat, wake, and terminate per `tools/<tool>.md`. Spawn and wake a role on the model `rp assign` printed, resolved per `tools/<tool>.md` § Models, or on your own model when it printed none.
- When you message a running role, say only what is yours to say — the seat and materials you prepared, the permissions you granted, the results of checks you ran — and what it does next. Your view of the work never goes in a message: roles reach each other only through threads.
- A **blocker** names something the role was given that failed it — its materials, its seat, or the seat's environment: repair it, then wake the role again. If the environment is genuinely down, stop and tell the owner.

## Production lanes

A production lane is a `spec-producer` or `design-doc-producer` lane declared in `run-config.md`; it writes a candidate.

1. For each `lane <artifact> <id>`: give the lane its branch and worktree at the pipeline tip, creating them or merging the pipeline branch into them. Wake the lane's producer there. Lanes run in parallel.
2. For `consolidate <artifact>`: terminate the lane instances, remove their worktrees and branches, and wake a fresh producer in the pipeline worktree.

## Review lanes

A review lane is one `reviewer`, with its brief when it has one; every lane must approve.

1. For each `review <lane>`, run `rp review <pipeline worktree's absolute pipeline folder> --lane <lane>` (`state.md`). It builds the lane's branch from the pipeline tip and moves the branch, and the lane's worktree when it has one, to the change, which becomes the reviewer's turn commit. Give the lane a worktree on its branch when it has none. When it stops on commits the pipeline branch lacks, land them (step 4) and run it again.
2. Wake the lane's reviewer there. Lanes run in parallel.

## Owner escalation

A thread with `status: disagreement` asks the owner what the intent means or demands. Fire `escalation-raised`; the run stops through close-out with the dossier: the thread and what its `cites` names, verbatim, and the intent items and artifact clauses they cite. Explain the choice and its consequences in the owner's terms.

Record the answer through `../entries/intent-format.md` § Later input, as `state.md` § Owner territory defines it, and commit it. Then append to the thread a message headed `## owner — <that commit>` naming the input's path, set its `status` to `answered`, and commit.
