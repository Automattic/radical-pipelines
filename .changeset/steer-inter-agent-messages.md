---
"@automattic/radical-pipelines": patch
---

Deliver inter-agent messages with steer so they reach a recipient that is still working. `rp_send`, the permission forward, and the failed-turn announcement used queue delivery, which promotes only at a turn boundary — an agent that keeps calling tools never reaches one, so messages went undelivered for as long as the recipient kept working and were discarded outright when it was terminated while still holding them. The spawn prompt keeps queue delivery: its target is a fresh session with an empty inbox, where both modes behave identically.

A session terminated through `rp_terminate` no longer announces a failed turn to its spawner or records one in `rp_status`'s `recentErrors`. Deleting a session interrupts the turn it was running, and that interruption is the expected end of a deliberate shutdown rather than a fault to report.
