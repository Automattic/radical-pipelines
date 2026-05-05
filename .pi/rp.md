## Prerequisites

This project requires the Radical Pipelines Pi package. It is declared in `.pi/settings.json` and pi installs it automatically on startup. The package bundles `pi-teams` and `@zenobius/pi-worktrees`. If for any reason it is missing, install it manually:

```bash
pi install ./packages/pi -l
```

After installation, run `/rp-doctor` to verify the package and `/rp-init` if project-local Radical Pipelines team templates or agent profiles are missing.

## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

For GitHub issue tasks, associated implementation work means associated pull requests. Before starting a pipeline for an issue, check for associated pull requests with `gh api graphql` by inspecting the issue timeline for `CONNECTED_EVENT` and `CROSS_REFERENCED_EVENT` entries whose subject/source is a pull request. If any are found, warn the owner with the PR number, title, state, URL, and merged status, then stop unless the owner explicitly confirms continuing.

## Pipeline slugs

Use `<issue-number>-<short-description>` where issue number is the GitHub issue number.

## Worktrees

This project uses the `@zenobius/pi-worktrees` plugin. Always use `/worktree` commands — never raw `git worktree` commands.

**One-time setup** (only needed once per machine, sets the worktree root for this project):
```
/worktree settings worktreeRoot .pi/worktrees
```

- **Create:** `/worktree create worktree-<pipeline-slug> --name <pipeline-slug>`
- **Remove:** `/worktree remove <pipeline-slug>`

## Branch names

Created as `worktree-<pipeline-slug>` (the branch argument passed to `/worktree create`).

## Pipeline artifact folders

Use `.pipelines/<pipeline-slug>`.

## Spawning teams of agents

Use `pi-teams`.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
