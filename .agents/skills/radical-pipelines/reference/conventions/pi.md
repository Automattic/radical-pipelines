# Pi Rules

When the active agentic coding tool is Pi, Radical Pipelines needs its agent definitions installed where Pi can discover them.

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
