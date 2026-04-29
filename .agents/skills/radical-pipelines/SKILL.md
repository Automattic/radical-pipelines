---
name: radical-pipelines
description: Execute a software engineering task by running it through six sequential phases (Prompt → Spec → Design doc → Implementation plan → Implementation → Documentation). Use when the user asks wants to work on a task or a pipeline.
---

# Radical Pipelines

## Overview

You are the orchestrator of a team of agents that execute software engineering tasks by running them through a pipeline of defined phases.

## Rules

- Humans only talk with you, never with the other agents.
- You never do or review the work yourself. Your only task is to orchestrate the teams of agents that do the work.

## Pipelines

- Each phase produces concrete, inspectable artifacts that humans can review, revise, and relaunch from if needed.
- The pipeline is autonomous by default: you run each phase end-to-end, then proceed to the next until the task is completed. You only pause when the user asked you to stop at a specific phase.

## Phases

| #   | Phase  | Produces                                         |
| --- | ------ | ------------------------------------------------ |
| 0   | Prompt | The raw request (input, not something to create) |
| 1   | Spec   | Requirements, acceptance criteria, out-of-scope  |

_For now, only phase 1 is available, the rest will be added later._

## Project conventions

This skill is generic, but each project has its own conventions that you must follow:

- Tasks
- Pipeline slugs
- Worktrees
- Branch names
- Pipeline artifact folders
- Spawning teams of agents
- Commits

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

### Loading conventions

To find the project-specific conventions, try the following in order:

1. Shared project instructions already in your context or in project-root `AGENTS.md`.
2. A dedicated conventions skill called `rp-conventions` or similar, when one is available.
3. The Radical Pipelines `rp.md` file for the active agent tool, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

When reading conventions, distinguish shared cross-agent project instructions from agent tool-specific Radical Pipelines conventions. `AGENTS.md` is the canonical home for shared guidance. Agent tool-specific Radical Pipelines details belong in the active tool's `rp.md` file and must not be copied into `CLAUDE.md` or duplicated from `AGENTS.md`.

### Missing conventions

If all required conventions are available, continue the workflow unchanged.

If one or more required conventions are missing, do not proceed with the pipeline. Read `reference/setup-project-conventions.md`, explain what is missing, and offer to run the setup flow. The setup flow must collect the missing information, write reusable Markdown guidance to the active agent tool's conventions file when the owner confirms, and then stop or continue only after the conventions are complete.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing. Do not create an incomplete conventions file unless the owner explicitly asks for a draft and the unresolved items are clearly marked.

## Workflows

Before executing any workflow, you must read the corresponding reference file(s) listed below. This applies every time you start a workflow, even if you have read the file before in this conversation. Always re-read before starting to refresh your mind.

| When the owner wants to... | Read                               |
| -------------------------- | ---------------------------------- |
| Start work on a pipeline   | `reference/starting-a-pipeline.md` |
| Set up missing conventions | `reference/setup-project-conventions.md` |
