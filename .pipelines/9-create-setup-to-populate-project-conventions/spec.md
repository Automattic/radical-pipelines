# Spec: Create setup to populate project conventions

## Overview

When a user starts a Radical Pipelines workflow in a project where project conventions cannot be found, the skill should guide the user through a setup flow, collect the missing convention information, and write reusable convention guidance in the correct place for the active CLI. Future pipeline runs in the same project should be able to read the generated guidance and proceed without repeating setup.

The setup flow must follow the repository's existing conventions workflow instead of introducing a competing pattern. Shared, cross-agent project instructions belong in the project-root `AGENTS.md`. In this repository, `CLAUDE.md` is intentionally only a thin pointer to `AGENTS.md` (`@AGENTS.md`) and must stay that way. Radical Pipelines CLI-specific conventions belong in the active CLI's `rp.md` file, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

## Requirements

1. **Detect missing project conventions**
   - When the Radical Pipelines skill is loaded for a pipeline workflow, it must try to find project-specific conventions using the existing documented lookup order:
     1. project-root `AGENTS.md` for shared project instructions;
     2. a dedicated skill, when one is available;
     3. the active CLI's `rp.md` conventions file, such as `.pi/rp.md` or `.claude/rp.md`.
   - If all required conventions are available, the workflow must continue unchanged.
   - If one or more required conventions are missing, the skill must not proceed with the pipeline until the missing information is supplied or the user cancels.
   - Detection must distinguish shared cross-agent instructions from Radical Pipelines CLI-specific conventions, so missing CLI-specific data does not cause the setup to duplicate shared `AGENTS.md` content.

2. **Offer an interactive setup flow**
   - When conventions are missing, the skill must explain that Radical Pipelines requires project conventions before it can run.
   - The setup must ask the user for the required convention information through a clear sequence of questions.
   - The setup must allow the user to provide enough information to cover the conventions needed by the skill, including:
     - where tasks are tracked and how agents should access them;
     - the pipeline slug format;
     - worktree usage and commands, if applicable;
     - branch naming conventions;
     - pipeline artifact folder location;
     - how to spawn teams or agents;
     - commit message conventions.
   - The setup must identify which answers are shared project instructions and which are CLI-specific Radical Pipelines conventions.
   - If the user provides shared cross-agent guidance, the setup must recommend adding or updating project-root `AGENTS.md` rather than copying that guidance into CLI-specific conventions files.

3. **Create or update the correct conventions file**
   - After collecting answers, the setup must create a conventions file in the current project's CLI-specific configuration folder when appropriate for the active CLI.
   - For Pi, the generated Radical Pipelines conventions file should be `.pi/rp.md`.
   - For Claude Code, the generated Radical Pipelines conventions file should be `.claude/rp.md`.
   - The generated file must be human-readable Markdown.
   - The generated file must organize the answers into sections that are easy for future agents to read.
   - The setup must create the parent configuration folder if it does not already exist.
   - The generated CLI-specific file must contain only the conventions needed by Radical Pipelines for that CLI and must not duplicate general project instructions already present in `AGENTS.md`.

4. **Preserve the repository conventions pointer pattern**
   - The setup must treat project-root `AGENTS.md` as the canonical location for shared, cross-agent project instructions.
   - The setup must not expand this repository's `CLAUDE.md` into a full copy of `AGENTS.md`; when `CLAUDE.md` is used as a pointer file, it must preserve the thin pointer pattern (`@AGENTS.md`).
   - The setup must not write Radical Pipelines CLI-specific setup details into `CLAUDE.md` when `.claude/rp.md` is the appropriate destination.
   - If `CLAUDE.md` is missing in a project and the user wants Claude Code to load shared project instructions, the setup may suggest creating a thin pointer to `AGENTS.md` rather than duplicating the shared content.
   - If `AGENTS.md` is missing and shared instructions are required, the setup must ask before creating it and must clearly separate that shared file from CLI-specific `rp.md` files.

5. **Make the generated conventions reusable**
   - The generated CLI-specific conventions file must contain enough information for future Radical Pipelines runs with that CLI to satisfy the project conventions lookup without asking the same setup questions again.
   - After writing the file, the skill must instruct the user to review and commit the generated conventions file if it should be shared with the project.
   - If the setup also creates or recommends changes to `AGENTS.md` or a thin pointer `CLAUDE.md`, it must instruct the user to review and commit those files separately as shared agent instructions.

6. **Handle partial or cancelled setup safely**
   - If the user declines setup or does not provide required answers, the skill must stop and explain what is still missing.
   - The setup must not create an incomplete conventions file unless it clearly marks unresolved items and tells the user the setup is incomplete.
   - The setup must not overwrite an existing conventions file without explicit user confirmation.
   - The setup must not overwrite or replace an existing `AGENTS.md` or `CLAUDE.md` without explicit user confirmation.
   - If an existing `CLAUDE.md` is a pointer to `AGENTS.md`, the setup must preserve that pointer unless the user explicitly requests a different pattern.

7. **Update user-facing documentation**
   - The README must describe the automatic setup behavior at a high level.
   - The documentation must mention where generated Radical Pipelines conventions files are written for supported CLIs.
   - The documentation must explain that shared project instructions should live in `AGENTS.md`, while CLI-specific Radical Pipelines conventions should live in `.pi/rp.md` or `.claude/rp.md`.
   - The documentation must mention that `CLAUDE.md` may be a thin pointer to `AGENTS.md` and that setup should not duplicate shared content into it.

## Acceptance criteria

- Starting a Radical Pipelines workflow in a project with complete conventions continues without triggering setup.
- Starting a workflow in a project with no discoverable conventions prompts the user to run the setup flow instead of failing silently or proceeding with assumptions.
- The setup flow asks for all conventions required by the skill to run a pipeline.
- Completing setup in Pi creates or updates `.pi/rp.md` with the collected Pi-specific Radical Pipelines conventions in Markdown.
- Completing setup in Claude Code creates or updates `.claude/rp.md` with the collected Claude-specific Radical Pipelines conventions in Markdown.
- The generated `rp.md` file does not copy general project guidance already present in `AGENTS.md`.
- If shared project instructions are missing, the setup directs the user to `AGENTS.md` rather than putting shared guidance in CLI-specific files.
- If `CLAUDE.md` is a thin pointer to `AGENTS.md`, setup preserves that pointer and does not replace it with duplicated content.
- If the target conventions file already exists, the setup asks before overwriting it.
- If `AGENTS.md` or `CLAUDE.md` would be created or changed, the setup asks for explicit confirmation first.
- After setup completes, a subsequent Radical Pipelines workflow can use the generated conventions file without asking the same questions again.
- If the user cancels or leaves required information unresolved, no misleading complete conventions file is produced and the workflow stops with a clear message.
- README documentation is updated to describe the setup behavior, generated file locations, and the separation between shared `AGENTS.md` instructions, optional `CLAUDE.md` pointer files, and CLI-specific `rp.md` conventions.

## Out of scope

- Building a graphical or TUI setup wizard.
- Supporting non-Markdown convention file formats.
- Adding support for pipeline phases beyond the currently supported phase 1 workflow.
- Automatically creating or configuring external task trackers, repositories, worktrees, branches, or teams.
- Inferring all project conventions from repository history without user input.
- Committing the generated conventions file automatically.
- Changing the canonical list of required project conventions beyond what the current Radical Pipelines skill needs.
- Replacing `AGENTS.md` with CLI-specific instruction files as the canonical shared project instructions location.
- Expanding this repository's `CLAUDE.md` pointer into a full instructions document.
