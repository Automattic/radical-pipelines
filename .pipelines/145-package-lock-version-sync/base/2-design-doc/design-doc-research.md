# Design Research: Keep package-lock version in sync with package.json automatically

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### Lockfile structure, reserialize fidelity, and patch precision (Research Request 1)

All findings empirical this session; worktree restored clean afterward.

- **Lockfile shape.** `package-lock.json` is `lockfileVersion: 3`. The package's own version lives in EXACTLY two spots: top-level `.version` (line 3) and `.packages[""].version` (line 9, where `.packages[""].name == "@automattic/radical-pipelines"`). No `workspaces`; lockfileVersion 3 omits top-level `.dependencies`, so every other `.packages` key is a `node_modules/...` dependency whose `version` must NOT change. Both spots currently read `0.1.1` (stale vs. `package.json` 0.4.0). Formatting: 2-space indent, single trailing newline, LF; ~4294 lines / 154336 bytes; 331 total `"version":` lines (329 are deps).
- **Reserialize is byte-identical (R7 met by the existing write path).** `JSON.parse(raw)` → `JSON.stringify(obj, null, 2) + "\n"` reproduces the current lockfile byte-for-byte (154336 == 154336). Setting only the two version fields and reserializing changes EXACTLY lines 3 and 9, nothing else. This is the same write path `sync-version.mjs` already uses (`JSON.stringify(obj, null, 2) + "\n"`, `scripts/sync-version.mjs:66`) — the lockfile is already in canonical shape, so the existing write path extends to it cleanly.
- **`npm install --package-lock-only --offline` meets R7 and R8 today, but conditionally.** Exits 0 even with an empty temp cache (zero registry AND zero cache access); diff is exactly lines 3,9; `lockfileVersion`, sort order, resolved/integrity all unchanged; byte length identical. CAVEAT: this minimality and offline-safety hold ONLY because the dep tree already matches the lock. If a range were unresolved it would try to re-resolve (network) or fail under `--offline`. It also revalidates the dependency tree — explicitly out of scope per spec.
- **A naive text/sed replace is UNSAFE; a structured patch is required.** `"version": "0.1.1"` appears THREE times as a value: lines 3, 9, AND line 721 — dependency `node_modules/@changesets/logger`, genuinely at 0.1.1, which must stay. A global string replace would corrupt that dep. A structured patch (parse, set `obj.version` and `obj.packages[""].version` by path, reserialize) touches only lines 3 and 9, leaving 721 intact (confirmed by simulation).

Sources: `package-lock.json` lines 3, 9, 721, `lockfileVersion: 3`; reserialize byte-identical (154336); `npm install --package-lock-only --offline [--cache empty]` exit 0, diff lines 3,9; structured-patch simulation (lines 3,9 only); `scripts/sync-version.mjs:62-72`, `:37`.

### Existing script + test conventions (read directly from the worktree)

