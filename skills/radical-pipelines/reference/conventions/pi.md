# Pi Rules

When the active agentic coding tool is Pi, use Pi-specific team tools.

## Canonical `.rp.md` content for Pi

```markdown
## Worktree root

Worktrees live under `<worktree-root>` (suggested: `.pi/worktrees`). The orchestrator creates and removes them with raw `git worktree` shell commands — one worktree per branch, at `<worktree-root>/<branch>`. Agents never run `git worktree`; each occupies the worktree named in its Conventions block.

## Team spawning

Use one `pi-teams` team per run, named after the run branch. Prefer `create_predefined_team`; otherwise use `team_create` plus `spawn_teammate`. `spawn_teammate` supports a per-agent `cwd`: always set it to the agent's worktree. Pass each agent's model and settings, resolved from the **Agent models** convention, as spawn parameters. Agents message the orchestrator when their work completes.

Agents in the same team address each other directly via pi-teams messaging. When a phase reference says two agents exchange messages, the orchestrator does not relay between them by default. It only spawns, monitors, and waits for completion signals.

If an agent-to-agent message fails (e.g. the target agent is unreachable, errors out, or stops responding), the orchestrator may step in to investigate and try to recover — for example, by re-delivering the message, restarting the affected agent, or relaying directly as a fallback. Intervention is for repair only; once the exchange is healthy again, the agents resume talking to each other directly.

Prefer explicit provider-qualified models (`provider/model`). If a spawn fails with login/API-key errors, do not run `/login` first: run `pi --list-models`, pick an authenticated provider-qualified model **other than the one that just failed**, and retry — this recovery fallback is distinct from the per-agent **Agent models** config and must not re-select the failed model. If none is available, stop and ask the owner to authenticate or choose a model.

## Health monitoring

Use the `@pi-agents/loop` package, bundled by the Radical Pipelines Pi package. It ships the same `/loop` syntax as Claude Code's bundled skill, plus `/loop-list` and `/loop-kill`. Only the autonomous workflow launches the monitor; assisted runs do not.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.

The orchestrator starts the loop itself; the owner is not asked to run the command. Cancel the loop on run close-out and after any owner-requested interruption.
```

## Setup actions

Pi requires the Radical Pipelines agent definitions to be discoverable. Step 3 of `setup.md` installs them after conventions have been collected.

### Check existing agent installations

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
