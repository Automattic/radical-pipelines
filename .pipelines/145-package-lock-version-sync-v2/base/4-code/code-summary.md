# Code Summary: Keep package-lock version in sync with package.json automatically

## What

The code phase delivered, across one rejected and one approved review iteration:

- **`scripts/check-version-sync.mjs`** (new) — a dependency-free drift guard. It reads the four version-bearing values by structured JSON path — `package.json` `.version` (baseline / source of truth), `.claude-plugin/plugin.json` `.version`, `package-lock.json` top-level `.version`, and `package-lock.json` `.packages[""].version` — compares the other three against the baseline, and reports any disagreement. Exports a pure `checkVersionSync({ repoRoot })` and `main()`, with an `isMainModule()` CLI guard; exits 0 (silent) when all four agree, exits 1 with a per-location stderr report when they drift.
- **`scripts/test/check-version-sync.test.mjs`** (new) — the guard's paired test: unit tests on the pure function over `mkdtempSync` temp-dir fixtures and CLI tests via `spawnSync`.
- **`scripts/test/version-sync.e2e.test.mjs`** (new) — end-to-end tests for all 8 E2E-plan flows, driving the real guard CLI subprocess and the real `npm install --package-lock-only` subprocess.
- **`scripts/test/release-version-script.test.mjs`** and **`scripts/test/changeset-gate-workflow.test.mjs`** (new) — assert the committed `release:version` string composition and the workflow drift-guard step wiring.
- **`package.json`** (modified) — `release:version` now ends with `&& npm install --package-lock-only --no-audit --no-fund`.
- **`package-lock.json`** (modified) — one-time backfill: both version fields `0.1.1` → `0.4.0`.
- **`.github/workflows/changeset-gate.yml`** (modified) — a "Check version sync" step running `node scripts/check-version-sync.mjs`, adjacent to "Validate changeset shape", after `npm ci` and `npm test`.
- **`.changeset/package-lock-version-sync.md`** (new) — a `patch` changeset describing the feature.

## Why

The release version step propagated the bumped version to `plugin.json` but never to `package-lock.json`, so both lockfile version fields had frozen at `0.1.1` while `package.json` reached `0.4.0`, and nothing in the pipeline caught it (`npm ci` validates the dependency tree, not the recorded `version`). The change makes every release path reconcile the lockfile automatically, corrects the existing drift once, and adds a pull-request gate check so future divergence is caught rather than going unnoticed.

## How

A single one-directional propagation outward from `package.json`, plus a read-only gate check:

- The lockfile sync is appended to the one `release:version` composition point both release paths already funnel through (the CI `release.yml` and the manual `CONTRIBUTING.md` hatch), so both inherit it with no duplication and no edit to either path. The `&&` chain stays fail-fast in the order bump → propagate to manifests → reconcile lockfile.
- The backfill reuses the same mandated mechanism — `npm install --package-lock-only` run once with `package.json` already at `0.4.0` — so the backfill and the ongoing sync are produced identically; the committed diff is exactly the two version lines.
- The drift guard and its tests mirror the existing `scripts/validate-changesets.mjs` and its paired test (pure function + `main()` + `isMainModule()` guard, built-in Node modules only, temp-dir fixtures, `spawnSync` CLI assertions), and are picked up by the existing `node --test 'scripts/test/**/*.test.mjs'` glob.

Verification: the full suite passes (57 tests, 12 suites) and all 8 E2E flows were re-driven against the real mechanisms with captured evidence (see `code-review-approved.md`).

## Key decisions

- **Lockfile sync appended to `release:version`, not duplicated as separate CI and manual steps** — one edit reaches both release paths and removes the chance of a forgotten path (the very bug class being fixed).
- **`sync-version.mjs` and its `TARGET_MANIFESTS` left untouched** — the owner constraint forbids editing the lockfile version via a structured JSON edit; the lockfile sync is a sibling shell step, not a new manifest entry.
- **Backfill produced by the mandated command, not a hand-edit, and not by `npm run release:version`** — the latter would also run `changeset version` and bump beyond the current released `0.4.0`.
- **Guard compares by structured JSON path, not text search** — unrelated version-shaped strings (a pinned dependency in the lockfile, a `CHANGELOG.md` heading) cannot cause a false pass or fail.
- **Guard keeps its own local literal of the four locations** rather than importing `TARGET_MANIFESTS`, which lists only `plugin.json`; the guard's full comparison set stays visible and auditable in one place.
- **Guard wired into the existing `changeset-gate.yml` `changeset` job**, inheriting its bot-PR exemption, `contents: read` permissions, and concurrency — no new workflow or triggers.
- **Rejected-iteration fix (Task 1):** the first review rejected a dead module-level `REPO_ROOT` constant (a copy-paste artifact from `sync-version.mjs`) and its two orphaned `resolve`/`dirname` imports; the re-dispatch removed exactly those four lines with no behavioral change, since `main()` correctly resolves from `process.cwd()`.

## Known limitations

- If the dependency tree is independently out of sync when the lockfile sync runs, `npm install --package-lock-only` will also rewrite the affected dependency entries — an accepted trade-off (spec requirement 7). The guaranteed invariant is only that the two lockfile version fields match `package.json`, not that nothing else in the lockfile ever changes.
- The lockfile sync depends on registry / `node_modules` access only when the dependency tree is independently out of sync; offline / no-registry operation is explicitly out of scope.
