# The loop

The autonomous workflow. You enter from triage with a pipeline folder, branch, and worktree; `run-config.md` holds the run configuration. Address worktree files by absolute path. Pass every `rp` command the worktree's pipeline file or folder path; it derives the repository from that argument and needs no `cd`. Run every Git operation through `git -C <worktree>`. Start health monitoring (`../conventions/health-monitoring.md`). Then repeat until the frontier is `complete` or an owner escalation is pending. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` is the reference: what every state `rp check` prints means, and what each file pins — consult it when the report names something this file does not, or when you explain the pipeline to the owner.

## One step

1. Run `rp check <worktree's absolute pipeline folder> --base <base branch>`.
2. Dispatch what resolves its `frontier` line (table below).
3. When waiting on agents, end your turn with health monitoring active; incoming messages or health ticks resume the run.
4. When the dispatched agents report, land their work: verify the commits are on the branch, stamp (below), merge lane branches (`before-`/`after-merging-lanes`), fire `phase-completed` when a phase becomes complete, then give the owner a one-line report naming the phase, its artifacts, and anything worth surfacing. `phase-started` fires the first time a step dispatches into a phase, and again when work on it resumes.
5. Go to 1.

The phase runbooks (`phases/<n>-<name>.md`) name the profiles, artifacts, and materials of each phase.

| `frontier`                                           | Dispatch                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `claim <review> → <target> (owner escalation)`       | Owner escalation (below)                                                                                       |
| `converge <artifact>`                                | Its producer, mode Converge, with what the artifact's line lists: the package change under **Input changes**, the closed wave's reviews under **Review lanes**, every pending challenge under **Challenges** or **Task reports** — for a build or document review's rejection, the phase's plan producer, whose adoptions are corrective tasks |
| `stamp <file>`                                       | Its initial package is unrecorded, or its mirrors no longer project its body: § Stamp on landing               |
| `review wave <artifact>`                             | A review wave                                                                                                  |
| `consolidate <artifact>`                             | The producer, mode Consolidate (§ Production lanes)                                                            |
| `task <phase>/<id>`                                  | That task's worker                                                                                             |
| `blocked <phase>/<id>`                               | That task's worker, once what its latest report names is restored (§ Dispatch)                                 |
| `build review` / `document review`                   | A review wave of the phase's reviewer                                                                          |
| `no tasks in <phase>/tasks/`                         | The plan producer wrote no task files: re-dispatch it                                                          |
| `INVALID REVIEW <path>: …` / `INVALID REPORT <path>: …` | An unfinished attempt: its agent finishes the file per its format — a fresh instance with the same prompt when the agent is gone |
| `INVALID FRONTMATTER <path>`                         | Repair and re-stamp it                                                                                         |
| `INVALID LINE <path>` / `INVALID IDS <path>`         | The file's author fixes it                                                                                     |
| `invalid plan: …`                                    | The plan producer, mode Converge                                                                             |
| `challenges or claims still adjudicated, awaiting approval` | A review wave of each report line's adjudicating artifact                                                |
| `undeclared lane <path>` / `symlink <path>`          | The tree holds a lane the run configuration lacks, or a symlink: stop and tell the owner                       |
| `complete`                                           | Close-out                                                                                                      |

`complete through phase …` is status; dispatch the `frontier` line.

## Dispatch

- Build every prompt from the profile's template in `templates/`. Fill every slot; list materials as explicit paths — an agent's materials are exactly what its prompt lists, filtered by `run-config.md`'s lane `materials`. A named lane's **Brief** is its configured brief verbatim; the implicit lane has none.
- Every message to an agent names what it must do next.
- A producer receives each required input package. A package change provides **Input changes** for convergence.
- Every instance is fresh. A producer never adjudicates a wave it produced for; a reviewer never re-reviews from memory — the Delta mode gets its previous review as a material.
- Spawn, seat, and terminate per `tools/<tool>.md`; use the model recorded in `run-config.md`'s body.
- `Execution:` in the Seat is `inspection only` for producers and plan reviewers; `full` for workers and the build and document reviewers. A helper shares its requester's Worktree, Branch, and Execution.
- Compute review filenames and task-report paths yourself (`state.md` § Names) and pass them under **Write your review to** / **Write your report to**.
- Serve a **help request**: spawn a fresh `helper` with the request and the requester's address; it answers the requester directly. Several independent requests in one message get one helper each.
- A **blocker** means you prepared something wrong: fix the materials or the seat and re-dispatch. A `blocked` report means the environment failed the worker mid-task: restore what the report names, then re-dispatch. If the environment is genuinely down, stop and tell the owner.

