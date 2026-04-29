## Prerequisites

This project requires two pi packages. They are declared in `.pi/settings.json` and pi installs them automatically on startup. If for any reason they are missing, install them manually:

```bash
pi install npm:@zenobius/pi-worktrees -l
pi install npm:pi-teams -l
```

## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

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

Agent definitions should not hard-code provider-specific model aliases such as `opus`, because they can resolve through providers the user has not configured (for example OpenRouter) and prevent every teammate from starting. Let Pi use the current session/default model, or pass an explicit provider-qualified `default_model` when creating a team if the owner requests a specific model.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
