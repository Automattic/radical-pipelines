# Design: Pi Packaging Support for Radical Pipelines

## Decision

Use a dedicated Pi package as the primary distribution, with a small Radical Pipelines Pi extension for verification/setup, and keep the current skill-first installation as a documented fallback only.

This is preferable to a pure skill-first distribution because Pi packages can install skills and extensions together, declare npm dependencies, and bundle other Pi packages. A skill-only install (`npx skills add automattic/radical-pipelines`) has a simpler cross-CLI story, but it cannot reliably expose Pi-only extensions or `pi-teams` agent/team definitions without path-sensitive manual copying. The package path gives Pi users one install surface and lets Radical Pipelines automate or clearly verify the remaining project-local setup.

## Package layout

Add a package under `packages/pi/`:

```text
packages/pi/
  package.json
  extensions/radical-pipelines.ts
  skills/radical-pipelines/SKILL.md
  agents/
    prompt-writer.md
    spec-writer.md
    # designer.md, planner.md, implementer.md, documenter.md will be added when
    # the radical-pipelines skill enables phases beyond Prompt + Spec.
  teams.yaml
  prompts/                 # optional, only if reusable prompt templates are added
  README.md                # package-specific install/verification notes
```

`skills/radical-pipelines/SKILL.md` should be copied or generated from the current `.agents/skills/radical-pipelines/SKILL.md`, with Pi-specific references for package installation and verification. Keep Radical Pipelines-owned files under `extensions/`, `skills/`, `agents/`, `teams.yaml`, and `prompts/`; reference third-party bundled resources only through `node_modules/...` paths.

## `package.json` shape

Use a Pi-recognized package manifest:

```json
{
  "name": "@automattic/radical-pipelines-pi",
  "keywords": ["pi-package", "radical-pipelines"],
  "type": "module",
  "files": ["extensions", "skills", "agents", "teams.yaml", "prompts", "README.md"],
  "dependencies": {
    "pi-teams": "^0.9.14",
    "@zenobius/pi-worktrees": "^0.2.0"
  },
  "bundledDependencies": ["pi-teams", "@zenobius/pi-worktrees"],
  "peerDependencies": {
    "@mariozechner/pi-coding-agent": "*",
    "@mariozechner/pi-ai": "*",
    "@mariozechner/pi-tui": "*",
    "typebox": "*"
  },
  "pi": {
    "extensions": [
      "extensions/radical-pipelines.ts",
      "node_modules/pi-teams/extensions/index.ts",
      "node_modules/@zenobius/pi-worktrees/dist/index.js"
    ],
    "skills": [
      "skills",
      "node_modules/pi-teams/skills"
    ],
    "prompts": ["prompts"],
    "themes": []
  }
}
```

If no prompts are added, omit `prompts` from `files` and use an empty or omitted `pi.prompts` entry. Do not bundle Pi core packages.

## Extension responsibilities

`extensions/radical-pipelines.ts` should be intentionally small:

- Register a `/rp-doctor` command that verifies:
  - the Radical Pipelines skill is loaded;
  - `pi-teams` commands/tools are available;
  - `@zenobius/pi-worktrees` commands are available;
  - expected Radical Pipelines agent profiles and team template are available to `pi-teams`.
- Register a `/rp-init` command that, after user confirmation, writes or updates project-local `.pi/agents/*.md` and `.pi/teams.yaml` from the packaged `agents/` and `teams.yaml` files when missing.
- Never overwrite user-modified project-local agent/team files without confirmation and a diff/backup message.
- Use `import.meta.url` to resolve the package root so npm, git, local-path, and symlink installs work.

This bridges the current `pi-teams` discovery model, which reads agent definitions from `~/.pi/agent/agents` or project `.pi/agents` and team templates from `~/.pi/teams.yaml` or `.pi/teams.yaml`, while avoiding manual file copying by users.

## Installation and usage UX

Primary install:

```bash
pi install npm:@automattic/radical-pipelines-pi
```

Project-local/shared install:

```bash
pi install npm:@automattic/radical-pipelines-pi -l
```

Development install before publishing:

```bash
pi install ./packages/pi -l
```

After install:

1. Run `/rp-doctor` to see package, skill, extension, worktree, team, and agent status.
2. Run `/rp-init` in a repository to install/update project-local `.pi/agents` and `.pi/teams.yaml` if required.
3. Start the workflow with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
4. Use `pi-teams` predefined team creation for phase teams once templates are present.

Fallback skill-first install remains documented as:

```bash
npx skills add automattic/radical-pipelines
```

When using the fallback, the skill must explain that Pi extensions are not installed by that command and must prompt the user to install `pi-teams` and `@zenobius/pi-worktrees` with `pi install`. Any bundled sub-agent profiles should live under a skill-relative `agents/` folder, and startup instructions should tell users to run the package path when they want automated setup.

## Verification

Implementer/tester should verify:

- `npm pack --dry-run` from `packages/pi` includes only intended package files.
- `pi install ./packages/pi -l` adds the package to `.pi/settings.json` and loads without startup errors.
- `pi list` shows the Radical Pipelines package.
- `/skill:radical-pipelines` is available.
- `/rp-doctor` reports `pi-teams`, `@zenobius/pi-worktrees`, Radical Pipelines agents, and team templates accurately before and after `/rp-init`.
- Creating a predefined Radical Pipelines phase team through `pi-teams` works after initialization.
- `node_modules/pi-teams/...` and `node_modules/@zenobius/pi-worktrees/...` resources are loaded from the bundle, not assumed to be separately installed.

## Documentation updates

Update root `README.md` and `packages/pi/README.md` to document:

- what the package installs: Radical Pipelines skill, setup/doctor extension, phase agent profiles, team template, `pi-teams`, and `@zenobius/pi-worktrees`;
- global vs project-local install commands;
- `/rp-doctor` and `/rp-init` usage;
- how bundled Pi package dependencies are declared and referenced through `node_modules/...`;
- fallback `npx skills add` limitations;
- required project conventions (`AGENTS.md`, `.pi/rp.md`, pipeline artifact folder, worktree root).

Account for open PRs without depending on them: PR #6 may improve `pi-teams` examples, PR #10 may change convention setup, and PR #12 may add orchestration safeguards. The implementation should not assume any of those PRs have merged.

## Risks

- `pi-teams` package manifests currently use `@sinclair/typebox` while Pi package docs call out `typebox`; follow Pi docs/spec for this package and adjust only if install testing proves otherwise.
- `pi-teams` does not discover package-local `agents/` or `teams.yaml`, so `/rp-init` is required unless upstream adds package-scoped predefined teams.
- Bundling third-party Pi packages can increase package size and may require repacking whenever their resource paths change.
- Project-local initialization writes files; commands must be conservative, confirm changes, and avoid clobbering user templates.
- Skill-first fallback remains less reliable because resolving installed skill paths across symlinks and home-relative installs is ambiguous.
