# Docs Phase Summary

## What

Updated the project's prose documentation so it reflects that `package-lock.json` is now a version-bearing file kept in sync with the root `package.json`, that the release version step syncs it automatically, and that a new CI drift check guards against version divergence. Four surfaces from the doc plan were addressed:

- **`README.md`** — the "Changelog and versioning" section: the single-source-of-truth file list now includes `package-lock.json` (its two version fields), "Cutting a version" describes the release step syncing the lockfile and carrying it into the "Version Packages" PR, and a pointer to the CONTRIBUTING gate notes that CI catches version drift before merge.
- **`CONTRIBUTING.md`** — the local-test enumeration (now five test groups), "Versioning policy", "The changeset gate (CI)" (now three checks, with the new version-sync step and the bot-PR exemption applied to it), "When a changeset is required" (lockfile-only changes still need no changeset, reconciled with the always-runs drift check), "Release process", and the manual escape-hatch comment.
- **`scripts/sync-version.mjs`** — the module-level docstring and the orchestrating-function JSDoc, extended to describe the lockfile as a mandatory two-field target patched by JSON path, while preserving the existing outward-only / idempotent / format-preserving / offline narrative. (A docstring for the new `syncLockfileVersion` function was authored in the code phase; the doc task aligned the surrounding file-level narrative.)
- **`.changeset/README.md`** — reviewed (verify-only); its release-flow summary and cross-links to the README section and CONTRIBUTING still resolve and stay accurate, so it was left unchanged with no commit.

## Why

Several existing documentation surfaces described version sync, the release process, and the CI gates while omitting the lockfile and the new drift check. Left unupdated they would have drifted out of agreement with the shipped code, misleading maintainers and contributors about which files carry the version, what the release step does, and which CI checks gate a pull request.

## How

A doc-writer per task read the shipped phase-4 code (`scripts/sync-version.mjs`, `scripts/check-version-sync.mjs`, `.github/workflows/changeset-gate.yml`, `.changeset/config.json`, the test files, and the corrected `package-lock.json`) and brought each prose surface into agreement with it, matching the voice and depth of the existing documents and keeping cross-links resolvable. The batch was then reviewed in a single pass and every concrete claim was spot-checked against the shipped code; the review was approved on the first iteration.

## Key decisions

- **README defers gate mechanics to CONTRIBUTING.** Rather than duplicate the drift-check mechanics, the README mentions the CI check at its own altitude and links to CONTRIBUTING's "The changeset gate (CI)" section, matching the README's existing delegation pattern.
- **`.changeset/README.md` left unchanged.** Its release-flow summary does not enumerate version-bearing files and its cross-link targets remained valid after the README and CONTRIBUTING updates, so the minimal correct action was no edit.

## Known limitations

This project defines no guardrails convention, so no automated gates were run during review; the approval rests on per-task accuracy spot-checks against the shipped code.
