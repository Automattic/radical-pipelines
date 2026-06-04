# Spec — Automate releases with GitHub Actions (changeset gate + release workflow)

## Overview

The `@automattic/radical-pipelines` repository already has a changeset
foundation (`.changeset/config.json`, `@changesets/cli`, and a
`release:version` script that bumps the version and propagates it to
`.claude-plugin/plugin.json` via `scripts/sync-version.mjs`). Today, cutting a
release is a manual, operator-run local action: there are no git tags, no GitHub
Releases, and no release CI. Recording a changeset is enforced only by social
convention.

This work adds CI-driven release automation on top of that foundation so that
release-relevant changes flow automatically — without hand edits — from
changesets into a version bump, a generated `CHANGELOG.md`, a git tag, and a
GitHub Release. It also adds a pull-request gate that reminds contributors to
include a changeset when they touch release-relevant code and that rejects
malformed changesets before they can reach a release.

The package is `private` and is consumed directly from git source (as a Pi
package and as a Claude Code plugin served from the repository root). It is
**not** published to npm. Accordingly, the release process must contain no npm
publishing and no npm trusted-publishing/OIDC of any kind — only git tags and
GitHub Releases.

The end-to-end flow this work establishes:

1. A contributor opens a pull request. If they changed release-relevant code,
   the gate requires a valid changeset; malformed changesets are rejected.
2. After the PR merges to `trunk`, CI automatically opens or updates a "Version
   Packages" pull request that bumps the version, regenerates `CHANGELOG.md`,
   and propagates the version to the plugin manifest.
3. A maintainer reviews and merges that Version Packages PR.
4. CI then automatically creates the git tag and the corresponding GitHub
   Release, with the changelog entry as the release body.

No npm registry is involved at any step.

## Requirements

Requirements are expressed as observable outcomes. "MUST" = required for this
work to be considered done. "SHOULD" = strongly recommended with a noted
fallback.

### Scope and constraints

- **R1 (MUST).** Release-relevant changes flow, driven by CI rather than hand
  edits, from changesets → version bump → generated `CHANGELOG.md` → git tag →
  GitHub Release. A pull-request changeset gate accompanies this flow.
- **R2 (MUST — no npm, ever).** The release process MUST NOT publish to npm and
  MUST NOT use npm trusted-publishing or OIDC. No workflow requests an OIDC
  identity token. Only git tags and GitHub Releases are produced.
- **R3 (MUST — preserve version sync).** The existing `release:version` behavior
  is preserved unchanged: bumping the version continues to propagate to
  `.claude-plugin/plugin.json` (the sole sync target). The release process MUST
  NOT add or require a `.pi-extension/` manifest — no such path exists in the
  repository, and the original request's mention of it is stale.
- **R4 (MUST).** Build on the existing changeset configuration and tooling; the
  changeset foundation itself is not re-opened or reworked beyond the specific
  configuration changes called for below.

### Changeset gate (pull-request time)

- **R5 (MUST).** A pull request targeting `trunk` runs a changeset gate. The
  gate has access to enough git history to compare the PR head against its base
  branch.
- **R6 (MUST).** The gate performs two independent checks, and the PR check
  fails if either fails:
  - (a) a changeset **shape** check that rejects malformed changeset files; and
  - (b) a changeset **presence** check that fails the PR when a release-relevant
    change has no accompanying changeset.
- **R7 (MUST — gate must actually enforce).** The presence check MUST detect a
  release-relevant change to the (private) package that lacks a changeset and
  fail the PR. This means the configuration MUST be set such that the private
  package is not silently skipped by the presence check. If the package were
  skipped, the gate would always pass and provide no protection; the
  configuration MUST preserve the invariant that keeps the gate effective.
- **R8 (MUST — release-relevant surface).** "Release-relevant" is defined by an
  allowlist of paths that constitute the consumer-facing, shipped surface of the
  package. The allowlist is exactly:
  - `skills/**`
  - `agents/**`
  - `.claude-plugin/**`
  - `package.json` (matching only the root `package.json`, NOT
    `package-lock.json` and NOT any nested `package.json`)
  - `README.md`

  The following are deliberately treated as internal / non-shipped and are NOT
  release-relevant: `website/**` (deployed separately), `scripts/**` (release
  and dev tooling plus its tests), `.pi/`, `.rp/`, `.changeset/`, `.github/`,
  and meta files (`.rp.md`, `package-lock.json`, `AGENTS.md`, `LICENSE`,
  `.gitignore`). A change confined to these paths does not require a changeset.
