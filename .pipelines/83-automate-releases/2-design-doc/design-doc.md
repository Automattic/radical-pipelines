# Design Doc — Automate releases with GitHub Actions (changeset gate + release workflow)

This document is the authoritative architecture and concrete design for GitHub
issue 83. It is self-contained: a reader does not need to open
`design-doc-research.md`. It satisfies `1-spec/spec.md` (R1–R22, acceptance
criteria 1–17, N1–N5) and carries the load-bearing invariants J1–J7.

The work adds CI-driven release automation on top of the repository's existing
changeset foundation (`.changeset/config.json`, `@changesets/cli`, and
`release:version = changeset version && node scripts/sync-version.mjs`). The
package `@automattic/radical-pipelines` is `private` and consumed directly from
git source (a Pi package and a Claude Code plugin served from the repo root). It
is **not** published to npm. The entire design therefore contains no npm
publish and no npm OIDC/trusted-publishing of any kind — only git tags and
GitHub Releases.

---

## 1. Architecture overview

Two GitHub Actions workflows, partitioned cleanly by event type, plus a config
change and a dependency-free validator:

1. **PR time — `changeset-gate.yml`** (`on: pull_request: [trunk]`). Runs two
   independent, fail-fast checks: a dependency-free **shape** validator
   (`node scripts/validate-changesets.mjs`) and a **presence** check
   (`npx changeset status --since=origin/<base>`). The auto-generated Version
   Packages PR (head branch `changeset-release/trunk`) is exempted by a
   job-level `if:`.

2. **Post-merge to trunk — `release.yml`** (`on: push: [trunk]` +
   `workflow_dispatch`). Runs `changesets/action@v1` with
   `version: npm run release:version` and `publish: npx changeset tag`. With
   pending changesets it opens/updates the "Version Packages" PR (bump +
   `CHANGELOG.md` + sync to `.claude-plugin/plugin.json`). When a human merges
   that PR (changesets consumed), the next push runs `changeset tag`, which
   creates the `v<version>` git tag; the action then creates the GitHub Release
   with the `## <version>` changelog entry as its body. Idempotent: a no-op if
   the tag already exists.

3. **Anti-recursion.** Only the default `secrets.GITHUB_TOKEN` is used. Bot
   pushes (the bump commit, the tag push) do **not** re-trigger workflows; the
   **human** merge of the Version PR is what advances the flow to the
   tag/Release step. The action never auto-merges. No loop, no PAT, no GitHub
   App.

No npm publish, no OIDC `id-token`, anywhere.

### End-to-end flow

```
Contributor PR ──► changeset-gate.yml ──► shape OK + presence OK (or fails)
       │
       ▼ (merge to trunk = push event)
   release.yml ──► changesets/action ──► opens/updates "Version Packages" PR
                                          (changeset version + sync-version)
       │
       ▼ (maintainer MERGES Version PR = human push)
   release.yml ──► changeset tag ──► creates tag v<version>
                                ──► action creates GitHub Release
                                    (body = ## <version> CHANGELOG entry)
```

The gate and the release workflow never both fire on a single event: a PR
*open/sync* fires only the gate; a PR *merge* is a push and fires only
`release.yml`; the gate does not run on merges.

---

## 2. File inventory

**New files**
- `.github/workflows/changeset-gate.yml` (§3)
- `.github/workflows/release.yml` (§4)
- `scripts/validate-changesets.mjs` — dependency-free ESM validator (§6),
  mirroring the export + `isMainModule()` shape of `scripts/sync-version.mjs`.
- `scripts/test/validate-changesets.test.mjs` — `node:test` suite (§7),
  mirroring `scripts/test/sync-version.test.mjs`.
- `CONTRIBUTING.md` — slim, no-npm contributor/maintainer mechanics (§8). Its
  `## Pre-1.0 policy` heading must slug to `#pre-10-policy` (invariant J7).

**Edited files**
- `.changeset/config.json` — three deltas only (§5).
- `package.json` — add `@changesets/changelog-github` devDep + a `test` script
  (§5.2). The `release:version` string is **unchanged**.
- `package-lock.json` — resync (`npm install`) to fix pre-existing drift and
  absorb the new devDep so `npm ci` passes in CI (§5.3).
- `.gitignore` — add `.env` (and `.env.local`) (§5.4).
- `README.md` "## Changelog and versioning" (§8).
- `.changeset/README.md` — the stale "no git tags / no release CI" sentence (§8).
- `AGENTS.md` — repoint the changeset pointer to CONTRIBUTING (§8).

**Untouched (explicitly)**
- `scripts/sync-version.mjs` and its `TARGET_MANIFESTS =
  [".claude-plugin/plugin.json"]` (R3/N2/J6).
- `scripts/test/sync-version.test.mjs`.
- `.github/workflows/deploy-website.yml` (the existing Pages workflow; **not** a
  model for release permissions — it has `id-token: write` for Pages only).
- `.claude-plugin/*` (the sync target, written by `sync-version.mjs`, not by
  this work directly).
- The two pending `.changeset/*.md` files — consumed by the first release, not
  edited.

---

## 3. `changeset-gate.yml`

