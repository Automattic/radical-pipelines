# Design doc — Changelog with Changesets and version synchronization (Issue #81)

## Overview

The Radical Pipelines repository has no changelog, and its project version has
drifted across the three files that declare it. The root `package.json`
(`@automattic/radical-pipelines`, `"private": true`) reads `0.1.1`, while
`.claude-plugin/plugin.json` and `.pi-extension/package.json` both read `0.1.0`;
`.pi-extension/package-lock.json` mirrors the extension manifest at `0.1.0`. The
drift originated in commit `ad43963`, which bumped only the root manifest and
propagated to nothing.

This design adopts the [Changesets](https://github.com/changesets/changesets)
library to (1) record every repository change as a changelog entry, (2) drive
the version bump from the root `package.json` as the single source of truth, and
(3) propagate that version identically to the other version-bearing files,
regenerating the extension lockfile so no drift remains. Because the repository
is consumed direct-from-git (the Pi package via
`pi install git:github.com/Automattic/radical-pipelines` and the Claude Code
plugin via marketplace `source: "./"`) and the root package is private,
"release" means *the version files and changelog are updated and committed* —
there is no registry publish, no git tag, and no release CI.

The architecture has two cleanly separated halves:

- **Record (per change, automated by the pipeline).** Each pipeline run's Docs
  phase authors a committed `.changeset/*.md` file that declares the change and
  its bump type. This file travels with the pull request and accumulates on
  `trunk`; it is *not* consumed during the run.
- **Cut a version (operator-initiated, local).** When a maintainer chooses to
  cut a version, they run a single npm run-script that chains
  `changeset version` → a custom sync script → an in-place lockfile
  regeneration. This consumes pending changesets, writes `CHANGELOG.md`, bumps
  the root version, and propagates it to the two target manifests and the
  lockfile in one fail-fast invocation.

As a one-time correction inside this work, the existing drift is resolved by
running the same sync mechanism once with the root already at `0.1.1`, bringing
all three manifests (and the lockfile) to a coherent `0.1.1` baseline.

## Approach

The design rests on five settled decisions (detailed under **Key Decisions**):

1. **Custom zero-dependency sync, not a Changesets feature.** Changesets can
   only mutate `version` in the packages it manages and write `CHANGELOG.md`; it
   cannot write arbitrary JSON like `plugin.json` or the lockfile. Propagation is
   therefore handled by a small custom Node ESM script plus an in-place
   `npm install --package-lock-only`.
2. **Bundle the version step into one run-script.** The three commands
   (`changeset version`, sync, lockfile regen) are chained with `&&` under a
   single npm run-script whose name is *not* `version` (to avoid npm's
   pre/post run-script lifecycle collision). Bundling makes it structurally
   impossible to bump the root in isolation — the exact mistake that caused the
   current drift.
3. **Local/manual version step, no release CI.** Mandated by the spec's
   Out-of-Scope and AC9. The pipeline has no version-step phase; cutting a
   version is an operator action outside the per-issue run.
4. **Default changelog formatter.** `@changesets/cli/changelog`, not
   `@changesets/changelog-github`. The GitHub formatter hard-aborts a tokenless
   local version step whenever a changeset references a PR/commit.
5. **Docs phase authors the changeset.** The phase-5 `doc-writer` already owns
   "changelogs" and the per-change README duty, and runs after code has landed,
   so the bump type is decided with full knowledge of the shipped change.

The single load-bearing non-default in `.changeset/config.json` is
`"baseBranch": "trunk"`; everything else stays at Changesets defaults, including
`privatePackages` (so the private root package is versioned and changelogged but
never tagged).

## Components

### C1 — Changesets configuration (`.changeset/config.json` and `.changeset/`)

A `.changeset/` directory containing `config.json` is added. The config keeps
Changesets defaults except for `baseBranch`:

- `"baseBranch": "trunk"` — the repository's real default branch (not the tool's
  `master`). **Required non-default.** *(R2, AC1)*
- `"changelog": "@changesets/cli/changelog"` — the default formatter; no GitHub
  token or network needed. *(R4, AC3; see K4)*
- `privatePackages` left at the Changesets default
  `{ "version": true, "tag": false }` — the private root package is versioned and
  recorded in the changelog but never tagged. `"private": true` blocks publish,
  not the version step. *(R2, AC1)*
- `"commit": false` (default) — Changesets does not auto-commit, so commits
  follow the repository's agent-name commit convention. *(K3)*
- `"access": "restricted"` (default) — irrelevant since nothing is ever
  published.
- `"prettier"`: the repository has **no Prettier dependency**, so set this to
  `false` to avoid relying on a Prettier resolution that is not installed. (Low
  risk either way; this design fixes it to `false` for determinism. Flagged for
  the code phase to verify Changesets writes the changelog cleanly without
  Prettier.)