- **R9 (SHOULD — exempt the release PR from the gate).** The automatically
  generated "Version Packages" PR (which edits `package.json` and
  `.claude-plugin/plugin.json` while consuming the changesets, leaving zero
  changesets) MUST NOT be failed by the gate. The exemption is scoped to that
  release PR only; other automated PRs (e.g. Dependabot) remain gated. Fallback:
  the exemption is not strictly required while the gate is advisory (trunk
  unprotected), but it is recommended to ship it to avoid a confusing failing
  check on the release PR and to future-proof making the gate a required check.

### Changeset shape validator

- **R10 (MUST — dependency-free).** The shape validator and its tests are
  dependency-free Node ESM (`.mjs`), using only built-in Node modules, matching
  the existing `scripts/sync-version.mjs` convention. No new runtime/dev
  dependencies (such as a TypeScript runner or a YAML parser) are introduced for
  the validator.
- **R11 (MUST — what the validator accepts and rejects).** For each changeset
  file under `.changeset/` (excluding the `.changeset/README.md` cheat-sheet),
  the validator enforces, in order:
  1. **Front-matter fences.** The file must have opening and closing `---`
     fences (tolerating CRLF line endings). A missing or unterminated fence is
     an error pointing at line 1.
  2. **Canonical empty changeset is valid.** A changeset whose front matter and
     body are both empty (the output of the `--empty` escape hatch) is accepted.
  3. **Non-empty body required otherwise.** A changeset that has front matter
     but an empty summary body is an error.
  4. **Front matter must be a mapping.** Front matter that does not parse as a
     key→value mapping is an error.
  5. **Each entry is valid.** Each `package: bump` entry must name the actual
     package (`@automattic/radical-pipelines`) — any other name is an error —
     and the bump must be one of `patch`, `minor`, `major`, `none` — any other
     value is an error. While the package is pre-1.0 (version starts with `0.`),
     a `major` bump is forbidden and produces an error that references the
     project's pre-1.0 policy documentation.

  Errors are reported per file with a line reference and cause a non-zero exit;
  a fully valid set of changesets exits zero. The validator must accept both
  bare and quoted package-name keys in front matter.
- **R12 (MUST — tests).** The validator has automated tests (using Node's
  built-in test runner, like the existing `sync-version` test) covering at
  least: a valid `minor` changeset; the canonical empty changeset (with and
  without a trailing newline); a missing closing fence; an invalid bump value; a
  wrong package name; a front-matter-present-but-empty-body case; a pre-1.0
  `major` rejection and a `major` accepted when the version is `1.0.0`;
  CRLF-formatted input accepted; bare-vs-quoted front-matter keys; and a
  command-line smoke test asserting non-zero exit on a bad changeset and zero
  exit on a good one.

### Release automation (post-merge to `trunk`)

- **R13 (MUST — Version Packages PR).** After a change with a pending changeset
  lands on `trunk`, CI automatically opens or updates a "Version Packages" pull
  request that runs the existing `release:version` step — i.e. it bumps the
  version, regenerates `CHANGELOG.md`, and propagates the version to
  `.claude-plugin/plugin.json`.
- **R14 (MUST — tag and Release on merge).** When the Version Packages PR is
  merged to `trunk` (changesets consumed, version bumped), CI automatically
  creates the git tag for the new version and the corresponding GitHub Release,
  with the new version's changelog entry as the Release body. This MUST work for
  the private package (the configuration MUST permit tagging the private
  package). The release process MUST NOT depend on an npm publish step to
  produce the tag or Release. Re-running on a state where the tag already exists
  is a safe no-op (no duplicate tag/Release, no failure).
- **R15 (MUST — least privilege, no OIDC).** The release automation runs with
  exactly the permissions it needs to push the version-bump commit, push the
  tag, create the GitHub Release, and open the Version Packages PR — and no
  more. It MUST NOT request an OIDC identity-token permission.
