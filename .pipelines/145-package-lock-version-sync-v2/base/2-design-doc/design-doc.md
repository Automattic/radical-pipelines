# Design Doc: Keep package-lock version in sync with package.json automatically

## Overview

The project records its version in three files but four locations: `package.json` `.version` (the source of truth), `.claude-plugin/plugin.json` `.version`, and `package-lock.json` in two fields — the top-level `.version` and the root-package `.packages[""].version`. The release version step propagates the bumped version to `plugin.json` (via `scripts/sync-version.mjs`) but never to the lockfile, so the two lockfile version fields have drifted: `package.json` is at `0.4.0` while both lockfile fields remain frozen at `0.1.1`, where they sat unchanged across the `0.2.0`, `0.3.0`, and `0.4.0` releases. Nothing catches this today, because `npm ci` validates the dependency tree but is blind to the recorded `version` fields.

This design makes the release process keep the lockfile's recorded version consistent with `package.json` automatically, corrects the existing drift now as a one-time backfill, and adds a version-drift check to the pull-request gate so inconsistency introduced outside the release flow is caught rather than going unnoticed. The lockfile version is synced exclusively by running `npm install --package-lock-only` — a binding owner constraint, not a free implementation choice; the lockfile version fields are never updated by a hand-written or structured JSON edit.

## Approach

The mental model is a single one-directional propagation, outward from `package.json`, plus a read-only gate check that asserts the propagation held.

The release version step is the single composition point both release paths already funnel through. Today `package.json`'s `release:version` script is `changeset version && node scripts/sync-version.mjs`. The CI release path (`.github/workflows/release.yml`) invokes `version: npm run release:version`, and the documented manual escape hatch (`CONTRIBUTING.md`) runs `npm run release:version` as its first step. Appending the lockfile-sync command to this one script therefore reaches both paths with zero duplication:

```
release:version = changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund
```

The `&&` chain runs the steps in order and is fail-fast: a non-zero step aborts the release. The order is "bump → propagate to manifests → reconcile lockfile". `npm install --package-lock-only` reads `package.json` at run time, so it must run after `changeset version` bumps it; running it last (also after `sync-version.mjs`) keeps a clean reading order, though it does not depend on `sync-version.mjs`.

The existing drift is corrected as a one-time backfill: `package.json` is already at `0.4.0`, so running `npm install --package-lock-only` once during implementation produces a lockfile whose two version fields read `0.4.0`, which is committed. This is the same mechanism the release step now wires in, so the backfill and the ongoing sync are produced identically — no second code path.

Drift introduced outside the release flow (for example a hand-edit) is caught by a new dependency-free Node script, `scripts/check-version-sync.mjs`, wired as a step in the existing pull-request gate (`.github/workflows/changeset-gate.yml`). It reads the four version-bearing values by structured JSON path, compares them, and exits non-zero with an actionable message when they disagree. It mirrors the shape of the existing `scripts/validate-changesets.mjs` and has a paired test mirroring `scripts/test/validate-changesets.test.mjs`.

### How each acceptance criterion is met

- **Both lockfile fields equal `package.json` after the release step** — `npm install --package-lock-only` rewrites both the top-level `.version` and `.packages[""].version` to the value in `package.json` (research experiment 1: `0.1.1` → `0.4.0`, exit 0).
- **All four locations agree after the release step** — `sync-version.mjs` already syncs `plugin.json`; the appended command syncs the two lockfile fields; `package.json` is the source. All four then carry the same value.
- **Idempotent re-run produces an empty diff** — `npm install --package-lock-only` on an in-sync tree reports "up to date" and leaves the lockfile byte-identical (research experiment 2).
- **CI path** — `release.yml` calls `npm run release:version`, inheriting the new step with no workflow edit.
- **Manual escape hatch with no manual lockfile edit** — `CONTRIBUTING.md` step 1 calls `npm run release:version`, inheriting the new step; the maintainer edits nothing by hand.
- **Sync scope: only the two version fields in the normal flow** — when the dependency tree is already consistent, the diff is exactly the two version lines (research experiment 3: `1 file changed, 2 insertions(+), 2 deletions(-)`, no reorder/add/remove of dependency entries).
- **One-time backfill to `0.4.0`** — run the command once at the current `package.json` version and commit (see Components).
- **Gate passes when all four agree / fails naming offending file(s) and values** — `check-version-sync.mjs` returns exit 0 when the four match, exit 1 with a per-location stderr report otherwise (see Interfaces and Data Flow).
- **Gate catches a hand-edited `package.json`** — the guard uses `package.json` as the baseline, so a hand-edited `package.json` that disagrees with the other three surfaces as all three disagreeing with it; the inconsistency fails the gate rather than slipping through dependency-tree-only validation.

