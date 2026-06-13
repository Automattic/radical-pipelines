---
"@automattic/radical-pipelines": minor
---

A code- or doc-phase guardrail can now name the agents that run it — one or more of `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer` — so a project can scope an expensive gate to the agents where it pays off. A guardrail that names no agents runs for every gate-running agent.
