---
"@automattic/radical-pipelines": patch
---

Define the artifact base branch as where pipelines start, not where they merge. Merging a pull request no longer merges the pipeline branch into the artifact base: in `artifacts-in-repo` merging the pull request already does it, and in `artifacts-in-fork` the pipeline stays on its branch, keeping the fork's base branch free of pipeline artifacts.
