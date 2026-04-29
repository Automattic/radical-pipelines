# Specification: Pi Packaging Support for Radical Pipelines

## Requirements

- Define a Pi package for Radical Pipelines that can install the complete Pi integration needed to run Radical Pipelines workflows.
- The package must use a `package.json` with the `pi-package` keyword.
- The package must declare Pi resources under the `pi` manifest key, including any applicable:
  - `skills`
  - `extensions`
  - `prompts`
  - `themes`
- The package must include or expose Radical Pipelines skills needed to run pipeline phases in Pi.
- The package must include or expose any Pi agent or team definitions required to orchestrate Radical Pipelines phases.
- The package must support installation of required Pi extensions/packages together with Radical Pipelines, including:
  - `pi-teams`
  - `@zenobius/pi-worktrees`
- Normal runtime dependencies must be declared in `dependencies`.
- Pi core packages must be declared in `peerDependencies` with `"*"` versions, including:
  - `@mariozechner/pi-coding-agent`
  - `@mariozechner/pi-ai`
  - `@mariozechner/pi-tui`
  - `typebox`
- If Radical Pipelines depends on resources from another Pi package, that package must be listed in both `dependencies` and `bundledDependencies`.
- Resources from bundled Pi package dependencies must be referenced in the `pi` manifest through `node_modules/<package>/...` paths.
- The package layout must clearly separate Radical Pipelines-owned resources from bundled third-party Pi resources.
- The spec for future implementation must define the expected user installation flow for Pi users.
- The spec for future implementation must define the expected usage flow after installation, including how users discover or invoke Radical Pipelines skills/agents in Pi.
- Documentation must explain:
  - What the Pi package installs.
  - Which agents, skills, extensions, prompts, or templates are included.
  - How dependency bundling works.
  - How to install the package.
  - How to verify the package is available in Pi.
  - Any required project-local setup or conventions.
- Documentation must account for the current state of related unmerged PRs without depending on them being merged:
  - PR #6 may affect examples for using `pi-teams`.
  - PR #10 may affect project convention setup.
  - PR #12 may affect orchestration safeguards around issues with existing PRs.
- The implementation plan that follows this spec should avoid assuming those PRs are available unless they have been merged.

## Acceptance criteria

- A future implementation has a package definition that Pi recognizes as a Pi package via the `pi-package` keyword.
- The package manifest declares all Radical Pipelines Pi resources under the `pi` key.
- Radical Pipelines skills required for pipeline execution are installable through the package.
- Required supporting packages, including `pi-teams` and `@zenobius/pi-worktrees`, are declared with the correct dependency strategy.
- Any bundled Pi package resources are referenced through `node_modules/<package>/...` paths in the `pi` manifest.
- Pi core packages are declared as wildcard peer dependencies rather than bundled runtime dependencies.
- A user can install the Radical Pipelines Pi integration with a single package installation step or a clearly documented equivalent.
- After installation, a user can identify which Radical Pipelines skills, agents, teams, or extensions were installed.
- Documentation describes how to initialize or satisfy project-local conventions required by Radical Pipelines in Pi.
- Documentation clearly states any assumptions or limitations caused by PRs #6, #10, and #12 being unmerged.
- The package design does not require users to manually copy individual skill, agent, extension, or prompt files into Pi configuration directories.
- The resulting specification is sufficient for a later design and implementation phase to create the package without additional research into basic Pi package mechanics.

## Out of scope

- Implementing the Pi package.
- Modifying existing Radical Pipelines skills, agents, or extensions.
- Creating new pipeline phases beyond the current supported workflow.
- Implementing support for Claude Code packaging.
- Depending on unmerged PRs #6, #10, or #12.
- Publishing the package to npm.
- Designing a long-term versioning or release automation strategy.
- Creating migration tooling for existing local Pi setups.
- Changing Pi core package behavior.
- Changing `pi-teams` or `@zenobius/pi-worktrees`.
- Defining product behavior unrelated to installing and using Radical Pipelines from Pi.
