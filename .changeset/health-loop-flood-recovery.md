---
"@automattic/radical-pipelines": patch
---

Make the opencode health loop flood-proof and self-recovering: a tick never duplicates a prompt still awaiting delivery (a parked queue copy facing a running session is promoted to steer delivery in place); an injection answered only by a failing turn (network outage, provider quota exhaustion) triggers an exponential backoff — capped at ~8 intervals, evaluated on busy and idle targets alike, suppressing injections but never inspection — that ends on the first successful turn; and a stale target whose unconsumed steer sits behind a provably dead provider stream (a tool call frozen mid-streaming) is interrupted with `continue=true` so execution resumes with the pending monitor steer, while a target inside a long-running tool call is never interrupted.
