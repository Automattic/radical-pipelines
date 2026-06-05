# Docs review — iteration 1: REJECTED

Reviewed the full Phase 5 batch (Doc Tasks 1–4) against `spec.md`, design §8, and
`doc-plan.md`, and against the shipped code on this branch
(`.github/workflows/changeset-gate.yml`, `.github/workflows/release.yml`,
`scripts/validate-changesets.mjs`, `.changeset/config.json`, `package.json`).

Diff base: `df6eb1f..HEAD` over `CONTRIBUTING.md`, `README.md`,
`.changeset/README.md`, `AGENTS.md`.

## Verdict

**REJECTED.** One blocking finding, scoped to **Doc Task 1 (`CONTRIBUTING.md`,
commit 4fc2887)**. Doc Tasks 2, 3, and 4 pass and do **not** need rework.

## Blocking finding — Doc Task 1 (`CONTRIBUTING.md`)

**The required "explanation of the CI gate" is missing, and the only in-text
pointer to it is misdirected.**

- Spec **R20 / AC15** require the documentation to include "an explanation of the
  CI gate". The doc-plan's Doc Task 1 acceptance names this explicitly:
  "the CI gate (shape validator + presence check)".
- `CONTRIBUTING.md` never explains what the gate is or does. The PR-time gate
  shipped in `.github/workflows/changeset-gate.yml` runs **two independent
  checks** on every PR to `trunk` and fails if either fails:
  1. a **shape** check — `node scripts/validate-changesets.mjs` (rejects
     malformed changesets), and
  2. a **presence** check —
     `npx changeset status --since=origin/<base.ref>` (fails when a
     release-relevant change has no changeset).
  None of this — that the gate runs at PR time, that it has these two checks, or
  that it is the `Changeset Gate` workflow — is described anywhere in the file.
  The gate is only mentioned in passing (the validator "fails the gate"; the
  bot-PR exemption; Dependabot "stays gated").
- The "Adding a changeset" intro (line 35) says: "A pull request that touches
  release-relevant files must include a changeset; CI enforces this **(see
  [Release process](#release-process))**." But the `## Release process` section
  (lines 152–177) describes only the *post-merge release* flow (Version Packages
  PR → maintainer merge → `v<version>` tag + GitHub Release). It contains **no**
  description of the PR-time enforcement gate. So the single cross-reference that
  promises to explain enforcement routes the reader to a section that does not
  cover it.

**Required fix (Task 1 only):** add an explicit explanation of the PR-time
changeset gate — name the `changeset-gate.yml` workflow, state it runs on PRs to
`trunk`, and describe its two independent checks (shape validator + presence
check via `changeset status --since`), noting the PR fails if either fails. Then
repoint the line-35 cross-reference at that gate explanation (the current
`#release-process` target is the wrong section for "CI enforces this"). Keep the
bot-PR exemption and Dependabot notes as-is.

## Verified correct (no rework needed)

These were checked against the shipped code and the spec/design/plan and are
accurate:

- **Invariant J7 (load-bearing).** `CONTRIBUTING.md` has a heading titled exactly
  `### Pre-1.0 policy` → GitHub slug `#pre-10-policy`, matching the validator's
  error string verbatim: `scripts/validate-changesets.mjs:153` emits
  `...see CONTRIBUTING.md#pre-10-policy.`. `AGENTS.md`'s
  `./CONTRIBUTING.md#pre-10-policy` and `./CONTRIBUTING.md#adding-a-changeset`
  links both resolve to real `CONTRIBUTING.md` headings (`### Pre-1.0 policy`,
  `## Adding a changeset`). All other internal anchors used in `CONTRIBUTING.md`
  resolve (`#release-process`, `#bump-types`, `#empty-changesets`,
  `#manual-release-escape-hatch`, `#local-github_token`).
- **No-npm invariant (R2/AC1/AC15).** No doc introduces npm-publish, OIDC/
  id-token/trusted-publishing, rollback/unpublish/dist-tag, or
  `npm publish --dry-run`. The only npm commands shown are `npm ci`, `npm test`,
  and `npm run release:version`. All `npm publish` mentions are negative claims
  ("no `npm publish` anywhere", "no npm trusted-publisher to configure").
- **Tag form.** Documented as `v<version>` (bare, not the scoped
  `@automattic/...@<version>` form) across all surfaces, matching design §4/ST2
  (spec N5 prose is stale, per the doc-plan).
- **Allowlist accuracy.** `CONTRIBUTING.md`'s required/excluded lists match
  `.changeset/config.json` `changedFilePatterns` exactly (`skills/**`,
  `agents/**`, `.claude-plugin/**`, anchored root `package.json`, `README.md`),
  with the documented exclusions and the lockfile-only / internal-only carve-out.
- **CI release flow accuracy.** The documented flow (Version Packages PR →
  human merge → `v<version>` tag via `npx changeset tag` + GitHub Release with
  the `## <version>` changelog entry as the body, default `GITHUB_TOKEN` only,
  no npm, no OIDC, bot pushes don't re-trigger) matches `release.yml`
  (`version: npm run release:version`, `publish: npx changeset tag`,
  `permissions: contents/pull-requests: write`, no id-token).
- **Sync target.** `.claude-plugin/plugin.json` documented as the sole sync
  target in both README and CONTRIBUTING; no `.pi-extension/` introduced.
- **R18 local-token.** `CONTRIBUTING.md` `## Local GITHUB_TOKEN` documents the
  `@changesets/changelog-github` local-token requirement, the gitignored-`.env`
  mechanism, the classic/fine-grained PAT scopes, and states CI cost is zero.
- **R21 prerequisite buckets.** Bucket 1 phrased as "verify enabled (currently
  satisfied)"; Bucket 2 "None"; Bucket 3 optional hardening explicitly not done.
- **Re-run idempotency.** `changeset tag` idempotency and the missing-Release
  backfill edge are documented accurately.

- **Doc Task 2 (`README.md`, a306d40):** "no git tags / no release CI" and
  "operator-run local action" removed; no-npm claim retained; CI-driven flow
  described; `### Adding a changeset` repointed to
  `CONTRIBUTING.md#adding-a-changeset`; sole sync target unchanged; local-token
  note present (line 198). **Passes** (R19/AC14).
- **Doc Task 3 (`.changeset/README.md`, 00e852b):** stale sentence ("no registry
  publish, no git tags, and no release CI: a maintainer runs the version step
  locally") replaced; now states private/no-registry-publish **but** CI-driven,
  producing a `v<version>` tag + Release on Version-PR merge; cross-links the
  README `#changelog-and-versioning` section and `CONTRIBUTING.md`. The two
  upstream `changeset init` boilerplate paragraphs are **byte-unchanged**
  (verified against `df6eb1f`). **Passes**.
- **Doc Task 4 (`AGENTS.md`, 94385ad):** changeset pointer repointed to
  `./CONTRIBUTING.md#adding-a-changeset` plus the optional
  `./CONTRIBUTING.md#pre-10-policy` pre-1.0 link; both anchors resolve; rule and
  README-update text otherwise unchanged; no npm. **Passes** (R20).

## Tasks to re-do

- **Doc Task 1** (`CONTRIBUTING.md`).
