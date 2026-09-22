---
"@automattic/radical-pipelines": minor
---

BREAKING: Cover every authored change outside the pipelines folder through phase-review packages, including work made outside tasks. Identify each occurrence by a whitespace-preserving patch id; a merge contributes its difference from the automatic merge. Preserve review coverage across rebases and cherry-picks that preserve the patch, and expose added and removed changes for delta reviews. Record task reports' patch ids as landing facts. Remove the unclaimed-commit frontier; retain `head` for artifact delta reviews and convergence. Phase-review stamps now take `--base`.
