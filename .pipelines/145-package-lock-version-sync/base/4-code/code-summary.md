# Code Summary: Keep package-lock version in sync with package.json automatically

## What

Five tasks landed across `scripts/`, `.github/workflows/changeset-gate.yml`, and `package-lock.json`:

- **`scripts/sync-version.mjs`** gains a dedicated `syncLockfileVersion(lockfilePath, version)` that sets `package-lock.json`'s top-level `.version` and `.packages[""].version` and re-serializes through the existing `JSON.stringify(obj, null, 2) + "\n"` write path, writing only if changed. `syncVersion()` now always calls it after the unchanged `TARGET_MANIFESTS` loop, folding `"package-lock.json"` into its `changed` list. `syncLockfileVersion` is exported alongside the preserved `readRootVersion`, `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`.
- **`scripts/check-version-sync.mjs`** (new) is a read-only drift guard: a pure `checkVersionSync(inputs)` that collects every mismatch across the three checked fields (lockfile `.version`, lockfile `.packages[""].version`, `.claude-plugin/plugin.json` `.version`), and a `main()` that reads the three files from cwd, prints one stderr line per mismatch, writes nothing to stdout, and returns `0|1`, guarded by `isMainModule()`.
- **`.github/workflows/changeset-gate.yml`** gains a `Check version sync` step (`node scripts/check-version-sync.mjs`) inside the existing single `changeset` job.
- **`package-lock.json`** is corrected: both version fields moved `0.1.1` → `0.4.0` (lines 3 and 9), nothing else.
- **Tests:** `scripts/test/sync-version.test.mjs` extended (shared `makeFixture` now writes a canonical lockfile; new lockfile cases); `scripts/test/check-version-sync.test.mjs` (new); `scripts/test/version-sync.e2e.test.mjs` (new, Flows 1–9); `scripts/test/changeset-gate-workflow.test.mjs` (new, Flow 8 wiring).

## Why

`npm run release:version` bumped `package.json` and propagated to `plugin.json` but never updated `package-lock.json`, so the lockfile's root version silently drifted to `0.1.1` while the rest of the repo was at `0.4.0`, and no CI gate caught it. The batch corrects the live drift, makes the release step keep the lockfile version in sync on every bump (by reusing the existing `release:version` path), and adds a CI drift check so future divergence fails a PR before merge.

## How

- The lockfile patch is **structured and offline** — it sets two JSON paths and re-serializes, never a text/regex replace, because `0.1.1` also appears as a legitimate dependency version (`@changesets/logger`); a global replace would corrupt it. Verified: that dependency remains `0.1.1` after the correction.
- The lockfile is a **mandatory target**: `syncVersion` always resolves and patches `package-lock.json`; a missing lockfile throws `ENOENT` rather than being skipped. Consequently the shared test `makeFixture` was extended to write a canonical lockfile; the existing `plugin.json` assertions are unchanged.
- The drift check **mirrors `validate-changesets.mjs`** (same export + `isMainModule()` + stderr `path: msg` + collect-all-errors shape) and is wired as a step in the existing `changeset` job, inheriting its `pull_request → trunk` trigger and `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption — no new job or duplicated setup.
- The live correction was produced by running the extended sync once; the resulting `package-lock.json` diff is exactly lines 3 and 9.
- Everything uses only Node built-ins (`node:fs`/`node:path`/`node:url`); no new runtime dependency, no network access.
- Full suite: 9 suites / 50 tests, all passing.

## Known limitations

- **Requirement 9 (the bot "Version Packages" PR carries the synced lockfile)** is satisfied by reusing the release path, but the changesets release action's commit behavior is documented action behavior, not provable from the YAML or any fixture. It has no covering task here and is deferred to manual inspection of a produced bot PR in a later phase.
- **Requirement 11 "blocks merge"** depends on GitHub branch-protection / required-status-check configuration, which is not expressible in-tree. The batch asserts only the in-tree wiring (the step runs in the gate job under its trigger and bot-PR `if`).
- Both the sync patch and the drift check rely on the `lockfileVersion: 3` root self-entry (`.packages[""]`) existing; an unexpected lockfile shape throws on both paths by design rather than silently passing.
