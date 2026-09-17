---
"@automattic/radical-pipelines": minor
---

Resume a run after context compaction. The skill now opens with the instruction for a session whose context was compacted: treat the summary as unreliable, load the conventions and reference files again, take the run's target phase and lanes from the intent's decisions, recompute the frontier with `rp check`, and check which agents are already working before dispatching. Claude Code re-injects invoked skills after compaction on its own; the opencode plugin now does the same, re-supplying the skill body to a session whose activation left the active context, until it activates the skill again. `rp_status` lists those sessions under `skillActivations`.
