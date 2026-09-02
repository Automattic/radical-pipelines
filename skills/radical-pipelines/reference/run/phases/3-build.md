# Phase 3 — Build

The phase's specifics; the machine is `../loop.md`.

## Artifacts

`3-build/build-plan.md` and `3-build/build-plan-research.md` — the plan loop's unit, reviewed together. Plan reviews land in `3-build/` as `build-plan-review-…`; task reports in `3-build/tasks/`; the build review as `build-review-…`; on approval the build reviewer writes `3-build/build-summary.md`.

## Profiles

- `build-plan-producer` — modes Synthesize / Adjudicate (failed task reports arrive here).
- `build-plan-reviewer` — modes Fresh / Delta.
- `build-worker-tdd` / `build-worker-edit` / `build-worker-e2e` — one task each, chosen by the task's Type; each writes its task report.
- `build-reviewer` — modes Fresh / Delta; writes the summary on approval.
- `researcher` — serves producers and reviewers.

## Sequence

1. **Plan loop** until the plan is approved and fresh.
2. **Task dispatch**: dispatch the tasks outside the done-set in dependency order, one worker per task, sequentially on the pipeline worktree; compute each report's path (`tasks/task-<id>-<attempt>.md`) and pass it in the template. Stamp each report on landing.
3. **A failed report** is a pending trigger at the plan: the loop dispatches the producer in mode Adjudicate with it; the outcome is a revised plan, a refutation (the task is re-dispatched with it), or a contradicts-input claim (escalation per `../loop.md`).
4. **Build review** when the done-set covers the plan: a review wave over the code since the plan landed, with `head` stamped. Rejection findings attributed to tasks re-dispatch fresh workers for those tasks (new attempts); plan-level findings route to the plan loop; then a Delta wave.
5. Phase complete when the plan, the build review, and the summary exist, approved, stamped, and fresh.

## Escalation targets

The plan's direct inputs are `spec.md` and `design-doc.md`. A fallen assumption (`A<n>` refuted by task evidence) is a direct contradiction targeting the artifact whose register holds it. "No plan can satisfy this design" is an exhaustion claim only this phase's plan pair can originate — mechanism classes closed by reading or by recorded failed attempts — and it climbs one layer to the design's wave.
