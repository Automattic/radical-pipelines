---
"@automattic/radical-pipelines": minor
---

BREAKING: add the Widen triage route and group routes into runs per pipeline. Give intent items explicit stable ids, persist retired issue-derived ids to prevent reuse, retain accumulating Decisions, and validate target ids by bullet or heading declarations rather than mentions. Require current stamped id history before computing downstream state. Existing intents need explicit ids before new claims can target their items.
