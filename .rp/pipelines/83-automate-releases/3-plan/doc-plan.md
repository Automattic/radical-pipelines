# Doc Plan: Automate releases with GitHub Actions (changeset gate + release workflow)

## Overview

This plan covers the documentation surface for GitHub issue 83. The code plan
(`code-plan.md`) deliberately excludes docs; everything documentation-related
lives here. It is scoped to **what / where / who** — not wording — and traces
every task to the spec (R19/R20/R21, AC14/AC15) and design (§8 and its
sub-sections, plus the cross-file invariant J7).

The shipped behavior the docs must describe accurately (from the spec, design,
and the 7-task code plan):

- A PR-time **changeset gate** (`.github/workflows/changeset-gate.yml`) that
  runs a dependency-free shape validator (`node scripts/validate-changesets.mjs`)
  and a presence check (`npx changeset status --since=origin/<base>`), exempting
  the auto-generated `changeset-release/trunk` PR via a job-level `if:`.
- A post-merge **release** workflow (`.github/workflows/release.yml`,
  `on: push:[trunk]` + `workflow_dispatch`) using `changesets/action@v1` with
  `version: npm run release:version` and `publish: npx changeset tag`, producing
  a `v<version>` git tag and a GitHub Release with the `## <version>` changelog
  entry as its body. Default `GITHUB_TOKEN` only; no npm publish; no OIDC.
- A release-relevant **allowlist** (`changedFilePatterns`): `skills/**`,
  `agents/**`, `.claude-plugin/**`, root `package.json` (anchored — not
  `package-lock.json`, not nested), `README.md`. Excluded: `website/**`,
  `scripts/**`, `.pi/`, `.rp/`, `.changeset/`, `.github/`, and meta files.
- Adoption of `@changesets/changelog-github` (richer entries: PR/commit links +
  author), which imposes a **local `GITHUB_TOKEN` requirement** for any local
  `release:version` run (CI cost is zero).
- A validator pre-1.0 `major` rejection whose error message hard-codes the
  anchor `CONTRIBUTING.md#pre-10-policy` (invariant J7 — the doc MUST honor it).
