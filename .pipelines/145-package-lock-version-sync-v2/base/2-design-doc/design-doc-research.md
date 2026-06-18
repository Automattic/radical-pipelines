# Design Research: Keep package-lock version in sync with package.json automatically

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### Codebase orientation (analyst's own read)

- **`package.json` `release:version` script** = `changeset version && node scripts/sync-version.mjs`. This is the single composition point. The `test` script = `node --test 'scripts/test/**/*.test.mjs'` (Node built-in test runner; tests glob is `scripts/test/**/*.test.mjs`).
- **Version-bearing locations confirmed:** `package.json` = `0.4.0`, `.claude-plugin/plugin.json` = `0.4.0`, `package-lock.json` top `.version` = `0.1.1`, `.packages[""].version` = `0.1.1`. Matches spec exactly.
- **`scripts/sync-version.mjs`** copies root `package.json.version` into `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` via structured JSON edit (`JSON.stringify(obj, null, 2) + "\n"`), preserving formatting; idempotent; built-ins only; exports `readRootVersion`, `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`; CLI-guarded by `isMainModule()` (realpath compare). The lockfile is deliberately NOT in `TARGET_MANIFESTS` (owner constraint forbids hand/structured edit of the lockfile version fields).
- **`scripts/validate-changesets.mjs`** = the mirror pattern for the new drift guard: built-ins only, no network; pure `validateChangesetFile(...)`-style function + `main()` returning `0|1`; prints `path:line: msg` to stderr, nothing to stdout on the happy path; `export { fn, main }`; `isMainModule()` guard; `if (isMainModule()) process.exit(main())`.
- **Paired test pattern** (`scripts/test/validate-changesets.test.mjs`): `node:test` (`describe`/`test`), `node:assert/strict`, unit tests on the pure function + CLI tests via `spawnSync(process.execPath, [SCRIPT_PATH], { cwd: tmpdir })` asserting `status`, `stderr` regex, empty `stdout`. Fixtures built in `mkdtempSync` temp dirs.
- **CI release path** (`.github/workflows/release.yml`): `changesets/action` with `version: npm run release:version` (comment: "MUST override default to keep sync-version (R3)"). So whatever `release:version` runs reaches CI.
- **Manual escape hatch** (`CONTRIBUTING.md` "## Manual release escape hatch", ~L203-240): step 1 is literally `npm run release:version`. So both the CI path and the manual hatch funnel through the same `release:version` script — meaning a single edit to that script reaches both paths (requirement 3) without per-path duplication.
- **PR gate** (`.github/workflows/changeset-gate.yml`): runs `npm ci`, `npm test`, then `node scripts/validate-changesets.mjs` ("Validate changeset shape"), then `npx changeset status`. The new drift-guard step slots in alongside `validate-changesets`. Job-level `if: github.head_ref != 'changeset-release/trunk'` exempts the bot Version-PR.

### Empirical behavior of `npm install --package-lock-only` (researcher, live /tmp experiments)

Env: node v20.20.1 / npm 10.8.2 (CI is node 22 / npm ~10.9.x — NOT tested; see Risks). `lockfileVersion: 3`.

1. **Rewrites both version fields (req 4):** from the real drift (pkg `0.4.0`, lock both `0.1.1`) → after `npm install --package-lock-only` BOTH top-level `.version` and `.packages[""].version` become `0.4.0`, exit 0.
2. **Idempotent (req 6):** with everything in sync, re-run → "up to date"; `git diff package-lock.json` empty; tree clean.
3. **Sync scope (req 7):** verbatim diff is ONLY the two version fields — `1 file changed, 2 insertions(+), 2 deletions(-)`, 4294→4294 lines, no reorder/add/remove/`resolved`/`integrity`/`lockfileVersion` churn. Confirmed for `0.4.0→0.7.0` too. The minimal diff holds because the dep tree is already consistent; an independently out-of-sync tree would also be rewritten (accepted trade-off per intent.md:17).
4. **node_modules / registry:** `node_modules` is NOT created/read/written. In steady state NO registry access is needed — proven with `--offline` (warm + empty cache) AND `--registry http://127.0.0.1:1` (dead host) + empty cache → SUCCESS, version synced, zero network. The registry/node_modules dependence the intent accepts only materializes when the dep tree itself is out of sync, NOT in the normal version-only sync. Steady-state emits harmless audit/funding stderr noise; the audit is the only steady-state network attempt and is non-fatal (dead-registry run was exit 0).
5. **Ordering:** reads `package.json` at run time (no cached pre-bump value); must run AFTER `changeset version`. A re-run on an in-sync tree is a no-op, so running it after `sync-version.mjs` is also safe.

