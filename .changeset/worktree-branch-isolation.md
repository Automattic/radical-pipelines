---
"@automattic/radical-pipelines": patch
---

Keep every spawned agent's file edits inside the pipeline's worktree and its commits on the pipeline branch by anchoring both at spawn time rather than relying on inherited working directory. The conventions block passed to each agent now carries the worktree root — so absolute paths resolve to the worktree copy instead of silently hitting the main checkout — and the pipeline branch for every committing agent, with per-tool derivation for Claude Code and Pi.
