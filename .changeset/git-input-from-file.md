---
"@automattic/radical-pipelines": patch
---

Feed Git subprocess input from a file instead of a pipe, so checking a long authored-change history no longer stalls intermittently on a child waiting for the end of its input.
