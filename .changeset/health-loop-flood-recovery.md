---
"@automattic/radical-pipelines": patch
---

Make the opencode health loop flood-proof and self-recovering: a tick never duplicates a prompt still awaiting delivery; an injection answered only by an instantly failing turn (network outage, provider quota exhaustion) triggers an exponential backoff — capped at ~8 intervals — that resets on the first successful turn; and a stale target whose unconsumed steer sits behind a provably dead provider stream (a tool call frozen mid-streaming) is interrupted with `continue=true` so it drains its queued prompts and resumes, while a target inside a long-running tool call is never interrupted.
