---
"@automattic/radical-pipelines": minor
---

BREAKING: one id vocabulary across every artifact — `<word>-<n>`, one word per concept: `constraint`, `context`, `hypothesis`, `decision` in the intent; `requirement`, `criterion`, `assumption` in the spec; `choice` in the design doc; `task` in the plans and their `tasks/task-<n>.md` files; `issue` in reviews; `question` in records. An item opens with its id, inline formatting marks aside. Every artifact with declared ids mirrors them as `ids` and `retired-ids` (replacing `intent-ids`), validated at its own stamp: unique, never reused, numbered without gaps, and an assumption carried downstream with its id or numbered after the upstream's highest; a violation is `INVALID IDS`, which the file's author fixes.
