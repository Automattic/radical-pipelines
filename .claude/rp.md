## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

## Pipeline slugs

Use `<issue-number>-<short-description>` where issue number is the GitHub issue number.

## Worktrees

Folder: `.claude/worktrees/<pipeline-slug>`
Enter worktree: `EnterWorktree` with name: `<pipeline-slug>`
Exit worktree: `ExitWorktree` with name: `<pipeline-slug>`

## Branch names

Created automatically by `EnterWorktree`: `worktree-<pipeline-slug>`

## Pipeline artifact folders

Use `.pipelines/<pipeline-slug>`.

## Spawning teams of agents

Use `TeamCreate`.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
