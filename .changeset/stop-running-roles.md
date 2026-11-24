---
"@automattic/radical-pipelines": minor
---

BREAKING: Remove the terminations `rp next` planned and the `before-terminating-agent` and `after-terminating-agent` lifecycle hooks, in conventions version 8.

A role whose turn ended has nothing to stop, and its session stays so it can be resumed or inspected. `rp next` no longer plans terminations: a consolidation removes the production lanes' worktrees and branches, between the worktree hooks, and the loop's step that terminated them is gone. "Terminate" becomes "stop", which each tool file defines: on opencode it interrupts the role's session and its subagents, so it also reaches a subagent left running by a failed turn, and on Claude Code it stops a running role. The orchestrator stops every role at close-out, the roles under a changed lane, and a role before health monitoring spawns its new instance. Health monitoring wakes a dead role again on the first attempt, which resumes its session unless waking it calls for a new instance, and spawns a new instance on the second.

Migrating a `.rp.md` to conventions version 8 offers to move each instruction of the removed hooks: one about a lane's role to `before-removing-worktree` or `after-removing-worktree`, and one about the roles without a lane to `run-ended`, which names no role, so the instruction must cover each of them.
