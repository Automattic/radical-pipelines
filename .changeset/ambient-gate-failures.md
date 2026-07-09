---
"@automattic/radical-pipelines": patch
---

Gate failures are never classified as pre-existing or environmental without proof. Reviewers require reproducing the identical failure on the run's diff base before treating a failure as ambient; writers fix the failure or report a blocker instead of committing around it; the untouched-test heuristic is forbidden for both.
