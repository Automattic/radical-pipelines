---
"@automattic/radical-pipelines": patch
---

An owner escalation stops the run through close-out, which cancels health monitoring and terminates the run's agents, instead of pausing the pipeline in place with the health loop still ticking; the owner's answer continues the pipeline through triage, as close-out and triage already described.
