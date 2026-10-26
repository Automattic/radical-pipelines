---
"@automattic/radical-pipelines": patch
---

Complete a build or document phase on the approval of its plan when the plan has no tasks, instead of stopping the run to re-dispatch the plan producer: with no work delivered there is nothing for a phase review to judge, so none runs. After a build without tasks, the document plan pins the build plan's approval in place of a build review.
