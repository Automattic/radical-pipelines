## Managing tasks

All the tasks are issues stored in this repository: https://github.com/Automattic/radical-pipelines.

To manage them, always use the `gh` CLI.

For GitHub issue tasks, associated implementation work means associated pull requests. Before starting a pipeline for an issue, check for associated pull requests with `gh api graphql` by inspecting the issue timeline for `CONNECTED_EVENT` and `CROSS_REFERENCED_EVENT` entries whose subject/source is a pull request. If any are found, warn the owner with the PR number, title, state, URL, and merged status, then stop unless the owner explicitly confirms continuing.

## Pipeline slugs

Use `<issue-number>-<short-description>` where issue number is the GitHub issue number.

## Claude Code worktrees

Folder: `.claude/worktrees/<pipeline-slug>`
Enter worktree: `EnterWorktree` with name: `<pipeline-slug>`
Exit worktree: `ExitWorktree` with name: `<pipeline-slug>`

## Claude Code branch names

Created automatically by `EnterWorktree`: `worktree-<pipeline-slug>`

## Pipeline artifact folders

Use `.pipelines/<pipeline-slug>`.

## Claude Code team spawning

Use `TeamCreate`.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
