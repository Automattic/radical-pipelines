---
"@automattic/radical-pipelines": patch
---

Require reproducing the identical failure on the run's diff base before any gate failure is classified as pre-existing or environmental, and forbid the untouched-test heuristic: without that evidence writers fix the failure instead of committing around it, and reviewers reject instead of approving around it, with the blocker path reserved for genuinely broken inputs or environments.
