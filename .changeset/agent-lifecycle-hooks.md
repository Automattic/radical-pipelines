---
"@automattic/radical-pipelines": minor
---

Add `before-spawning-agent`, `after-spawning-agent`, `before-terminating-agent`, and `after-terminating-agent` lifecycle hooks, so a project can prepare a per-agent environment before each agent starts and release it when the agent is terminated. The Resources convention now states that a resource's prose is for agents, while what the orchestrator starts, resets, and stops belongs in Lifecycle hooks.