- **`scripts/sync-version.mjs` shape (the file to extend).** Reads root `package.json` `version` (`readRootVersion`), then for each entry in `TARGET_MANIFESTS` (currently `[".claude-plugin/plugin.json"]`) calls `syncManifestVersion(path, version)`, which parses, sets `manifest.version`, reserializes via `JSON.stringify(obj, null, 2) + "\n"`, and writes only if changed (returns a `changed` boolean). `syncVersion(options)` returns `{ version, changed: string[] }`. Exports `readRootVersion, syncManifestVersion, syncVersion, TARGET_MANIFESTS`. CLI guarded by `isMainModule()`. Uses only Node built-ins; no network (`scripts/sync-version.mjs:45-127`). Current model assumes a single `.version` field per target — the lockfile needs two paths, so a lockfile-specific patch function is required alongside the existing per-manifest one.
- **`scripts/validate-changesets.mjs` shape (the CI-check precedent).** Pure validator `validateChangesetFile(...)` returns an array of `{file, line, msg}` errors — it **collects all errors, never stops at the first** (loops over entries pushing each failure). `main()` reads `package.json` from CWD, iterates files, prints `path:line: msg` per error to **stderr**, writes nothing to stdout, and returns `0 | 1`. `isMainModule()` guards `process.exit(main())`. Exports `{ validateChangesetFile, main }`. Node built-ins only; comment explicitly notes it "Mirrors the export + isMainModule() shape of scripts/sync-version.mjs" (`scripts/validate-changesets.mjs:34-207`). This is the direct template for a drift-check script: pure check fn returning a list of mismatches + `main()` returning `0|1` + stderr messages.
- **Test conventions (`scripts/test/*.test.mjs`).** `node:test` (`describe`/`test`), `node:assert/strict`, temp-dir fixtures via `mkdtempSync`/`mkdirSync`, torn down in `afterEach`. `sync-version.test.mjs` asserts: version copied to every target, `changed` list, idempotency (second run → `changed: []`, files unchanged), and **byte-level format preservation** — splits before/after into lines and asserts exactly one differing line matching `/"version": "..."/` (`scripts/test/sync-version.test.mjs:72-96`). `validate-changesets.test.mjs` unit-tests the pure fn for each error case AND spawns the CLI (`spawnSync(process.execPath, [VALIDATOR_PATH], {cwd})`) asserting exit status, stderr format, empty stdout (`scripts/test/validate-changesets.test.mjs:115-161`). These patterns directly serve R12 (assert sync result + format preservation) and the drift-check's multi-mismatch assertions (R10).

### CI wiring: drift-check template, bot-PR exclusion, release path (Research Request 2)

Read-only inspection of `.github/workflows/`.

- **`validate-changesets` CI wiring (the template).** `.github/workflows/changeset-gate.yml`: trigger `on: pull_request: branches: [trunk]` (no `paths` filter). Single job `changeset` (ubuntu-latest, read-only perms). Steps: `actions/checkout@v6` (fetch-depth 0) → `actions/setup-node@v6` (node 22, npm cache) → `npm ci` → `npm test` → `- name: Validate changeset shape` / `run: node scripts/validate-changesets.mjs` → `npx changeset status`. Sources: `changeset-gate.yml:3-5,7-9,15-18,20-37`.
- **Bot-PR exclusion ALREADY EXISTS (R11 mechanism proven in-repo).** `changeset-gate.yml:18`: `if: github.head_ref != 'changeset-release/trunk' # bot-PR exemption` — a JOB-level `if` skipping the entire `changeset` job when the PR head branch is the changesets bot branch (`changeset-release/trunk`, cf. `release.yml:9`). Exclusion is by HEAD BRANCH, not actor/label. No actor/label exemption exists anywhere. A drift-check step added to this job inherits this exemption for free.
- **House style = steps-in-one-job.** `changeset-gate.yml` is a single `changeset` job with sequential `- name:/run:` steps; no multi-job precedent. Adding another step is the in-convention, lowest-friction extension and is how `validate-changesets` itself was added.
- **Release path CONFIRMED — no gap (R5, R9).** `.github/workflows/release.yml` `changesets/action` step (lines 31-37) sets `version: npm run release:version` (line 34) — the wrapper `changeset version && node scripts/sync-version.mjs` (`package.json:12`), explicitly overriding the action default. So extending `sync-version.mjs` propagates to CI with NO workflow change. The action's version mode commits ALL working-tree changes into the "Version Packages" PR (`changeset-release/trunk`), so a newly-patched `package-lock.json` rides along automatically.
- **Caveats (logged as risks).** (a) Whether the gate is a REQUIRED status check that actually blocks merge is GitHub repo/branch-protection settings, NOT in-tree — the design cannot set it in code. (b) "commits all working-tree changes" is documented `changesets/action` behavior (model knowledge + spec-research Q2), not asserted by the YAML; the YAML only confirms the version command is the wrapper.

Sources: `changeset-gate.yml:3-5,7-9,15-18,20-37`; `release.yml:3-6,9,31-37`; `package.json:12`; no in-repo branch-protection config; `changesets/action` commit-all = model knowledge + spec-research Q2.

