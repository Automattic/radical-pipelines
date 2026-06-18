# Code Plan: Keep package-lock version in sync with package.json automatically

## Overview

This repository records its version in three files: `package.json` (the source of truth), `.claude-plugin/plugin.json`, and `package-lock.json`. The release version step (`npm run release:version` = `changeset version && node scripts/sync-version.mjs`) bumps `package.json` and propagates the version to `plugin.json`, but nothing updates `package-lock.json`. As a result the lockfile's recorded version has drifted: `package.json` and `plugin.json` are at `0.4.0` while `package-lock.json` records `0.1.1` in both spots it carries the version (the top-level `.version` at line 3 and the root self-entry `.packages[""].version` at line 9). The dependency tree is in sync — only the lockfile's root version is stale — and no CI gate catches this class of drift. This plan implements three independent threads, all using Node built-ins only and no network access: (1) extend `scripts/sync-version.mjs` with a dedicated `syncLockfileVersion` that patches the lockfile's two version fields offline by JSON path (a mandatory target — a missing lockfile is a hard error), and extend its tests including the shared `makeFixture` to add a `package-lock.json`; (2) add a new read-only `scripts/check-version-sync.mjs` drift guard (pure collect-all-mismatches function + `main()` → `0|1` + per-mismatch stderr) modeled on the existing `scripts/validate-changesets.mjs`, with a paired test file; (3) wire the drift check as a new step in the existing `changeset` job in `.github/workflows/changeset-gate.yml`. Running the extended sync once also corrects the current live drift (lock `0.1.1` → `0.4.0` at both fields). Order: extend the sync (Task 1) and its tests, add the check (Task 2) and its tests, wire CI (Task 3), then perform the one-time live-drift correction (Task 4), then the e2e flows (Task 5).

## Guardrail scopes

None. This project defines no guardrail gates, and no scopes were passed to fill.

| Gate | Scope |
| ---- | ----- |
| (none) | None |

## E2E test plan

These flows exercise the spec's acceptance criteria and edge cases end to end. The code-writer-e2e automates them; the reviewer can manually re-drive them. Each flow operates on a temp-dir fixture (a throwaway repo root with `package.json`, `.claude-plugin/plugin.json`, and a canonical `package-lock.json`) unless it explicitly targets the real repository's files. "Real CLI" means invoking the script as a subprocess via `node <script> ` (e.g. `spawnSync(process.execPath, [scriptPath], { cwd })`), the way `validate-changesets.test.mjs` exercises its CLI.

### Flow 1: Release version step syncs the lockfile end to end

