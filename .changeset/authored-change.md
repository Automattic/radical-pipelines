---
"@automattic/radical-pipelines": minor
---

BREAKING: Cover every authored change outside the pipelines folder through phase-review packages, including work made outside tasks. Retain immutable patch material with both sides of changed files and a cumulative checkpoint that preserves coverage after merging and on continuation. Identify each occurrence by a whitespace-preserving patch id; a merge contributes its difference from Git's automatic merge of its parents. Add `rp diff` for Fresh/Delta material and net upstream integration. Record task reports' patch ids as landing facts. Remove the unclaimed-commit frontier; retain `head` for artifact delta reviews and convergence. Phase-review stamps now take `--base`.
