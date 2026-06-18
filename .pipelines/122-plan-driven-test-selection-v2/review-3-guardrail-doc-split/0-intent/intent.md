# Refine the guardrail documentation split between guardrails.md and the passing reference

## Origin

From the owner's manual review of the scoped-guardrails work delivered in `review-2-scoped-guardrails` (PR #127, https://github.com/Automattic/radical-pipelines/pull/127). While reviewing, the owner refactored the guardrail documentation directly on the branch, deliberately moving away from review-2's "comprehensive `guardrails.md`" decision:

- Slimmed `guardrails.md` to the model only — gate kinds, the per-gate `.rp.md` block, the fill lifecycle — dropping its Validation, Resolve-and-run, and Spawn-fields sections.
- Made `reference/conventions/passing.md` the single home for how guardrails reach agents (the `Guardrails:` and `Guardrail scopes to fill:` spawn fields) and for the "resolved command after `{scope}` substitution" definition, with `passing.md` referencing `guardrails.md` for the model.
- Left validation documented where it is performed: the setup probe in `setup.md`, the plan-phase check in the plan-reviewers.
- Added an `AGENTS.md` rule that agent profiles are self-contained (no skill-file or `.rp.md` references) and removed such references from the agent profiles — making real the self-containment the review-2 design already assumed (its design dependency on the `AGENTS.md` self-containment rule).

Review-2's Acceptance Criterion 1 and its design components (which mandate a comprehensive, self-contained `guardrails.md` that explains the full lifecycle and how guardrails reach agents without reading other files) are now out of sync with the shipped skill.

## Goal

The guardrail documentation has one clear home per concern — `guardrails.md` for the model, the convention-passing reference for how guardrails reach agents — and the pipeline's spec and design describe that split accurately, with no acceptance criterion contradicting the shipped skill.

## Constraints

- Behavior is unchanged: the fixed/scoped gate mechanism and the agent-side run protocol stay as shipped. This run re-bases documentation architecture only.
- Keep the owner's shipped wording; do not revert the manual edits.

## Assumptions / directions to explore (open)

- Whether the `passing.md → guardrails.md` reference chain already documents resolve adequately, or `passing.md`'s `Guardrails:` line should become an active instruction (substitute the plan's `## Guardrail scopes` value into the template).
- Acceptance Criterion 1 likely needs rewording, since "how guardrails reach agents" now lives in `passing.md` rather than `guardrails.md`.
