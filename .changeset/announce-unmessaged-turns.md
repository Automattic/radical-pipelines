---
"@automattic/radical-pipelines": minor
---

Announce to the spawner a spawned agent's successful turn that sent no message, as failed turns already are, and treat an agent that ends a turn without a message before declaring completion, while awaiting no reply or command, as stalled. An agent that finished its work but never reported no longer leaves the run idle until the next health tick, so the health loop's default interval moves from 15 to 50 minutes. `rp_status`'s `lastTurn` carries `messaged` when the daemon observed the turn's beginning in the last 24 hours.
