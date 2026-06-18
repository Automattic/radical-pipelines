# Doc Plan: Keep package-lock version in sync with package.json automatically

## Overview

This feature makes the release version step keep `package-lock.json`'s two recorded version fields (top-level `.version` and root `.packages[""].version`) in sync with `package.json` automatically, backfills the existing drift once, and adds a version-drift guard to the pull-request gate. The code changes alter three things the project's prose currently describes: which files are kept in version sync (the lockfile joins `.claude-plugin/plugin.json`), what the `release:version` script does (it gains a lockfile-reconcile step), and what the changeset gate runs (it gains a drift-guard check) plus what the local test suite contains (it gains the guard's tests). The documentation work is therefore a set of targeted updates to the two authoritative prose homes — `README.md` ("Changelog and versioning") and `CONTRIBUTING.md` (versioning policy, the changeset gate, the release process, the manual escape hatch, and the local-test description) — so each stays consistent with the shipped behavior. No new documentation file is created; every task updates an existing surface that would otherwise drift. Surfaces confirmed NOT to drift (and so carry no task): `scripts/sync-version.mjs`'s docstring (its file is unchanged and its "secondary manifest" description stays accurate, since the lockfile sync is a sibling `npm install` step, not a new manifest target), `.changeset/README.md` (describes the release flow too coarsely to mention plugin.json or the lockfile, and defers detail to README/CONTRIBUTING), `AGENTS.md` and `website/**` (no version-sync / release-flow references), and the generated `CHANGELOG.md` (excluded).

## Guardrail scopes

No guardrail gates were passed to fill.

| Gate | Scope |
| ---- | ----- |
| None | None |

## Tasks

### Task 1: Update README "Changelog and versioning" to reflect the lockfile as a synced surface and the lockfile-reconcile release step

- **Goal:** Bring the README's "Changelog and versioning" section into agreement with the shipped behavior so a reader understands that the lockfile's recorded version is now kept in sync alongside `.claude-plugin/plugin.json`, and that the release version step reconciles the lockfile after bumping and propagating the version.
- **Audience:** Contributors and maintainers reading the project's top-level overview of how versioning works.
- **Files to change:** `README.md`.
- **Sections / scope:** The "Changelog and versioning" section — specifically the "The single source of truth" subsection (the list of files kept identical to `package.json`'s version) and the "Cutting a version" subsection (the per-step description of what `npm run release:version` does). Keep the existing structure, link targets, and prose style; update only what the feature changed. Do not restate the maintainer procedure or escape hatch that this section already delegates to `CONTRIBUTING.md`.
- **Depends on:** none
- **Traces to:** Spec requirements 2, 3, 4, 5; acceptance criteria "all four locations agree after the release step" and "lockfile sync during a release"; Code plan Task 3 (the `release:version` script change) and Task 4 (the backfill).
- **Acceptance:**
  - A reader of "The single source of truth" understands that the two `package-lock.json` recorded-version fields are kept in sync with `package.json`'s version, alongside `.claude-plugin/plugin.json`, rather than being omitted from version sync.
  - A reader of "Cutting a version" understands that running the release version step now also reconciles the lockfile's recorded version (in addition to bumping `package.json` and propagating to `.claude-plugin/plugin.json`), so all version-bearing locations agree after a release.
  - The section's existing intra-repo links (to `CONTRIBUTING.md`, `AGENTS.md`) and the note that `.claude-plugin/marketplace.json` carries no version field remain correct and are not broken.
  - The description reflects the shipped mechanism without pinning exact command flags or script-string text that the doc-writer must read from the committed `package.json` in phase 5.

### Task 2: Update CONTRIBUTING versioning policy and release-process descriptions to include the lockfile

- **Goal:** Make `CONTRIBUTING.md`'s narrative of the release mechanics agree with the shipped behavior wherever it enumerates what the version sync covers and what the release version step does — so the lockfile is no longer silently absent from those descriptions.
- **Audience:** Contributors and maintainers using CONTRIBUTING as the authoritative home for release mechanics, including a maintainer following the manual release procedure.
- **Files to change:** `CONTRIBUTING.md`.
- **Sections / scope:** "Versioning policy" (what is kept in sync as part of the release version step), "Release process" (the step describing what the release version step regenerates and syncs), and "Manual release escape hatch" (the inline step that narrates what the release version step does, while preserving that the maintainer edits nothing by hand). Update the prose to include the lockfile's recorded version as a synced surface; keep every existing command, link, and procedure step intact, since both release paths inherit the lockfile sync with no procedural change.
- **Depends on:** none
- **Traces to:** Spec requirements 2, 3, 4, 5; acceptance criteria "lockfile sync during a release" (CI path and manual escape hatch), "all four locations agree after the release step"; Code plan Task 3.
- **Acceptance:**
  - A reader of "Versioning policy" understands that the release version step keeps the lockfile's recorded version in sync with `package.json`, alongside `.claude-plugin/plugin.json`.
  - A reader of "Release process" understands that the release version step now also reconciles the lockfile (in addition to bumping the version, regenerating the changelog, and syncing the plugin manifest).
  - A reader of the "Manual release escape hatch" understands that the same single release version command also syncs the lockfile, with no hand-editing of the lockfile required, and the procedure's steps and commands are otherwise unchanged.
  - No command, prerequisite, link, or recovery step elsewhere in the document is contradicted, and the description avoids pinning exact flags or script text that the doc-writer reads from the shipped `package.json` in phase 5.

### Task 3: Document the version-drift guard as a check on the changeset gate

- **Goal:** Update CONTRIBUTING's description of the changeset gate so a contributor knows the pull-request gate now also runs a version-drift check that fails when the version-bearing locations disagree, and understands at a high level what triggers it and how it reports.
- **Audience:** Contributors whose PRs run through the changeset gate, and maintainers who need to know what the gate enforces.
- **Files to change:** `CONTRIBUTING.md`.
- **Sections / scope:** "The changeset gate (CI)" subsection, which currently frames the gate as running a fixed set of independent checks. Extend that framing to include the drift guard as an additional check: what it asserts (that the version is consistent across `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields), when it fails (any disagreement), and that on failure it reports an actionable message naming the offending file(s) and the conflicting version(s). Note the bot-PR exemption it inherits if that is consistent with how the section already describes the existing exemption. Do not restate the guard's internal implementation.
- **Depends on:** none
- **Traces to:** Spec requirements 10, 11; acceptance criteria "drift guard on the pull-request gate" (all four cases); Code plan Task 1 (the guard script) and Task 5 (wiring it into the gate workflow).
- **Acceptance:**
  - A contributor reading the changeset-gate description understands that the gate now also runs a version-drift check, and that it fails the PR when `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields do not all carry the same version.
  - The reader understands that on failure the check reports an actionable message identifying the offending file(s) and the conflicting version(s).
  - The description correctly reflects whether the drift check is or is not subject to the same bot-PR exemption as the rest of the gate, consistent with the shipped workflow.
  - The number/framing of gate checks stated in the section matches the shipped workflow after this feature, and the description avoids pinning the guard's exact script filename, message wording, or internal logic (the doc-writer reads those from the shipped code in phase 5).

### Task 4: Update the local test-suite description to cover the new drift-guard tests

- **Goal:** Keep CONTRIBUTING's "Running tests and checks locally" description accurate by reflecting that the test suite now includes the drift guard's tests in addition to the existing ones.
- **Audience:** Contributors running the test suite locally before opening a PR.
- **Files to change:** `CONTRIBUTING.md`.
- **Sections / scope:** "Running tests and checks locally" — the sentence that enumerates what the `npm test` suite covers. Update the enumeration so it accounts for the drift guard's tests landing under the existing test glob, without pinning exact file names or counts. Keep the `npm test` command and the "no lint/typecheck" note unchanged.
- **Depends on:** none
- **Traces to:** Spec requirements 10, 11 (the guard the new tests cover); Code plan Task 2 (the guard's paired unit test) and Task 7 (the end-to-end tests), both picked up by the existing `scripts/test/**/*.test.mjs` glob.
- **Acceptance:**
  - A reader understands that running the local test suite now also exercises the version-drift guard, alongside the previously listed tests.
  - The `npm test` command and the statement that the repo has no lint or typecheck step remain correct and unchanged.
  - The description characterizes the suite by what it covers rather than by an exact file list or test count, so it stays accurate as the doc-writer reads the shipped test files in phase 5.
