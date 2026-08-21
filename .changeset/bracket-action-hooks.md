---
"@automattic/radical-pipelines": minor
---

Convert the action lifecycle hooks to `before-`/`after-` pairs — `branch-created`, `worktree-created`, and `lanes-merged` become `before-creating-branch`/`after-creating-branch`, `before-creating-worktree`/`after-creating-worktree`, and `before-merging-lanes`/`after-merging-lanes` — and remove `phase-rolled-back`.
