# The loop

The autonomous workflow. You enter from triage with a pipeline folder, a branch, a worktree, a target phase, and the run policy (the lanes of `../conventions/agents.md` as confirmed). Address worktree files by absolute path. Pass every `rp` command the worktree's pipeline file or folder path; it derives the repository from that argument and needs no `cd`. Run every Git operation through `git -C <worktree>`. Start health monitoring (`../conventions/health-monitoring.md`). Then repeat until the frontier is `complete` or an owner escalation is pending. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` is the reference: what every state `rp check` prints means, and what each file pins — consult it when the report names something this file does not, or when you explain the pipeline to the owner.

## One step

1. Run `rp check <worktree's absolute pipeline folder> --base <base branch> --lanes <declared lanes> --target-phase <n>`.
2. Dispatch what resolves its `frontier` line (table below).
3. When the dispatched agents report, land their work: verify the commits are on the branch, stamp (below), merge lane branches (`before-`/`after-merging-lanes`), fire `phase-completed` when a phase becomes complete, then give the owner a one-line report naming the phase, its artifacts, and anything worth surfacing. `phase-started` fires the first time a step dispatches into a phase, and again when work on it resumes.
4. Go to 1.

The phase runbooks (`phases/<n>-<name>.md`) name the profiles, artifacts, and materials of each phase.

| `frontier`                                           | Dispatch                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `trigger <path> → <target>`                          | The target's producer, mode Adjudicate, with the trigger under **Amendment** (external amendment or claim) or **Task report** |
| `claim <review> → <target> (owner escalation)`       | Owner escalation (below)                                                                                       |
| `claim <review> → <target>`                          | The target's producer, mode Adjudicate, with the claim under **Amendment**                                     |
| `synthesize <artifact>`                              | Its producer, mode Synthesize                                                                                  |
| `stamp <file>`                                       | Its initial package is unrecorded, or its mirrors no longer project its body: § Stamp on landing               |
| `re-synthesize <artifact>`                           | Its producer, mode Synthesize, with the package change under **Input changes**                                 |
| `review wave <artifact>`                             | A review wave                                                                                                  |
| `adjudicate <artifact>`                              | The producer, mode Adjudicate, with every lane's review under **Review lanes** — for a build or document review, the phase's plan producer, whose adoptions are corrective tasks. A claim the producer refuted reaches it here too, as the wave that refuted it |
| `consolidate <artifact>`                             | The producer, mode Consolidate (§ Production lanes)                                                            |
| `task <phase>/<id>`                                  | That task's worker                                                                                             |
| `blocked <phase>/<id>`                               | That task's worker, once what its latest report names is restored (§ Dispatch)                                 |
| `build review` / `document review`                   | A review wave of the phase's reviewer                                                                          |
| `no tasks in <phase>/tasks/`                         | The plan producer wrote no task files: re-dispatch it                                                          |
| `… (invalid target)`                                 | Re-dispatch what wrote it: a target is an artifact id or, for a claim, an intent Goal, Constraint, or Decision |
| `INVALID REVIEW <path>: …` / `INVALID REPORT <path>: …` | An unfinished attempt: its agent finishes the file per its format — a fresh instance with the same prompt when the agent is gone |
| `INVALID FRONTMATTER <path>`                         | Repair and re-stamp it                                                                                         |
| `INVALID LINE <path>`                                | The file's author fixes it                                                                                     |
| `invalid plan: …`                                    | The plan producer, mode Adjudicate                                                                             |
| `tasks held in <phase>: …`                           | The plan producer, mode Adjudicate, with the held failed reports                                               |
| `triggers or claims still adjudicated, awaiting approval` | A review wave of each report line's adjudicating artifact                                                  |
| `unclaimed commits: …`                               | Work reached the branch outside a task: tell the owner; a task report claims it or it is reverted             |
| `undeclared lane <path>` / `symlink <path>`          | The tree holds a lane the run policy lacks, or a symlink: stop and tell the owner                              |
| `complete`                                           | Close-out                                                                                                      |

`complete through phase …` is status; dispatch the `frontier` line.

## Dispatch

