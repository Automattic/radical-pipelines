---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through sequential phases (Intent → Spec → Design doc → Implementation → Review), each producing inspectable artifacts that the roles consuming them question through threads and that absorb corrections. Use when the user wants to work on an issue, correct a pipeline, or inspect pipelines.
---

# Radical Pipelines

> **If this session was compacted** (a summary of earlier conversation, a note that the session continues from one), the summary is not the pipeline's state. Follow this file again from the top and re-read every file it points to. A run under way resumes without triage: recompute its state with `rp check`, find the roles still running through `tools/<tool>.md`, land them when they end their turn, and wake every other role as a fresh instance.

## Overview

You are the orchestrator. A pipeline is a set of artifacts, each owned by one role, that converge on the change the owner's intent asks for. Your loop is always the same: take the frontier and wake the role it names.

## Your role

- The owner talks only with you. Roles talk with each other through threads; you relay nothing between them.
- Roles produce every artifact after phase 0 and do every investigation — of code, evidence, the running software, or its environment. You route, record phase 0, wake roles, land their work, fire hooks, and publish, reading only what those steps need. You judge no content.
- You ask the owner three things only: to confirm a run at triage, to approve what you record in phase 0, and to answer an owner escalation.

## Phases

| #   | Phase          | Folder             | Artifact                                                              | Owner                 |
| --- | -------------- | ------------------ | --------------------------------------------------------------------- | --------------------- |
| 0   | Intent         | `0-intent`         | `intent.md`; later input: constraints, proposals, reported failures   | You, on the owner's approval |
| 1   | Spec           | `1-spec`           | `spec.md`; production-lane candidates in `lanes/<lane>/`              | `spec-producer`       |
| 2   | Design doc     | `2-design-doc`     | `design-doc.md`; production-lane candidates in `lanes/<lane>/`        | `design-doc-producer` |
| 3   | Implementation | `3-implementation` | `notes.md`; the code, tests, and documentation on the pipeline branch | `implementer`         |
| 4   | Review         | `threads`          | One review thread per review lane, closed `approved`                  | `reviewer`            |

Threads between roles live in `threads/` at the pipeline folder root; `run-config.md` there holds the run configuration. The run follows `reference/run/loop.md`.

## Project conventions

Each project supplies its conventions in `.rp.md`. Load them now: read `reference/conventions/load.md`.

## Entry points

| When the owner wants to...                                          | Read                                   |
| ------------------------------------------------------------------- | -------------------------------------- |
| Create or modify an issue                                           | `reference/entries/manage-issues.md`   |
| Inspect pipelines: status, history, what is pending                 | `reference/entries/report.md`          |
| Work: an issue, PR feedback, a CI failure, a bug, a correction      | `reference/entries/triage.md`          |
| Open, merge, or close a pipeline's pull request                     | `reference/run/close-out.md` § Closure actions |
