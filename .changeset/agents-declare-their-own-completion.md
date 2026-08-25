---
"@automattic/radical-pipelines": minor
---

Agents declare their own completion instead of it being inferred from turn activity. Every agent profile directs the agent, when its work ends, to declare completion to its spawner with the exact statement "I declare my completion; no work remains." — inside its final report when the spawner is its recipient, as its own message otherwise — and the orchestrator terminates a session only on that declaration. The opencode plugin's first-turn success notification is dropped, and every failed turn — not just the first — is announced to the spawner with its cause.
