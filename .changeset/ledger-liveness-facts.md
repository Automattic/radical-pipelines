---
"@automattic/radical-pipelines": minor
---

Add liveness facts to each `rp_status` ledger row — `activity` (the later of `updated`, which the pinned opencode build moves only when the session receives input, and the session's last observed tool or model progress), `lastTurn` and `turns`, `lastSend`, and `lastText` — so an orchestrator can tell a working, a waiting, and a stopped agent apart; per-session status reads now cover only the sessions RP recognizes
