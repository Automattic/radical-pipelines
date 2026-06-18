# Passing Conventions to Agents

Each time the orchestrator spawns an agent, it includes a `## Conventions` block at the top of that agent's initial prompt, each field labeled exactly as shown:

- **Artifact folder:**
  - Agents: all
- **Commit format:**
  - Agents: all
  - Omit when not defined.
- **Guardrails:** place each guardrail naming this agent by its body. For a scoped command guardrail, read its chosen scope value from the plan's `## Guardrail scopes` section, substitute it into the guardrail's body, and place the resolved body; any other guardrail's body passes literally. See `reference/guardrails.md` for the model.
  - Agents: `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`
  - Omit when not defined or when agent doesn't have any guardrails.
- **Guardrail scopes to fill:** the scoped command guardrails whose `{scope}` the plan must supply. See `reference/guardrails.md`.
  - Agents:
    - `code-plan-writer` and `code-plan-reviewer` for the scoped command guardrails of `code` agents
    - `doc-plan-writer` and `doc-plan-reviewer` for the scoped command guardrails of `doc` agents
  - Omit when not defined or when agents don't have any scoped command guardrails to fill.
