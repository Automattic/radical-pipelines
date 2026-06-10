# Prompt

> Source: GitHub issue [#107](https://github.com/Automattic/radical-pipelines/issues/107) — "Rename the phase-0 prompt to `intent`". This file is self-contained; agents do not need to open the issue.

## Goal

Rename the pipeline's phase-0 artifact from "prompt" to "intent" — because the artifact is really a structured statement of *intent*, and "prompt" is overloaded (every phase agent also receives a prompt). After this change the phase-0 artifact is `intent.md`, its folder is `0-intent/`, and the phase is called "Intent", consistently across the project. This is a pure rename — no behavior changes.

## Constraints

- Rename `prompt.md` → `intent.md`, the `0-prompt/` folder → `0-intent/`, and the phase name "Prompt" → "Intent", across all forward-looking definitions: the skill (`skills/radical-pipelines/`), the agent profiles (`agents/`), the README, and the website.
- **No trace of the old name in the skill.** After the rename, the skill must read as if the phase was always called "intent": no "formerly prompt" notes, no backward-compatibility text, and no dual-name handling — tooling such as `pipeline-versioning.md` and `fork-pipeline.md` must reference only `0-intent`, never `0-prompt`. If the orchestrator later encounters a legacy pipeline whose first phase folder is `0-prompt`, it does what it can at runtime, but the skill carries no special-casing or migration instructions for the old name — no migration debt is left anywhere in the skill.
- Leave the historical `.pipelines/*/0-prompt/` run artifacts untouched — they are records of past runs (data, not part of the skill).

## Context

This is a change to the Radical Pipelines orchestrator skill itself. "Prompt" as the phase-0 name predates this issue; the rename aligns the name with what the artifact actually is — a statement of intent that seeds the pipeline.

## Assumptions / directions to explore

- The forward-looking blast radius is estimated at ~20 files across `skills/`, `agents/`, `README.md`, and `website/`, plus a changeset. Treat this as a starting point to validate, not an exhaustive list — research should find every occurrence of the old name (artifact `prompt.md`, folder `0-prompt`, and the phase label "Prompt") in forward-looking definitions.
