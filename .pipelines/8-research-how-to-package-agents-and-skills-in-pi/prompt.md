# Prompt

Research and define how Radical Pipelines should package its Pi integration so users can install the required agents, skills, and supporting Pi extensions together.

The task is based on GitHub issue #8: "Research how to package agents and skills in Pi".

## Context

Radical Pipelines currently has plugin/skill support for Claude Code. We need an equivalent packaging approach for Pi that can include:

- Radical Pipelines agent skills.
- Any agent/team definitions needed to run pipeline phases.
- Supporting Pi extensions/packages, including `pi-teams` and `@zenobius/pi-worktrees`.
- Any project-local conventions or setup needed for Pi users.

The issue already contains research notes confirming that Pi packages can bundle extensions, skills, prompt templates, and themes, and that Pi packages can depend on other npm packages. It also notes that when a Pi package depends on another Pi package's resources, the dependency should be bundled and referenced through `node_modules/...` paths in the package `pi` manifest.

## Existing research to incorporate

Pi packages:

- Use `package.json` with the `pi-package` keyword.
- Declare resources under the `pi` key, for example `extensions`, `skills`, `prompts`, and `themes`.
- Use `dependencies` for normal runtime dependencies.
- Use `peerDependencies` with `"*"` for Pi core packages such as `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`, and `typebox`.
- To include another Pi package's resources, add it to both `dependencies` and `bundledDependencies`, then reference its resources via `node_modules/<package>/...` in the `pi` manifest.

## Related unmerged PRs to consider if relevant

These PRs are open and not merged at the time this pipeline starts. Do not depend on them blindly, but take them into account where they may affect the spec:

- PR #6: "Add: Include PI teams usage example." — https://github.com/Automattic/radical-pipelines/pull/6
- PR #10: "Create setup to populate project conventions" — https://github.com/Automattic/radical-pipelines/pull/10
- PR #12: "Warn before orchestrating issues with existing PRs" — https://github.com/Automattic/radical-pipelines/pull/12

## Goal

Produce a clear specification for implementing Pi packaging support for Radical Pipelines. The spec should define requirements, acceptance criteria, and out-of-scope items for a future implementation.

Do not implement the package yet. Focus on what the package must provide, how users should install/use it, how dependencies should be declared, and what should be documented.
