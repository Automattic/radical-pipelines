# Passing Conventions to Agents

Each time the orchestrator spawns an agent, it includes a `## Conventions` block at the top of that agent's initial prompt, each field labeled exactly as shown:

- **Artifact folder:** the absolute path to the active run's folder (e.g. `<artifacts-folder>/base/`).
- **Commit format:** the commit message format the agent must use. Omit when the project defines none.
- **Guardrails:** → the running agents (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`): the gates naming this agent — one per line as a name and its exact command. For a scoped gate, that command is the resolved command after `{scope}` substitution. Omit when no gate names it.
- **Guardrail scopes to fill:** → the code-plan pair (`code-plan-writer`, `code-plan-reviewer`) and the doc-plan pair (`doc-plan-writer`, `doc-plan-reviewer`): the scoped gates whose `{scope}` that plan must supply — those whose agents run in that pair's phase — one per line as the gate's command template and its `fill-guidance`. Omit when that phase runs no scoped gate.

Agent models are not a `## Conventions` field: the orchestrator resolves each agent's model and settings via the **Agent models** convention and applies the result as parameters of the spawn itself.

Agents commit their own artifacts following the **Commit format** convention. The orchestrator does not commit on their behalf.

See `reference/guardrails.md` for the guardrail model.
