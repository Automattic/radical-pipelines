---
"@automattic/radical-pipelines": minor
---

BREAKING: Remove `rp stop`, keeping a pipeline's lane worktrees until `rp close`, and give each review lane a supporting folder that its reviewer and the implementer share.

`rp stop` is removed, and close-out no longer removes lane worktrees when a run ends. A pipeline's worktrees stay on the machine until `rp close` removes them, once the pipeline is merged or closed without merging; `rp next` still removes the production lanes' worktrees at a consolidation. A run that stops, completes, or escalates leaves every lane as it was, with the files its roles left there, for the next run or for the owner's decision. `rp pipelines` lists no lane branch a turn record holds a lane's turn on, so a kept production lane is not taken for a pipeline of its own.

A review lane's supporting folder is `4-review/<lane>/` in the pipeline folder. It is part of the lane's view, so the reviewer reads in its worktree what the implementer writes there, and the reviewer's commits there land on the pipeline branch. The reviewer's assignment names it as its supporting folder: what its review rests on goes there, committed and cited by its path from the pipeline folder. The implementer puts there the evidence a message in a reviewer's thread cites, and cites nothing else of the pipeline that the reviewer's worktree lacks, such as the spec, the design doc, or its notes. Every role now cites supporting material by its path from the pipeline folder, which reads the same in every worktree.
