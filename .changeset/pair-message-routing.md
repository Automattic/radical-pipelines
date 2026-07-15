---
"@automattic/radical-pipelines": patch
---

Address inter-agent messages by spawn identifier: every spawned agent gets a run-unique name, a researcher spawns before its requester and its identifier is passed as the requester's **Researcher identifier** convention, so messages reach the intended agent when several agents of the same type are alive (parallel lanes, review-scoped researchers).
