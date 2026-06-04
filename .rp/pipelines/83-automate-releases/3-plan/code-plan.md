# Code Plan: Automate releases with GitHub Actions (changeset gate + release workflow)

## Overview

This plan implements CI-driven release automation for the private,
not-published-to-npm package `@automattic/radical-pipelines`, on top of its
existing changeset foundation (`.changeset/config.json`, `@changesets/cli`, and
`release:version = changeset version && node scripts/sync-version.mjs`). The
work adds: a dependency-free changeset shape validator (`.mjs`) with a
`node:test` suite; a PR-time **changeset gate** workflow that runs the validator
plus a `changeset status` presence check; and a post-merge **release** workflow
that uses `changesets/action@v1` to open/update a "Version Packages" PR and, on
human merge, create a `v<version>` git tag and a GitHub Release. No npm publish
and no OIDC anywhere.

The tasks are ordered so that a single shared working tree can be edited by one
code-writer at a time without conflict, and so that prerequisites are satisfied
before the steps that depend on them. The hard ordering constraints are:
**(1)** the `package-lock.json` resync and the new devDep/`test` script in
`package.json` must land **before** either workflow (both run `npm ci` and
`npm test`); **(2)** the validator script must exist **before** the gate
workflow that invokes it; **(3)** the `.changeset/config.json` deltas
(`changedFilePatterns`, `privatePackages.tag`, `changelog`) must land before the
workflows that rely on the presence check and the changelog generator. The three
"plan deltas" from the design (lockfile resync, `test` script, `.gitignore`
`.env`) are front-loaded.

Scope is code + tests only. Documentation surfaces (CONTRIBUTING.md, README.md,
`.changeset/README.md`, `AGENTS.md`) are handled by a separate doc plan and are
**not** included here, with one cross-file caveat called out in Task 4
(the validator's error message hard-codes the anchor
`CONTRIBUTING.md#pre-10-policy`, which the doc phase must honor).

## Tasks

### Task 1: Add `.env` and `.env.local` to `.gitignore`

- **Goal:** Prevent a maintainer's local GitHub token file (needed by the
  adopted `@changesets/changelog-github` for local `release:version`) from being
  committed.
- **Files to change:** `.gitignore`.
- **Changes:** The file currently contains only `node_modules/`. Add `.env` and
  `.env.local` entries (keep `node_modules/`). This is plan delta Δ3 from the
  design (§5.4).
- **Depends on:** none.
- **Traces to:** Design §5.4 / Δ3; supports R18/R20 (a gitignored `.env` is the
  documented local-token mechanism).
- **Acceptance:**
  - `.gitignore` ignores `.env` and `.env.local` (a file named `.env` at the
    repo root is untracked by git).
  - `node_modules/` is still ignored.

### Task 2: Resync `package-lock.json` and add the `@changesets/changelog-github` devDep + `test` script to `package.json`

- **Goal:** Make `npm ci` succeed in CI (it currently fails due to pre-existing
  lockfile drift — `@types/node@12.20.55` locked vs `@types/node@25.9.1`
  resolved), add the changelog generator dependency that the release workflow
  and config need, and add the `test` script both workflows invoke. Doing this in
  one task keeps the lockfile and `package.json` mutually consistent in a single
  `npm install`.
- **Files to change:** `package.json`, `package-lock.json`.
- **Changes:**
  - In `package.json` `devDependencies`, add
    `"@changesets/changelog-github": "^0.7.0"` (alongside the existing
    `"@changesets/cli": "^2.31.0"`). This pulls `@changesets/get-github-info`
    and `dotenv` transitively — do **not** add those as separate devDeps.
  - In `package.json` `scripts`, add a `test` script with this **exact** value
    (plan delta Δ2):
    `"test": "node --test 'scripts/test/**/*.test.mjs'"`.
    The quoted, node-expanded recursive glob is required: on node 22,
    `node --test scripts/test/` fails with `MODULE_NOT_FOUND`, and the bare
    `node --test` form would execute non-test helpers. Do **not** alter the
    existing `release:version` script — it must stay byte-for-byte
    `"changeset version && node scripts/sync-version.mjs"` (R3/N2/J6).
  - Run `npm install` to resync `package-lock.json`: this corrects the existing
    drift and records the new devDep tree so `npm ci` is deterministic
    (plan delta Δ1). Commit the regenerated `package-lock.json`.
