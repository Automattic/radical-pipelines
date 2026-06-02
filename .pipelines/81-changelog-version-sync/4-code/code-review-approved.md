# Code review — Phase 4 batch (Issue #81): APPROVED

**Verdict:** APPROVED
**Batch:** Tasks 0–7 (entire code-plan), reviewed in a single pass.
**Base ref:** `14dd650` → **HEAD** (tip of batch).
**Commits reviewed:** `93763bf` (T1), `7ebb0da` (T2), `79f9b5b` (T3), `0b4d073` (T4), `ea9407c` (T5+T6). Tasks 0, 5, 7 are verification-only checkpoints, re-verified independently below.

## Scope of the batch (changed files, excl. `node_modules/`, `.pipelines/`)

```
A  .changeset/README.md            (changeset init scaffolding — non-load-bearing)
A  .changeset/config.json          (T2 — load-bearing config)
M  .claude-plugin/plugin.json      (T6 — 0.1.0 → 0.1.1)
M  .gitignore                      (T1 side effect — adds node_modules/)
M  .pi-extension/package-lock.json (T5/T6 — two version lines only)
M  .pi-extension/package.json      (T6 — 0.1.0 → 0.1.1)
A  package-lock.json               (T1 side effect — pins new dev dep)
M  package.json                    (T1 devDep + T4 release:version script)
A  scripts/sync-version.mjs        (T3 — sync script)
A  scripts/test/sync-version.test.mjs (T3 — TDD tests)
```

Every file traces to a plan task. No scope creep. Optional hardening (CI drift-check, `engines.node`/`.nvmrc`) was correctly **not** adopted — they were optional and net-new CI, and AC9 forbids release CI.

## Gates (recorded evidence)

| Gate | Command | Result |
|------|---------|--------|
| Unit tests | `node --test` | **PASS** — 1 suite, 6 tests, 6 pass / 0 fail |
| Sync idempotency | `node scripts/sync-version.mjs` on clean tree | "already in sync; no changes" — `git status` empty |
| Changeset config valid | `npx changeset status` | Config parsed (incl. `baseBranch: trunk`); only the expected "no changesets found" semantic error, **no config/schema error** |
| Offline lockfile regen | `npm --prefix .pi-extension install --package-lock-only --offline` | Succeeds offline; no diff (already `0.1.1`); creates no `node_modules` |

No lint/typecheck/build gates exist in this repo by convention; their absence is not a defect.

## Behavior checks (offline, recorded)

| Check | Evidence |
|-------|----------|
| Four version strings = `0.1.1` | root `package.json:3`, `.claude-plugin/plugin.json:` version, `.pi-extension/package.json:` version, lockfile `version` (line 3) + `packages[""].version` (line 9) all read `0.1.1` |
| `sync-version.mjs` idempotent | Re-run = "no changes", clean tree |
| `.changeset/config.json` read by `changeset status` | No config/schema error |
| Lockfile batch diff = only two version lines | `git diff 14dd650..HEAD -- .pi-extension/package-lock.json` = exactly `0.1.0`→`0.1.1` on lines 3 & 9; `inBundle` count 275→275, `bundleDependencies` 1→1 (bundle intact); no `node_modules` created |
| `marketplace.json` byte-unchanged vs base | `git diff --stat 14dd650..HEAD` empty |
| `deploy-landing.yml` byte-unchanged vs base | empty; no new files under `.github/` |
| No root `CHANGELOG.md` | absent |
| No git tags | `git tag --list` = 0 tags |
| Root `scripts` only `release:version` | `{"release:version":"changeset version && node scripts/sync-version.mjs && npm --prefix .pi-extension install --package-lock-only"}`; no `version` script; no `publish` |

`npm run release:version` / `changeset version` were **not** run (would mutate state; no changesets exist) — per the verification convention.

## Per-task acceptance coverage

