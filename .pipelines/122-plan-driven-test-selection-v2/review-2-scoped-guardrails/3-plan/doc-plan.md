# Doc Plan: Scoped guardrails

## Overview

This change restructures the skill's guardrails feature internally — replacing review-1's `plan-completed-for` model with the fixed/scoped gate model — and the code plan already edits every skill and agent file that implements it. The only external, user-facing documentation that describes the renamed concepts is the unreleased changeset for this pipeline, `.changeset/plan-driven-test-selection.md`, which was authored during review-1 and still describes the `plan-completed`/feature-scoped-command model that review-2 removes; left as-is it would ship a release note for a model that never shipped. This plan has one task: rewrite that changeset's guardrail/test-selection portion to describe the fixed/scoped model that actually ships, preserving the parts of the same changeset that review-2 does not touch. No other external surface needs updating (see "Surfaces considered and excluded").

## Tasks

### Task 1: Rewrite the guardrail/test-selection portion of the pipeline changeset

- **Goal:** Make `.changeset/plan-driven-test-selection.md` describe the model that actually ships. Its current wording describes review-1's now-removed `plan-completed`/feature-scoped-command model; rewrite the guardrail and test-selection portion to describe the fixed/scoped gate model — a guardrail gate is **fixed** (a literal command) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline by the planning phase whose agents run the gate), applying identically to the code and docs phases — while leaving the parts of this changeset that review-2 does not change intact.
- **Audience:** Consumers of the project who read release notes / the published changelog to learn what changed in this version.
- **Files to change:** `.changeset/plan-driven-test-selection.md`
- **Sections / scope:**
  - Keep the frontmatter (`@automattic/radical-pipelines`, `minor`) and the changeset's structure as a release note.
  - Replace the guardrail/test-selection sentence(s) — the "mark a guardrail as completed per pipeline by the code plan, which then supplies the feature-scoped command that completes that gate" framing — with the fixed/scoped framing: gates are fixed or scoped, a scoped gate carries a `{scope}` placeholder filled per pipeline by the plan of the phase whose agents run it, and the mechanism applies the same way to the code and docs phases.
  - Preserve the portions review-2 leaves unchanged: the up-front decision of the suite a change must pass, the explicit e2e test plan derived from the spec's acceptance criteria, behavior verification moving to the code-reviewer that re-drives the planned e2e flows, and the split of the single writer into `code-writer-tdd`/`code-writer-e2e` dispatched by task `Type`. Reword these only as needed to read coherently alongside the new guardrail framing; do not drop them and do not change their meaning.
  - Use the released-concept vocabulary the shipped skill now uses (fixed gate, scoped gate, `{scope}`, the per-pipeline fill by the planning phase). Do not reference internal artifact section names (`## Guardrail scopes`), spawn-field names (`Guardrail scopes to fill:`), or specific skill/agent file paths — a release note describes the behavior, not the skill's internals. The doc-writer should read `reference/guardrails.md` (the shipped model reference) to get the model right.
- **Depends on:** none
- **Traces to:** Spec requirement 9 (removal of the prior model; no remnants) / Acceptance criterion 7 (nothing of `plan-completed-for` remains, only the fixed/scoped model is documented) / Design "Two references, not one" and the `reference/guardrails.md` model this note must reflect
- **Acceptance:**
  - A reader of the changeset learns that a guardrail gate is fixed or scoped, that a scoped gate's `{scope}` is filled per pipeline by the planning phase whose agents run the gate, and that the mechanism applies to both the code and docs phases.
  - No `plan-completed`, "completed per pipeline by the code plan", "feature-scoped command", or "feature command" wording remains in the file.
  - The changeset still conveys the up-front test-suite decision, the spec-derived e2e test plan, the code-reviewer re-driving the e2e flows, and the `code-writer-tdd`/`code-writer-e2e` split — none dropped or altered in meaning.
  - The release note describes behavior only: it names no skill/agent file paths, no internal section headings, and no spawn-field names; the frontmatter is unchanged.

## Surfaces considered and excluded

- **`README.md` (Configuration, line ~147)** — describes the `Guardrails` convention as "deterministic verification gates (exact commands judged pass/fail by exit code)" and defers authoring detail to `load.md`/`setup.md`. This stays accurate under the fixed/scoped model (gates are still exact commands judged by exit code) and never referenced the prior `plan-completed-for` mechanism; the fixed/scoped distinction is an internal authoring/lifecycle detail the README intentionally defers. Spec/design do not ask to surface it here. No change needed.
- **`CHANGELOG.md`** — a generated release record of already-shipped versions; the existing Guardrails entry (`#118`) describes what shipped then and is not hand-edited for unreleased work. Changesets regenerates it at release time from the changeset above. Not a surface.
- **`.changeset/agent-scoped-guardrails.md`** — describes an orthogonal, separately-tracked change (a gate naming the agents that run it), which remains true under the fixed/scoped model; review-2 does not touch agent-naming-on-gates. Not a review-2 surface.
- **`website/`** — contains no guardrails, gate, or `{scope}` content. Not a surface.
- **`CONTRIBUTING.md`, `.changeset/README.md`** — no guardrails content. Not a surface.
- **The skill and agent files themselves** — these are the implementation, planned and edited in `code-plan.md` (Tasks 1–15); this plan documents the change, not re-implements it.
