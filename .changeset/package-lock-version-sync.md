---
"@automattic/radical-pipelines": patch
---

Keep `package-lock.json`'s version fields in sync with the root package version: the release version step now also runs `npm install --package-lock-only` to reconcile the lockfile, the existing drift in the committed lockfile is corrected, and a CI drift check guards against future divergence.
