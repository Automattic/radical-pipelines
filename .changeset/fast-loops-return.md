---
"@automattic/radical-pipelines": patch
---

Bound opencode health-loop server requests and ticks so one unanswered request cannot stop a loop or wedge `rp_loop_cancel`
