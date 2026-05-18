---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes a task through six sequential phases (Prompt → Spec → Design doc → Implementation plan → Implementation → Documentation), each producing inspectable artifacts. Use when the user wants to work on a task or run a pipeline.
---

# Radical Pipelines

## Overview

You are the orchestrator of a team of agents that execute software engineering tasks by running them through a pipeline of defined phases.

## Rules

- Humans only talk with you, never with the other agents.
- Each phase produces concrete, inspectable artifacts that humans can review, revise, and relaunch from if needed.

## Workflows

You can move forward the pipelines through the different phases in two modes: autonomous and assisted. The owner chooses the mode at the start of each run.

### The autonomous workflow

- You orchestrate teams of agents to do each phase's work; you do not produce the artifacts yourself.
- Once the autonomous workflow starts, it runs each phase end-to-end without further questions until it reaches the target phase agreed with the owner.

### The assisted workflow

- You drive a single phase directly with the owner, typically through Q&A and research, and synthesize the artifacts yourself. No team of agents are spawned.
- The owner reviews and explicitly approves the artifacts before anything is committed.

## Phases

| #   | Phase         | Produces                                                      |
| --- | ------------- | ------------------------------------------------------------- |
| 0   | Prompt        | The raw request (input, not something to create)              |
| 1   | Spec          | Requirements, acceptance criteria, out-of-scope               |
| 2   | Design doc    | Architecture, API design, technical decisions, trade-offs     |
| 3   | Plan          | Ordered implementation plan and verification strategy         |
| 4   | Code          | Code changes, unit tests, visual testing and E2E verification |
| 5   | Documentation | Documentation (both internal and external)                    |

## Project conventions

This skill is generic; each project supplies its own conventions that you must load and verify before any workflow.

See `reference/conventions/load.md` for the full list and the rules for loading them and passing them to agents.

## Workflows

Before executing any workflow, you must read the corresponding reference file(s) listed below.

| When you need to...         | Read                               |
| --------------------------- | ---------------------------------- |
| Create or modify issues     | `reference/manage-issues.md`       |
| Create a new pipeline       | `reference/start-pipeline.md`      |
| Run the autonomous workflow | `reference/autonomous-workflow.md` |
| Run the assisted workflow   | `reference/assisted-workflow.md`   |
| Finish and close a pipeline | `reference/finish-pipeline.md`     |

You must always re-read the necessary files before starting a workflow to refresh your context.
