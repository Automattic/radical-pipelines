# Code Plan: Keep package-lock version in sync with package.json automatically

## Overview

The project records its version in three files but four locations: `package.json` `.version` (the source of truth), `.claude-plugin/plugin.json` `.version`, `package-lock.json` top-level `.version`, and `package-lock.json` `.packages[""].version`. The release version step propagates the bumped version to `plugin.json` (via `scripts/sync-version.mjs`) but never to the lockfile, so both lockfile version fields have drifted: `package.json` is at `0.4.0` while both lockfile fields are frozen at `0.1.1`. This plan (1) appends `npm install --package-lock-only --no-audit --no-fund` to the `release:version` npm script so every release path reconciles the lockfile automatically; (2) backfills the existing drift once by running `npm install --package-lock-only` (with `package.json` already at `0.4.0`) and committing the resulting `package-lock.json`; (3) adds a new dependency-free drift guard `scripts/check-version-sync.mjs` plus its paired test, comparing the four version-bearing values by structured JSON path, and wires `node scripts/check-version-sync.mjs` as a step in the existing `changeset` job of `.github/workflows/changeset-gate.yml`; and (4) adds the feature's own `patch` changeset so the PR passes the existing gate. The tasks are ordered so the guard script (Task 1) and its test (Task 2) land before the workflow wiring (Task 5), the script wiring is independent (Task 3), the one-time backfill follows (Task 4), the changeset is added (Task 6), and the end-to-end flows are automated last (Task 7).

## Guardrail scopes

This project defines no guardrail gates, and no scopes were passed to fill.

| Gate | Scope |
| ---- | ----- |
| None | None |

## E2E test plan

These flows exercise the real mechanisms end-to-end: the lockfile sync is the real `npm install --package-lock-only` subprocess (not a function override), and the drift guard runs as a real `node` subprocess via `spawnSync`. Fixtures are built in throwaway temp directories created with `mkdtempSync` (mirroring `scripts/test/validate-changesets.test.mjs`). Where a flow runs the real `npm install --package-lock-only`, account for the design's caveat: the minimal two-field diff (requirement 7) holds only when the dependency tree is consistent; a wider diff signals an independently out-of-sync tree and is an accepted trade-off — assertions must target the guaranteed invariant (the two lockfile version fields equal `package.json`'s version) and must not assert "no other line changed" unless the fixture's dependency tree is constructed to be consistent.

### Flow 1: Drift guard passes when all four version locations agree

- **Steps:** Build a temp-dir fixture with `package.json` `.version` = `1.2.3`, `.claude-plugin/plugin.json` `.version` = `1.2.3`, and a `package-lock.json` whose top-level `.version` = `1.2.3` and `.packages[""].version` = `1.2.3`. Run `node scripts/check-version-sync.mjs` as a subprocess (`spawnSync`) with `cwd` set to the fixture root (or `repoRoot` passed however the script resolves it).
- **Expected:** Exit status `0`; empty stdout; empty stderr.
- **Traces to:** Acceptance criterion "drift guard passes" (spec line 61); requirement 10.

### Flow 2: Drift guard fails naming the lockfile fields when they disagree with package.json

- **Steps:** Build a temp-dir fixture with `package.json` `.version` = `0.4.0`, `plugin.json` `.version` = `0.4.0`, and a `package-lock.json` with both version fields = `0.1.1` (the current real-world drift). Run `node scripts/check-version-sync.mjs` as a subprocess with `cwd` at the fixture root.
- **Expected:** Exit status `1`; stderr names `package-lock.json` (disambiguated by JSON path `.version` and `.packages[""].version`) as offending and shows the conflicting values `0.1.1` against the `package.json` baseline `0.4.0`; stdout empty.
- **Traces to:** Acceptance criterion "lockfile version fields disagree … fails and names the offending file(s) and conflicting values" (spec line 62); requirements 10, 11.

### Flow 3: Drift guard fails naming plugin.json when it disagrees

