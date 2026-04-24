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

This project uses `pi-teams`. Each pipeline phase is executed by a dedicated team of agents.

**Team naming:** Use the pipeline slug as the team name.

**Phase templates** are defined in `.pi/teams.yaml`. Pick the template that matches the current phase.

**Agent definitions** live in `.pi/agents/`.

**Running a phase:**

1. Use `create_predefined_team` with the phase template name, the pipeline slug as team name, and the worktree path as `cwd`.
2. Use `task_create` to assign work to the first agent in the phase.
3. Monitor with `task_list` (task statuses) and the `check_teammate` tool (agent status + messages).
4. Use `task_create` and `send_message` to coordinate handoffs between agents.
5. Use `team_shutdown` once all tasks are `completed`.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
