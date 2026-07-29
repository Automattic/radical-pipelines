---
"@automattic/radical-pipelines": patch
---

Seat agents at every send on Claude Code: a message restarts its target in the sender's shell working directory, so the orchestrator and the health monitor `cd` into an agent's worktree before every spawn or message, and generic files no longer assert when an agent's working directory is fixed.