- **Steps:** Build a temp-dir fixture with `package.json` `.version` = `0.4.0`, both lockfile version fields = `0.4.0`, but `plugin.json` `.version` = `0.3.0`. Run `node scripts/check-version-sync.mjs` as a subprocess with `cwd` at the fixture root.
- **Expected:** Exit status `1`; stderr names `.claude-plugin/plugin.json` as offending and shows the conflicting value `0.3.0` against baseline `0.4.0`; stdout empty.
- **Traces to:** Acceptance criterion "`plugin.json`'s version disagrees … names `.claude-plugin/plugin.json`" (spec line 63); requirements 10, 11.

### Flow 4: Drift guard fails when package.json is hand-edited so it disagrees with the other three

- **Steps:** Build a temp-dir fixture with `package.json` `.version` = `9.9.9` (hand-edited baseline), `plugin.json` `.version` = `0.4.0`, both lockfile version fields = `0.4.0`. Run `node scripts/check-version-sync.mjs` as a subprocess with `cwd` at the fixture root.
- **Expected:** Exit status `1`; stderr shows `package.json` as the baseline `9.9.9` and reports the other three (`plugin.json`, lockfile `.version`, lockfile `.packages[""].version`) as not matching it, showing the conflicting value `0.4.0`; stdout empty. The inconsistency is not allowed through (unlike dependency-tree-only validation).
- **Traces to:** Acceptance criterion "`package.json` … hand-edited … fails (not allowed through, unlike dependency-tree-only validation)" (spec line 64); requirements 10, 11.

### Flow 5: Lockfile sync via the real command brings both lockfile version fields to package.json's version

- **Steps:** Build a temp-dir fixture that is a minimal but dependency-consistent npm project: a `package.json` with `.version` = `0.4.0` and a dependency set whose lockfile can be reconciled without registry/`node_modules` access (e.g. no dependencies, or dependencies already fully and consistently described in the seeded `package-lock.json`), plus a seeded `package-lock.json` (lockfileVersion 3) whose top-level `.version` and `.packages[""].version` both read `0.1.1`. Run the real `npm install --package-lock-only --no-audit --no-fund` as a subprocess with `cwd` at the fixture root.
- **Expected:** Exit status `0`; after the command, the lockfile's top-level `.version` and `.packages[""].version` both equal `0.4.0` (read by JSON path). Because the fixture's dependency tree is consistent, the only change to the lockfile is the two version fields (no dependency entries added, removed, reordered, or rewritten) — assert this only because the fixture is constructed consistent.
- **Traces to:** Acceptance criteria "both lockfile version fields and `package.json`'s version are equal after it completes" (spec line 45) and "the only change to the lockfile is the two version fields" (spec line 53); requirements 4, 7.

### Flow 6: Lockfile sync is idempotent (empty diff on re-run)

- **Steps:** Starting from the in-sync fixture produced at the end of Flow 5 (all version fields `0.4.0`, dependency tree consistent), capture the exact lockfile bytes, then run the real `npm install --package-lock-only --no-audit --no-fund` again as a subprocess with `cwd` at the fixture root.
- **Expected:** Exit status `0`; the lockfile bytes are unchanged (byte-identical to the captured snapshot) — empty diff.
- **Traces to:** Acceptance criterion "release version step is run again with no new version change, then the lockfile is unchanged (empty diff)" (spec line 47); requirement 6.

### Flow 7: The `release:version` script chain reaches the lockfile sync

- **Steps:** Inspect the committed `package.json` `release:version` script string and assert it ends with `&& npm install --package-lock-only --no-audit --no-fund` after `changeset version && node scripts/sync-version.mjs`. (This verifies the single composition point both the CI path `release.yml` and the manual escape hatch `CONTRIBUTING.md` funnel through — neither is edited; both inherit the step.) Optionally, in a dependency-consistent temp-dir fixture seeded with a pending changeset, a `package.json` at a base version, a drifted lockfile, and a `plugin.json`, run the script chain end-to-end and assert all four version locations agree afterward.
- **Expected:** The `release:version` string contains the appended lockfile-sync command in the documented order. If the end-to-end chain variant is run, all four version locations carry the same (bumped) version after it completes.
- **Traces to:** Acceptance criteria "all four locations agree after the release step" (spec line 46), "CI path" (spec line 48), and "manual escape hatch with no manual lockfile edit" (spec line 49); requirements 2, 3, 5.