`@changesets/cli` is declared as a **development dependency** of the root
package. *(R1, AC1)*

### C2 — Version-sync script (`scripts/sync-version.mjs`)

A new custom, zero-dependency ESM Node script (filename illustrative; the
non-`version` run-script *name* constraint in C3 is the load-bearing part).
Behavior:

1. Read the root `package.json`, `JSON.parse` it, take `.version`. The root is
   the **single source of truth**; the script never computes its own bump.
2. For each target — `.claude-plugin/plugin.json` and
   `.pi-extension/package.json` — read, parse, set `.version` to the root value,
   and write back with `JSON.stringify(obj, null, 2) + "\n"`.

This round-trips byte-identical for the current files (all use 2-space indent +
trailing newline), so no format-preserving dependency is needed — pure `fs` +
`JSON`. Because it always copies *from* the root, the script is **idempotent and
re-runnable**, which is what lets the same script serve both normal propagation
and the one-time drift correction (C5). The repository is `"type": "module"`, so
the script is ESM. *(R3, R7, R8; AC4)*

### C3 — Version-step run-script (root `package.json` `scripts`)

The root currently has **no `scripts` block**; this work adds one. It contains a
single run-script — named to avoid the npm lifecycle collision, e.g.
`"release:version"` (**must not be named `"version"`**) — that chains the three
steps fail-fast:

```
changeset version
  && node scripts/sync-version.mjs
  && npm --prefix .pi-extension install --package-lock-only
```

- **Step 1** consumes `.changeset/*.md`, bumps the root `package.json`, writes/
  updates root `CHANGELOG.md`, and deletes consumed changeset files. *(R4, R5;
  AC3)*
- **Step 2** copies the new root version into the two target manifests (C2).
  *(R7, R8; AC4)*
- **Step 3** regenerates the extension lockfile in place (C4). *(R9; AC5)*

`&&` ensures any non-zero exit aborts the remainder, preventing partial
application. Bundling all three into one command is the primary guard against
silent re-drift. *(R7, R8, R9; AC4, AC5)*

### C4 — Extension lockfile regeneration (in place)

After the version reaches `.pi-extension/package.json`, the top-level version in
`.pi-extension/package-lock.json` (which appears at the root `"version"` key and
the `packages[""].version` key — currently lines 3 and 9) is regenerated to
match by running `npm install --package-lock-only` inside `.pi-extension/`.

This is an **in-place** edit against the *existing* lockfile: it changes exactly
the two top-level version lines, leaves the `bundleDependencies` block and all
`inBundle` entries untouched, touches no formatting, creates no `node_modules`,
and does not hit the registry (every dependency is integrity-pinned;
`lockfileVersion: 3`). The lockfile is **never deleted and regenerated from
scratch** — that path fails offline with `ENOTCACHED` because every dependency
must be re-resolved from the registry. *(R9; AC5; see K1, FM-2)*

### C5 — One-time drift correction (this work)

The existing drift is corrected by invoking the **same** sync mechanism (C2 +
C4) once while the root is at its current `0.1.1`. The script copies `0.1.1`
into `.claude-plugin/plugin.json` and `.pi-extension/package.json`, and the
lockfile regen brings `.pi-extension/package-lock.json` to `0.1.1`. No
special-case code path exists; the correction is simply "run the sync step with
the root already at `0.1.1`."

This is done **before / independent of** the first `changeset version` so the
pre-Changesets baseline is coherent and independently inspectable, and so the
correction pins no version beyond `0.1.1`. The `0.1.1` normalization is a
versioning-hygiene fix, **not** a feature change, so it gets **no `CHANGELOG.md`
entry**; the first changelog entry appears when the first real changeset is
consumed by the first `changeset version`. *(R11, R12; AC7; OQ-2 resolved)*

### C6 — Docs-phase changeset authoring (pipeline integration)

The phase-5 Docs phase's `doc-writer` gains a per-change duty: author a
`.changeset/*.md` file declaring the change and its bump type, and commit it so
it travels with the PR. This mirrors the repository's existing per-change
README-update rule and keeps all per-change documentation obligations in one
phase. A `.changeset/*.md` is documentation/metadata, not source code, so it
does not violate the `doc-writer` rule against touching source code.

The bump type is a semver judgment the `doc-writer` makes. Contributor docs give
brief guidance to keep the call consistent: behavior-preserving fix → **patch**;
backward-compatible feature → **minor**; breaking change → **major**.
*(R5, R6; AC2, AC8; OQ-3 resolved)*

### C7 — Contributor documentation and README (`AGENTS.md` / README)

Documentation is updated to state that **each repository change records a
changeset** (mirroring the standing README-update rule), and the README
documents: how to add a changeset, that the version step propagates the version
to every version-bearing file, that the version step is an operator-run local
action, and that consumers pick up new versions on their next git-source or
marketplace install. *(R6, R13; AC8)*

