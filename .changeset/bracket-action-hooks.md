---
"@automattic/radical-pipelines": minor
---

Convert the action lifecycle hooks to `before-`/`after-` pairs — `pipeline-created`, `branch-created`, `worktree-created`, and `lanes-merged` become `before-creating-pipeline-family`/`after-creating-pipeline-family`, `before-creating-branch`/`after-creating-branch`, `before-creating-worktree`/`after-creating-worktree`, and `before-merging-lanes`/`after-merging-lanes` — and remove `phase-rolled-back`.
