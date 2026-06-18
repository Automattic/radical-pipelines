# Spec Research: Per-phase summaries for the code and docs phases

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

## Q&A

**Q1.** What should a phase summary contain — should the code and docs summaries share one default structure (like the What / Why / How + key decisions / limitations format the superseded run-summary used), or does each phase need its own structure tailored to what it produced?

**A1.** Not a decision to make here: reusing the same structure for both phases, with the format from the superseded run-summary (What / Why / How + key decisions, limitations), is a **direction to explore** — to be confirmed or revised later, not fixed by the spec.

**Q2.** Should the summary gate phase completion — i.e. should the phase 4/5 completion predicates be extended so a phase doesn't count as complete until its summary is committed (as PR #120 did for its run-level summary), or is the summary best-effort, with the approval file alone still deciding completion?

**A2.** The summary gates completion: the phase 4/5 completion predicates are extended so a phase is not complete until its summary is committed (alongside the approval file).

**Q3.** What are the summary artifacts called? E.g. phase-named files (`4-code/code-summary.md`, `5-docs/docs-summary.md`, matching the `code-review-approved.md` naming pattern) versus a constant `summary.md` inside each phase folder?

**A3.** Phase-named files: `4-code/code-summary.md` and `5-docs/docs-summary.md`.

**Q4.** Should the summary format be project-overridable through an optional convention (as PR #120 did with its "Run summary format" convention — skill ships a default format file, a project's conventions may replace it), or is the format fixed by the skill alone?

**A4.** Match what the spec and design-doc formats do. Research: they allow no project override — the conventions list (`reference/conventions/load.md`) contains no format conventions; artifact formats are fixed by the skill. So the summary format is skill-owned, with no project-overridable convention.

**Q5.** The intent flags an assumption to confirm: review runs read nothing from prior runs directly — whatever context the next run needs should already be captured in its review intent, which may draw on these summaries. Does this change touch how review runs get their input at all (e.g. `review-pipeline.md`), or does it only produce the summaries, leaving review input exactly as it is today?

**A5.** This produces only the summaries. Review input stays exactly as it is today; whether a review intent draws on the summaries is up to whoever writes it.

**Q6.** Consolidated out-of-scope list surfaced for confirmation — is anything missing?

**A6.** Confirmed — nothing missing.

## Research

- **Phase 4/5 review flow** (`reference/autonomous-phases/4 - code.md`, `5 - docs.md`): writers run one per task, a fresh reviewer is spawned per batch. Rejections produce `code-review-N-rejected.md` / `docs-review-N-rejected.md`; approval produces the singleton terminator `code-review-approved.md` / `docs-review-approved.md`. Exactly one reviewer instance ever approves, so "the reviewer writes the summary when it approves" maps to a single, well-defined author per phase.
- **The approving reviewer sees the whole run, not just its batch** (`agents/code-reviewer.md`, `agents/doc-reviewer.md` step 1; `pipeline-versioning.md` "Reviewer base ref"): the review diff is `base-ref → current HEAD`, where the base ref is the start of the current run and is held constant across all rejection iterations. So the approving reviewer holds the full run diff even when its batch was a re-dispatched subset.
- **Completion predicates** (`pipeline-versioning.md` "Per-phase completion"): phase 4 completes on `4-code/code-review-approved.md`, phase 5 on `5-docs/docs-review-approved.md`, evaluated per run folder. Extending these rows would gate completion everywhere at once (resume, review-start, tree rendering), as PR #120 did for its run-level summary.
- **Assisted mode cannot run phases 4 and 5** (`reference/assisted-workflow.md`): no assisted-mode summary variant is needed; the reviewers are the only authors.
- **Lineage implication** (`pipeline-versioning.md` "Deriving lineage from artifact content"): lineage compares phase folders by tree SHA over `base/<phase>`. A summary living inside `4-code/` or `5-docs/` becomes part of that phase's content identity. (Design-phase concern; noted for completeness.)
- **PR #120 precedent**: the superseded run-summary shipped a default format file (`reference/run-summary-format.md`, What / Why / How / Key decisions / Rejected approaches / Known limitations, omit-empty discipline) plus an optional project convention to override the format. The PR was closed without merging; none of this exists on trunk.

## Out of Scope

Confirmed by the owner (Q6):

1. Consuming the summaries — PR descriptions, pushing them anywhere; left to each project. RP stays agnostic to git, GitHub, and trackers.
2. A run-level summary artifact — the superseded #101 / PR #120 approach.
3. The pipeline closeout/cleanup phase — follow-ups, worktree cleanup, consolidating run artifacts.
4. Changes to review-run input — reviews keep reading nothing from prior runs directly; review intents may draw on the summaries, but that authoring sits outside this change.
5. A project-overridable summary format convention — the format is skill-owned, like the spec and design-doc formats.
6. Summaries for phases 1–3 — those phases already leave human-readable artifacts.

## Consolidated Requirements

1. The code phase leaves `4-code/code-summary.md` and the docs phase leaves `5-docs/docs-summary.md`, each inside its phase folder under the run that produced it.
2. The approving `code-reviewer` / `doc-reviewer` writes its phase's summary when it approves; rejected iterations produce no summary. No new phase, no new agents.
3. A summary is a human-friendly record of what its phase produced in the current run as a whole (the approving reviewer's full base-ref → HEAD scope), not just the final approved batch.
4. A summary may include screenshots or other assets where useful, stored in the phase folder and referenced by relative path.
5. The phase 4/5 completion predicates are extended: the phase is complete only when both the approval file and the summary are committed.
6. The summary format is skill-owned with a single definition shared by both phases; the exact structure is a design-phase decision (direction to explore: the superseded run-summary's What / Why / How + key decisions / known limitations).
7. Each run writes its own summaries; a review run never edits a prior run's.