```yaml
name: Changeset Gate
on:
  pull_request:
    branches: [trunk]
permissions:
  contents: read
  pull-requests: read
concurrency:
  group: changeset-gate-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
jobs:
  changeset:
    runs-on: ubuntu-latest
    if: github.head_ref != 'changeset-release/trunk'   # bot-PR exemption
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - name: Validate changeset shape
        run: node scripts/validate-changesets.mjs
      - name: Require a changeset for release-relevant changes
        run: npx changeset status --since=origin/${{ github.event.pull_request.base.ref }}
```

**Trigger (D2.1).** `pull_request` with `branches: [trunk]`, **no** explicit
`types:` — the default (opened/synchronize/reopened) is exactly right; adding
`types:` risks narrowing it.

**Permissions (D2.2).** `contents: read` + `pull-requests: read` only.
`changeset status` makes **no** GitHub API calls (it is pure local git +
filesystem, via `@changesets/git`'s `getChangedPackagesSinceRef`), and the
validator is pure local Node. The job's own pass/fail is its check-run
conclusion; no write scope is needed. (Write scope is release-only.)

**Concurrency (D2.3).** `cancel-in-progress: true` — the **opposite** of the
release workflow. A superseded PR check is disposable, so cancelling is correct
here.

**Steps (D2.4).**
1. `actions/checkout@v6` with **`fetch-depth: 0`** — required. checkout@v6 at
   full depth fetches all history **and** all remote refs, so
   `origin/<base.ref>` is present for `--since`; no extra `git fetch` step is
   needed (empirically confirmed).
2. `actions/setup-node@v6`, node 22, `cache: npm` (resolves the root
   `package-lock.json`; no `cache-dependency-path` needed).
3. `npm ci` — **required**: the presence step runs `npx changeset status`, which
   needs `@changesets/cli` installed from the lockfile. (The validator itself is
   dependency-free and runs via `node …`, not `npx`, so it needs no install of
   its own.)
4. `npm test` — runs the `node:test` suites (sync-version + the new validator).
   See §4 rationale; run in **both** gate and release.
5. **Shape check first**, then **presence check** — fail-fast, two independent
   `run:` steps with the default `continue-on-error: false`. A malformed
   changeset is the more fundamental error, so it is checked first; if it fails,
   the presence step is skipped, which still satisfies R6 ("fails if either
   fails"). No aggregation/`continue-on-error` machinery: shape errors and
   missing-changeset errors are effectively mutually exclusive (a malformed
   changeset still counts as "present"), so the "report both at once" UX gain
   does not justify the complexity.

**`--since` resolution (verified).** A real git-sandbox run of `npx changeset
status --since=origin/trunk` under `fetch-depth: 0` confirmed the four
gate-relevant outcomes: a release-relevant change with no changeset → exit 1
(AC3); an internal-only change → exit 0 (AC4); a `package-lock.json`-only change
→ exit 0 because the anchored `package.json` pattern does not match the lockfile
(AC5); a release-relevant change **with** a valid changeset → exit 0 (AC7).

**Bot-PR exemption (D2.5, resolves R9 and unblocks DC6).** The job-level
`if: github.head_ref != 'changeset-release/trunk'` skips the gate for the
auto-generated Version Packages PR.
- `github.head_ref` is populated on `pull_request` events (the only trigger
  here), so the condition is reliable.
- The Version PR head branch is `changeset-release/trunk` — confirmed in the
  action's `runVersion`: `versionBranch = `changeset-release/${branch}``, with
  `branch` derived from `refs/heads/trunk` → `trunk`.
- **Job-level `if:` is required-check-safe.** GitHub's "Troubleshooting required
  status checks" doc states that a job skipped due to a conditional **reports its
  status as "Success."** The infamous stays-Pending-and-blocks gotcha applies
  only to **workflow-level** (`on:`) path/branch filters, not to a job `if:`.
  Putting the exemption on the job (not the steps) therefore means the skipped
  Version-PR run reports Success and would not block the check even if/when the
  gate becomes a required status check. This is why DC6 carries no hidden
  blocker. The exemption is scoped to the release branch only; other automated
  PRs (e.g. Dependabot) remain gated.

---

## 4. `release.yml`

```yaml
name: Release
on:
  push:
    branches: [trunk]
  workflow_dispatch: {}
permissions:
  contents: write        # push bump commit to changeset-release/trunk; push tag; create Release
  pull-requests: write   # open/update the Version Packages PR
concurrency: ${{ github.workflow }}-${{ github.ref }}
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - id: changesets
        uses: changesets/action@v1
        with:
          version: npm run release:version   # MUST override default to keep sync-version (R3)
          publish: npx changeset tag         # creates v<version> tag; action then creates the Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Triggers (D1.1).** `push: branches: [trunk]` (shipped **live** from this PR,
satisfying R1/R16's "driven by CI") plus `workflow_dispatch: {}` for manual
runs. Shipping the live trigger is safe: the worst first-merge case is a
harmless, human-reviewed Version Packages PR — there is no irreversible external
side-effect (unlike a workflow that does an npm publish). `workflow_dispatch`
fires only on a human click, so it cannot loop and is irrelevant to
anti-recursion.

**Concurrency (D1.2).** Bare `${{ github.workflow }}-${{ github.ref }}`, **no
`cancel-in-progress`** — serialize, never cancel a release mid-flight.
Cancelling between the tag push and the Release creation could leave an orphan
tag with no Release.

**Permissions (D1.3, invariant J5).** `contents: write` (push the bump commit to
`changeset-release/trunk`, push the tag, create the Release) + `pull-requests:
write` (open/update the Version PR). **No `id-token: write`** (R2/R15 forbid
OIDC). No `issues: write` (the action opens no issues; the Version PR body is
covered by `pull-requests: write`).

**Job steps (D1.4).** checkout@v6 (fetch-depth 0, needed for changeset history
and tag operations) → setup-node@v6 (node 22, `cache: npm`) → `npm ci` →
`npm test` → `changesets/action@v1`. The two scripts skillsmith runs but this
repo lacks (`npm run lint`, `npm run typecheck`) are **dropped** — they would
hard-fail. `npm test` is **included** here and in the gate: the only
release-time code paths are `release:version` (changeset version +
sync-version) and `changeset tag`, and the sync-version + validator tests guard
exactly that correctness. The Version-PR-merge commit is not otherwise
gate-checked (trunk is unprotected), so running the tests on the release path is
cheap insurance.

**Action wiring (D1.5).**
- `version: npm run release:version` — **must** override the action's default
  `changeset version`, because `release:version` also runs `sync-version.mjs`
  (the default would skip it and break R3/J6).
- `publish: npx changeset tag` — **never** `changeset publish` (invariant J3).
  `changeset tag` creates the git tag only; the action then creates the GitHub
  Release. No registry publish is involved.
- `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` at the step level. This is
  load-bearing for R18/R22 (see §5.1 changelog-github): the action reads
  `process.env.GITHUB_TOKEN` and injects it into **both** subprocesses — its
  `runVersion` builds `env = { ...process.env, GITHUB_TOKEN }` and execs the
  version script with it, and `runPublish` does the same. So
  `changelog-github`/`get-github-info` sees the token during the **version**
  step in CI with zero extra wiring; the CI cost of richer changelogs is zero
  and the first run has a token present.
- `createGithubReleases` is left at its default `true` (R14). Setting it `false`
  also suppresses the tag push (changesets/action#547), so it must stay default.

**Tag name = `v<version>` (D1.6, resolves DC1; corrects spec N5 — see §10).**
This is a **bare single-package repo**: no `workspaces` field, no
`pnpm-workspace.yaml`/`lerna.json`/`rush.json`. Both `changeset tag` and the
action's `runPublish` compute the tag as
`tool !== "root" ? `${name}@${ver}` : `v${ver}``, where `tool` comes from
`@manypkg/get-packages`. For a bare repo manypkg reports `tool === "root"`, so
the tag is the **plain `v<version>`** form (e.g. `v0.2.0`), not the scoped
`@automattic/radical-pipelines@<version>` form. This was verified empirically: a
sandbox mirroring this repo's config printed `🦋  New tag:  v0.2.0` and created
git tag `v0.2.0`. The action's root branch independently sets `tagName =
`v${version}`` and calls `createRelease({ name: tagName, tag_name: tagName })`,
reading the `## <version>` entry from `CHANGELOG.md` via `getChangelogEntry` as
the body. We accept this default — no custom config, no `gh release create` — so
N5's intent ("don't do custom tag naming") holds even though its prose is wrong.

**Idempotency (R14).** The action creates the Release only when `changeset tag`
emits a fresh `New tag:` line. A re-run on a state where the tag already exists
produced no output, exit 0, and no duplicate tag/Release in the sandbox.
**Edge:** if a tag exists but its Release somehow does not, re-running the
workflow will **not** backfill the Release; recovery is a manual
`gh release create v<version> --notes-file <entry>` (documented in §8).

---

## 5. Configuration and package changes

### 5.1 `.changeset/config.json` (D4.1) — three deltas only

Everything else stays byte-identical (notably `commit: false`, `access:
"restricted"`, and the `$schema` pin at `@changesets/config@3.1.4`, which already
defines both `changedFilePatterns` and `privatePackages`, so no `$schema` bump).

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "Automattic/radical-pipelines" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "trunk",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "prettier": false,
  "privatePackages": { "version": true, "tag": true },
  "changedFilePatterns": ["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]
}
```

The three deltas:
1. **`changelog`** → the `@changesets/changelog-github` tuple with the required
   `repo` (DC5 / R18).
2. **`privatePackages.tag`** `false` → `true` (R14: tag the private package).
3. **add `changedFilePatterns`** = the R8 allowlist.

**Why this is correct and the gate actually enforces (R7/R8, invariants
J1/J2).**
- `privatePackages.version: true` is **kept** — `changeset status`/`version`
  read `allowPrivatePackages = config.privatePackages.version`. With it `false`
  the gate would be blind (it would exit 0 on an unaccompanied release-relevant
  change). It must stay `true`.
- `privatePackages.tag: true` is read **only** by `changeset tag`
  (`allowPrivatePackages = config.privatePackages.tag`); it is orthogonal to the
  gate and the bump.
- **Mutual reinforcement:** the `@changesets/config` schema forbids
  `tag:true + version:false` (it throws at config load:
  "`privatePackages.tag` is `true` but `privatePackages.version` is `false`").
  Because R14 forces `tag:true`, setting it **mechanically guarantees**
  `version:true`. The gate cannot be silently disabled by flipping `version`
  false: that either also disables releases (obvious) or hard-errors at config
  load.
- `changedFilePatterns` is the R8 release-relevant allowlist. The `package.json`
  entry is **anchored** (matches only the root `package.json`), so
  `package-lock.json` and nested `package.json` files do not trip the presence
  check (AC5). `@changesets/cli@2.31.0` honors both `changedFilePatterns` and
  `privatePackages.tag` — no CLI bump needed.
- `commit: false` is **kept** and is correct: with it, `changeset version` does
  not git-commit ("All files have been updated. Review them and commit at your
  leisure"); the action handles commit/push to `changeset-release/trunk`.
  `commit: true` would fight the action.

**changelog-github adoption (D4.2 / DC5 / R18).** Add devDep
`"@changesets/changelog-github": "^0.7.0"` (it pulls
`@changesets/get-github-info` and `dotenv` transitively — no separate devDeps).
The `repo` field is **required** (omitting it throws). The richer entries (PR
links, commit links, author attribution) also enrich the GitHub Release bodies.
- **Local-token cost (documented, R18/R20/R22).** Running `changeset version`
  **locally** without `GITHUB_TOKEN` throws and escapes cleanly (no files
  changed). So the manual escape hatch and any local `release:version` need a
  token. `changelog-github` calls `dotenv.config()` at module load, so a
  gitignored `.env` with `GITHUB_TOKEN=…` works. Scope guidance for docs: this
  is a **private** repo, so a classic PAT needs `repo` + `read:user` (the
  `repo:status`-only form is for public repos and cannot read private
  content); a fine-grained PAT scoped to the repo needs Contents:Read + Pull
  requests:Read + Metadata:Read. **CI cost is zero** — the action injects
  `secrets.GITHUB_TOKEN` into the version subprocess.

### 5.2 `package.json`

Add the changelog-github devDep (above) and a `test` script. The
`release:version` string stays **exactly** `changeset version && node
scripts/sync-version.mjs` (R3/N2/AC2/J6 — sync-version is untouched).

**Test script (D6.4, final form):**
```json
"test": "node --test 'scripts/test/**/*.test.mjs'"
```
The quoted, node-expanded recursive glob is required. Empirically on node 22:
`node --test scripts/test/` fails with `MODULE_NOT_FOUND` (node 22 treats the
positional as a module specifier, not a discovery directory); the bare
`node --test` form runs anything in a `test/` dir (it would execute non-test
helpers). The explicit `*.test.mjs` glob restricts to the two intended files
(sync-version + validator) and is portable without relying on shell globbing.
`npm test` is invoked by both the gate (§3) and release (§4).

### 5.3 `package-lock.json` (D1.8)

`npm ci` currently **fails** in this worktree due to pre-existing lockfile drift
(`@types/node@12.20.55` locked vs `@types/node@25.9.1` resolved). Both workflows
run `npm ci`, so the plan/code phase **must** resync the lockfile (`npm
install`), which also absorbs the new `@changesets/changelog-github` devDep.

### 5.4 `.gitignore` (D4.3)

Currently `.gitignore` contains only `node_modules/`. Add `.env` (and
`.env.local`) so a maintainer's local token file cannot be committed.

---

## 6. Shape validator — `scripts/validate-changesets.mjs`

Dependency-free Node ESM, built-in modules only (`node:fs`), mirroring the
export + `isMainModule()` shape of `scripts/sync-version.mjs` (R10, invariant
J4 — no `tsx`, no `yaml` parser).

### 6.1 Front-matter fence (D3.1)

```js
const FENCE_RE = /^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/;
```
Group 1 = front matter, group 2 = body. Verified captures: a normal changeset →
g1=`"@…": minor`, g2=`\nBody.\n`; the canonical empty `---\n---\n` → g1=`""`,
g2=`""`; no-trailing-newline `---\n---` → g1=`""`, g2=`""` (the `---\r?\n?` makes
the final newline optional); CRLF input → g1/g2 with `\r\n`. Both empty forms
trim to `""`, so the canonical empty changeset is accepted (R11 step 2).

### 6.2 Dependency-free front-matter parser (D3.2)

No YAML library. Parse line-by-line over the front-matter block; a single entry
regex:

```js
const ENTRY_RE = /^\s*(?:"([^"]+)"|'([^']+)'|([^@`!&*?|>%#"'\s][^:#\s]*))\s*:\s*(\S+)\s*$/;
```
- alt 1: double-quoted key (what `@changesets/write` always emits, e.g.
  `"@automattic/radical-pipelines": minor`)
- alt 2: single-quoted key
- alt 3: a **legal bare** key — its first char excludes the YAML reserved
  indicators ``@ ` ! & * ? | > % # " '`` and whitespace
- group 4: the bump value

**Non-mapping detection without a parser (R11 step 4):** skip blank lines; if
**any** non-blank line fails `ENTRY_RE`, or if **no** entries are found at all,
reject the whole front matter as non-mapping (reported at line 2). This
correctly rejects a YAML list (`- foo`), a bare scalar (`just text`), malformed
lines, and a bare `@`-key; it accepts one or more legal `key: bump` lines.
Multiple entries are collected into a `{name: bump}` map and validated
independently.

### 6.3 The bare-`@`-key correction (D3.3 — see ST1 in §10)

A **bare unquoted `@`-scoped key** (e.g. `@automattic/radical-pipelines: minor`
without quotes) is **invalid YAML** and **must be rejected**. YAML reserves `@`
as an indicator character, so a plain scalar cannot start with it. Both real
parsers — the `yaml` lib and `@changesets/parse` (js-yaml, used by `changeset
status`/`version`) — throw on it ("Plain value cannot start with reserved
character @" / "invalid YAML in frontmatter"), and a `.changeset/*.md` with a
bare `@`-key makes real `changeset version`/`status` choke. The validator
therefore:
- **accepts** the double-quoted key (alt 1) and the single-quoted key (alt 2),
- **rejects** a bare `@`-key as non-mapping (it fails `ENTRY_RE`'s bare alt,
  whose first-char class excludes `@`).

This matches exactly what the release pipeline can consume. A "bare key
accepted" positive case is only possible with a non-`@` name, which then fails
the unknown-package check anyway. A 16-input parity run against skillsmith's
`yaml`-based logic produced identical accept/reject + identical error line on
every case, so the dependency-free port is behaviorally equivalent.

### 6.4 Check order, messages, line numbers (D3.4)

`validateChangesetFile(file, raw, pkgName, version)` runs these in order and
returns `Err[]` (`Err = {file, line, msg}`):

1. **Fence missing/unterminated** → line 1:
   `"missing or unterminated front matter (expected two '---' fences)"`
   (early return).
2. **Canonical empty** (`g1.trim() === "" && g2.trim() === ""`) → valid, return
   `[]`.
3. **Empty body** (`g2.trim() === ""` but front matter present) → line 4:
   `"empty body (changeset has front matter but no summary)"`. Line 4 is the
   canonical body line (1=`---`, 2=front matter, 3=`---`, 4=body) — a literal,
   not computed.
4. **Non-mapping** (per §6.2) → line 2:
   `"front matter must be a YAML mapping of package name to bump"` (early
   return). *(Adaptation from skillsmith: it has two line-2 paths — a YAML throw
   and a parsed-but-not-object case; with no YAML lib we collapse them into this
   single message.)*
5. **Per entry** (line 2 each):
   - **unknown name** → `unknown package "<name>" (expected
     "@automattic/radical-pipelines")`.
   - **invalid bump** → `invalid bump "<bump>" (expected one of patch, minor,
     major, none)`. Valid bump set: `{patch, minor, major, none}`.
   - **pre-1.0 major** (the `version` starts with `0.` **and** bump is
     `"major"`) →
     `'major' is forbidden while pre-1.0 (version=<version>). Use 'minor' with a
     'BREAKING:' prefix; see CONTRIBUTING.md#pre-10-policy.`

The expected package name is `@automattic/radical-pipelines`. The pre-1.0 guard
is active whenever `version` starts with `0.`. The anchor string
`CONTRIBUTING.md#pre-10-policy` is load-bearing: it must match the
`## Pre-1.0 policy` heading in `CONTRIBUTING.md` (invariant J7 / §8).

### 6.5 CLI `main()` and export surface (D3.5, D3.6)

Mirrors `sync-version.mjs`:
- `export function validateChangesetFile(file, raw, pkgName, version) → Err[]` —
  the unit-test contract.
- `export function main() → 0 | 1` — reads `{name, version}` from the CWD
  `package.json`; enumerates changesets via
  `readdirSync(".changeset").filter(n => n.endsWith(".md") && n !==
  "README.md")` (the `.changeset/README.md` cheat-sheet is excluded); validates
  each; prints `.changeset/<file>:<line>: <msg>` per error to **stderr**;
  returns 1 if any errors else 0; writes nothing to stdout.
- `isMainModule()` copying sync-version.mjs's
  `realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])`
  form (handles macOS symlinked tmpdirs that the CLI smoke test relies on); when
  run directly → `process.exit(main())`.

Reading `version` from `package.json` lets fixtures toggle `0.1.0` vs `1.0.0` to
exercise the pre-1.0 guard.

---

## 7. Validator tests — `scripts/test/validate-changesets.test.mjs`

`node:test` (`describe`/`test`/`beforeEach`/`afterEach`) + `node:assert/strict`,
mirroring `sync-version.test.mjs` (R12). Two layers:

**Unit cases** — import the pure `validateChangesetFile(file, raw, pkgName,
version)` and assert the returned `Err[]`:

| Case | Input | Expected |
|---|---|---|
| B1 valid minor | double-quoted key, `minor`, non-empty body | `[]` |
| B2a canonical empty (trailing newline) | `---\n---\n` | `[]` |
| B2b canonical empty (no trailing newline) | `---\n---` | `[]` |
| B3 missing closing fence | front matter, no second `---` | err line 1 "missing or unterminated front matter" |
| B4 invalid bump | `"…": superminor` | err line 2 `invalid bump "superminor"` |
| B5 wrong package | `"some-other-package": minor` | err line 2 `unknown package "some-other-package"` + `expected "@automattic/radical-pipelines"` |
| B6 empty body | front matter present, blank body | err line 4 "empty body" |
| B7a pre-1.0 major | `major` at version `0.1.0` | err line 2 "'major' is forbidden while pre-1.0" + `#pre-10-policy` anchor |
| B7b major at 1.0.0 | `major` at version `1.0.0` | `[]` |
| CRLF | a valid changeset with `\r\n` line endings | `[]` |
| KEYS double-quoted | `"@…": minor` | `[]` |
| KEYS single-quoted | `'@…': minor` | `[]` |
| **KEYS bare-`@` rejected** | `@automattic/radical-pipelines: minor` (unquoted) | err line 2 "front matter must be a YAML mapping…" |
| `none` bump | `"…": none` | `[]` |
| (optional) non-mapping list/scalar | `- foo` / `just text` | err line 2 |

**CLI smoke** — spawn the actual `.mjs` (no `tsx`):
`spawnSync(process.execPath, [VALIDATOR_PATH], { cwd: tmpDir, encoding:
"utf8" })`, where `VALIDATOR_PATH = fileURLToPath(new
URL("../validate-changesets.mjs", import.meta.url))`. The tmpdir fixture needs
**both** a `package.json` (name + version) and a `.changeset/` dir.
- **Fail case** (a bad changeset) → exit 1, stderr matches
  `/\.changeset\/[^:]+:\d+: invalid bump/`, stdout `=== ""`.
- **Pass case** (a good changeset) → exit 0, stderr `=== ""`.

This covers R12 and acceptance criteria 6, 7, 8 (and feeds AC2/AC10 indirectly
via the release path running `npm test`).

---

## 8. Documentation surface

Three existing surfaces currently assert "no git tags / no release CI" and must
all be reconciled; a new `CONTRIBUTING.md` becomes the authoritative home for
mechanics.

### 8.1 New `CONTRIBUTING.md` (D5.1 / DC2 / R20) — slim, no-npm

Outline (all npm sections from the skillsmith model **dropped** — no manual
publish, no rollback/unpublish/dist-tag, no `npm publish --dry-run`, no npm
trusted-publisher prereq):

- `# Contributing`
- `## Running tests and checks locally` — just `npm test`.
- `## Versioning policy`
- `## Adding a changeset`
  - `### When a changeset is required` — the `changedFilePatterns` allowlist
    (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`,
    `README.md`) and the exclusions (`website/**`, `scripts/**`, `.pi/`, `.rp/`,
    `.changeset/`, `.github/`, meta files).
  - `### Bump types` — the authoritative bump table (lives only here).
  - `### Pre-1.0 policy` — **must be titled exactly "Pre-1.0 policy"** so GitHub
    slugs it to `#pre-10-policy`, matching the validator's message (invariant
    J7). While `version` starts `0.`: a breaking change is recorded as `minor`
    with a `BREAKING:` summary prefix (never `major` — the validator
    hard-rejects pre-1.0 `major`); features → `minor`; fixes → `patch`; `major`
    is reserved for the deliberate `1.0.0` cut (a maintainer hand-writes the
    1.0.0 entry and removes the guard). (D5.8)
  - `### How to add a changeset`
  - `### Empty changesets` — `npx changeset --empty` for prose-only edits to an
    otherwise release-relevant file (e.g. a `README.md` typo fix). It writes
    `---\n---\n`, which the validator accepts as canonical-empty and `changeset
    version` consumes without bumping. (DC3 / D5.3)
  - `### Summary format conventions` — pin the `BREAKING:` prefix convention.
  - `### What this looks like in CHANGELOG.md` — the changelog-github enriched
    form (PR/commit links + author).
- `## Release process` — Version Packages PR → maintainer merge → CI tags
  `v<version>` + GitHub Release; **no npm**.
- `## Manual release escape hatch` (no-npm, §8.4).
- `## "I forgot a changeset" recovery`.
- `## Re-running a failed release` — re-run the job; `changeset tag` is
  idempotent; **plus** the edge note: re-running will **not** backfill a missing
  Release for an already-existing tag — recovery is `gh release create
  v<version> --notes-file <entry>`.
- `## Dependency-bump PRs` — Dependabot stays gated.
- `## Repo configuration prerequisites` (§8.5).

### 8.2 README "## Changelog and versioning" (D5.4 / D5.7 / R19)

- Rewrite the "### Cutting a version" body (currently "operator-run local
  action, not CI") to the CI flow: changesets → Version Packages PR → maintainer
  merge → CI `v<version>` tag + GitHub Release; the manual hatch lives in
  CONTRIBUTING.
- Rewrite the "no `npm publish`, no git tags, and no release CI" line: **keep**
  the no-npm claim, **delete** "no git tags, and no release CI", and state that
  releases now produce a `v<version>` tag + GitHub Release via CI.
- Adjust "How consumers get new versions" to add the tag/Release while keeping
  the direct-from-git point.
- Reframe the two `release:version` steps as "what the Version Packages PR runs
  in CI" and add the R18 local-token note.
- Shrink "### Adding a changeset" to a CONTRIBUTING pointer (avoid duplication).

### 8.3 `.changeset/README.md` and `AGENTS.md` (D5.7)

- `.changeset/README.md` — this is the changesets cheat-sheet, created once by
  `changeset init` and **not** regenerated by `changeset version`; it has been
  hand-customized here, so editing it is safe and won't be clobbered. Rewrite the
  stale line ("no registry publish, no git tags, and no release CI: a maintainer
  runs the version step locally") to: no registry publish (the package is
  private), **but** releases are CI-driven — merging the Version Packages PR
  creates a `v<version>` git tag and a GitHub Release; cross-link the README
  section and CONTRIBUTING. Leave the upstream boilerplate untouched.
- `AGENTS.md` — the rule text stays accurate; change **only** the pointer to
  `[CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset)`
  (optionally also point the bump rule at `#pre-10-policy`).

### 8.4 Manual no-npm release escape hatch (D5.5 / R20)

Produces the **same** `v<version>` tag + changelog-bodied Release as CI:

```bash
# 0. On trunk, clean tree, gh authenticated; GITHUB_TOKEN set (changelog-github throws without it).
git checkout trunk && git pull --ff-only
npm ci
export GITHUB_TOKEN=<PAT>            # private repo: repo + read:user — or a gitignored .env (dotenv)
# 1. Consume changesets: bump, regenerate CHANGELOG, sync plugin.json.
npm run release:version             # inspect; `git restore .` to abort
# 2. Commit the bump (config commit:false → manual).
git commit -am "Version Packages" && git push origin trunk
# 3. Create the tag (idempotent; no-op if it exists).
npx changeset tag
git push origin "v$(node -p "require('./package.json').version")"   # or git push --tags
# 4. Create the GitHub Release with the latest changelog entry as the body.
gh release create "v$(node -p "require('./package.json').version")" \
  --title "v$(node -p "require('./package.json').version")" \
  --notes-file <(extract the top "## <version>" section of CHANGELOG.md)
```

No npm anywhere. Document that the body should ideally be just the top
`## <version>` section to match CI's per-version body.

### 8.5 Maintainer prerequisites (D5.6 / R21) — document, do not enforce (N3)

- **Bucket 1 (verify enabled; currently satisfied):** "Allow GitHub Actions to
  create and approve pull requests" is **currently enabled**
  (`default_workflow_permissions=write`,
  `can_approve_pull_request_reviews=true`); phrase as "Verify this is enabled
  (currently satisfied)" — not "off by default / enable it". The bot can push the
  release branch because trunk is currently unprotected (no allowance needed
  today).
- **Bucket 2 (must-do for the happy path):** **none**. The flow works with zero
  further repo-settings changes (no npm trusted-publisher, no blocking PR
  setting).
- **Bucket 3 (optional hardening; documented, explicitly not done — branch
  protection is a repo setting a code change cannot make):** branch protection on
  trunk with required reviews and the gate as a required status check; if
  adopted, allow `github-actions[bot]` to push `changeset-release/trunk`, keep
  human review on the Version PR, and prohibit self-approval. Phrase R9's
  exemption as already shipped (the job-level `if:`) and — because a skipped job
  reports Success — exactly what makes gate-as-required-check safe, so there is
  no extra work if the check is later required. An optional `@changesets/bot`
  GitHub App for non-blocking educational PR comments may be mentioned (it
  complements, not replaces, the gate).

---

## 9. First release / bootstrapping (R22, DC4 — D4.4/D4.5)

There is currently no `CHANGELOG.md` and two pending minor changesets. The first
release bumps `0.1.1 → 0.2.0` and creates `CHANGELOG.md` fresh, with both
pending entries collected under `## 0.2.0`; the first GitHub Release body is that
`## 0.2.0` entry. **No seeding** of a `## 0.1.1` baseline — the 0.1.x versions
were never released as tags/Releases, so seeding one would invent a release that
never shipped. No-seed is both simpler and more honest. `getChangelogEntry`
finds the `## 0.2.0` heading on the first run, so the Release body works with no
special-casing (verified end-to-end in a token-free plain-changelog sandbox).

**No throw risk with changelog-github (D4.5).** `@changesets/apply-release-plan`
attaches each changeset's add-commit SHA (independent of `config.commit`), and
`changelog-github`'s `getReleaseLine` degrades gracefully: with no commit it
returns a plain entry (no throw, no token); a SHA not on the remote returns
`object: null` (not `data.errors`), so `getInfo` does not throw — it throws only
on auth/transport `data.errors`, not applicable in CI. This repo's two pending
changesets' add-commits are on trunk and pushed, so in CI (with the real token)
they resolve to full PR/commit/author links. The only caveat: a **local** first
run needs `GITHUB_TOKEN` (CI provides it).

---

## 10. Resolved open design choices and spec-reconciliation flags

### Six open design choices (DC1–DC6)

- **DC1 — tag name = `v<version>`** (not scoped). A bare single-package repo
  makes `changeset tag` emit `v<version>`; the scoped form is unavailable via
  this path and unnecessary. ⚠️ Corrects spec N5 (see ST2).
- **DC2 — ship a slim no-npm `CONTRIBUTING.md`** with the `#pre-10-policy`
  anchor as the home for contributor/maintainer mechanics.
- **DC3 — keep `README.md` in `changedFilePatterns`** + document the `--empty`
  escape for prose-only README edits. AGENTS.md already mandates a README update
  on code changes, so keeping it aligns the gate with that rule rather than
  creating a false positive; there is no in-file prose-vs-contract
  discrimination, and `--empty` is the clean escape.
- **DC4 — no seeding;** first release creates `CHANGELOG.md` fresh at 0.2.0.
- **DC5 — adopt `@changesets/changelog-github`** with the documented local-token
  cost (CI cost is zero).
- **DC6 — gate-as-required-check stays a documented optional maintainer
  action** (out of this issue's file scope, N3). The job-level exemption already
  makes it safe (a skipped job reports Success), so if a maintainer later
  requires the check, the R9 exemption becomes mandatory but needs no new work.

### Three plan deltas (hand-off to the plan/code phase)

- **Δ1 — lockfile resync.** `npm ci` currently fails (lockfile drift); the plan
  must `npm install` to resync and absorb the new devDep so both workflows pass
  (§5.3).
- **Δ2 — add a `test` script** in the exact form `"node --test
  'scripts/test/**/*.test.mjs'"` (the bare-directory form fails on node 22);
  invoked by both workflows (§5.2).
- **Δ3 — `.gitignore` add `.env`/`.env.local`** so a local token file cannot be
  committed (§5.4).

### Spec-reconciliation flags (wording corrections; not blockers)

- **ST1 — R11/R12 "accept both bare and quoted keys."** For this `@`-scoped
  package name a **bare** key is invalid YAML that the real changesets parser
  rejects. The validator therefore accepts **both quoted styles** (double — what
  the CLI writes — and single) and **rejects a bare `@`-key** as malformed YAML
  — matching exactly what the pipeline can consume. The spec's "must accept …
  bare … keys" is technically inaccurate for an `@`-scoped name; the correct
  reading is "accept both quoted styles; reject a bare `@`-scoped key as
  malformed YAML." Outcome-preserving; resolved in §6.3.
- **ST2 — N5 tag-name prose.** spec.md N5 says tags are the scoped
  `@automattic/radical-pipelines@<version>` form; for this bare single-package
  repo `changeset tag` produces `v<version>` (empirically proven). N5's intent
  ("don't do custom tag-naming work") still holds — we accept the tool's default
  — but the docs/plan use `v<version>`. Resolved in §4 (D1.6).

---

## 11. Load-bearing invariants (J1–J7)

- **J1** `privatePackages.version: true` — the gate functions only with this
  (R7). Preserved (§5.1).
- **J2** `privatePackages.tag: true` — tags the private package (R14). Set
  (§5.1). The schema enforces `tag:true ⟹ version:true`, so J1 and J2 are
  mutually reinforcing: the gate cannot be silently disabled.
- **J3** release uses `publish: npx changeset tag`, **never** `changeset
  publish` (R2/R13). §4.
- **J4** validator + tests are dependency-free `.mjs`; no `tsx`/`yaml` (R10).
  §6–§7.
- **J5** no `id-token: write`; release has `contents: write` + `pull-requests:
  write` only; default `GITHUB_TOKEN` only (R2/R15/R17). §4, §1.
- **J6** `sync-version.mjs` is unchanged; sole sync target
  `.claude-plugin/plugin.json`; `release:version` string unchanged (R3/N2). §2,
  §5.2.
- **J7** (cross-file) the validator's pre-1.0 message anchor
  `CONTRIBUTING.md#pre-10-policy` ⇔ the `CONTRIBUTING.md` heading "Pre-1.0
  policy" — renaming the heading breaks the link. §6.4, §8.1.

---

## 12. Requirement → design coverage

| Req | Covered by |
|----|----|
| R1 (CI-driven flow) | §1, §4 (live `push:trunk`) |
| R2 (no npm/OIDC) | §4 (no id-token, `changeset tag` not publish), J5 |
| R3 (preserve sync-version; no .pi-extension) | §2, §5.2, J6 |
| R4 (build on existing foundation) | §5.1 (3 edits only) |
| R5 (gate on PR→trunk, fetch-depth 0) | §3 |
| R6 (two independent checks) | §3 (validator + status, fail-fast) |
| R7 (gate enforces; version:true) | §5.1, J1/J2 |
| R8 (allowlist; anchored package.json) | §5.1 changedFilePatterns; gate sandbox AC3/4/5 |
| R9 (exempt the release PR) | §3 (job-level `if:`) |
| R10 (dependency-free .mjs validator) | §6, J4 |
| R11 (validator checks/order/messages) | §6.3–§6.4 (+ ST1 correction) |
| R12 (validator tests) | §7 (full matrix incl. corrected bare-`@`) |
| R13 (Version Packages PR) | §4 (`version: release:version`) |
| R14 (tag + Release on merge; private; idempotent) | §4 (D1.5/D1.6), §5.1 (tag:true) |
| R15 (least privilege, no OIDC) | §4, J5 |
| R16 (live trigger from landing) | §4 (push:trunk live) |
| R17 (no loop, default creds) | §1, §4 |
| R18 (richer changelog) | §5.1 (changelog-github); local-token §5.1/§8.4 |
| R19 (README rewrite) | §8.2 |
| R20 (contributor/maintainer docs) | §8.1, §8.4, §8.5 (CONTRIBUTING) |
| R21 (document prereqs, don't enforce) | §8.5 (three buckets) |
| R22 (first release bootstraps) | §9 |
| N1 (no npm ops) | §4, J5 |
| N2 (no sync-version change/.pi-extension) | §2, §5.2, J6 |
| N3 (no branch-protection change) | §8.5 (documented optional only) |
| N4 (no foundation rework) | §5.1 |
| N5 (no custom tag naming) | §4 (accept default `v<version>`; prose corrected, ST2) |

Acceptance criteria 1–17 all map through the above; AC3/4/5/7 were additionally
verified by a live `changeset status` sandbox, AC2 by the unchanged
`release:version` string, and AC10/16 by the tag + bootstrap sandboxes.
