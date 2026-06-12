# Code Summary

## What

The code phase made the code and docs phases each leave a human-friendly summary in its phase folder, written by the reviewer that approves the phase. Across one rejected iteration and its re-dispatch, seven markdown-level changes landed:

- A new shared reference, `skills/radical-pipelines/reference/summary-format.md` — the single definition of the summary format: a five-section schema (What / Why / How / Key decisions / Known limitations) with the established omit-empty rendering rule, the whole-run coverage statement, the asset convention, and authoring discipline.
- `agents/code-reviewer.md` and `agents/doc-reviewer.md` — each reviewer's gather-context step names the summary format as a launch-prompt input; on an approved verdict the reviewer also writes `4-code/code-summary.md` / `5-docs/docs-summary.md` following that format and commits it together with the approval marker in a single commit. Rejected iterations are unchanged and produce no summary.
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` and `5 - docs.md` — the summary joins the Outputs list, the orchestrator includes the resolved content of `summary-format.md` in every reviewer launch prompt, and the step 6 completion check requires the summary.
- `skills/radical-pipelines/reference/pipeline-versioning.md` — the "Per-phase completion" rows for phases 4 and 5 each require the approval marker and the summary.
- `skills/radical-pipelines/SKILL.md` — the phase 4 and 5 Produces cells name the summaries.
- `.changeset/per-phase-summaries.md` — a `minor` changeset releasing the feature.

## Why

Phases 1–3 already leave human-readable records — the spec, the design doc, and the plans — but phases 4 and 5 left only review-approval markers, so a run's artifact folder alone never said what those phases produced. With the summaries, the artifact folder tells the full story of the run, and a project can build run-level outputs (such as a PR description) from the per-phase summaries while Radical Pipelines stays agnostic to git hosting and trackers.

## How

The summary is grafted onto the existing reviewer approval flow — no new phase, no new agents. The format is defined once in `summary-format.md`; the orchestrator reads it and passes the resolved content in every reviewer launch prompt, since the verdict is not known in advance. On approval the reviewer writes the summary into the phase folder and commits it with the approval marker in one commit, so there is never a committed state with the marker but no summary. The completion predicate is extended at its single source of truth — the "Per-phase completion" table — and resume, review gating, and fork seeding inherit the change with no edit of their own.

## Key decisions

- The format lives only in `summary-format.md`; the agent and phase files reference it without restating the schema, the omit-empty rule, the coverage statement, or the asset convention. The coverage statement ("what its phase produced in the current run as a whole") appears exactly once, there.
- Rejected alternatives fold into the Key decisions section rather than a separate "Rejected approaches" section — per phase, rejection iterations are already visible in the phase folder.
- Run isolation needs no new mechanism: reviewers write into the run-scoped artifact folder the orchestrator resolves for them, so a review run's summaries land under its own run folder.

## Known limitations

- A reviewer that approves but omits the summary is invisible to the health monitor, which watches liveness rather than artifacts; detection rests on the orchestrator's step 6 completion check, mitigated by the single-commit coupling of marker and summary.
