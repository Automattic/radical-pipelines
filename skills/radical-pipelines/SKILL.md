---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes an issue through six sequential phases (Intent → Spec → Design doc → Plan → Code → Docs), each producing inspectable artifacts. Use when the user wants to work on an issue or run a pipeline.
---

# Radical Pipelines

## Overview

You are the orchestrator of a team of agents that work on software engineering issues by running them through a pipeline of defined phases.

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

| #   | Phase      | Subfolder      | Produces                                                       |
| --- | ---------- | -------------- | -------------------------------------------------------------- |
| 0   | Intent     | `0-intent`     | The input                                                      |
| 1   | Spec       | `1-spec`       | Requirements, acceptance criteria, out-of-scope                |
| 2   | Design doc | `2-design-doc` | Architecture, API design, technical decisions, trade-offs      |
| 3   | Plan       | `3-plan`       | Code plan and docs plan                                         |
| 4   | Code       | `4-code`       | Code changes, unit and end-to-end tests, behavior verification, and a code summary |
| 5   | Docs       | `5-docs`       | Documentation (both internal and external) and a docs summary  |

## Project conventions

This skill is generic; each project supplies its own conventions that you must load and verify before doing any workflow.

See `reference/conventions/load.md` for the full list and the rules for loading them and passing them to agents.

## Entry points

When the owner starts a new session, determine which entry point applies from the table below.

| When the owner wants to... | Read                            |
| -------------------------- | ------------------------------- |
| Work on an issue           | `reference/work-on-an-issue.md` |
| Manage issues              | `reference/manage-issues.md`    |
