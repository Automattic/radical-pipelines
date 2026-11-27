---
"@automattic/radical-pipelines": minor
---

Keep a pipeline's lane worktrees until the pipeline closes, and give each review lane a supporting folder that its reviewer and the implementer share.

`rp stop` is removed, and close-out no longer removes lane worktrees when a run ends. A pipeline's worktrees stay on the machine until `rp close` removes them, once the pipeline is merged or closed without merging; `rp next` still removes the production lanes' worktrees at a consolidation. A run that stops, completes, or escalates leaves every lane as it was, with the files its roles left there, for the next run or for the owner's decision.

A review lane's supporting folder is `4-review/<lane>/` in the pipeline folder. It is part of the lane's view, so the reviewer reads in its worktree what the implementer writes there, and the reviewer's commits there land on the pipeline branch. The reviewer's assignment names it as its supporting folder: what its review rests on goes there, cited by its path and committed, since the implementer sees no other file of the reviewer's worktree. The implementer puts there the evidence a message in a reviewer's thread cites, and cites nothing else of the pipeline that the reviewer's worktree lacks, such as the spec, the design doc, or its notes.
