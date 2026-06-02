# Docs review — APPROVED

**Issue:** #81 — Track changes with a changelog and keep the project version in sync
**Batch:** Docs Tasks 1, 2, 3, 4 (entire doc-plan), reviewed in a single pass.
**Diff range:** `75efe82..HEAD` (excluding `node_modules/`, `.pipelines/`).
**Doc commits:** 94b4f1d (AGENTS.md rule), 9dc4cd2 (README section + `.pi-extension/README.md` pointer), 5824fd9 (`.changeset/README.md` reconcile), b9a72c7 (`.changeset/changelog-and-version-sync.md`).
**Spec ACs covered by this batch:** AC2 (pending changeset) and AC8 (AGENTS.md rule + README workflow). Code-scope ACs were handled in Phase 4.

## Verdict

**APPROVED.** All four doc tasks meet their per-task Acceptance, every concrete claim verifies against the shipped phase-4 code, the audience/voice fit the surrounding docs, the rationale is faithful, the drift sweep is clean, and the batch stays within doc-plan scope (no code/config/script/test touched).

## Files changed (scope check)

The batch touches exactly the doc surfaces the doc-plan names and nothing else:

- `AGENTS.md` (Task 1)
- `README.md` (Task 2)
- `.pi-extension/README.md` (Task 2 optional one-line pointer)
- `.changeset/README.md` (Task 3 reconcile)
- `.changeset/changelog-and-version-sync.md` (Task 4, new)

A scope sweep (`git diff 75efe82..HEAD --stat` excluding those paths plus `node_modules`/`.pipelines`) returned **no other changed files** — no code, config, scripts, or tests, exactly as the doc-plan mandated.

## Checks

| # | Check | Result |
|---|-------|--------|
| 1 | Task 1 Acceptance — standing changeset rule in `AGENTS.md`, sibling to README rule, with patch/minor/major guidance, stated as a convention (not a named-agent duty), `CLAUDE.md` unchanged | PASS |
| 2 | Task 2 Acceptance — `README.md` documents adding a changeset, version step propagates to every version-bearing file + regenerates lockfile, operator-run local action (no publish/tags/CI), consumers pick up on next git-source/marketplace install, every command/path/run-script verified, marketplace.json exclusion not contradicted | PASS |
| 3 | Task 3 Acceptance — `.changeset/README.md` exists (scaffolded by phase 4), reconciled to not contradict the local/no-publish/no-tag flow, points to root `README.md` workflow section | PASS |
| 4 | Task 4 Acceptance — committed `.changeset/*.md` on branch, front-matter names root package with `minor` bump, body concisely describes the change, `changeset version` not run, `CHANGELOG.md` absent, entry pending | PASS |
| 5 | Accuracy spot-check — at least one concrete claim per task verified against shipped code | PASS (evidence below) |
| 6 | Audience/voice fit — matches surrounding docs | PASS |
| 7 | Faithful rationale — claims trace to spec/design without overreach | PASS |
| 8 | Drift sweep — no other surface referencing changelog/versioning left stale | PASS |
| 9 | Doc-plan adherence / no scope creep | PASS |
| 10 | Convention compliance (commit format, no publish/tag/CI documented, marketplace.json version-free) | PASS |

## Accuracy spot-check evidence (one+ concrete claim per task, verified against shipped code)

**Task 1 (`AGENTS.md`):** The new rule's bump-type guidance ("behavior-preserving fix → patch; backward-compatible feature → minor; breaking change → major") matches the standard semver mapping the design (C6/OQ-3) prescribes, and is phrased as a sibling to the existing line-7 README rule, as a project-wide convention. `CLAUDE.md` is unchanged (it inherits via `@AGENTS.md`); confirmed it is not in the diff. PASS.

**Task 2 (`README.md`):** Every concrete claim verified against shipped `package.json` and `scripts/sync-version.mjs`:
- Run-script name **`release:version`** and exact command `changeset version && node scripts/sync-version.mjs && npm --prefix .pi-extension install --package-lock-only` — README's three numbered steps reproduce this command verbatim. Matches `package.json` `scripts.release:version` exactly.
- Config path `.changeset/config.json` and `@changesets/cli` as a devDependency — confirmed (`devDependencies["@changesets/cli"]: "^2.31.0"`).
- Version-bearing file set: root `package.json`, `.claude-plugin/plugin.json`, `.pi-extension/package.json`, and `.pi-extension/package-lock.json` top-level version — matches `TARGET_MANIFESTS` in `sync-version.mjs` plus the lockfile-regen step.
- `.claude-plugin/marketplace.json` carries no version field and references the plugin by `source: "./"` — verified: `grep -c '"version"'` returns 0, and `marketplace.json` has `"source": "./"`. The doc never implies it carries a version.
- "no `npm publish`, no git tags, no release CI; root package is `private: true`" — `package.json` has `"private": true`; `add changeset` CLI invocation `npx changeset` is correct.
- Pi install string `pi install git:github.com/Automattic/radical-pipelines` matches the existing Project Usage instructions (README line 104/139). PASS.

**Task 3 (`.changeset/README.md`):** The file was scaffolded by phase 4. The reconcile (a) removed the stock "version and publish your code" → "version your code" to avoid implying a registry publish, and (b) appended an accurate note that this repo has no publish/tags/CI and a pointer to the root README's "Changelog and versioning" section. This is consistent with the shipped `.changeset/config.json` (`privatePackages: { version: true, tag: false }`) — versioned, never tagged. PASS.

**Task 4 (`.changeset/changelog-and-version-sync.md`):** Front-matter `"@automattic/radical-pipelines": minor` — package name matches root `package.json` `name`; bump type `minor` is the correct call for a backward-compatible feature (design C6 guidance). Read-only `npx changeset status` confirms the pending changeset resolves to **"Packages to be bumped at minor: @automattic/radical-pipelines"**, proving the entry is well-formed and consumable. `CHANGELOG.md` does **not** exist (`ls CHANGELOG.md` → No such file), confirming `changeset version` was not run and the entry remains pending. PASS.

## Baseline / drift-correction verification (cross-check of phase-4 state the docs describe)

All four version-bearing files read `0.1.1`: root `package.json` `0.1.1`, `.claude-plugin/plugin.json` `0.1.1`, `.pi-extension/package.json` `0.1.1`, `.pi-extension/package-lock.json` top-level `0.1.1`. `marketplace.json` has no version field. The docs' description of the single-source-of-truth baseline is accurate.

## Drift sweep detail

A repository-wide search for `changeset|changelog|version sync|release:version|sync-version` across all `*.md` returned only: the four host doc surfaces in this batch + the new changeset, plus `.pipelines/` artifacts (out of scope) and `.agents/` skill/agent-profile files. The `.agents/` matches are generic pipeline-framework references that list "changelogs" as a *category* of documentation surface (e.g. doc-writer/code-writer remit, plan-phase sweep guidance) — they are not host-project versioning documentation and are correctly untouched. No changelog/versioning surface was left stale.

## Notes

- Read-only checks only were run (`npx changeset status`, file reads/greps). `npm run release:version` / `changeset version` were **not** run, preserving the pending changeset and repository state per instructions.
- AC2 and AC8 are fully satisfied by this batch.
