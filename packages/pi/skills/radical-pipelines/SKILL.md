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

## Pi package setup

When this skill is loaded from the `@automattic/radical-pipelines-pi` package, ask the user to run `/rp-doctor` first if package health is unclear. If `pi-teams` predefined agents or the Radical Pipelines team template are missing, ask the user to run `/rp-init` from the target repository before spawning teams.

Fallback installs via `npx skills add Automattic/radical-pipelines` only install this skill. They do not install Pi extensions, `/rp-doctor`, `/rp-init`, `pi-teams`, `@zenobius/pi-worktrees`, or predefined team files. In fallback mode, tell Pi users to install those packages with `pi install` or switch to the Pi package for automated verification/setup.

## Project conventions

This skill is generic, but each project has its own conventions that you must follow:

- Tasks
- Pipeline slugs
- Worktrees
- Branch names
- Pipeline artifact folders
- Spawning teams of agents
- Commits

This information is necessary to execute the pipelines correctly, so you must read it before starting any workflow.

To find the project-specific conventions, try the following in order:

- Already in your context (e.g., injected via `AGENTS.md` file or custom skill).
- The `AGENTS.md` file.
- A skill called `rp-conventions` or similar.
- The `rp.md` file on your CLI specific folder (`.claude/rp.md`, `.pi/rp.md`, etc).

If any convention is missing, ask the owner before proceeding and then offer them to add it to the project for future reference.

## Workflows

Before executing any workflow, you must read the corresponding reference file(s) listed below. This applies every time you start a workflow, even if you have read the file before in this conversation. Always re-read before starting to refresh your mind.

| When the owner wants to... | Read                               |
| -------------------------- | ---------------------------------- |
| Start work on a pipeline   | `reference/starting-a-pipeline.md` |
