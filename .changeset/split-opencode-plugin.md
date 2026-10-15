---
"@automattic/radical-pipelines": patch
---

Split the opencode plugin into one zero-dependency module per concern — ledger, server client, loops, permissions, skill registration and re-supply, status, spawn, send, termination — with `opencode/plugin.mjs` as the entry that keeps `setup` and re-exports every helper, so the loader and the tests address the same module as before.
