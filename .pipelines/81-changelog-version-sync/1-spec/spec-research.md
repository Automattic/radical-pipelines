# Spec research — Issue #81: Track changes with a changelog and keep the plugin version in sync

## Goal (from prompt)

Repository changes are tracked in a changelog, and the project version stays
synchronized everywhere it appears — at minimum `package.json` and the Claude
Code plugin manifest `.claude-plugin/plugin.json`. Use the Changesets library.

## Initial observations (from a read of the working tree)

- **Three** files carry a project version, and they are currently inconsistent:
  - Root `package.json` (`@automattic/radical-pipelines`) → `0.1.1`
  - `.claude-plugin/plugin.json` → `0.1.0`
  - `.pi-extension/package.json` (`@automattic/radical-pipelines-pi`) → `0.1.0`
- The prompt names only the first two. The third (`.pi-extension/package.json`)
  is a real Pi package (`pi-package` keyword) and is a candidate for sync.
- README (`README.md`) states the root manifest and `.pi-extension/` "share a
  single source of truth" and "both layers share a single source of truth"
  (lines ~137-141).
- `.claude-plugin/marketplace.json` carries no version of its own (references
  the plugin by `source: "./"`). Prompt assumption that it needs no sync looks
  correct from the read.
- No `CHANGELOG.md` exists yet. No `.changeset/` directory. No `scripts/`.
- Only one GitHub workflow exists: `.github/workflows/deploy-landing.yml`
  (deploys the `landing/` GitHub Pages site on push to `trunk`). There is **no**
  release/publish CI workflow currently.
- No root lockfile committed (`.gitignore` ignores `node_modules`; root has no
  `package-lock.json`). `.pi-extension/` has its own committed
  `package-lock.json`.
- Both Pi packages are `"private"`? Root is `"private": true`. `.pi-extension`
  package.json is not marked private.

## Open questions to resolve with research

1. Should `.pi-extension/package.json` be in scope for version sync (third file)?
2. How is the project "released"? Is there any publish step, or is versioning
   purely informational/git-tag-based? (Affects whether Changesets' publish flow
   is needed or only its version/changelog flow.)
3. Why are versions currently divergent (0.1.1 vs 0.1.0)? Is one authoritative?

---

## Q&A log

### Q1 — How many files carry the version; what is in scope; what is the source of truth?

**Findings (researcher, grounded in working tree):**