- Build every prompt from the profile's template in `templates/`. Fill every slot; list materials as explicit paths — an agent's materials are exactly what its prompt lists, filtered by the lane's `materials` when it has them. A named lane's **Brief** is its brief verbatim; the implicit lane has none. `--lanes` carries each named lane with its fingerprint (`state.md` § The frontier).
- Every message to an agent names what it must do next.
- A producer receives each required input package. A package change provides **Input changes** for re-synthesis.
- Every instance is fresh. A producer never adjudicates a wave it produced for; a reviewer never re-reviews from memory — the Delta mode gets its previous review as a material.
- Spawn, seat, and terminate per `tools/<tool>.md`; the model per the project's agent conventions.
- `Execution:` in the Seat is `inspection only` for producers, plan reviewers, and researchers; `full` for workers and the build and document reviewers.
- A build or document review's fresh **Diff** is every change on the branch outside the pipelines folder since its base.
- Compute review filenames and task-report paths yourself (`state.md` § Names) and pass them under **Write your review to** / **Write your report to**.
- Serve a **research request**: spawn a fresh `researcher` with the question and the requester's address; it answers the requester directly. Several independent questions in one message get one researcher each.
- A **blocker** means you prepared something wrong: fix the materials or the seat and re-dispatch. A `blocked` report means the environment failed the worker mid-task: restore what the report names, then re-dispatch. If the environment is genuinely down, stop and tell the owner.

## Stamp on landing

After every agent commit, before anyone consumes the result — and before the agent is terminated: repair `INVALID FRONTMATTER`, then re-stamp; send `INVALID LINE` to the body's author to fix and report again.

- A produced artifact — or one whose producer reported no edit needed: `rp stamp <artifact> --pin <each input>` per `state.md` § Pins by file, including every trigger it adjudicated. The document plan pins every build task and report. Each task file of a plan: `rp stamp <task> --mirror`.
- A review's initial stamp: `rp stamp <review> --reviewed <each package member> --mirror`. A mirror repair uses `rp stamp <review> --mirror`. Its filename carries the lane and wave; a review that adjudicated a trigger declares `Origin:` in its body.
- A task report's initial stamp: `rp stamp <report> --reviewed <its task> --reviewed <each dependency> --mirror`. Later stamps preserve that package.
- A named lane's artifact or review: `--set lane=<the lane's fingerprint>` too.
- Commit the stamps on top of the landing.

## Delta materials

A Delta review receives **Your previous review**, **Adjudication** — every record entry written since — and the **Diff** from that review's `head` to `HEAD` over everything the review names: artifact, record, tasks, reports, and pinned inputs. Build and document Diffs also cover branch changes outside the pipelines folder. When only an input changed, the reviewer reruns the checks that input supports.

## Review waves

A wave reviews one artifact at one identity; one wave at a time per artifact; its number is the artifact's next.

1. Freeze: no producer works on the artifact until the wave closes.
2. The implicit lane runs in the pipeline worktree. Named lanes: create `<slug>-<phase>-review-<lane>` branches and worktrees at the same commit, one reviewer each, in parallel.
3. Each reviewer gets its **Brief** and, on a re-review, **Your previous review**, the **Diff** from its `head`, and the **Adjudication**.
4. Land: merge the review-lane branches into the branch the wave runs on (disjoint files, no conflicts), remove their worktrees and branches, stamp every review.
5. Close: any `rejected` → adjudication; every lane `approved` → done; an `unsatisfiable` with no `rejected` → the claim stands, `rp check` routes it. An approval from a lane means nothing in its brief objects.

Waves are atomic: a research request or blocker raised during a wave is served, but no adjudication starts until every lane reported.

## Production lanes

A production lane, declared in `../conventions/agents.md`, is a sub-pipeline of one artifact. Create `<slug>-<phase>-<lane>` branches and worktrees at the same commit; each lane's producer writes in `<phase>/<lane>/` with its **Brief**; everything this file says about an artifact applies inside the lane — its review waves run on `<slug>-<phase>-<lane>-review-<review lane>` branches cut from and merged into the lane branch — and lanes run in parallel. A lane declared `after` others starts when they are approved and receives each lane's artifact, record, and approving reviews under **Lane inputs**, pinning them. After every landing in a lane, merge the lane branch into the pipeline branch (disjoint folders, no conflicts), so `rp check` on the pipeline branch always sees every lane; after every landing on the pipeline branch, merge it into each open lane branch, so a changed input reaches the lanes. When every lane is approved and fresh: remove the lane worktrees and branches, and dispatch the producer in Consolidate mode with every lane's artifact, record, and approving reviews under **Lane candidates**; stamp the root artifact pinning them. Its review wave is a Consolidation review with the **Lane folders**. Later re-syntheses of the root run without lanes.

## Owner escalation

A pending claim targets the intent. Fire `escalation-raised`; pause the pipeline. Tell the owner: the claim verbatim, the evidence chain (the reviews and records the claim's `origin` links lead through), and the options the record names. When the owner answers, write the answer into `intent.md` as a decision (`../entries/intent-format.md`), citing the claim's path; `rp stamp` it with `--mirror`; commit. The pipeline resumes on the next step.

You write no verdict and open no amendment on your own initiative.
