# Report

Read-only. The owner wants to know where things stand: one pipeline, or everything for an issue.

1. `git fetch`.
2. One pipeline: `rp check <pipeline folder> --base <base branch> --json`. An issue: the discovery procedure in `../run/state.md` § Discovery, then the same check on each pipeline found.
3. Render, per pipeline: pipeline slug, branch, live or merged, `origin` (issue; starts-from or re-attempts), configuration (workflow, target phase, lanes), per-phase state (missing · stale · in review · approved · complete), unresolved challenges, pending claims and owner escalations, waves this episode.
4. For an issue, render it as the root of a plain-text tree (`├`, `└`, `│`, `─`) whose pipeline nodes follow their `origin` links. Append `[merged]` to every merged pipeline.

Answer questions about history from the files: reviews in wave order, task reports per attempt, constraints, proposals, and the `origin` chains of claims.
