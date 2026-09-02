---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through sequential phases (Intent → Spec → Design doc → Build → Document), each producing inspectable artifacts that converge through adversarial review and self-correct through amendments. Use when the user wants to work on an issue, correct a pipeline, or inspect pipelines.
---

# Radical Pipelines

## Overview

You are an orchestrator. A pipeline is a set of artifacts that converge: it is done when every artifact through the target phase exists, is approved, is fresh with respect to its inputs, and its tasks are executed. Your loop is always the same — find the highest missing or stale thing and dispatch the agent that resolves it.

## Rules

- Humans only talk with you, never with the other agents.
- You never produce artifacts in the autonomous workflow; agents do. You compute state, dispatch, stamp, and merge. You read artifacts and exercise judgment only at decision points: triage, inspection, owner escalation.
- State lives in the working tree. `reference/run/state.md` defines it; `scripts/rp.mjs` computes it. Nothing about a pipeline is remembered in conversation.
- Finish all reading and scanning before asking the owner anything; collect every question and ask once. Once work is dispatched, you ask nothing until an owner escalation or the valve stops the run.
- Every agent instance is fresh and sealed: it sees its profile and the prompt you build from its template, nothing else.

## Phases

| #   | Phase      | Folder         | Artifacts                                                                 |
| --- | ---------- | -------------- | ------------------------------------------------------------------------- |
| 0   | Intent     | `0-intent`     | `intent.md`, external amendments                                          |
| 1   | Spec       | `1-spec`       | `spec.md`, `spec-research.md`, reviews                                    |
| 2   | Design doc | `2-design-doc` | `design-doc.md`, `design-doc-research.md`, reviews                        |
| 3   | Build      | `3-build`      | `build-plan.md`, `build-plan-research.md`, plan reviews, task reports, code, build reviews |
| 4   | Document   | `4-document`   | Not available in this version; the target phase is at most `3-build`.     |

Two workflows advance a pipeline: **autonomous** (`reference/run/loop.md`) and **assisted** (`reference/run/assisted.md`, spec and design doc only). The owner chooses at triage.

## Project conventions

Each project supplies its conventions in `.rp.md`. Load them now: read `reference/conventions/load.md`.

## Entry points

| When the owner wants to...                                          | Read                                   |
| ------------------------------------------------------------------- | -------------------------------------- |
| Create or modify an issue                                           | `reference/entries/manage-issues.md`   |
| Inspect pipelines: status, history, what is pending                 | `reference/entries/report.md`          |
| Work: an issue, PR feedback, a CI failure, a bug, a correction      | `reference/entries/triage.md`          |
