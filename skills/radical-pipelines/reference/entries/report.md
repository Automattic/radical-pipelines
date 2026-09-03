# Report

Read-only. The owner wants to know where things stand: one pipeline, or everything for an issue.

1. `git fetch`.
2. One pipeline: `rp check <pipeline folder> --lanes <declared lanes> --target-phase <n>`. An issue: the discovery procedure in `../run/state.md` § Discovery, then `rp check` on each pipeline found.
3. Render, per pipeline: slug, branch, live or merged, `origin` (issue; starts-from or re-attempts), per-phase state (missing · stale · in review · approved · complete), unresolved triggers, pending claims and owner escalations, waves this episode, the open amendment branch.
4. For an issue, draw the pipelines as a tree by their `origin` links.

Answer questions about history from the files: reviews in iteration order, task reports per attempt, amendments and the `origin` chains of claims.
