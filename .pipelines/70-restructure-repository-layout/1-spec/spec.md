# Spec: Restructure the repository layout

## Overview

The Radical Pipelines repository ships a Claude Code plugin and a Pi extension side by side, plus files that exist only because the project uses Radical Pipelines on itself (dogfooding). Three distinct concerns are tangled together and hard to read at a glance: the **shared distribution** (the methodology skill and the agent profiles, common to all tools), the **per-tool packaging** (what is specific to Claude Code, Pi, and future tools), and the **project-level Radical Pipelines state** (this repo's own conventions and pipeline artifacts). The current layout obscures these with a hidden `.agents/` directory exposed through root symlinks, a duplicated Pi manifest, three separate `.rp.md` conventions files, and dogfood-only dotdirs (`.claude/`, `.pi/`) that an installed plugin or extension would otherwise handle.

This task reorganizes the repository so the three concerns are immediately legible: the shared skill and agents live as real top-level directories, each tool's install path keeps working from a single root manifest, project-level Radical Pipelines state is consolidated under a single `.rp/` namespace, and all cross-references (in shipped skill content, tooling, and docs) stay correct. Adding a future tool should become a localized, mechanical change. The project is at v0.1, so the cleanup is cheap now and harder once external users have memorized the current install paths.

## Requirements

1. **Shared sources become real top-level directories.** The canonical skill and the agent profiles must exist as real directories at the repository root — a `skills/` container holding the `radical-pipelines` skill (with its `SKILL.md` and `reference/` tree), and an `agents/` directory holding the agent profile files (currently 17). They must no longer be hidden behind a `.agents/` directory or exposed through symlinks. The skill directory must keep the plural-container + named-subdirectory shape (`skills/radical-pipelines/`) that both tools require to discover it; a singular `skill/` directory is not acceptable because it would break discovery once symlinks are removed.

2. **No mirror symlinks remain.** Every symlink that today mirrors the canonical skill or agents into another location (the root `agents` and `skills/radical-pipelines` symlinks, and any equivalents inside the per-tool directories) must be gone. The directories that consumers read must be the real sources.

3. **The Claude Code plugin install keeps working.** `/plugin marketplace add Automattic/radical-pipelines` must continue to resolve the plugin, and loading the plugin must expose the `radical-pipelines` skill and the agent profiles. The marketplace and plugin manifests must remain discoverable at the locations Claude Code requires (repository root). Local development must have a working path to load the plugin from the checkout without relying on a dogfood-only dotdir.

4. **The Pi install keeps working from a single root manifest.** There must be exactly one Pi manifest, at the repository root. Both Pi install paths must keep working: the end-user git install (`pi install git:github.com/Automattic/radical-pipelines`) and the local dogfood install (`pi install . -l`, after a one-time root `npm install`). The manifest's skill reference must point at the new real `skills/` location. The duplicate per-tool Pi manifest, its lockfile, and its supporting files must no longer exist.

5. **A single conventions file.** The three separate conventions files (root pointer plus one per tool) must be consolidated into one conventions file containing a shared top section (conventions common to all tools) and a per-tool section for each supported tool. The merged file must not contain stale content: no pointer to per-tool files, no reference to a dogfood auto-install mechanism, no claim that agents are exposed via symlinks from a hidden directory, and the Pi local-install instruction must reflect `pi install . -l`. Genuine tool-runtime conventions (e.g. per-tool worktree and agent-discovery locations) must be preserved.

6. **The skill's read and write paths for the conventions file must agree.** Wherever the conventions file ends up, the shared skill instruction that reads it and the shared skill instruction that writes it must reference the same location, and this repository's own dogfood use must match that location so its pipelines can load conventions. (The exact location and name is an open decision — see Open Decisions OD1.)

7. **Shipped skill content contains no broken or out-of-plugin references.** No file under the shipped skill may reference the canonical sources by an absolute path tied to the old hidden directory. In particular, the self-reference to the health-monitoring reference inside the monitoring prompt template must resolve correctly from within an installed plugin (i.e. it must be skill-relative). This correction is required regardless of any other decision, because such an absolute, outside-the-plugin path is already broken for installed plugins.

8. **Project-level Radical Pipelines state is consolidated under `.rp/`.** This repository's own pipeline artifacts must live under a single `.rp/` namespace (e.g. `.rp/pipelines/<slug>/`) rather than a separate top-level directory, so that all project-level Radical Pipelines state shares one home.

9. **Version-sync tooling stays correct.** The release/version-sync tooling must reference only manifests that still exist after the restructure. With the duplicate Pi manifest removed, the sync targets must no longer include it (the root `package.json` remains the version source, and the Claude Code plugin manifest remains the sole sync target), and the release script must no longer attempt to install or update the removed manifest. The existing sync-version tests must still pass.

10. **`.gitignore` references only paths that still exist.** Ignore entries for directories removed by this restructure (the dogfood Pi/Claude dotdir caches and the duplicate Pi manifest's `node_modules/`) must be removed. The root `node_modules/` must remain ignored.

11. **`CLAUDE.md` is retained.** The root `CLAUDE.md` one-line `@AGENTS.md` import must be kept, because Claude Code does not read `AGENTS.md` natively; deleting it would silently drop all project instructions for Claude Code. `AGENTS.md` remains the source of truth for project instructions.

12. **README is updated to match the new layout.** The README must describe the new flat layout and the working install paths, and must contain no stale references to the removed hidden directory, the duplicate Pi manifest, the symlink scheme, the three-file conventions split, or the dual-manifest/version-sync description. Any factually incorrect claim that the restructure invalidates (notably the dependency-bundling description) must be corrected rather than carried forward.

13. **A changeset accompanies the change.** Per the repository's standing rule, a committed changeset entry must accompany this change. Because it alters install paths and layout that external users could rely on, the bump type is chosen per the project's changelog/versioning guidance.

## Out of Scope

- **The `providers/` directory.** The original sketch proposed a `providers/` folder for per-tool packaging; under the confirmed constraints it provides no functional value and was explicitly dropped by the owner. The agreed direction is the flat root-served layout.
- **Teaching the shared skill to emit a multi-tool conventions file.** The skill currently produces a single-tool conventions block for single-CLI consumers. This repository is the only multi-CLI consumer and may hand-maintain its merged conventions file. Adding a methodology-wide capability for the skill to generate a multi-tool `## When using <tool>` file is not required (see OD2).
- **Moving the marketplace catalog out of this repository.** Relocating the marketplace catalog into a separate repository is tracked separately (issue #73) and is not part of this work; the marketplace manifest stays at the repository root with its source unchanged.
- **Deleting `CLAUDE.md`.** The original sketch proposed removing it; this is explicitly excluded (see requirement 11).
- **Adding a new tool/provider (e.g. Codex).** This restructure should make that a localized future change, but no new tool is added here.

## Acceptance Criteria

- **AC1 — Real sources, no hidden dir, no symlinks.** Given the restructured repository, when its top level is inspected, then `skills/radical-pipelines/SKILL.md` and the agent profile files under `agents/` exist as real files; and the hidden `.agents/` directory, the dogfood `.claude/` and `.pi/` directories, the duplicate Pi extension directory, the standalone top-level pipeline-artifacts directory, the separate root conventions pointer, and all mirror symlinks no longer exist.

- **AC2 — Claude Code plugin loads.** Given the restructured repository, when the plugin is added via the marketplace and loaded (or, at minimum, when the layout is checked against Claude Code's documented plugin resolution: `skills/<name>/SKILL.md` plus a flat `agents/` directory under a root-sourced plugin), then the `radical-pipelines` skill and the agent profiles are exposed.

- **AC3 — Pi install resolves from the single root manifest.** Given the restructured repository with a single root Pi manifest, when `pi install . -l` is run after a root `npm install` (and equivalently when the git install path is used), then the install succeeds and the `radical-pipelines` skill resolves from the root `skills/` location. (Empirical confirmation requires the `pi` CLI; a later phase must verify it on a machine where Pi is available.)

- **AC4 — Version-sync tooling is clean.** Given the restructured repository, when the version-sync script runs, then it targets only the still-existing Claude Code plugin manifest, completes without referencing the removed Pi manifest, the release script contains no reference to the removed manifest, and the sync-version tests pass.

- **AC5 — No broken shipped-skill references.** Given the shipped skill content, when its cross-references are inspected, then no file references the canonical sources by an absolute path tied to the old hidden directory, and the health-monitoring self-reference inside the monitoring prompt template resolves skill-relatively (so it works inside an installed plugin).

- **AC6 — Single conventions file with agreeing paths.** Given the restructured repository, when the conventions are inspected, then exactly one merged conventions file exists at the chosen location, it contains a shared section plus per-tool sections, it carries no stale pointer/auto-install/symlink content, and the skill's read instruction and write instruction both reference that same location (with this repo's dogfood use matching it).

- **AC7 — Consolidated `.rp/` state.** Given the restructured repository, when project-level Radical Pipelines state is inspected, then this repository's pipeline artifacts live under `.rp/` (e.g. `.rp/pipelines/<slug>/`) and no standalone top-level pipeline-artifacts directory remains.

- **AC8 — README matches the layout.** Given the restructured repository, when the README is read, then it documents the new flat layout and the working install paths and contains no stale references to the removed hidden directory, the duplicate Pi manifest, the symlink scheme, the three-file conventions split, or the incorrect dependency-bundling claim.

- **AC9 — `CLAUDE.md` retained.** Given the restructured repository, when the root is inspected, then `CLAUDE.md` still exists and imports `AGENTS.md`.

- **AC10 — Changeset present.** Given the change, when the changeset directory is inspected, then a changeset entry accompanies it with a bump type chosen per the project's versioning guidance.

## Open Decisions (to resolve in the design phase)

These are genuine design-phase decisions. The requirements above are written to hold regardless of how each is resolved; the spec-research recommendation is recorded for each.

- **OD1 — Where does the conventions file live, and what is it named? [Owner's call; materially changes scope.]** This is the one decision that determines whether the *shared skill* changes.
  - *Branch A — relocate into `.rp/` (recommended):* the merged file lives at `.rp/CONVENTIONS.md` (name matches the skill's "conventions" vocabulary; `RP.md` is also viable and the owner left naming open). This requires editing the shipped skill files that read, write, and describe the conventions file so all paths agree — a methodology-wide change that ships to every consumer. The owner raised this in the issue discussion, and it realizes the "everything Radical Pipelines under `.rp/`" goal.
  - *Branch B — keep at the project root:* the merged file stays as the root `.rp.md`; the shared skill is untouched (smaller blast radius), and `.rp/` then holds only `pipelines/`.
  - Requirement 6 (read/write paths must agree) holds under either branch.

- **OD2 — Should the shared skill learn a multi-tool `## When using <tool>` conventions format?** The skill currently emits one tool's block for single-CLI consumers. Recommendation: hand-maintain this repository's merged file and defer teaching the skill multi-tool emission unless the owner wants it (treated as out of scope for this work above).

- **OD3 — Should the shipped artifact-folder default change to `.rp/pipelines/`?** This repository adopts `.rp/pipelines/` (requirement 8), but the shipped *suggested default* in the skill setup is a separate methodology choice. Recommendation: align the shipped default with `.rp/pipelines/` for consistency; the design phase decides, since consumers can pick their own.

- **OD4 — Optionally merge the root `assets/` image into `landing/assets/`.** The two `radical-pipelines.png` files are not byte-identical (different content and size), so merging requires deliberately picking one image and updating the single README reference to it. Recommendation: optional/secondary; if done, the owner/writer picks which image wins and the README reference is updated (bonus: it would then be served on the deployed landing site).