- **Three distinct physical files** carry the version (regular files, not
  symlinks; #1 and #3 are different npm packages with different `name`):
  1. Root `package.json:3` → `0.1.1`, name `@automattic/radical-pipelines`,
     `"private": true`.
  2. `.claude-plugin/plugin.json:3` → `0.1.0`.
  3. `.pi-extension/package.json:3` → `0.1.0`, name
     `@automattic/radical-pipelines-pi`.
  - Plus a **4th derived** file: `.pi-extension/package-lock.json` (`:3` and
    `:9`) → `0.1.0`. npm auto-rewrites it on `npm install`; it follows #3
    mechanically. A sync mechanism should account for it but need not hand-edit
    it.
- **All three are in scope and should carry the SAME version.** The current
  divergence is **accidental drift**, not intentional decoupling:
  - All three started at `0.1.0` together. Commit `ad43963` (an unrelated
    spec/design refactor touching 19 files) bumped ONLY root `package.json`
    `0.1.0`→`0.1.1` without mentioning versioning — a stray edit.
  - `.claude-plugin/plugin.json` and `.pi-extension/package.json` have only ever
    been `0.1.0`.
  - Repo has **zero git tags**, no per-package release cadence, no publish
    workflow — nothing justifies independent versions.
  - README treats root + `.pi-extension` as one unit ("both layers share a
    single source of truth", `README.md:139`); marketplace lists a single
    plugin sourced from `./`.
- **No other version locations exist.** Broad grep returns only the four files
  above (plus dependency entries inside the lockfile). No version string in
  README, landing site, or skill/agent files. Zero git tags.
- **Root `package.json` is the natural source of truth** — it is the file
  Changesets natively manages and the repo-root Pi manifest resolved by
  `pi install git:github.com/Automattic/radical-pipelines`.
- **Flag (design, not fact):** root `package.json` is `"private": true` with no
  npm `workspaces`. Changesets in a single-package repo updates the root
  `package.json` and generates a root `CHANGELOG.md` by default. Propagating the
  version OUT to `plugin.json` and `.pi-extension/package.json` (which Changesets
  does not know about) needs a custom step — a `version` lifecycle/postversion
  script or equivalent. This is a design decision for the design phase.
- **Recommendation (researcher):** treat root `package.json` as the single
  source of truth; on each Changesets version bump, propagate the new version to
  `.claude-plugin/plugin.json` and `.pi-extension/package.json`, and let npm
  regenerate `.pi-extension/package-lock.json`. The first sync should also
  CORRECT the existing drift so all files land on one value.

**Resolution:** Scope confirmed as three files (+ derived lockfile). Source of
truth = root `package.json`. The `.pi-extension/package.json` IS a third sync
target. The existing drift must be corrected to a single value as part of this
work.

### Q2 — Intended workflow: changeset-per-change, CI vs local version step, publish scope?

**Findings (researcher, grounded in repo + issue #81):**

- The issue itself fixes the deliverable: "Repository changes are tracked in a
  changelog, and the project version stays synchronized … Use the Changesets
  library." Its Assumptions section already pictures "a script wired into the
  version step" to propagate the version to `plugin.json`. So: changelog +
  version sync, nothing about publishing.

**(a) Adding a changelog entry per change — fits, low friction.**
- No existing contributor change-recording convention to slot into: no PR
  template, no CONTRIBUTING, no ISSUE_TEMPLATE (`.github/` has only
  `workflows/deploy-landing.yml`).
- Closest existing analog is `AGENTS.md`'s single change-time rule: "Whenever
  any task is performed that changes the code … the README.md must be updated."
  A "write a changeset file per change" rule is the same shape and consistent
  with that mindset.
- Commit-format convention (`.rp.md`) governs messages but is NOT machine-
  parseable into bump types, so it can't substitute for changesets.
- Work flows as one PR per issue via the pipeline; the natural home for
  `npx changeset` is a `.changeset/*.md` file committed on the pipeline branch.
  Researcher suggests the Docs phase author it (it already owns README updates).

**(b) Version step — LOCAL/MANUAL model recommended (not changesets CI action).**
- No release/version CI exists today (only `deploy-landing.yml`, triggered by
  `landing/**`). A changesets GitHub Action would be net-new infra the issue
  doesn't ask for.
- Repo's operating model is agent-driven, local, trunk-based (worktrees off
  `trunk`, push at close-out). A maintainer/pipeline running
  `npx changeset version` and committing fits better than a bot-opened PR.
- The CI changesets/action model is for many human contributors merging
  continuously; this repo is a single-operator agent pipeline — no such signal.
- Issue text ("script wired into the version step") leans toward a local script.
- **Owner-confirm decision (flagged):** local/manual version step vs. adding a
  changesets CI action. Researcher recommends local/manual; do NOT add release
  CI unless the operator asks.

**(c) Publishing — OUT of scope. "Release" = repo files updated + committed.**
- Root `package.json` is `"private": true` (`package.json:4`) — npm refuses to
  publish by design.
- Zero git tags, no publish workflow, no `prepublish`/`publish` scripts (no
  `scripts` block at all).
- Consumption is direct-from-git, never a registry: plugin via marketplace
  `source: "./"` (`README.md:64-89`); Pi via `pi install git:…` or local path
  (`README.md:99-124`); `.pi-extension` bundles deps because consumed as source.
- Only "registry" strings are dependency tarball URLs in the lockfile — not a
  publish target. No hidden publish expectation anywhere grepped.
- So "release" legitimately means: the three files' versions and `CHANGELOG.md`
  are updated and committed; consumers pick up the new version on their next
  git-source/marketplace install. No tag, no publish, no CI required.

**Two owner-confirm decisions flagged by researcher:**
1. Local/manual version step vs. adding a changesets CI action (recommend
   local/manual).
2. Which phase/role authors the changeset (suggest Docs phase, alongside the
   existing README-update duty).

**Resolution:** Deliverable = changelog + version sync only. No publish, no git
tags, no registry. Local/manual version step is the working assumption (to be
confirmed with owner). Changeset-per-change fits the existing per-change-docs
convention.

### Q3 — Private-package behavior, `.changeset/config.json` keys, drift baseline, propagation menu

**Findings (researcher, grounded in Changesets official config docs + repo):**

**(1) `changeset version` on a single `private: true` package bumps + writes
CHANGELOG.md — by default.** Headline requirement is achievable.
- Changesets `privatePackages` docs: "By default, Changesets will update the
  changelog for private packages and update their version, but will not create a
  tag." Defaults: `privatePackages.version = true`, `privatePackages.tag =
  false`. `private: true` only blocks PUBLISH, not the version step.
- This is exactly what the repo wants: bump + changelog, no tag, no publish.
- Single package, no workspaces works fine; monorepo-only knobs (`linked`,
  `fixed`, `ignore`, etc.) are irrelevant.
- **Required `.changeset/config.json` settings for THIS repo:**
  - `"baseBranch": "trunk"` — **the one load-bearing non-default** (repo default
    branch is `trunk`, not `master`). Confirmed via
    `git symbolic-ref refs/remotes/origin/HEAD` → `refs/remotes/origin/trunk`.
  - `privatePackages`: leave default `{ "version": true, "tag": false }` (do NOT
    set to `false`).
  - `changelog`: default `"@changesets/cli/changelog"` is fine. Optional upgrade
    `["@changesets/changelog-github", { "repo": "Automattic/radical-pipelines" }]`
    adds PR links but needs GitHub auth — design-phase optional, not required.
  - `access`: default `"restricted"` fine (never publish anyway).
  - `commit`: default `false` — keep it so commits follow `.rp.md` agent-name
    commit format (operator/pipeline commits).
  - `prettier`: default `true`; can stay or be set `false` if no Prettier dep —
    minor/optional.
  - Net: only `baseBranch: "trunk"` is required; everything else rides defaults.

**(2) Drift-correction baseline → converge all three to `0.1.1` BEFORE the first
changeset.**
- `0.1.1` is the highest existing value and lives in root `package.json` (source
  of truth). SemVer must not go backwards, so root cannot drop to `0.1.0`;
  plugin.json and `.pi-extension/package.json` are brought UP to `0.1.1`.
- `changeset version` only touches the root package it manages; it computes the
  next version from root's current value and won't know about the other two.
  Normalizing all three to `0.1.1` up front makes the pre-Changesets baseline
  coherent and decouples "fix drift" from "cut first version." Either path
  converges to the same end state; normalize-first is cleaner/lower-risk.
- **No target next-version or bump type is specified** anywhere: issue #81 has no
  milestone, no labels, body says nothing about a version. Zero git tags → no
  cadence precedent. **Spec must NOT hard-code the next version** — it is
  determined by the changeset's bump type applied to the `0.1.1` baseline
  (patch→`0.1.2`, minor→`0.2.0`, etc.).

**(3) Propagation mechanism menu (for implementation-agnostic phrasing):**
- (a) Naive npm `version` lifecycle script — **weak fit**: `changeset version`
  does NOT trigger npm's `version` lifecycle, so it won't auto-run. Flag so
  design doesn't assume it "just works."
- (b) A wrapper npm script, e.g. `"changeset version && node
  scripts/sync-version.mjs && (cd .pi-extension && npm install)"` — the
  realistic "wired into the version step" option. Viable; needs a new `scripts`
  block (none today; trivial to add).
- (c) Standalone sync script run manually after `changeset version` — simplest;
  (b) is just (c) wrapped into one command.
- (d) Changesets changelog-functions plugin — **wrong layer**: it customizes
  CHANGELOG format, cannot write `plugin.json`. Not for version sync.
- Phrasing: "a mechanism propagates the bumped root version to `plugin.json` and
  `.pi-extension/package.json` (and regenerates the lockfile) as part of the
  version step" without naming which of (b)/(c).

**(4) Lockfile is a 4th side-effect.** After syncing `.pi-extension/package.json`,
run `npm install` (or `npm install --package-lock-only`) in `.pi-extension/` so
`.pi-extension/package-lock.json`'s top-level version matches. If forgotten, the
lockfile silently re-drifts. Make it an explicit requirement.

**(5) Changeset files are committed, not ignored.** `.changeset/*.md` files are
tracked in git and travel with the PR (standard Changesets behavior).

**Resolution:** All factual blockers cleared. `private: true` does not suppress
versioning/changelog. Only required config non-default is `baseBranch: "trunk"`.
Drift converges to `0.1.1` before the first changeset. Next version is not
hard-coded. Propagation is a sync script ((b)/(c)). Lockfile must stay in sync.

---

## Consolidated Requirements

These are the observable outcomes this work must produce. They are stated so a
reviewer can verify each by inspecting files or running a command. Mechanism
choices (script vs. wrapped npm command, changelog formatter, etc.) are left to
the design phase; only behavior is fixed here.

### Scope and source of truth

- **R1 — Changesets is adopted.** The repository uses the Changesets library to
  manage the changelog and version bumps. After setup, a `.changeset/`
  directory with a `config.json` exists, and `@changesets/cli` is available to
  run (declared as a dev dependency of the project).
- **R2 — `.changeset/config.json` targets the real default branch.** The config
  sets `"baseBranch": "trunk"` (not the `master` default). Private-package
  handling stays at the Changesets default (`privatePackages.version: true`,
  `privatePackages.tag: false`) so the private root package is still versioned
  and changelogged but never tagged.
- **R3 — The root `package.json` is the single source of truth for the version.**
  The version that Changesets bumps in the root `package.json`
  (`@automattic/radical-pipelines`) is the value every other version-bearing
  file must match.

### Changelog

- **R4 — A changelog exists and is generated by Changesets.** A `CHANGELOG.md`
  is produced/updated by the Changesets version step (at the repository root,
  per Changesets' single-package default). It is not hand-maintained.
- **R5 — Each repository change can be recorded as a changeset.** A contributor
  (human or pipeline agent) can add a changeset entry describing a change and
  its bump type (patch/minor/major); the entry lives as a committed
  `.changeset/*.md` file on the branch and travels with the PR. Running the
  version step consumes pending changeset files and folds them into
  `CHANGELOG.md`.
- **R6 — The change-recording step is documented as a per-change obligation.**
  The contributor-facing docs (`AGENTS.md` and/or `README.md`) state that each
  repository change records a changeset, mirroring the existing "update the
  README on every change" rule. (See open decision D2 for which pipeline phase
  owns authoring it.)

### Version synchronization

- **R7 — The version is identical across all three version-bearing files.**
  After the version step runs, these three files carry the exact same version
  string:
  - root `package.json`
  - `.claude-plugin/plugin.json`
  - `.pi-extension/package.json`
  Verifiable by reading line 3 (the `"version"` field) of each file.
- **R8 — A mechanism propagates the bumped version automatically as part of the
  version step.** When the version is bumped via Changesets, the new root
  version is propagated to `.claude-plugin/plugin.json` and
  `.pi-extension/package.json` without a separate manual edit of those files.
  (Mechanism — wrapped npm command vs. standalone sync script — is a design
  choice; a naive npm `version` lifecycle hook is known NOT to fire under
  `changeset version` and must not be relied upon.)
- **R9 — The `.pi-extension` lockfile stays in sync.** After the version
  propagates to `.pi-extension/package.json`, `.pi-extension/package-lock.json`'s
  top-level version is regenerated to match (e.g. via `npm install` /
  `--package-lock-only` in `.pi-extension/`). No silent lockfile drift.
- **R10 — `.claude-plugin/marketplace.json` is NOT modified for version sync.**
  It carries no version field and references the plugin by `source: "./"`, so it
  is intentionally out of scope.

### Drift correction (one-time, part of this work)

- **R11 — The existing version drift is corrected.** Before/at the first version
  step, all three files are brought to a single consistent baseline of `0.1.1`
  (the highest existing value, held by the root source of truth; SemVer must not
  regress). After this work, no two version-bearing files disagree.
- **R12 — The next version is not hard-coded.** The spec/design must not pin a
  specific next version number. The post-baseline version is whatever the first
  changeset's bump type yields applied to `0.1.1` (patch→`0.1.2`,
  minor→`0.2.0`, …).

### Out of scope (explicit)

- **R13 — No publishing / no registry release.** Root `package.json` is
  `"private": true`; both artifacts are consumed direct-from-git (Pi git source;
  Claude Code marketplace `source: "./"`). This work performs versioning +
  changelog only: "release" means the version files and `CHANGELOG.md` are
  updated and committed. No `npm publish`, no registry, no git tags.
- **R14 — No release CI is added by default.** No changesets GitHub Action /
  automated "Version Packages" PR is introduced unless the owner explicitly asks
  (see open decision D1). The version step runs locally / via the pipeline. The
  existing `deploy-landing.yml` workflow is untouched.

### Project hygiene

- **R15 — README is updated.** Per the repo's standing rule
  (`AGENTS.md`: "Whenever any task is performed that changes the code … the
  README.md must be updated"), the README documents the new changelog/versioning
  workflow (how to add a changeset, how the version step propagates the version
  to all files, and that consumers pick up new versions on their next
  git-source/marketplace install).

### Open decisions to confirm with the owner (do not block spec)

These are design-shaping choices, not contradictions of the prompt. The prompt's
own wording ("a script wired into the version step") supports the recommended
defaults below; surfaced here so the owner can override.

- **D1 — Version step: local/manual (recommended) vs. a changesets CI action.**
  Recommendation: keep it local/manual (no new release CI). The repo has no
  release CI today and operates as a single-operator, trunk-based agent
  pipeline.
- **D2 — Which pipeline phase/role authors the changeset.** Recommendation: the
  Docs phase, which already owns per-change README updates.
- **D3 — Changelog formatter (optional).** Default
  `@changesets/cli/changelog` vs. `@changesets/changelog-github` (PR links,
  needs GitHub auth). Default is sufficient; the GitHub formatter is a nicety.
