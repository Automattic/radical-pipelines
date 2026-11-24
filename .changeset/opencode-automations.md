---
"@automattic/radical-pipelines": minor
---

BREAKING: Require opencode 2.4 or newer, and run the orchestrator's health ticks as opencode automations.

opencode 2.4 replaced its experimental schedules with automations, which are on by default. The orchestrator now starts, lists, and cancels its health ticks with the Code Mode tools `automation.create`, `automation.list`, and `automation.delete`. Its setup check no longer requires `experimental.schedules`, which opencode 2.4 drops from the configuration it loads, so the check stopped a correct setup; it now checks that the Code Mode tool `automation.list` runs. Remove `experimental.schedules` from your opencode configuration.
