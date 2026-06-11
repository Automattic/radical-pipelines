# Docs Review: Approved

Batch reviewed: both tasks of `3-plan/doc-plan.md` (README.md updates), committed as `2da3e09` and `7dcc86f`. Diffed against base ref `2c9442de38d953e2bbc558c55cd397ad2d470081`.

## Verdict

Approved. Both tasks are factually accurate against the shipped code, meet every acceptance criterion in the doc plan, and stay at the README's existing altitude.

## Task 1 — README run model includes the per-run summary

The added run-model paragraph states that every run produces a single run-level summary, written at run completion when the run finishes its final phase, that a run does not count as complete until it exists, and that a review run receives the prior runs' summaries in run order as input.

- Each claim matches the shipped code: the gating/completion behavior matches the extended phase-5 predicate in `pipeline-versioning.md` (`5-docs/docs-review-approved.md` and `run-summary.md`), and the "prior runs' summaries in run order" claim matches `review-pipeline.md` step 7 ("base, review-1, …, review-(N-1) in that order", delivered "in run order").
- Stays at altitude: no completion-predicate string, no filename placement rules, no writer source list, no fork edge case embedded.
- Generic: described as a "single run-level summary of what that run changed" with no PR/tracker/git coupling.

Satisfies Task 1 acceptance criteria 1–4.

## Task 2 — README conventions list includes the override convention

The conventions paragraph now names the optional `Run summary format` convention, states the skill ships a default that applies when a project does not set one, and groups it with `Agent models` as "optional and project-overridable" pointing to the setup conventions reference.

- Matches the shipped convention: `load.md` lists "Run summary format" with Required? = **No** and notes the skill default `reference/run-summary-format.md` applies when silent; `setup.md` has a matching "Run summary format" entry with the skill file as the default.
- Does not embed the default format's section structure; references the setup conventions reference, matching the existing `Agent models` pattern. The linked `skills/radical-pipelines/reference/conventions/setup.md` exists.
- No git/tracker/tool-specific concept introduced.

Satisfies Task 2 acceptance criteria.

## Scope check

The diff touches only `README.md` among external documentation surfaces (4 lines across the two commits); `website/`, `CONTRIBUTING.md`, and `AGENTS.md` are untouched, matching the doc plan's analysis that README is the only affected external surface.
