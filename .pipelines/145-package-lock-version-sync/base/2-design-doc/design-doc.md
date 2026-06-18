# Design Doc: Keep package-lock version in sync with package.json automatically

## Overview

The repository records its version in three files: `package.json` (the source of truth), `.claude-plugin/plugin.json`, and `package-lock.json`. The release version step (`npm run release:version`) bumps `package.json` and propagates the version to `plugin.json`, but nothing updates `package-lock.json`. As a result the lockfile's recorded version has silently drifted: `package.json` and `plugin.json` are at `0.4.0` while `package-lock.json` records `0.1.1` in both spots it carries the version. The dependency tree is in sync — only the lockfile's root version is stale — and no CI gate catches this class of drift, so it ships verbatim in the published git tag / GitHub Release.

This design corrects the current drift, makes the release process keep the lockfile's version in sync automatically on every bump, and adds a CI check that detects version drift across the three files so future divergence is caught before merge. It does so by extending the existing `scripts/sync-version.mjs` to also patch the lockfile's two version fields (offline, by JSON path), adding a new read-only drift-check script modeled on the repo's existing `scripts/validate-changesets.mjs`, and wiring that check into the existing `changeset-gate.yml` job — introducing no new runtime dependency and no network access for the sync.

## Approach

The version source of truth is `package.json`'s `version` field. `package-lock.json` records the version in exactly two places: the top-level `.version` field and the root self-entry `.packages[""].version` field. (`package-lock.json` is `lockfileVersion: 3`; the root self-entry — the `.packages` key whose value is `""` — always carries the package's own `name` and `version`, while every other `.packages` key is a `node_modules/...` dependency whose `version` must not change.)

The feature is realized along three independent threads, all reusing facilities the repo already has:

1. **Sync (mutating).** Extend `scripts/sync-version.mjs` so that, in addition to propagating the root version to `plugin.json`, it patches the lockfile's two version fields with a structured, offline, path-targeted edit: parse the lockfile, set `obj.version` and `obj.packages[""].version` to the root version, reserialize through the script's existing `JSON.stringify(obj, null, 2) + "\n"` write path, and write only if the content changed. Because the lockfile is already in canonical JSON shape, this reserialize is byte-identical apart from the two version lines. A naive text/regex replace is explicitly **not** used: the value `"0.1.1"` also appears as a legitimate dependency version (`@changesets/logger` at line 721), so a global replace would corrupt a real dependency. The structured path-targeted patch touches only the two version fields.

2. **Automatic propagation and one-time correction.** No new run wiring is needed. `release:version` is already defined as `changeset version && node scripts/sync-version.mjs` (`package.json`), so once the script patches the lockfile, every bump syncs it in the same step. The `release.yml` workflow invokes `npm run release:version` (overriding the changesets action default), and the changesets release action commits all resulting working-tree changes into the auto-opened "Version Packages" pull request — so the patched `package-lock.json` rides along to `trunk` and the published tag. Running the same extended script once also corrects the current live drift (sets both fields to `0.4.0`), so no separate one-shot tool is required.

3. **Drift detection (read-only).** Add a new `scripts/check-version-sync.mjs` modeled on `scripts/validate-changesets.mjs`: a pure function that collects **all** mismatches across the three checked fields, plus a `main()` that reads the files from the working directory, prints one line per mismatch to stderr, and returns `0` or `1`. Wire it as a new step in the existing `changeset` job in `.github/workflows/changeset-gate.yml`, so it inherits the job's `pull_request → trunk` trigger and its existing `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption.

## Components

### `scripts/sync-version.mjs` (modified)

Today this script reads the root `package.json` version and, for each entry in `TARGET_MANIFESTS` (currently `[".claude-plugin/plugin.json"]`), calls `syncManifestVersion(path, version)` — which sets a single `.version` field, reserializes, and writes only if changed. `syncVersion(options)` orchestrates these and returns `{ version, changed: string[] }`. The script uses only Node built-ins (`node:fs`, `node:path`, `node:url`), performs no network access, and is idempotent and outward-only by design.

The lockfile breaks the script's current "one `.version` field per target" model because it needs two paths set in one file. It must **not** be added to `TARGET_MANIFESTS`, because `syncManifestVersion` would set only `.version` and leave `.packages[""].version` stale.

The modification adds a dedicated, narrowly-scoped function — `syncLockfileVersion(lockfilePath, version)` — that parses the lockfile, sets both `obj.version` and `obj.packages[""].version`, reserializes through the same `JSON.stringify(obj, null, 2) + "\n"` write path, and writes only if changed (returning a `changed` boolean). `syncVersion()` calls both the existing per-manifest path (unchanged) and the new lockfile path, and folds the lockfile into its combined `changed` list.

