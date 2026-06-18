# Docs Summary

## What

The docs phase brought the user-facing documentation in line with the per-phase
summaries feature. Two surfaces changed:

- `README.md` — the "Configuration" paragraph now records that the code and docs
  phases each leave a human-readable summary (`4-code/code-summary.md` and
  `5-docs/docs-summary.md`), written by the reviewer on approval and committed
  alongside the `<artifact>-review-approved.md` marker, and that those phases
  complete only once the summary is committed too. The "What it does" phase list
  gained a same-altitude note on the Phase 4 and Phase 5 bullets ("plus a summary
  of what the phase produced").
- `website/demo.js` — the marketing demo's sped-up run now shows the phase-4
  `code-reviewer` and phase-5 `doc-reviewer` each committing a summary alongside
  the approval marker: the `writes` arrays and the `pendingTree` gain
  `code-summary.md` / `docs-summary.md`, the per-step tree indices are re-sequenced
  to stay aligned, and the "Pipeline complete" line's artifact count moves from 14
  to 16.

## Why

Phases 1–3 already leave human-readable records, and the code phase made phases 4
and 5 leave summaries too. The README is the prose surface that enumerates what
each phase produces and what lands in a run's artifact folder, so it would have
gone stale without naming the new summaries and the extended completion gate. The
website demo is an illustrative reconstruction of a real run; refreshing it keeps
the marketing surface from depicting a phase-4/5 flow that omits the summaries.

## How

The README edits are additive and stay at the README's altitude — they name the
summaries by role and location and state when they are written and what completion
now requires, while pointing to the existing references rather than restating the
summary format (its schema, the omit-empty rule, the asset convention), which lives
only in the shipped `summary-format.md`. The demo edits are cosmetic: the two new
`pendingTree` entries are inserted at their natural positions and every step's
`treeIdx` is renumbered so each index still resolves to its intended file, with the
displayed artifact count tracking the tree length exactly as before.

## Key decisions

- The website refresh was the doc plan's OPTIONAL, skippable marketing task; it was
  undertaken so the marketing surface stays accurate, but skipping it would not have
  left the feature's documentation incomplete — Task 1 (the README) carries the
  required coverage.
- No website-only changeset was added: `website/**` is not a release-relevant path,
  so the demo refresh ships under the code phase's existing feature changeset rather
  than its own.
