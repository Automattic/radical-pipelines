---
"@automattic/radical-pipelines": minor
---

BREAKING: Remove `rp stop`, keeping a pipeline's lane worktrees until `rp close`, and let a thread message attach its evidence with `--evidence`.

`rp stop` is removed, and close-out no longer removes lane worktrees when a run ends. A pipeline's worktrees stay on the machine until `rp close` removes them, once the pipeline is merged or closed without merging; `rp next` still removes the production lanes' worktrees at a consolidation. A run that stops, completes, or escalates leaves every lane as it was, with the files its roles left there, for the next run or for the owner's decision. `rp pipelines` lists no lane branch a turn record holds a lane's turn on, so a kept production lane is not taken for a pipeline of its own.

`rp thread open`, `reply`, `close`, and `escalate` take `--evidence <file | folder>`, once per file or folder. Each is copied into the thread's folder, beside the thread, under the message's number, and staged whatever the repository's ignore rules; the message ends with the list of their paths from the pipeline folder. A review lane's view holds its threads' folders, so a reviewer and the implementer read each other's evidence, each in its own worktree, and no role needs to know where the other works. Every profile and the reviewer's assignments attach the files a message rests on this way, and cite the supporting material of an artifact by its path from the pipeline folder.

A review lane opens review threads and escalations alone: `rp thread open` refuses a reviewer's thread about the spec or the design doc, and the file grammar rejects one.