### Explicitly untouched

- **`.claude-plugin/marketplace.json`** — carries no version field and
  references the plugin via `source: "./"`; intentionally excluded from version
  sync. *(R10; AC6)*
- **`.github/workflows/deploy-landing.yml`** — the only existing workflow (a
  GitHub Pages deploy); left unchanged. *(AC9)*

## Interfaces and Data Flow

**Source of truth and propagation graph.** The root `package.json` `version` is
authoritative. Data flows strictly outward; no target is ever read back into the
root:

```
root package.json .version  (single source of truth)
        │  (changeset version computes the bump here)
        ├──► .claude-plugin/plugin.json .version          (sync-version.mjs)
        └──► .pi-extension/package.json .version           (sync-version.mjs)
                    └──► .pi-extension/package-lock.json    (npm --package-lock-only,
                         .version + packages[""].version     in place)
```

**Per-change flow (pipeline, automated).** Docs phase `doc-writer` writes
`.changeset/<id>.md` (front-matter declares affected package + bump type, body
describes the change) → commits it → the file travels with the PR and
accumulates on `trunk`. Not consumed in the run.

**Version-cut flow (operator, local).** Operator runs the single run-script:
`changeset version` (consume changesets, bump root, write `CHANGELOG.md`, delete
consumed files) → `sync-version.mjs` (copy root version into the two manifests)
→ `npm --prefix .pi-extension install --package-lock-only` (rewrite the two
lockfile version lines). All chained with `&&`. Operator then commits per the
repository's agent-name commit format. No tags, no publish.

**One-time drift-correction flow (this work).** Run the sync mechanism once with
root unchanged at `0.1.1`: `sync-version.mjs` + lockfile regen → all four files
read `0.1.1`. No `changeset version`, no changelog entry.

**End state after a version step** (and after the drift correction, at the
baseline): `root.version === plugin.json.version ===
.pi-extension/package.json.version === lockfile top-level version` — a single
identical string. *(AC4, AC5, AC7)*

## Key Decisions

### K1 — Custom zero-dependency sync script + in-place lockfile regen

A small custom ESM script propagates the version; the lockfile is regenerated
in place with `npm install --package-lock-only` in `.pi-extension/`. No
first-class Changesets feature can write `plugin.json`/the lockfile, and a
from-scratch lockfile regen fails offline. The JSON files round-trip
byte-identical with plain `fs` + `JSON`, so no format-preserving dependency is
needed. **Traces to:** R3, R7, R8, R9; AC4, AC5.

### K2 — One bundled, non-`version`-named run-script (fail-fast)

The three version-step commands are chained with `&&` under a single npm
run-script whose name is **not** `version`. Bundling makes it structurally
impossible to bump the root in isolation (the cause of the current drift);
fail-fast prevents partial application; the non-`version` name avoids npm firing
`pre`/`post` run-scripts unexpectedly now or in the future. **Traces to:** R7,
R8, R9; AC4, AC5.

### K3 — Local/manual version step; no release CI; Changesets does not auto-commit

