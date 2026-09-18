---
"@automattic/radical-pipelines": minor
---

Resume a run after context compaction. The skill now opens with the instruction for a session whose context was compacted: treat the summary as unreliable, follow the skill again as at first sight, and resume a run under way without triage, checking which agents are already working before dispatching. Claude Code re-injects invoked skills after compaction on its own; the opencode plugin now does the same, re-supplying the skill body to a session whose activation left the active context, until it activates the skill again. `rp_status` lists those sessions under `skillActivations`.
