# Passing Conventions to Agents

Each time the orchestrator spawns an agent, it includes a `## Conventions` block at the top of that agent's initial prompt, each field labeled exactly as shown:

- **Artifact folder:**
  - Agents: all
- **Commit format:**
  - Agents: all
  - Omit when not defined.
- **Guardrails:** the gates naming this agent. For a scoped gate, that command is the resolved command after `{scope}` substitution. See `reference/guardrails.md`.
  - Agents: `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`
  - Omit when not defined or when agent doesn't have any gates.
- **Guardrail scopes to fill:** the scoped gates whose `{scope}` the plan must supply. See `reference/guardrails.md`.
  - Agents:
    - `code-plan-writer` and `code-plan-reviewer` for the scoped gates of `code` agents
    - `doc-plan-writer` and `doc-plan-reviewer` for the scoped gates of `doc` agents
  - Omit when not defined or when agents don't have any scoped gates to fill.
