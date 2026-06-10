---
"@automattic/radical-pipelines": minor
---

Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by re-running the phases as an additional run on the same branch. Phase folders now live under run folders: the original run is recorded as `base/` at pipeline creation and is never rewritten, and each review adds a sibling `review-N-<short-description>/` run.
