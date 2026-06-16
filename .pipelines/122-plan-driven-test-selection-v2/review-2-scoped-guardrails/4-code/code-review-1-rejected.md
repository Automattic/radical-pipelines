# Code Review — review-2 "Scoped guardrails" — Rejected (iteration 1)

**Verdict:** Rejected
**Affected tasks:** 2, 3, 4
**Reviewed range:** `433578b..HEAD`

## Summary

The fixed/scoped model is documented well and consistently: `guardrails.md` and `passing.md` are clean single homes, the old `plan-completed-for` / `## Plan-completed guardrails` / `Guardrails to complete:` model is gone from the entire live tree (zero matches across `agents/` and `skills/radical-pipelines/`), the docs phase mirrors the code phase (Tasks 10–12 mirror 7–9; step renumbering in `doc-plan-reviewer.md` is correct), the five running agents are untouched, the change is exactly the fourteen intended files, and no migration/back-compat text was added. Tasks 1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 meet their acceptance.

One cross-file inconsistency the batch introduced requires a fix.

## Issue 1 — Bare `guardrails.md` pointer from `conventions/` files breaks the directory's established cross-reference convention (Tasks 2, 3, 4)

Three `conventions/` files point at the parent-directory file `reference/guardrails.md` using a **bare** filename:

- `skills/radical-pipelines/reference/conventions/passing.md:14` — `See \`guardrails.md\` for the guardrail model.`
- `skills/radical-pipelines/reference/conventions/setup.md:179` — `...the per-gate block defined in \`guardrails.md\` (consult it for the block shape and the model):`
- `skills/radical-pipelines/reference/conventions/load.md:38` — `...resolved by the orchestrator before spawn (model in \`guardrails.md\`).`

`guardrails.md` lives in `reference/`, not in `reference/conventions/`. Read literally from within `conventions/`, a bare `guardrails.md` points at a nonexistent `conventions/guardrails.md`.

The skill's established convention for a `conventions/` file referencing a parent-`reference/` file is to **prefix with `reference/`** — the only pre-existing precedent for this direction does exactly that, twice:

- `skills/radical-pipelines/reference/conventions/claude-code.md:39` — `...the template from \`reference/health-monitoring.md\`.`
- `skills/radical-pipelines/reference/conventions/pi.md:36` — `...the template from \`reference/health-monitoring.md\`.`

The reverse link is already written correctly in this batch — `guardrails.md:50` points at `conventions/passing.md` (the prefixed parent→child form) — which makes the three bare back-references the odd ones out. This is the kind of stale/inconsistent pointer a multi-writer batch introduces: the same conceptual link (`conventions/` file → a `reference/`-root file) is written one way by the existing skill and a different, non-resolving way here.

(Note: bare parent references such as `pipeline-versioning.md` are used in the `*-phases/` directories — so `guardrails.md` referenced bare from `4 - code.md` / `5 - docs.md` / assisted `3 - plan.md` is consistent with *that* directory's precedent and is fine. The defect is specific to the `conventions/` directory, whose own precedent is the `reference/`-prefixed form.)

**Fix:** In the three `conventions/` references above, change `guardrails.md` to `reference/guardrails.md`, matching `claude-code.md` / `pi.md`.

## What is correct (no action needed)

- `guardrails.md` (Task 1): gate kinds, fill lifecycle, validation (setup probe + plan-phase), resolve-and-run, spawn fields, and the per-gate block all stated once; placeholder-marks-scoped and no-fixed-companion stated; identical-across-phases stated.
- `passing.md` (Task 2): `## Conventions` block with the four exactly-labeled fields, the Agent-models-at-spawn and self-commit notes, Guardrails-resolved-after-substitution, omit-when-empty, and the `guardrails.md` deferral (apart from the path form in Issue 1).
- `setup.md` (Task 3): per-gate block capture deferring to `guardrails.md`, scoped-iff-`{scope}`, `fill-guidance` for scoped gates only, fixed vs scoped validation, side-effects rule extended to a realistic scope; old `plan-completed-for` capture item and its "when to reach for this" reminder removed.
- `load.md` (Task 4): committed-only invariant preserved; scope value is plan data, template in `.rp.md`; no per-agent-subset wording; no new section/row.
- `autonomous-workflow.md` (Task 5), autonomous `3 - plan.md` (Task 6), `4 - code.md` (Task 8), `5 - docs.md` (Task 12): defer to `passing.md`, pass `Guardrail scopes to fill:` to both pairs, resolve-before-spawn from `## Guardrail scopes` for writers and reviewers in both phases; old wording gone.
- `code-plan-writer.md` (Task 7) / `code-plan-reviewer.md` (Task 9) and `doc-plan-writer.md` (Task 10) / `doc-plan-reviewer.md` (Task 11): read `Guardrail scopes to fill:`, author/validate `## Guardrail scopes` (`Gate | Scope`), coverage + bind checks, value-not-command rule; docs mirror code; reviewer step renumbering correct.
- Assisted `3 - plan.md` (Task 13): constraint, both synthesis skeletons, both coverage self-checks retargeted; no spawn field invented; single-driver framing.
- `SKILL.md` (Task 14): loading → `load.md`, passing → `passing.md`.
- Scope discipline (Task 15): zero old-model tokens tree-wide; running agents untouched; exactly fourteen files; no back-compat text.