**Lockfile contract: the lockfile is mandatory, not optional.** Because the lockfile is the second target the feature exists to keep in sync, `syncVersion()` always resolves `package-lock.json` from `repoRoot` (`join(repoRoot, "package-lock.json")`) and always runs `syncLockfileVersion` against it; a missing lockfile is a hard error (`readFileSync` throws `ENOENT`), not a skipped step. There is deliberately no "skip if absent" robustness branch: a repository without a lockfile is a broken state the sync should surface loudly, consistent with the script's outward-only, fail-loud philosophy and with the drift check's identical treatment of a missing lockfile.

The existing per-manifest *logic* (`TARGET_MANIFESTS` / `syncManifestVersion`) is left untouched, so `plugin.json` propagation behaves exactly as before. However, because every existing test drives `syncVersion({ repoRoot })` against a shared fixture that today builds no lockfile (`scripts/test/sync-version.test.mjs`, `makeFixture`), making the lockfile mandatory means that **shared fixture must change** to also write a `package-lock.json`, or those existing `syncVersion` tests would throw `ENOENT`. This is a fixture change, not a behavior change to the manifest path: the assertions about `plugin.json` continue to hold unchanged; the fixture simply gains a lockfile so `syncVersion` has the file its new contract requires. See "Components → tests" and "Interfaces and Data Flow" for the precise contract and fixture impact.

### `scripts/check-version-sync.mjs` (new)

A read-only verifier modeled on `scripts/validate-changesets.mjs`. It exports a pure check function that compares the root `package.json` version against all three checked fields and collects **every** mismatch (never stops at the first), plus a `main()` that reads the files from the working directory, prints one stderr line per mismatch, writes nothing to stdout, and returns `0 | 1`, guarded by `isMainModule()`. Node built-ins only; no network. This component is strictly separate from the mutating sync script (a verifier must never write).

### `scripts/test/sync-version.test.mjs` (modified) and `scripts/test/check-version-sync.test.mjs` (new)

Tests following the established `scripts/test/*.test.mjs` conventions (`node:test`, `node:assert/strict`, temp-dir fixtures via `mkdtempSync`, torn down in `afterEach`; run by `npm test` = `node --test 'scripts/test/**/*.test.mjs'`).

`sync-version.test.mjs` changes in two ways, both forced by the mandatory-lockfile contract above:

- **Shared fixture (`makeFixture`) gains a lockfile.** Because `syncVersion()` now always patches `package-lock.json` from `repoRoot`, the shared fixture must write a minimal canonical `package-lock.json` (`lockfileVersion: 3`, a `.version`, and a `.packages` object containing the `""` self-entry with `name`/`version`, plus at least one `node_modules/...` dependency entry to guard the structured-vs-text-replace assertion) alongside the existing `package.json` and target manifests. Without this, the already-passing `syncVersion` tests ("copies the root version…", "reports which targets changed", idempotency) would throw `ENOENT`. The existing assertions about `plugin.json` are unchanged; the fixture only grows.
- **New lockfile assertions.** Added cases assert both `.version` and `.packages[""].version` are set to the root version, that only those two lines change (byte-level format preservation in the same line-diff style already used for manifests), idempotency on a second run, and that a `node_modules/...` dependency at the same value as the stale package version is **not** touched (the structured-patch correctness guard).

`check-version-sync.test.mjs` is new, mirroring `validate-changesets.test.mjs` (pure-function unit tests plus a `spawnSync` CLI test).

### `.github/workflows/changeset-gate.yml` (modified)

The existing single `changeset` job (triggered `on: pull_request: branches: [trunk]`, with `if: github.head_ref != 'changeset-release/trunk'`) runs sequential steps: checkout → setup-node → `npm ci` → `npm test` → validate changesets → `changeset status`. A new `- name: Check version sync` / `run: node scripts/check-version-sync.mjs` step is added to this job, inheriting its trigger, environment, and bot-PR exemption.

### Files corrected but otherwise untouched

- `package-lock.json` — the live drift is corrected by running the extended sync once; only lines 3 (`.version`) and 9 (`.packages[""].version`) change.
- `.claude-plugin/plugin.json` — already in sync at `0.4.0`; the sync leaves it unchanged (no-op write avoided by the write-only-if-changed guard).

### Components deliberately not involved

- `release.yml` — already invokes `npm run release:version`; no change needed.
- `package.json`'s `release:version` script — already `changeset version && node scripts/sync-version.mjs`; no change needed.
- The lockfile dependency tree — out of scope; the structured patch never reads or mutates it.

