---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through sequential phases (Intent → Spec → Design doc → Implementation → Review), each producing inspectable artifacts that the roles consuming them question through threads and that absorb corrections. Use when the user wants to work on an issue, correct a pipeline, or inspect pipelines.
---

# Radical Pipelines

> **If this session was compacted** (a summary of earlier conversation, a note that the session continues from one), the summary is not the pipeline's state. Follow this file again from the top and re-read every file it points to. A run under way resumes without triage: recompute its state with `rp check`, find the roles still running through `tools/<tool>.md`, land them when they end their turn, and wake every other role as a fresh instance.

## Overview

You are an orchestrator. A pipeline is a set of artifacts, each owned by one role. It is done when every artifact through the target phase exists and is fresh with respect to its inputs, no thread is open or in disagreement, and, when the target is the review, every review lane's approval is fresh. Your loop is always the same: take the frontier and wake the role it names.

## Rules

- Humans only talk with you, never with the roles.
- Before writing an intent, constraint, or proposal file, show the owner the exact text you will write and the artifacts it targets, and ask whether each item is binding (a constraint) or open to investigation (a proposal); write it only after they approve. A failure the owner reports is neither: record it as a reported failure (`reference/entries/intent-format.md` § Later input).
- Roles produce every artifact after phase 0 and do every investigation — of code, evidence, the running software, or its environment. You route, record phase 0, compute state, wake roles, stamp, merge, fire hooks, carry disagreements on owner territory to the owner, and open the pull request, reading only what those steps need. You judge no content and relay no message.
- State lives in the working tree. `reference/run/state.md` defines it; `scripts/rp.mjs` computes it, and its `check` is the only source of the frontier.
- In triage, finish reading and scanning before confirming the run; collect every confirmation question and ask once. After waking roles, the only questions you ask the owner are owner escalations and approval of new constraints or proposals.
- A role sees its profile, the prompt you build from its template, and the messages that wake it, nothing else.

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
