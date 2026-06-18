# Per-phase summaries for the code and docs phases

> Source: GitHub issue [Automattic/radical-pipelines#123](https://github.com/Automattic/radical-pipelines/issues/123).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Every phase of a run leaves a human-friendly record of what it produced. Phases 1–3 already do (the spec, the design doc, the plans), but the code and docs phases leave only review-approval markers. After this change, those two phases each leave a summary in their phase folder, so the run's artifacts alone tell the full story of the run — and a project can build run-level outputs (e.g. a PR description) from them.

## Constraints

- No new phase and no new agents: the `code-reviewer` and `doc-reviewer` write their phase's summary when they approve.
- No run-level summary artifact for now: this supersedes the per-run `run-summary.md` approach from issue #101 / PR #120 (see Context).
- The pipeline closeout/cleanup phase (follow-ups, worktree cleanup, consolidating run artifacts) is separate future work, out of scope here.
- Producing the summaries is the whole scope. Consuming them — PR descriptions, pushing them anywhere — is left to each project; RP stays agnostic to git, GitHub, and trackers.

## Context

- Replaces issue #101 after a team discussion changed the approach; PR #120 implemented #101 and is superseded along with it. The superseded approach produced a single run-level `run-summary.md` per run, written by a dedicated single-shot `run-summary-writer` agent when phase 5 completed, extended the phase-5 completion predicate to require it, and fed prior runs' summaries into a review's phase 1.
- The reviewers are the natural authors: at approval time they hold the spec, the design doc, the plans, and everything the implementers did.

## Assumptions / directions to explore

- Review runs read nothing from prior runs directly; whatever context the next run needs should already be captured in its review intent (which may draw on these summaries). To confirm.
- Each run writes its own summaries rather than editing a previous run's; consolidation, if wanted, belongs to the future closeout phase.
- Summaries may include screenshots where useful.