The version step is an operator-run local action; no Changesets GitHub Action
and no automated "Version Packages" PR are added, and `deploy-landing.yml` is
untouched. `commit: false` keeps Changesets from auto-committing so commits
follow the repository convention. The pipeline has no version-step phase — it
ends at Docs/phase 5. **Traces to:** spec Out-of-Scope ("No release CI added by
default"); AC9.

### K4 — Default changelog formatter (`@changesets/cli/changelog`)

Use the default formatter, not `@changesets/changelog-github`. The GitHub
formatter requires a `GITHUB_TOKEN` and network egress at version time and
**hard-aborts the entire version step (exit 1, atomically)** whenever a
changeset references a PR/commit — fragile for a tokenless local version step.
Its only benefit is cosmetic PR/commit links, which the spec does not require.
**Traces to:** R4; AC3.

### K5 — Docs phase (phase 5) authors the changeset; version step is separate

The phase-5 `doc-writer` authors and commits the `.changeset/*.md` because it
already owns "changelogs" and the per-change README duty and runs after code has
landed (so the bump type reflects the full shipped change). Authoring (per-PR,
in the pipeline) is cleanly separated from consuming/cutting a version
(operator-initiated, outside the run). **Traces to:** R5, R6; AC2, AC8.

### K6 — Drift correction reuses the propagation mechanism at `0.1.1`

The one-time drift fix runs the same sync mechanism once with the root at
`0.1.1`, bringing the two lagging manifests and the lockfile up to `0.1.1`
(SemVer forbids regressing the root, so laggards move up). Done before the first
`changeset version`; no version is pinned beyond `0.1.1`; no changelog entry for
the baseline. **Traces to:** R11, R12; AC7.

### Optional hardening (recommended, not required) — OQ-1 resolved

These are net-new but compatible with the spec; presented as explicitly optional
so a reviewer can adopt or defer them:

- **Read-only CI drift-check.** A workflow that asserts
  `plugin.json.version === .pi-extension/package.json.version === root version
  === lockfile top-level version` and fails on mismatch. This is a *read-only
  check*, not a release action — it does not version, publish, tag, or open a
  "Version Packages" PR — so it does **not** violate AC9. **Recommendation:**
  worthwhile as a belt-and-suspenders backstop against re-drift, but optional;
  it is net-new CI, so adopt only if the maintainer wants it.
- **`engines.node` / `.nvmrc`.** The toolchain (node + npm) is currently
  unpinned. Adding these would make the mechanism's environment deterministic.
  Optional hardening; not required by the spec.

## Dependencies

- **`@changesets/cli`** — new root **dev dependency** (R1, AC1). Provides
  `changeset` (author changesets) and `changeset version` (consume them, bump,
  write `CHANGELOG.md`).
- **npm** — used for in-place lockfile regeneration
  (`install --package-lock-only`) and to run the version-step script. Assumed,
  unpinned (no `engines`/`.nvmrc` today; see optional hardening).
- **node (ESM)** — runs `scripts/sync-version.mjs`; the repository is
  `"type": "module"`. Assumed, unpinned. Verified working on node 22 / npm 10.
- **No new runtime dependencies**; the sync script is zero-dependency. Explicitly
  **not** adopted: `@changesets/changelog-github`, `@changesets/get-github-info`,
  `dotenv` (K4).

## Failure Modes and Observability

- **FM-1 — Silent re-drift (the original failure).** Running `changeset version`
  (or any root bump) alone, without propagation, re-creates today's
  `0.1.1`-vs-`0.1.0` split. **Mitigation:** bundle all three commands into one
  run-script (K2) so the root bump can't be run in isolation; optional CI
  drift-check is the backstop.
- **FM-2 — Offline lockfile regen fails (`ENOTCACHED`).** Deleting the lockfile
  and regenerating from scratch fails without network because every dependency
  must re-resolve. **Mitigation:** always edit in place against the existing
  lockfile with `--package-lock-only`; never delete-then-regenerate (C4, K1).
- **FM-3 — Run-script name collision.** Naming the run-script `"version"` makes
  npm fire `preversion`/`postversion` around it. **Mitigation:** use a
  non-`version` name, e.g. `release:version` (K2).
- **FM-4 — changelog-github hard-abort.** If the GitHub formatter were adopted, a
  changeset with a `pr:`/`commit:` directive would abort the tokenless version
  step (exit 1). **Mitigation:** use the default formatter (K4).
- **FM-5 — `&&` is fail-fast but not transactional.** A mid-chain failure leaves
  the tree partially modified (no rollback), but uncommitted — the operator
  inspects `git diff`/`git status` and re-runs (steps are idempotent). The
  committed state is the real integrity boundary; the optional CI drift-check
  guards it.

**Observability.** Verification is by inspection of committed files: the four
version strings are equal (AC4, AC5, AC7); `CHANGELOG.md` reflects consumed
changesets and the consumed `.changeset/*.md` files are gone after a version
step (AC3); `.claude-plugin/marketplace.json` is unmodified (AC6); no tags,
publish, or Changesets release workflow exist and `deploy-landing.yml` is
unchanged (AC9). The optional CI drift-check turns the version-equality invariant
into a continuously-enforced signal.

## Risks and Open Questions

**Risks** (all mitigated above): FM-1 silent re-drift (K2 + optional CI check);
FM-2 offline lockfile regen (in-place edit, C4); FM-3 run-script name collision
(non-`version` name, K2); FM-4 changelog-github hard-abort (default formatter,
K4).

**Open questions — all resolved in this design:**

- **OQ-1 (optional CI drift-check / `engines.node` / `.nvmrc`):** Resolved —
  presented as optional hardening; recommended but not required, both compatible
  with AC9.
- **OQ-2 (changelog at the `0.1.1` baseline):** Resolved — the `0.1.1`
  normalization is a pre-Changesets baseline with **no** changelog entry; the
  first entry appears on the first real changeset (C5, K6).
- **OQ-3 (bump-type guidance for `doc-writer`):** Resolved — patch / minor /
  major guidance documented in C6 and contributor docs.
- **OQ-4 (Prettier config given no Prettier dependency):** Resolved — set
  `"prettier": false` in `.changeset/config.json`; flagged for the code phase to
  confirm Changesets writes the changelog cleanly without Prettier (C1).

**Residual (deferred, out of scope):** If the repository later adopts a CI
version step with a `GITHUB_TOKEN`, revisiting `@changesets/changelog-github`
(for PR/commit links) would be reasonable — explicitly out of scope here.
