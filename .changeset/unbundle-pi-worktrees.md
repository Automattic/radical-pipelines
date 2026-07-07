---
"@automattic/radical-pipelines": patch
---

Stop bundling `@zenobius/pi-worktrees`: worktree handling is raw `git worktree` owned by the orchestrator, so the extension is no longer used.