### Flow 8: The committed lockfile is backfilled to 0.4.0

- **Steps:** Read the committed repository `package-lock.json` and `package.json`. Compare the lockfile's top-level `.version` and `.packages[""].version` against `package.json` `.version` by JSON path.
- **Expected:** `package-lock.json` `.version` = `0.4.0` and `package-lock.json` `.packages[""].version` = `0.4.0`, both equal to `package.json` `.version` = `0.4.0`. (This is a state assertion on the committed repo, validating the one-time backfill landed.)
- **Traces to:** Acceptance criterion "the committed lockfile's `.version` and `.packages[""].version` both read `0.4.0`" (spec line 57); requirements 8, 9.

## Tasks

### Task 1: Create the drift-guard script `scripts/check-version-sync.mjs`

- **Goal:** Add the dependency-free drift guard that reads the four version-bearing values by structured JSON path, compares the other three against `package.json`'s value as the baseline, and reports drift via exit code and an actionable stderr message.
- **Type:** tdd
- **Files to change:** `scripts/check-version-sync.mjs` (new).
- **Changes:**
  - Built-in Node modules only (`node:fs`, `node:path`, `node:url`); no external dependencies, no network, mirroring `scripts/validate-changesets.mjs` and `scripts/sync-version.mjs`.
  - Define a local literal enumerating exactly the four `(file, JSON-path)` comparison locations (do NOT import `TARGET_MANIFESTS` from `sync-version.mjs`): `package.json` → `.version` (the baseline / source of truth), `.claude-plugin/plugin.json` → `.version`, `package-lock.json` → top-level `.version`, `package-lock.json` → `.packages[""].version`.
  - Export a pure function `checkVersionSync({ repoRoot }) → Err[]`: it `JSON.parse`s each file and accesses each value by its structured path (never text/grep search), takes `package.json` `.version` as the baseline, and returns one error entry per location whose value disagrees with the baseline; returns an empty array when all four agree. `repoRoot` parameterization enables temp-dir fixture tests (mirroring `syncVersion({ repoRoot })`).
  - Each error entry must carry enough to render a per-location stderr line naming the file, and — for the two lockfile fields — the disambiguating JSON path (`.version` vs `.packages[""].version`), plus the conflicting value.
  - Export `main()` returning `0 | 1`: prints nothing to stdout on success; on failure prints one line per disagreeing location to stderr in the shape `package.json: <baseline> (source of truth)` followed by `<file> (<json-path>): <value> — does not match package.json` per offending location, then returns `1`. Returns `0` when all four agree.
  - Add an `isMainModule()` realpath compare (identical pattern to `validate-changesets.mjs` / `sync-version.mjs`) and `if (isMainModule()) process.exit(main());`.
  - Export both `checkVersionSync` and `main` for the paired test.
