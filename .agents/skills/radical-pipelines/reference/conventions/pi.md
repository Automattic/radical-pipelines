# Pi Rules

When the active agentic coding tool is Pi, use Pi-specific worktree and team tools.

## Canonical `.rp.md` content for Pi

```markdown
## Pi worktrees

Use `@zenobius/pi-worktrees`; never use raw `git worktree` commands.

- **Setup:** `/worktree settings worktreeRoot .pi/worktrees`
- **Create:** `/worktree create worktree-<pipeline-slug> --name <pipeline-slug>`
- **Remove:** `/worktree remove <pipeline-slug>`

Spawned teammates must use the Pi worktree as `cwd`, never the main checkout.

## Pi branch names

Use `worktree-<pipeline-slug>`; this is the branch argument passed to `/worktree create`.

## Pi team spawning

Use one `pi-teams` team per pipeline, named `<pipeline-slug>`. Prefer `create_predefined_team`; otherwise use `team_create` plus `spawn_teammate`. Always spawn agents with the worktree as `cwd`.

Agents in the same team address each other directly via pi-teams messaging. When a phase reference says two agents exchange messages, the orchestrator does not relay between them by default. It only spawns, monitors, and waits for completion signals.

If an agent-to-agent message fails (e.g. the target agent is unreachable, errors out, or stops responding), the orchestrator may step in to investigate and try to recover — for example, by re-delivering the message, restarting the affected agent, or relaying directly as a fallback. Intervention is for repair only; once the exchange is healthy again, the agents resume talking to each other directly.

Prefer explicit provider-qualified models (`provider/model`). If a spawn fails with login/API-key errors, do not run `/login` first: run `pi --list-models`, pick an authenticated provider-qualified model, and retry. If none is available, stop and ask the owner to authenticate or choose a model.
```

## Setup actions

Pi requires the Radical Pipelines agent definitions to be discoverable. Step 3 of `setup.md` installs them after conventions have been collected.

### Check existing installations

Check whether the required agents (for the target phase and execution mode) are already present:

1. Repository-local: `.pi/agents/<agent-name>.md` or `.pi/agents/<agent-name>/SKILL.md`.
2. User-local / global: `~/.pi/agent/agents/<agent-name>.md` or `~/.pi/agent/agents/<agent-name>/SKILL.md`.

Report which required agents were found in the repository, which were found globally, and which are missing. If all required agents are present, this step is a no-op.

### Install missing agents

Ask the owner whether to install the missing agents. Confirm the destination before writing — do not create or copy agent files without explicit confirmation.

Choose the install location based on the **Artifact storage** convention:

- **`artifacts-in-repo`** — recommend `.pi/agents/` (committed to the project, team picks them up on clone). Offer `~/.pi/agent/agents/` as a per-user fallback.
- **`artifacts-in-fork`** — recommend `.pi/agents/` in the fork (committed to fork branches, team collaborates through them; cherry-picks to upstream exclude them). Offer `~/.pi/agent/agents/` for solo contributors who do not want to push agents to the fork.

After installation, tell the owner to verify discovery with the Pi/pi-teams predefined-agent listing for the target project.
