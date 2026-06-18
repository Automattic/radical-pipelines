# Code Review

## Verdict: rejected

## Batch scope

Tasks reviewed:

- Task 1: Create the drift-guard script `scripts/check-version-sync.mjs`
- Task 2: Create the paired test `scripts/test/check-version-sync.test.mjs`
- Task 3: Append the lockfile sync to the `release:version` npm script
- Task 4: One-time backfill of the committed `package-lock.json` to 0.4.0
- Task 5: Wire the drift guard into the `changeset-gate.yml` `changeset` job
- Task 6: Add the feature's own changeset
- Task 7: Automate the end-to-end flows

## Summary

The batch is functionally complete and faithful to the spec, design, and plan: the lockfile sync is appended to `release:version` exactly as designed (`changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`), `sync-version.mjs` and `TARGET_MANIFESTS` are untouched, the committed lockfile is backfilled to `0.4.0` in both fields, the drift guard compares by structured JSON path over exactly the four locations, the changeset is a `patch`, and the gate step is wired adjacent to `validate-changesets`. All 57 tests across the 12 suites pass, and I independently re-drove all 8 E2E flows with captured evidence — every spec acceptance criterion (spec lines 45–64) holds. The single reason for rejection is dead code in the drift-guard script: a module-level `REPO_ROOT` constant (and the two imports that exist only to build it) that is computed and never used, because `main()` correctly resolves paths from `process.cwd()` instead. It is a copy-paste artifact from `sync-version.mjs` that misleads a reader about how the CLI resolves paths and must be removed.

## Checks

This project defines no guardrails convention, so there are no gates to run. The behavior verification below stands in for verification evidence.

| Check | Command | Result |
| ----- | ------- | ------ |
| (no guardrails convention defined) | — | — |

## Behavior verification

I re-drove all 8 E2E flows against the real mechanisms, not the test harness.

**Test suite (directory form, local Node 20.20.1 / npm 10.8.2):** `node --test scripts/test/` → `# tests 57  # pass 57  # fail 0`.

**Drift guard CLI on the committed repo:** `node scripts/check-version-sync.mjs` → exit 0, empty stdout/stderr (confirms the backfilled, in-sync committed state).

**Flow 1 (all four agree, `1.2.3`):** exit 0, empty stdout and stderr.

**Flow 2 (lockfile fields drifted `0.1.1` vs `0.4.0`):** exit 1; stderr:
```
package.json: 0.4.0 (source of truth)
package-lock.json (.version): 0.1.1 — does not match package.json
package-lock.json (.packages[""].version): 0.1.1 — does not match package.json
```

**Flow 3 (plugin.json drifted to `0.3.0`):** exit 1; stderr names `.claude-plugin/plugin.json (.version): 0.3.0`; the in-sync lockfile fields are correctly NOT reported.

**Flow 4 (package.json hand-edited to `9.9.9`):** exit 1; `package.json: 9.9.9 (source of truth)` then the other three reported as not matching it (all `0.4.0`). The inconsistency is not allowed through.

**Flow 5 (real `npm install --package-lock-only --no-audit --no-fund` on a dependency-consistent fixture seeded at `0.1.1`):** exit 0; both lockfile version fields moved `0.1.1` → `0.4.0`; the only change was the two version fields.

**Flow 6 (idempotent re-run):** exit 0; the lockfile bytes were byte-identical to the post-Flow-5 snapshot.

**Flow 7 (committed `release:version` string):** equals `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`.

**Flow 8 (committed repo state):** `package.json` `.version` = `0.4.0`, `package-lock.json` `.version` = `0.4.0`, `package-lock.json` `.packages[""].version` = `0.4.0`; all four agree.

**Changeset (Task 6):** `node scripts/validate-changesets.mjs` → exit 0; front matter `"@automattic/radical-pipelines": patch` with a non-empty body.

## Issues

### Issue 1: Dead `REPO_ROOT` constant (and its two supporting imports) in the drift-guard script

**Task:** Task 1: Create the drift-guard script `scripts/check-version-sync.mjs`

**What's wrong:** `scripts/check-version-sync.mjs` defines a module-level `REPO_ROOT` constant that is never read anywhere in the file. `main()` resolves the repository from `process.cwd()` (line 132) and `checkVersionSync` takes `repoRoot` as a parameter, so the script-relative `REPO_ROOT` is computed and discarded. This is a copy-paste artifact from `sync-version.mjs`, where `REPO_ROOT` *is* legitimately used by `main()`. Leaving it here is dead code that actively misleads a reader: it implies the CLI resolves paths relative to the script's own location (cwd-independent, like `sync-version.mjs`), when in fact this CLI is cwd-dependent. Two imports exist solely to build this dead constant and become orphaned with it: `resolve` and `dirname` on line 24 (both are used only on line 28). `join`, `fileURLToPath`, and `realpathSync` are still needed elsewhere and must stay.

**Where:** `scripts/check-version-sync.mjs:28` (the `REPO_ROOT` definition) and `scripts/check-version-sync.mjs:24` (the `resolve, dirname` imports that support only it).

**Expected:** Remove the unused `REPO_ROOT` constant and drop `resolve` and `dirname` from the `node:path` import so no orphaned imports remain (keep `join`). The cwd-based resolution in `main()` is correct and must not change — it is exactly how the CLI tests (`spawnSync(..., { cwd })`) and the CI step (run from the repo root) drive the guard; only the dead constant and its now-unused imports should go.
