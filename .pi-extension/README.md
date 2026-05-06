# Radical Pipelines Pi package

This Pi package installs the Radical Pipelines skill, phase agent profiles, pi-teams team templates, and bundled Pi package dependencies for `pi-teams` and `@zenobius/pi-worktrees`.

## What it includes

- Skill: `skills/radical-pipelines/SKILL.md`.
- Agents: `prompt-writer` and `spec-writer`. Additional phase agents (`designer`, `planner`, `implementer`, `documenter`) will ship when the `radical-pipelines` skill enables those phases.
- Team templates: `radical-pipelines-spec`. The full `radical-pipelines` team will ship alongside the remaining phase agents.
- Bundled dependency resources loaded through `node_modules/...`: `pi-teams` and `@zenobius/pi-worktrees`.

No prompt templates or themes are currently included.

## Install

Global install after publication:

```bash
pi install npm:@automattic/radical-pipelines-pi
```

Project-local/shared install after publication:

```bash
pi install npm:@automattic/radical-pipelines-pi -l
```

Development install before publication:

```bash
cd .pi-extension
npm install
cd ..
pi install ./.pi-extension -l
```

`npm install` is required for local-path development installs so the bundled `node_modules/pi-teams/...` and `node_modules/@zenobius/pi-worktrees/...` resources exist before Pi loads the package.

## Verify

Package contents:

```bash
cd .pi-extension
npm install
npm pack --dry-run
```

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

- `npm pack --dry-run` succeeded and included the package README, agents, package manifest, skill files, reference docs, team templates, and bundled dependencies.
- `pi install ./.pi-extension -l && pi list` succeeded; in this worktree `pi list` showed project package `../.pi-extension`.
- `/skill:radical-pipelines` succeeded with `Ready. What pipeline/task would you like to start?`.
- pi-teams predefined discovery found `radical-pipelines-spec`; creating `radical-pipelines-spec` spawned the prompt/spec writer agents in a smoke test.

## Usage

1. Install the package globally or project-locally.
2. Start the workflow with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
3. Use pi-teams predefined team creation with the `radical-pipelines-spec` template.

The target project still needs Radical Pipelines conventions, typically in `AGENTS.md`, a CLI-specific `.pi/rp.md`, or a dedicated conventions skill. Those conventions should define task lookup, pipeline slug format, `.pipelines/<pipeline-slug>` artifact folders, `/worktree` setup, branch naming, team spawning, and commit format.

## Bundled dependencies

The package declares `pi-teams`, `@zenobius/pi-worktrees`, and the `@sinclair/typebox` runtime dependency needed by the current `pi-teams` release in both `dependencies` and `bundledDependencies`. Pi resources from those dependencies are referenced through package-local `node_modules/...` paths in `package.json`.

Pi core packages are wildcard `peerDependencies` and are not bundled: `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`, and `typebox`.

## Fallback skill install

The skill-only fallback remains:

```bash
npx skills add Automattic/radical-pipelines
```

That command does not install Pi extensions, `pi-teams`, `@zenobius/pi-worktrees`, or predefined team files. Skill install paths can vary across CLIs, symlinks, and home-relative setups, so use this Pi package when you want automated setup.

## Limitations

- pi-teams currently discovers predefined agents and team templates from global or project-local locations, not package-local files, so project-local `.pi/agents/*.md` and `.pi/teams.yaml` may need to be set up before predefined Radical Pipelines teams are visible.
- Local validation used Pi print mode, not a full manual interactive UI pass.
- Local validation on Node v20.14.0 produced npm `EBADENGINE` warnings from transitive dependencies and two moderate `npm audit` findings.
- Bundled dependency resource paths may need updates if future `pi-teams` or `@zenobius/pi-worktrees` releases move their Pi resources.
- Open PRs may change nearby guidance later: PR #6 may improve pi-teams examples, PR #10 may change convention setup, and PR #12 may add orchestration safeguards. This package does not depend on those PRs being merged.