- **Depends on:** none (can run before or after Task 1; sequence before all
  workflow tasks).
- **Traces to:** Design §5.2, §5.3 / Δ1, Δ2; R3 (release:version unchanged),
  R18 (changelog-github), R10/R12 (test runner), AC8.
- **Acceptance:**
  - `npm ci` completes successfully against the committed `package-lock.json`
    (no `EUSAGE`/lockfile-out-of-sync error).
  - `npm test` runs the existing `scripts/test/sync-version.test.mjs` suite and
    it passes.
  - `package.json` lists `@changesets/changelog-github` in `devDependencies` and
    `release:version` is unchanged.
  - `node_modules/@changesets/changelog-github` resolves after `npm ci`.

### Task 3: Apply the three `.changeset/config.json` deltas

- **Goal:** Switch the changelog generator to `@changesets/changelog-github`,
  enable tagging of the private package, and add the release-relevant
  `changedFilePatterns` allowlist that makes the presence check meaningful —
  while keeping everything else byte-identical.
- **Files to change:** `.changeset/config.json`.
- **Changes (exactly three deltas; all other keys, including `commit: false`,
  `access: "restricted"`, and the `$schema` pin
  `@changesets/config@3.1.4`, stay unchanged):**
  1. `changelog`: replace `"@changesets/cli/changelog"` with the tuple
     `["@changesets/changelog-github", { "repo": "Automattic/radical-pipelines" }]`.
     The `repo` field is required — omitting it throws.
  2. `privatePackages`: change `"tag": false` to `"tag": true`. **Keep**
     `"version": true` (the gate's presence check is blind without it — see
     invariant J1). The schema forbids `tag:true + version:false`, so this is
     self-reinforcing.
  3. Add a top-level `"changedFilePatterns"` array equal to the R8 allowlist:
     `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`.
     The `package.json` entry is anchored (matches only the root `package.json`),
     so `package-lock.json` and nested `package.json` files do not trip the
     presence check.
- **Depends on:** Task 2 (the `changelog-github` devDep must be installed before
  any tooling resolves the new `changelog` config entry).
- **Traces to:** Design §5.1 / DC5, J1, J2; R4, R7, R8, R14, R18; AC3, AC4, AC5.
- **Acceptance:**
  - `.changeset/config.json` `changelog` is the `@changesets/changelog-github`
    tuple with `repo: "Automattic/radical-pipelines"`.
  - `privatePackages` is `{ "version": true, "tag": true }`.
  - `changedFilePatterns` equals the five-entry allowlist above, with
    `package.json` (not `package-lock.json` and not a glob).
  - The config still loads without error under the pinned `$schema`
    (`commit`, `access`, `baseBranch: "trunk"` etc. unchanged).

### Task 4: Implement the dependency-free changeset shape validator `scripts/validate-changesets.mjs`

- **Goal:** Provide a built-in-Node-only ESM validator that enforces the
  changeset shape rules (R11), mirroring the export + `isMainModule()` shape of
  `scripts/sync-version.mjs`. No `tsx`, no YAML library, no new dependencies
  (invariant J4).
