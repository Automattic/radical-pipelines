# Code plan — Changelog with Changesets and version synchronization (Issue #81)

This plan covers the **CODE** scope only: install/configure Changesets, build the
version-sync script and the bundled version-step run-script, regenerate the
extension lockfile mechanism, and perform the one-time drift correction to the
`0.1.1` baseline. It executes the design doc's components **C1–C5** plus the
`prettier: false` verification carried forward from the design's OQ-4.

**Explicitly out of scope here (handled by the Docs / doc-plan phase):** authoring
the per-change `.changeset/*.md` for this issue (C6), the contributor-docs
changeset obligation, and the README workflow documentation (C7, R6, R13, AC8).
This plan adds **no documentation tasks** and **no tests** (the code-writer does
TDD).

## Repository facts verified against the worktree (baseline)

- Root `package.json` — `@automattic/radical-pipelines`, `version: "0.1.1"`
  (line 3), `"private": true`, `"type": "module"`, and **no `scripts` block**.
- `.claude-plugin/plugin.json` — `version: "0.1.0"` (line 3).
- `.pi-extension/package.json` — `version: "0.1.0"` (line 3), has
  `bundledDependencies`.
- `.pi-extension/package-lock.json` — `lockfileVersion: 3`; top-level version
  `0.1.0` at the root `"version"` key (line 3) and `packages[""].version`
  (line 9).
- No `.changeset/`, no root `CHANGELOG.md`, no `scripts/` directory exist yet.
- All three JSON manifests use 2-space indent and end with a trailing newline.
- Working tree is clean; the two researcher sandboxes (`.cs-sandbox/`,
  `.cs-sandbox-gh/`) noted in the design-doc review are **already absent** — no
  cleanup task is needed (see Task 0).
- `.claude-plugin/marketplace.json` and `.github/workflows/deploy-landing.yml`
  are intentionally untouched by this plan (R10/AC6, AC9).

---

## Task 0 — Confirm a clean baseline (pre-flight, no file changes)

**Goal:** Establish the exact starting state before any edits, so later tasks
can assert the deltas they produce.

**Files to change:** none.

**Changes:**
- Confirm `git status` is clean and that `.cs-sandbox/` and `.cs-sandbox-gh/` do
  not exist (the design-doc review flagged them as possibly-leftover; they are
  already gone). If either reappears, delete it so it cannot leak into a commit.
- Confirm the three manifest versions read `0.1.1` / `0.1.0` / `0.1.0` and the
  lockfile reads `0.1.0`, matching the baseline above. If they do not match,
  stop and report a blocker (the drift correction in Task 6 assumes this exact
  state).

**Depends on:** none.

**Traces to:** design-doc-review non-blocking note 2 (sandbox cleanup); precondition for AC7.

**Acceptance:** Working tree is clean apart from intended changes; no
`.cs-sandbox*` directories present; the four baseline version strings are as
documented above.

---

## Task 1 — Add the `@changesets/cli` dev dependency to the root package

**Goal:** Make `changeset` and `changeset version` runnable from the repository
root, declared as a development dependency of the private root package.

**Files to change:**
- `package.json` (root)
- A root `package-lock.json` will be **created** as a side effect of installing
  (the repository currently has none at the root). This is expected and correct:
  it pins the new dev dependency.

**Changes:**
- Add `@changesets/cli` to a new `"devDependencies"` block in the root
  `package.json` and install it so the dependency is resolved and the root
  lockfile records it. Use the npm install flow (e.g.
  `npm install --save-dev @changesets/cli`) rather than hand-editing the
  manifest, so the lockfile is generated consistently.
- Do **not** add any of `@changesets/changelog-github`,
  `@changesets/get-github-info`, or `dotenv` — the default formatter is used
  (K4), and these are explicitly not adopted.
- Preserve the existing root `package.json` structure (name, version, private,
  type, dependencies, peerDependencies, pi block) untouched apart from the added
  block.

**Depends on:** Task 0.

**Traces to:** R1, AC1; design doc C1, Dependencies.

**Acceptance:** Root `package.json` declares `@changesets/cli` under
`devDependencies`; the binary is invocable (e.g. `npx changeset --version`
succeeds); the root version field is still `0.1.1` and `"private": true` is
preserved.

