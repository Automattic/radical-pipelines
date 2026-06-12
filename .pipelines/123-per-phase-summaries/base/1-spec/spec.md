# Spec: Per-phase summaries for the code and docs phases

## Overview

Every phase of a pipeline run leaves a human-friendly record of what it produced. Phases 1–3 already do — the spec, the design doc, and the plans are those records. The code and docs phases leave only review-approval markers, so a run's artifacts alone don't tell what those two phases actually produced. This change makes each of them leave a summary in its phase folder, written by the reviewer that approves the phase. With it, a run's artifact folder tells the full story of the run, and a project can build run-level outputs (e.g. a PR description) from the per-phase summaries — while Radical Pipelines stays agnostic to git, GitHub, and trackers.

## Requirements

1. **Artifacts.** The code phase leaves `4-code/code-summary.md` and the docs phase leaves `5-docs/docs-summary.md`, each inside its phase folder under the run that produced it (`<artifacts-folder>/<run>/…`).
2. **Authors.** The approving `code-reviewer` writes `code-summary.md`; the approving `doc-reviewer` writes `docs-summary.md`. The summary is written when the reviewer approves — rejected iterations produce no summary. No new phase and no new agents.
3. **Coverage.** A summary is a human-friendly record of what its phase produced in the current run as a whole — the full run scope the approving reviewer already holds — not just the final approved batch.
4. **Assets.** A summary may include screenshots or other assets where useful; they live in the same phase folder and are referenced by relative path.
5. **Completion gating.** The per-phase completion predicates are extended: phase 4 is complete only when `4-code/code-review-approved.md` and `4-code/code-summary.md` are committed; phase 5 only when `5-docs/docs-review-approved.md` and `5-docs/docs-summary.md` are committed.
6. **Format.** The summary format is defined by the skill, like the spec and design-doc formats, with a single definition shared by both phases. The exact structure is a design-phase decision; the direction to explore is the What / Why / How (+ key decisions, known limitations) format of the superseded run-summary.
7. **Run isolation.** Each run writes its own summaries. A review run never edits a prior run's summaries.

## Out of Scope

- Consuming the summaries — PR descriptions, pushing them anywhere. Left to each project; Radical Pipelines stays agnostic to git, GitHub, and trackers.
- A run-level summary artifact (the superseded #101 / PR #120 approach).
- The pipeline closeout/cleanup phase (follow-ups, worktree cleanup, consolidating run artifacts).
- Changes to review-run input: reviews keep reading nothing from prior runs directly; review intents may draw on the summaries, but that authoring sits outside this change.
- A project-overridable summary format convention.
- Summaries for phases 1–3 — those phases already leave human-readable artifacts.

## Acceptance Criteria

1. Given a run whose code phase ends with the `code-reviewer` approving, when the approval lands, then `<artifacts-folder>/<run>/4-code/code-summary.md` is committed on the pipeline branch alongside `code-review-approved.md`.
2. Given a run whose docs phase ends with the `doc-reviewer` approving, when the approval lands, then `<artifacts-folder>/<run>/5-docs/docs-summary.md` is committed on the pipeline branch alongside `docs-review-approved.md`.
3. Given `code-review-approved.md` committed but `code-summary.md` absent, when phase completion is evaluated per the **Per-phase completion** predicate, then phase 4 is not complete — and likewise for phase 5 with `docs-summary.md`.
4. Given a code phase that went through one or more rejected iterations before approval, when the summary is written, then it covers the run's entire code-phase output (the reviewer's base-ref → HEAD scope), not only the tasks in the final batch.
5. Given a review run that completes its code or docs phase, when its summaries are written, then they live under the review run's own folder and every prior run's summaries are byte-unchanged.
6. Given a completed run, when a reader opens its artifact folder, then every phase has a human-readable record of what it produced — no phase is represented by approval markers alone.
