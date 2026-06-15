# Spec Review — Iteration 1

## Verdict: approved

## Summary

The spec is a faithful, complete synthesis of the intent and the research record. It resolves every open direction the intent posed — the single agents dimension replacing phase+level (R1/R3), the unset-means-every-agent default (R4), the deletion of `phase` with no compatibility sugar (R1), and the writer-type/reviewer-type archetype rule the intent explicitly asked for (R6) — and it adopts the research record's hardest-won findings: the six-file blast radius that reverses the base spec's docs-agent confinement (R7/AC13), the bare-gate code-to-docs leak surfaced as a real behavior change with setup-guidance mitigation (R4/R8), the unknown-name-as-forward-declaration framing (R5), and the pending-changeset reconciliation obligation (R9). Every requirement is covered by a testable acceptance criterion, and I independently verified the spec's claims about the current tree.

## Verification against the tree

- **Six-file blast radius (AC13) is exact.** An exhaustive grep over the repository (excluding `.pipelines/`) for guardrail mentions and phase/level scoping vocabulary surfaces exactly the spec's six files — `skills/radical-pipelines/reference/conventions/load.md`, `skills/radical-pipelines/reference/conventions/setup.md`, and the four `agents/{code,doc}-{writer,reviewer}.md` — plus three files the spec already disposes of: `.changeset/role-scoped-guardrails.md` (R9, reworded in place), `README.md` (out of scope, named for the doc-plan), and `CHANGELOG.md` (out of scope, immutable). One apparent extra match, `agents/code-plan-writer.md`, is a false positive ("task-level checks" and agent-name mentions, no scoping vocabulary). Nothing is missing from the claim.
- **Grounding is accurate.** `load.md:26,30` carries the phase+level definition and two-stage selection rule the spec deletes; `setup.md:183-184,188-192` carries the Phase/Level capture and the `Name | Command | Phase | Level` example table R8 reshapes; `code-writer.md:13,44-55` and `code-reviewer.md:18,37-45,110-113` carry the level-keyed selections R7 re-keys; `doc-writer.md:38-48` selects by "docs-phase guardrails" (the wording R7 re-keys); `doc-reviewer.md:33` holds guardrails as a mid-step-2 bullet before the step-3 accuracy spot-check, with a Checks table whose Result vocabulary is unspecified and no fail-fast/skipped/stateless language — exactly the gap R7's reviewer-archetype restructure fills.
- **No-migration claim holds.** This repo's `.rp.md` contains no Guardrails section; the only guardrail declarations in the tree are setup.md's illustrative examples, so deleting `phase` and `level` without compatibility sugar strands nothing.
- **Pending changeset claim holds.** `.changeset/role-scoped-guardrails.md` is unreleased and describes the superseded `level` feature verbatim; R9's reword-in-place (no stacking) is the correct disposition and follows the 95-review precedent recorded in the research.
- **R4 is honest about the semantic shift.** It names the bare-gate docs-phase leak as a real behavior change from the base (where phase bounded a level-less gate to the code roles) rather than dressing it as a rename, and ties the mitigation to R8's owner-facing default surfacing. AC4 and AC11 make both halves testable.
- **R5 introduces no validation path.** Verified that no schema/enum enforcement exists on the current phase/level vocabulary, so inert unknown names fall out of the membership test with nothing to add or remove, as the requirement states.

## Coverage and consistency

- Requirements ↔ criteria: R1↔AC1, R2↔AC2, R3↔AC3, R4↔AC4, R5↔AC5, R6↔AC6, R7↔AC7+AC8+AC9+AC10, R8↔AC11, R9↔AC12, blast radius↔AC13. No requirement lacks a criterion; no criterion asserts something no requirement establishes.
- Research decisions 1–9 map onto R1–R9 plus Out of Scope with no drops or weakenings; the analyst's in-scope ruling on the doc-reviewer generalization (decision 6) is carried in full, including the absent-vs-skipped Checks distinction.
- Internal consistency holds: R3's selection rule, R4's default, and R5's inert no-match are all corollaries of one membership test; R6's archetype definitions match the obligations R7 distributes to the four agent files; R8's surfaced default restates R4's rule rather than a variant of it.
- Scope boundaries are right: serialization stays a design-phase decision (consistent with the base spec), assisted mode's carve-out is verified (no guardrail surface, runs end at phase 3), and `README.md:147` is correctly classed as a docs-phase touchpoint rather than a requirement.

## Notes (non-blocking)

- AC12 verifies that the spec names the changeset obligation rather than the reconciled end state; the substantive obligation lives in R9 and must flow through the doc-plan. Acceptable as written since the changeset text is explicitly the docs phase's deliverable.
- R2's load-bearing enumeration of the gate-running set means adding a future gate-running agent edits the definition — the spec states this drift cost explicitly, which is the right trade against an anchorless intensional definition.
