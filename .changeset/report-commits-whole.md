---
"@automattic/radical-pipelines": patch
---

A task report names commits that already exist and lands in a commit of its own: workers commit their work, then the report. `rp stamp --mirror` captures every hash in `## Commits` — whatever the line format: bullets, backticks, `hash — subject`, several lines — and refuses a hash that names no commit.
