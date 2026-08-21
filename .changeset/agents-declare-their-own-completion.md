---
"@automattic/radical-pipelines": minor
---

Agents declare their own completion instead of it being inferred from turn activity. Every agent profile directs the agent to declare completion when its work ends — under opencode by calling the new `rp_request_termination` tool, which notifies the spawner once; under Claude Code with a completion message to the spawner, on which the orchestrator sends the shutdown request. The opencode plugin's first-turn success notification is dropped, and every failed turn — not just the first — is announced to the spawner with its cause.