## Components

### Modified — `package.json` (`release:version` script)

Append `&& npm install --package-lock-only --no-audit --no-fund` to the `release:version` script. This is the only edit needed to make every release path sync the lockfile. The `--no-audit --no-fund` flags silence harmless stderr noise and remove the only steady-state network attempt (the audit), with no change to the lockfile output; omitting them would still satisfy every requirement. (Serves requirements 1, 2, 3.)

### Modified — `package-lock.json` (committed)

A one-time backfill of the two version fields to `0.4.0`, produced by running `npm install --package-lock-only` during implementation (with `package.json` already at `0.4.0`) and committing the result. This is data, not logic — a once-only correction that lives in the implementation action and the PR, not in any script or workflow. The expected diff is exactly the two version lines; any wider diff signals an independently out-of-sync dependency tree and should be reviewed before committing. (Serves requirements 8, 9.)

### New — `scripts/check-version-sync.mjs`

The drift guard. A dependency-free Node script (built-in modules only) with a pure, testable function plus a `main()` and a CLI guard, mirroring `scripts/validate-changesets.mjs`. It reads the four version-bearing values by JSON path, compares them, and reports drift. (Serves requirements 10, 11.)

### New — `scripts/test/check-version-sync.test.mjs`

The guard's paired test, mirroring `scripts/test/validate-changesets.test.mjs`: unit tests on the pure function over temp-dir fixtures, plus CLI tests via `spawnSync`. Picked up automatically by the existing `node --test 'scripts/test/**/*.test.mjs'` glob. (Serves requirements 10, 11.)

### Modified — `.github/workflows/changeset-gate.yml`