## Interfaces and Data Flow

### `scripts/sync-version.mjs` interfaces

```
syncLockfileVersion(lockfilePath: string, version: string) -> boolean   // changed?
// parse lockfile; set obj.version and obj.packages[""].version;
// reserialize JSON.stringify(obj, null, 2) + "\n"; write only if changed.
// REQUIRES the file at lockfilePath to exist; throws (ENOENT) if absent.

syncVersion(options?) -> { version: string, changed: string[] }
// unchanged signature; `changed` now also includes "package-lock.json" when its
// version fields moved. The existing options.repoRoot override (used by tests)
// is extended to locate the lockfile (join(repoRoot, "package-lock.json")).
// CONTRACT: the lockfile is a MANDATORY target — syncVersion always calls
// syncLockfileVersion. There is no skip-if-absent branch: if no
// package-lock.json exists under repoRoot, syncVersion throws (ENOENT).
// Consequence for tests: any fixture passed via options.repoRoot must include a
// package-lock.json; the shared makeFixture is updated accordingly.
```

Existing exports (`readRootVersion`, `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`) are preserved; `syncLockfileVersion` is added to the exports for direct unit testing. CLI behavior is unchanged in shape: it prints which targets changed (now including `package-lock.json` when applicable) or a "already in sync" message.

### `scripts/check-version-sync.mjs` interfaces

```
checkVersionSync(inputs) -> { file: string, field: string, expected: string, actual: string }[]
// pure; compares the root version against each checked field; collects ALL mismatches.

main() -> 0 | 1
// reads package.json, package-lock.json, .claude-plugin/plugin.json from CWD;
// prints one stderr line per mismatch (e.g. "<path>: <field> expected <X>, got <Y>");
// writes nothing to stdout; returns 1 if any mismatch, else 0.
```

The three checked fields are:
- `package-lock.json` `.version`
- `package-lock.json` `.packages[""].version`
- `.claude-plugin/plugin.json` `.version`

(The exact stderr wording is an implementation-phase quality choice; the contract is "one line per mismatched file+field, identifying file, field, expected, and actual.")

### Data flow

**Release / propagation path:** `npm run release:version` → `changeset version` bumps `package.json` (and writes the changelog) → `node scripts/sync-version.mjs` reads the new root version and patches `plugin.json` and `package-lock.json` (both lockfile version fields) → the changesets release action commits all working-tree changes into the "Version Packages" PR (`changeset-release/trunk`) → merged to `trunk` → published in the git tag / GitHub Release. The lockfile patch is pure local file I/O; it makes no registry request.

**Drift-check path (CI):** A pull request to `trunk` (other than the bot PR) triggers `changeset-gate.yml` → the `changeset` job checks out, installs, and runs its steps, including `node scripts/check-version-sync.mjs` → the script reads the three files from the checked-out tree, compares versions, and exits `0` (pass) or `1` (fail, with per-mismatch stderr). A non-zero exit fails the step, which fails the job. The bot "Version Packages" PR (head branch `changeset-release/trunk`) skips the whole job via the job-level `if`, so the drift check does not gate it.

## Key Decisions

### Decision: Sync the lockfile via a structured, offline, path-targeted patch in `sync-version.mjs`

- **Choice:** Extend `scripts/sync-version.mjs` to parse `package-lock.json`, set `obj.version` and `obj.packages[""].version` by JSON path, and reserialize through the existing canonical write path, writing only if changed. Pure file I/O, no network.
- **Alternatives:** (a) `npm install --package-lock-only --offline` invoked from the release flow; (b) a naive text/regex replace of `"version": "..."` in the lockfile.
- **Trade-offs:** The chosen patch is offline by construction (no registry, no cache), deterministic, and touches only the two version fields, so it cannot mask or mutate the dependency tree; it adds no dependency and reuses the byte-stable write path proven byte-identical on the real lockfile. Cost: the script must distinguish the lockfile (two paths) from simple manifests (one `.version`), a small generalization. Alternative (a) meets the bars *today* but only conditionally — its offline-safety and minimality hold only while the dependency tree already matches the lock; it also revalidates the tree (out of scope) and couples the sync to npm CLI behavior. Alternative (b) is unsafe: `"0.1.1"` also appears as a legitimate dependency version (`@changesets/logger`, line 721), so a global replace would corrupt it.
- **Traces to:** Requirements 5, 6, 7, 8, 13; Acceptance criteria for the release-step sync, idempotency, no-churn, and offline success; Out of Scope (no registry access, no churn beyond the two fields, no dep-tree mutation).

