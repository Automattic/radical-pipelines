---
"@automattic/radical-pipelines": patch
---

Keep spawned agents recognized across opencode daemon restarts. `rp_spawn` now stores each agent's identity in its session metadata at creation instead of renaming the session after its first turn, so an agent whose first turn spans a restart no longer disappears from `rp_status`, loses its message attribution, failure announcements, and permission forwarding, or gains the orchestrator's tools. `rp_status` also reads every page of opencode's session list, so agents older than the newest 50 sessions are reported.
