# Passing Conventions to Agents

Each time the orchestrator spawns an agent, it includes a `## Conventions` block at the top of that agent's initial prompt, each field labeled exactly as shown:

- **Worktree path:** the absolute path of the agent's assigned worktree.
  - Agents: all
- **Branch name:** the branch checked out in that worktree.
  - Agents: all
- **Artifact folder:** `<pipeline-family-folder>/<run>` — the run's artifact folder, relative to the worktree root. Agent profiles resolve their `<artifact-folder>/…` paths against it.
  - Agents: all
- **Phase folder:** `<artifact-folder>/<phase>`, or `<artifact-folder>/<phase>/lane-<K>` when the agent works a lane — the folder for the agent's own phase's artifacts. Agent profiles resolve their `<phase-folder>/…` paths against it.
  - Agents: `spec-lead`, `spec-researcher`, `spec-reviewer`, `spec-consolidator`, `design-doc-lead`, `design-doc-researcher`, `design-doc-reviewer`, `design-doc-consolidator`
- **Lane mode:** `isolated` or `divergent`.
  - Agents: `design-doc-lead`, `design-doc-consolidator`
  - Omit when the phase runs a single lane.
- **Lane mandate:** the mandate assigned to the agent's divergent lane, resolved once by the orchestrator and passed identically to the lane's lead and each of its reviewers.
  - Agents: `design-doc-lead`, `design-doc-reviewer`
  - Omit outside a divergent lane, including consolidation review.
- **Requester identifier:** the identifier of the agent this researcher answers to.
  - Agents: `spec-researcher`, `design-doc-researcher`
- **Commit format:**
  - Agents: all
  - Omit when not defined.
- **Guardrails:** place the gates naming this agent. For a scoped gate, read its chosen scope value from the phase plan's `## Guardrail scopes` section, substitute it into the gate's `{scope}` command, and place the resolved command; a fixed gate's command passes literally. See `../guardrails.md` for the model.
  - Agents: `build-writer-tdd`, `build-writer-e2e`, `build-reviewer`, `document-writer`, `document-reviewer`
  - Omit when not defined or when the agent has no gates.
- **Guardrail scopes to fill:** the scoped gates whose `{scope}` the plan must supply, each as its full per-gate block (command template and fill-guidance). See `../guardrails.md`.
  - Agents:
    - `build-planner` and `build-plan-reviewer` for the scoped gates of build agents
    - `document-planner` and `document-plan-reviewer` for the scoped gates of document agents
  - Omit when not defined or when the agents have no scoped gates to fill.
