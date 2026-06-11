# Generic per-run pipeline summary artifact

> Source: [Automattic/radical-pipelines#101](https://github.com/Automattic/radical-pipelines/issues/101).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Each pipeline run (`base`, `review-1`, …) produces a generic, inspectable summary of what that run changed. The summary lets later reviews build on an accurate picture of prior runs, and gives each project a single artifact it can consume however it needs — all without coupling Radical Pipelines to GitHub, git, or any specific tracker.

## Constraints

- Radical Pipelines stays agnostic to GitHub/git. The artifact is a generic run/pipeline summary, not a "PR description".
- Producing the artifact is the whole scope. Consuming it — opening or updating a PR, pushing it anywhere, etc. — is left to each project (its conventions and orchestrator).

## Context

- Depends on #95 (reviews: re-run the whole pipeline as `base` + `review-N` runs on the same branch) — now closed, so the dependency is satisfied. The artifact's defining role — carrying a run's context into the next review — only exists once reviews do. #95 makes reviews agnostic to prior runs; this artifact is how prior-run awareness is selectively reintroduced. #95 also settled what each re-run is called (`base`, `review-N`), which a comment on the issue had flagged as a prerequisite for naming the artifact.
- Supersedes #66 (Generate a PR description artifact), closed as superseded by this issue.
- PR #92 implemented a v1 PR-description artifact (a mandatory, always-last doc task in phase 5 producing `pr-description.md`) and was closed pending #95 and this decision: https://github.com/Automattic/radical-pipelines/pull/92

## Assumptions / directions to explore

Open hypotheses from the discussion, to confirm or revise in later phases:

- A single file per run, generated at the end of the run, passed as input to the next review and edited/updated across iterations. The issue body suggests `pipeline-summary.md` as the name, but discussion flagged that a pipeline-level name for a per-run file could be confusing — the name should account for the run naming (`base`, `review-N`).
- A **What / Why / How** default format, which each project can override in its conventions.
