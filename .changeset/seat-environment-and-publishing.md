---
"@automattic/radical-pipelines": patch
---

Tie `blocked` to the seat's own environment, so a task that depends on an outside system fails rather than blocks, and keep publishing — pushes and pull requests — with the orchestrator in every profile's seat.