- **Steps:** Build a fixture where `package.json` is at a new version `N` (e.g. `0.5.0`), `.claude-plugin/plugin.json` and `package-lock.json` are at an older version `M` (e.g. `0.4.0`). Run the real `scripts/sync-version.mjs` CLI with the fixture as its working repo root (invoked so it resolves the fixture's files — e.g. via the fixture as cwd / repoRoot path the CLI uses). Inspect `package-lock.json` afterward.
- **Expected:** `package-lock.json`'s top-level `.version` and `.packages[""].version` both equal `N`. `.claude-plugin/plugin.json`'s `version` equals `N`. The CLI exits successfully and reports `package-lock.json` (and `plugin.json`) among the changed targets on stdout.
- **Traces to:** Acceptance criterion "release version step raises package.json … then package-lock.json's two version fields equal the new version with no manual follow-up" (Requirements 5, 4).

### Flow 2: Sync is idempotent on the lockfile

- **Steps:** Build a fixture where all three files already record the same version. Run the real sync CLI once; capture `package-lock.json` bytes. Run it a second time; capture again.
- **Expected:** After both runs, `package-lock.json` is byte-identical to its pre-run content (no change at all on a no-op), and the CLI reports "already in sync" / no changed targets.
- **Traces to:** Acceptance criterion "release version step runs when versions already match → package-lock.json is unchanged (idempotent)" (Requirement 6).

### Flow 3: Sync changes only the two version fields, no other lockfile churn

- **Steps:** Build a fixture whose `package-lock.json` is canonical (`lockfileVersion: 3`, top-level `.version`, `.packages[""]` self-entry with `name`/`version`, and at least one `node_modules/...` dependency entry — including one dependency whose `version` equals the stale package version) at version `M`, with `package.json` at version `N`. Capture `package-lock.json` bytes before. Run the real sync CLI. Capture bytes after and diff line by line.
- **Expected:** Exactly two lines differ — the top-level `.version` line and the `.packages[""].version` line — both now `N`. `lockfileVersion`, the full dependency tree, entry ordering, 2-space indentation, and the trailing newline are unchanged. The `node_modules/...` dependency whose version equals the stale package version is NOT changed.
- **Traces to:** Acceptance criteria "only difference is the two version values; lockfileVersion, dependency tree, ordering, indentation, trailing newline unchanged" and "shows changes only to the two version fields and no other churn" (Requirements 3, 7); Risk "structured (not text) patch is load-bearing".

### Flow 4: Sync makes no registry request (offline success)

- **Steps:** Build a fixture as in Flow 1. Run the real sync CLI in an environment where no package registry is reachable (the sync uses only `node:fs`/`node:path`/`node:url` and performs no network I/O, so it must succeed regardless of registry reachability).
- **Expected:** The CLI completes successfully and `package-lock.json`'s two version fields are updated to `N`. No network access is attempted by the lockfile version sync.
- **Traces to:** Acceptance criterion "release version step runs with no package registry reachable → still updates the two version fields and completes successfully" (Requirement 8).

### Flow 5: Drift check passes when all three files agree

- **Steps:** Build a fixture where `package.json`, both `package-lock.json` version fields, and `.claude-plugin/plugin.json` all record the same version. Run the real `scripts/check-version-sync.mjs` CLI with the fixture as cwd.
- **Expected:** Exit status `0`; empty stderr; empty stdout.
- **Traces to:** Acceptance criterion "all three files record the same version → drift check passes with zero exit status" (Requirement 10).

### Flow 6: Drift check fails on a single mismatch, naming the file and field

- **Steps:** Build a fixture where exactly one of the three checked fields differs from `package.json` (e.g. `.claude-plugin/plugin.json`'s `version`). Run the real check CLI with the fixture as cwd.
- **Expected:** Exit status non-zero (`1`); stderr contains one line identifying the mismatched file and field (path, field, expected, actual); empty stdout.
- **Traces to:** Acceptance criterion "exactly one version field differs → fails with non-zero status and a message identifying that mismatched file and field" (Requirement 10).

### Flow 7: Drift check fails on multiple simultaneous mismatches, reporting every one

- **Steps:** Build a fixture reproducing the live drift: `package.json` at `0.4.0`, `package-lock.json` at `0.1.1` in BOTH fields. Run the real check CLI with the fixture as cwd.
- **Expected:** Exit status non-zero (`1`); stderr contains a line for the top-level `.version` mismatch AND a line for the `.packages[""].version` mismatch (every mismatched file+field, not only the first); empty stdout.
- **Traces to:** Acceptance criterion "more than one version field differs at once … fails and identifies every mismatched file and field, not only the first" (Requirement 10).

### Flow 8: CI wiring runs the drift check on PRs to trunk but not the bot PR

- **Steps:** Inspect `.github/workflows/changeset-gate.yml`. Confirm the `changeset` job triggers on `pull_request` to `trunk`, carries `if: github.head_ref != 'changeset-release/trunk'`, and includes a step that runs `node scripts/check-version-sync.mjs`.
- **Expected:** The drift-check step is present in the `changeset` job (inheriting that job's `pull_request → trunk` trigger and its bot-PR `if` exemption), so it runs on PRs to `trunk` other than the bot `changeset-release/trunk` PR, and a non-zero exit fails the step (which fails the job).
- **Traces to:** Acceptance criteria "PR to trunk other than the bot PR → drift check runs as part of CI and blocks merge if it fails" and "bot Version Packages PR → drift check is not required to gate it" (Requirement 11). Note: whether the workflow is a *required* status check that actually blocks merge is GitHub branch-protection configuration, not expressible in-tree (Design "Risks"); this flow asserts only the in-tree wiring.

### Flow 9: Live repository drift is corrected and the real lockfile passes the check

- **Steps:** After the one-time correction is applied to the real `package-lock.json`, run `node scripts/check-version-sync.mjs` against the real repository root.
- **Expected:** The real `package-lock.json`'s top-level `.version` and `.packages[""].version` both equal `0.4.0` (matching `package.json` and `plugin.json`); the only change to `package-lock.json` versus its prior state is those two version lines (lines 3 and 9); the drift check exits `0`.
- **Traces to:** Acceptance criteria "current drift … brought back into sync → both lockfile fields equal package.json's version" and "only difference is the two version values" (Requirements 1, 2, 3); spec "Correcting the current drift".

## Tasks

### Task 1: Extend `sync-version.mjs` to patch the lockfile's two version fields (mandatory target)

- **Goal:** Make the existing version-sync script also keep `package-lock.json`'s two version fields (`.version` and `.packages[""].version`) equal to the root `package.json` version, via a structured, offline, path-targeted patch that preserves all other lockfile content. The lockfile is a mandatory target.
- **Type:** tdd
- **Files to change:**
  - `scripts/sync-version.mjs` (modify)
  - `scripts/test/sync-version.test.mjs` (modify — extend the shared `makeFixture` and add lockfile cases)
- **Changes:**
  - In `scripts/sync-version.mjs`, add a new function `syncLockfileVersion(lockfilePath, version)` that: reads the file at `lockfilePath` with `readFileSync(..., "utf8")` (no skip-if-absent branch — a missing file throws `ENOENT` by design); `JSON.parse`s it; sets `obj.version = version` and `obj.packages[""].version = version`; reserializes through the existing canonical write path `JSON.stringify(obj, null, 2) + "\n"`; writes with `writeFileSync` only if the serialized content differs from the original; returns `true` if the content changed, else `false`.
  - Modify `syncVersion(options)` so that, after running the existing per-manifest loop over `TARGET_MANIFESTS` (left exactly as-is), it resolves the lockfile path as `join(repoRoot, "package-lock.json")`, always calls `syncLockfileVersion(lockfilePath, version)`, and pushes `"package-lock.json"` into the combined `changed` array when that call returns `true`. The function signature and return shape `{ version, changed }` are unchanged. Do NOT add the lockfile to `TARGET_MANIFESTS`; do NOT modify `syncManifestVersion`.
  - Add `syncLockfileVersion` to the module's `export { ... }` list, preserving the existing exports `readRootVersion`, `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`.
  - The existing CLI block (under `isMainModule()`) needs no structural change: it already iterates `changed` and prints `Updated <target> to version <version>.`, which now naturally includes `package-lock.json`.
  - In `scripts/test/sync-version.test.mjs`, extend the shared `makeFixture(rootVersion, targetVersion)` to also write a canonical `package-lock.json` at the temp root. The lockfile fixture must contain: `lockfileVersion: 3`; a top-level `version` set to `targetVersion`; a `packages` object containing the `""` self-entry with `name` and `version: targetVersion`; and at least one `node_modules/...` dependency entry whose `version` equals `targetVersion` (so a test can assert that dependency is NOT touched — the structured-patch correctness guard). Serialize it with `JSON.stringify(lock, null, 2) + "\n"` to match the canonical write path. The existing `package.json` and target-manifest writes are unchanged.
  - Import `syncLockfileVersion` into the test file. Add test cases (the code-writer-tdd chooses exact unit tests in the RED phase) covering: both `.version` and `.packages[""].version` get set to the root version after `syncVersion`; only those two lines change relative to the pre-run lockfile bytes (line-diff style, mirroring the existing manifest format-preservation test); idempotency on a second `syncVersion` run (no further diff, `changed` excludes the lockfile); and that the `node_modules/...` dependency at the stale value is unchanged. The existing `plugin.json` assertions must continue to pass unchanged.
- **Depends on:** none
- **Traces to:** Spec Requirements 4, 5, 6, 7, 8, 12, 13; Acceptance criteria for release-step sync, idempotency, no-churn, offline success, and `plugin.json` staying correct; Design "Decision: Sync the lockfile via a structured, offline, path-targeted patch" and "Decision: A dedicated `syncLockfileVersion` function".
- **Acceptance:**
  - After `syncVersion({ repoRoot })` against a fixture whose `package.json` version differs from its lockfile, `package-lock.json`'s top-level `.version` equals the root version.
  - After the same run, `package-lock.json`'s `.packages[""].version` equals the root version.
  - The result's `changed` array includes `"package-lock.json"` when the lockfile's version fields moved, and excludes it when they did not.
  - When the dependency tree already matches, only the two version lines of `package-lock.json` change; `lockfileVersion`, the dependency entries, entry ordering, 2-space indentation, and the trailing newline are byte-identical before and after.
  - A `node_modules/...` dependency whose `version` equals the stale package version is not modified by the sync.
  - A second consecutive `syncVersion` run produces no further change to `package-lock.json` and reports no changed targets.
  - `syncVersion` performs no network access (uses only `node:fs`/`node:path`/`node:url`).
  - `syncLockfileVersion(lockfilePath, version)` throws (`ENOENT`) when no file exists at `lockfilePath` (no skip-if-absent branch).
  - The pre-existing `plugin.json` propagation assertions in `sync-version.test.mjs` still pass.
  - `syncLockfileVersion` is exported; `readRootVersion`, `syncManifestVersion`, `syncVersion`, and `TARGET_MANIFESTS` remain exported.

### Task 2: Add the read-only `check-version-sync.mjs` drift guard and its tests

- **Goal:** Add a new read-only script that compares the root `package.json` version against all three checked fields, collects every mismatch (never stopping at the first), prints one stderr line per mismatch, and exits `0` (all match) or `1` (any mismatch) — modeled on `scripts/validate-changesets.mjs`. It must never write.
- **Type:** tdd
- **Files to change:**
  - `scripts/check-version-sync.mjs` (new)
  - `scripts/test/check-version-sync.test.mjs` (new)
- **Changes:**
  - Create `scripts/check-version-sync.mjs` using only Node built-ins (`node:fs`, `node:path`, `node:url`), no network. Mirror the structure of `scripts/validate-changesets.mjs`: a pure check function, a `main()`, an `isMainModule()` guard, and an `export { ... }`.
  - Export a pure function `checkVersionSync(inputs)` that compares the root version against each of the three checked fields and returns an array of mismatch objects `{ file, field, expected, actual }`, collecting ALL mismatches (never short-circuiting). The three checked fields are: `package-lock.json` `.version`; `package-lock.json` `.packages[""].version`; `.claude-plugin/plugin.json` `.version`. (The shape of `inputs` — e.g. the parsed objects or their version values — is the code-writer's choice, provided the function is pure and testable and collects all mismatches.)
  - Add `main()` that reads `package.json`, `package-lock.json`, and `.claude-plugin/plugin.json` from the current working directory, derives the inputs, calls `checkVersionSync`, prints one stderr line per mismatch identifying file, field, expected, and actual (exact wording is the code-writer's quality choice; the contract is one line per mismatched file+field naming all four parts), writes nothing to stdout, and returns `1` if any mismatch else `0`.
  - Add the `isMainModule()` guard (copy the established pattern from the sibling scripts — compare resolved real paths of this module and `process.argv[1]`) and, when run directly, `process.exit(main())`.
  - Export both `checkVersionSync` and `main`.
  - Create `scripts/test/check-version-sync.test.mjs` following the repo's test conventions (`node:test`, `node:assert/strict`, temp-dir fixtures via `mkdtempSync`, torn down in `afterEach`; CLI exercised via `spawnSync(process.execPath, [scriptPath], { cwd })`), mirroring `validate-changesets.test.mjs`. Cover (code-writer-tdd picks exact unit tests in RED): `checkVersionSync` returns `[]` when all three fields match; returns exactly one mismatch (correct `file`/`field`/`expected`/`actual`) when one field differs; returns multiple mismatches when both lockfile fields differ (collect-all behavior); and CLI tests asserting exit `0`/empty stderr on all-match and exit `1`/per-mismatch stderr/empty stdout on mismatch.
- **Depends on:** none
- **Traces to:** Spec Requirement 10; Acceptance criteria for pass (all match), single-mismatch fail, and multi-mismatch fail (every mismatched file+field reported); Design "Decision: A new read-only `check-version-sync.mjs` modeled on `validate-changesets.mjs`".
- **Acceptance:**
  - `checkVersionSync` returns an empty array when all three checked fields equal the root version.
  - `checkVersionSync` returns exactly one mismatch object, with correct `file`, `field`, `expected`, and `actual`, when exactly one field differs.
  - `checkVersionSync` returns a mismatch object for EACH differing field (e.g. two entries when both lockfile version fields differ); it never stops at the first.
  - `main()` returns `0` and writes nothing to stderr or stdout when all fields match.
  - `main()` returns `1`, writes one stderr line per mismatch (each naming file, field, expected, actual), and writes nothing to stdout when any field differs.
  - The script reads files only — it never writes any file — and uses only Node built-ins with no network access.
  - `checkVersionSync` and `main` are exported; the script runs `process.exit(main())` only when executed directly (guarded by `isMainModule()`).

### Task 3: Wire the drift check into the existing `changeset` CI job

- **Goal:** Add a step that runs `node scripts/check-version-sync.mjs` to the existing `changeset` job in `.github/workflows/changeset-gate.yml`, so the drift check runs on PRs to `trunk` and inherits the job's bot-PR exemption.
- **Type:** e2e
- **Files to change:**
  - `.github/workflows/changeset-gate.yml` (modify)
- **Changes:**
  - Add a new step to the `changeset` job's `steps:` list:
    `- name: Check version sync` / `run: node scripts/check-version-sync.mjs`.
  - Place it alongside the other validation steps (after `npm ci`/`npm test`, in sequence with `Validate changeset shape` and `Require a changeset for release-relevant changes`). Do NOT add a new job, a new workflow, or a duplicate `if`/checkout/setup; the step inherits the job's `pull_request → trunk` trigger, its `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption, and its environment.
- **Depends on:** Task 2 (the step invokes the script created there)
- **Traces to:** Spec Requirement 11; Acceptance criteria "PR to trunk other than the bot PR → drift check runs as part of CI and blocks merge if it fails" and "bot Version Packages PR → drift check is not required to gate it"; Design "Decision: Add the drift check as a step in the existing `changeset` job".
- **Acceptance:**
  - The `changeset` job in `.github/workflows/changeset-gate.yml` contains a step that runs `node scripts/check-version-sync.mjs`.
  - The job retains its `pull_request` trigger on `branches: [trunk]` and its `if: github.head_ref != 'changeset-release/trunk'` condition, so the new step runs on PRs to `trunk` other than the bot `changeset-release/trunk` PR.
  - No new job or workflow is introduced, and no checkout/setup/`if` is duplicated for the new step.
  - The workflow YAML remains valid (parses, single `changeset` job, steps in a coherent sequence).

### Task 4: Correct the current live drift in the real `package-lock.json`

- **Goal:** Bring the real repository's `package-lock.json` into sync by running the extended sync once, setting both version fields from `0.1.1` to `0.4.0`, changing only those two lines.
- **Type:** e2e
- **Files to change:**
  - `package-lock.json` (corrected — only line 3 `.version` and line 9 `.packages[""].version`)
- **Changes:**
  - Run `node scripts/sync-version.mjs` (the extended script from Task 1) once against the real repository root. This sets the real `package-lock.json`'s top-level `.version` (line 3) and `.packages[""].version` (line 9) from `0.1.1` to `0.4.0` (matching `package.json` and `.claude-plugin/plugin.json`, both already `0.4.0`). No separate one-shot tool is used. `.claude-plugin/plugin.json` is already at `0.4.0` and is left unchanged by the write-only-if-changed guard.
  - Verify the change touched only lines 3 and 9 of `package-lock.json` (e.g. via `git diff`): `lockfileVersion`, the dependency tree (including `node_modules/@changesets/logger` at `0.1.1`, line 721), entry ordering, indentation, and the trailing newline are unchanged.
- **Depends on:** Task 1
- **Traces to:** Spec Requirements 1, 2, 3; Acceptance criteria "current drift … brought back into sync → both lockfile fields equal package.json's version" and "only difference is the two version values"; Design "Decision: Reuse the release path; no new run wiring … The same extended script run once corrects the current live drift" and "Files corrected but otherwise untouched".
- **Acceptance:**
  - The real `package-lock.json`'s top-level `.version` equals `0.4.0` (equal to `package.json`'s `version`).
  - The real `package-lock.json`'s `.packages[""].version` equals `0.4.0`.
  - The diff of `package-lock.json` versus its prior committed state changes only the two version lines (lines 3 and 9); `lockfileVersion`, the full dependency tree, entry ordering, indentation, and the trailing newline are unchanged.
  - `node_modules/@changesets/logger`'s `version` remains `0.1.1` (the legitimate dependency at the same value as the former stale package version is not corrupted).
  - `.claude-plugin/plugin.json` remains `0.4.0` and unchanged.
  - Running `node scripts/check-version-sync.mjs` against the real repository root after the correction exits `0`.

### Task 5: Author the end-to-end test flows

- **Goal:** Implement the `## E2E test plan` flows as automated end-to-end tests that drive the real scripts (`sync-version.mjs` and `check-version-sync.mjs`) as the user/CI would, satisfying the acceptance criteria across the whole feature.
- **Type:** e2e
- **Files to change:**
  - `scripts/test/sync-version.test.mjs` and/or `scripts/test/check-version-sync.test.mjs` (extend with CLI-level / end-to-end cases as needed; the code-writer-e2e may add a dedicated e2e test file under `scripts/test/` following the same `node:test` conventions if clearer).
- **Changes:**
  - Automate Flows 1–4 against `scripts/sync-version.mjs` (release-step sync, idempotency, two-fields-only-no-churn, offline success), driving the script as a real CLI / via `syncVersion` against temp-dir fixtures that include a canonical `package-lock.json`.
  - Automate Flows 5–7 against `scripts/check-version-sync.mjs` (all-match pass; single-mismatch fail naming file+field; multi-mismatch fail reporting every field), driving the script as a real CLI via `spawnSync` against temp-dir fixtures.
  - For Flow 8 (CI wiring) and Flow 9 (live correction), assert in-tree state: Flow 8 verifies `.github/workflows/changeset-gate.yml` contains the drift-check step within the `changeset` job under its existing trigger and `if`; Flow 9 verifies the real `package-lock.json` is corrected and `node scripts/check-version-sync.mjs` against the real root exits `0`. (These may be covered by reviewer manual re-drive plus the assertions already in Tasks 3 and 4; the code-writer-e2e automates whatever is feasible as a test.)
  - All e2e tests run under `npm test` (`node --test 'scripts/test/**/*.test.mjs'`) and must pass with the full suite.
- **Depends on:** Task 1, Task 2, Task 3, Task 4
- **Traces to:** All spec Acceptance Criteria (release-step sync, idempotency, no-churn, offline success, drift-check pass/single/multi, CI wiring, bot-PR exemption, suite passes); spec Requirement 12 (covered by automated tests; full suite passes).
- **Acceptance:**
  - Each E2E flow (1–7) has a corresponding automated test that drives the real script and asserts its documented Expected outcome.
  - The end-to-end sync tests assert both the sync result (both lockfile version fields updated) and format preservation (only the two version lines change).
  - The end-to-end check tests assert exit status and per-mismatch stderr for the all-match, single-mismatch, and multi-mismatch cases.
  - The full test suite (`npm test`) passes with all flows included.
