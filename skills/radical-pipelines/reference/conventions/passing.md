# Passing Conventions to Agents

Each time the orchestrator spawns an agent, it includes a `## Conventions` block at the top of that agent's initial prompt, each field labeled exactly as shown:

- **Worktree path:** the absolute path of the agent's assigned worktree.
  - Agents: all
- **Branch name:** the branch checked out in that worktree.
  - Agents: all
- **Artifact folder:** `<pipeline-family-folder>/<run>` — the folder where the agent reads and writes all of its artifacts. Agent profiles resolve their inputs and outputs as `<artifact-folder>/…` paths.
  - Agents: all
- **Commit format:**
  - Agents: all
  - Omit when not defined.
- **Guardrails:** place the gates naming this agent. For a scoped gate, read its chosen scope value from the phase plan's `## Guardrail scopes` section, substitute it into the gate's `{scope}` command, and place the resolved command; a fixed gate's command passes literally. See `../guardrails.md` for the model.
  - Agents: `build-writer-tdd`, `build-writer-e2e`, `build-reviewer`, `document-writer`, `document-reviewer`
  - Omit when not defined or when the agent has no gates.
- **Guardrail scopes to fill:** the scoped gates whose `{scope}` the plan must supply, each as its full per-gate block (command template and fill-guidance). See `../guardrails.md`.
  - Agents:
    - `build-plan-writer` and `build-plan-reviewer` for the scoped gates of build agents
    - `document-plan-writer` and `document-plan-reviewer` for the scoped gates of document agents
  - Omit when not defined or when the agents have no scoped gates to fill.
