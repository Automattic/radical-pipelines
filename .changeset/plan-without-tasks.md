---
"@automattic/radical-pipelines": patch
---

Send an approved build or document plan with no tasks straight to its phase review, instead of stopping the run to re-dispatch its producer: the plan's review has already judged that the phase needs no tasks, and the phase review decides whether the phase is done.
