---
"@automattic/radical-pipelines": minor
---

Add an optional per-gate `level` to code-phase guardrails so a project can scope each gate to the writer, the reviewer, or both: writers run cheap gates on every commit while reviewers run the expensive suites once, and the reviewer fails fast on a cheaper finding before spending the costly ones.
