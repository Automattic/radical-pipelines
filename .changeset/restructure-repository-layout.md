---
"@automattic/radical-pipelines": minor
---

Restructure the repository to a flat, root-served layout. The skill now lives at its real path `skills/radical-pipelines/` and agents under `agents/`, served directly from the repository root with no install-time copying. A single root Pi manifest describes the plugin, project conventions live in a single `.rp.md`, and pipeline run state is consolidated under `.rp/pipelines/`. The previous install paths, symlinks, and duplicate manifest have been removed.