## Stamp on landing

After every agent commit, stamp before anyone consumes the result and before terminating the agent. Pass `--base <base branch>` to the stamps below. Repair `INVALID FRONTMATTER`, then re-stamp; return every other `INVALID` result to the file's author to fix and report again.

- A produced artifact — or one whose producer reported no edit needed: `rp stamp <artifact> --pin <each input>` per `state.md` § Pins by file, including every challenge it adjudicated; its record: `rp stamp <record> --mirror`. Each task file of a plan: `rp stamp <task> --mirror`.
- A review's initial stamp: `rp stamp <review> --reviewed <each artifact-package file> --mirror`. A mirror repair uses `rp stamp <review> --mirror`. Its filename carries the lane and wave; a review that adjudicated a challenge declares `Origin:` in its body.
- A task report's initial stamp: `rp stamp <report> --reviewed <its task> --reviewed <each dependency> --mirror`. Later stamps preserve that package.
- Commit the stamps on top of the landing.

## Review diffs

A Delta review receives **Your previous review** and **Adjudication** — every record entry written since. An artifact review's **Diff** runs from its previous review's `head` to `HEAD` over its named materials. For a phase review, run `rp diff <pipeline folder> --base <base branch> --output <temporary folder>` with `--phase <build | document>` for Fresh, `--review <previous review>` for Delta. Pass its `diff.patch`, `index.json`, and the materialized files as **Diff**.

## Review waves

A wave reviews one artifact at one identity; one wave at a time per artifact; its number is the artifact's next.

1. Freeze: no producer works on the artifact until the wave closes.
2. The implicit lane runs in the pipeline worktree. Named lanes: create `<pipeline branch>-<phase>-review-<lane>` branches and worktrees at the same commit, one reviewer each, in parallel.
3. Each reviewer gets its **Brief** and materials for its mode.
4. Land: merge the review-lane branches into the branch the wave runs on (disjoint files, no conflicts), remove their worktrees and branches, stamp every review.
5. Close: any `rejected` → adjudication; every lane `approved` → done; an `unsatisfiable` with no `rejected` → the claim stands, `rp check` routes it. An approval from a lane means nothing in its brief objects.

Waves are atomic: a help request or blocker raised during a wave is served, but no adjudication starts until every lane reported.

## Production lanes

A production lane declared in `run-config.md` is a sub-pipeline of one artifact. Create `<pipeline branch>-<phase>-<lane>` branches and worktrees at the same commit; each lane's producer writes in `<phase>/<lane>/` with its **Brief**; everything this file says about an artifact applies inside the lane — its review waves run on `<pipeline branch>-<phase>-<lane>-review-<review lane>` branches cut from and merged into the lane branch — and lanes run in parallel. A lane declared `after` others starts when they are approved and receives each lane's artifact, record, and approving reviews under **Lane inputs**, pinning them. After every landing in a lane, merge the lane branch into the pipeline branch (disjoint folders, no conflicts), so `rp check` on the pipeline branch always sees every lane; after every landing on the pipeline branch, merge it into each open lane branch, so a changed input reaches the lanes. When every lane is approved and fresh: remove the lane worktrees and branches, and dispatch the producer in Consolidate mode with every lane's artifact, record, and approving reviews under **Lane candidates**; stamp the root artifact pinning them. Its review wave is a Consolidation review with the **Lane folders**. Later re-syntheses of the root run without lanes.

## Owner escalation

A pending claim targets owner territory. Fire `escalation-raised`; the run stops through close-out with the dossier: the claim verbatim, the evidence chain (the reviews and records the claim's `origin` links lead through), and the options the record names. Explain the choice and its consequences in the owner's terms. Record the answer through `../entries/intent-format.md` § Later input; commit, `rp stamp <input> --mirror`, and commit the stamp.

You write no verdict and originate no constraint or proposal.
