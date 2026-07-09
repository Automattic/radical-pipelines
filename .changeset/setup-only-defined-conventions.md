---
"@automattic/radical-pipelines": patch
---

Setup writes only the defined conventions into `.rp.md` — anything beyond them, like orchestrator instructions or setup-time discoveries, is captured only on explicit owner request. The Claude Code conventions keep only their tool-specific values; the orchestrator instructions they held move into the workflow and health-monitoring references or drop where those already state them.