### Decision: A dedicated `syncLockfileVersion` function, leaving the existing manifest path unchanged

- **Choice:** Add a separate `syncLockfileVersion(path, version)` for the two-field lockfile; keep `TARGET_MANIFESTS` + `syncManifestVersion` exactly as-is for single-`.version` manifests like `plugin.json`. `syncVersion()` calls both and combines the `changed` list.
- **Alternatives:** (a) Generalize every target to a `(path, [fieldPaths])` model; (b) add the lockfile to `TARGET_MANIFESTS` and make `syncManifestVersion` also set `packages[""].version` "if present."
- **Trade-offs:** The dedicated function is the smallest, clearest change; the simple-manifest *logic* stays exactly as it is today, and the lockfile gets a single-responsibility handler whose two-field / format-preservation contract is directly unit-testable. Slight duplication of the parse/reserialize/write-if-changed skeleton. Alternative (a) over-engineers a two-element world and rewrites a path covered by passing tests, raising regression risk on `plugin.json` for no current benefit. Alternative (b) conflates two field-shapes in one function (murkier contract, branchier tests, risk of an accidental `packages[""]` write on a non-lockfile manifest).
- **Test impact (explicit):** This decision makes the lockfile a mandatory target of `syncVersion`, so the shared test fixture (`makeFixture`) must be extended to include a `package-lock.json`; the existing `plugin.json` assertions are unchanged, but the fixture and the `syncVersion`-driven tests do touch the lockfile now. The manifest *logic* is preserved; the test *fixture* changes.
- **Traces to:** Requirements 4, 5, 6, 7, 12, 13; Acceptance criteria for the release-step sync, idempotency, no-churn, and `plugin.json` staying correct.

### Decision: A new read-only `check-version-sync.mjs` modeled on `validate-changesets.mjs`

- **Choice:** A new `scripts/check-version-sync.mjs` with a pure `checkVersionSync` that collects all mismatches, a `main()` that prints every mismatch to stderr and returns `0|1`, guarded by `isMainModule()`. Node built-ins only.
- **Alternatives:** Fold the check into `sync-version.mjs` behind a `--check` flag (sync vs. verify modes in one file).
- **Trade-offs:** The new script mirrors the established `validate-changesets.mjs` precedent exactly (same export + `isMainModule()` + stderr `path: msg` + collect-all-errors shape), is single-responsibility, independently testable, and its "collect all, never stop at first" behavior maps one-to-one onto the multi-mismatch requirement. Cost: a new file — but one-script-per-check is the house pattern. The flag alternative conflates a mutating tool with a read-only verifier (a hazardous dual contract) and complicates both CLI and tests.
- **Traces to:** Requirement 10; Acceptance criteria for pass (all match), single-mismatch fail, and multi-mismatch fail (every mismatched file+field reported).

### Decision: Reuse the release path; no new run wiring for propagation or one-time correction

- **Choice:** Rely on the existing `release:version` command (`changeset version && node scripts/sync-version.mjs`) and the existing `release.yml` invocation of `npm run release:version`. The changesets release action commits all working-tree changes into the "Version Packages" PR. The same extended script run once corrects the current live drift.
- **Alternatives:** A separate one-shot script or manual step to correct the drift; a new workflow step to run the sync.
- **Trade-offs:** Reusing the existing command and workflow means extending the script propagates to CI with no workflow change and the patched lockfile is carried into the bot PR by construction. A separate one-shot tool would be redundant given the script's idempotent, outward-only design (its header explicitly intends it to serve both propagation and one-time correction).
- **Traces to:** Requirements 1, 2, 3, 5, 9; Acceptance criteria for bringing the drifted lockfile back into sync, the release-step sync with no manual follow-up, and the lockfile appearing in the "Version Packages" PR.

### Decision: Add the drift check as a step in the existing `changeset` job, inheriting the bot-PR exemption

