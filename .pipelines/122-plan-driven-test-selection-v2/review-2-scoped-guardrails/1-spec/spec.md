# Spec: Scoped guardrails

## Overview

Restructure the guardrails feature of Radical Pipelines so its knowledge lives in one place and per-pipeline command scoping is expressed as self-contained gates. A gate is either **fixed** (a literal command) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline). This replaces review-1's `plan-completed-for` model — a single gate that bundled a full command with a per-agent subset running a separately-authored command — which was scattered across the skill and hard to understand. The mechanism applies the same way to the code and docs phases.

## Requirements

1. **Centralized documentation.** A single dedicated reference explains the guardrail model end-to-end: the gate kinds, the per-pipeline fill lifecycle, and how guardrails reach agents. The orchestrator→agent convention-passing (the spawn-time conventions an agent receives) is documented in its own reference. Other files — setup, the workflow, the plan and code/docs phases — defer to these references instead of restating them.

2. **Two gate kinds.** A guardrail gate is either **fixed** (a literal command run as-is) or **scoped** (a command containing a `{scope}` placeholder filled per pipeline). The placeholder's presence is what marks a gate as scoped.

3. **Scoped gates are independent.** A project may define a scoped gate with no fixed full-scope companion. Fixed and scoped gates are ordinary gates a project composes freely; neither requires the other.

4. **Derived filler.** A scoped gate's `{scope}` is filled per pipeline by the planning agent of the phase whose agents run the gate — code-run gates by the code plan, doc-run gates by the doc plan. The filler is determined by who runs the gate; it is not a separately configured field.

5. **Per-phase filling for spanning gates.** A scoped gate whose agents span both phases is filled by each phase's plan independently — each fills `{scope}` for its own agents — so the gate may carry a different scope value per phase.

6. **Validation lifecycle.** A fixed gate is validated by running it at setup (the existing "did it execute?" check). A scoped gate is validated in two places: at setup its runner is probed (with an empty or placeholder scope) to confirm it resolves, and at the plan phase its filled command is validated to execute.

7. **Optional fill-guidance.** A scoped gate may carry an optional owner-authored note, captured at setup, telling the planning agent how to choose `{scope}`. When absent, the planning agent chooses `{scope}` from the spec and design.

8. **Symmetry across phases.** The full mechanism — capture, fill, validate, resolve, run — applies identically to the code and docs phases. A scoped gate run by docs-phase agents behaves exactly as one run by code-phase agents, with the doc plan as its filler.

9. **Removal of the prior model.** The `plan-completed-for` mark, the per-agent subset, and the `## Plan-completed guardrails` plan section are removed. The skill describes only the fixed/scoped model, with no remnants of the prior one.

## Out of Scope

- The agent-side run protocol — how an agent runs the gates in its `Guardrails:` field — is unchanged.
- This project's own `.rp.md` (it defines no guardrails); nothing to migrate.
- The CI matrix and PR-time verification, which stay outside Radical Pipelines.
- New phases, or guardrails for phases that do not run them today.
- Structural tests over skill or agent prose.

## Acceptance Criteria

1. **Given** a reader wanting to understand guardrails, **when** they open the dedicated guardrails reference, **then** it explains the gate kinds, the fill lifecycle (setup → plan → resolve → run), and how guardrails reach agents, without their needing to read setup, the workflow, or the agent files.

2. **Given** a project defining a scoped gate with no fixed companion, **when** setup captures it, **then** the gate is accepted and its runner is probed with an empty or placeholder scope.

3. **Given** a scoped gate whose agents are all in one phase, **when** that phase's plan runs, **then** the plan fills `{scope}` and the plan review validates the filled command executes.

4. **Given** a scoped gate whose agents span both phases, **when** each phase's plan runs, **then** each plan fills `{scope}` for its own agents independently.

5. **Given** a scoped gate with no fill-guidance, **when** the planning agent fills `{scope}`, **then** it derives the value from the spec and design.

6. **Given** a docs-phase scoped gate, **when** the docs phase runs, **then** it is filled by the doc plan and resolved and run exactly as a code-phase scoped gate.

7. **Given** the shipped skill, **when** it is searched for `plan-completed-for` or `## Plan-completed guardrails`, **then** nothing remains and only the fixed/scoped model is documented.
