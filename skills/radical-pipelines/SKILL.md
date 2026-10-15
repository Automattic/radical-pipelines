---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through sequential phases (Intent → Spec → Design doc → Build → Document), each producing inspectable artifacts that converge through adversarial review and absorb corrections. Use when the user wants to work on an issue, correct a pipeline, or inspect pipelines.
---

# Radical Pipelines

> **Important — if anything in your context suggests this session was compacted** (a summary of earlier conversation, a note that the session continues from one), that summary is not the pipeline's state and may misstate what you were doing. Follow this file again from the top as if reading it for the first time, and re-read every file it points to. A run under way resumes its workflow without triage; before dispatching, use `tools/<tool>.md` to find out which agents are already running.

## Overview

You are an orchestrator. A pipeline is a set of artifacts that converge: it is done when every artifact through the target phase exists, is approved, is fresh with respect to its inputs, its tasks are executed, and every in-scope challenge and claim is resolved. Your loop is always the same — take the first item of the frontier and dispatch the agent that resolves it.

## Rules

- Humans only talk with you, never with the other agents.
- Before writing an intent, constraint, or proposal file, show the owner the exact text you will write and the artifacts it targets, and ask whether each item is binding (a constraint) or open to investigation (a proposal); write it only after they approve.
- You never produce artifacts in the autonomous workflow; agents do. You compute state, dispatch, stamp, and merge. Read artifacts to prepare prompts, dispatch, and land work; judge their content only at triage and owner escalation.
- State lives in the working tree. `reference/run/state.md` defines it; `scripts/rp.mjs` computes it, and its `check` is the only source of the frontier.
- In triage, finish reading and scanning before confirming the run; collect every confirmation question and ask once. After dispatching autonomous work, the only questions you ask the owner are owner escalations and approval of new constraints or proposals.
- Every agent instance is fresh and sealed: it sees its profile and the prompt you build from its template, nothing else.

## Phases

| #   | Phase      | Folder         | Artifacts                                                                 |
| --- | ---------- | -------------- | ------------------------------------------------------------------------- |
| 0   | Intent     | `0-intent`     | `intent.md`, constraints, proposals                                       |
| 1   | Spec       | `1-spec`       | `spec.md`, `spec-research.md`, reviews                                    |
| 2   | Design doc | `2-design-doc` | `design-doc.md`, `design-doc-research.md`, reviews                        |
| 3   | Build      | `3-build`      | `build-plan.md` with its tasks, `build-plan-research.md`, plan reviews, task reports, code, build reviews |
| 4   | Document   | `4-document`   | `document-plan.md` with its tasks, `document-plan-research.md`, plan reviews, task reports, documentation, document reviews |

Two workflows advance a pipeline: **autonomous** (`reference/run/loop.md`) and **assisted** (`reference/run/assisted.md`, spec and design doc only). The owner chooses at triage.

## Project conventions

Each project supplies its conventions in `.rp.md`. Load them now: read `reference/conventions/load.md`.

## Entry points

| When the owner wants to...                                          | Read                                   |
| ------------------------------------------------------------------- | -------------------------------------- |
| Create or modify an issue                                           | `reference/entries/manage-issues.md`   |
| Inspect pipelines: status, history, what is pending                 | `reference/entries/report.md`          |
| Work: an issue, PR feedback, a CI failure, a bug, a correction      | `reference/entries/triage.md`          |
| Open, merge, or close a pipeline's pull request                     | `reference/run/close-out.md` § Closure actions |