---

## Task 2 — Add the Changesets configuration directory and `config.json`

**Goal:** Configure Changesets to target the repository's real default branch,
use the default (offline, tokenless) changelog formatter, keep the private root
package versioned-and-changelogged-but-not-tagged, and not auto-commit.

**Files to change:**
- `.changeset/config.json` (new)
- Optionally `.changeset/README.md` if the install flow scaffolds one — keep
  whatever `changeset init`-equivalent scaffolding produces, but the
  load-bearing file is `config.json`.

**Changes:**
- Create `.changeset/config.json` with the Changesets default shape, changing
  only the load-bearing keys:
  - `"baseBranch": "trunk"` — **required non-default** (the repo's default
    branch, not the tool's `master`).
  - `"changelog": "@changesets/cli/changelog"` — the default formatter; no
    GitHub token or network needed.
  - `"prettier": false` — the repository has no Prettier dependency, so disable
    the Prettier resolution for determinism (see Task 5 for the verification
    that the changelog still writes cleanly).
  - Leave `privatePackages` at the Changesets default
    `{ "version": true, "tag": false }` (the private root package is versioned
    and recorded in the changelog but never tagged).
  - Leave `"commit": false` (default) so Changesets does not auto-commit and
    commits follow the repository's agent-name convention.
  - Leave `"access": "restricted"` (default; irrelevant since nothing is
    published) and the remaining keys (`updateInternalDependencies`, `ignore`,
    etc.) at their defaults.
- Use the standard `$schema` reference that Changesets writes
  (`https://unpkg.com/@changesets/config@.../schema.json`) so the file matches
  the tool's own output and validates.

**Depends on:** Task 1 (the CLI must be installed to scaffold/validate the
config; `changeset version` in Task 4 reads this file).

**Traces to:** R1, R2, R4, AC1; design doc C1, K4.

**Acceptance:** `.changeset/config.json` exists with `baseBranch: "trunk"`,
`changelog: "@changesets/cli/changelog"`, `prettier: false`, and
`privatePackages` at the default `{ version: true, tag: false }`; the file
validates against the Changesets config schema; `.changeset/` is present in the
repository.

---

## Task 3 — Add the version-sync script `scripts/sync-version.mjs`

**Goal:** Provide a zero-dependency, idempotent ESM script that copies the root
`package.json` version (the single source of truth) into the two target
manifests, byte-preserving their format.

**Files to change:**
- `scripts/sync-version.mjs` (new; creates the `scripts/` directory)

**Changes:**
- Implement an ESM Node script (the repo is `"type": "module"`) that:
  1. Reads the root `package.json`, `JSON.parse`s it, and takes `.version`. The
     script **never computes its own bump** and **never reads a target back into
     the root** — data flows strictly outward from the root.
  2. For each target path — `.claude-plugin/plugin.json` and
     `.pi-extension/package.json` — reads, parses, sets `.version` to the root
     value, and writes back with `JSON.stringify(obj, null, 2) + "\n"` (2-space
     indent + trailing newline), which round-trips the current files
     byte-identical apart from the version line.
- Resolve all paths relative to the repository root (e.g. derived from the
  script's own location via `import.meta.url`, or from `process.cwd()` assuming
  invocation from the repo root) so the script works regardless of the caller's
  directory. Match whichever convention the code-writer's tests assert; the
  load-bearing requirement is that running it from the repo root updates the two
  manifests correctly.
- Use only built-in modules (`node:fs`, `node:path`, `node:url`) — **no external
  dependencies**, no format-preserving library.
- Keep the script idempotent and re-runnable: running it twice with an unchanged
  root yields no further changes. This property is what lets the same script
  serve both normal propagation (Task 4) and the one-time drift correction
  (Task 6).

**Depends on:** Task 0 (baseline). Independent of Tasks 1–2.

**Traces to:** R3, R7, R8, AC4; design doc C2, K1.

**Acceptance:** Running `node scripts/sync-version.mjs` from the repo root sets
the `version` of `.claude-plugin/plugin.json` and `.pi-extension/package.json`
equal to the root `package.json` version; the files keep 2-space indent and a
trailing newline; re-running produces no further diff; the script imports no
third-party modules.

---

## Task 4 — Add the bundled, non-`version`-named version-step run-script

**Goal:** Make it structurally impossible to bump the root version in isolation
by chaining the three version-step commands fail-fast under a single npm
run-script whose name is not `version`.

**Files to change:**
- `package.json` (root) — add a `"scripts"` block (currently absent).

**Changes:**
- Add a `"scripts"` block containing a single run-script named **`release:version`**
  (it **must not** be named `"version"`, to avoid npm firing
  `preversion`/`postversion` lifecycle hooks now or later) whose command chains,
  fail-fast with `&&`:
  ```
  changeset version
    && node scripts/sync-version.mjs
    && npm --prefix .pi-extension install --package-lock-only
  ```
  (as a single one-line value in the JSON).
- Rationale to preserve in the implementation:
  - **Step 1** (`changeset version`) consumes `.changeset/*.md`, bumps the root
    `package.json`, writes/updates the root `CHANGELOG.md`, and deletes consumed
    changeset files.
  - **Step 2** (`node scripts/sync-version.mjs`) propagates the new root version
    into the two target manifests (Task 3).
  - **Step 3** (`npm --prefix .pi-extension install --package-lock-only`)
    regenerates the extension lockfile in place (Task 5 mechanism), editing only
    the two top-level version lines.
- `&&` ensures any non-zero exit aborts the remainder, preventing partial
  application. Do not split these into separate scripts and do not add a
  separate root-only bump script.

**Depends on:** Task 1 (`changeset` available), Task 2 (config present), Task 3
(sync script exists). The run-script references all three.

**Traces to:** R4, R5, R7, R8, R9, AC3, AC4, AC5; design doc C3, K2, FM-1, FM-3.

**Acceptance:** Root `package.json` has a `scripts` block with exactly one
run-script `release:version` whose value is the three `&&`-chained commands in
the order above; no run-script is named `version`; no root-only bump script
exists.

---

## Task 5 — Establish and verify the in-place extension lockfile regeneration

**Goal:** Ensure `npm --prefix .pi-extension install --package-lock-only`
rewrites only the two top-level version lines of
`.pi-extension/package-lock.json` to match `.pi-extension/package.json`, in
place, offline, with no `node_modules` and no registry round-trip — and confirm
this is the mechanism the run-script invokes (no code artifact of its own beyond
the run-script from Task 4).

**Files to change:**
- `.pi-extension/package-lock.json` (regenerated in place when the mechanism
  runs; only the two top-level version lines change).
- No new file is created by this task; it validates the command wired in Task 4
  and exercised in Task 6.

**Changes / verification:**
- Run `npm --prefix .pi-extension install --package-lock-only` after a version
  change has reached `.pi-extension/package.json` and confirm:
  - The top-level `"version"` (line 3) and `packages[""].version` (line 9) of
    the lockfile update to match the manifest.
  - The `bundleDependencies` block and every `inBundle` entry are **untouched**.
  - No `node_modules` directory is created and the registry is not contacted
    (the lockfile is `lockfileVersion: 3` with integrity-pinned deps).
  - The lockfile is **edited in place** against the existing file — it is
    **never deleted and regenerated from scratch** (that path fails offline with
    `ENOTCACHED`).
- If `npm install --package-lock-only` attempts network resolution or errors
  offline, stop and report a blocker rather than switching to a
  delete-then-regenerate approach (which the design forbids).

**Depends on:** Task 4 (defines the exact command), and is exercised concretely
in Task 6.

**Traces to:** R9, AC5; design doc C4, K1, FM-2.

**Acceptance:** After a version change to `.pi-extension/package.json`, running
the lockfile command brings the lockfile's two top-level version keys equal to
the manifest version, changes nothing else (bundle/`inBundle`/formatting intact),
creates no `node_modules`, and works offline.

---

## Task 6 — Perform the one-time drift correction to the `0.1.1` baseline

**Goal:** Bring `.claude-plugin/plugin.json`, `.pi-extension/package.json`, and
`.pi-extension/package-lock.json` up to the root's existing `0.1.1`, resolving
the pre-existing drift — using the same sync mechanism, with **no**
`changeset version`, **no** changelog entry, and **no** version pinned beyond
`0.1.1`.

**Files to change:**
- `.claude-plugin/plugin.json` — `version` `0.1.0` → `0.1.1`.
- `.pi-extension/package.json` — `version` `0.1.0` → `0.1.1`.
- `.pi-extension/package-lock.json` — top-level version (lines 3 and 9)
  `0.1.0` → `0.1.1`.

**Changes:**
- With the root `package.json` left **unchanged at `0.1.1`**, run the sync
  mechanism once (the same Task 3 script plus the Task 5 lockfile command):
  1. `node scripts/sync-version.mjs` → copies `0.1.1` into the two manifests.
  2. `npm --prefix .pi-extension install --package-lock-only` → brings the
     lockfile's two top-level version keys to `0.1.1`.
- Do **not** run `changeset version` for this correction and do **not** add a
  `CHANGELOG.md` entry — the `0.1.1` normalization is versioning hygiene, not a
  feature change. The first `CHANGELOG.md` entry will appear only when the first
  real changeset is consumed (which is a Docs-phase / future operator action, not
  part of this plan). There must be **no special-case code path** for the
  correction; it is purely "run the sync step with the root already at `0.1.1`."
- Do **not** touch `.claude-plugin/marketplace.json` (no version field; R10/AC6).

**Depends on:** Task 3 (sync script), Task 5 (lockfile mechanism verified).

**Traces to:** R3, R7, R8, R9, R11, R12, AC4, AC5, AC7; design doc C5, K6.

**Acceptance:** All four version strings — root `package.json`,
`.claude-plugin/plugin.json`, `.pi-extension/package.json`, and the lockfile's
two top-level keys — read `0.1.1`; `marketplace.json` is unmodified; no
`CHANGELOG.md` was created by this step; no git tag and no
`changeset version` were run.

---

## Task 7 — Verify the no-publish / no-tags / no-release-CI invariants hold

**Goal:** Confirm the code changes introduce no publishing step, no git tags, and
no release CI, and leave `deploy-landing.yml` and `marketplace.json` untouched.

**Files to change:** none (verification only).

**Changes / verification:**
- Confirm no `publish`/`npm publish` step was added to root `package.json`
  scripts (the only run-script is `release:version`).
- Confirm no Changesets GitHub Action / "Version Packages" workflow file was
  added under `.github/workflows/` and that `.github/workflows/deploy-landing.yml`
  is byte-unchanged.
- Confirm no git tags were created by this work.
- Confirm `.claude-plugin/marketplace.json` is unmodified.

**Depends on:** Tasks 1–6.

**Traces to:** AC6, AC9; spec Out of Scope; design doc "Explicitly untouched",
K3.

**Acceptance:** No publish step, no new workflow, no tags, `deploy-landing.yml`
and `marketplace.json` unchanged.

---

## Coverage map (acceptance criteria → tasks)

- **AC1** (Changesets installed + configured; `baseBranch: trunk`; private
  default; dev dep) → Tasks 1, 2.
- **AC2** (a changeset can be authored) → enabled by Tasks 1–2 (the tooling); the
  actual changeset for this issue is authored in the **Docs phase** (out of scope
  here).
- **AC3** (version step generates changelog, consumes changesets) → Tasks 2, 4
  (config + `changeset version` step in the run-script).
- **AC4** (all version-bearing files match after version step) → Tasks 3, 4, 6.
- **AC5** (lockfile matches extension manifest) → Tasks 4, 5, 6.
- **AC6** (marketplace unchanged) → Tasks 6, 7.
- **AC7** (drift corrected to `0.1.1` baseline, no next version pinned) → Task 6.
- **AC8** (per-change changeset obligation + README workflow documented) →
  **Docs phase / doc-plan (out of scope here).**
- **AC9** (no publish/tags/release CI; `deploy-landing.yml` unchanged) →
  Tasks 4, 7.

## Notes for the code-writer (TDD)

- The `prettier: false` verification (design OQ-4 / review note 3) is satisfied
  by Task 2 (set the key) and exercised in Task 6 — when the first
  `changeset version` actually runs (an operator action), confirm the changelog
  writes cleanly with no Prettier installed. Within this plan there is no
  `changeset version` run, so the concrete check is: the config validates and the
  sync/lockfile path does not depend on Prettier.
- Do not introduce any network-dependent step; both the sync script and the
  lockfile regen must work offline.
