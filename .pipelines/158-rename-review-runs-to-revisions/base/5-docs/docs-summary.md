# Docs Summary: Rename "review runs" to "revisions"

## What

The docs phase updated the top-level `README.md` run-model paragraph (the section
describing how phases commit artifacts into run folders) so its narration of the run model
matches the renamed skill convention. The follow-up run is now named
`revision-N-<short-description>/` and the act of creating it reads "each revision run adds a
sibling … run". This was the single docs task — the one documentation surface outside the
code plan's 8 mapped skill files that narrates the run-naming concept.

## Why

The pipeline renames the runs that follow a pipeline's `base` run from `review-N` to
`revision-N`, and the activity that creates them from "review"/"reviewing" to
"revise"/"revising", so that "review" denotes the phase-auditing activity only. The code
phase covered every in-skill prose surface (`skills/radical-pipelines/`, `.rp.md`); the
README narrates the same convention to prospective adopters and contributors before they
open the skill's reference files, so it had to end up consistent with the renamed
convention.

## How

A precision edit (commit `a7b534c`) renamed only the run-naming tokens in the run-model
paragraph: the follow-up-run folder name (`review-N-<short-description>/` →
`revision-N-<short-description>/`) and the prose naming the act of adding a follow-up run
("each review adds a sibling … run" → "each revision run adds a sibling … run"), written as
"revision run" / `revision-N`, never a bare "revision". Everything else in the paragraph was
kept byte-unchanged: the `base/` run name, the phase-audit "review" tokens (inspectable
review artifacts, reviewer agents, `<artifact>-review-N-rejected.md`,
`<artifact>-review-approved.md`), generic owner-review-of-artifacts wording, and the
`reference/pipeline-versioning.md` reference (which still resolves). The diff against the
run's base ref (`8350faa`) touches exactly one paragraph (one line removed, one added).

## Key decisions

- **Scope held to the README only.** An end-to-end repository sweep (recorded in
  `docs-plan.md` under "Sweep findings") found no other in-scope documentation surface. The
  `CHANGELOG.md` historical `## 0.3.0` release entry (PR #106) was deliberately excluded — it
  is a changeset-generated, immutable record of what shipped, and rewriting it would falsify
  the release history; the rename is a going-forward convention change. `pr-description.md`,
  the `website/` tree, `CONTRIBUTING.md`, `AGENTS.md`/`CLAUDE.md`, the PR template, other
  changesets, `scripts/`, `.claude-plugin/`, and `.pi/` carry only phase-audit or generic
  "review"/"revise" hits and were excluded.
- **Always "revision run" / `revision-N`, never a bare "revision".** Keeps the run sense
  distinct from the generic-English "revise"/"revision" already present elsewhere.

## Known limitations

None. The change is a self-contained vocabulary edit to one README paragraph; it does not
alter how pipelines run. (As recorded in the spec's Out of Scope, existing on-disk
`review-N-*` run folders under `.pipelines/` are not migrated — that boundary is a spec-level
decision, not a docs limitation.)
