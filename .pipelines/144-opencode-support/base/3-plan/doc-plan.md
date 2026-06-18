# Doc Plan: opencode support (via opencode-ensemble)

## Overview

The code phase adds opencode as a third supported agentic coding tool at parity with Claude Code and Pi, via the established per-tool pattern: a new conditionally-loaded convention file, a new publishable packaging artifact (a workspace sub-package re-exporting `opencode-ensemble`), two minimal generic-skill edits, and build/release tooling edits (the repo becomes a workspace root; version-sync and changeset `changedFilePatterns` extend to the sub-package). The generic skill stays tool-agnostic.

This plan covers only **owner- and contributor-facing documentation prose** that today names the supported tools as a fixed pair ("Claude Code and Pi"), describes installation/packaging, or enumerates release-relevant paths and version-bearing files — every such surface goes stale the moment opencode becomes a third tool, a third install path, and a second publishable package. It does **not** cover the generic skill or convention files under `skills/radical-pipelines/reference/` (the code plan owns `setup.md`, `health-monitoring.md`, and the new `opencode.md`), nor the agent bodies (reused verbatim), nor machine-only config with no owner-facing prose.

The oracle for every task is the **shipped code**: the doc must describe opencode installation, packaging, and tool support exactly as the merged code makes it work (the sub-package, its package name/path, its install/list rule, the convention-file name, the setup flow), and must keep the supported-tools / install / release statements true for all three tools. Where this plan names a concrete value the code might finalize differently (sub-package name `@automattic/radical-pipelines-opencode`, path `packages/opencode/`, the install/plugin-list mechanism), the writer reads the merged code and documents the actual shipped value — the plan fixes the surface and the required coverage, not the wording.

### Surfaces in scope (all prose, owner/contributor facing)

