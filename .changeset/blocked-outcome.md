---
"@automattic/radical-pipelines": minor
---

Add the `blocked` task-report outcome: the product was not observed and the report names what prevented it. A blocked report is never a trigger — `rp check` names the task as `blocked <phase>/T<n>` for the orchestrator to restore the environment and re-dispatch; the next attempt is a new report. A blocker stays what an agent raises before its first write.