## Topics

<!-- One subsection per design topic, each tracing to a spec requirement / acceptance criterion. -->

### Topic: Sync mechanism for the lockfile version fields

- **Spec link:** Requirements 5, 6, 7, 8, 13; Out of Scope (mechanism choice deferred to design, but must satisfy no-registry-access (R8) and no-unintended-churn (R7) bars).
- **Options:**
  1. **Extend `scripts/sync-version.mjs` with a structured offline patch.** Parse `package-lock.json`, set `obj.version` and `obj.packages[""].version` to the root version by path, reserialize with the existing `JSON.stringify(obj, null, 2) + "\n"` write path, and write only if changed.
  2. **`npm install --package-lock-only --offline`** invoked from the release flow.
  3. **Naive text/regex replace** of `"version": "..."` occurrences in the lockfile. (Listed only to rule out.)
- **Trade-offs:**
  - Option 1: offline by construction (no registry, no cache — pure file I/O); deterministic; touches only the two version fields (lines 3, 9) by path, so it cannot mask or mutate the dependency tree (respects the "tree out of scope" boundary); no new dependency (R13) — reuses Node built-ins already used by the script; reuses the byte-stable write path proven byte-identical on the real lockfile (R7). Cost: the script must distinguish the lockfile (two paths) from simple manifests (single `.version`), a small generalization of the current single-field model.
  - Option 2: meets R7 and R8 *today*, but its offline-safety and minimality are *conditional* on the dependency tree already matching the lock; if a range were ever unresolved it would attempt network re-resolution (or fail under `--offline`). It also revalidates the dependency tree on every run — work the spec explicitly puts out of scope — and couples the version sync to npm CLI behavior/flags rather than a small owned script.
  - Option 3: UNSAFE — `"version": "0.1.1"` also appears at line 721 for dependency `@changesets/logger`, which is legitimately at 0.1.1; a global replace would corrupt it. Ruled out.
- **Decision:** Option 1 — extend `scripts/sync-version.mjs` to patch the lockfile's two version fields with a structured, offline, path-targeted edit, reusing the existing canonical write path.
- **Rationale:** It is the only option that satisfies every bar *unconditionally and by construction*: offline always (R8), version-fields-only always (R7, since it sets two paths and never inspects/touches the tree), idempotent (write-only-if-changed, R6), no new dependency (R13). It folds into the script and `release:version` command that already exist (`changeset version && node scripts/sync-version.mjs`), so wiring is automatic (R5). Option 2's compliance is real but conditional and brings out-of-scope tree revalidation; Option 3 is unsafe. The structured patch (not a text replace) is mandatory per the line-721 finding.

### Topic: Components and how `sync-version.mjs` is extended for the lockfile

- **Spec link:** Requirements 5, 6, 7, 13; Acceptance criteria for the release-step sync, idempotency, and no-churn.
- **Framing:** `sync-version.mjs`'s current model is "one `.version` field per target manifest." The lockfile breaks that model: it needs two paths set (`.version`, `.packages[""].version`) within one file, and it must NOT be lumped into `TARGET_MANIFESTS` (whose handler `syncManifestVersion` sets only `.version`, leaving `.packages[""].version` stale — a correctness bug).
- **Options:**
  1. **Dedicated lockfile patch function** alongside the existing simple-manifest handler. Keep `TARGET_MANIFESTS` + `syncManifestVersion` for simple single-`.version` manifests (plugin.json); add a separate `syncLockfileVersion(path, version)` that parses, sets both `obj.version` and `obj.packages[""].version`, reserializes via the same `JSON.stringify(obj, null, 2) + "\n"` write path, writes only if changed. `syncVersion()` calls both and folds the lockfile into its `changed` list.
  2. **Generalize the manifest model to a list of (path, [fieldPaths]) targets.** Make every target carry the set of JSON paths to set; plugin.json → `["version"]`, lockfile → `["version", 'packages[""].version']`.
  3. **Add the lockfile to `TARGET_MANIFESTS`** and extend `syncManifestVersion` to also set `packages[""].version` when present.
