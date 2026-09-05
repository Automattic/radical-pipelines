# The loop

The autonomous workflow. You enter from triage with a pipeline folder, a branch, a worktree, a target phase, and the run policy (the lanes of `../conventions/agents.md` as confirmed, thresholds). Start health monitoring (`../conventions/health-monitoring.md`). Then repeat until `rp check` reports complete through the target phase, an owner escalation is pending, or the valve stops the run. Lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`). `state.md` is the reference: what every state `rp check` prints means, and what each file pins — consult it when the report names something this file does not, or when you explain the pipeline to the owner.

## One step

1. Run `rp check <pipeline folder> --base <base branch> --lanes <declared lanes> --target-phase <n>`.
2. Dispatch what resolves its `frontier` line (table below).
3. When the dispatched agents report, land their work: verify the commits are on the branch, stamp (below), merge lane branches (`before-`/`after-merging-lanes`), fire `phase-completed` when a phase becomes complete. `phase-started` fires the first time a step dispatches into a phase, and again when work on it resumes.
4. Go to 1.

The phase runbooks (`phases/<n>-<name>.md`) name the profiles, artifacts, and materials of each phase.

| `frontier`                                           | Dispatch                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `trigger <path> → <target>`                          | The target's producer, mode Adjudicate, with the trigger under **Amendment** (external amendment or claim) or **Task report** |
| `claim <review> → <target> (owner escalation)`       | Owner escalation (below)                                                                                       |
| `claim <review> → <target>`                          | The target's producer, mode Adjudicate, with the claim under **Amendment**                                     |
| `synthesize <artifact>`                              | Its producer, mode Synthesize                                                                                  |
| `stamp <file>`                                       | Its pins are missing, or its mirrors no longer project its body: § Stamp on landing                            |
| `re-synthesize <artifact>`                           | Its producer, mode Synthesize, with **Input changes** — never a re-stamp by you                                |
| `review wave <artifact>`                             | A review wave                                                                                                  |
| `adjudicate <artifact>`                              | The producer, mode Adjudicate, with every lane's review under **Review lanes** — for a build or document review, the phase's plan producer, whose adoptions are corrective tasks. A claim the producer refuted reaches it here too, as the wave that refuted it |
| `consolidate <artifact>`                             | The producer, mode Consolidate (§ Production lanes)                                                            |
| `task <phase>/<id>`                                  | That task's worker                                                                                             |
| `blocked <phase>/<id>`                               | That task's worker, once what its latest report names is restored (§ Dispatch)                                 |
| `build review` / `document review`                   | The phase's reviewer                                                                                           |
| `no tasks in <phase>/tasks/`                         | The plan producer wrote no task files: re-dispatch it                                                          |
| `AUDIT → <action>`                                   | Audit (below), then the action                                                                                 |
| `VALVE → <action>`                                   | The valve (below)                                                                                              |
| `… (invalid target)`                                 | Re-dispatch what wrote it: a target is an artifact id or, for a claim, an intent Goal, Constraint, or Decision |
| `INVALID REVIEW <path>: …` / `INVALID REPORT <path>: …` | An unfinished attempt: its agent finishes the file per its format — a fresh instance with the same prompt when the agent is gone |
| `invalid plan: …` / `invalid reports: …`             | The plan producer, mode Adjudicate, with the report `rp check` names                                           |
| `unclaimed commits: …`                               | Work reached the branch outside a task: tell the owner; a task report claims it or it is reverted             |
| `undeclared lane <path>` / `symlink <path>`          | The tree holds a lane the run policy lacks, or a symlink: stop and tell the owner                              |
| `complete`                                           | Close-out                                                                                                      |

## Dispatch

- Build every prompt from the profile's template in `templates/`. Fill every slot; list materials as explicit paths — an agent's materials are exactly what its prompt lists, filtered by the lane's `materials` when it has them. A named lane's **Brief** is its brief verbatim; the implicit lane has none. `--lanes` carries each named lane with its fingerprint (`state.md` § The frontier).
- A producer's materials include, for each input artifact, its current approving reviews — every lane's review of the wave that approved it; the document plan also gets the approving build review.
- Every instance is fresh. A producer never adjudicates a wave it produced for; a reviewer never re-reviews from memory — the Delta mode gets its previous review as a material.
- Spawn, seat, and terminate per `tools/<tool>.md`; the model per the project's agent conventions.
- `Execution:` in the Seat is `inspection only` for producers, plan reviewers, and researchers; `full` for workers and the build and document reviewers.
- A delta review's **Diff** runs from its previous review's `head` to `HEAD` over the artifact, its record, and — for a plan — its tasks; its **Adjudication** is every record entry written since. A build or document review's **Diff** is every change on the branch outside the pipelines folder since its base; a delta one, since its previous review's `head`.
- Compute review filenames and task-report paths yourself (`state.md` § Names) and pass them under **Write your review to** / **Write your report to**.
- Serve a **research request**: spawn a fresh `researcher` with the question and the requester's address; it answers the requester directly. Several independent questions in one message get one researcher each.
- A **blocker** means you prepared something wrong: fix the materials or the seat and re-dispatch. A `blocked` report means the environment failed the worker mid-task: restore what the report names, then re-dispatch. If the environment is genuinely down, stop and tell the owner.

## Stamp on landing

After every agent commit, before anyone consumes the result:

- A produced artifact — or one whose producer reported no edit needed: `rp stamp <artifact> --pin <each input>` per `state.md` § Pins by file, including every trigger it adjudicated. Each task file of a plan: `rp stamp <task> --mirror`.
- A review: `rp stamp <review> --reviewed <each file state.md says it names> --mirror`. Its filename carries the lane and the wave; a review that adjudicated a trigger declares `Origin:` in its body.
- A task report: `rp stamp <report> --reviewed <its task> --reviewed <each task it depends on> --mirror`.
- A named lane's artifact or review: `--set lane=<the lane's fingerprint>` too.
- Commit the stamps on top of the landing.