- **R16 (SHOULD — live CI trigger).** The release automation is active on pushes
  to `trunk` from the moment this work lands, so the flow is genuinely
  CI-driven. (Manual triggering may additionally be supported.) Fallback:
  manual-only triggering is acceptable but leaves the release effectively
  non-automated, contrary to the goal, so live triggering is recommended.
- **R17 (MUST — no infinite loop, no extra credentials).** The release
  automation MUST NOT infinitely re-trigger itself. Automated (bot) pushes do
  not re-trigger the workflow; only the human merge of the Version Packages PR
  advances the flow to the tag/Release step. The flow MUST work with the
  default workflow credentials — no personal access token or GitHub App token is
  required.

### Changelog quality

- **R18 (SHOULD — richer changelog entries).** Generated changelog entries (and
  therefore the GitHub Release bodies derived from them) SHOULD include pull-
  request links, commit links, and author attribution. In CI this requires no
  additional setup beyond the standard workflow token. The cost of this choice:
  running the version step **locally** then requires a GitHub token in the
  environment; if a richer changelog is adopted, the documentation MUST state
  this local-token requirement. Fallback: keep the plain (offline, no-token)
  changelog generator if the local-token friction is judged unacceptable.

### Documentation (deliverable)

- **R19 (MUST — README).** The README's "Changelog and versioning" section is
  updated so it no longer states that releases are an operator-run local action
  with no git tags and no release CI. It instead describes the new CI-driven
  flow (contributor changesets → Version Packages PR → maintainer merge → CI tag
  + GitHub Release), still with no npm involved.
