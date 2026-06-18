# Spec: Guardrail documentation split

## Overview

Re-baseline the guardrail documentation so each concern has one clear home. Review-2 shipped a "comprehensive single `guardrails.md`" that explained the model, validation, resolve-and-run, the spawn fields, and how guardrails reach agents. While reviewing that work, the owner refactored the documentation directly on the branch, splitting those concerns across the files that own them. This run makes the pipeline's spec and design describe that shipped split and removes the review-2 statements that now contradict it.

Behavior is unchanged. The fixed/scoped gate mechanism and the agent-side run protocol stay exactly as shipped; this is a documentation-architecture change only. The owner's shipped wording is the baseline — this run refines and documents it, never reverts it.

The shipped split is:

- **`guardrails.md`** — the guardrail model only: gate kinds (fixed/scoped), the per-gate `.rp.md` block, the fill lifecycle.
- **`reference/conventions/passing.md`** — how guardrails reach agents: the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the definition of a scoped gate's resolved command (the command after `{scope}` substitution). It references `guardrails.md` for the model.
- **Validation** — documented where it is performed: the setup probe in `setup.md`, the plan-phase check in the plan-reviewers / phase 3.
- **`AGENTS.md`** — a rule that agent profiles are self-contained.

## Requirements

1. **`guardrails.md` is the model only.** The dedicated guardrails reference explains the guardrail model: the gate kinds (fixed/scoped), the per-gate `.rp.md` block, and the fill lifecycle (who fills `{scope}`, per-phase filling for spanning gates, the plan recording the chosen scope value). It does not document validation, resolve-and-run / `{scope}` substitution, or the spawn fields.

2. **`passing.md` is the single home for how guardrails reach agents.** It owns the `## Conventions` spawn fields `Guardrails:` and `Guardrail scopes to fill:`, and the definition of a scoped gate's resolved command (the command after `{scope}` substitution). It references `guardrails.md` for the model.

3. **Validation is documented where it is performed,** not in `guardrails.md`: the setup probe in `setup.md` (validate a fixed gate by running its literal command; validate a scoped gate by substituting a realistic, made-up `{scope}` into its command and running that) and the plan-phase check in the plan-reviewers / phase 3.

4. **Single reading path, no duplication.** `passing.md → guardrails.md` is the only reference direction; `guardrails.md` references nothing back. The model lives only in `guardrails.md`; the spawn fields and the resolved-command definition live only in `passing.md`. Files outside this path (setup, the workflow, the plan and code/docs phases) defer to these references rather than restating them.

5. **Agent profiles are self-contained.** The `AGENTS.md` rule states that an agent reads only its own profile and its initial prompt — no agent profile references a skill file or `.rp.md`. No agent profile contains such a reference. The running agents' "Run the guardrails" step operates purely on the `Guardrails:` field the agent receives.

6. **Resolve is documented as an active orchestrator instruction.** The fill → record → resolve → run lifecycle is documented end-to-end with no silent gap. Today fill is an explicit instruction (the plan-writer profiles) and run is explicit (the running-agent profiles), but resolve exists only as the field-content description in `passing.md` — no line instructs the orchestrator to read the plan's `## Guardrail scopes` value, substitute it into the gate's `{scope}` command template, and place the result in the running agent's `Guardrails:` field. `passing.md`'s `Guardrails:` line becomes an active instruction that performs this substitution. This documents an obligation the orchestrator already had (it had to produce that resolved field content); it changes no behavior. Resolve is documented in exactly one home (`passing.md`), with no duplication on the reading path.

7. **No spec or design statement contradicts the shipped skill.** The pipeline's spec and design reframe the review-2 statements below so they describe the shipped split, never reverting it:
   - Review-2 Requirement 1 (`spec.md:9`) — drop "and how guardrails reach agents" from what the single guardrails reference covers; that concern belongs to `passing.md`.
   - Review-2 Acceptance Criterion 1 (`spec.md:37`) — reframe so the guardrails reference is checked for the **model** (gate kinds + fill lifecycle as shipped); "how guardrails reach agents" is checked against `passing.md`, and validation against `setup.md` and the plan-reviewers. Remove the "without their needing to read setup, the workflow, or the agent files" claim.
   - Review-2 design `guardrails.md` component (`design-doc.md:18`) — remove "the spawn fields" from `guardrails.md`'s scope.
   - Review-2 design Decision "Two references, not one" (`design-doc.md:61-66`) — reframe to the shipped split: `guardrails.md` = the model; `passing.md` = how guardrails reach agents (spawn fields + resolved-command definition).
   - Review-2 design Flow line (`design-doc.md:57`) — align with Requirement 6 (resolve documented in `passing.md` as an active instruction, not as a phase-4/5 step).

   Not reframed: review-2 Requirement 1's second sentence (convention-passing in its own reference) and the existence of `passing.md` — those became the whole design.

8. **Artifact-name correctness.** `guardrails.md` names the doc-plan artifact `doc-plan.md` (singular), matching every other reference across the skill — correcting the lone `docs-plan.md` typo in the slimmed file.

## Out of Scope

- **Behavior.** The fixed/scoped gate mechanism and the agent-side run protocol stay exactly as shipped. Requirement 6 only makes the existing resolve obligation explicit in documentation; it changes no behavior.
- **Reverting the owner's edits.** The shipped wording is the baseline; this run refines and documents it, never rolls it back.
- **The fixed/scoped model itself** — capture, fill semantics, per-phase filling, and symmetry across phases — all unchanged from review-2 and not reopened here.
- **Structural tests over skill or agent prose** (the project rule forbids them).

## Acceptance Criteria

1. **Given** a reader wanting the guardrail model, **when** they open `guardrails.md`, **then** it explains the gate kinds, the per-gate `.rp.md` block, and the fill lifecycle, and contains no validation, resolve-and-run / `{scope}`-substitution, or spawn-field content.

2. **Given** a reader wanting to know how guardrails reach agents, **when** they open `passing.md`, **then** it documents the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the resolved-command definition, and references `guardrails.md` for the model.

3. **Given** the reading path, **when** it is traced, **then** `passing.md` references `guardrails.md` and `guardrails.md` references nothing back; the model appears only in `guardrails.md` and the spawn fields and resolved-command definition appear only in `passing.md`.

4. **Given** a reader wanting to know how a guardrail is validated, **when** they look for it, **then** it is documented in `setup.md` (the fixed/scoped probe) and the plan-reviewers / phase 3, not in `guardrails.md`.

5. **Given** any agent profile, **when** it is searched for a skill-file or `.rp.md` reference, **then** none is found, and the `AGENTS.md` self-containment rule states an agent reads only its own profile and its initial prompt.

6. **Given** the orchestrator at spawn time, **when** it prepares a running agent's `Guardrails:` field for a scoped gate, **then** `passing.md` actively instructs it to read the plan's `## Guardrail scopes` value, substitute it into the gate's `{scope}` command, and place the resolved command in the field — closing the fill → record → resolve → run lifecycle with no silent gap and documenting resolve in `passing.md` only.

7. **Given** the pipeline's review-2 spec and design, **when** they are read after this run, **then** no statement claims `guardrails.md` covers how guardrails reach agents, the spawn fields, validation, or resolve-and-run, and no statement places a `{scope}`-substitution step in phases 4/5; review-2 Requirement 1's second sentence and the existence of `passing.md` remain intact.

8. **Given** the shipped skill, **when** it is searched for `docs-plan.md`, **then** the guardrails reference uses `doc-plan.md` (singular), matching the rest of the skill.
