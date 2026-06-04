# Automate releases with GitHub Actions (changeset gate + release workflow)

> Source: GitHub issue [Automattic/radical-pipelines#83](https://github.com/Automattic/radical-pipelines/issues/83).
> This document is the self-contained prompt for the pipeline. It captures the raw request as the owner framed it. The assumptions and directions below are the owner's current thinking, explicitly open for the later phases to confirm or revise through their own research — they are not settled requirements or design decisions.

## Goal

Release-relevant changes flow automatically from changesets into a version bump, a generated `CHANGELOG.md`, a git tag, and a GitHub Release — driven by CI rather than hand edits. A CI gate on pull requests reminds contributors to include a changeset when they touch release-relevant code and rejects malformed changesets before they reach a release.

## Constraints

- This package is `private` and is **not** published to npm (it's consumed via git source / Pi package). The release process must not include npm publishing or npm OIDC/trusted-publishing.
- The existing version-sync step (`scripts/sync-version.mjs`, wired through the `release:version` script) must keep working, so the bumped version continues to propagate to `.claude-plugin/plugin.json` and `.pi-extension/package.json`.
- Build on the changeset setup already in the repo (`.changeset/config.json`, `@changesets/cli`); don't re-litigate that foundation.

## Context

- Model this on skillsmith PR #41 (https://github.com/Automattic/skillsmith/pull/41), which set up the equivalent automation there. We want to copy its GitHub Actions + release-process pieces, adapted to this repo.
- The changeset/changelog foundation already landed via #81 (PR #82). This issue is the follow-up that adds the CI + release automation on top.

## Assumptions / directions to explore

_(open — to confirm or revise in later phases)_

- Port the two workflows (`changeset-gate.yml`, `release.yml`), the `validate-changesets` shape validator + tests, and `CONTRIBUTING.md` from skillsmith, adapting `release.yml` to the no-npm / GitHub-Release-only flow.
- The release flow likely needs the changesets config's `privatePackages` tagging behavior revisited (currently `tag: false`) so tags/GitHub Releases are produced.
- Adopting `@changesets/changelog-github` (richer changelog entries with PR links) may be worth it, vs. the current plain `@changesets/cli/changelog`.
- Maintainer prerequisites will likely apply (e.g. "Allow GitHub Actions to create and approve pull requests", branch-protection rules permitting `github-actions[bot]` to push the release branch).

### Proposed changeset-required paths (`changedFilePatterns`)

The skillsmith setup used a path allowlist deciding which changes require a changeset. This repo's layout differs, so it was reworked from scratch against the current root-served structure. Proposed starting point (phase 1/2 to confirm):

```json
"changedFilePatterns": [
  "skills/**",
  "agents/**",
  ".claude-plugin/**",
  "package.json",
  "README.md"
]
```

Rationale — the consumer-facing surface, served from the repo root via two channels:

- **Pi package** (`pi install git:…`): `package.json`'s `pi.skills = ["skills"]` ships `skills/**`; dependencies and wiring live in `package.json`.
- **Claude Code plugin** (`.claude-plugin/`, source `./`): ships `agents/**`, `skills/**`, and the `.claude-plugin/` manifests.
- `README.md` is the primary consumer docs (and `AGENTS.md` already mandates README track every code change).

Deliberately **excluded as internal / non-shipped**:

- `.rp/pipelines/**` — pipeline run artifacts (spec/design/plan docs).
- `.changeset/**` — the changeset machinery itself.
- `.github/**` — CI workflows.
- `scripts/**` — release/dev tooling and its tests (`sync-version.mjs`, `scripts/test/`).
- `website/**` — the marketing site, deployed separately via `deploy-website.yml`; not part of the installable package.
- Meta / config: `.rp.md`, `.pi/settings.json`, `package-lock.json`, `AGENTS.md`, `LICENSE`, `.gitignore`. (`package-lock.json` is excluded on purpose: lockfile-only churn shouldn't force a changelog entry — meaningful dependency intent already surfaces through `package.json`.)

No `!`-negations are needed (unlike skillsmith's `!src/__tests__/**`): there are no tests nested inside the product dirs; tests live under `scripts/test/`, already excluded by omission.

### Open wrinkle: gate vs. the Version Packages PR

The Changesets "Version Packages" PR auto-edits `package.json` and `.claude-plugin/plugin.json` (via `sync-version.mjs`) — both in the allowlist above — while consuming the changeset files. So the changeset gate could fire on the bot's own release PR. The design phase needs to resolve this interaction (e.g. exempt the `changeset-release/*` bot branch from the gate). It doesn't change the pattern list, but it's why tracking `.claude-plugin/**` and `package.json` warrants the note.
