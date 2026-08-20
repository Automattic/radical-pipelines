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
  - Omit when the phase runs a single lane, and for a lead launched with a decision request.
- **Lane mandate:** the mandate assigned to the agent's divergent lane, resolved once by the orchestrator and passed identically to the lane's lead and each of its reviewers.
  - Agents: `design-doc-lead`, `design-doc-reviewer`
  - Omit outside a divergent lane, including consolidation review.
- **Requester identifier:** the identifier of the requesting agent this agent answers to.
  - Agents: `spec-researcher`, `design-doc-researcher`, `spec-lead`, `design-doc-lead`
  - For leads, only when launched with a decision request; omit otherwise.
- **Commit format:**
  - Agents: all
  - Omit when not defined.
- **Guardrails:** the rules naming this agent, each as its per-guardrail block. See `../guardrails.md` for the model.
  - Agents: all
  - Omit when not defined or when no rule names the agent.
