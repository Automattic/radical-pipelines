# Docs Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Docs Task 1 — Rename the run-naming tokens in the `README.md` run-model paragraph (the only docs task in `docs-plan.md`).

## Summary

The batch's single change is a precision rename of the run-naming tokens in the
`README.md` run-model paragraph (line 157, commit `a7b534c`). The edit renames the
follow-up run from `review-N-<short-description>/` to `revision-N-<short-description>/`
and the act of creating it from "each review adds a sibling … run" to "each revision run
adds a sibling … run", matching the shipped skill convention in
`skills/radical-pipelines/reference/pipeline-versioning.md`. Every phase-audit "review"
token in the same paragraph — `inspectable review artifacts`, `reviewer agents`,
`<artifact>-review-N-rejected.md`, `<artifact>-review-approved.md` — and the `base/` run
name are byte-unchanged; the `reference/pipeline-versioning.md` reference still resolves.
The diff touches only that one paragraph (one removed line, one added line) with no
collateral edits, and the deliberate docs-plan exclusions still hold (no other in-scope
documentation surface was left with a stale run-naming "review"). Acceptance is fully met.

## Checks

No guardrails are defined for this project, so there are no gates to run.

| Check | Command | Result |
| ----- | ------- | ------ |
| (none defined) | (none) | n/a |

## Accuracy spot-check

Concrete claims in the README's run-model paragraph verified against the shipped skill
convention and by grep:

- **Follow-up run name `revision-N-<short-description>/`.** README line 157 reads "each
  revision run adds a sibling `revision-N-<short-description>/` run on the same branch".
  This matches the shipped convention in `pipeline-versioning.md:15`
  (`<run>` is `base`, `revision-1-<short-description>`, `revision-2-<short-description>`, …)
  and `:17` (`N` in `revision-N-…` is a per-pipeline monotonic counter — the next integer
  after the existing `revision-*` folders). `grep -noE 'revision run|revision-N-<short-description>' README.md`
  returns both tokens on line 157; `grep -noE 'review-N-<short-description>|review run|each review adds'`
  returns none — the stale run-naming form is gone.
- **`base/` run name unchanged.** README line 157 reads "Every pipeline carries a `base/`
  run from creation"; `grep -noE '`base/` run' README.md` confirms the token is intact,
  matching `pipeline-versioning.md:15` (`base` is always the first run).
- **Never a bare "revision".** Every literal `revision` on line 157 is qualified —
  `grep -oE 'revision( run|-N|-[0-9])?' README.md` yields exactly "revision run" and
  "revision-N"; no bare "revision" run-noun exists.
- **Phase-audit "review" tokens byte-unchanged.** `grep -noE` confirms
  `inspectable review artifacts`, `reviewer agents`, `<artifact>-review-N-rejected.md`, and
  `<artifact>-review-approved.md` (×3) all remain on line 157, matching the spec invariant
  (req 11) and the skill, which preserves `*-review-approved.md` / `*-review-N-rejected.md`
  (`pipeline-versioning.md:46-49`).
- **Reference resolves.** The README's `reference/pipeline-versioning.md` reference (its
  wording byte-unchanged by this edit) resolves to
  `skills/radical-pipelines/reference/pipeline-versioning.md`, which exists
  (`test -f` → RESOLVES).
- **No collateral / scope creep.** `git diff 8350faa..HEAD -- README.md` shows exactly two
  changed lines (one `-`, one `+`) — the single run-model paragraph; no other line moved.
- **Drift sweep.** A repo-wide grep for run-naming "review" tokens
  (`review-[0-9]+-<short|review run|each review adds|review-N-<short`) over the documentation
  surfaces outside the code plan's 8 files finds only `CHANGELOG.md:38` — the historical
  `## 0.3.0` release entry (PR #106) that `docs-plan.md` records as a deliberate exclusion
  (an immutable changeset-generated release record). The `website/` tree returns no
  run-naming "review", confirming its exclusion holds.