- **Depends on:** none
- **Traces to:** Spec requirements 10, 11; acceptance criteria "drift guard on the pull-request gate" (spec lines 61–64); design "New — `scripts/check-version-sync.mjs`", "Decision: Drift guard compares by structured JSON path", "Decision: Guard keeps a local literal", "Decision: Mirror `validate-changesets.mjs`".
- **Acceptance:**
  - When all four version-bearing values agree, `checkVersionSync({ repoRoot })` returns an empty array and `main()` returns `0` with nothing written to stdout or stderr.
  - When the two lockfile version fields disagree with `package.json`'s version, `main()` returns `1` and the stderr output names `package-lock.json` for both the top-level `.version` and the `.packages[""].version` paths (disambiguated by path) and shows the conflicting value(s) against the `package.json` baseline.
  - When `.claude-plugin/plugin.json`'s version disagrees, `main()` returns `1` and stderr names `.claude-plugin/plugin.json` and shows its conflicting value.
  - When `package.json`'s version is the lone disagreeing baseline (hand-edited so the other three differ from it), `main()` returns `1` and stderr shows `package.json` as the baseline and reports the other three locations as not matching it, with their conflicting value.
  - The four values are read by structured JSON path (parse-then-access), never by text/substring search, so unrelated `0.4.0`/`0.1.1` strings in the lockfile and a `CHANGELOG.md` version heading cannot cause a false pass or false fail.
  - The script uses only Node built-in modules and performs no network access.
  - Running `node scripts/check-version-sync.mjs` directly executes `main()` via the `isMainModule()` guard; importing the module (as in tests) does not.

### Task 2: Create the paired test `scripts/test/check-version-sync.test.mjs`

- **Goal:** Add the guard's paired test covering the pure function over temp-dir fixtures and the CLI via `spawnSync`, picked up by the existing `node --test 'scripts/test/**/*.test.mjs'` glob.
- **Type:** tdd
- **Files to change:** `scripts/test/check-version-sync.test.mjs` (new).
- **Changes:**
  - Mirror `scripts/test/validate-changesets.test.mjs`: `node:test` (`describe`/`test`/`beforeEach`/`afterEach`), `node:assert/strict`, `node:child_process` `spawnSync`, `node:fs` (`mkdtempSync`/`mkdirSync`/`writeFileSync`/`rmSync`), `node:os` `tmpdir`, `node:path` `join`, `node:url` `fileURLToPath`.
  - Provide a fixture builder that writes a temp `repoRoot` with `package.json`, `.claude-plugin/plugin.json` (note the nested directory), and `package-lock.json` (with both top-level `.version` and `.packages[""].version`, lockfileVersion 3, root entry name `@automattic/radical-pipelines`), each formatted with 2-space indent + trailing newline.
  - Unit tests on `checkVersionSync({ repoRoot })`: all-four-agree → `[]`; lockfile fields drifted → errors naming both lockfile paths; `plugin.json` drifted → error naming `plugin.json`; hand-edited `package.json` baseline → errors for the other three.
  - CLI tests via `spawnSync(process.execPath, [SCRIPT_PATH], { cwd: fixtureRoot, encoding: "utf8" })` resolving the script path with `new URL("../check-version-sync.mjs", import.meta.url)`: assert `status`, a `stderr` regex naming the offending file + value on failure, and empty `stdout` (and `status` `0`) on success.
- **Depends on:** Task 1
- **Traces to:** Spec requirements 10, 11; design "New — `scripts/test/check-version-sync.test.mjs`", "Decision: Mirror `validate-changesets.mjs`".
- **Acceptance:**
  - The test file is discovered and run by `npm test` (the `node --test 'scripts/test/**/*.test.mjs'` glob) and all its cases pass.
  - It includes at least one pure-function case asserting an empty result when all four agree and one asserting drift errors for each disagreeing-location scenario (lockfile fields, `plugin.json`, hand-edited `package.json`).
  - It includes at least one CLI `spawnSync` case asserting exit `0` with empty stdout when in sync, and one asserting exit `1` with a stderr that names the offending file and shows the conflicting value when drifted.
  - All fixtures are built in `mkdtempSync` temp directories and removed in `afterEach`; no test mutates the real repository files.

### Task 3: Append the lockfile sync to the `release:version` npm script

