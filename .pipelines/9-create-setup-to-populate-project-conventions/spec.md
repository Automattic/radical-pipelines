# Spec: Create setup to populate project conventions

## Overview

When a user starts a Radical Pipelines workflow in a project where project conventions cannot be found, the skill should guide the user through a setup flow, collect the missing convention information, and write a reusable conventions file. Future pipeline runs in the same project should be able to read that file and proceed without repeating setup.

## Requirements

1. **Detect missing project conventions**
   - When the Radical Pipelines skill is loaded for a pipeline workflow, it must try to find project-specific conventions using the existing documented lookup order.
   - If all required conventions are available, the workflow must continue unchanged.
   - If one or more required conventions are missing, the skill must not proceed with the pipeline until the missing information is supplied or the user cancels.

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

3. **Create a conventions file**
   - After collecting answers, the setup must create a conventions file in the current project's CLI-specific configuration folder when appropriate for the active agent CLI.
   - For Pi, the generated file should be `.pi/rp.md`.
   - For Claude Code, the generated file should be `.claude/rp.md`.
   - The generated file must be human-readable Markdown.
   - The generated file must organize the answers into sections that are easy for future agents to read.
   - The setup must create the parent configuration folder if it does not already exist.

4. **Make the generated conventions reusable**
   - The generated file must contain enough information for future Radical Pipelines runs to satisfy the project conventions lookup without asking the same setup questions again.
   - After writing the file, the skill must instruct the user to review and commit the generated conventions file if it should be shared with the project.

5. **Handle partial or cancelled setup safely**
   - If the user declines setup or does not provide required answers, the skill must stop and explain what is still missing.
   - The setup must not create an incomplete conventions file unless it clearly marks unresolved items and tells the user the setup is incomplete.
   - The setup must not overwrite an existing conventions file without explicit user confirmation.

6. **Update user-facing documentation**
   - The README must describe the automatic setup behavior at a high level.
   - The documentation must mention where generated conventions files are written for supported CLIs.

## Acceptance criteria

- Starting a Radical Pipelines workflow in a project with complete conventions continues without triggering setup.
- Starting a workflow in a project with no discoverable conventions prompts the user to run the setup flow instead of failing silently or proceeding with assumptions.
- The setup flow asks for all conventions required by the skill to run a pipeline.
- Completing setup in Pi creates `.pi/rp.md` with the collected conventions in Markdown.
- Completing setup in Claude Code creates `.claude/rp.md` with the collected conventions in Markdown.
- If the target conventions file already exists, the setup asks before overwriting it.
- After setup completes, a subsequent Radical Pipelines workflow can use the generated conventions file without asking the same questions again.
- If the user cancels or leaves required information unresolved, no misleading complete conventions file is produced and the workflow stops with a clear message.
- README documentation is updated to describe the setup behavior and generated file locations.

## Out of scope

- Building a graphical or TUI setup wizard.
- Supporting non-Markdown convention file formats.
- Adding support for pipeline phases beyond the currently supported phase 1 workflow.
- Automatically creating or configuring external task trackers, repositories, worktrees, branches, or teams.
- Inferring all project conventions from repository history without user input.
- Committing the generated conventions file automatically.
- Changing the canonical list of required project conventions beyond what the current Radical Pipelines skill needs.
