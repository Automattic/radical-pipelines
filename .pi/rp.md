## Pi prerequisites

This project requires the Radical Pipelines Pi package. It is declared in `.pi/settings.json` and pi installs it automatically on startup. The package bundles `pi-teams` and `@zenobius/pi-worktrees`. If for any reason it is missing, install it manually:

```bash
pi install ./.pi-extension -l
```

## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

For GitHub issue tasks, associated implementation work means associated pull requests. Before starting a pipeline for an issue, check for associated pull requests with `gh api graphql` by inspecting the issue timeline for `CONNECTED_EVENT` and `CROSS_REFERENCED_EVENT` entries whose subject/source is a pull request. If any are found, warn the owner with the PR number, title, state, URL, and merged status, then stop unless the owner explicitly confirms continuing.

## Pipeline slugs

Use `<issue-number>-<short-description>` where issue number is the GitHub issue number.

## Pi worktrees

This project uses the `@zenobius/pi-worktrees` plugin. Always use `/worktree` commands — never raw `git worktree` commands.

**One-time setup** (only needed once per machine, sets the worktree root for this project):
```
/worktree settings worktreeRoot .pi/worktrees
```

- **Create:** `/worktree create worktree-<pipeline-slug> --name <pipeline-slug>`
- **Remove:** `/worktree remove <pipeline-slug>`

## Pi branch names

Created as `worktree-<pipeline-slug>` (the branch argument passed to `/worktree create`).

## Pipeline artifact folders

Use `.pipelines/<pipeline-slug>`.

## Pi team spawning

Use `pi-teams`.

When spawning a Pi teammate, prefer an explicit provider-qualified model (`provider/model`) from the owner's authenticated providers instead of an ambiguous bare model name.

If a spawned Pi teammate fails with a provider login or API-key error:

1. Treat the failed provider as unavailable for this retry unless the owner explicitly asked to use that provider.
2. Do not run `/login` or ask for credentials as the first recovery step.
3. Run `pi --list-models` from the same environment used to spawn teammates.
4. Choose a provider-qualified replacement model from authenticated providers. Prefer the owner's configured default provider/model when present; otherwise choose the closest suitable authenticated model for coding work.
5. Retry the spawn with the explicit `provider/model` value. Reusing the same teammate name is acceptable when `pi-teams` replaces or kills the failed teammate automatically; otherwise remove or rename the failed teammate before retrying.
6. If no authenticated model is available, stop and tell the owner which provider failed and that they need to authenticate a provider or pass an explicit provider-qualified model.

Keep this recovery provider-neutral. Do not hardcode any provider as the fallback default.

## Pi agent setup

Before launching a Pi team, verify the required phase agent definitions are discoverable by checking repository-local `.pi/agents/` first, then user-local/global `~/.pi/agent/agents/`.

For this repository, the canonical phase agent source files live in `.agents/agents/` and are exposed to packages through symlinks. If required agents are missing from both Pi discovery locations, stop and ask the owner which Radical Pipelines agents to copy/paste and install, and whether to install them repository-locally in `.pi/agents/` or user-locally/globally in `~/.pi/agent/agents/`.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
