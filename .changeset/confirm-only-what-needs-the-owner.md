---
"@automattic/radical-pipelines": patch
---

Ask the owner to confirm a run only when it needs them: when it writes an intent, constraint, or proposal, when its pipeline has no `run-config.md` or the request changes it, or when triage left a question open. Every other run — a reported failure or a continuation on a configured pipeline — starts under its recorded configuration without a confirmation message.
