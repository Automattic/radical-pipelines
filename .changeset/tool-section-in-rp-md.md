---
"@automattic/radical-pipelines": minor
---

BREAKING: Read a tool's project conventions only from its `## <Tool>` section in `.rp.md`. The orchestrator no longer reads a separate `.rp.<tool>.md` file: move its content into that section.
