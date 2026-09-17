---
"@automattic/radical-pipelines": minor
---

Resume a run after context compaction. The skill now opens with the instruction for a session whose context was compacted: treat the summary as unreliable, load the conventions and reference files again, and resume a run under way without triage — its target phase and lanes from the intent's decisions, the frontier from `rp check`, and a check of which agents are already working before dispatching. Claude Code re-injects invoked skills after compaction on its own; the opencode plugin now does the same, re-supplying the skill body to a session whose activation left the active context, until it activates the skill again. `rp_status` lists those sessions under `skillActivations`.
