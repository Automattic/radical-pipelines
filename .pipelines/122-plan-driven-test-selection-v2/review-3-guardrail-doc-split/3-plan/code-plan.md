# Code Plan: Guardrail documentation split

## Overview

This is a documentation-architecture re-baseline: the owner already refactored the guardrail documentation on the branch, so the shipped skill already matches the target split — `guardrails.md` is the guardrail model, `passing.md` is how guardrails reach agents, validation lives in `setup.md` and the plan-reviewers, and `AGENTS.md` carries agent self-containment. The design therefore requires only two genuine skill edits, both in the guardrails reading path, plus one verification task that confirms the shipped state actually matches the architecture the design claims (the re-baseline's load-bearing premise). The unit of work is prose edits to skill files, so there is no production code and no e2e surface; every task is a `tdd` task whose acceptance is the observable content of the edited file or the observable result of a tree sweep. The "Supersedes review-2" content lives in this run's review-3 design doc, not the skill, and documentation (changeset, README) is planned separately as the doc plan — neither is in scope here. Task 1 fixes the lone `docs-plan.md` typo in `guardrails.md`; Task 2 upgrades `passing.md`'s `Guardrails:` bullet from a passive field-content definition into an active resolve instruction; Task 3 verifies the rest of the architecture is already in place and untouched. The two edits are independent of each other; Task 3 depends on both.

## Guardrail scopes

<!-- One row per scoped gate this phase's agents run, gate → scope value, per the model in reference/guardrails.md. "None" when this phase runs no scoped gate. This project's own .rp.md defines no guardrails, so there are no scoped gates for this pipeline. -->

None

## E2E test plan

<!-- This pipeline edits skill Markdown only; there is no runnable feature surface and no e2e suite, so there are no e2e flows. Every task is a tdd task whose acceptance is the observable content of the edited file or the observable result of a tree sweep. -->

None

## Guardrail scopes to fill

<!-- This project defines no guardrails, so no scoped gates were passed for this phase to fill. -->

None

## Tasks

### Task 1: Fix the `docs-plan.md` artifact-name typo in `guardrails.md`

- **Goal:** Correct the lone `docs-plan.md` (plural) typo in the guardrails reference to `doc-plan.md` (singular), matching every other plan-artifact reference across the skill.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/guardrails.md`
- **Changes:** In `## The fill lifecycle` (the last sentence, ~line 32), change the artifact name `docs-plan.md` to `doc-plan.md` so the sentence reads "…in its `## Guardrail scopes` section of either `code-plan.md` and/or `doc-plan.md`." This is the only `docs-plan.md` occurrence in the skill; every other reference already uses `doc-plan.md`. Change nothing else in the file — gate kinds, the `.rp.md` per-gate block, and the rest of the fill lifecycle stay exactly as shipped, and the reference still references nothing back (it remains a sink).
- **Depends on:** none
- **Traces to:** Spec requirement 8 / Acceptance criterion 8 / Design "Decision: `doc-plan.md` artifact-name correctness", component "`guardrails.md` — the model only"
- **Acceptance:**
  - A tree-wide search for `docs-plan.md` across `skills/` and `agents/` finds zero matches.
  - `guardrails.md`'s fill-lifecycle sentence names the plan artifact `doc-plan.md` (singular).
  - The rest of `guardrails.md` is byte-for-byte unchanged: gate kinds (fixed/scoped), the `.rp.md` per-gate block, and the fill-lifecycle prose are as shipped, and the file still references no other reference file.

### Task 2: Upgrade `passing.md`'s `Guardrails:` bullet into an active resolve instruction

- **Goal:** Turn `passing.md`'s `Guardrails:` field from a passive field-content *definition* into an active resolve *instruction* the orchestrator follows at spawn, closing the fill → record → resolve → run lifecycle's one silent gap (resolve), with resolve documented in exactly one home and behavior unchanged.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/passing.md`
- **Changes:** Rewrite the `**Guardrails:**` bullet (currently line 10) so it is one imperative directing the orchestrator, when preparing this field for a running agent, to place the gates naming that agent; and for a scoped gate, to read the chosen scope value from the plan's `## Guardrail scopes` section, substitute it into the gate's `{scope}` command template, and place the resolved command in the field (a fixed gate's command passes literally — no read or substitution). The bullet folds in the resolved-command definition (the command after `{scope}` substitution) rather than stating it separately, guards the read/substitute step to scoped gates only, and keeps the trailing deference to `reference/guardrails.md` for the model. Leave the bullet's `Agents:` line (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`) and `Omit when not defined or when agent doesn't have any gates.` rule unchanged. Touch no other field — the `## Conventions` preamble, **Artifact folder:**, **Commit format:**, and **Guardrail scopes to fill:** bullets stay exactly as shipped — and add no resolve/substitution wording anywhere else (resolve stays in this one home; phases 4/5 inherit it through the `autonomous-workflow.md` conventions-block hook and gain no separate substitution step).
- **Depends on:** none
- **Traces to:** Spec requirements 2, 6 / Acceptance criteria 2, 6 / Design "Decision: Resolve as one active instruction on `passing.md`'s `Guardrails:` line", "Decision: `guardrails.md` = the model; `passing.md` = how guardrails reach agents", component "`passing.md` — how guardrails reach agents", invariant "Resolve in exactly one home"
- **Acceptance:**
  - The `Guardrails:` bullet is an imperative addressed to the orchestrator at spawn time (not a passive "the field carries…" description); for a scoped gate it instructs the orchestrator to read the plan's `## Guardrail scopes` value, substitute it into the gate's `{scope}` command, and place the resolved command in the field.
  - The substitution is guarded to scoped gates; a fixed gate's command is described as passing literally with no read or substitution.
  - The resolved-command definition (command after `{scope}` substitution) appears folded into this one bullet, and the bullet still references `reference/guardrails.md` for the model and restates none of the model.
  - The bullet's `Agents:` applicability line and omit rule are unchanged; the `## Conventions` preamble and the **Artifact folder:**, **Commit format:**, and **Guardrail scopes to fill:** bullets are unchanged.
  - No resolve/`{scope}`-substitution wording appears in `guardrails.md`, `4 - code.md`, `5 - docs.md`, or any other reading-path file — resolve appears only on this bullet.

### Task 3: Verify the rest of the split is already shipped and untouched

- **Goal:** Confirm the re-baseline's premise — that every concern other than the two edits above already sits in its target home in the shipped skill — and that this pipeline introduced no stray edits, so the skill matches the design's architecture at the final commit.
- **Type:** tdd
- **Files to change:** none (verification task; edit only to fix a missed remnant inside the two files of Tasks 1–2)
- **Changes:** Sweep the live skill tree (`agents/`, `skills/radical-pipelines/`, `AGENTS.md`) and confirm, by observation, the shipped state the design relies on:
  - `guardrails.md` contains only the model — gate kinds, the `.rp.md` per-gate block, the fill lifecycle — and carries no validation, no resolve/`{scope}`-substitution, and no spawn-field (`Guardrails:` / `Guardrail scopes to fill:`) content.
  - `passing.md` is the sole home of both spawn fields and the resolved-command definition, and references `guardrails.md` for the model; the reading path is one-directional (`passing.md → guardrails.md`, with `guardrails.md` referencing nothing back).
  - Validation lives where it is performed — the fixed/scoped capture-time probe in `setup.md` and the substitute-and-execute filled-command check in `code-plan-reviewer.md`, `doc-plan-reviewer.md`, and the assisted `3 - plan.md` self-checks — and not in `guardrails.md`.
  - `AGENTS.md` carries the self-containment rule ("an agent reads only its own profile and its initial prompt," referencing no skill file or `.rp.md`), and none of the five running-agent profiles (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`) references a skill file or `.rp.md` — each names "the guardrails convention" / the `Guardrails:` field it receives.
  - Phases 4/5 (`4 - code.md`, `5 - docs.md`) carry no separate resolve/substitution step.
  - The only files this pipeline changed are `guardrails.md` (Task 1) and `passing.md` (Task 2). If the sweep finds a missed remnant — a stray `docs-plan.md`, a stray resolve/substitution line outside `passing.md`'s `Guardrails:` bullet, or a skill/`.rp.md` reference in a running-agent profile — fix it inside the relevant Task 1–2 file; this task adds no third edited file.
- **Depends on:** Task 1, Task 2
- **Traces to:** Spec requirements 1, 2, 3, 4, 5 / Acceptance criteria 1, 2, 3, 4, 5 / Design invariants "Single reading path", "No duplication on the path", "Resolve in exactly one home", components "`guardrails.md` — the model only", "Validation homes — `setup.md` and the plan phase", "`AGENTS.md` — agent self-containment"
- **Acceptance:**
  - `guardrails.md` contains the model only — no validation, resolve/`{scope}`-substitution, or spawn-field content — and references nothing back.
  - `passing.md` holds both spawn fields and the resolved-command definition and references `guardrails.md`; the model appears only in `guardrails.md` and the spawn fields and resolved-command definition only in `passing.md`.
  - Validation is observable in `setup.md` and the plan-reviewers / assisted `3 - plan.md`, and absent from `guardrails.md`.
  - `AGENTS.md` states an agent reads only its own profile and its initial prompt; a search of the five running-agent profiles finds no skill-file or `.rp.md` reference.
  - `4 - code.md` and `5 - docs.md` contain no resolve/substitution step.
  - `git diff` for this pipeline touches only `guardrails.md` and `passing.md`; no third file changed.
