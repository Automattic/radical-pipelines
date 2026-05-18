# Agent Spawn Context

Every time the orchestrator spawns a team agent — in any phase, in any workflow — the spawn prompt must begin with the same standard **agent spawn context**. This is what frees agents from rediscovering project conventions on their own and keeps them focused on their actual job.

## Contents

The agent spawn context must include:

- **Artifacts folder** — the absolute path to the pipeline's artifacts folder (typically `.pipelines/<pipeline-slug>/`). Agents read and write artifacts there.
- **Commit format** — the project's commits convention rendered for the spawning agent, including a concrete example (e.g. `Add requirements (spec-analyst)`).

Both values come from the project conventions loaded at the start of the workflow (see `loading-conventions.md`). The orchestrator resolves them once and passes them into every spawn prompt verbatim.

## Naming

Agent profiles refer to the values as **"the artifacts folder"** and **"the commit format"**. Use those exact labels in the spawn prompt so the agent's instructions line up with what it receives.

## What does NOT belong here

Per-invocation specifics — the draft number K for a multi-mode write, the review round N, the latest `spec-review-N.md` path to address, the spec generation mode, the question to investigate, the file under review, etc. — go in the rest of the spawn prompt, not in the agent spawn context. The agent spawn context stays uniform across every agent and every spawn; per-invocation details belong to the specific call.

## When to include it

Always, when spawning any team agent. This includes:

- Single-shot spawns (e.g. launching `spec-writer` to produce `spec.md`).
- Persistent agents (e.g. `spec-analyst` and `researcher` for the Q&A loop) — include the context in the initial spawn prompt that starts the persistent session.

Subsequent messages routed to a persistent agent during its session do not need to repeat the context — it was set in the initial spawn.
