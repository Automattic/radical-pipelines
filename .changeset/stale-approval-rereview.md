---
"@automattic/radical-pipelines": minor
---

Review a stale approval once, in the lane's thread, on what changed.

A review lane keeps one review thread. When its approval goes stale, its reviewer takes a later turn in that thread instead of a first turn in a new one: its assignment gives it the diff since its approved commit and lists the inputs that changed, and it approves again or replies with what needs to change, which opens the thread. A lane whose approval is stale is woken only once no review thread is open, so it reviews once what the other lanes' rounds of fixes changed, not after each round. A lane whose approved commit the clone lacks still starts a new review.