- **Files to change:** `scripts/validate-changesets.mjs` (new).
- **Changes:** Implement, using only `node:fs`/`node:path`/`node:url` built-ins:
  - **Exported pure function** `validateChangesetFile(file, raw, pkgName, version)`
    returning an array of `Err` objects (`Err = { file, line, msg }`), empty when
    valid. It runs these checks **in this order**:
    1. **Front-matter fence.** Use the regex
       `/^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/` (group 1 = front
       matter, group 2 = body; tolerates CRLF and an optional final newline). If
       it does not match, return a single error at **line 1**:
       `"missing or unterminated front matter (expected two '---' fences)"`
       (early return).
    2. **Canonical empty changeset is valid.** If `group1.trim() === ""` **and**
       `group2.trim() === ""`, return `[]` (the `--empty` output `---\n---\n` and
       its no-trailing-newline variant `---\n---` are both accepted).
    3. **Empty body.** If `group2.trim() === ""` while front matter is present,
       return an error at **line 4** (the canonical body line; a literal, not
       computed): `"empty body (changeset has front matter but no summary)"`.
    4. **Front matter must be a mapping.** Parse the front-matter block
       line-by-line; skip blank lines; match each non-blank line against
       `/^\s*(?:"([^"]+)"|'([^']+)'|([^@`!&*?|>%#"'\s][^:#\s]*))\s*:\s*(\S+)\s*$/`
       (alt 1 double-quoted key, alt 2 single-quoted key, alt 3 a legal **bare**
       key whose first char excludes the YAML reserved indicators
       `` @ ` ! & * ? | > % # " ' `` and whitespace; group 4 = bump). If **any**
       non-blank line fails this regex, or if **no** entries are found, return an
       error at **line 2**:
       `"front matter must be a YAML mapping of package name to bump"`
       (early return). This deliberately **rejects a bare `@`-scoped key** (e.g.
       `@automattic/radical-pipelines: minor` without quotes) as malformed YAML —
       matching what the real changesets parser accepts (see design §6.3 / ST1).
    5. **Per entry** (collect all matched entries into a `{ name: bump }` map;
       each error reported at **line 2**), in this order per entry:
       - **Unknown name:** if `name !== pkgName`, error
         `unknown package "<name>" (expected "@automattic/radical-pipelines")`.
       - **Invalid bump:** if `bump` is not in `{ patch, minor, major, none }`,
         error `invalid bump "<bump>" (expected one of patch, minor, major, none)`.
       - **Pre-1.0 major:** if `version` starts with `"0."` **and** `bump ===
         "major"`, error
         `'major' is forbidden while pre-1.0 (version=<version>). Use 'minor' with a 'BREAKING:' prefix; see CONTRIBUTING.md#pre-10-policy.`
         The substring `CONTRIBUTING.md#pre-10-policy` is **load-bearing**
         (invariant J7) and must appear verbatim — the doc phase will title a
         `## Pre-1.0 policy` heading so GitHub slugs it to `#pre-10-policy`.
  - **Exported function** `main()` returning `0` or `1`: reads `{ name, version }`
    from the CWD `package.json`; enumerates changeset files via
    `readdirSync(".changeset").filter(n => n.endsWith(".md") && n !== "README.md")`
    (the `.changeset/README.md` cheat-sheet is excluded); runs
    `validateChangesetFile` on each; prints `.changeset/<file>:<line>: <msg>` per
    error to **stderr**; writes nothing to stdout; returns `1` if any errors,
    else `0`.
  - **`isMainModule()`** copied from `sync-version.mjs`
    (`realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])`,
    guarding the no-`process.argv[1]` case), and `if (isMainModule())
    process.exit(main());` at the bottom.
  - The valid bump set is `{ patch, minor, major, none }`; the expected package
    name passed in `main()` is the root `package.json` `name`
    (`@automattic/radical-pipelines`). The pre-1.0 guard is active whenever
    `version` starts with `"0."`.
- **Depends on:** none on the validator's own logic (dependency-free), but
  sequence after Task 2 so the repo's `package.json`/lockfile are settled; it is
  required by Task 5 (the gate) and Task 6 (the test suite), so it must precede
  both.
- **Traces to:** Design §6 / D3.1–D3.6, J4, J7, ST1; R10, R11; AC6, AC7, AC8.
- **Acceptance:**
  - Importing the module exposes `validateChangesetFile` and `main` as named
    exports and imports no third-party package (only `node:` built-ins).
  - `validateChangesetFile` returns `[]` for: a double-quoted-key `minor`
    changeset with a non-empty body; the canonical empty changeset with and
    without a trailing newline; a CRLF-formatted valid changeset; a
    single-quoted-key changeset; and a `none` bump.
  - `validateChangesetFile` returns exactly one error with the stated message and
    line for each of: missing/unterminated closing fence (line 1); front matter
    present but empty body (line 4); an invalid bump value (line 2); an unknown
    package name (line 2); a bare unquoted `@`-scoped key (line 2,
    "front matter must be a YAML mapping…"); a `major` bump when `version`
    starts with `0.` (line 2, message contains `#pre-10-policy`).
  - `validateChangesetFile` returns `[]` for a `major` bump when `version` is
    `1.0.0`.
  - Run directly with a CWD containing a `package.json` and a `.changeset/` dir:
    exits `1` (and prints `.changeset/<file>:<line>: <msg>` to stderr, nothing to
    stdout) when a changeset is malformed; exits `0` with empty stderr when all
    changesets are valid; `.changeset/README.md` is never validated.

### Task 5: Add the validator test suite `scripts/test/validate-changesets.test.mjs`

- **Goal:** Cover the validator behaviors required by R12/AC8 with Node's
  built-in test runner, mirroring `scripts/test/sync-version.test.mjs`. This is
  the deliverable test suite the spec marks MUST (it is not the code-writer's
  optional TDD scaffolding — the spec enumerates a required matrix).
- **Files to change:** `scripts/test/validate-changesets.test.mjs` (new).
- **Changes:** Using `node:test` (`describe`/`test`/`beforeEach`/`afterEach`) and
  `node:assert/strict`, exercise both layers:
  - **Unit layer:** import the pure `validateChangesetFile(file, raw, pkgName,
    version)` and assert the returned `Err[]` for the matrix in design §7
    (B1 valid minor; B2a/B2b canonical empty with/without trailing newline;
    B3 missing closing fence → line 1; B4 invalid bump → line 2; B5 wrong package
    → line 2 with the `expected "@automattic/radical-pipelines"` text; B6 empty
    body → line 4; B7a pre-1.0 `major` → line 2 with `#pre-10-policy`; B7b `major`
    accepted at `1.0.0`; CRLF valid input → `[]`; double-quoted key → `[]`;
    single-quoted key → `[]`; bare `@`-key rejected → line 2 non-mapping message;
    `none` bump → `[]`).
  - **CLI smoke layer:** locate the validator via
    `VALIDATOR_PATH = fileURLToPath(new URL("../validate-changesets.mjs", import.meta.url))`
    and run it with
    `spawnSync(process.execPath, [VALIDATOR_PATH], { cwd: tmpDir, encoding: "utf8" })`.
    The throwaway tmpdir fixture must contain **both** a `package.json` (with
    `name` and `version`) and a `.changeset/` dir. Assert: a bad changeset →
    exit `1`, stderr matches `/\.changeset\/[^:]+:\d+: invalid bump/`, stdout
    `=== ""`; a good changeset → exit `0`, stderr `=== ""`.
- **Depends on:** Task 4 (the module under test) and Task 2 (the `test` script
  and a working `npm ci`).
- **Traces to:** Design §7; R12; AC6, AC7, AC8.
- **Acceptance:**
  - `npm test` discovers and runs this suite alongside `sync-version.test.mjs`,
    and all tests pass.
  - The suite uses only `node:test`/`node:assert/strict` and built-in `node:`
    modules — it does not import `tsx` or any YAML library.
  - The suite covers every row of the R12/§7 matrix (valid minor; canonical empty
    with and without trailing newline; missing closing fence; invalid bump; wrong
    package; empty body; pre-1.0 `major` rejection; `major` accepted at `1.0.0`;
    CRLF accepted; double- and single-quoted keys; bare `@`-key rejected; `none`
    bump) plus the CLI fail/pass smoke cases.

### Task 6: Add the PR-time changeset gate workflow `.github/workflows/changeset-gate.yml`

- **Goal:** On pull requests targeting `trunk`, run the shape validator and the
  changeset presence check (two independent fail-fast steps), while exempting the
  auto-generated Version Packages PR.
- **Files to change:** `.github/workflows/changeset-gate.yml` (new).
- **Changes:** Author the workflow exactly per design §3:
  - `name: Changeset Gate`.
  - Trigger: `on: pull_request: branches: [trunk]` with **no** explicit `types:`
    (the default opened/synchronize/reopened is correct).
  - `permissions: { contents: read, pull-requests: read }` — read-only; no write
    scope, no `id-token`.
  - `concurrency: { group: changeset-gate-${{ github.head_ref || github.ref }},
    cancel-in-progress: true }`.
  - One job `changeset`, `runs-on: ubuntu-latest`, with the **job-level**
    bot-PR exemption `if: github.head_ref != 'changeset-release/trunk'` (the
    auto-generated Version PR's head branch). A job skipped by this `if:` reports
    status "Success", which keeps it safe if the gate later becomes a required
    check.
  - Steps in order: `actions/checkout@v6` with `fetch-depth: 0` (needed so
    `origin/<base>` is present for `--since`); `actions/setup-node@v6` with
    `node-version: 22` and `cache: npm`; `npm ci`; `npm test`; a "Validate
    changeset shape" step running `node scripts/validate-changesets.mjs`
    (shape check **first**); a "Require a changeset for release-relevant changes"
    step running
    `npx changeset status --since=origin/${{ github.event.pull_request.base.ref }}`
    (presence check second). Both `run:` steps use the default
    `continue-on-error: false`.
- **Depends on:** Task 2 (npm ci/test), Task 3 (`changedFilePatterns` +
  `privatePackages.version: true` make the presence check meaningful), Task 4
  (the validator script the shape step invokes), Task 5 (so `npm test` passes in
  the gate).
- **Traces to:** Design §3 / D2.1–D2.5, J5; R5, R6, R7, R8, R9; AC3, AC4, AC5,
  AC6, AC7, AC12.
- **Acceptance:**
  - The workflow triggers only on `pull_request` to `trunk`, requests only
    `contents: read` + `pull-requests: read`, and requests no `id-token`.
  - It runs `node scripts/validate-changesets.mjs` before
    `npx changeset status --since=origin/<base.ref>`, after `npm ci` and
    `npm test`, with `fetch-depth: 0`.
  - The job carries `if: github.head_ref != 'changeset-release/trunk'` so the
    Version Packages PR is exempt (and other PRs, e.g. Dependabot, are not).
  - The YAML is valid and parses (e.g. `actionlint`/GitHub accepts it).

### Task 7: Add the post-merge release workflow `.github/workflows/release.yml`

- **Goal:** On pushes to `trunk` (and manual dispatch), run
  `changesets/action@v1` to open/update the Version Packages PR with the existing
  `release:version` step, and — once a human merges that PR — create the
  `v<version>` git tag and the GitHub Release, using only the default workflow
  token and no OIDC.
- **Files to change:** `.github/workflows/release.yml` (new).
- **Changes:** Author the workflow exactly per design §4:
  - `name: Release`.
  - Triggers: `on: push: branches: [trunk]` (shipped **live** from this PR) plus
    `workflow_dispatch: {}`.
  - `permissions: { contents: write, pull-requests: write }` — enough to push the
    bump commit to `changeset-release/trunk`, push the tag, create the Release,
    and open/update the Version PR. **No `id-token: write`**, no `issues: write`.
  - `concurrency: ${{ github.workflow }}-${{ github.ref }}` with **no**
    `cancel-in-progress` (never cancel a release mid-flight).
  - One job `release`, `runs-on: ubuntu-latest`, steps in order:
    `actions/checkout@v6` with `fetch-depth: 0`; `actions/setup-node@v6` with
    `node-version: 22` and `cache: npm`; `npm ci`; `npm test`; then a step with
    `id: changesets` `uses: changesets/action@v1` and `with: { version: npm run
    release:version, publish: npx changeset tag }` and
    `env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }`.
  - `version:` **must** be `npm run release:version` (not the action default
    `changeset version`) so `sync-version.mjs` still runs (R3/J6). `publish:`
    **must** be `npx changeset tag` — **never** `changeset publish` (invariant
    J3); `changeset tag` creates the `v<version>` tag and the action then creates
    the Release. Leave `createGithubReleases` at its default `true` (setting it
    `false` would also suppress the tag push). Do not add any npm publish step.
- **Depends on:** Task 2 (npm ci/test, changelog-github installed), Task 3
  (`privatePackages.tag: true` to tag the private package, `changelog` tuple for
  rich entries), Task 5 (so `npm test` passes on the release path). Independent
  of Task 6 but sequence after it to avoid touching `.github/workflows/`
  concurrently.
- **Traces to:** Design §4 / D1.1–D1.6, §5.1, J2, J3, J5, J6, DC1, ST2; R1, R2,
  R3, R13, R14, R15, R16, R17; AC1, AC2, AC9, AC10, AC11, AC17.
- **Acceptance:**
  - The workflow triggers on `push` to `trunk` and on `workflow_dispatch`,
    requests `contents: write` + `pull-requests: write` only, and requests no
    `id-token`.
  - It runs `npm ci` and `npm test`, then `changesets/action@v1` with
    `version: npm run release:version` and `publish: npx changeset tag`, passing
    `secrets.GITHUB_TOKEN` via `env`.
  - Concurrency is `${{ github.workflow }}-${{ github.ref }}` with no
    `cancel-in-progress`.
  - No step performs an npm publish; `changeset publish` does not appear anywhere
    in the file.
  - The YAML is valid and parses.