- **Trade-offs:**
  - Option 1: smallest, clearest change; the simple-manifest path stays exactly as tested today; the lockfile gets its own narrowly-scoped function easy to unit-test for the two-field + format-preservation contract. Slight duplication of the parse/reserialize/write-if-changed skeleton.
  - Option 2: most uniform, but over-engineers for a two-element world (one simple manifest + one lockfile) and rewrites a path already covered by passing tests, raising regression risk on plugin.json for no current benefit.
  - Option 3: conflates two different field-shapes in one function (set `.version` always; set `.packages[""]` "if present"), making the function's contract murkier and its tests branchier; also risks an accidental `packages[""]` write on a non-lockfile manifest.
- **Decision:** Option 1 — a dedicated `syncLockfileVersion` function for the lockfile, the existing `TARGET_MANIFESTS`/`syncManifestVersion` path unchanged for plugin.json. `syncVersion()` orchestrates both and returns the combined `{ version, changed }`.
- **Rationale:** Minimal blast radius, preserves the already-passing simple-manifest behavior and tests, gives the lockfile a single-responsibility handler whose two-field/format-preservation contract is directly unit-testable (R12), and keeps every byte-stable write on the one proven path. No new dependency (R13). Idempotency (R6) and no-churn (R7) follow from write-only-if-changed + structured two-path set on the canonical write path.
- **Interface sketch (illustrative, not prescriptive):**
  - `syncLockfileVersion(lockfilePath, version) -> boolean` (changed?) — parse, set `obj.version` and `obj.packages[""].version`, reserialize `JSON.stringify(obj, null, 2) + "\n"`, write only if changed.
  - `syncVersion(options) -> { version, changed: string[] }` — unchanged signature; `changed` now also includes `package-lock.json` when its version fields moved. Existing `options.repoRoot` override (used by tests) extends to locate the lockfile too.

### Topic: Data flow — release step and the "Version Packages" PR

- **Spec link:** Requirements 5, 9; Acceptance criteria for `npm run release:version` and the bot PR contents.
- **Framing:** How the synced lockfile reaches `trunk` / the published tag.
- **Decision:** No new wiring needed for the run trigger. `release:version` is already `changeset version && node scripts/sync-version.mjs`; once `sync-version.mjs` also patches the lockfile, the bumped lockfile is written in the same step (R5). The changesets release action that opens the "Version Packages" PR commits the working-tree changes produced by `release:version`, so the updated `package-lock.json` is carried in that PR alongside `package.json`, `plugin.json`, and the changelog (R9) — by construction, provided the release workflow runs `release:version` (not `changeset version` alone).
- **Confirmation (Research Request 2):** RESOLVED. `release.yml` runs `version: npm run release:version` (the wrapper), so `sync-version.mjs` executes in CI with no workflow change, and the `changesets/action` commits all working-tree changes into the bot PR — the patched `package-lock.json` is carried automatically (R5, R9). Residual caveat (commit-all is documented action behavior, not asserted by the YAML) recorded under Risks.

### Topic: Drift-check script (the new check component)

- **Spec link:** Requirement 10; Acceptance criteria for pass (all match), single-mismatch fail, and multi-mismatch fail (every mismatched file+field reported).
- **Framing:** A check that, given the repo, compares `package.json`'s version against all three of `package-lock.json` `.version`, `package-lock.json` `.packages[""].version`, and `.claude-plugin/plugin.json` `.version`, and fails non-zero with a message naming EVERY mismatched file+field.
- **Options:**
  1. **New script `scripts/check-version-sync.mjs`** modeled on `validate-changesets.mjs`: a pure fn (e.g. `checkVersionSync(repoRoot|inputs) -> mismatches[]`) that collects ALL mismatches, plus `main()` that reads files, prints one `file: field expected X, got Y` line per mismatch to stderr, returns `0|1`, guarded by `isMainModule()`. Node built-ins only.
  2. **Fold the check into `sync-version.mjs`** behind a `--check` flag (sync vs. verify modes in one file).
