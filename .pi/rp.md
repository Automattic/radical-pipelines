## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

## Pipeline slugs

Use `<issue-number>-<short-description>` where issue number is the GitHub issue number.

## Worktrees

Folder: `.pi/worktrees/<pipeline-slug>`
Create worktree: `git worktree add .pi/worktrees/<pipeline-slug> -b worktree-<pipeline-slug>`
Remove worktree: `git worktree remove .pi/worktrees/<pipeline-slug>`

## Branch names

Created with `-b worktree-<pipeline-slug>` when adding the worktree.

## Pipeline artifact folders

Use `.pipelines/<pipeline-slug>`.

## Spawning teams of agents

Pi has no built-in team spawning primitive (its core tools are `read`, `write`, `edit`, `bash`). The approach for team-based workflows under Pi is not yet finalized — ask the owner before proceeding.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