Flag findings: `--no-audit --no-fund` suppress stderr noise and remove the only steady-state network attempt (deterministically offline-clean), with no change to lockfile output. `--ignore-scripts` is a no-op (no install lifecycle scripts in `package.json`). None of these flags changed the lockfile output in testing.

Sources: live /tmp experiments; `package.json:11-14`; `package-lock.json:1-9`; `release.yml:24,34`; `changeset-gate.yml:25`.

### Version-bearing locations & comparison-set traps (researcher)

- **Comparison set = EXACTLY the 4 spec'd JSON-path locations**, no fifth: `package.json` `.version` (source of truth, :3, `0.4.0`); `.claude-plugin/plugin.json` `.version` (:3, `0.4.0`); `package-lock.json` top-level `.version` (:3, `0.1.1`); `package-lock.json` `.packages[""].version` (:9, `0.1.1`).
- **The guard MUST compare by structured JSON path, NOT text search.** False-fail traps if text-searching for the version: `CHANGELOG.md` `## 0.4.0` (historical heading — accrues past versions, would false-fail after the next release); lockfile dependency versions that coincidentally equal the value (`@changesets/get-version-range-type`/`write` at `0.4.0`; `@changesets/logger` at `0.1.1`; an engines `">= 0.4.0"`; an `ip-address ^10.1.1` substring); test fixtures; and `.claude-plugin/marketplace.json` which has NO version field (name/source/description only). 3+ unrelated strings match in the lockfile alone.
- **Lockfile fields are exhaustive (lockfileVersion 3):** of 330 `.packages` entries, the only one with `.name === "@automattic/radical-pipelines"` is the root `""` key. No `node_modules/@automattic/radical-pipelines` self-entry; no top-level `.dependencies` mirror (dropped in lockfileVersion 3). So "the two lockfile version fields" (top-level `.version` + `.packages[""].version`) is complete — no third field.
- **Importing `TARGET_MANIFESTS` from `sync-version.mjs` is clean:** isolated import → exit 0, zero side-effect output; CLI block gated by `if (isMainModule())` (sync-version.mjs:118), export at :100. `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`. Trade-off: importing couples the guard to the syncer's manifest list (guard checks exactly what the syncer syncs); a local literal keeps the guard independently auditable.

Sources: `package.json:3`; `plugin.json:3`; `marketplace.json:8-14` (no version); `package-lock.json:2-3,8-9` + unrelated `:523,589,594,621,700-701,721-722,762,789-790,3028,3038,3765`; `CHANGELOG.md:3`; test fixtures; `sync-version.mjs:100,109-115,118`; live lock inspection + import test.

## Topics

<!-- One section per design topic worked, each tracing to the spec. -->

### Topic: Where/how to invoke `npm install --package-lock-only` so it runs after the version bump on both release paths

- **Spec link:** Requirements 1, 2, 3; acceptance criteria "Lockfile sync during a release" (CI path + manual escape hatch), "Sync scope in the normal flow".
- **Options:**
  1. **Append to the `release:version` npm script** — `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`. One edit; reached by both CI (`release.yml` `version: npm run release:version`) and the manual hatch (`CONTRIBUTING.md` step 1 `npm run release:version`).
  2. **Add a separate CI step + a separate manual-hatch step.** Two edits, duplicated across paths, easy for the two paths to drift apart over time. Rejected — violates the single-composition-point principle and risks one path being forgotten (the very class of bug this feature fixes).
  3. **Fold the lockfile sync into `sync-version.mjs`** (have the script shell out to `npm install --package-lock-only`). Rejected — `sync-version.mjs` is deliberately dependency-free, network-free, and does structured JSON edits only; shelling out to `npm` would break that contract and blur its single responsibility (the lockfile may NOT be edited via structured JSON, per the owner constraint).
