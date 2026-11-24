---
"@automattic/radical-pipelines": minor
---

BREAKING: Stop only the roles still running, and remove the `before-terminating-agent` and `after-terminating-agent` lifecycle hooks.

A role whose turn ended has nothing to stop, and its session stays so it can be resumed or inspected. The orchestrator now stops a role only while it runs: at close-out, when a lane it works under changes, and when health monitoring replaces a stalled role. `rp next` no longer plans terminations: a consolidation removes the production lanes' worktrees and branches, between the worktree hooks, and the loop's step that terminated them is gone. A dead role is woken again first, which resumes its session when it still exists, and spawned as a new instance on the second attempt.

A project that configured `before-terminating-agent` or `after-terminating-agent` moves those instructions to `before-removing-worktree` or `after-removing-worktree` for what a lane's role used, or to `run-ended` for what a run used.
