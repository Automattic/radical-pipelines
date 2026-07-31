---
"@automattic/radical-pipelines": minor
---

Add opencode v2 support: a plugin exposing the `rp_*` tools — including permission mediation that redirects an agent's external read to its worktree copy or forwards the request to the spawner for adjudication via `rp_permission_reply`, and an `rp_status` ledger reporting each session's current tool and pending permission requests — a per-tool convention file with the opencode Team spawning and Health monitoring blocks, and a pinned, hermetic integration suite that exercises the plugin against the pinned opencode build.
