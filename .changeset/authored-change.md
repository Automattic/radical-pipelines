---
"@automattic/radical-pipelines": minor
---

BREAKING: Cover every authored change outside the pipelines folder through phase-review packages, including work made outside tasks. Bind each occurrence's provenance and byte-preserving patch material with file pins; retain both sides of changed files and a checkpoint that preserves coverage after state integration and on continuation. Honor configured merge drivers when computing authored merge changes. Add `rp diff` for Fresh/Delta material and net upstream integration. Record task reports' material pins as landing facts. Remove the unclaimed-commit frontier; retain `head` for artifact delta reviews and convergence. Phase-review stamps now take `--base`. Merge closure integrates the pipeline into its artifact base in both storage modes.
