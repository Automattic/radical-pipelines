# Docs Phase Summary

## What

Targeted prose updates to the two authoritative documentation homes so they agree with the shipped lockfile-version-sync feature. Four tasks, all editing existing surfaces (no new doc file):

- **README.md — "Changelog and versioning"**: added `package-lock.json` (its top-level `version` and root `packages[""].version`) to "The single source of truth" list of synced version-bearing locations, and added the lockfile-reconcile step (step c) to the "Cutting a version" description of `npm run release:version`.
- **CONTRIBUTING.md — "Versioning policy" / "Release process" / "Manual release escape hatch"**: included the lockfile's two recorded-version fields as synced surfaces; the release-process step and the escape-hatch step-1 comment now note that the same single `release:version` command also reconciles the lockfile, with no hand-editing.
- **CONTRIBUTING.md — "The changeset gate (CI)"**: raised the gate from "two independent checks" to "three," documenting the new version-drift check (what it asserts across all four version-bearing locations, when it fails, and its actionable file/field/version message), consistent with the inherited bot-PR exemption.
- **CONTRIBUTING.md — "Running tests and checks locally"**: extended the suite enumeration to include the version-drift-guard tests and the end-to-end version-sync coverage; the `npm test` command and the "no lint/typecheck" note are unchanged.

## Why

The code changes altered three things the prose described — which files are version-synced (the lockfile joins `.claude-plugin/plugin.json`), what `release:version` does (it gains a lockfile-reconcile step), and what the changeset gate runs (it gains a drift check, with the guard's tests joining the local suite). Without these edits the README and CONTRIBUTING would have silently described stale behavior.

## How

Each task updated only the prose the feature changed, preserving existing structure, links, commands, and the procedural steps of both release paths (which inherit the lockfile sync with no procedural change). Descriptions characterize behavior without pinning exact command flags, script filenames, message wording, or test file lists, so they stay accurate against the shipped code. Reviewed in a single batch pass against the shipped `package.json` `release:version` script, the backfilled `package-lock.json` (both fields at `0.4.0`), `scripts/check-version-sync.mjs`, `.github/workflows/changeset-gate.yml`, and the `scripts/test/` files; approved with no rejection iterations.

## Key decisions

- `scripts/sync-version.mjs` carried no doc task because v2 does not modify it; its docstring's "secondary manifest" wording stays accurate since the lockfile sync is the appended `npm install --package-lock-only` step in `release:version`, not a new `TARGET_MANIFESTS` target. CONTRIBUTING preserves this distinction (plugin.json via `sync-version.mjs`; lockfile separately).
- The feature's changeset (`.changeset/package-lock-version-sync.md`) is a code artifact, not a documentation surface, so it carried no doc task.
- The README and CONTRIBUTING release-step descriptions were kept mutually consistent (bump → CHANGELOG → plugin.json via `sync-version.mjs` → reconcile the lockfile's two fields).
