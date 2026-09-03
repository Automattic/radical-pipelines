# The loop

The autonomous workflow. You enter from triage with a pipeline folder, a branch, a worktree, a target phase, and the run policy (lanes and charters per artifact, thresholds). Read `state.md` once. Then repeat until `rp check` reports complete through the target phase, an owner escalation is pending, or the valve stops the run.

## One step

1. Run `rp check <pipeline folder> --lanes <declared lanes> --target-phase <n>`.
2. Take the first item the report lists — triggers, then pending claims, then the phase walk — and dispatch what resolves it (table below).
3. When the dispatched agents report, land their work: verify the commits are on the branch, stamp (below), merge lane branches, fire the phase's lifecycle hooks.
4. Go to 1.

The phase runbooks (`phases/<n>-<name>.md`) name the profiles, artifacts, and materials of each phase; this file is the machine they plug into.

| `rp check` reports                                   | Dispatch                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Unresolved trigger targeting an artifact             | That artifact's producer, mode Adjudicate, with the trigger under **Amendment** (external amendment or claim) or **Task report** |
| Claim resolved by refutation                         | The claiming artifact's producer, mode Adjudicate, with the refuting review under **Refutation**                |
| Pending claim, target in owner territory             | Owner escalation (below)                                                                                       |
| Pending claim, target suspended                      | Nothing; resolve the claim above it first                                                                      |
| Artifact missing                                     | Its producer, mode Synthesize                                                                                  |
| Artifact stale                                       | Its producer, mode Synthesize, with **Input changes** — never a re-stamp by you                                |
| Artifact not approved, no review wave open           | A review wave                                                                                                  |
| Wave closed with a rejection                         | The producer, mode Adjudicate, with every lane's review under **Review lanes**                                 |
| Wave closed with every lane approved                 | Nothing; the next check moves on                                                                               |
| Wave closed with an `unsatisfiable` (no rejection)   | Nothing; the next check lists it as a trigger                                                                  |
| Plan approved and fresh, tasks outside the done-set  | One worker per task, in dependency order, one at a time                                                        |
| All tasks done, phase review missing or stale        | The phase's reviewer: `build-reviewer`, `document-reviewer`                                                     |
| `recurs`, or 3 waves this episode without approval   | Inspection (below), then continue                                                                              |
| 6 waves this episode without approval                | The valve (below)                                                                                              |

## Dispatch

- Build every prompt from the profile's template in `templates/`. Fill every slot; list materials as explicit paths — an agent's materials are exactly what its prompt lists. Never list other pipelines' folders or branches.
- Every instance is fresh. A producer never adjudicates a wave it produced for; a reviewer never re-reviews from memory — the Delta mode gets its previous review as a material.
- Spawn, seat, and terminate per `tools/<tool>.md`; the model per the project's agent conventions.
- `Execution:` in the Seat is `inspection only` for producers, plan reviewers, and researchers; `full` for workers and the build and document reviewers.
- Compute review filenames and task-report paths yourself (`state.md` § Names) and pass them under **Write your review to** / **Write your report to**.
- Serve a **research request**: spawn a fresh `researcher` with the question and the requester's agent ID; it answers the requester directly. Several independent questions in one message get one researcher each.
- A **blocker** means you prepared something wrong: fix the materials or the seat and re-dispatch; if the environment is genuinely down, stop and tell the owner.

## Stamp on landing

After every agent commit, before anyone consumes the result:

- A produced artifact: `rp stamp <artifact> --pin <each input>` per `state.md` § Pins by file, including every trigger listed in its materials.
- A review: `rp stamp <review> --reviewed <artifact> --reviewed <record> --set lane=<lane> --set iteration=<n> --mirror`; add `--set origin=<trigger path>` when the wave adjudicated a trigger; `--set head=<commit>` for a build or document review.
- A task report: `rp stamp <report> --set task=<id> --set attempt=<n> --mirror`.
- After a Synthesize with **Input changes** that reports no edit needed: `rp stamp <artifact> --pin ...` with the new identities. This is the only time an artifact's pins move without its body moving.

Commit the stamp on the pipeline branch.

## Review waves

A wave reviews one artifact at one identity.

1. Freeze: no producer works on the artifact until the wave closes.
2. Single lane: the reviewer runs in the pipeline worktree. Multi-lane: create `<slug>_<phase>-lane-<k>` branches and worktrees at the same commit, one reviewer each, in parallel; reviewers never see each other's output.
3. Each reviewer gets its **Charter** and, on a re-review, **Your previous review**, the **Diff** from the identities it reviewed, and the **Adjudication**.
4. Land: merge lane branches into the pipeline branch (disjoint files, no conflicts), remove lane worktrees and branches, stamp every review.
5. Close: any `rejected` → adjudication; every lane `approved` → done; an `unsatisfiable` with no `rejected` → the claim stands, `rp check` routes it. An approval from a lane means nothing in its charter objects.

Waves are atomic: a research request or blocker raised during a wave is served, but no adjudication starts until every lane reported.

## Owner escalation

A pending claim targets owner territory. Pause the pipeline. Tell the owner: the claim verbatim, the evidence chain (the reviews and records the claim's `origin` links lead through), and the options the record names. When the owner answers, write the answer into the target — `intent.md` under the item it resolves, or the record entry — quoted verbatim and attributed `owner`, citing the claim's path; commit; stamp nothing (the intent has no pins). The target's identity changed: the next check supersedes the claim and the cascade re-synthesizes downstream. The pipeline resumes on the next step.

## Inspection

A decision point: read the reviews of the episode and the record. Decide one of:

- A **research request** to the producer of the next wave, when the loop lacks information the record does not contain.
- **Continue**, when each wave resolves the previous findings and the remaining ones are new.
- **Stop** as the valve does, when the pair converges on nothing certifiable.

You never write verdicts or open amendments.

## The valve

Stop the run. Close out (`close-out.md`) with a dossier for the owner: the artifact, the episode's reviews in order, the pattern (recurring finding, drift, or oscillation), the current state, and the options the record names. Thresholds are the skill's defaults (inspection 3, valve 6); the project's policy defaults override them.

## Discipline

- One wave of convergence at a time per pipeline; workers one at a time.
- Nothing you do depends on commit messages.
- A change to the skill never applies to a pipeline in flight without re-stamping.
- Health monitoring runs for the whole run (`../conventions/health-monitoring.md`); lifecycle hooks fire at their moments (`../conventions/lifecycle-hooks.md`).