- **Trade-offs:**
  - Option 1: mirrors the established `validate-changesets.mjs` precedent exactly (same export + `isMainModule()` + stderr `path: msg` + collect-all-errors shape the repo already uses); single responsibility; independently testable; the "collect all, never stop at first" behavior is already the proven pattern and directly satisfies R10's multi-mismatch requirement. Minor: a new file (but it's the house pattern — one script per check).
  - Option 2: one fewer file, but conflates a mutating tool (sync, writes files) with a read-only verifier (check, must never write) — a hazardous dual contract — and complicates both the CLI and the tests. Rejected.
- **Decision:** Option 1 — a new `scripts/check-version-sync.mjs` following the `validate-changesets.mjs` template: pure `checkVersionSync` returning a list of mismatches (one per diverging field), `main()` returning `0|1` and printing every mismatch to stderr, `isMainModule()`-guarded CLI.
- **Rationale:** Directly reuses the repo's proven check-script precedent (R10's "report every mismatched file and field, not just the first" maps one-to-one onto `validate-changesets`'s collect-all-errors loop). Read-only and side-effect-free, cleanly separated from the mutating sync. Node built-ins only (R13). Unit-testable against in-memory inputs and CLI-testable via `spawnSync` exactly like `validate-changesets.test.mjs` (R12).
- **Interface sketch (illustrative):** `checkVersionSync({ packageJson, lockfile, pluginJson }) -> { file, field, expected, actual }[]` (pure, collects all) and `main()` reading the three files from CWD, printing `path: <field> expected <root>, got <actual>` per mismatch to stderr, returning `0|1`. The three checked fields: `package-lock.json` `.version`, `package-lock.json` `packages[""].version`, `.claude-plugin/plugin.json` `.version`.

### Topic: One-time correction of the current drift

