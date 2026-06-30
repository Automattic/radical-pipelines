---
"@automattic/radical-pipelines": minor
---

Hold every pipeline run's host-project output to two always-on rules, with no opt-out and no owner action. A change now leaves comments and prose it did not touch exactly as they were, and the product it ships — code, tests, documentation, and commit messages — reads as if written by hand, with no trace of the pipeline that produced it. Both rules are enforced at the existing per-phase review gate, where a violation is a must-fix issue that blocks the phase until it is resolved.