- **T0 (clean baseline, no files):** Re-verified — no `.cs-sandbox*` dirs; working tree clean. PASS.
- **T1 (`@changesets/cli` dev dep):** `devDependencies."@changesets/cli": "^2.31.0"`; root `package-lock.json` created (side effect, correct); `private: true`, version `0.1.1`, and all other root keys preserved. Root `node_modules` is gitignored and untracked (0 tracked files). PASS.
- **T2 (`.changeset/config.json`):** `baseBranch: "trunk"`, `changelog: "@changesets/cli/changelog"`, `prettier: false`, `privatePackages: { version: true, tag: false }`, `commit: false`, `access: "restricted"`; `$schema` pins the tool's config schema. Validates via `changeset status`. PASS.
- **T3 (`scripts/sync-version.mjs`):** Zero-dependency ESM (`node:fs`/`node:path`/`node:url` only), reads root version, writes both targets with `JSON.stringify(obj, null, 2) + "\n"`, idempotent, data flows strictly outward. Path-resolution via `import.meta.url` (caller-dir independent). PASS.
- **T4 (`release:version` run-script):** Single script, correctly named (not `version`), three `&&`-chained commands in the specified order. PASS.
- **T5 (in-place lockfile regen, checkpoint):** Exercised offline — only two version lines change, bundle/`inBundle` intact, no `node_modules`, no registry round-trip. PASS.
- **T6 (drift correction to `0.1.1`, checkpoint commit `ea9407c`):** All four version strings at `0.1.1` via the generic sync mechanism; no `changeset version`, no `CHANGELOG.md`, no special-case path, `marketplace.json` untouched. PASS.
- **T7 (no-publish/no-tags/no-CI, checkpoint):** No publish step, no new workflow, no tags, `deploy-landing.yml` + `marketplace.json` unchanged. PASS.

## Spec AC coverage (in-scope: AC1, AC3, AC4, AC5, AC6, AC7, AC9)

- **AC1** (Changesets installed + configured, `baseBranch: trunk`, private default, dev dep) — MET (T1, T2).
- **AC3** (version step generates changelog / consumes changesets) — config + `changeset version` wired in `release:version`; mechanism present and config-valid. MET at the code/config level (the actual run is an operator action, correctly deferred).
- **AC4** (all version-bearing files match) — MET (T3 sync + T6).
- **AC5** (lockfile matches manifest) — MET (T5 mechanism + T6).
- **AC6** (marketplace unmodified) — MET (byte-unchanged).
- **AC7** (drift corrected to `0.1.1` baseline, no next version pinned) — MET (T6).
- **AC9** (no publish/tags/release CI; `deploy-landing.yml` unchanged) — MET.

**AC2 and AC8 are deferred to the Docs phase by design** (changeset authoring + README/contributor-docs obligation) and are correctly out of this batch's scope.

## Test quality

The TDD suite (`scripts/test/sync-version.test.mjs`) covers: outward copy into every target, change-reporting, **format preservation** (2-space indent, single-line trailing newline, exactly one differing line = the version line), **idempotency** (second run yields empty `changed`), `readRootVersion` isolation, and `syncManifestVersion` no-op detection. Fixtures are isolated temp dirs with nested values to prove non-version keys survive round-trip. Meaningful, behavior-focused, not tautological.

## Inline documentation of public symbols

`sync-version.mjs` has a module header (purpose, outward data flow, idempotency, zero-dependency/offline) and JSDoc on all four exported symbols (`readRootVersion`, `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`) plus the internal `isMainModule`. Comment density matches repo idiom. Adequate.

## Convention compliance

Commits follow the imperative, sentence-case, agent-name-suffixed format (`Add version sync script (code-writer)`, etc.). JSON manifests keep 2-space indent + trailing newline. ESM throughout (repo is `"type": "module"`).

## Non-blocking observations (not defects)

- `.changeset/README.md` boilerplate mentions "publish" — this is verbatim `changeset init` scaffolding (non-load-bearing prose), not a publish step or CI; AC9 concerns actual publish/tag/CI actions, none of which exist. No change needed.

**Conclusion:** All in-scope ACs met, all eight tasks satisfied, all gates green with recorded evidence, no scope creep, clean tree. **APPROVED.**
