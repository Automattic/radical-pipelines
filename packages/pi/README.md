# Radical Pipelines Pi package

This Pi package installs the Radical Pipelines skill, a small setup/doctor extension, phase agent profiles, pi-teams team templates, and the bundled Pi package dependencies `pi-teams` and `@zenobius/pi-worktrees`.

## Install

Global install:

```bash
pi install npm:@automattic/radical-pipelines-pi
```

Project-local/shared install:

```bash
pi install npm:@automattic/radical-pipelines-pi -l
```

Development install before publishing:

```bash
cd packages/pi
npm install
cd ../..
pi install ./packages/pi -l
```

`npm install` is required for local-path development installs so the bundled `node_modules/pi-teams/...` and `node_modules/@zenobius/pi-worktrees/...` resources exist before Pi loads the package.

## Commands

- `/rp-doctor` verifies that the Radical Pipelines skill, bundled package resources, worktree commands, pi-teams tools, project-local agents, and team templates are available.
- `/rp-init` creates missing project-local `.pi/agents/*.md` files and `.pi/teams.yaml` templates from the package. It asks before initialization, asks again before replacing any differing file, and writes a backup before replacement.

## Usage

1. Install the package globally or project-locally.
2. Run `/rp-doctor` in the target repository.
3. Run `/rp-init` if the doctor reports missing Radical Pipelines agents or team templates.
4. Start the workflow with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
5. Use pi-teams predefined team creation with the `radical-pipelines` or `radical-pipelines-spec` templates.

## Bundled dependencies

The package declares `pi-teams`, `@zenobius/pi-worktrees`, and the `@sinclair/typebox` runtime peer needed by `pi-teams` in both `dependencies` and `bundledDependencies`, then references Pi resources through package-local `node_modules/...` paths in `package.json`. Pi core packages are peer dependencies and are not bundled.

## Fallback skill install

The skill-only fallback remains:

```bash
npx skills add Automattic/radical-pipelines
```

That command does not install Pi extensions, `/rp-doctor`, `/rp-init`, `pi-teams`, `@zenobius/pi-worktrees`, or predefined team files. Use the Pi package when you want automated setup and verification.
