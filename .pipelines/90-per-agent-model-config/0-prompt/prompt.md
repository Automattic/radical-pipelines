# Prompt

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

## Goal

A project using Radical Pipelines should be able to decide which model each agent runs on — and tune model settings such as reasoning `effort` — and have those choices persist across all pipeline runs, without baking any of it into the agent profile files. Projects that don't configure anything keep today's behavior (agents inherit the runtime/session model and its default settings).

## Constraints

- The agent profile files must stay generic/model-agnostic — model and settings choices must not live in them.
- The mechanism must be optional — a project that sets nothing is unaffected.

## Context

- Today the pipeline is model-agnostic at the orchestration layer: agent profiles in `agents/` declare only `name`/`description` (no `model:` field), and there's no per-phase/per-agent model config. Models are only swapped during failure recovery (e.g. Pi login/API-key errors).
- This came out of a discussion about whether a model can be chosen per agent: it *can* be overridden at spawn time, but that choice doesn't persist — there's no declarative place to record it.

## Assumptions / directions to explore (open)

These are the owner's current hypotheses, not settled requirements. Validate them through research and decide what the requirements actually are.

- Add it as a project convention (alongside the others in `.rp.md`) plus a configuration that maps agents — and possibly phases — to a model and/or model settings (e.g. `effort`, and whatever else the runtime supports), which the orchestrator reads and applies when spawning each agent.
