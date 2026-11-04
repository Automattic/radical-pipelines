# The loop

You enter from triage with a pipeline folder, branch, and worktree; `run-config.md` holds the run configuration. Start health monitoring (`../conventions/health-monitoring.md`), then repeat § One step until the frontier is `complete` or `escalate`. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` defines every term and frontier line used here.

Throughout the run:

- Address worktree files by absolute path.
- Pass every `rp` command the worktree's pipeline file or folder path; it derives the repository from that argument and needs no `cd`.
- Run every Git operation through `git -C <worktree>`.

## One step

1. Run `rp check <worktree's absolute pipeline folder>`.
2. Dispatch its `frontier` line (table below). `phase-started` fires the first time a step wakes a role of a phase, and again when work on it resumes.
3. While roles work, end your turn with health monitoring active; their reports and health ticks resume the run.
4. When every role the step woke has ended its turn, land each:
   1. Merge its lane branch, when it has one, into the pipeline branch (`before-`/`after-merging-lanes`).
   2. Land it (`state.md` § Frontmatter).
   3. Fire `phase-completed` when a phase becomes complete.
   4. Give the owner a one-line report naming the role, what changed, and anything worth surfacing.
5. Go to 1.

| `frontier` | Dispatch |
| --- | --- |
| `INVALID <path>: <reason>` | Malformed frontmatter: repair it and re-stamp. Anything else: wake the file's author to fix it, or fix it yourself when you wrote it |
| `escalate <thread>` | § Owner escalation |
| `reply <role>: <thread>, …` | Wake the role with those threads, in mode produce — implement for the implementer — when its artifact is missing, else respond; a reviewer per § Review lanes |
| `produce <artifact>` | Wake its owner, mode produce — implement for the implementer |
| `respond <artifact>` | Wake its owner, mode respond |
| `lanes <artifact>: <lane>, …` / `consolidate <artifact>` | § Production lanes |
| `review: <lane>, …` | § Review lanes |
| `complete` | Close-out (`close-out.md`) |

## Waking a role

- Build every prompt from the profile's template in `templates/`: fill every slot and list materials as explicit paths. The prompt is the filled template, nothing added.
- **Threads addressed to you** lists every thread awaiting the role. Materials list the changed inputs `rp check` reports for the role's artifact, each with the last commit that changed the artifact, from which the role diffs it.
- Keep a role's instance between its turns when `tools/<tool>.md` can wake it with a message: send it the Mode, Materials, and Threads addressed to you of its filled template. Spawn a fresh instance with the whole prompt when the tool cannot, when the instance is gone, and for a consolidation.
- Spawn, seat, wake, and terminate per `tools/<tool>.md`; use the model `run-config.md`'s body records for the profile or lane.
- **Guardrails** and **Resources** carry, by name, the blocks of that `.rp.md` section whose `agents` include the profile, filling in any value the block's text leaves to you.
- Compute **Write to** and the **Supporting folder** yourself (`state.md` § Names).
- When you message a running role, say only what is yours to say — the seat and materials you prepared, the permissions you granted, the results of checks you ran — and what it does next. Your view of the work never goes in a message: roles reach each other only through threads.
- A **blocker** names something the role was given that failed it — its materials, its seat, or the seat's environment: repair it, then wake the role again. If the environment is genuinely down, stop and tell the owner.

## Production lanes

A production lane is a `spec-producer` or `design-doc-producer` lane declared in `run-config.md`; it writes a candidate.

1. For `lanes <artifact>: <lane>, …`: give each named lane its branch and worktree at the pipeline tip, creating them or merging the pipeline branch into them. Wake each lane's producer there in parallel — mode produce when its candidate is missing, else respond — with its **Brief** and **Write to** `<phase folder>/lanes/<lane>/<artifact>.md`.
2. For `consolidate <artifact>`: terminate the lane instances, remove their worktrees and branches, and wake a fresh producer in the pipeline worktree, mode consolidate, with every candidate under **Lane candidates**. Landing it pins every candidate.

## Review lanes

A review lane is one `reviewer` with its brief; every lane must approve.

1. Save the net change, `git -C <pipeline worktree> diff <base>...HEAD -- . ':(exclude)<pipelines folder root>'`, to a file outside the worktree.
2. Give each lane you wake its branch and worktree at the pipeline tip, creating them or merging the pipeline branch into them.
3. Wake each lane's reviewer there, in parallel, with its **Lane**, its **Brief**, the net change, and, when the lane approved before, the commit its last approval names.

## Owner escalation

A thread marked `disagreement` awaits the owner's decision. Fire `escalation-raised`; the run stops through close-out with the dossier: the thread verbatim and the intent items and artifact clauses it cites. Explain the choice and its consequences in the owner's terms.

Record the answer through `../entries/intent-format.md` § Later input, as `state.md` § Owner territory defines it, and commit it. Then append to the thread a message headed `## owner — <that commit>` naming the input's path, set its status to `closed: answered`, and commit.
