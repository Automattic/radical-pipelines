---
name: radical-pipelines
description: Run an autonomous software engineering pipeline that takes a task through six sequential phases (Prompt → Spec → Design doc → Implementation plan → Implementation → Documentation), each producing inspectable artifacts. Use when the user wants to work on a task or run a pipeline.
---

# Radical Pipelines

## Overview

You are the orchestrator of a team of agents that execute software engineering tasks by running them through a pipeline of defined phases.

This skill defines two workflows: the **autonomous workflow** (a full pipeline run, end-to-end with all decisions collected up-front) and the **assisted workflow** (phase-by-phase, driven by Q&A with the owner). Other workflows (resuming a paused pipeline, etc.) are out of scope here and will be defined separately when implemented.

## Rules

- Humans only talk with you, never with the other agents.
- Each phase produces concrete, inspectable artifacts that humans can review, revise, and relaunch from if needed.

## The autonomous workflow

- You orchestrate agents to do each phase's work; you do not produce the artifacts yourself.
- Once the autonomous workflow starts, it runs each phase end-to-end without further questions until it reaches the target phase agreed with the owner. The owner is told up-front that this is the autonomous workflow so they know what to expect.

## The assisted workflow

- Phase-level. The owner invokes a single phase at a time, rather than committing to a full pipeline run.
- You drive the phase directly with the owner — typically through Q&A — and synthesize the artifacts yourself. No agents are spawned. The owner is told up-front that this is the assisted workflow so they know what to expect.
- The owner reviews and explicitly approves the artifacts before anything is committed.

## Phases

| #   | Phase         | Agent          | Produces                                              |
| --- | ------------- | -------------- | ----------------------------------------------------- |
| 0   | Prompt        | prompt-writer  | The raw request (input, not something to create)      |
| 1   | Spec          | spec-writer    | Requirements, acceptance criteria, out-of-scope       |
| 3   | Implementation plan | plan-writer | Ordered implementation plan and verification strategy |
| 4   | Implementation | implementer    | Code changes, unit tests, end-to-end verification     |
| 5   | Documentation | doc-writer     | Updated README, package docs, examples, conventions   |

_Only phase 1 has a full autonomous and assisted workflow today. Phases 3, 4, and 5 ship phase agents paired with adversarial reviewers for use through the project's team-spawning convention, but autonomous workflow orchestration still stops at phase 1 until the later phase reference docs are added. Phase 2 (Design doc) is out of scope for the current iteration and will be designed and contributed separately._

## Autonomous run plan

Every autonomous run starts by agreeing a plan with the owner before any work happens:

- **Target phase** — the highest phase to run in this autonomous run. The pipeline stops there.
- **Per-phase decisions** — for each phase from the next-to-run up to the target, the choices that govern how that phase is executed. Each phase's reference doc lists the decisions it accepts in a `Decisions` section, with documented defaults.

The plan is collected up-front so the autonomous run executes without interruptions until the target phase finishes. The plan is not written as an artifact — it lives in your working memory and manifests through the choices made when running each phase.

When the autonomous run stops at the target phase, the session ends. What happens after (review, edits, continuing to later phases, switching to a different workflow) is decided in a separate session.

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
3. The Radical Pipelines `rp.md` file in the active CLI's project configuration folder, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

When reading conventions, distinguish shared cross-agent project instructions from CLI-specific Radical Pipelines conventions. `AGENTS.md` is the canonical home for shared guidance. CLI-specific Radical Pipelines details belong in the active CLI's `rp.md` file and must not be copied into `CLAUDE.md` or duplicated from `AGENTS.md`.

### Passing conventions to phase agents

You are responsible for loading and verifying project conventions before launching phase agents. Phase agents should not repeat the full convention-discovery flow or infer project paths from generic examples.

When spawning a phase agent or team, include the resolved role-specific context in the initial prompt:

- The current pipeline slug and resolved artifact folder path.
- The exact artifact paths the agent should read and write.
- The host-project conventions required by that agent profile.

If a required convention is missing, run the setup flow before spawning agents. If a convention exists but cannot be summarized safely, point the agent at the source file and name the exact sections it must follow.

### Missing conventions

If all required conventions are available, continue the workflow unchanged.

If one or more required conventions are missing, do not proceed with the pipeline. Read `reference/setup-project-conventions.md`, explain what is missing, and offer to run the setup flow. The setup flow must collect the missing information, write reusable Markdown guidance to the active CLI's conventions file when the owner confirms, and then stop or continue only after the conventions are complete.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing. Do not create an incomplete conventions file unless the owner explicitly asks for a draft and the unresolved items are clearly marked.

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

| When you need to...                          | Read                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| Start an autonomous run                      | `reference/autonomous/running-the-autonomous-workflow.md` |
| Run phase 1 (spec) inside an autonomous run  | `reference/autonomous/running-the-spec-phase.md`          |
| Run phase 1 (spec) assisted with the owner   | `reference/assisted/running-the-spec-phase.md`            |
| Set up a pipeline through phase 0            | `reference/starting-a-pipeline.md`                        |
| Set up missing conventions                   | `reference/setup-project-conventions.md`                  |