- **Trade-offs:** Option 1 keeps the mechanism in one place both paths already call, matching the existing `changeset version && node sync-version.mjs` composition style. The `&&` chain preserves fail-fast: a non-zero `npm install` aborts `release:version`.
- **Decision:** Option 1. Set `release:version` to `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund`. The lockfile sync runs LAST: after `changeset version` (required — it reads the bumped `package.json`) and after `sync-version.mjs` (req 2; keeps a clean "bump → propagate to manifests → reconcile lockfile" reading order, though the lockfile sync does not depend on `sync-version.mjs`).
- **Rationale:** Both release paths already invoke `npm run release:version`, so appending to that single script satisfies requirement 3 with zero duplication and no chance of one path being forgotten. The mechanism is the owner-mandated `npm install --package-lock-only` (req 1). Empirically it is idempotent (req 6), changes only the two version fields when deps are consistent (req 7), and needs no registry/node_modules in the steady-state case. `--no-audit --no-fund` are a refinement (silence stderr noise + remove the only steady-state network attempt, no lockfile-output change); omitting them still satisfies every requirement.

### Topic: One-time backfill of the existing drift to 0.4.0

- **Spec link:** Requirements 8, 9; acceptance criterion "One-time backfill" (committed lockfile `.version` and `.packages[""].version` both read `0.4.0`).
- **Options:**
  1. **Run `npm install --package-lock-only` once during implementation and commit the resulting lockfile.** `package.json` is already at `0.4.0`, so the same mechanism that topic 1 wires into `release:version` produces the backfill directly. The researcher's experiment 1 already demonstrated this exact transition (lock `0.1.1`→`0.4.0`, both fields, clean 2-line diff).
  2. Hand-edit the two version fields to `0.4.0`. Rejected — explicitly forbidden by req 9 (and req 1).
  3. Run `npm run release:version` to produce the backfill. Rejected — that also runs `changeset version`, which would consume any pending changesets and bump the version beyond `0.4.0`; the backfill must land the lockfile at the *current* released `0.4.0`, not trigger a new release. The backfill needs only the lockfile-sync sub-step, run standalone.
- **Trade-offs:** Option 1 reuses the mandated mechanism verbatim, so the backfill and the ongoing sync are produced identically — no second code path, nothing to maintain. It is a one-time implementation action (run command, commit lockfile), not durable machinery, so it lives in the code plan / changeset, not in any script or workflow.
- **Decision:** Option 1. During implementation, with `package.json` at `0.4.0`, run `npm install --package-lock-only` once and commit the resulting `package-lock.json` (both version fields → `0.4.0`). The diff is expected to be exactly the two version lines (per topic 1 research); any wider diff signals an independently out-of-sync dep tree and should be reviewed before committing.
- **Rationale:** Satisfies req 8 (lockfile at `0.4.0`) and req 9 (produced via the command, not hand-edit) using the exact mechanism wired in topic 1, with empirical proof it yields the correct 2-field result. No durable artifact is needed — the backfill is a once-only correction; future drift is prevented by the `release:version` wiring (topic 1) and caught by the drift guard (next topic).

### Topic: Drift-guard script + PR-gate step (design)

- **Spec link:** Requirements 10, 11; acceptance criteria "Drift guard on the pull-request gate" (all 4 cases).

**Sub-decision A — comparison strategy: structured JSON path, not text search.**
- **Decision:** Read each of the 4 version-bearing values by its exact JSON path and compare the parsed string values: `package.json` `.version`, `.claude-plugin/plugin.json` `.version`, `package-lock.json` `.version`, `package-lock.json` `.packages[""].version`.
- **Rationale:** The research found 3+ unrelated `0.4.0`/`0.1.1` matches in the lockfile alone, plus the `CHANGELOG.md ## <version>` heading (a historical accrual that would false-fail after the next release) and `.claude-plugin/marketplace.json` (no version field). A grep/text approach would produce false fails. Structured path lookup is exact and matches existing project style (`sync-version.mjs` and `validate-changesets.mjs` both parse JSON, never grep). All four are JSON, so `JSON.parse` + path access suffices — no YAML, no regex over content.

