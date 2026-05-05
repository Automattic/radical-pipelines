# Specification: Pi Packaging Support for Radical Pipelines

## Requirements

- Define a recommended Pi installation and packaging approach for Radical Pipelines that can install the complete Pi integration needed to run Radical Pipelines workflows.
- The design must explicitly evaluate two candidate approaches before choosing the implementation path:
  - A Pi package/extension bundle that installs Radical Pipelines resources and supporting Pi packages together.
  - A skill-first distribution that keeps Radical Pipelines installable as a skill and includes required sub-agent profiles in a skill subfolder, with startup checks that tell users how to install any missing agents.
- If the recommended approach is a Pi package, the package must use a `package.json` with the `pi-package` keyword.
- If the recommended approach is a Pi package, the package must declare Pi resources under the `pi` manifest key, including any applicable:
  - `skills`
  - `extensions`
  - `prompts`
  - `themes`
- The chosen distribution must include or expose Radical Pipelines skills needed to run pipeline phases in Pi.
- The chosen distribution must include or expose any Pi agent or team definitions required to orchestrate Radical Pipelines phases.
- The chosen distribution must support installation or clear verification of required Pi extensions/packages together with Radical Pipelines, including:
  - `pi-teams`
  - `@zenobius/pi-worktrees`
- If the skill-first approach is chosen or retained as a supported path, the skill must define where sub-agent profiles live relative to the skill, how startup checks detect whether those agents are available to Pi, and what user-facing install instructions are shown when agents are missing.
- The skill-first approach must account for uncertainty in resolving the installed skill location, including installs via symlinks, references under the user's home directory, or other Pi-supported skill paths.
- The design must compare the user experience tradeoff between `npx skills add automattic/radical-pipelines` and any package/extension-specific installation flow that may differ by CLI.
- Normal runtime dependencies must be declared in `dependencies`.
- Pi core packages must be declared in `peerDependencies` with `"*"` versions, including:
  - `@mariozechner/pi-coding-agent`
  - `@mariozechner/pi-ai`
  - `@mariozechner/pi-tui`
  - `typebox`
- If Radical Pipelines depends on resources from another Pi package, that package must be listed in both `dependencies` and `bundledDependencies`.
- Resources from bundled Pi package dependencies must be referenced in the `pi` manifest through `node_modules/<package>/...` paths.
- If the recommended approach is a Pi package, the package layout must clearly separate Radical Pipelines-owned resources from bundled third-party Pi resources.
- The spec for future implementation must define the expected user installation flow for Pi users for the chosen approach and, if applicable, for any supported fallback approach.
- The spec for future implementation must define the expected usage flow after installation, including how users discover or invoke Radical Pipelines skills/agents in Pi and how missing agent/profile checks are surfaced.
- Documentation must explain:
  - What the chosen distribution installs.
  - Which agents, skills, extensions, prompts, or templates are included.
  - How dependency bundling works.
  - How to install the chosen distribution.
  - How to verify the distribution, required skills, agents, and extensions are available in Pi.
  - Any required project-local setup or conventions.
- Documentation must account for the current state of related unmerged PRs without depending on them being merged:
  - PR #6 may affect examples for using `pi-teams`.
  - PR #10 may affect project convention setup.
  - PR #12 may affect orchestration safeguards around issues with existing PRs.
- The implementation plan that follows this spec should avoid assuming those PRs are available unless they have been merged.

## Acceptance criteria

- A future implementation documents why the selected approach is preferable to the alternative for Pi users.
- If a Pi package is selected, it has a package definition that Pi recognizes as a Pi package via the `pi-package` keyword.
- If a Pi package is selected, the package manifest declares all Radical Pipelines Pi resources under the `pi` key.
- If the skill-first approach is selected, Radical Pipelines remains installable with `npx skills add automattic/radical-pipelines` or an equivalently simple documented command.
- If the skill-first approach is selected, required sub-agent profiles are included in a defined subfolder and the skill checks at startup whether those agents are installed or available.
- If required agents are missing, the user receives clear instructions for moving or installing the bundled agent profiles into the correct Pi location.
- Radical Pipelines skills required for pipeline execution are installable through the chosen distribution.
- Required supporting packages, including `pi-teams` and `@zenobius/pi-worktrees`, are declared with the correct dependency strategy.
- Any bundled Pi package resources are referenced through `node_modules/<package>/...` paths in the `pi` manifest.
- Pi core packages are declared as wildcard peer dependencies rather than bundled runtime dependencies.
- A user can install the Radical Pipelines Pi integration with a single package installation step or a clearly documented equivalent.
- After installation, a user can identify which Radical Pipelines skills, agents, teams, or extensions were installed.
- Documentation describes how to initialize or satisfy project-local conventions required by Radical Pipelines in Pi.
- Documentation clearly states any assumptions or limitations caused by PRs #6, #10, and #12 being unmerged.
- The chosen distribution design does not require users to manually copy individual skill, extension, or prompt files into Pi configuration directories.
- If manual installation of sub-agent profiles is unavoidable in a skill-first design, it is limited to the agent profiles, clearly detected, and clearly documented.
- The resulting specification is sufficient for a later design and implementation phase to create the chosen distribution without additional research into basic Pi package mechanics or skill-relative agent profile mechanics.

## Out of scope

- Implementing the Pi package.
- Implementing the skill-first agent-profile installation checks.
- Modifying existing Radical Pipelines skills, agents, or extensions.
- Creating new pipeline phases beyond the current supported workflow.
- Implementing support for Claude Code packaging.
- Depending on unmerged PRs #6, #10, or #12.
- Publishing the package to npm.
- Creating CLI-specific installation guides beyond the minimum needed to compare package/extension installation with `npx skills add`.
- Designing a long-term versioning or release automation strategy.
- Creating migration tooling for existing local Pi setups.
- Changing Pi core package behavior.
- Changing `pi-teams` or `@zenobius/pi-worktrees`.
- Defining product behavior unrelated to installing and using Radical Pipelines from Pi.
