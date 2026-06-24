# Rename "review runs" to "revisions"

> Source: GitHub issue #158 (https://github.com/Automattic/radical-pipelines/issues/158).
> This file is self-contained; agents do not need to open the source issue.

## Goal

The runs that follow a pipeline's `base` run are called **revisions** (`revision-1`, `revision-2`, …) instead of reviews, so the word "review" no longer denotes both these runs and the unrelated reviewing activities in the pipeline.

## Constraints

- Use the full word **revision** — not the abbreviation `rev`.
- `base` keeps its name as the first run.

## Context

"review" is currently overloaded across distinct concepts: the runs after `base` (`review-1`, `review-2`…), the reviewer agents (`code-reviewer`, `spec-reviewer`…), the per-phase approval artifacts (`code-review-approved.md`), and the per-phase rejection iterations (`spec-review-N-rejected.md`). The sharpest collision is between a run number (`review-2`) and a rejection-iteration number (`spec-review-2-rejected.md`), where the same digit means different things. Renaming the runs to "revisions" frees "review" for the reviewing activity only.
