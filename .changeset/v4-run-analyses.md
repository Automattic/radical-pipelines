---
"@automattic/radical-pipelines": patch
---

Fix the mechanisms the analyses of finished runs exposed. A role writes only in a thread it opens or one that awaits it; a closed thread is history. The spec producer reads its spec as the design doc's producer would. A role whose file `rp check` rejects is woken with the `INVALID` lines under a new **Malformed files** slot of its assignment and fixes them first. The files the orchestrator prepares for a role, such as the net change a reviewer reads, live beside the role's assignment in its worktree's git directory. On opencode, a running role is stopped with `POST /api/session/<id>/interrupt`, together with its subagents, and its session is kept as its transcript; on Claude Code, `TaskStop` keeps the transcript too. `rp stamp --pin` accepts paths relative to the pipeline folder as well as absolute ones, and reports a path that is not a file as unreadable, naming the path it tried.