**Sub-decision B — manifest list: local literal in the guard, not imported `TARGET_MANIFESTS`.**
- **Options:** (1) import `TARGET_MANIFESTS` from `sync-version.mjs`; (2) a local literal/constant listing all 4 locations in the guard.
- **Decision:** Local literal (option 2). The guard owns its own complete list of the four (file, JSON-path) locations.
- **Rationale:** Import is clean (research confirmed zero import side effects), but it would couple only HALF the guard's check set to the syncer — the guard must also check the two lockfile fields, which `sync-version.mjs` deliberately never touches and never lists. Sharing the plugin.json entry but hardcoding the lockfile entries makes the comparison set split across two files and asymmetric. A single local literal keeps the guard's full set visible and independently auditable in one place — appropriate for a check whose entire job is to be the cross-file source of truth on agreement. (Coupling risk if a future secondary manifest is added to the syncer but not the guard is real but small; flagged in Open Questions.)

**Sub-decision C — script interface (mirror `validate-changesets.mjs`).**
- New file `scripts/check-version-sync.mjs` (name parallels `validate-changesets.mjs`; final name is the implementer's, but the design assumes this).
- Built-in Node modules only (`node:fs`, `node:path`, `node:url`); no external deps, no network. Mirrors the `validate-changesets.mjs` shape:
  - A pure, testable function — e.g. `checkVersionSync({ repoRoot }) → Err[]` (empty when all four agree) — that reads the four locations relative to `repoRoot`, compares, and returns structured errors. Pure-function-takes-`repoRoot` mirrors `syncVersion({ repoRoot })`, enabling temp-dir fixture tests.
  - A `main()` that runs the pure function against the CWD, prints one `file (json-path): msg` line per error to **stderr**, writes nothing to **stdout** on success, returns `0` (all agree) or `1` (drift).
  - `export { checkVersionSync, main }`.
  - `isMainModule()` realpath guard; `if (isMainModule()) process.exit(main())`.

**Sub-decision D — error / message format (req 11).**
- **Decision:** On drift, report the source-of-truth version (`package.json` `.version`) and, for each of the other three locations that disagrees, a line naming the offending file (plus lockfile JSON-path, to disambiguate the two lockfile fields) and its conflicting value. Example shape:
  - `package.json: 0.4.0 (source of truth)`
  - `package-lock.json (.version): 0.1.1 — does not match package.json`
  - `package-lock.json (.packages[""].version): 0.1.1 — does not match package.json`
- Names the offending file(s) and shows the conflicting version(s) (req 11). Baseline is `package.json` (the documented source of truth), so the hand-edited-`package.json` case (AC: `package.json` disagrees) surfaces as the other three all disagreeing with it — still a fail showing all conflicting values.
- **Rationale:** Mirrors `validate-changesets.mjs`'s `path:line: msg`-to-stderr convention (no line number is meaningful here, so `file (json-path): value` replaces it). Actionable: a maintainer sees exactly which file(s) and which values conflict.

**Sub-decision E — gate-step placement in `changeset-gate.yml`.**
- **Decision:** Add a step `node scripts/check-version-sync.mjs` to the `changeset` job in `.github/workflows/changeset-gate.yml`, adjacent to the existing "Validate changeset shape" step (`node scripts/validate-changesets.mjs`), after `npm ci`/`npm test`. It inherits the job-level `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption automatically.
- **Rationale:** Same job as the other repo-consistency checks; no new workflow, no new triggers, no extra permissions (`contents: read` suffices). The script is dependency-free so it runs with just the checked-out repo. The bot Version-PR exemption is desirable: that PR is produced by the now-fixed `release:version`, so it is in sync by construction and need not be re-gated.

**Sub-decision F — paired test (mirror `validate-changesets.test.mjs`).**
- New file `scripts/test/check-version-sync.test.mjs`. Unit tests on the pure function over `mkdtempSync` fixtures (write the four files at chosen versions; assert errors / no errors), plus CLI tests via `spawnSync(process.execPath, [SCRIPT_PATH], { cwd: dir })` asserting `status` (0/1), `stderr` regex (names offending file + value), empty `stdout` on success. Cover the four acceptance-criteria cases: all-agree → pass; lockfile fields disagree → fail naming the lockfile field(s) + values; `plugin.json` disagrees → fail naming `plugin.json` + values; `package.json` hand-edited → fail (inconsistency caught), with conflicting values. Picked up automatically by the `node --test 'scripts/test/**/*.test.mjs'` glob.

### Topic: Components (new, modified, untouched-but-relevant)

- **Spec link:** Cross-cuts all requirements — the component inventory the implementer works from.
- **Modified — `package.json` (`release:version` script):** append `&& npm install --package-lock-only --no-audit --no-fund` (topic 1). The only edit needed to make every release path sync the lockfile.
- **Modified — `package-lock.json` (committed):** one-time backfill of the two version fields to `0.4.0`, produced by running the command (topic 2). Data, not logic.
- **New — `scripts/check-version-sync.mjs`:** the drift guard (topic 3). Dependency-free Node script; pure function + `main()` + CLI guard.
- **New — `scripts/test/check-version-sync.test.mjs`:** the guard's paired test (topic 3 sub-decision F).
- **Modified — `.github/workflows/changeset-gate.yml`:** add the drift-guard step to the `changeset` job (topic 3 sub-decision E).
- **Untouched but relevant — `scripts/sync-version.mjs`:** unchanged. It still syncs `plugin.json` via structured edit; it deliberately does NOT and must NOT gain the lockfile (owner constraint: the lockfile version is synced only by `npm install --package-lock-only`). The lockfile sync is intentionally a sibling step in `release:version`, not a new `TARGET_MANIFESTS` entry.
- **Untouched but relevant — `.github/workflows/release.yml`:** unchanged. It already calls `version: npm run release:version`, so it inherits the new lockfile-sync step for free (topic 1). No workflow edit needed for the CI path.
- **Untouched but relevant — `CONTRIBUTING.md` (manual escape hatch):** the procedure's step 1 already runs `npm run release:version`, so it inherits the sync. The docs phase may add a sentence noting the lockfile is now synced too, but no procedural change is required (the spec does not mandate a docs change; flagged in Open Questions).

### Topic: Interfaces and data flow

- **Spec link:** Requirements 2-7 (release-time data flow), 10-11 (gate-time data flow).
- **Release-time data flow (one direction, outward from `package.json`):**
  1. `changeset version` consumes `.changeset/*.md`, writes `CHANGELOG.md`, bumps `package.json` `.version` (the source of truth).
  2. `node scripts/sync-version.mjs` copies `package.json` `.version` → `.claude-plugin/plugin.json` `.version` (structured edit).
  3. `npm install --package-lock-only --no-audit --no-fund` reads `package.json` `.version` and reconciles the lockfile so top-level `.version` and `.packages[""].version` match (req 4); in the normal flow this is the only change (req 7). Fail-fast `&&` chain; idempotent (req 6).
- **Gate-time data flow (read-only):** `node scripts/check-version-sync.mjs` reads the four version-bearing values by JSON path, compares them to `package.json`'s, exits 0 if all agree (req 10 pass) or 1 with an actionable stderr report (req 10 fail, req 11).
- **Public interfaces introduced:**
  - CLI: `node scripts/check-version-sync.mjs` → exit `0|1`, errors on stderr, nothing on stdout when passing.
  - Module exports: `checkVersionSync({ repoRoot }) → Err[]` and `main()` (for the paired test), mirroring `sync-version.mjs` / `validate-changesets.mjs`.
  - `release:version` script string changes (a contract the CI action and the manual hatch both depend on remaining named `release:version`).
- No network/HTTP interfaces, no new file formats; all four touched files stay JSON with their existing 2-space-indent + trailing-newline formatting.

### Topic: Dependencies

- **Spec link:** Out-of-scope guardrails (no new tooling) + req 1 (mandated mechanism).
- **No new package dependencies.** The drift guard and its test use Node built-ins only (`node:fs`, `node:path`, `node:url`, `node:test`, `node:assert`, `node:child_process`), matching `sync-version.mjs` / `validate-changesets.mjs`.
- **Existing dependency leveraged:** `npm` itself (already required by `npm ci`, `changeset version`) provides `--package-lock-only`. No new CLI tool.
- **Runtime dependency (accepted trade-off, intent.md:17):** `npm install --package-lock-only` may need registry/`node_modules` access only when the dep tree is independently out of sync; in the normal version-only sync it needs neither (research-proven). Out of scope: offline/no-registry operation.

### Topic: Failure modes and observability

- **Spec link:** Requirements 3, 7, 10, 11; the CI paths.
- **Release-step failure (`npm install --package-lock-only` non-zero):** the `&&` chain aborts `release:version` fail-fast. On the CI path this fails the changesets action (no broken Version Packages PR is produced); on the manual hatch the maintainer sees the failure before committing. Observable via the step's exit code + npm stderr.
- **Lockfile diff wider than the two version fields:** signals an independently out-of-sync dep tree (accepted trade-off, req 7). Detected by review of the Version Packages PR diff (CI) or the local diff (manual hatch). Not an error; flagged as a Risk.
- **Drift guard on the gate:** the primary detection mechanism for drift introduced OUTSIDE the release flow (e.g. a hand-edit). Fails the PR check with an actionable stderr message naming the file(s) + conflicting values (req 11). Passes silently (empty stdout) when all four agree.
- **Drift-guard false pass risk:** mitigated by structured-JSON-path comparison (sub-decision A) — the text-search traps the researcher found cannot produce a false pass or fail.
- **Observability summary:** all signals are CI step exit codes + stderr (the project's existing convention); no new logging/telemetry infrastructure. The guard writes nothing to stdout on success, matching `validate-changesets.mjs`.

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- **Guard/syncer manifest-list divergence (low priority).** The drift guard keeps its own local list of the four version-bearing locations (topic 3 sub-decision B); `sync-version.mjs` keeps `TARGET_MANIFESTS` separately. If a future secondary manifest is added to the syncer, the guard must be updated too. Acceptable today (only one secondary manifest, `plugin.json`); the implementer may add a test or comment cross-referencing the two lists. Not blocking.
- **Final script/test file names.** The design assumes `scripts/check-version-sync.mjs` + `scripts/test/check-version-sync.test.mjs`; the implementer may choose a different name as long as it parallels the existing `validate-changesets.mjs` convention and the test lives under `scripts/test/**/*.test.mjs`.
- **CONTRIBUTING.md / README wording.** The spec mandates no docs change. The manual-hatch procedure already inherits the lockfile sync (no procedural change), but a one-line note that `release:version` now also syncs the lockfile may help maintainers. Deferred to the docs phase; not required for correctness.
- **Changeset for this feature.** This change is release-relevant, so the PR will itself need a `.changeset/*.md` to pass the existing gate. A bump type (likely `patch` — a build/release-tooling fix) should be chosen in the code/plan phase. Not a design decision, but flagged so it is not forgotten.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **npm/node version not verified on CI's runtime.** All `--package-lock-only` experiments ran on node 20.20.1 / npm 10.8.2; CI uses node 22 / npm ~10.9.x. No evidence of a behavior difference across adjacent npm 10.x, but not directly verified on node 22. Low risk (same npm major; `lockfileVersion: 3` stable). Mitigation: the drift guard on the PR gate would catch any residual drift, and CI runs the real `release:version` so a regression surfaces in the Version Packages PR diff.
- **Out-of-sync dep tree widens the lockfile diff.** If the dependency tree is independently out of sync when `release:version` runs, `npm install --package-lock-only` will also rewrite the affected dependency entries — an accepted trade-off (req 7, intent.md:17), not a guaranteed-invariant violation. The guaranteed invariant is only that the version fields match (req 4).