- **Goal:** Make every release path reconcile the lockfile by appending the lockfile-sync command to the single `release:version` composition point.
- **Type:** tdd
- **Files to change:** `package.json` (the `scripts.release:version` value).
- **Changes:** Change `scripts.release:version` from `changeset version && node scripts/sync-version.mjs` to `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`. The lockfile sync runs last; the `&&` chain stays fail-fast. Do not touch `scripts/sync-version.mjs`, do not add the lockfile to `TARGET_MANIFESTS`, do not edit `.github/workflows/release.yml` or `CONTRIBUTING.md` (both inherit the step by calling `npm run release:version`).
- **Depends on:** none
- **Traces to:** Spec requirements 1, 2, 3; acceptance criteria "lockfile sync during a release" (CI path, manual escape hatch) and "sync scope in the normal flow" (spec lines 45–53); design "Modified — `package.json`", "Decision: Append the lockfile sync to the `release:version` npm script".
- **Acceptance:**
  - The `release:version` script value is exactly `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`.
  - The appended command is last in the `&&` chain and preserves fail-fast ordering (bump → propagate to manifests → reconcile lockfile).
  - `scripts/sync-version.mjs` is unchanged and `TARGET_MANIFESTS` still lists only `.claude-plugin/plugin.json` (the lockfile is not added).
  - `package.json` remains valid JSON with its existing 2-space indent + trailing newline, and no other script or field is altered.

### Task 4: One-time backfill of the committed `package-lock.json` to 0.4.0

- **Goal:** Correct the existing drift by running `npm install --package-lock-only` once (with `package.json` already at `0.4.0`) and committing the resulting lockfile so both version fields read `0.4.0`.
- **Type:** tdd
- **Files to change:** `package-lock.json` (committed; both version fields → `0.4.0`).
- **Changes:**
  - Run `npm install --package-lock-only` once in the repository root, with `package.json` left at its current `0.4.0`. Do NOT run `npm run release:version` (that would also run `changeset version` and bump beyond `0.4.0`). Do NOT hand-edit the lockfile's version fields.
  - Commit the resulting `package-lock.json`. The expected diff is exactly the two version lines (top-level `.version` and `.packages[""].version`, both `0.1.1` → `0.4.0`). If the diff is wider, it signals an independently out-of-sync dependency tree (accepted trade-off, requirement 7); review before committing, but the guaranteed invariant to land is that both lockfile version fields equal `0.4.0`.
- **Depends on:** none (independent of Task 3; uses the mandated command directly)
- **Traces to:** Spec requirements 8, 9; acceptance criterion "one-time backfill" (spec line 57); design "Modified — `package-lock.json` (committed)", "Decision: Backfill the existing drift".
- **Acceptance:**
  - The committed `package-lock.json` top-level `.version` reads `0.4.0`.
  - The committed `package-lock.json` `.packages[""].version` reads `0.4.0`.
  - Both equal `package.json` `.version` (`0.4.0`), so all four version-bearing locations agree on the committed repo.
  - The lockfile was produced by `npm install --package-lock-only`, not by a hand-written edit of the version fields.

### Task 5: Wire the drift guard into the `changeset-gate.yml` `changeset` job