Add a step running `node scripts/check-version-sync.mjs` to the `changeset` job, adjacent to the existing "Validate changeset shape" step (`node scripts/validate-changesets.mjs`), after `npm ci` and `npm test`. It inherits the job-level `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption automatically. (Serves requirement 10.)

### Untouched but relevant — `scripts/sync-version.mjs`

Unchanged. It still syncs `plugin.json` via a structured JSON edit and deliberately does NOT and must NOT gain the lockfile: the owner constraint forbids editing the lockfile version via structured JSON. The lockfile sync is intentionally a sibling step in `release:version`, not a new `TARGET_MANIFESTS` entry.

### Untouched but relevant — `.github/workflows/release.yml`

Unchanged. It already calls `version: npm run release:version`, so it inherits the new lockfile-sync step for free. No workflow edit is needed for the CI path.

### Untouched but relevant — `CONTRIBUTING.md` (manual escape hatch)

Unchanged procedurally. Its step 1 already runs `npm run release:version`, so it inherits the sync. No procedural change is required; the spec mandates no docs change (a one-line note is deferred to the docs phase as an open question).

## Interfaces and Data Flow

### Release-time data flow (one direction, outward from `package.json`)

1. `changeset version` consumes `.changeset/*.md`, writes `CHANGELOG.md`, and bumps `package.json` `.version` (the source of truth).
2. `node scripts/sync-version.mjs` copies `package.json` `.version` → `.claude-plugin/plugin.json` `.version` via a structured JSON edit, preserving 2-space indent + trailing newline.
3. `npm install --package-lock-only --no-audit --no-fund` reads `package.json` `.version` and reconciles the lockfile so its top-level `.version` and `.packages[""].version` both match (requirement 4). In the normal flow this is the only change (requirement 7); the command is idempotent (requirement 6). The `&&` chain is fail-fast.

### Gate-time data flow (read-only)

`node scripts/check-version-sync.mjs` reads the four version-bearing values by JSON path, compares the other three against `package.json`'s value, and exits 0 if all agree (requirement 10 pass) or 1 with an actionable stderr report (requirement 10 fail, requirement 11). It writes nothing to stdout on success.

### The comparison set — exactly four (file, JSON-path) locations

| File | JSON path | Current value |
| --- | --- | --- |
| `package.json` | `.version` | `0.4.0` (source of truth) |
| `.claude-plugin/plugin.json` | `.version` | `0.4.0` |
| `package-lock.json` | `.version` | `0.1.1` |
| `package-lock.json` | `.packages[""].version` | `0.1.1` |

The guard compares by structured JSON path — `JSON.parse` then path access — never by text/grep search. This is load-bearing: the research found 3+ unrelated `0.4.0`/`0.1.1` strings in the lockfile alone (dependency versions, an `engines` range, a substring match), plus a `CHANGELOG.md` `## <version>` heading that accrues historical versions and would false-fail after the next release, plus `.claude-plugin/marketplace.json` which has no version field at all. A text approach would produce false fails; structured path lookup is exact and matches existing project style (`sync-version.mjs` and `validate-changesets.mjs` both parse JSON, never grep). All four locations are JSON, so no YAML or regex over content is involved.

The two lockfile fields are complete (lockfileVersion 3): the only `.packages` entry whose `.name` is `@automattic/radical-pipelines` is the root `""` key; there is no self-entry under `node_modules/` and no top-level `.dependencies` mirror (dropped in lockfileVersion 3). So "the two lockfile version fields" is the full lockfile comparison set — no third field.

### Public interfaces introduced

- **CLI:** `node scripts/check-version-sync.mjs` → exit `0|1`, errors on stderr, nothing on stdout when passing.
- **Module exports:** a pure function `checkVersionSync({ repoRoot }) → Err[]` (empty array when all four agree) and `main()`, mirroring `syncVersion({ repoRoot })` in `sync-version.mjs` and the function + `main()` shape in `validate-changesets.mjs`. `repoRoot` parameterization enables temp-dir fixture tests. CLI-guarded by an `isMainModule()` realpath compare; `if (isMainModule()) process.exit(main())`.
- **`release:version` script string:** changes to include the lockfile sync. The script name remaining `release:version` is a contract both the CI action (`release.yml`) and the manual hatch (`CONTRIBUTING.md`) depend on; the name does not change, only its command body.

### Error / message format (requirement 11)

`main()` prints one line per disagreeing location to stderr, naming the file (plus lockfile JSON-path, to disambiguate the two lockfile fields) and its conflicting value, with `package.json` as the named baseline. Example shape:

```
package.json: 0.4.0 (source of truth)
package-lock.json (.version): 0.1.1 — does not match package.json
package-lock.json (.packages[""].version): 0.1.1 — does not match package.json
```

This mirrors `validate-changesets.mjs`'s `path:line: msg`-to-stderr convention (no line number is meaningful here, so `file (json-path): value` replaces it). Because the baseline is `package.json` (the documented source of truth), the hand-edited-`package.json` case surfaces as the other three all disagreeing with it — still a failure showing all conflicting values.

No network/HTTP interfaces and no new file formats are introduced; all four touched files stay JSON with their existing 2-space-indent + trailing-newline formatting.

## Key Decisions

### Decision: Append the lockfile sync to the `release:version` npm script

- **Choice:** Set `release:version` to `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`. The lockfile sync runs last.
- **Alternatives:** (a) Add a separate CI step plus a separate manual-hatch step — rejected: two edits duplicated across paths, easy for the two paths to drift apart, and risks one path being forgotten — the very class of bug this feature fixes. (b) Fold the lockfile sync into `sync-version.mjs` by shelling out to `npm` — rejected: `sync-version.mjs` is deliberately dependency-free, network-free, and does structured JSON edits only; shelling out would break that contract and the owner constraint forbids editing the lockfile version via structured JSON anyway.
- **Trade-offs:** Both release paths already invoke `npm run release:version`, so one edit reaches both with no duplication and no chance of a forgotten path. The `&&` chain preserves fail-fast. The `--no-audit --no-fund` flags are a refinement (silence stderr, remove the only steady-state network attempt) with no lockfile-output change; they are not strictly required.
- **Traces to:** Requirements 1, 2, 3; acceptance criteria "Lockfile sync during a release" (CI path and manual escape hatch) and "Sync scope in the normal flow".

### Decision: Backfill the existing drift by running the command once and committing the lockfile

- **Choice:** During implementation, with `package.json` at `0.4.0`, run `npm install --package-lock-only` once and commit the resulting `package-lock.json` (both version fields → `0.4.0`).
- **Alternatives:** (a) Hand-edit the two version fields — rejected: explicitly forbidden by requirements 1 and 9. (b) Run `npm run release:version` to produce the backfill — rejected: that also runs `changeset version`, which would consume pending changesets and bump beyond `0.4.0`; the backfill must land the lockfile at the *current* released `0.4.0`, not trigger a new release.
- **Trade-offs:** Reuses the mandated mechanism verbatim, so the backfill and the ongoing sync are produced identically — no second code path. It is a one-time implementation action, not durable machinery, so it lives in the PR/changeset, not in any script or workflow. Expected diff is the two version lines; a wider diff signals an out-of-sync dependency tree and warrants review before committing.
- **Traces to:** Requirements 8, 9; acceptance criterion "One-time backfill".

### Decision: Drift guard compares by structured JSON path, not text search

- **Choice:** Read each of the four version-bearing values by its exact JSON path and compare the parsed string values.
- **Alternatives:** Grep/text-search the repo for the version string — rejected: the research found 3+ unrelated `0.4.0`/`0.1.1` matches in the lockfile, a `CHANGELOG.md` heading that accrues historical versions (false-fail after the next release), and `marketplace.json` (no version field). A text approach produces false fails.
- **Trade-offs:** Structured lookup is exact and matches existing project style; it requires knowing each location's path up front, which is acceptable because the comparison set is a fixed, fully enumerated four.
- **Traces to:** Requirements 10, 11; acceptance criteria "Drift guard on the pull-request gate" (all four cases). Mitigates the false-pass/false-fail risk.

### Decision: Guard keeps a local literal of the four locations, not an imported `TARGET_MANIFESTS`

- **Choice:** The guard owns its own complete local list of the four (file, JSON-path) locations.
- **Alternatives:** Import `TARGET_MANIFESTS` from `sync-version.mjs` — rejected: although the import is clean (research confirmed zero import side effects), `TARGET_MANIFESTS` lists only `plugin.json`; it deliberately omits the two lockfile fields the syncer never touches. Importing would couple only half the guard's check set to the syncer and split the comparison set asymmetrically across two files.
- **Trade-offs:** A single local literal keeps the guard's full set visible and independently auditable in one place — appropriate for a check whose whole job is to be the cross-file source of truth on agreement. The cost is a small coupling risk: if a future secondary manifest is added to the syncer but not the guard, the guard would miss it (flagged in Open Questions; the implementer may add a cross-referencing test or comment).
- **Traces to:** Requirements 10, 11.

### Decision: Wire the guard as a step in the existing `changeset-gate.yml` `changeset` job

- **Choice:** Add a `node scripts/check-version-sync.mjs` step to the `changeset` job, adjacent to the existing "Validate changeset shape" step.
- **Alternatives:** A new dedicated workflow — rejected: unnecessary; it would add new triggers and duplicate setup. The drift check is a repo-consistency check like the existing changeset validation and belongs in the same job.
- **Trade-offs:** No new workflow, no new triggers, no extra permissions (`contents: read` suffices); the dependency-free script runs against just the checked-out repo. It inherits the job-level bot-PR exemption (`if: github.head_ref != 'changeset-release/trunk'`), which is desirable: the bot Version-PR is produced by the now-fixed `release:version`, so it is in sync by construction and need not be re-gated.
- **Traces to:** Requirement 10.

### Decision: Mirror `validate-changesets.mjs` for the script shape and its paired test

- **Choice:** A pure function + `main()` returning `0|1` + an `isMainModule()` CLI guard, built-in Node modules only; the paired test under `scripts/test/` uses `node:test`, `node:assert/strict`, temp-dir fixtures, and `spawnSync` CLI assertions.
- **Alternatives:** A bespoke structure — rejected: an existing, tested convention (`validate-changesets.mjs` / its test) already fits and keeps the codebase consistent.
- **Trade-offs:** Consistency and testability at no real cost. The pure function takes `repoRoot` so fixtures can be built in `mkdtempSync` temp dirs; CLI tests assert `status`, a `stderr` regex (names offending file + value), and empty `stdout` on success.
- **Traces to:** Requirements 10, 11; acceptance criteria "Drift guard on the pull-request gate".

## Dependencies

- **No new package dependencies.** The drift guard and its test use Node built-ins only (`node:fs`, `node:path`, `node:url`, `node:test`, `node:assert`, `node:child_process`), matching `sync-version.mjs` and `validate-changesets.mjs`.
- **Existing tooling leveraged:** `npm` itself (already required by `npm ci` and `changeset version`) provides `--package-lock-only`. No new CLI tool is introduced.
- **Runtime dependency (accepted trade-off, intent.md:17):** `npm install --package-lock-only` may need registry / `node_modules` access *only* when the dependency tree is independently out of sync. In the normal version-only sync it needs neither — research-proven: `node_modules` is never created or read; the sync succeeded with `--offline` (warm and empty cache) and against a dead registry (`--registry http://127.0.0.1:1`, empty cache) with zero network. Offline / no-registry operation is explicitly out of scope.

## Failure Modes and Observability

- **Release-step failure (`npm install --package-lock-only` exits non-zero):** the `&&` chain aborts `release:version` fail-fast. On the CI path this fails the changesets action so no broken Version Packages PR is produced; on the manual hatch the maintainer sees the failure before committing. Observable via the step's exit code and npm stderr.
- **Lockfile diff wider than the two version fields:** signals an independently out-of-sync dependency tree (accepted trade-off, requirement 7). Detected by reviewing the Version Packages PR diff (CI) or the local diff (manual hatch). Not an error; flagged as a Risk. The guaranteed invariant is only that the version fields match (requirement 4), not that only the version fields ever change.
- **Drift guard on the gate:** the primary detection mechanism for drift introduced outside the release flow (e.g. a hand-edit). It fails the PR check with an actionable stderr message naming the file(s) and conflicting value(s) (requirement 11) and passes silently (empty stdout) when all four agree.
- **Drift-guard false pass/fail risk:** mitigated by structured-JSON-path comparison — the text-search traps the research found cannot produce a false pass or fail.
- **Observability summary:** all signals are CI step exit codes plus stderr, the project's existing convention. No new logging or telemetry infrastructure is introduced; the guard writes nothing to stdout on success, matching `validate-changesets.mjs`.

## Risks and Open Questions

### Risks

- **npm/node behavior not verified on CI's runtime.** All `--package-lock-only` experiments ran on node 20.20.1 / npm 10.8.2; CI uses node 22 / npm ~10.9.x. No evidence of a behavior difference across adjacent npm 10.x, and `lockfileVersion: 3` is stable, but this was not directly verified on node 22. Low risk. Mitigation: the drift guard on the PR gate catches any residual drift, and CI runs the real `release:version`, so a regression would surface in the Version Packages PR diff. The implementation phase could validate on node 22 to close this fully.
- **Out-of-sync dependency tree widens the lockfile diff.** If the dependency tree is independently out of sync when `release:version` runs, `npm install --package-lock-only` will also rewrite the affected dependency entries — an accepted trade-off (requirement 7, intent.md:17), not a guaranteed-invariant violation. The same caveat applies to the one-time backfill diff (review before committing).

### Open Questions

- **Guard/syncer manifest-list divergence (low priority).** The guard keeps its own local list of the four locations; `sync-version.mjs` keeps `TARGET_MANIFESTS` separately. If a future secondary manifest is added to the syncer, the guard must be updated too. Acceptable today (only one secondary manifest, `plugin.json`); the implementer may add a test or comment cross-referencing the two lists. Not blocking.
- **Final script/test file names.** This design assumes `scripts/check-version-sync.mjs` and `scripts/test/check-version-sync.test.mjs`; the implementer may choose a different name as long as it parallels the `validate-changesets.mjs` convention and the test lives under `scripts/test/**/*.test.mjs`.
- **CONTRIBUTING.md / README wording.** The spec mandates no docs change, and the manual-hatch procedure already inherits the lockfile sync (no procedural change). A one-line note that `release:version` now also syncs the lockfile may help maintainers; deferred to the docs phase, not required for correctness.
- **Changeset for this feature.** This change is release-relevant, so the PR will itself need a `.changeset/*.md` to pass the existing gate. A bump type (likely `patch` — a build/release-tooling fix) should be chosen in the code/plan phase. Not a design decision, but flagged so it is not forgotten.
