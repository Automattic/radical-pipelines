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

**Agent definitions** live in `.pi/agents/`. Each agent has a defined role, allowed tools, and a system prompt tailored to its phase.

**Running a phase:**

1. **Create the team** from the phase template, scoped to the worktree directory:
   > "Create a team named `<pipeline-slug>` from the `<phase>` predefined team in `<worktree-path>`."
   
   This spawns all agents defined in the template. Each teammate automatically reads its inbox on start — wait a moment before sending tasks.

2. **Assign the first task** to the opening agent, pointing to the relevant artifact:
   > "Create a task for spec-writer: read `.pipelines/<pipeline-slug>/prompt.md` and write a draft spec to `.pipelines/<pipeline-slug>/spec-draft.md`."
   
   Use `task_create` with a clear description. The agent picks it up from its inbox.

3. **Monitor progress** using:
   - `task_list` — see all tasks and their status (`pending`, `in_progress`, `completed`).
   - `check_teammate <name>` — verify an agent is still running and read any messages it sent.
   - `read_config` — see the full team roster and agent statuses.

4. **Coordinate handoffs** between agents:
   - Use `task_create` to assign the next agent's work once the previous task is `completed`.
   - Use `send_message` to pass context or artifacts between agents (e.g., point the reviewer to the writer's output).

5. **Shut down the team** once all tasks are `completed`:
   > "Shut down the team and close the panes."
   
   This calls `team_delete` and cleans up terminal panes. Agents should call `process_shutdown_approved` before exiting; use `force_kill_teammate` if one is unresponsive.

## Commits

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`
