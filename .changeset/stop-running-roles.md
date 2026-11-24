---
"@automattic/radical-pipelines": minor
---

BREAKING: Stop only the roles still running, and remove the `before-terminating-agent` and `after-terminating-agent` lifecycle hooks, in conventions version 8.

A role whose turn ended has nothing to stop, and its session stays so it can be resumed or inspected. The orchestrator now stops a role at close-out and under a changed lane only while it runs, and stops a role before health monitoring spawns its new instance. `rp next` no longer plans terminations: a consolidation removes the production lanes' worktrees and branches, between the worktree hooks, and the loop's step that terminated them is gone. A dead role is woken again first, which resumes its session when it still exists, and replaced by a new instance on the second attempt.

Migrating a `.rp.md` to conventions version 8 offers to move each instruction of the removed hooks: one about a lane's role to `before-removing-worktree` or `after-removing-worktree`, and one about the roles without a lane to `run-ended`, which names no role, so the instruction must cover each of them.
