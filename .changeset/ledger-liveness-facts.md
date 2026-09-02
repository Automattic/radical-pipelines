---
"@automattic/radical-pipelines": minor
---

Add liveness facts to each `rp_status` ledger row — `run`, `activity` (the latest of `updated`, which the pinned opencode build moves only when the session receives input, the session's last observed tool or model progress event, and its last raw provider byte), `lastTurn` (succeeded, failed, or interrupted) and `turns`, `lastSend`, and `lastText` (the newest assistant text, or how deep a textless transcript was searched) — so an orchestrator can tell a working, a waiting, and a stopped agent apart; per-session status reads now cover only the sessions RP recognizes. The protocol `rp_spawn` appends now also tells each agent that an ended turn is a stop only a message resumes — a reply it awaits, or the completion notice of a background command it gave a `timeout` — and to hold its turn for anything else, waiting with foreground commands that have a timeout and comparing progress between checks
