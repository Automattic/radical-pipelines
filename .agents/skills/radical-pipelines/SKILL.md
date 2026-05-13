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

| #   | Phase               | Agent         | Produces                                              |
| --- | ------------------- | ------------- | ----------------------------------------------------- |
| 0   | Prompt              | prompt-writer | The raw request (input, not something to create)      |
| 1   | Spec                | spec-writer   | Requirements, acceptance criteria, out-of-scope       |
| 2   | Design doc          | design-writer | Architecture, technical decisions, trade-offs         |
| 3   | Implementation plan | plan-writer   | Ordered implementation plan and verification strategy |
| 4   | Implementation      | implementer   | Code changes, unit tests, end-to-end verification     |
| 5   | Documentation       | doc-writer    | Updated README, package docs, examples, conventions   |

_Only phase 1 has a full autonomous and assisted workflow today. Phases 2, 3, 4, and 5 ship phase agents paired with adversarial reviewers for use through the project's team-spawning convention, but autonomous workflow orchestration still stops at phase 1 until the later phase reference docs are added._

## Autonomous run plan

Every autonomous run starts by agreeing a plan with the owner before any work happens:

- **Target phase** — the highest phase to run in this autonomous run. The pipeline stops there.
- **Per-phase decisions** — for each phase from the next-to-run up to the target, the choices that govern how that phase is executed. Each phase's reference doc lists the decisions it accepts in a `Decisions` section, with documented defaults.

The plan is collected up-front so the autonomous run executes without interruptions until the target phase finishes. The plan is not written as an artifact — it lives in your working memory and manifests through the choices made when running each phase.

When the autonomous run stops at the target phase, the session ends. What happens after (review, edits, continuing to later phases, switching to a different workflow) is decided in a separate session.

## Project conventions

This skill is generic, but each project has its own conventions that you must follow:

- Repository ownership and persistence policy
- Tasks
- Pipeline slugs
- Worktrees
- Branch names
- Pipeline artifact folders
- Spawning teams of agents
- Pi agent definitions, when the active CLI is Pi
- Commit format and PR ownership policy

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

### Loading conventions

To find the project-specific conventions, try the following in order:

1. Shared project instructions already in your context or in project-root `AGENTS.md`.
2. A dedicated conventions skill called `rp-conventions` or similar, when one is available.
3. The Radical Pipelines `rp.md` file in the active CLI's project configuration folder, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

When reading conventions, distinguish shared cross-agent project instructions from CLI-specific Radical Pipelines conventions. `AGENTS.md` is the canonical home for shared guidance. Claude Code-specific Radical Pipelines details belong only in `.claude/rp.md`; Pi-specific Radical Pipelines details belong only in `.pi/rp.md`. Do not copy CLI-specific conventions into `CLAUDE.md`, do not duplicate shared `AGENTS.md` content into CLI files, and do not mix Claude Code conventions into Pi files or Pi conventions into Claude Code files.

### Pi agent definitions

When the active CLI is Pi, verify phase agent definitions before starting a pipeline or spawning a predefined team. Check repository-local Pi agents first, then user-local/global Pi agents:

1. Repository-local: `.pi/agents/<agent-name>.md` or `.pi/agents/<agent-name>/SKILL.md` in the target repository.
2. User-local/global: `~/.pi/agent/agents/<agent-name>.md` or `~/.pi/agent/agents/<agent-name>/SKILL.md`.

The required agent set is the set needed by the target phase and selected execution mode. For example, single-agent phase 1 needs `spec-writer` and `spec-reviewer`; design, plan, implementation, and documentation phases need their writer/reviewer pair.

If neither repository-local nor user-local/global definitions are available for the required agents, stop before running the pipeline. Ask the owner which Radical Pipelines agents they want to copy/paste and install, and whether to install them in the repository-local `.pi/agents/` directory or the user-local/global `~/.pi/agent/agents/` directory. Do not create or copy agent files without explicit confirmation.

### Repository ownership safety

Repository ownership is a required setup convention, not a question to repeat every time the orchestrator starts. Before asking what phase to run or creating files, load the stored ownership convention and verify the current checkout/worktree matches it:

- **Owned repository** — the owner intentionally manages the repository. Radical Pipelines may create, edit, and commit project convention files, pipeline artifact folders, and supporting project files such as `.gitignore` entries for local worktree folders when the project convention says to do so.
- **Not-owned repository** — the owner is working against an upstream they do not control, or where Radical Pipelines files would be unrelated project noise. In this mode all Radical Pipelines work must happen in the owner's fork. The setup convention records the fork remote/URL and branch/worktree policy once so future runs can verify it without asking again.

If ownership or the required fork policy is unclear, stop and run setup. Do not guess based only on local filesystem access or repository remote information.

For not-owned repositories, the safe default is:

- create and enter a worktree/branch in the configured fork before any phase work starts;
- keep reusable Radical Pipelines conventions, CLI configuration, agent configuration, and other personal automation files outside the upstream project repository unless the owner has explicitly declared them project-relevant;
- do not create or modify upstream project files such as `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `.pi/`, `.claude/`, `.pipelines/`, or agent configuration for Radical Pipelines purposes;
- if local-only excludes are needed, offer to use the repository-local Git excludes file (`.git/info/exclude`) instead of modifying `.gitignore`;
- allow agents to commit according to the project's commit convention once they are operating in the configured fork worktree;
- do not ask agents to read or enforce fork/PR ownership policy; the orchestrator owns that verification;
- leave pull-request publication for the open PR phase, where the orchestrator must use the configured fork.

If the configured fork, artifact folder, or setup target is missing or unsafe for a not-owned repository, treat that as a missing convention and run setup before continuing.

### Passing conventions to phase agents

You are responsible for loading and verifying project conventions and, for Pi, required agent definitions before launching phase agents. Phase agents should not repeat the full convention-discovery flow or infer paths from generic examples.

When spawning a phase agent or team, include the resolved role-specific context in the initial prompt:

- The current pipeline slug and resolved artifact folder path.
- The exact artifact paths the agent should read and write.
- The host-project conventions required by that agent profile.
- For reviewer agents, the current review iteration number and the exact review artifact path to write.

Do not pass fork/PR ownership policy to phase agents. The orchestrator uses that convention when creating or verifying the fork worktree and later when opening a pull request.

If a required convention is missing, run the setup flow before spawning agents. If a convention exists but cannot be summarized safely, point the agent at the source file and name the exact sections it must follow.

### Review artifacts

Reviewer agents write inspectable review artifacts into the current task's artifact folder on every review iteration. Use the phase surface in the filename and increment N from 1 for each writer/reviewer round:

- Spec reviews: `spec-review-N.md`.
- Design doc reviews: `design-doc-review-N.md`.
- Implementation plan reviews: `plan-review-N.md`.
- Code reviews: `code-review-N.md`.
- Documentation reviews: `docs-review-N.md`.

Do not overwrite earlier review artifacts. If a reviewer approves without requested changes, the approval and supporting evidence still belongs in that iteration's review artifact.

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

| When you need to...                         | Read                                                      |
| ------------------------------------------- | --------------------------------------------------------- |
| Start an autonomous run                     | `reference/autonomous/running-the-autonomous-workflow.md` |
| Run phase 1 (spec) inside an autonomous run | `reference/autonomous/running-the-spec-phase.md`          |
| Run phase 1 (spec) assisted with the owner  | `reference/assisted/running-the-spec-phase.md`            |
| Set up a pipeline through phase 0           | `reference/starting-a-pipeline.md`                        |
| Set up missing conventions                  | `reference/setup-project-conventions.md`                  |
