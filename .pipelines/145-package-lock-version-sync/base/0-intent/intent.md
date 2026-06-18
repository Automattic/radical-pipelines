# Keep package-lock version in sync with package.json automatically

> Source: GitHub issue #145 — https://github.com/Automattic/radical-pipelines/issues/145.
> This file is self-contained; agents do not need to open the source issue.

**Goal**

The lockfile's recorded package version stays consistent with `package.json`, and the release process keeps it in sync automatically so it can't drift again.

**Context**

- Right now `package-lock.json`'s root version is `0.1.1` while `package.json` is `0.4.0`. The dependency tree itself is in sync — only the root version field is stale.
- The release flow (`release:version` = `changeset version && node scripts/sync-version.mjs`) bumps `package.json` and propagates the version to `.claude-plugin/plugin.json`, but nothing refreshes `package-lock.json`. That's why the version drifted across the `0.1.1 → 0.4.0` bumps.

**Assumptions / directions to explore** _(open)_

- Appending `npm install --package-lock-only` to the `release:version` script would refresh the lockfile on every bump. An alternative is teaching `scripts/sync-version.mjs` to patch the lockfile's root version directly. Recorded as directions to explore, not requirements — the agents may confirm or revise.
