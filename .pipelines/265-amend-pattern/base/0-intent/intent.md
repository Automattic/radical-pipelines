# Add an `amend` pattern: a reduced pipeline for small, fully pinned changes

> Source: GitHub issue [Automattic/radical-pipelines#265](https://github.com/Automattic/radical-pipelines/issues/265).
> This file is self-contained; agents do not need to open the source issue.

## Goal

A small change whose target state is already pinned in its intent — no open design decisions — can land with the same quality guarantees a full revision provides (ramification research, a closed touch map, gates, an adversarial final review of the whole diff) at a fraction of the time and tokens: one phase instead of four, two review loops instead of five, one research pass instead of three.

## Constraints

- The two guarantee-bearing steps are non-negotiable: a genuine research pass before writing (ramification sweeps, semantic verification of the pinned target) and a final adversarial review of the full diff against the plan, with gates run once.
- Qualification hinges on open decisions and size, not on behavior: the intent pins the target state, no design decision is left to later phases, and the touch map is small and expected to close. Behavior-preserving is a strong signal, not the gate.
- The plan reviewer holds eject authority: if research surfaces a real design decision, it rejects with "exceeds amend scope — run a revision."
- The structure introduces no new phase vocabulary: a run folder `amend-<N>-<desc>` containing `0-intent/` and a single `1-amend/` phase that reuses the build phase's internal grammar — `amend-plan-research.md`, `amend-plan.md` (spec/design content and tasks in one artifact), `amend-plan-review-*`, writer commits, `amend-review-*`, `amend-summary.md`. Documentation work is ordinary tasks; there is no separate document phase.

## Context

- Motivating case: WooCommerce `billow-78-in-cart-count` fork v5 rev-8 — a utility relocation plus a four-line docs trim, fully pinned by the owner, produced ~1,700 lines of artifacts across five review loops, with the design phase re-executing the spec review's checks and the document phase re-deriving edits the build plan had already spelled out verbatim.
- Base rate: a survey of all 12 revisions run to date found 3–4 would qualify (~25–33%), concentrated in the late-PR-review polish stage (renames, moves, doc sweeps) — the stage where the full pipeline's overhead ratio is worst. Early-life revisions (redesigns, new mechanisms) don't qualify and shouldn't.
- What must not be lost, evidenced by rev-8: its spec research caught that the reference implementation the owner pointed at (fork 4's utility) silently differed from the shipped rule (missing `quantity` skipped vs. counted as 0) — the amend's research pass and final review both preserve that catch.
- Related: [#163](https://github.com/Automattic/radical-pipelines/issues/163) (pr-review origin — amends will often originate there), [#233](https://github.com/Automattic/radical-pipelines/issues/233) (token-cost pressure).

## Assumptions / directions to explore

- *(open)* Whether existing agent profiles are reused under amend prompts (spec-lead/spec-researcher for the plan, build-writers, a reviewer profile for both loops) or dedicated `amend-*` profiles are authored.
- *(open)* How amends sit in pipeline lineage and numbering alongside revisions (`rev-N` vs `amend-N` sequencing in the same family), and what "latest run complete" means when the latest run is an amend.
- *(open)* Whether an amend is only a variant of revising (layered on a complete, unmerged run) or can also serve as the first run of a trivially small issue.
