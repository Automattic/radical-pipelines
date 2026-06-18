# Spec Research

## Rough Idea

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

## Q&A

### Q1: Exactly which version fields in `package-lock.json` must match `package.json`, and are there any other files in the repo that carry the package version and could drift the same way?

**A:** `package-lock.json` carries the version in exactly two spots, both must match `package.json`:
1. top-level `.version` (line 3)
2. `.packages[""].version` (line 9) — the root self-entry

No nested workspace entries exist (`package.json` has no `workspaces` field); all other `.packages` keys are `node_modules/...` dependency entries.

The full set of files carrying this package's version is exactly three:
- `package.json` — source of truth
- `.claude-plugin/plugin.json` — already synced by `scripts/sync-version.mjs`
- `package-lock.json` — the two spots above; the unfixed gap

Other candidates checked (`marketplace.json`, `.changeset/config.json`, `CHANGELOG.md`, website files, workflows, test fixtures) do NOT carry this package's version.

**Reasoning:** Live drift confirmed — `package.json` / `plugin.json` = `0.4.0`, lock = `0.1.1` in both spots. Cause: `scripts/sync-version.mjs` (line 37, `TARGET_MANIFESTS`) only targets `.claude-plugin/plugin.json`, never the lockfile.

**Sources:** spec-researcher inspected `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `scripts/sync-version.mjs`, `marketplace.json`, `.changeset/config.json` directly this session.

### Q2: How does the full release flow run end-to-end — who/what invokes `release:version`, and how do the files it changes (`package.json`, `plugin.json`, and the to-be-fixed lockfile) get committed and published?

**A:** Single driver: `.github/workflows/release.yml`.

1. **Invoker of `release:version`:** `.github/workflows/release.yml`, triggered by push to `trunk` or manual `workflow_dispatch` (lines 3-6). Job `release`: checkout (fetch-depth:0) → setup-node 22 + npm cache → `npm ci` (line 27) → `npm test` (line 29) → `changesets/action@v1.9.0` (lines 31-37) with version command `npm run release:version` (line 34, the only caller) and publish command `npx changeset tag` (line 35).

2. **How changed files get committed:** by `changesets/action`'s built-in "version" mode. When changesets are pending it runs the version command (`changeset version` bumps `package.json` + CHANGELOG, then `sync-version.mjs` propagates to `plugin.json`), AUTO-COMMITS, and opens/updates a "Version Packages" PR on branch `changeset-release/trunk`. Merging that PR → push to trunk → `release.yml` runs again → no pending changesets → runs the publish command. (`.changeset/README.md:10-12`; `changeset-gate.yml:18` exempts the bot PR.)

3. **Publish:** NO npm registry publish. `package.json` has `"private": true` (line 3). Publish command `npx changeset tag` only creates the `v<version>` git tag + GitHub Release. Distribution is git-source / local path. The git tag/Release captures the repo tree as-is, so a drifted `package-lock.json` ships verbatim in the tagged Release — there is no `npm pack` step that re-derives the lock.

4. **`npm ci` does not catch this drift:** `npm ci` runs in `release.yml:27` AND `changeset-gate.yml:29` (every PR to trunk), but it does NOT validate the root package's own `version` field — only the dependency tree. Verified empirically this session: live root-version drift (0.4.0 vs 0.1.1) → `npm ci --dry-run` EXIT 0 (passes); a dependency-only drift → EXIT 1 (fails). So root-version drift sails through every existing gate silently — that is why it accumulated.

**Reasoning / implications:** The fix must make `sync-version.mjs` (or equivalent) also update `package-lock.json`'s two version spots, because CI will not catch the drift and no npm publish auto-corrects the lock. An explicit drift guard (compare `package.json.version` to lock `.version` and `.packages[""].version`) is the only thing that would catch it in CI; it is optional but valuable.

**Sources:** `release.yml:3-6,8-10,27,29,31-37`; `changeset-gate.yml:18,29,37`; `package.json:3`; `.changeset/README.md:10-12`; `scripts/sync-version.mjs:37`; empirical `npm ci --dry-run` this session.

### Q3: For the two candidate approaches in the intent (append `npm install --package-lock-only` vs. patch the lockfile's version fields directly in `sync-version.mjs`), what are the reliability/side-effect constraints of each, and how does `sync-version.mjs` write files today?

**A:**

**A) `npm install --package-lock-only` (empirical diff in this worktree):** With `package.json` at 0.4.0 and lock at 0.1.1, running it changed EXACTLY the two root version fields (`.version` line 3, `.packages[""].version` line 9) 0.1.1 → 0.4.0 — zero other lines, `lockfileVersion` unchanged (3), no dep re-order, no add/remove. Preserves 2-space indent + trailing newline. CAVEAT: it stayed minimal only because the dependency tree was already in sync; if any dep range were unresolved it WOULD re-resolve/mutate the tree. It reads `~/.npm` cache; with a warm cache + in-sync tree it needs no network, but it MAY contact the registry if anything needs resolving (not guaranteed offline-safe).

**B) Direct patch in `sync-version.mjs` (current I/O):** `sync-version.mjs` reads via `readFileSync(path, 'utf8')` then `JSON.parse`; gets new version from `pkg.version`. Writes via `writeFileSync(path, JSON.stringify(obj, null, 2) + '\n')` — 2-space indent, trailing newline (lines ~20-55; `TARGET_MANIFESTS` line 37 currently only `.claude-plugin/plugin.json`). A direct two-field patch (set `.version` and `.packages[""].version`, re-stringify with `null, 2` + `'\n'`) is byte-stable except the two version values — the current `package-lock.json` IS 2-space indented with a trailing newline, so no churn. This approach touches ONLY the version, never the dependency tree: it cannot mask a genuinely out-of-sync tree but also cannot accidentally mutate it, and needs no network.

**Reasoning:** Both yield a minimal two-line diff for the version itself. A also revalidates the dep tree (pro: catches tree drift; con: network + possible unintended tree churn). B is deterministic/offline but version-only. This is a tradeoff for the design phase to resolve; the requirements should constrain the outcome (only the version fields change; no unintended lockfile churn) without mandating either mechanism.

**Sources:** empirical run in worktree this session; `scripts/sync-version.mjs` lines ~20-55.

### Q4: Does the repo already have a pattern for version-consistency checks or test coverage around `sync-version.mjs` / release artifacts that a drift guard could fit into, and is `sync-version.mjs` itself covered by tests?

**A:**

1. **`sync-version.mjs` is tested.** `scripts/test/sync-version.test.mjs` (123 lines, 6+ subtests) imports its exports `{readRootVersion, syncManifestVersion, syncVersion, TARGET_MANIFESTS}` and tests via on-disk temp fixtures (`mkdtempSync`): copies root version to every target, reports the changed list, preserves 2-space indent + trailing newline, idempotent, returns false when already matching. Framework: Node built-in runner (`node:test` + `node:assert/strict`) — no jest/vitest/mocha. `npm test` = `node --test 'scripts/test/**/*.test.mjs'` (researcher ran it: 22 tests, 22 pass).

2. **No existing version-consistency / equality check (confirmed).** Repo-wide search found only prose in docs (`README.md:163,184`; `CONTRIBUTING.md:32-33`; `CHANGELOG.md:49`). No code asserts `package.json`.version == `plugin.json`.version (or == lock). `sync-version.mjs` is a one-WAY write/propagation (line 65); it never reads a target back (docstring 10-14; test line 112). So nothing DETECTS drift — drift is only overwritten on the next `release:version`. The lock drift proves nothing catches it.

3. **Natural home for a guard exists: `scripts/validate-changesets.mjs`.** A verify/check script that reads `package.json`, validates, prints `path:line: msg` to stderr, returns 0/1, runs as CLI via `process.exit(main())` (lines 168-207). Wired into CI at `changeset-gate.yml:34` (`run: node scripts/validate-changesets.mjs`, on every PR to trunk). A version-drift guard slots in identically.

4. **`scripts/*.mjs` structure:** export pure functions for tests + run-as-CLI via `isMainModule()` (`realpathSync` compare) then `if (isMainModule()) {...}` (`sync-version.mjs:100,109-127`; `validate-changesets.mjs:187,196-207`). Built-in Node modules only — no external deps, no network (both docstrings). Test pattern: `validate-changesets.test.mjs` tests both the exported pure fn AND CLI behavior via `spawnSync` asserting exit status/stderr (lines 115-161).

**Reasoning / scope conclusion:** Test coverage for version logic is the established norm — every `scripts/*.mjs` has a paired `scripts/test/*.test.mjs` — so adding/extending tests is in-convention, not new scope. A CI guard that fails on drift has a direct precedent and does not currently exist for versions; since `npm ci` provably does not catch root-version/lock drift, a guard is the only thing that would prevent regression rather than merely correct it on the next bump. Recommended shape (design's call): `scripts/<name>.mjs` exporting a pure compare fn + `isMainModule` CLI returning 0/1, built-ins only, paired test, wired as `node scripts/<name>.mjs` in `changeset-gate.yml`.

**Sources:** `package.json` `scripts.test` (ran → 22 pass); `scripts/test/sync-version.test.mjs:1-123`; `scripts/test/validate-changesets.test.mjs:1-161`; `scripts/validate-changesets.mjs:168-207`, docstring 10-17; `scripts/sync-version.mjs:65,100-127,10-16`; `changeset-gate.yml:34`; repo-wide grep (no version-equality assertion anywhere).

## Research

_(No standalone research topics beyond the Q&A above; all investigation was driven through Q1–Q4.)_

## Consolidated Requirements

Each requirement is phrased as an observable outcome. The version source of truth is `package.json`'s `version` field.

### Correcting the current drift

1. `package-lock.json`'s top-level `.version` field equals `package.json`'s `version` (currently `0.4.0`).
2. `package-lock.json`'s `.packages[""].version` field (the root self-entry) equals `package.json`'s `version`.
3. Correcting these two version fields leaves the rest of `package-lock.json` unchanged: `lockfileVersion`, the dependency tree, entry ordering, 2-space indentation, and the trailing newline are all preserved (the only changed lines are the two version values).
4. `.claude-plugin/plugin.json`'s `version` continues to equal `package.json`'s `version` (existing behavior, preserved).

### Keeping it in sync automatically

5. Running the release version step (`npm run release:version`, i.e. `changeset version` followed by the sync step) leaves `package-lock.json`'s two version fields equal to the bumped `package.json` version, with no further manual action required.
6. The automatic sync is idempotent: running the release version step when versions already match produces no change to `package-lock.json`.
7. The automatic sync introduces no unintended churn to `package-lock.json` — when the dependency tree is already in sync, only the two version fields can change.
8. The automatic sync requires no network access during the release version step (it must succeed under the existing CI flow without depending on registry availability beyond what the release already needs).
9. After a release version bump, the auto-committed "Version Packages" PR (produced by `changesets/action`) includes the updated `package-lock.json` alongside `package.json`, `plugin.json`, and CHANGELOG, so the synced lockfile reaches `trunk` and the published git tag/GitHub Release.

### Preventing regression (drift detection)

10. A check exists that, given the repo, reports whether `package.json`'s version matches both `package-lock.json` version fields and `.claude-plugin/plugin.json`'s version, failing (non-zero exit, with a clear message identifying the mismatched file/field) when any of them drift.
11. The drift check runs in CI on pull requests to `trunk` (following the existing `changeset-gate.yml` precedent), so a future drift is caught before merge rather than only being overwritten on the next release.

### Quality / convention

12. The new or changed version-sync logic is covered by tests following the repo's existing convention (Node built-in test runner, a paired `scripts/test/*.test.mjs`, on-disk temp fixtures, asserting the sync result and formatting preservation), and `npm test` passes.
13. Any new script follows the repo's `scripts/*.mjs` conventions: built-in Node modules only (no external dependencies, no network), exported pure functions for testing, and an `isMainModule()` CLI entry point.

### Out of scope

- Validating or modifying the `package-lock.json` dependency tree itself (the tree is already in sync; only the root version field is stale).
- Adding an npm-registry publish step — the package is `private` and is distributed via git tag/GitHub Release, not the npm registry.
- Syncing the version into any file beyond the three confirmed version-bearing files (`package.json`, `package-lock.json`, `.claude-plugin/plugin.json`); no other repo file carries this package's version.
- Choosing between the two candidate implementation mechanisms (append `npm install --package-lock-only` vs. patch the lockfile directly in `scripts/sync-version.mjs`); the requirements constrain the outcome, and the mechanism is a design decision.