## Review waves

A wave reviews one artifact at one identity; one wave at a time per artifact; its number is the artifact's next.

1. Freeze: no producer works on the artifact until the wave closes.
2. The implicit lane runs in the pipeline worktree. Named lanes: create `<slug>_<phase>-review-<lane>` branches and worktrees at the same commit, one reviewer each, in parallel.
3. Each reviewer gets its **Brief** and, on a re-review, **Your previous review**, the **Diff** from its `head`, and the **Adjudication**.
4. Land: merge the review-lane branches into the branch the wave runs on (disjoint files, no conflicts), remove their worktrees and branches, stamp every review.
5. Close: any `rejected` → adjudication; every lane `approved` → done; an `unsatisfiable` with no `rejected` → the claim stands, `rp check` routes it. An approval from a lane means nothing in its brief objects.

Waves are atomic: a research request or blocker raised during a wave is served, but no adjudication starts until every lane reported.

## Production lanes

A production lane, declared in `../conventions/agents.md`, is a sub-pipeline of one artifact. Create `<slug>_<phase>-<lane>` branches and worktrees at the same commit; each lane's producer writes in `<phase>/<lane>/` with its **Brief**; everything this file says about an artifact applies inside the lane — its review waves run on `<slug>_<phase>-<lane>-review-<review lane>` branches cut from and merged into the lane branch — and lanes run in parallel. A lane declared `after` others starts when they are approved and receives their artifacts under **Lane inputs**. After every landing in a lane, merge the lane branch into the pipeline branch (disjoint folders, no conflicts), so `rp check` on the pipeline branch always sees every lane; after every landing on the pipeline branch, merge it into each open lane branch, so a changed input reaches the lanes. When every lane is approved and fresh: remove the lane worktrees and branches, and dispatch the producer in Consolidate mode with every lane's artifact, record, and approving reviews under **Lane candidates**; stamp the root artifact pinning them. Its review wave is a Consolidation review with the **Lane folders**. Later re-syntheses of the root run without lanes.

## Owner escalation

A pending claim targets the intent. Fire `escalation-raised`; pause the pipeline. Tell the owner: the claim verbatim, the evidence chain (the reviews and records the claim's `origin` links lead through), and the options the record names. When the owner answers, write the answer into `intent.md` as a decision (`../entries/intent-format.md`), citing the claim's path; `rp stamp` it with `--mirror`; commit. The pipeline resumes on the next step.

## Audit

A decision point: read the reviews of the episode and the record. Then `rp stamp <artifact> --set audited-<series>=<wave>` (`spec`, `build-plan`, `build`, …), and decide one of:

- A **research request**, when the loop lacks information the record does not contain: spawn the researcher yourself and pass its answer to the next producer under **Research**.
- **Continue**, when each wave resolves the previous findings and the remaining ones are new.
- **Stop** as the valve does, when the pair converges on nothing certifiable.

You write no verdict and open no amendment on your own initiative.

## The valve

Stop the run. Close out (`close-out.md`) with a dossier for the owner: the artifact, the episode's reviews in order, the pattern (recurring finding, drift, or oscillation), the current state, and the options the record names. Thresholds are `rp check`'s defaults (audit 3, valve 6); the project's policy defaults override them (`--audit`, `--valve`). When the owner's answer reopens the artifact, triage stamps it with `--set episode-start-<series>=<wave>`.