- **Goal:** Run the drift guard on every pull request by adding a step to the existing `changeset` job, inheriting the bot-PR exemption.
- **Type:** tdd
- **Files to change:** `.github/workflows/changeset-gate.yml`.
- **Changes:** Add a step `node scripts/check-version-sync.mjs` to the `changeset` job, adjacent to the existing "Validate changeset shape" step (`node scripts/validate-changesets.mjs`), placed after `npm ci` and `npm test`. Give it a descriptive `name` consistent with the existing step naming. Do not change job-level `if`, `permissions`, `concurrency`, or any other step; the new step inherits the job-level `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption.
- **Depends on:** Task 1 (the script must exist for the step to invoke)
- **Traces to:** Spec requirement 10; acceptance criteria "drift guard on the pull-request gate" (spec lines 61–64); design "Modified — `.github/workflows/changeset-gate.yml`", "Decision: Wire the guard as a step in the existing `changeset-gate.yml` `changeset` job".
- **Acceptance:**
  - The `changeset` job in `.github/workflows/changeset-gate.yml` contains a step that runs `node scripts/check-version-sync.mjs`.
  - The new step is positioned after `npm ci` and `npm test`, adjacent to the existing `node scripts/validate-changesets.mjs` step.
  - The job-level `if: github.head_ref != 'changeset-release/trunk'` exemption, `permissions` (`contents: read`, `pull-requests: read`), and `concurrency` are unchanged, so the new step inherits the bot-PR exemption and requires no extra permissions.
  - The workflow file remains valid YAML and no other job or step is altered.

### Task 6: Add the feature's own changeset

- **Goal:** Add a `.changeset/*.md` for this release-relevant change so the PR passes the existing changeset-required gate.
- **Type:** tdd
- **Files to change:** `.changeset/<name>.md` (new).
- **Changes:** Add a changeset file with valid front matter `"@automattic/radical-pipelines": patch` and a one-line summary describing the lockfile-version-sync wiring, backfill, and drift guard. `patch` is the chosen bump type (a build/release-tooling fix). The file must satisfy the existing `validate-changesets.mjs` shape rules (well-formed `---` fences, quoted package key, valid bump, non-empty body).
- **Depends on:** none
- **Traces to:** Design "Risks and Open Questions → Changeset for this feature" (design line 186); satisfies the existing "Require a changeset for release-relevant changes" gate so the spec's drift-guard acceptance criteria can be exercised on a passing PR.
- **Acceptance:**
  - A new `.changeset/*.md` exists with front matter `"@automattic/radical-pipelines": patch` and a non-empty body summary.
  - `node scripts/validate-changesets.mjs` passes against the repository (the new changeset is well-formed).
  - The bump type is `patch`.

### Task 7: Automate the end-to-end flows

- **Goal:** Implement the `## E2E test plan` flows as automated end-to-end tests so the acceptance criteria are verified against the real mechanisms (real `npm install --package-lock-only` subprocess and the real guard CLI), and the committed-repo backfill state is asserted.
- **Type:** e2e
- **Files to change:** end-to-end test file(s) under `scripts/test/` (picked up by the existing `node --test 'scripts/test/**/*.test.mjs'` glob), e.g. `scripts/test/version-sync.e2e.test.mjs`.
- **Changes:**
  - Implement Flows 1–4 (drift guard CLI) by spawning the real `node scripts/check-version-sync.mjs` against `mkdtempSync` temp-dir fixtures and asserting exit status, stderr content (offending file/path + conflicting value), and stdout.
  - Implement Flows 5–6 (real lockfile sync) by running the real `npm install --package-lock-only --no-audit --no-fund` subprocess against a dependency-consistent temp-dir fixture; assert both lockfile version fields equal `package.json`'s version (the guaranteed invariant), assert the two-field-only diff only because the fixture's dependency tree is constructed consistent, and assert byte-identical idempotent re-run.
  - Implement Flow 7 by asserting the committed `package.json` `release:version` string ends with the appended lockfile-sync command (and optionally the full-chain variant in a consistent fixture, asserting all four locations agree afterward).
  - Implement Flow 8 by reading the committed repository `package-lock.json` and `package.json` and asserting both lockfile version fields equal `package.json` `.version` (`0.4.0`).
  - Use only Node built-ins; clean up all temp dirs in `afterEach`; never mutate the real repository files.
- **Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5
- **Traces to:** All spec acceptance criteria (spec lines 45–64); the `## E2E test plan` Flows 1–8.
- **Acceptance:**
  - Each of Flows 1–8 in the `## E2E test plan` is covered by at least one automated test, all passing under `npm test`.
  - The lockfile-sync flows exercise the real `npm install --package-lock-only` subprocess (not a function override) and assert the guaranteed invariant (both lockfile version fields equal `package.json`'s version); the two-field-only-diff assertion is made only where the fixture's dependency tree is consistent.
  - The drift-guard flows spawn the real `node scripts/check-version-sync.mjs` CLI and assert exit status, stderr (offending file/path + conflicting value), and stdout.
  - The backfill flow asserts the committed repository lockfile's two version fields both equal `package.json` `.version` (`0.4.0`).
  - No test mutates the real repository working tree; all fixtures are temp dirs removed after each test.
