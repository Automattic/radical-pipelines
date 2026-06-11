---
"@automattic/radical-pipelines": minor
---

Add run summaries: every pipeline run now produces a `run-summary.md` at the run root upon phase 5 completion, capturing what was built, why, how, and any relevant context in a format the project can override via an optional convention file. Review runs receive prior runs' summaries as input, giving agents a concise record of what earlier runs decided and why.