- **R20 (MUST — contributor/maintainer docs).** The new contributor and
  maintainer mechanics are documented: when a changeset is required (and the
  `--empty` escape hatch for prose-only edits to an otherwise release-relevant
  file such as `README.md`), bump-type guidance, the pre-1.0 policy (reachable
  via the documentation anchor the validator's error message references), how to
  author a changeset, an explanation of the CI gate, the release process, the
  maintainer prerequisites (R21), and a no-npm manual release escape hatch for
  when CI is unavailable. The documentation must not introduce npm-specific
  release/recovery instructions. (Whether this lives in a new `CONTRIBUTING.md`
  or in existing docs is a design decision; the content is required either way.)
- **R21 (MUST — document prerequisites; do not enforce).** The maintainer
  prerequisites are documented (not enforced by this work, since some are GitHub
  repository settings a code change cannot make):
  - Already satisfied (state as "verify enabled; currently satisfied"): GitHub
    Actions is allowed to create and approve pull requests; the bot can push the
    release branch (trunk is currently unprotected).
  - Required for the happy path to work: none.
  - Optional hardening (documented, explicitly not done here): branch protection
    on `trunk` with required reviews and the gate as a required status check;
    if adopted, allow the Actions bot to push the release branch, keep human
    review on the Version Packages PR, prohibit self-approval, and the gate
    exemption (R9) then becomes mandatory. An optional changeset bot app for
    non-blocking educational PR comments may also be mentioned.

### First release / bootstrapping

- **R22 (MUST-aware).** There is currently no `CHANGELOG.md` and there are
  pending minor changesets. The first release creates `CHANGELOG.md` fresh and
  bumps `0.1.1` → `0.2.0`, with the pending entries collected under the `0.2.0`
  heading, and the first GitHub Release body is that entry. No pre-seeded
  changelog is required for the first release to succeed. (If the richer
  changelog of R18 is adopted, the first version run in particular must have a
  GitHub token present — which CI provides.)

## Out of Scope

- **N1.** npm publishing, npm OIDC/trusted-publishing, provenance, and any npm
  registry operations or rollback — excluded entirely (R2).
- **N2.** Changing what `scripts/sync-version.mjs` targets, or adding a
  `.pi-extension/` manifest — the sole sync target stays
  `.claude-plugin/plugin.json` (R3); the original mention of `.pi-extension/` is
  stale.
- **N3.** Enabling or modifying branch protection / required status checks as
  part of this work — these are repository settings a code change cannot make;
  they are documented as optional maintainer hardening only (R21).
- **N4.** Re-opening or reworking the existing changeset foundation beyond the
  specific configuration changes this spec requires (R4).
- **N5.** Custom `vX.Y.Z` tag naming — tag naming follows whatever the standard
  tagging step produces for this package; producing a different tag name format
  is not required (and is the one open naming decision deferred to design).

## Acceptance Criteria

1. **No npm anywhere.** No workflow, script, or configuration introduced by this
   work performs an npm publish or requests an OIDC identity token. (Verifies
   R2, R15, N1.)
2. **Version sync preserved.** Running the version-bump step still updates the
   version in `.claude-plugin/plugin.json` and updates no `.pi-extension/`
   manifest (none exists). (Verifies R3, N2.)
3. **Gate fails on a missing changeset.** A pull request to `trunk` that changes
   a release-relevant path (e.g. under `skills/`, `agents/`, `.claude-plugin/`,
   the root `package.json`, or `README.md`) with no changeset fails the gate's
   presence check. (Verifies R5, R6b, R7, R8.)
4. **Gate passes on internal-only changes.** A pull request that changes only
   non-shipped paths (e.g. only `website/**`, `scripts/**`, `.github/**`, or a
   meta file) with no changeset passes the gate's presence check. (Verifies R8.)
5. **Lockfile churn alone does not require a changeset.** A PR that changes only
   `package-lock.json` is not failed by the presence check. (Verifies R8's
   anchored `package.json` matching.)
6. **Gate rejects malformed changesets.** The shape check fails a PR containing a
   changeset with: a missing/unterminated fence; an unknown package name; an
   invalid bump value; front matter present but an empty body; or a `major` bump
   while the package is pre-1.0. (Verifies R6a, R11.)
7. **Gate accepts well-formed changesets.** The shape check passes for a valid
   `minor` changeset, for the canonical empty changeset (with and without a
   trailing newline), for CRLF-formatted input, and for both bare and quoted
   front-matter keys. (Verifies R11.)
8. **Validator is dependency-free and tested.** The validator and its tests run
   with built-in Node only (no new TS runner or YAML dependency) and the test
   suite covers the cases in R12 and passes. (Verifies R10, R12.)
9. **Version Packages PR is opened automatically.** After a change with a
   pending changeset lands on `trunk`, a "Version Packages" PR is opened/updated
   that bumps the version, regenerates `CHANGELOG.md`, and updates the plugin
   manifest version. (Verifies R13.)
10. **Tag and Release are created on merge.** Merging the Version Packages PR
    results in a git tag for the new version and a GitHub Release whose body is
    that version's changelog entry — produced without any npm publish — for the
    private package. Re-running when the tag already exists changes nothing and
    does not error. (Verifies R14.)
11. **No self-perpetuating loop, default credentials only.** Bot pushes do not
    re-trigger the workflow; only the human merge advances it to the tag/Release
    step; the flow works without any PAT or GitHub App token. (Verifies R17.)
12. **Release PR is not blocked by the gate.** The automatically generated
    "Version Packages" PR does not show a failing changeset gate; other
    automated PRs (e.g. Dependabot) remain gated. (Verifies R9.)
13. **Changelog entries are rich (if R18 adopted).** Generated changelog entries
    and GitHub Release bodies include PR links, commit links, and author
    attribution; the local-token requirement is documented. (Verifies R18.)
14. **README updated.** The README's "Changelog and versioning" section no
    longer claims "no git tags / no release CI" and instead documents the new
    CI-driven, no-npm flow. (Verifies R19.)
15. **Contributor/maintainer mechanics documented.** Documentation explains when
    a changeset is required and the `--empty` escape, bump guidance, the pre-1.0
    policy at the anchor the validator references, how to author a changeset, the
    CI gate, the release process, the no-npm manual release escape hatch, and the
    maintainer prerequisite buckets (with already-satisfied items phrased as
    "verify enabled"). No npm-specific release/recovery instructions appear.
    (Verifies R20, R21.)
16. **First release bootstraps cleanly.** The first release creates
    `CHANGELOG.md` fresh, bumps to `0.2.0`, collects the pending entries under
    `0.2.0`, and produces a GitHub Release body from that entry, with no
    pre-seeding required. (Verifies R22.)
17. **CI-driven from landing (if R16 shipped live).** The release automation is
    active on pushes to `trunk` once this work lands, satisfying the
    "driven by CI rather than hand edits" goal. (Verifies R1, R16.)
