# Spec Research: Scoped guardrails

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

## Q&A

### Q1: Can a scoped gate stand alone?

In the new model, can a **scoped** gate exist on its own — a project defines a gate whose command is scoped (run by, say, the writers) with no fixed full-scope companion gate at all — or must every scoped gate be paired with a fixed gate that some agent runs at full scope?

**A:** Independent. Fixed and scoped gates are just two ordinary gates a project may or may not both define; a scoped gate needs no full-scope companion.

### Q2: Can one gate span both phases?

A gate's `agents` may name agents from both the code phase (writers, reviewer) and the docs phase (writer, reviewer) — e.g. a single `lint` gate run by code and doc agents alike. If such a gate is **scoped**, each phase's plan fills `{scope}` for its own agents, so the one gate could carry a different scope value in the code phase vs the docs phase. Decision: allow per-phase filling of a spanning gate, or require a scoped gate's agents to live in one phase (one filler, one scope value).

**A:** Allow per-phase filling. A scoped gate may span phases; each phase's plan fills `{scope}` for its own agents, so the gate may carry a different scope value per phase.

### Q3: Where is a scoped gate's command validated to run?

A scoped command carries a `{scope}` hole, so setup cannot execute it the way it validates fixed gates today. Decision: validate only at the plan phase once filled (the plan-reviewer runs the filled command and asks "did it execute?"; setup records the scoped gate — name, command-with-hole, agents, fill-guidance — without running it), or also probe at setup (e.g. with an empty/placeholder scope) to confirm the runner resolves.

**A:** Both. At setup the runner is probed (with an empty/placeholder scope) to confirm it resolves; at the plan phase the filled command is validated to execute.

### Q4: Is fill-guidance required for every scoped gate?

`fill-guidance` is the owner's setup-time note telling the planning agent how to choose `{scope}` (e.g. "scope to the feature this issue targets"). Decision: required for every scoped gate (a scoped gate without it is invalid at setup), or optional (the planning agent may choose `{scope}` from the spec and design alone).

**A:** Optional. A scoped gate may omit `fill-guidance`; the planner then chooses `{scope}` from the spec and design alone.

## Research

## Out of Scope

- The agent-side run protocol — how an agent runs the gates in its `Guardrails:` field — is unchanged.
- This project's own `.rp.md` (it defines no guardrails); nothing to migrate.
- The CI matrix / PR-time verification stays outside Radical Pipelines.
- New phases, or guardrails for phases that don't run them today (no speculative flexibility).
- Structural tests over skill or agent prose (forbidden by AGENTS.md).

## Consolidated Requirements

1. Consolidate guardrail documentation into a dedicated reference; document orchestrator→agent convention-passing separately. Other files defer to them.
2. A gate is fixed (literal command) or scoped (command carries a `{scope}` placeholder); the placeholder marks it scoped.
3. Scoped gates are independent — no mandatory fixed companion.
4. A scoped gate's `{scope}` is filled by the planning agent of the runner's phase (derived from who runs it, not configured).
5. A scoped gate spanning both phases is filled per phase, so it may carry a different scope value per phase.
6. Validation: fixed gates run at setup; scoped gates are probed at setup (runner resolves) and their filled command is validated at the plan phase.
7. `fill-guidance` is optional owner setup-time guidance; absent, the planner uses the spec and design.
8. The mechanism is symmetric across the code and docs phases.
9. Remove the `plan-completed-for` model entirely (mark, subset, and `## Plan-completed guardrails` section).
