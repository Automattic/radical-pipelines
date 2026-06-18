# Contributing

Thanks for contributing to Radical Pipelines. This guide is the authoritative
home for the release mechanics: when a changeset is required, how to author one,
how the CI gate and the release flow work, and the maintainer procedures
(including the manual escape hatch and recovery steps).

The package `@automattic/radical-pipelines` is **private** and consumed directly
from git — it is **not** published to npm. There is no `npm publish` anywhere in
this project; releases produce a git tag and a GitHub Release only.

## Opening a pull request

When you open a PR, GitHub pre-fills the repo's default template
(`.github/PULL_REQUEST_TEMPLATE.md`) with **What? / Why? / How?** sections, a stub
to link the issue it closes, and a reminder to add a changeset when your change is
release-relevant.

## Running tests and checks locally

```bash
npm test
```

This runs the `node --test 'scripts/test/**/*.test.mjs'` suite (the
`sync-version` and changeset-validator tests). There is no `lint` or `typecheck`
step — this repo has none.

## Versioning policy

The project has a single version. The source of truth is the root
`package.json`'s `version`, which the release version step (`npm run
release:version`) keeps in sync across the other version-bearing locations:
`.claude-plugin/plugin.json` (via `scripts/sync-version.mjs`) and
`package-lock.json`, in its two recorded-version fields — the top-level
`version` and the root package's `packages[""].version`. The package is
`private` and consumed direct-from-git
(a Pi package and a Claude Code plugin served from the repo root), so there is no
registry release — only a `v<version>` git tag and a matching GitHub Release.

## Adding a changeset

We use [changesets](https://github.com/changesets/changesets) to manage version
bumps and the changelog. A pull request that touches release-relevant files must
include a changeset; CI enforces this (see [The changeset gate (CI)](#the-changeset-gate-ci)).

### The changeset gate (CI)

The **Changeset Gate** workflow (`.github/workflows/changeset-gate.yml`) runs on
every pull request to `trunk` and runs **two independent checks**. The PR **fails
if either check fails**:

1. **Shape** — `node scripts/validate-changesets.mjs` validates every staged
   `.changeset/*.md` file (rejecting malformed front matter, unknown bump types,
   and — while pre-1.0 — `major` bumps; see [Pre-1.0 policy](#pre-10-policy)).
2. **Presence** — `npx changeset status --since=origin/<base>` (where `<base>` is
   the PR's base branch) fails when a release-relevant change has no changeset.

The auto-generated `changeset-release/trunk` Version Packages PR is **exempt**
(the job-level `if:` condition skips it), so it does not need a changeset of its
own. Every other PR — including [Dependabot](#dependency-bump-prs) — is gated
normally.

### When a changeset is required

A changeset is required when a PR changes any **release-relevant** path. These
are the `changedFilePatterns` configured in `.changeset/config.json`:

- `skills/**`
- `agents/**`
- `.claude-plugin/**`
- the **root** `package.json` (the pattern is anchored — nested `package.json`
  files do not match)
- `README.md`

Changes that touch **only** the following are **not** release-relevant and need
**no** changeset:

- `website/**`
- `scripts/**`
- `.pi/`
- `.rp/`
- `.changeset/`
- `.github/`
- meta files: `package-lock.json`, `AGENTS.md`, `LICENSE`, `.gitignore`

So a `package-lock.json`-only change (e.g. a dependency lockfile resync) or an
internal-only change (tooling, CI, website) does not require a changeset.

### Bump types

This is the authoritative bump table for the project; other docs point here
rather than restating it.

| Bump    | When to use                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `patch` | Bug fixes and other backwards-compatible changes that don't add features.                                                             |
| `minor` | New features; backwards-compatible additions. **Pre-1.0**, also used for breaking changes (see [Pre-1.0 policy](#pre-10-policy)).     |
| `major` | Breaking changes. **Pre-1.0 this is forbidden** — reserved for the deliberate `1.0.0` cut (see [Pre-1.0 policy](#pre-10-policy)).     |
| `none`  | No version bump. Use the empty changeset for prose-only edits to a release-relevant file (see [Empty changesets](#empty-changesets)). |

### Pre-1.0 policy

While the project version is still in the `0.x` series (the `version` starts with
`0.`), the usual semver mapping is shifted down one level:

- **Breaking change** → `minor`, with a `BREAKING:` prefix on the changeset
  summary. **Never `major`** — the changeset validator hard-rejects a `major`
  bump while pre-1.0.
- **Feature** → `minor`.
- **Fix** → `patch`.

`major` is reserved for the deliberate `1.0.0` cut. When the project is ready for
`1.0.0`, a maintainer hand-writes the `1.0.0` changelog entry and removes the
pre-1.0 guard from the validator; only then does `major` become valid.

If you submit a `major` changeset while pre-1.0, the validator fails the gate
with a message pointing back to this section.

### How to add a changeset

From the repo root:

```bash
npx changeset
```

Pick the bump type (per the [bump table](#bump-types) and the
[pre-1.0 policy](#pre-10-policy)) and write a one-line summary. This generates a
file under `.changeset/`. Commit that `.changeset/*.md` file together with your
change.

### Empty changesets

For a prose-only edit to an otherwise release-relevant file — for example fixing
a typo in `README.md` — that should **not** trigger a version bump, add an empty
changeset:

```bash
npx changeset --empty
```

This writes a changeset whose body is just the empty front matter (`---\n---\n`).
The validator accepts this canonical-empty form, and `changeset version` consumes
it without bumping the version. This satisfies the CI gate's
"a changeset is present" requirement without producing a release.

### Summary format conventions

Write changeset summaries in the imperative mood. For a **breaking** change while
pre-1.0, prefix the summary with `BREAKING:` — for example:

```
BREAKING: rename the `--phase` flag to `--step`
```

The `BREAKING:` prefix is the convention that surfaces the breaking nature of a
change in the changelog even though the bump is `minor` (per the
[pre-1.0 policy](#pre-10-policy)).

### What this looks like in CHANGELOG.md

The changelog is generated with `@changesets/changelog-github`, so each entry is
enriched with links to the originating pull request and commit, plus author
attribution — for example:

```markdown
## 0.2.0

### Minor Changes

- [#42](https://github.com/Automattic/radical-pipelines/pull/42)
  [`abc1234`](https://github.com/Automattic/radical-pipelines/commit/abc1234)
  Thanks [@contributor](https://github.com/contributor)! - Add the new phase.
```

These enriched entries also become the body of the corresponding GitHub Release.

## Release process

Releases are driven by CI (`.github/workflows/release.yml`), with **no npm**
publishing anywhere. The flow:

1. **Pending changesets land on `trunk`.** When a PR with changesets is merged to
   `trunk`, the Release workflow runs.
2. **CI opens/updates the "Version Packages" PR.** With pending changesets, the
   workflow runs `npm run release:version`, which bumps the version, regenerates
   `CHANGELOG.md`, syncs `.claude-plugin/plugin.json`, and reconciles
   `package-lock.json` so its two recorded-version fields match the bumped
   version. The result is pushed to the `changeset-release/trunk` branch and
   surfaced as a "Version Packages" pull request.
3. **A maintainer reviews and merges** the Version Packages PR.
4. **CI creates the tag and Release.** The human merge of the Version PR is what
   advances the flow: the next run creates the `v<version>` git tag (via
   `npx changeset tag`) and the GitHub Release, whose body is the `## <version>`
   entry from `CHANGELOG.md`.

The release workflow uses only the default `GITHUB_TOKEN`. The bot's own pushes
(the version-bump commit, the tag push) do **not** re-trigger the workflow; only
the human merge of the Version Packages PR advances the flow to the tag/Release
step. There is no auto-merge and no loop.

> **CI token cost is zero.** The Release workflow injects `secrets.GITHUB_TOKEN`,
> which `@changesets/changelog-github` uses to enrich the changelog. No extra
> setup or secret is needed in CI.

## Manual release escape hatch

If you ever need to cut a release locally (CI being unavailable, etc.), this
procedure produces the **same** `v<version>` tag and changelog-bodied GitHub
Release as CI. There is **no npm publish** anywhere in it.

Prerequisites: a clean `trunk` working tree, `gh` authenticated, and a
`GITHUB_TOKEN` exported — `@changesets/changelog-github` throws without it.
`changelog-github` calls `dotenv` at load, so a gitignored `.env` containing
`GITHUB_TOKEN=…` works equally well (see [Local GITHUB_TOKEN](#local-github_token)).

```bash
# 0. On a clean trunk, gh authenticated, GITHUB_TOKEN set.
git checkout trunk && git pull --ff-only
npm ci
export GITHUB_TOKEN=<token>          # or place it in a gitignored .env

# 1. Consume changesets: bump version, regenerate CHANGELOG, sync plugin.json,
#    and reconcile package-lock.json's recorded version — all in one command,
#    nothing edited by hand. Inspect the result; run `git restore .` to abort.
npm run release:version

# 2. Commit the bump (config is commit:false, so this is manual) and push.
git commit -am "Version Packages"
git push origin trunk

# 3. Create the tag (idempotent — a no-op if it already exists) and push it.
npx changeset tag
git push origin "v$(node -p "require('./package.json').version")"

# 4. Create the GitHub Release with the top "## <version>" CHANGELOG section
#    as the body, to match CI's per-version Release body.
gh release create "v$(node -p "require('./package.json').version")" \
  --title "v$(node -p "require('./package.json').version")" \
  --notes-file <(...the top "## <version>" section of CHANGELOG.md...)
```

This yields the same `v<version>` tag + Release that CI would. **No npm publish
is involved at any step.**

## "I forgot a changeset" recovery

If a PR that should have had a changeset was merged without one, just add the
changeset in a follow-up PR. The bump it describes will be folded into the next
release's Version Packages PR.

## Re-running a failed release

If the Release workflow fails, re-run the job. `npx changeset tag` is
**idempotent**: if the `v<version>` tag already exists, it is a no-op.

**Edge case:** re-running will **not** backfill a missing GitHub Release for a tag
that already exists. If the tag was created but the Release was not, create it
manually:

```bash
gh release create v<version> --notes-file <entry>
```

where `<entry>` is a file containing the `## <version>` section of
`CHANGELOG.md`.

## Dependency-bump PRs

Dependabot pull requests remain **gated** like any other PR — if they touch a
release-relevant path they need a changeset. The gate's bot-PR exemption is
scoped to the `changeset-release/trunk` branch only (the auto-generated Version
Packages PR), so it does not exempt Dependabot.

## Repo configuration prerequisites

These are the GitHub repository settings the release automation depends on. They
are grouped into three buckets.

### Bucket 1 — verify enabled (currently satisfied)

- **"Allow GitHub Actions to create and approve pull requests"** (Settings →
  Actions → General → Workflow permissions). This is **currently enabled**; verify
  it stays enabled. It lets the Release workflow open the Version Packages PR.
- The bot can push the `changeset-release/trunk` branch because `trunk` is
  currently **unprotected**, so no branch allowance is needed today.

### Bucket 2 — must-do for the happy path

**None.** The release flow works with no further repo-settings changes. There is
no npm trusted-publisher to configure and no blocking PR setting to flip.

### Bucket 3 — optional hardening (documented, not done)

These are optional and are deliberately **not** applied as part of this work
(branch protection is a repository setting, not a code change):

- **Branch protection on `trunk`** with required reviews and the Changeset Gate as
  a **required status check**. If adopted:
  - Allow `github-actions[bot]` to push `changeset-release/trunk`.
  - Keep human review on the Version Packages PR; prohibit self-approval.
  - The gate's bot-PR exemption (the job-level `if:` already shipped in
    `changeset-gate.yml`) becomes mandatory — and it already handles this: a job
    skipped by a conditional reports its status as **Success**, so the skipped
    Version-PR gate run does not block the required check. No extra work is needed.
- Optionally, the `@changesets/bot` GitHub App can be installed to leave
  **non-blocking** educational comments on PRs about changesets. It **complements**
  the gate; it does not replace it.

## Local GITHUB_TOKEN

Any **local** `npm run release:version` (or the
[manual release escape hatch](#manual-release-escape-hatch)) needs a
`GITHUB_TOKEN`, because `@changesets/changelog-github` requires it to fetch PR,
commit, and author metadata — without it, it throws. `changelog-github` calls
`dotenv` at module load, so a gitignored `.env` file containing
`GITHUB_TOKEN=…` is the easiest mechanism (both `.env` and `.env.local` are
gitignored).

Because this is a **private** repository, the token needs read access to private
content:

- **Classic PAT:** `repo` + `read:user`.
- **Fine-grained PAT** (scoped to this repo): Contents: Read, Pull requests: Read,
  Metadata: Read.

**CI cost is zero:** the Release workflow injects `secrets.GITHUB_TOKEN`
automatically, so none of this local setup is needed for CI runs.
