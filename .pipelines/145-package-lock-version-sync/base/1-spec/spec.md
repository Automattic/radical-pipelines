# Spec: Keep package-lock version in sync with package.json automatically

## Overview

The repository version is recorded in three files: `package.json` (the source of truth), `.claude-plugin/plugin.json`, and `package-lock.json`. The release version step bumps `package.json` and propagates the version to `plugin.json`, but nothing updates `package-lock.json`. As a result the lockfile's recorded version has drifted: `package.json` and `plugin.json` are at `0.4.0` while `package-lock.json` records `0.1.1` in both of the spots it carries the version. The dependency tree itself is in sync — only the lockfile's root version is stale — and no existing CI gate catches this kind of drift, so it accumulated silently across version bumps and ships verbatim in the published git tag / GitHub Release.

This feature corrects the current drift, makes the release process keep the lockfile's version in sync automatically on every bump (so the same drift cannot recur), and adds a check that detects version drift across the three files so any future divergence is caught before it merges rather than only being overwritten on the next release.

## Requirements

The version source of truth is `package.json`'s `version` field. `package-lock.json` records the version in exactly two places: the top-level `.version` field and the root self-entry `.packages[""].version` field.

### Correcting the current drift

1. `package-lock.json`'s top-level `.version` field equals `package.json`'s `version`.
2. `package-lock.json`'s `.packages[""].version` field (the root self-entry) equals `package.json`'s `version`.
3. Correcting these two version fields leaves the rest of `package-lock.json` unchanged: `lockfileVersion`, the dependency tree, entry ordering, indentation, and the trailing newline are all preserved — the only changed content is the two version values.
4. `.claude-plugin/plugin.json`'s `version` continues to equal `package.json`'s `version` (existing behavior, preserved).

### Keeping it in sync automatically

5. Running the release version step (`npm run release:version`) leaves `package-lock.json`'s two version fields equal to the bumped `package.json` version, with no further manual action required.
6. The automatic sync is idempotent: running the release version step when the versions already match produces no change to `package-lock.json`.
7. When the dependency tree is already in sync, the automatic sync changes only the two version fields of `package-lock.json` and introduces no other churn (no change to `lockfileVersion`, the dependency tree, entry ordering, indentation, or trailing newline).
8. The automatic sync succeeds without requiring network access beyond what the release flow already needs; it does not depend on registry availability to update the lockfile version.
9. After a release version bump, the auto-committed "Version Packages" pull request includes the updated `package-lock.json` alongside `package.json`, `plugin.json`, and the changelog, so the synced lockfile reaches `trunk` and the published git tag / GitHub Release.

### Preventing regression (drift detection)

10. A check exists that, given the repository, reports whether `package.json`'s version matches both `package-lock.json` version fields and `.claude-plugin/plugin.json`'s version. When any of them diverge it fails with a non-zero exit status and a clear message identifying the mismatched file and field.
11. The drift check runs in CI on pull requests to `trunk`, so a future drift is caught before merge rather than only being overwritten on the next release.

### Quality / convention

12. The new or changed version-sync logic is covered by automated tests that assert the sync result and the preservation of file formatting, and the full test suite passes.
13. Any new or changed version logic follows the repository's existing script conventions for testability and self-containment (no new external runtime dependencies, no network dependency for the sync itself).

## Out of Scope

- Validating or modifying the `package-lock.json` dependency tree itself; the tree is already in sync and only the root version field is stale.
- Adding an npm-registry publish step; the package is `private` and is distributed via git tag / GitHub Release, not the npm registry.
- Syncing the version into any file beyond the three confirmed version-bearing files (`package.json`, `package-lock.json`, `.claude-plugin/plugin.json`); no other repository file carries this package's version.
- Choosing the implementation mechanism for the automatic sync (e.g. refreshing the lockfile via npm versus patching the version fields directly); the spec constrains the observable outcome and leaves the mechanism to the design phase.

## Acceptance Criteria

- Given the repository in its current drifted state (`package.json` at a version that differs from the lockfile), when the version is brought back into sync, then `package-lock.json`'s top-level `.version` and `.packages[""].version` both equal `package.json`'s `version`.
- Given the current drift is corrected, when `package-lock.json` before and after are compared, then the only difference is the two version values; `lockfileVersion`, the dependency tree, entry ordering, indentation, and the trailing newline are unchanged.
- Given a pending version bump where `package.json` is raised to a new version, when the release version step (`npm run release:version`) runs, then afterward `package-lock.json`'s two version fields equal the new `package.json` version with no manual follow-up.
- Given `package.json`, `package-lock.json`, and `.claude-plugin/plugin.json` already record the same version, when the release version step runs, then `package-lock.json` is unchanged (the sync is idempotent).
- Given a version bump where the dependency tree is already in sync, when the release version step runs, then `package-lock.json` shows changes only to the two version fields and no other churn.
- Given a release runs in the CI flow, when the release version step executes, then the lockfile version sync completes successfully without depending on registry availability beyond what the release already requires.
- Given a release version bump produces a "Version Packages" pull request, when that pull request is inspected, then it includes the updated `package-lock.json` alongside `package.json`, `.claude-plugin/plugin.json`, and the changelog.
- Given all three version-bearing files record the same version, when the drift check runs, then it passes with a zero exit status.
- Given any of the three version-bearing files records a version that differs from `package.json`, when the drift check runs, then it fails with a non-zero exit status and a message identifying the mismatched file and field.
- Given a pull request to `trunk`, when CI runs, then the drift check runs as part of CI and blocks merge if it fails.
- Given the version-sync logic and its tests, when the test suite is run, then all tests pass, including coverage that asserts the sync result and the preservation of file formatting.
