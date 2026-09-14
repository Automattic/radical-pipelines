---
"@automattic/radical-pipelines": patch
---

Read committed pipeline files through one streaming git cat-file batch, preserving large and binary bodies. Report read failures with their ref and path instead of computing stale state from missing content.
