---
"@automattic/radical-pipelines": patch
---

Make the opencode health loop flood-proof and self-recovering: a tick never duplicates a prompt whose predecessor is still undelivered or unanswered (a parked queue copy facing a running session is promoted to steer delivery in place); each injection is evaluated against the turn that responded to it — anchored on the admitted input's message ID — and an injection answered only by a failing turn (network outage, provider quota exhaustion) triggers an exponential backoff, capped at ~8 intervals, that suppresses injections but never inspection and ends on the first successful turn; and a stale target on a provably dead provider stream (a tool call frozen mid-streaming) is interrupted directly with `continue=true`, while a target inside a long-running tool call is never interrupted.
