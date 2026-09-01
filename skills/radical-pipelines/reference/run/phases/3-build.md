# Phase 3 — Build

The phase's specifics; the machine is `../loop.md`.

## Artifacts

`3-build/build-plan.md` and `3-build/build-plan-research.md` — the plan loop's artifacts (the record is the artifact under review for refutations; the plan for everything else — review them together). Plan reviews land as `3-build/build-plan-review-r<lane>-<iteration>.md`; the batch review as `3-build/build-review-r<lane>-<iteration>.md`; on approval the batch reviewer writes `3-build/build-summary.md`.

Pins: the plan artifacts pin `1-spec/spec.md`, `1-spec/spec-research.md`, `2-design-doc/design-doc.md`, and `2-design-doc/design-doc-research.md`. The batch review pins `3-build/build-plan.md`; stamp its reviewed commit range with `--set head=<commit>`.

## Profiles

- `build-plan-producer` — modes Synthesize / Adjudicate (Task failures arrive here).
- `build-plan-reviewer` — modes Fresh / Delta.
- `build-worker-tdd` / `build-worker-edit` / `build-worker-e2e` — one task block each, chosen by the task's Type.
- `build-reviewer` — modes Fresh / Delta; writes the summary on approval.
- `researcher` — serves producers and reviewers.

## Sequence

1. **Plan loop** until the plan is approved and fresh.
2. **Task dispatch**: done-set = task ids with a `Task-complete` trailer on the branch; dispatch the remaining tasks in dependency order, one worker per task, sequentially on the pipeline worktree. Stamp nothing on task commits — trailers are the record.
3. **A task failure** routes to the plan loop: dispatch the producer in mode Adjudicate with the failure report; its outcome is a revised plan (staleness re-runs the plan review), a refutation (re-dispatch the task with it), or a contradicts-input claim (escalation per `../loop.md`).
4. **Batch review** when the done-set covers the plan: a review wave over the whole diff. Rejection findings attributed to tasks re-dispatch fresh workers for those tasks; plan-level findings route to the plan loop; then a Delta batch wave over the new commits.
5. Phase complete when the plan, the batch review, and the summary exist, approved, stamped, and fresh.

## Escalation targets

The plan's direct inputs are the spec and design artifacts. A fallen assumption (`A<n>` refuted by task evidence) is a direct contradiction targeting the artifact whose register holds it. "No plan can satisfy this design" is an exhaustion claim only this phase's plan pair can originate — mechanism classes closed by reading or recorded failed attempts — and it climbs one layer to the design's wave.
