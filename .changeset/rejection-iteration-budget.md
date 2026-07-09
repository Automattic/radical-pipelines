---
"@automattic/radical-pipelines": patch
---

Rejection loops are checkpointed: every five consecutive rejections the orchestrator inspects their cause and stops the run only when the same pattern repeats and could perpetuate indefinitely, with an owner-tunable budget.
