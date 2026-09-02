---
"@automattic/radical-pipelines": minor
---

Add liveness facts to each `rp_status` ledger row — `activity` (the later of `updated`, which the pinned opencode build moves only when the session receives input, and the session's last observed tool or model progress), `lastTurn` and `turns`, `lastSend`, and `lastText` — so an orchestrator can tell a working, a waiting, and a stopped agent apart; per-session status reads now cover only the sessions RP recognizes. The protocol `rp_spawn` appends now also tells each agent that an ended turn is a stop only a message resumes, and to hold its turn while work is outstanding — waiting with foreground commands that have a timeout and comparing progress between checks
