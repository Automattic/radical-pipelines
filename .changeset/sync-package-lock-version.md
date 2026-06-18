---
"@automattic/radical-pipelines": patch
---

Keep `package-lock.json`'s version in sync with `package.json` automatically, and guard against future drift.

The release version step (`npm run release:version`) now patches the lockfile's two version fields (top-level `.version` and the root `.packages[""].version`) alongside `.claude-plugin/plugin.json`, via a structured offline patch that leaves the dependency tree untouched. A new read-only `scripts/check-version-sync.mjs` drift check runs in the `changeset` CI gate and fails on any divergence across the version-bearing files. The current lockfile drift is also corrected (`0.1.1` → `0.4.0`).
