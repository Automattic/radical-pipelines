---
"@automattic/radical-pipelines": minor
---

Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by re-running the phases as an additional run on the same branch. Every pipeline now carries a `base/` run from creation (the original run, never rewritten), and each review adds a sibling `review-N-<short-description>/` run, so phase folders live under a run folder instead of directly under the pipeline folder.
