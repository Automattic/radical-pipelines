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
4. When every role the step woke has ended its turn, land each:
   1. Land it in its worktree at its turn commit, read from its assignment file (`state.md` § Frontmatter).
   2. Merge its lane branch, when it has one, into the pipeline branch (`before-`/`after-merging-lanes`).
   3. Fire `phase-completed` when a phase becomes complete.
   4. Give the owner a one-line report naming the role, what changed, and anything worth surfacing.
5. Go to 1.

| `frontier` | Dispatch |
| --- | --- |
| `INVALID <path>: <reason>` | Malformed frontmatter: repair it and re-stamp. Anything else: wake the file's author with **Malformed files** filled, or fix it yourself when you wrote it |
| `escalate <thread>` | § Owner escalation |
| `lane <artifact> <id>` | § Production lanes |
| `consolidate <artifact>` | § Production lanes |
| `produce <artifact>` | Wake its owner, mode produce — implement for the implementer |
| `respond <artifact>` | Wake its owner, mode respond |
| `review <lane>` | § Review lanes |
| `complete` | Close-out (`close-out.md`) |

## Waking a role

- Build every assignment from the profile's template in `templates/`: fill every slot and list materials as explicit paths. The assignment is the filled template, nothing added.
- The **Turn commit** is the tip of the role's worktree when you wake it.
- Before every spawn and every wake, write the assignment to the role's **Assignment** path (`state.md` § Names), replacing the previous one.
- **Threads addressed to you** lists the threads `rp check` reports awaiting the role. **Changed inputs** lists the changed inputs it reports for the role's artifact, each with the last commit that changed the artifact, from which the role diffs it.
- Keep a role's instance between its turns when `tools/<tool>.md` can wake it with a message; spawn a fresh instance when the tool cannot, when the instance is gone, when your context was compacted, and for a consolidation. The message that starts a turn, spawn and wake alike, is exactly `Read your assignment.`
- Terminate the production lanes' instances at consolidation and every other instance at close-out.
- Spawn, seat, wake, and terminate per `tools/<tool>.md`; use the model `run-config.md`'s body records for the profile or lane, and fill the **Subagent model** with the subagent model it records, in the form `tools/<tool>.md` § Models states.
- **Guardrails** and **Resources** carry, by name, the blocks of that `.rp.md` section whose `agents` include the profile, filling in any value the block's text leaves to you.
- Compute **Write to** and the **Supporting folder** yourself (`state.md` § Names).
- When you message a running role, say only what is yours to say — the seat and materials you prepared, the permissions you granted, the results of checks you ran — and what it does next. Your view of the work never goes in a message: roles reach each other only through threads.
- A **blocker** names something the role was given that failed it — its materials, its seat, or the seat's environment: repair it, then wake the role again. If the environment is genuinely down, stop and tell the owner.

## Production lanes

A production lane is a `spec-producer` or `design-doc-producer` lane declared in `run-config.md`; it writes a candidate.

1. For each `lane <artifact> <id>`: give the lane its branch and worktree at the pipeline tip, creating them or merging the pipeline branch into them. Wake the lane's producer there — mode produce when its candidate is missing, else respond — with its **Brief** and **Write to** `<phase folder>/lanes/<id>/<artifact>.md`. Lanes run in parallel.
2. For `consolidate <artifact>`: terminate the lane instances, remove their worktrees and branches, and wake a fresh producer in the pipeline worktree, mode consolidate, with every candidate under **Lane candidates**. Land it with `rp stamp <root> --at <turn commit> --pin <each candidate>`.

## Review lanes

A review lane is one `reviewer` with its brief; every lane must approve.

1. Save the net change, `git -C <pipeline worktree> diff <base>...HEAD -- . ':(exclude)<pipelines folder root>'`, to a file outside the worktree. For a lane that approved before, also save the diff from the commit its last approval names to the tip, outside the pipelines folder.
2. For each `review <lane>`: give the lane its branch and worktree at the pipeline tip, creating them or merging the pipeline branch into them. Set its sparse checkout, `<pipeline folder>` being relative to the repository root:

   ```sh
   git -C <worktree> sparse-checkout set --no-cone '/*' \
     '!/<pipeline folder>/1-spec/' '!/<pipeline folder>/2-design-doc/' '!/<pipeline folder>/3-implementation/' \
     '!/<pipeline folder>/threads/*' \
     '/<pipeline folder>/threads/*-reviewer-<lane>-implementer-*' \
     '/<pipeline folder>/threads/*-reviewer-<lane>-owner-*' \
     '/<pipeline folder>/threads/reviewer-<lane>/'
   ```

3. Wake the lane's reviewer there with its **Lane**, its **Brief**, the intent, the later inputs, the net change, its threads, and, when the lane approved before, the commit its last approval names with the diff since it. Lanes run in parallel.

## Owner escalation

A thread with `status: disagreement` asks the owner what the intent means or demands. Fire `escalation-raised`; the run stops through close-out with the dossier: the thread and what its `cites:` line names, verbatim, and the intent items and artifact clauses they cite. Explain the choice and its consequences in the owner's terms.

Record the answer through `../entries/intent-format.md` § Later input, as `state.md` § Owner territory defines it, and commit it. Then append to the thread a message headed `## owner — <that commit>` naming the input's path, set its status to `closed: answered`, and commit.
