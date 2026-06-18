# Keep package-lock version in sync with package.json automatically (via `npm install --package-lock-only`)

> Source: GitHub issue #145 — https://github.com/Automattic/radical-pipelines/issues/145.
> This file is self-contained; agents do not need to open the source issue.

**Goal**

The lockfile's recorded package version stays consistent with `package.json`, and the release process keeps it in sync automatically so it can't drift again.

**Constraints**

- The lockfile version sync **must be implemented by running `npm install --package-lock-only`** (e.g. as part of the release version step), not by a hand-written or structured JSON patch of the lockfile's version fields.

**Context**

- The version lives in three files: `package.json` (source of truth), `.claude-plugin/plugin.json`, and `package-lock.json` (which records it in two places — the top-level `.version` and the root `.packages[""].version`). Today `scripts/sync-version.mjs` (run by `npm run release:version`) propagates the version to `plugin.json` only, never the lockfile, so the lockfile's recorded version drifted out of sync.
- This version deliberately adopts the `npm install --package-lock-only` mechanism that a prior version of this issue rejected in favor of an offline structured patch. The owner wants the npm-driven approach evaluated and implemented here, accepting its trade-offs (registry / `node_modules` dependence in exchange for dependency-tree revalidation).

**Assumptions / directions to explore** _(open)_

- How and where to invoke `npm install --package-lock-only` so it runs reliably in the release flow and leaves only the intended changes (e.g. its ordering relative to `npm ci` and the version bump) — to be pinned down by research in later phases.
- Whether a CI check that catches version drift is still wanted alongside the npm-driven sync — open for the spec to decide.
