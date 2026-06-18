# Spec: Keep package-lock version in sync with package.json automatically

## Overview

The project records its version in three places: `package.json` (the source of truth), `.claude-plugin/plugin.json`, and `package-lock.json` (which carries it in two fields — the top-level `.version` and the root `.packages[""].version`). The release version step propagates the version to `plugin.json` but never to the lockfile, so the lockfile's recorded version has drifted: `package.json` is at `0.4.0` while both lockfile version fields remain frozen at `0.1.1`, where they have sat unchanged across the `0.2.0`, `0.3.0`, and `0.4.0` releases. Nothing in the existing pipeline catches this, because `npm ci` validates the dependency tree but is blind to the recorded `version` fields.

This feature makes the release process keep the lockfile's recorded version consistent with `package.json` automatically, so it cannot drift again, and corrects the existing drift now. The lockfile version sync is performed by running `npm install --package-lock-only` — a binding owner constraint, not a free implementation choice — accepting that this mechanism depends on registry / `node_modules` access and revalidates the dependency tree. A version-drift check is added to the pull-request gate so inconsistency introduced outside the release flow is caught rather than going unnoticed.

## Requirements

### Lockfile version sync mechanism

1. The lockfile's recorded version is brought into sync by running `npm install --package-lock-only`. The lockfile's version fields are never updated by a hand-written or structured JSON edit. (Binding owner constraint, intent.md:16.)
2. The lockfile sync runs automatically as part of the release version step, after the version bump, so the lockfile records the just-bumped version. No manual step is required to keep the lockfile in sync during a release.
3. The lockfile sync is reached by every path that performs a release version bump — both the automated CI release path and the documented manual escape hatch — so neither path leaves the lockfile drifted.

### Observable end state after a release version bump

4. The lockfile's top-level `.version` and its root `.packages[""].version` both equal the version recorded in `package.json`.
5. All version-bearing locations agree: `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields all carry the same version.
6. The sync is idempotent: running the release version step again with no new version change produces no further change to the lockfile.
7. In the normal release flow, where project dependencies are unchanged, the only change the sync makes to the lockfile is the two version fields; it does not reorder, add, remove, or rewrite dependency entries. If the dependency tree is independently out of sync, `npm install --package-lock-only` will also revalidate and rewrite the affected dependency entries — an accepted trade-off (intent.md:17). The guaranteed invariant is that the version fields match (requirement 4), not that only the version fields ever change.

### One-time backfill of the existing drift

8. The committed `package-lock.json` is brought into sync at the current released version `0.4.0`: both lockfile version fields read `0.4.0`, matching `package.json`.
9. The backfill is produced via `npm install --package-lock-only` (requirement 1), not by hand-editing the lockfile's version fields.

### Version-drift guard on the pull-request gate

10. The pull-request gate fails when the version is inconsistent across `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields, and passes when all four agree.
11. On failure, the drift guard reports an actionable message identifying the offending file(s) and the conflicting version(s).

## Out of Scope

- **Offline / no-registry operation.** The sync is not required to work without registry or `node_modules` access; that dependence is an accepted trade-off of the mandated mechanism (intent.md:17).
- **Changing the version-bump mechanism.** The existing tool that computes the bump remains the source of the version; this feature only propagates that bumped version into the lockfile.
- **Updating dependency versions or relocking the dependency tree.** Any dependency-tree change is only the incidental, accepted side effect described in requirement 7, never a goal.
- **Enforcing a single write path for the version.** The drift guard detects inconsistency; it does not prevent the version from being changed outside the release flow (e.g. a hand-edit).

## Acceptance Criteria

### Lockfile sync during a release

- Given a pending version bump, when the release version step runs, then both lockfile version fields and `package.json`'s version are equal after it completes.
- Given a completed release version step, when the version-bearing locations are compared, then `package.json`, `.claude-plugin/plugin.json`, and both lockfile version fields all carry the same version.
- Given a release version step that just completed and left the lockfile in sync, when the release version step is run again with no new version change, then the lockfile is unchanged (empty diff).
- Given a release performed through the automated CI release path, when it completes, then the lockfile version fields match `package.json`.
- Given a release performed through the documented manual escape hatch, when it completes, then the lockfile version fields match `package.json`, with no manual lockfile edit.

### Sync scope in the normal flow

- Given a release version bump in which project dependencies are unchanged, when the lockfile sync runs, then the only change to the lockfile is the two version fields (no dependency entries added, removed, reordered, or rewritten).

### One-time backfill

- Given the lockfile currently frozen at `0.1.1` while `package.json` is `0.4.0`, when this change lands, then the committed lockfile's `.version` and `.packages[""].version` both read `0.4.0`.

### Drift guard on the pull-request gate

- Given a pull request in which `package.json`, `.claude-plugin/plugin.json`, and both lockfile version fields all carry the same version, when the pull-request gate runs, then the drift guard passes.
- Given a pull request in which the lockfile version fields disagree with `package.json`'s version, when the pull-request gate runs, then the drift guard fails and the reported message names the offending file(s) and shows the conflicting version values.
- Given a pull request in which `.claude-plugin/plugin.json`'s version disagrees with `package.json` and the lockfile version fields, when the pull-request gate runs, then the drift guard fails and the reported message names `.claude-plugin/plugin.json` as an offending file and shows the conflicting version values.
- Given a pull request in which `package.json`'s version is hand-edited so it disagrees with `.claude-plugin/plugin.json` and the lockfile, when the pull-request gate runs, then the drift guard fails (the inconsistency is not allowed through, unlike with dependency-tree-only validation), and the reported message names the offending file(s) and shows the conflicting version values.