- `README.md` — "Project Usage": the supported-tools sentence, the per-tool install/usage sections, the dependency-bundling/packaging description, the Configuration per-tool summary, and the versioning "single source of truth" + release-flow descriptions.
- `website/index.html` — the marketing site: meta description/keywords, the hero-stats block (the "CLIs supported" count, and the adjacent "agents shipped" count), the "runs in your CLI (Claude Code or Pi)" copy, the "Tooling caught up" line, and the one-line **Install** section (per-tool install blocks).
- `CONTRIBUTING.md` — the release-relevant `changedFilePatterns` list, the version-sync target list, and the release-flow description, all of which the code's tooling edits change.
- The **feature changeset** — the `.changeset/*.md` entry that ships this feature (every release-relevant change records one, per the repo's standing rule).
- Root `package.json` `description` — owner-facing prose that currently calls the repo "Radical Pipelines Pi package," now incomplete once a second publishable package and a third install path exist.

### Surfaces deliberately excluded (with reason)

- `skills/radical-pipelines/reference/**` (generic skill + `setup.md`, `health-monitoring.md`, new `opencode.md`) — owned by the code plan; this plan must not duplicate or re-specify them.
- `agents/*.md` bodies — reused verbatim; no prose change.
- `.rp.md` (repo root) — its line-3 statement describes which per-tool sections **this repo** dogfoods (Claude Code + Pi side-by-side, per README), not which tools RP supports. The code plan does not add an opencode block to this repo's own `.rp.md`, so the statement stays true; out of scope unless the code phase actually makes this repo dogfood opencode (it does not).
- `.claude-plugin/marketplace.json` / `plugin.json`, `.pi/settings.json` — machine config with no owner-facing prose describing the supported-tool set; opencode's packaging is the new sub-package, not an entry here.
- `CHANGELOG.md` — generated from changesets at release time; not hand-edited (the feature changeset is the input, covered above).

## Tasks

### Task 1: Update README "Project Usage" supported-tools framing and add the opencode install/usage section

- **Goal:** Make the README present opencode as a first-class supported tool at parity with Claude Code and Pi: the reader learns RP ships a third install path (the opencode packaging artifact), how to install and use RP on opencode, and that all three capture the same methodology.
- **Audience:** Owners choosing/installing RP for their repository, including opencode users.
- **Files to change:** `README.md` (the "Project Usage" intro sentence; a new opencode install/usage section sitting alongside the existing "Claude Code plugin install" and "Pi package install / Pi usage" sections; and the "Dependency bundling" prose insofar as it asserts a single Pi manifest is the only packaging artifact).
- **Sections-scope:** The supported-tools intro sentence ("ships a Claude Code plugin, a Pi package, and a standalone agent skill … All three …"); a new opencode section parallel to the Pi one (install via the published opencode package, the team-coordination layer it bundles, the setup-driven agent + skill install keyed to artifact-storage mode, the Node ≥ 24 / Bun prerequisite, and the "list only the meta-plugin, never `opencode-ensemble` alongside it" rule); and any "single Pi manifest" / "no hidden source directory" packaging prose that must now acknowledge a second publishable package sharing the same `agents/` + `skills/` source. Do not restate `opencode.md`'s convention text — link to it as the README links to the other convention files.
- **Depends on:** none (other doc tasks may proceed independently)
- **Traces to:** Spec Req 1, 2, 11, 12, 13, 14, 15, 16; acceptance "Installation and packaging," "Setup actions," "Tool selection and end-to-end runs." Code plan Tasks 4, 5, 6, 7. Design Decisions 6, 7.
- **Acceptance:**
  - The "Project Usage" intro names all three supported tools (Claude Code, Pi, opencode) and conveys that all three run the same methodology / same pipeline.
  - A reader who uses opencode can, from the README alone, install RP for opencode (via the shipped opencode package), obtain RP's agents + skill + team layer, learn the Node ≥ 24 / Bun prerequisite, and learn the "list only the meta-plugin" rule — described as the merged code actually delivers them (package name, install mechanism), not invented.
  - The packaging/dependency prose no longer implies the Pi manifest is the only publishable artifact; it acknowledges the second publishable package without contradicting the "shared `agents/` + `skills/` source, no mirror scheme" property the README already states.
  - Claude Code and Pi install/usage instructions remain correct and are not degraded by the additions.

### Task 2: Update README Configuration section's per-tool convention summary to include opencode

- **Goal:** Keep the README's prose summary of "what each tool's conventions add" accurate now that a third tool exists, so an owner reading Configuration sees opencode's per-tool conventions (worktrees, team spawning via the team layer, agent models, always-on supervision) alongside Claude Code's and Pi's.
- **Audience:** Owners authoring/understanding `.rp.md` conventions for their project, including opencode users.
- **Files to change:** `README.md` (the "Configuration" section — specifically the paragraph that enumerates, per tool, what conventions add: "Claude Code conventions add … Pi conventions add …").
- **Sections-scope:** The per-tool convention-summary paragraph and any adjacent sentence that frames the supported set as exactly two tools (e.g. "the active CLI determines which"). Add an opencode summary clause pointing at the opencode convention file the same way the existing clauses point at theirs. Leave the generic-conventions description, the `.rp.local.md` local-overrides prose, and the Pi-specific agent-discovery paragraph correct (the opencode setup-actions detail belongs to Task 1's opencode section and `opencode.md`, not restated here).
- **Depends on:** none
- **Traces to:** Spec Req 2, 10, 17 (opencode is a selectable tool with its own convention file; per-agent model selection); acceptance "Per-agent model selection," "Tool selection and end-to-end runs." Code plan Task 4 (opencode.md). Design Decisions 1, 4, 5.
- **Acceptance:**
  - The Configuration section's per-tool summary includes opencode and what its conventions add (worktrees, team spawning, agent models, always-on health supervision), pointing at the opencode convention file, consistent in shape with the Claude Code and Pi clauses.
  - No sentence in Configuration asserts RP supports exactly two tools or names a closed pair where a third now belongs.
  - The shared-conventions, local-overrides, and Pi agent-discovery prose remain accurate and are not duplicated into the opencode clause.

### Task 3: Update README versioning section — version-bearing files and release flow — for the new sub-package

- **Goal:** Keep the README's "Changelog and versioning" description true after the repo becomes a workspace root and the sub-package version is kept in lockstep with the root: the reader sees that the sub-package manifest is among the files the root version syncs into, and that release mechanics are otherwise unchanged.
- **Audience:** Contributors/maintainers reasoning about versioning and releases.
- **Files to change:** `README.md` (the "Changelog and versioning" subsections: "The single source of truth" list of version-bearing files, and the "Cutting a version" flow where it enumerates what `sync-version` propagates to).
- **Sections-scope:** The bulleted list of version-bearing files synced from the root `version` (today only `.claude-plugin/plugin.json`) and any sentence in the release flow that enumerates the sync targets. Add the new sub-package manifest as a synced target. Do not restate the authoritative bump table or the changeset-required-paths list (those live in CONTRIBUTING — Task 5).
- **Depends on:** none (documents code plan Task 7's tooling edits)
- **Traces to:** Spec Req 12 (delivered via a packaging artifact; tooling kept in lockstep); Design Components → MODIFIED build/release tooling; Design Dependencies (sync-version + version lockstep). Code plan Task 7.
- **Acceptance:**
  - The "single source of truth" list includes the opencode sub-package manifest among the files kept identical to the root `version`, matching the manifests the shipped `sync-version.mjs` actually targets.
  - The release-flow description remains accurate (still private root, no npm publish for the root; the sub-package's publish status is described consistently with the shipped code) and does not contradict CONTRIBUTING.
  - The version-bearing-files statement is exhaustive for the shipped tooling — it does not omit the sub-package manifest now that `sync-version` writes to it.

### Task 4: Update the website (`website/index.html`) supported-tools copy and install section for opencode

- **Goal:** Make the public marketing site present opencode as a supported tool at parity: a visitor sees opencode named in the "which CLI" copy and gets a one-line opencode install path alongside Claude Code and Pi, and search/meta metadata reflects all three.
- **Audience:** Public website visitors evaluating RP and looking for the install command for their tool.
- **Files to change:** `website/index.html` (the `<meta name="description">` and `<meta name="keywords">` content; the **hero-stats** block's "CLIs supported" count and its adjacent "agents shipped" count; the demo-section "runs in your CLI (Claude Code or Pi)" line; the "Why now → Tooling caught up" line naming "Claude Code and Pi"; and the "Try it / Install in one line" `install-grid` with its per-tool `install-block`s and the `install-note`).
- **Sections-scope:** Every place the site names the supported set as the closed pair "Claude Code (or/and) Pi" becomes the trio including opencode; the Install grid gains an opencode block with the install command/flow the shipped opencode package provides (and, if opencode needs a post-install agent-discovery note like Pi's, an equivalent note). Update meta description + keywords to include opencode. In the **hero-stats** block: update the "CLIs supported" stat so its count reflects the number of supported tools after this feature (three: Claude Code, Pi, opencode) — the count must not assert RP supports exactly two tools. While editing this same block, also correct the adjacent "agents shipped" stat to match the actual shipped agent count (the count the README enumerates; today 15 is wrong); align it to reality rather than leave a known-false adjacent number in a block the writer is already touching. Leave the demo terminal card label (`terminal · claude-code`) and the reconstructed-demo-log content as-is (it depicts one real captured run, not the supported-tool list) unless the writer judges the visible card label misrepresents tool support — default: leave the demo artifact untouched. The demo caption's "Run it yourself →" link (to the README Claude Code plugin-install anchor) stays valid — Task 1 keeps that README section — and is not part of the "leave the demo log as-is" rule's intent to change anything: leave the caption link target untouched.
- **Depends on:** none
- **Traces to:** Spec Req 1, 2, 11; acceptance "Tool selection and end-to-end runs," "Installation and packaging." Code plan Tasks 4, 5, 6, 7. (Note: `website/**` is not release-relevant per CONTRIBUTING, so this surface needs no changeset of its own — but it must still ship in sync.)
- **Acceptance:**
  - The site's prose naming "which CLI RP runs in" names opencode alongside Claude Code and Pi wherever it previously named the pair.
  - The Install section offers an opencode install path consistent with what the shipped opencode package and README (Task 1) describe; the Claude Code and Pi blocks remain correct.
  - The `<meta>` description and keywords include opencode.
  - The hero-stats "CLIs supported" count reflects the number of supported tools after this feature (three) and asserts no closed pair.
  - The hero-stats "agents shipped" count matches the actual shipped agent count (the count the README enumerates), not the stale prior value.
  - No marketing claim asserts RP supports exactly two tools after the change.
  - The demo caption's "Run it yourself →" link target remains valid and untouched.

### Task 5: Update CONTRIBUTING release-relevant paths and version-sync prose for the sub-package

- **Goal:** Keep the contributor-facing release rules true after the tooling edits: a contributor sees that the new sub-package path is release-relevant (so a change there needs a changeset, consistent with the extended `changedFilePatterns`), and that the sub-package manifest is version-synced from the root.
- **Audience:** Contributors deciding whether a change needs a changeset and maintainers running releases.
- **Files to change:** `CONTRIBUTING.md` (the "Versioning policy" sentence listing what the root version syncs to; the "When a changeset is required" `changedFilePatterns` list and the matching "not release-relevant" list; and the "Release process" sync description).
- **Sections-scope:** The `changedFilePatterns` enumeration (today `skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`) — reconcile it with what code plan Task 7 actually adds (e.g. `packages/**`), and adjust the "not release-relevant" list if a path moves between buckets; the "Versioning policy" + "Release process" sentences that name `.claude-plugin/plugin.json` as the sole sync target — add the sub-package manifest. Do not restate the bump table or pre-1.0 policy (unchanged). Keep the "private root, no npm publish" statement, but reconcile it with the fact that the sub-package **is** publishable, so the doc does not flatly claim nothing in the repo is publishable if the shipped code makes the sub-package non-private.
- **Depends on:** none (documents code plan Task 7)
- **Traces to:** Spec Req 12; Design Components → MODIFIED build/release tooling; Design Dependencies. Code plan Task 7 (`changedFilePatterns`, `sync-version.mjs`, workspace root).
- **Acceptance:**
  - The `changedFilePatterns` list in CONTRIBUTING matches the patterns the shipped `.changeset/config.json` contains (the sub-package path is release-relevant), and the "not release-relevant" list does not contradict it.
  - The version-sync prose names the sub-package manifest among the files the root version is propagated to, matching the shipped `sync-version.mjs`.
  - The "private / no npm publish" framing is reconciled with the sub-package's actual publish status in the shipped code — no statement claims the whole repo is unpublishable if the sub-package is publishable.
  - The bump table, pre-1.0 policy, changeset gate, and manual-release escape hatch remain accurate and are not duplicated or altered beyond the path/sync reconciliation.

### Task 6: Write the feature changeset for opencode support

- **Goal:** Record this feature in a committed changeset so the next release's changelog and version bump capture it, per the repo's standing rule that every release-relevant change records a changeset.
- **Audience:** Release tooling and changelog readers (downstream owners scanning what changed).
- **Files to change:** a new `.changeset/<descriptive-name>.md` (the feature changeset for this PR).
- **Sections-scope:** A single changeset file targeting `@automattic/radical-pipelines` with the correct bump type per CONTRIBUTING's bump table and pre-1.0 policy (a new feature → `minor`), and a one-line imperative summary stating opencode is now a supported tool. Follow the existing `.changeset/*.md` examples' shape (front matter + one-line summary). This is the single changeset for the feature; it is not consumed until release.
- **Depends on:** none (but its summary should reflect the shipped feature, so author it once the code surfaces are stable)
- **Traces to:** Spec Req 11, 12 (the feature ships as an installable addition); CONTRIBUTING "Adding a changeset," README "Adding a changeset." Whole feature.
- **Acceptance:**
  - Exactly one feature changeset exists for this work, targeting `@automattic/radical-pipelines` with bump type `minor` (new feature, pre-1.0), in the canonical front-matter-plus-summary form the existing `.changeset/*.md` files use.
  - The summary states, in imperative mood, that opencode is now a supported agentic coding tool (owners can install and run RP on opencode), at a granularity matching the existing changeset entries.
  - The changeset validates against the repo's changeset gate (no `major`, well-formed front matter).

### Task 7: Update the root `package.json` `description` to reflect opencode and the second package

- **Goal:** Correct the owner-facing prose in the root manifest so it no longer describes the repo as solely a "Pi package," now that it is a workspace root shipping a Claude Code plugin, a Pi package, and a publishable opencode package.
- **Audience:** Anyone reading the root manifest (npm/workspace tooling users, contributors browsing the repo).
- **Files to change:** root `package.json` (the `description` field only — this task touches no other field; the `workspaces`/dependency wiring is code plan Task 7).
- **Sections-scope:** The `description` string. Reword it so it accurately describes the repo as the home of the RP methodology shipped across all three tools / packaging artifacts, rather than naming only the Pi package and its install commands — consistent with the README "Project Usage" framing (Task 1). Do not alter any other manifest field.
- **Depends on:** none (coordinate wording with Task 1 for consistency; the manifest's structural edits are owned by code plan Task 7, so this touches only `description`)
- **Traces to:** Spec Req 11, 12; acceptance "Installation and packaging." Code plan Tasks 5, 7. (Root `package.json` is release-relevant per CONTRIBUTING, so this edit is covered by the Task 6 feature changeset — no separate changeset.)
- **Acceptance:**
  - The root `package.json` `description` no longer characterizes the repo as exclusively a Pi package; it reflects that RP ships across Claude Code, Pi, and opencode (and that the repo is now a workspace root with a publishable opencode sub-package), consistent with the README.
  - Only the `description` field is changed by this task; all other manifest fields are untouched.
