# Radical Pipelines Pi package

This Pi package ships the Radical Pipelines skill, phase agent profiles, pi-teams team template sources, and bundled Pi package dependencies for `pi-teams` and `@zenobius/pi-worktrees`.

## What it includes

- Skill: `skills/radical-pipelines/SKILL.md`.
- Agents: `prompt-writer`, `spec-analyst`, `researcher`, `spec-writer`, `spec-reviewer`, `spec-consolidator`, `design-writer`, `design-reviewer`, `code-plan-writer`, `code-plan-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer`. Consolidator agents for multi-lane phases 3 and 4 will ship when those modes are designed.
- Team templates: `radical-pipelines-spec`, `radical-pipelines-design`, `radical-pipelines-plan`, `radical-pipelines-code`, and `radical-pipelines-docs` as package-local source definitions. These templates are intended to be registered globally for `pi-teams`, not copied into every target repository. The spec, design, plan, code, and docs templates correspond to phases 1–5 of the autonomous workflow.
- Bundled dependency resources loaded through `node_modules/...`: `pi-teams` and `@zenobius/pi-worktrees`.

No prompt templates or themes are currently included.

## Install

Install from the GitHub repository:

```bash
pi install git:github.com/Automattic/radical-pipelines
```

Local checkout install:

```bash
cd .pi-extension
npm install
cd ..
pi install ./.pi-extension -l
```

`npm install` is required for local-path development installs so the bundled `node_modules/pi-teams/...` and `node_modules/@zenobius/pi-worktrees/...` resources exist before Pi loads the package.

## Verify

Local Pi install:

```bash
pi install ./.pi-extension -l
pi list
```

Print-mode skill checks from a teammate shell should unset teammate environment variables so `pi-teams` does not treat the validation as a teammate session:

```bash
env -u PI_TEAM_NAME -u PI_AGENT_NAME pi -p "/skill:radical-pipelines"
```

Verified local results:

- `pi install ./.pi-extension -l && pi list` succeeded; in this worktree `pi list` showed project package `../.pi-extension`.
- `/skill:radical-pipelines` succeeded with `Ready. What pipeline/task would you like to start?`.
- pi-teams predefined discovery requires the packaged team templates to be registered in the global `~/.pi/teams.yaml` file because `pi-teams` does not currently read package-local team files directly.

## Usage

1. Install the package globally or project-locally.
2. Start the workflow with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
3. Ensure the packaged team templates have been registered in the global `~/.pi/teams.yaml` file used by `pi-teams`.
4. Ensure the required phase agent definitions are discoverable. Check repository-local `.pi/agents/` first, then user-local/global `~/.pi/agent/agents/`.
5. Use pi-teams predefined team creation with the `radical-pipelines-spec`, `radical-pipelines-design`, `radical-pipelines-plan`, `radical-pipelines-code`, or `radical-pipelines-docs` template, depending on the phase you are running.

The target project still needs Radical Pipelines conventions, typically in `AGENTS.md`, a CLI-specific `.pi/rp.md`, or a dedicated conventions skill. Those conventions should define task lookup, pipeline slug format, artifact folder (for example `.pipelines/<pipeline-slug>`), `/worktree` setup, branch naming, team spawning, commit format, and Pi agent setup. During Pi setup, if no required agents are found in repository-local `.pi/agents/` or user-local/global `~/.pi/agent/agents/`, the workflow asks which Radical Pipelines agents to copy/paste and install before it launches teams. Reviewer agents write inspectable `spec-review-N.md`, `design-doc-review-N.md`, `code-plan-review-N.md`, `doc-plan-review-N.md`, `code-review-N.md`, and `docs-review-N.md` artifacts into the task's artifact folder.

## Bundled dependencies

The package declares `pi-teams`, `@zenobius/pi-worktrees`, and the `@sinclair/typebox` runtime dependency needed by the current `pi-teams` release in both `dependencies` and `bundledDependencies`. Pi resources from those dependencies are referenced through package-local `node_modules/...` paths in `package.json`.

Pi core packages are wildcard `peerDependencies` and are not bundled: `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`, and `typebox`.

## Fallback skill install

The skill-only fallback remains:

```bash
npx skills add Automattic/radical-pipelines
```

That command does not install Pi extensions, `pi-teams`, `@zenobius/pi-worktrees`, or predefined team source files. Skill install paths can vary across CLIs, symlinks, and home-relative setups, so use this Pi package when you want package-managed Pi resources and bundled dependencies.

## Limitations

- pi-teams currently discovers predefined agents and team templates from global or project-local locations, not package-local files. Radical Pipelines team definitions should be registered globally in `~/.pi/teams.yaml`; agent profiles should be available either repository-locally in `.pi/agents/` or user-locally/globally in `~/.pi/agent/agents/`, before predefined Radical Pipelines teams are visible.
- Local validation used Pi print mode, not a full manual interactive UI pass.
- Local validation on Node v20.14.0 produced npm `EBADENGINE` warnings from transitive dependencies and two moderate `npm audit` findings.
- Bundled dependency resource paths may need updates if future `pi-teams` or `@zenobius/pi-worktrees` releases move their Pi resources.
- Open PRs may change nearby guidance later: PR #6 may improve pi-teams examples, PR #10 may change convention setup, and PR #12 may add orchestration safeguards. This package does not depend on those PRs being merged.
