# Docs Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Task 1: Update README "Changelog and versioning" to reflect the lockfile as a synced surface and the lockfile-reconcile release step
- Task 2: Update CONTRIBUTING versioning policy and release-process descriptions to include the lockfile
- Task 3: Document the version-drift guard as a check on the changeset gate
- Task 4: Update the local test-suite description to cover the new drift-guard tests

## Summary

All four tasks satisfy their per-task Acceptance criteria, and every concrete claim checked against the shipped phase-4 code holds. The README and CONTRIBUTING surfaces now describe `package-lock.json` (in both recorded-version fields) as a synced version-bearing location, the `release:version` lockfile-reconcile step, the new version-drift check raising the changeset gate to three checks, and the drift-guard tests in the local suite. The README↔CONTRIBUTING release-step descriptions are mutually consistent. The two v2-sensitive non-tasks are correctly handled: `scripts/sync-version.mjs`'s docstring (no doc task) still accurately says "secondary manifest" because it remains `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` and the lockfile sync is a sibling `npm install` step, not a manifest target; and the feature's changeset is a code artifact, not a doc surface. No doc-plan surface is left stale, the only shipped public surface (the `check-version-sync.mjs` CLI) is documented, and no work strayed beyond `README.md` and `CONTRIBUTING.md`.

## Checks

No guardrails convention was provided, so there are no gates to run. The accuracy spot-check below is the verification evidence.

| Check | Command | Result |
| ----- | ------- | ------ |
| (no guardrails convention) | — | — |

## Accuracy spot-check

- **Task 1** — README "The single source of truth" lists `package-lock.json` "in two fields, the top-level `version` and the root package's `packages[""].version`." Verified against `package-lock.json`: top-level `.version` is `0.4.0` (line 3) and `.packages[""].version` is `0.4.0` (line 9), both equal to `package.json` `.version` `0.4.0`. The README "Cutting a version" step (c) "reconciles `package-lock.json` so its two recorded-version fields match the bumped root version" describes the shipped `release:version` behavior without pinning the `npm install --package-lock-only --no-audit --no-fund` flags, as the task's Acceptance required. The `marketplace.json` no-version note and the `CONTRIBUTING.md`/`AGENTS.md` links are unchanged and correct.
- **Task 2** — CONTRIBUTING "Versioning policy" attributes `.claude-plugin/plugin.json` sync to `scripts/sync-version.mjs` and separately names `package-lock.json`'s two fields; "Release process" step 2 adds "reconciles `package-lock.json` so its two recorded-version fields match the bumped version"; the "Manual release escape hatch" step-1 comment adds the lockfile reconcile with "nothing edited by hand." Verified against `package.json` `release:version` = `changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund` — both release paths invoke this single script, so both inherit the lockfile sync with no procedural change, matching the prose. The escape-hatch commands (`npm run release:version`, `git restore .`) are unchanged.
- **Task 3** — CONTRIBUTING "The changeset gate (CI)" now states "**three independent checks**." Verified against `.github/workflows/changeset-gate.yml`: the `changeset` job runs `validate-changesets.mjs` (Shape), `check-version-sync.mjs` (Version drift), and `changeset status` (Presence) — three checks. The doc's "names the offending file(s) (and, for the lockfile, which field) alongside the conflicting version(s)" matches `check-version-sync.mjs` `main()`, which prints `${err.file} (${err.jsonPath}): ${err.value} — does not match package.json` and a `package.json: <value> (source of truth)` baseline line. The four compared locations in the prose match `VERSION_LOCATIONS`. The bot-PR exemption claim is consistent with the job-level `if: github.head_ref != 'changeset-release/trunk'`, which covers all three steps; the doc did not introduce a contradicting per-check claim.
- **Task 4** — CONTRIBUTING "Running tests and checks locally" enumerates "`sync-version`, changeset-validator, and version-drift-guard tests, including the end-to-end coverage of the version-sync flow." Verified against `scripts/test/`: `sync-version.test.mjs`, `validate-changesets.test.mjs`, `check-version-sync.test.mjs` (the drift guard's paired test), and `version-sync.e2e.test.mjs` (the end-to-end coverage) all exist and are picked up by the `node --test 'scripts/test/**/*.test.mjs'` glob. The `npm test` command and the "no `lint` or `typecheck` step" note are unchanged. The description characterizes by coverage rather than an exact file list, as the task required.
- **v2-specific — `sync-version.mjs` docstring** — Verified `scripts/sync-version.mjs` still declares `const TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` and its docstring's "every secondary manifest" wording remains accurate: the lockfile sync is the appended `npm install --package-lock-only` step in `release:version`, not a `TARGET_MANIFESTS` entry. The plan correctly assigned this file no doc task, and the CONTRIBUTING prose preserves that distinction (plugin.json via `sync-version.mjs`; lockfile separately).

## Issues

None.