- **Choice:** Add `- name: Check version sync` / `run: node scripts/check-version-sync.mjs` to the existing `changeset` job in `changeset-gate.yml`.
- **Alternatives:** A new separate job (or new workflow) with its own checkout/setup and its own copy of the `if` condition.
- **Trade-offs:** The existing job already triggers on PRs to `trunk` and carries the proven `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption, so the drift step inherits the exact required exclusion ("runs on PRs to trunk except the bot PR") for free, with no duplicated setup — the same way `validate-changesets` was added. A separate job would duplicate setup and the `if` for no benefit and has no precedent in this repo.
- **Traces to:** Requirement 11; Acceptance criteria for "runs on PRs to trunk and blocks merge" and "bot Version Packages PR not gated."

## Dependencies

No new dependencies of any kind are introduced.

- **Sync extension:** uses only Node built-ins already imported by `sync-version.mjs` (`node:fs`, `node:path`, `node:url`). No network access (Requirement 8).
- **Drift-check script:** uses the same Node built-ins; its tests use `node:test`, `node:assert/strict`, and `node:child_process`, all built-in and already used by existing tests.
- **CI wiring:** reuses the existing `changeset` job's actions (`actions/checkout`, `actions/setup-node`) and `npm ci`/`npm test`; no new GitHub Action.
- **Release path:** reuses the existing `release:version` command and the changesets release action already configured in `release.yml`.

This satisfies Requirement 13 (no new external runtime dependency) by construction.

## Failure Modes and Observability

### Sync (`sync-version.mjs` lockfile patch)

- Pure file I/O; no network, so it cannot fail on registry or cache access (Requirement 8 holds unconditionally).
- It reports via stdout which targets changed (existing behavior, now including `package-lock.json`), or "already in sync" on a no-op.
- Foreseeable failure: the lockfile is missing (`readFileSync` → `ENOENT`) or malformed JSON (`JSON.parse` throws) → the function/script throws and exits non-zero with the error. This is the *defined* contract for both the CLI-against-the-real-repo case and the `syncVersion` function itself (which always requires a lockfile under `repoRoot`): there is no skip-if-absent path. It is intentional and loud — a broken or absent lockfile is a real problem, not something to skip silently.
- Edge: the patch sets an existing `.packages[""].version`. In this `lockfileVersion: 3` repo the root self-entry always exists (it carries `name`/`version`), so this is a set on a present field rather than a creation. (If a future lockfile format removed the root self-entry, this assumption would need revisiting — low likelihood; see Risks.)

### Drift check (`check-version-sync.mjs`)

- Read-only; never writes.
- All-match → exit `0`, empty stderr (mirrors `validate-changesets`).
- Any mismatch → exit `1` with one stderr line per mismatched field, so a simultaneous multi-field divergence (e.g. both lockfile fields, as in the live drift) reports every field, not only the first.
- Foreseeable failure: a missing or malformed file among the three → throws, exits non-zero — surfacing the problem rather than passing falsely.
- **Shared lockfile-shape invariant.** The drift check reads `.packages[""].version`, so it relies on the *same* `lockfileVersion: 3` / `.packages[""]`-present invariant as the sync. A structurally malformed lockfile (parses, but lacks `.packages` or the `""` self-entry) therefore throws (a `TypeError` reading `undefined.version`) and exits non-zero rather than silently skipping or falsely passing — this is intentional for both the sync and the check, so the regression guard cannot be defeated by an unexpected lockfile shape.

### Observability

Failures surface in CI logs via the gate job's stderr and the non-zero exit that fails the step. No additional logging or metrics are warranted for a version-consistency check.

## Risks and Open Questions

- **"Blocks merge" depends on external repo configuration (Requirement 11).** Whether `changeset-gate.yml` is a *required* status check that actually blocks merge is GitHub branch-protection / ruleset configuration, not expressible in-tree. This design adds the drift-check step to a gate that runs on PRs to `trunk` and that is presumably already a required check; making (or keeping) it merge-blocking is a repo-settings dependency the code/plan phase cannot satisfy purely in-repo. Downstream phases should call this out explicitly.
- **"Commits all working-tree changes" is documented action behavior, not asserted by the YAML (Requirement 9).** `release.yml` confirms `version: npm run release:version`; that the changesets release action then commits the resulting `package-lock.json` into the bot PR is documented version-mode behavior of the action, not provable from the YAML alone. Low risk, but worth a verification note in a later phase (inspect a produced bot PR).
- **The structured (not text) patch is load-bearing.** The lockfile has a real dependency (`@changesets/logger`) at `0.1.1` — the same as the stale package version — so a regex/sed replace would corrupt it. The implementation must set the two fields by JSON path. Captured so the plan/code phase does not regress to a text replace.
- **`packages[""]` presence assumption (shared by sync and check).** Both the patch (setting `.packages[""].version`) and the drift check (reading `.packages[""].version`) rely on the root self-entry existing, valid for this `lockfileVersion: 3` repo. Neither path defensively tolerates its absence: an unexpected lockfile shape throws on both paths by design (see Failure Modes). A future change to the lockfile format would require revisiting this assumption — low likelihood, noted for completeness.
- **Open questions:** None blocking. The only implementation-phase detail to settle in code is the exact stderr message wording for the drift check (a quality choice, not a design risk).
