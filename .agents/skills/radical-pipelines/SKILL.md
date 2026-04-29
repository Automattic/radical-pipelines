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

This information is necessary to execute the pipelines correctly, so you must read it before starting any workflow.

To find the project-specific conventions, try the following in order:

- Already in your context (e.g., injected via `AGENTS.md` file or custom skill).
- The `AGENTS.md` file.
- A skill called `rp-conventions` or similar.
- The `rp.md` file on your CLI specific folder (`.claude/rp.md`, `.pi/rp.md`, etc).

If any convention is missing, ask the owner before proceeding and then offer them to add it to the project for future reference.

### Tool-backed conventions

Some project conventions are implemented by named tools, plugins, slash commands, or external packages. These conventions are binding, not suggestions.

Before using a tool-backed convention, you must verify the tool's exact operational semantics from one of these sources:

- The project's convention file, if it includes complete usage instructions.
- The tool's linked documentation or repository.
- The installed local package documentation or examples.
- The owner, if the documentation is missing, unavailable, ambiguous, or cannot be accessed from the current harness.

Do not substitute an equivalent-looking fallback unless the project conventions explicitly allow it. For example, if a project requires a `/worktree` command, do not use raw `git worktree`; if a project requires a team runner, do not manually write the team's artifacts yourself.

If you cannot verify how to invoke a required tool from the current environment, stop and ask the owner before doing any work that depends on that tool.

## Workflows

Before executing any workflow, you must read the corresponding reference file(s) listed below. This applies every time you start a workflow, even if you have read the file before in this conversation. Always re-read before starting to refresh your mind.

| When the owner wants to... | Read                               |
| -------------------------- | ---------------------------------- |
| Start work on a pipeline   | `reference/starting-a-pipeline.md` |
