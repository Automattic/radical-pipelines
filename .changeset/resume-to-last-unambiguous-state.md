---
"@automattic/radical-pipelines": minor
---

Resuming a pipeline now rolls the active phase back only to the latest committed state whose next action follows from the record alone, instead of restarting the whole phase whenever its plan was not yet approved. A full phase restart remains only as the fallback when no such state exists, and lane branches are deleted only for lanes rolled back to their start.
