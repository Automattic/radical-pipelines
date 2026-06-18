# Restructure guardrails as scoped gates with centralized documentation

## Origin

This review comes from the owner's review of the plan-completed guardrails work delivered in `review-1` (PR #127, https://github.com/Automattic/radical-pipelines/pull/127). Two problems surfaced:

- Guardrail information is scattered across setup, the workflow, the plan phase, and the agent files, with no single place that explains it — unlike `pipeline-versioning.md`.
- The `plan-completed-for` model bundles a full command and a per-agent subset that runs a separately-authored feature command into one gate; it is hard to understand.

The owner's direction: replace it with self-contained **scoped guardrails** and centralize the documentation.

## Goal

Guardrail knowledge lives in one place, and per-pipeline command scoping is expressed as self-contained gates that read clearly and apply the same way across the code and docs phases.

## Constraints

- Stay within the existing pipeline shape — no new phases, and no speculative flexibility for phases that don't run guardrails today.

## Context

Builds on `review-1-plan-completed-guardrails` in this pipeline; this run supersedes that run's `plan-completed-for` model.

## Assumptions / directions to explore

- A gate is either **fixed** (a literal command) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline).
- A scoped gate is filled by the planning agent of the runner's phase — derived from who runs it, not a separate field.
- The owner supplies setup-time fill-guidance per scoped gate, describing what `{scope}` should be.
- Guardrail logic is centralized in a dedicated reference; orchestrator→agent convention-passing is documented separately.
- The mechanism applies symmetrically to the code and docs phases.