- **Spec link:** Requirements 1-4; Acceptance criteria for bringing the drifted lockfile back into sync with only the two version values changed.
- **Framing:** The lockfile is currently stale (`0.1.1` vs. `package.json` `0.4.0`). How is the existing drift corrected?
- **Decision:** No separate one-shot tooling. Once `sync-version.mjs` patches the lockfile, running it once (e.g. `node scripts/sync-version.mjs`, as part of this feature's own commit) corrects the live drift: it sets both lockfile version fields to `0.4.0`, changing only lines 3 and 9 (R1-R3) and leaving `plugin.json` already-correct and untouched (R4). The same script serves both one-time correction and ongoing propagation — consistent with the script's documented idempotent, outward-only design (`scripts/sync-version.mjs:11-15`).
- **Rationale:** Reusing the sync path for the one-time fix is exactly what its header comment intends ("lets the same script serve both normal propagation and one-time drift correction"). The byte-identical-reserialize finding guarantees R3's no-other-churn for this initial correction just as for ongoing runs. No extra component needed.

### Topic: Dependencies

- **Spec link:** Requirement 13 (no new external runtime dependency); Out of Scope (no registry publish).
- **Decision:** No new dependencies of any kind. The sync extension uses only Node built-ins already imported by `sync-version.mjs` (`node:fs`, `node:path`, `node:url`). The new drift-check script uses the same built-ins (plus, in tests, `node:test`/`node:assert`/`node:child_process`, all built-in and already used by existing tests). The CI wiring reuses the existing `changeset-gate.yml` job (checkout, setup-node, `npm ci`) — no new actions. No registry access anywhere (R8).
- **Rationale:** Satisfies R13 by construction; every facility relied on is already present in the repo's version scripts and workflows.

### Topic: Failure modes and observability

- **Spec link:** Requirements 8, 10; the acceptance criteria for offline success and clear failure messages.
- **Decision / analysis:**
  - **Sync (`sync-version.mjs` lockfile patch):** Purely file I/O; no network, so it cannot fail on registry/cache (R8). It reports via stdout which targets changed (existing behavior, extended to include `package-lock.json`). Foreseeable failure: lockfile missing or malformed JSON → `JSON.parse` throws and the script exits non-zero with the error — acceptable and loud (a broken lockfile is a real problem, not something to silently skip). Edge: if `.packages[""]` were ever absent, setting it should be guarded; in this `lockfileVersion: 3` repo it is always present (it carries `name`/`version`), so the patch sets an existing field.
  - **Drift check:** Read-only. On all-match → exit 0, empty stderr (mirrors `validate-changesets`). On any mismatch → exit 1 with one stderr line PER mismatched field (R10 multi-mismatch). Foreseeable failure: a missing/malformed file among the three → throws, exit non-zero — surfaces the problem rather than passing falsely.
  - **Observability:** Failures surface in CI logs via the gate job's stderr and the non-zero exit that fails the step. No additional logging/metrics needed for a version-consistency check.

### Topic: Testing approach

- **Spec link:** Requirement 12 (tests assert sync result + format preservation; full suite passes); reinforces R6, R7, R10.
- **Decision:** Follow the established `scripts/test/*.test.mjs` patterns (run by `npm test` = `node --test 'scripts/test/**/*.test.mjs'`).
  - **`sync-version.test.mjs` (extend):** add lockfile-fixture cases asserting (a) both `.version` and `.packages[""].version` updated to root version (R5/R1-R2); (b) byte-level format preservation — before/after differ on exactly the two version lines, all else identical, trailing newline preserved (R3/R7), reusing the existing line-diff assertion style; (c) idempotency — a second run yields `changed: []` and an unchanged file (R6); (d) a non-self dependency genuinely at the same version (the `@changesets/logger`-style case) is NOT touched (guards the structured-vs-text-replace correctness).
  - **`check-version-sync.test.mjs` (new):** unit-test the pure `checkVersionSync` for all-match → `[]`, single-field mismatch → one entry, multi-field mismatch (both lockfile fields) → an entry per field naming each file+field (R10); plus a CLI test via `spawnSync` asserting exit `0` clean / exit `1` + stderr lines for the live multi-mismatch case, empty stdout — mirroring `validate-changesets.test.mjs`.
- **Rationale:** Directly satisfies R12 (asserts both the sync result and format preservation) and exercises the R6/R7/R10 contracts with the repo's existing, proven test idioms; no new test dependency (R13).

### Topic: Drift-check CI wiring and bot-PR exclusion

- **Spec link:** Requirement 11; Acceptance criteria for "runs on PRs to trunk and blocks merge" and "bot Version Packages PR not gated."
- **Framing:** Where the drift check runs in CI and how the bot "Version Packages" PR is excluded.
- **Options:**
  1. **Add a `- name: Check version sync` / `run: node scripts/check-version-sync.mjs` step to the existing `changeset` job in `changeset-gate.yml`.** Inherits the job's `pull_request → trunk` trigger, checkout/Node/`npm ci`, AND the existing job-level `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption.
  2. **New separate job** in `changeset-gate.yml` (or a new workflow) with its own checkout/setup and its own copy of the `if`.
- **Trade-offs:**
  - Option 1: matches house style (single-job, sequential steps); reuses the proven bot-PR exemption verbatim (R11's exclusion is satisfied for free); no duplicated setup; same way `validate-changesets` was added. The check doesn't actually need `npm ci`/`npm test`, but riding the existing job costs nothing extra and keeps everything in one gate.
  - Option 2: duplicates setup and the `if` condition for no benefit; no multi-job precedent in this repo; more surface to drift. Rejected.
- **Decision:** Option 1 — add a drift-check step to the existing `changeset` job in `changeset-gate.yml`, inheriting its `pull_request: branches: [trunk]` trigger and its `if: github.head_ref != 'changeset-release/trunk'` bot-PR exemption.
- **Rationale:** The exact R11 exclusion ("runs on PRs to trunk except the bot Version Packages PR") is already implemented and proven in-repo by that job-level `if`; placing the drift check in the same job satisfies R11 by construction with zero new conditions. Follows the established wiring pattern; no new workflow, no duplicated setup. The "blocks merge" half of R11 depends on the gate being a required status check (external repo config — see Risks).

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- None blocking. The single open item (release workflow invokes `release:version` and commits the lockfile into the bot PR) is RESOLVED by Research Request 2. Implementation-phase detail to settle in code: the exact stderr message wording for the drift check (`file: field expected X, got Y`) — a quality choice, not a design risk.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **"Blocks merge" depends on external repo config (R11).** Whether `changeset-gate.yml` is a REQUIRED status check that actually blocks merge is GitHub branch-protection / ruleset config, NOT expressible in-tree. The design adds the drift-check step to a gate that runs on PRs to `trunk`; making it merge-blocking requires the gate to be (or remain) a required check in repo settings. Flag for downstream: the code/plan phase cannot satisfy the "blocks merge" clause purely in-repo; it should call out the repo-settings dependency (and the `changeset` job is presumably already required, which the drift step inherits by living in that job).
- **"commits all working-tree changes" is documented action behavior, not asserted by the YAML (R9).** `release.yml` confirms `version: npm run release:version`; that the `changesets/action` then commits the resulting `package-lock.json` into the bot PR is documented v1.x behavior (corroborated by spec-research Q2), not provable from the YAML alone. Low risk (it is the action's defined version-mode behavior), but worth a verification note in a later phase (inspect a produced bot PR).
- **`--offline`/cache minimality of `npm install --package-lock-only` is conditional** — not chosen, but recorded because it underpins rejecting Option 2: that path's R7/R8 compliance holds only while the dep tree matches the lock. The chosen offline structured patch has no such conditionality.
- **Structured (not text) patch is load-bearing.** The lockfile has a real dependency (`@changesets/logger`) at `0.1.1`, the same as the stale package version; a regex/sed replace would corrupt it. The implementation MUST set the two fields by JSON path. Captured so the plan/code phase doesn't regress to a text replace.
- **`packages[""]` presence assumption.** The patch sets an existing `.packages[""].version`; valid for this `lockfileVersion: 3` repo where the root self-entry always exists. If the lockfile format ever changed (e.g. a future `lockfileVersion`), this assumption would need revisiting — low likelihood, noted for completeness.

## Spec coverage map

<!-- Every spec requirement traced to a decision/component. -->

- R1, R2 (lockfile two version fields = package.json): One-time correction + sync-mechanism topics; `syncLockfileVersion` sets both paths.
- R3 (only the two values change on correction): Reserialize-byte-identical finding; structured two-path patch.
- R4 (plugin.json stays correct): Existing `TARGET_MANIFESTS`/`syncManifestVersion` path unchanged.
- R5 (release:version syncs lockfile, no manual action): Components + data-flow topics; `release.yml` runs `npm run release:version` (confirmed).
- R6 (idempotent): write-only-if-changed in `syncLockfileVersion`; idempotency test.
- R7 (no other churn): canonical write path proven byte-identical; structured patch; format-preservation test.
- R8 (no registry access): offline structured patch (pure file I/O) — sync-mechanism decision.
- R9 (lockfile in the bot PR): data-flow topic; `changesets/action` commits working-tree changes (caveat in Risks).
- R10 (drift check reports every mismatch): drift-check-script topic; collect-all-mismatches pure fn modeled on `validate-changesets`.
- R11 (runs on PRs to trunk except bot PR, blocks merge): drift-check CI wiring topic; reuses existing `if: github.head_ref != 'changeset-release/trunk'`; "blocks merge" caveat in Risks.
- R12 (tests assert result + format preservation, suite passes): testing-approach topic.
- R13 (no new external runtime dependency): dependencies topic; Node built-ins only.
- Out of Scope honored: no dep-tree validation/mutation (structured two-field patch only); no registry publish step; no other version-bearing files (only the three confirmed).
