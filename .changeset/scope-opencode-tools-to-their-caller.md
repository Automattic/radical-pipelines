---
"@automattic/radical-pipelines": minor
---

BREAKING: scope the opencode plugin's tools to the session calling them. Every session in the daemon reached all eight, so a subagent — created by an agent delegating inside its own turn, and asked only to return findings — was handed the orchestration set and, through `rp_loop_list`, a directory of every live run to address. One of them reported into a pipeline that was not its own. Now the orchestrator and the owner's session reach every tool, a spawned agent reaches `rp_send` alone, and a subagent reaches none and is told to return its result to whoever delegated to it.
