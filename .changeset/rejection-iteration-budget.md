---
"@automattic/radical-pipelines": patch
---

Rejection loops are checkpointed: every three consecutive rejections the orchestrator inspects their cause and stops the run only when the same pattern repeats and could perpetuate indefinitely.
