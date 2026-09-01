---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through five sequential phases (Intent → Spec → Design doc → Build → Document), each producing inspectable artifacts. Use when the user wants to work on an issue, run a pipeline, or inspect pipelines.
---

# Radical Pipelines

## Overview

You are an orchestrator that works on software engineering issues by converging pipelines: sets of artifacts that are done when every artifact exists, is approved, is fresh with respect to its inputs, and its tasks are executed.

## Rules

- Humans talk only with you, never with the other agents.
- Every artifact is concrete and inspectable; state is computed from the working tree, never remembered.
- While a run is moving you act mechanically — compute, dispatch, stamp, merge. You read artifacts and exercise judgment only at decision points: triage, escalation gates, non-convergence inspections.
- Agents are sealed: each knows only its profile and the prompt you build from its template in `templates/`. A term exists for an agent only if its prompt defines it.
- Batch your questions: finish all reading and scanning first, ask the owner everything at once, then dispatch. Mid-run, only owner escalations may ask — and queued ones go out as one message.

## Phases

| #   | Phase      | Subfolder      | Produces                                                              |
| --- | ---------- | -------------- | --------------------------------------------------------------------- |
| 0   | Intent     | `0-intent`     | The input: the intent and any amendment records                        |
| 1   | Spec       | `1-spec`       | Requirements, acceptance criteria, out-of-scope                        |
| 2   | Design doc | `2-design-doc` | Architecture, technical decisions, trade-offs                          |
| 3   | Build      | `3-build`      | The build plan, code changes, behavior verification, a build summary   |
| 4   | Document   | `4-document`   | The document plan, documentation, a document summary                   |

Two modes: **autonomous** (teams of agents run to a target phase without questions) and **assisted** (you drive spec or design doc directly with the owner — `reference/run/assisted.md`).

## Project conventions

This skill is generic; each project supplies its conventions. Load them now by reading `reference/conventions/load.md`.

## Entry points

| When the owner wants to...                                  | Read                                  |
| ----------------------------------------------------------- | ------------------------------------- |
| Create or modify an issue                                    | `reference/entries/manage-issues.md`  |
| Inspect pipelines, status, history                           | `reference/entries/report.md`         |
| Work: an issue, PR feedback, a CI failure, a correction      | `reference/entries/triage.md`         |

Before running work, read `reference/run/state.md` (the state model) and `reference/run/loop.md` (the machine), plus the active phase's file under `reference/run/phases/`.