- First release bumps `0.1.1 → 0.2.0` and creates `CHANGELOG.md` fresh.
- Tag name is the bare `v<version>` form (design §4/DC1/ST2 — **not** the scoped
  `@automattic/radical-pipelines@<version>` form; the spec's N5 prose is stale).

### Documentation surfaces (design §8)

There are **four** doc surfaces. One is **new** (`CONTRIBUTING.md`, the
authoritative home for mechanics); three are **edited** to reconcile the stale
"no git tags / no release CI" claim and to repoint at CONTRIBUTING:

1. `CONTRIBUTING.md` (new) — Task 1.
2. `README.md` "## Changelog and versioning" (edit) — Task 2.
3. `.changeset/README.md` (edit, one stale sentence) — Task 3.
4. `AGENTS.md` (edit, the changeset pointer only) — Task 4.

### Cross-file invariants the docs must hold

- **J7 (load-bearing).** `CONTRIBUTING.md` MUST contain a heading titled exactly
  `Pre-1.0 policy` (`## Pre-1.0 policy`) so GitHub slugs it to `#pre-10-policy`,
  matching the validator's error-message anchor verbatim. Renaming the heading
  breaks the link. Owned by Task 1; depended on by Task 4's optional pointer.
- **No npm anywhere (R2/AC1/AC15).** No doc task may introduce npm-publish,
  npm-OIDC, rollback/unpublish/dist-tag, or `npm publish --dry-run` instructions.
  The only npm commands documented are `npm ci`, `npm install`, `npm test`, and
  `npm run release:version`.

### Ordering

Task 1 (`CONTRIBUTING.md`) is the authoritative source and ships the
`#pre-10-policy` anchor, so it goes **first**; Tasks 2–4 point into it and must
not duplicate its content, so they follow. Tasks 2–4 are mutually independent
but are ordered to keep one writer per surface. All doc tasks depend on the code
phase having landed the behavior they describe (workflows, validator, config
deltas, `test` script).

## Tasks

### Doc Task 1: Author the new `CONTRIBUTING.md`

- **Goal:** Create the authoritative, slim, **no-npm** home for contributor and
  maintainer release mechanics: when a changeset is required (and the `--empty`
  escape hatch), bump-type guidance, the pre-1.0 policy (at the load-bearing
  `#pre-10-policy` anchor), how to author a changeset, the CI gate explanation,
  the CI release process, the no-npm manual-release escape hatch, the
  "I forgot a changeset" / re-run recovery notes, Dependabot handling, and the
  maintainer prerequisite buckets (R21).
- **Audience:** Contributors (when/how to add a changeset; bump types; pre-1.0
  rule) and maintainers (release process, manual escape hatch, recovery,
  repo-configuration prerequisites).
- **Files:** `CONTRIBUTING.md` (new, repo root).
- **Sections-scope** (design §8.1 outline — content required, wording free):
  - `# Contributing`
  - `## Running tests and checks locally` — just `npm test` (the
    `node --test 'scripts/test/**/*.test.mjs'` suite added in code Task 2;
    runs the sync-version + validator tests). No `lint`/`typecheck` (the repo
    has none).
  - `## Versioning policy` — single project version, kept in sync to
    `.claude-plugin/plugin.json`; package is `private`, consumed direct-from-git.
  - `## Adding a changeset`
    - `### When a changeset is required` — the `changedFilePatterns` allowlist
      (`skills/**`, `agents/**`, `.claude-plugin/**`, **root** `package.json`,
      `README.md`) and the exclusions (`website/**`, `scripts/**`, `.pi/`,
      `.rp/`, `.changeset/`, `.github/`, meta files incl. `package-lock.json`,
      `AGENTS.md`, `LICENSE`, `.gitignore`). State that a `package-lock.json`-only
      or internal-only change needs no changeset.
    - `### Bump types` — the authoritative bump table (`patch`/`minor`/`major`/
      `none`). **Lives only here**; other surfaces point at it.
    - `### Pre-1.0 policy` — heading titled **exactly** `Pre-1.0 policy`
      (invariant J7 → slug `#pre-10-policy`). While `version` starts with `0.`:
      breaking change → `minor` with a `BREAKING:` summary prefix (never
      `major` — the validator hard-rejects pre-1.0 `major`); feature → `minor`;
      fix → `patch`; `major` is reserved for the deliberate `1.0.0` cut
      (maintainer hand-writes the `1.0.0` entry and removes the guard).
    - `### How to add a changeset` — `npx changeset` from the repo root; commit
      the generated `.changeset/*.md` with the change.
    - `### Empty changesets` — `npx changeset --empty` for prose-only edits to an
      otherwise release-relevant file (e.g. a `README.md` typo fix); it writes
      `---\n---\n`, which the validator accepts as canonical-empty and
      `changeset version` consumes without bumping.
    - `### Summary format conventions` — pin the `BREAKING:` prefix convention.
    - `### What this looks like in CHANGELOG.md` — the `changelog-github`
      enriched form (PR links, commit links, author attribution).
  - `## Release process` — the CI flow: pending changesets on `trunk` → CI
    opens/updates the "Version Packages" PR (runs `release:version`: bump +
    regenerate `CHANGELOG.md` + sync `.claude-plugin/plugin.json`) → maintainer
    reviews and merges → CI creates the `v<version>` git tag and the GitHub
    Release (body = the `## <version>` changelog entry). **No npm.** Note bot
    pushes do not re-trigger; only the human merge advances to tag/Release.
  - `## Manual release escape hatch` — the no-npm local procedure (design §8.4):
    on clean `trunk`, `GITHUB_TOKEN` exported (changelog-github throws without
    it), `npm ci` → `npm run release:version` (inspect; `git restore .` to
    abort) → commit the bump (config is `commit:false`) and push →
    `npx changeset tag` + push the tag → `gh release create v<version>` with the
    top `## <version>` CHANGELOG section as the body. Produces the **same**
    `v<version>` tag + Release as CI. **No npm publish anywhere.**
  - `## "I forgot a changeset" recovery` — add the changeset in a follow-up.
  - `## Re-running a failed release` — re-run the job; `changeset tag` is
    idempotent (no-op if the tag exists). Edge note: re-running will **not**
    backfill a missing Release for an already-existing tag — recovery is
    `gh release create v<version> --notes-file <entry>`.
  - `## Dependency-bump PRs` — Dependabot PRs stay gated (the bot-PR exemption is
    scoped to `changeset-release/trunk` only).
  - `## Repo configuration prerequisites` (R21 / design §8.5) — three buckets:
    - **Bucket 1 (verify enabled; currently satisfied):** "Allow GitHub Actions
      to create and approve pull requests" is currently enabled; phrase as
      "Verify this is enabled (currently satisfied)", not "off by default". The
      bot can push the release branch because `trunk` is currently unprotected.
    - **Bucket 2 (must-do for the happy path):** **none**.
    - **Bucket 3 (optional hardening; documented, explicitly not done — N3):**
      branch protection on `trunk` with required reviews and the gate as a
      required status check; if adopted, allow `github-actions[bot]` to push
      `changeset-release/trunk`, keep human review on the Version PR, prohibit
      self-approval, and the R9 gate exemption becomes mandatory (already shipped
      as the job-level `if:`; a skipped job reports Success, so no extra work is
      needed). May mention an optional `@changesets/bot` GitHub App for
      non-blocking educational PR comments (complements, not replaces, the gate).
  - **Local-token note** (R18, woven into the relevant sections): a local
    `release:version` / manual release needs `GITHUB_TOKEN` because
    `@changesets/changelog-github` requires it; a gitignored `.env` with
    `GITHUB_TOKEN=…` works (dotenv). Private-repo scope guidance: a classic PAT
    needs `repo` + `read:user`; a fine-grained PAT needs Contents:Read +
    Pull requests:Read + Metadata:Read. **CI cost is zero** (the action injects
    `secrets.GITHUB_TOKEN`).
- **Depends on:** Code Tasks 1–7 (the behavior — `.gitignore` `.env`, the
  `test` script, the config deltas, the validator, both workflows — must exist
  and match what is documented). No dependency on other doc tasks.
- **Traces to:** Spec R20, R21, R18, R22, AC13, AC15; Design §8.1, §8.4, §8.5,
  DC2, DC3, DC5, DC6, invariant J7 (the `#pre-10-policy` anchor), N3.
- **Acceptance:**
  - `CONTRIBUTING.md` exists at the repo root and contains a heading titled
    **exactly** `Pre-1.0 policy` that GitHub slugs to `#pre-10-policy` (matching
    the validator's error message verbatim — invariant J7).
  - It documents: when a changeset is required (the five-entry allowlist and the
    exclusions); the `--empty` escape for prose-only edits; the bump-type table;
    the pre-1.0 policy (`major` forbidden pre-1.0, recorded as `minor` +
    `BREAKING:`); how to author a changeset (`npx changeset`); the CI gate (shape
    validator + presence check); the CI release process (Version Packages PR →
    human merge → CI `v<version>` tag + GitHub Release); the no-npm manual
    release escape hatch; the "forgot a changeset" and re-run/idempotency
    recovery (including the missing-Release backfill edge); Dependabot staying
    gated; and the three maintainer prerequisite buckets with Bucket 1 phrased as
    "verify enabled (currently satisfied)" and Bucket 2 as "none".
  - It documents the local-`GITHUB_TOKEN` requirement (with the gitignored-`.env`
    mechanism and private-repo PAT scopes) and states CI cost is zero.
  - The tag form documented is `v<version>` (not the scoped form).
  - **No** npm-publish, npm-OIDC, rollback/unpublish/dist-tag, or
    `npm publish --dry-run` instructions appear anywhere (R2/AC1/AC15). The only
    npm commands shown are `npm ci`, `npm install`, `npm test`,
    `npm run release:version`.

### Doc Task 2: Rewrite the README "## Changelog and versioning" section

- **Goal:** Update the README so it no longer claims releases are an operator-run
  local action with "no git tags, and no release CI", and instead describes the
  new CI-driven, no-npm flow; keep the no-npm claim; point mechanics at
  `CONTRIBUTING.md` to avoid duplication.
- **Audience:** Readers of the project README — primarily consumers and new
  contributors getting an overview of how versioning/releases work.
- **Files:** `README.md` (the `## Changelog and versioning` section, currently
  lines ~169–210; subsections `### Adding a changeset`, `### The single source of
  truth`, `### Cutting a version`, `### How consumers get new versions`).
- **Sections-scope** (design §8.2):
  - `### Cutting a version` — rewrite the body (currently "an operator-run local
    action, not CI") to the CI flow: changesets accumulate on `trunk` → CI opens
    a "Version Packages" PR → maintainer merges → CI creates the `v<version>` tag
    and GitHub Release. Reframe the two `release:version` steps (consume
    changesets / `CHANGELOG.md` / `package.json` bump, then `sync-version.mjs` →
    `.claude-plugin/plugin.json`) as **what the Version Packages PR runs in CI**.
    Point the manual procedure and local-token detail at CONTRIBUTING (do not
    inline the full hatch). Add the R18 local-token note (a local
    `release:version` needs `GITHUB_TOKEN`).
  - The stale sentence "There is no `npm publish`, no git tags, and no release
    CI" — **keep** the no-npm claim, **delete** "no git tags, and no release CI",
    and state releases now produce a `v<version>` tag + GitHub Release via CI.
  - `### How consumers get new versions` — keep the direct-from-git point; add
    that releases now also produce a `v<version>` tag + GitHub Release.
  - `### Adding a changeset` — shrink to a pointer to `CONTRIBUTING.md`
    (`#adding-a-changeset`) rather than restating the full how-to (the
    authoritative content lives in Task 1). Keep the standing-rule reference.
  - `### The single source of truth` — unchanged in substance (still
    `.claude-plugin/plugin.json` as the sole sync target); leave as-is unless a
    cross-reference helps.
- **Depends on:** Code Task 7 (release workflow) and Code Task 3 (config deltas)
  for accuracy; Doc Task 1 (so the `CONTRIBUTING.md` anchors it points at exist).
- **Traces to:** Spec R19, AC14; Design §8.2, DC3 (README stays release-relevant
  + `--empty` documented in CONTRIBUTING), ST2 (`v<version>` tag form), N5.
- **Acceptance:**
  - The README's "## Changelog and versioning" section no longer states that
    releases are an operator-run local action and no longer contains "no git
    tags" or "no release CI".
  - It describes the CI-driven flow (changesets → Version Packages PR →
    maintainer merge → CI `v<version>` tag + GitHub Release) and **retains** the
    no-npm claim.
  - The two `release:version` steps are framed as what the Version Packages PR
    runs in CI, and the local-`GITHUB_TOKEN` note is present (or pointed at
    CONTRIBUTING).
  - `### Adding a changeset` points to `CONTRIBUTING.md` instead of duplicating
    the full how-to.
  - The sole sync target documented is still `.claude-plugin/plugin.json`; no npm
    publish/OIDC/rollback instructions are introduced.

### Doc Task 3: Correct the stale sentence in `.changeset/README.md`

- **Goal:** Fix the one stale sentence in the changesets cheat-sheet that asserts
  "no registry publish, no git tags, and no release CI: a maintainer runs the
  version step locally", reconciling it with the CI-driven flow while leaving the
  upstream `changeset init` boilerplate untouched.
- **Audience:** Anyone who opens the `.changeset/` directory (contributors
  authoring changesets, maintainers).
- **Files:** `.changeset/README.md` (the project-specific paragraph at lines
  ~10–12; the first two paragraphs of `changeset init` boilerplate stay
  byte-identical).
- **Sections-scope** (design §8.3): rewrite only the final project-specific
  paragraph. New substance: **no registry publish** (the package is `private`),
  **but** releases are **CI-driven** — merging the "Version Packages" PR creates
  a `v<version>` git tag and a GitHub Release. Cross-link the README's "Changelog
  and versioning" section and `CONTRIBUTING.md`. Note this file is the
  changesets cheat-sheet created once by `changeset init` and **not** regenerated
  by `changeset version` (it has been hand-customized, so editing is safe and
  won't be clobbered).
- **Depends on:** Code Task 7 (release workflow) for accuracy; Doc Task 1 (for
  the CONTRIBUTING cross-link) and Doc Task 2 (for the README section it links).
- **Traces to:** Spec R19 (third stale surface); Design §8.3, ST2.
- **Acceptance:**
  - `.changeset/README.md` no longer states "no git tags" or "no release CI" and
    no longer says a maintainer runs the version step locally as the release.
  - It states the package is private (no registry publish) **but** releases are
    CI-driven, producing a `v<version>` tag + GitHub Release on merge of the
    Version Packages PR, and cross-links the README section and `CONTRIBUTING.md`.
  - The two upstream `changeset init` boilerplate paragraphs are unchanged.

### Doc Task 4: Repoint the `AGENTS.md` changeset pointer

- **Goal:** Update the changeset rule's pointer in `AGENTS.md` so it directs
  authors to `CONTRIBUTING.md` (the new authoritative home) rather than the
  README; the rule text itself stays accurate.
- **Audience:** Agents and contributors reading the shared cross-agent project
  instructions.
- **Files:** `AGENTS.md` (the changeset bullet, currently line 8 — only the
  trailing pointer "See the README's changelog and versioning section for how to
  author one.").
- **Sections-scope** (design §8.3): change **only** the pointer to
  `[CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset)`.
  Optionally also point the bump-type guidance at
  `[CONTRIBUTING.md#pre-10-policy](./CONTRIBUTING.md#pre-10-policy)` (the
  pre-1.0 policy). The rest of the bullet (the changeset rule, the semver
  bump-type summary, and the README-update rule above it) stays accurate and
  unchanged.
- **Depends on:** Doc Task 1 (the `CONTRIBUTING.md` `#adding-a-changeset` and
  `#pre-10-policy` anchors must exist before linking to them).
- **Traces to:** Spec R20 (pointer to the authoritative mechanics); Design §8.3,
  invariant J7 (the optional `#pre-10-policy` link must match Task 1's heading).
- **Acceptance:**
  - The `AGENTS.md` changeset bullet points at
    `./CONTRIBUTING.md#adding-a-changeset` (and, if the bump pointer is added,
    `./CONTRIBUTING.md#pre-10-policy`) instead of the README's changelog section.
  - Any anchor referenced resolves to a real heading in the `CONTRIBUTING.md`
    produced by Doc Task 1 (notably `#pre-10-policy` ⇔ the `Pre-1.0 policy`
    heading — invariant J7).
  - The changeset rule text and the README-update rule are otherwise unchanged;
    no npm instructions are introduced.
