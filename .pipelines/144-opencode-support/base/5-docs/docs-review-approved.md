# Docs Review — opencode support — APPROVED

**Verdict:** Approved (iteration 1)
**Batch:** all 7 doc-plan tasks (Task 1–Task 7)
**Diff range reviewed:** `1601199 → HEAD`, doc surfaces only — `README.md`, `website/index.html`, `CONTRIBUTING.md`, `.changeset/opencode-support.md`, root `package.json` `description`.
**Oracle:** the shipped phase-4 code (`packages/opencode/`, `scripts/sync-version.mjs`, `.changeset/config.json`, `skills/radical-pipelines/reference/conventions/opencode.md`).

## Scope confirmation

Reviewed only the five doc surfaces. The code surfaces in the same diff range (`skills/`, `packages/opencode/`, `scripts/`, the structural `package.json` `workspaces` field, `.changeset/config.json`) were treated as the shipped-code oracle, not re-reviewed (approved in phase 4). The Claude Code and Pi install/usage README sections and the website demo artifact (terminal card label, demo log, caption link) were checked only to confirm the additions did not degrade or alter them.

## Per-task verdict and accuracy spot-check

### Task 1 — README Project Usage + opencode install/usage — PASS

- Intro sentence now names all three tools (Claude Code, Pi, opencode) plus the standalone skill and states all "run the same pipeline" (README.md:62). No closed pair remains.
- New `## opencode package install` + `## opencode usage` sections sit parallel to the Pi sections; the Claude Code and Pi sections (README.md:64–131) are unchanged and not degraded.
- **Spot-checks against shipped code:**
  - Package name `@automattic/radical-pipelines-opencode` ↔ `packages/opencode/package.json:2`. PASS.
  - "meta-plugin … single `plugin:[]` entry that re-exports `@hueyexe/opencode-ensemble`" ↔ `packages/opencode/src/plugin.ts:22-25` (`{ ...ensembleHooks, ...RP }`). PASS.
  - "pins the ensemble version it ships against" ↔ `package.json:29` pins `"@hueyexe/opencode-ensemble": "0.15.1"` (exact, no range). PASS.
  - "Node ≥ 24 (for `node:sqlite`) or Bun ≥ 1.0" ↔ `engines { node: ">=24", bun: ">=1.0" }`. PASS.
  - "list ONLY the meta-plugin, never `@hueyexe/opencode-ensemble` alongside … second watchdog … dashboard port" ↔ `plugin.ts:13-15`, `opencode.md:70-72`. PASS.
  - Install destinations keyed to Artifact storage (`.opencode/agent/`, `.opencode/skill/radical-pipelines/`, `~/.config/opencode/`) and `.opencode/ensemble.json` write ↔ `opencode.md:57-68`. PASS.
  - Dependency-bundling prose now says "two publishable packages", adds the opencode package with pinned ensemble + `@opencode-ai/*`, and describes the `build.mjs` `prepack` step (convert frontmatter, copy skill verbatim, single edit point) ↔ `build.mjs` + `package.json` `prepack` script. PASS. The "shared source, no mirror scheme" property is preserved, not contradicted.

### Task 2 — README Configuration per-tool summary — PASS

- Added an opencode clause pointing at the opencode convention file, shape-consistent with the Claude Code and Pi clauses: "plain `git worktree` commands, team spawning through the ensemble team layer, always-on health supervision, and the same optional `Agent models` convention" (README.md:161). Matches `opencode.md`'s Worktrees/Team spawning/Health monitoring/Agent models sections.
- Shared-conventions, `.rp.local.md` local-overrides, and Pi agent-discovery prose left intact and not duplicated into the opencode clause.
- "the active CLI determines which" remains but now resolves over three convention sets and asserts no two-tool count — acceptable.

### Task 3 — README versioning — PASS

- `packages/opencode/package.json` added to the "single source of truth" version-bearing list (README.md:189) and to the "Cutting a version" sync description ("all three manifests read the same string").
- **Spot-check:** the synced targets exactly match `scripts/sync-version.mjs` `TARGET_MANIFESTS` = [`.claude-plugin/plugin.json`, `packages/opencode/package.json`]. PASS — exhaustive, no omission.
- Release-flow framing still correct: root stays private, no registry publish; the sub-package's publish status described consistently with CONTRIBUTING (Task 5). No contradiction.

### Task 4 — website/index.html — PASS

- `<meta name="description">` and `<meta name="keywords">` now include opencode.
- Hero stats: `15 → 17` agents and `2 → 3` CLIs.
  - **Spot-check (agents):** `ls agents/*.md` = 17; the README Pi section enumerates the same 17 profiles (phase 0 has no agent); design doc states "17 agent bodies". PASS.
  - **Spot-check (CLIs):** three supported tools after this feature; no closed-pair count remains. PASS.
- Demo "runs in your CLI (Claude Code, Pi, or opencode)" and "Tooling caught up" line updated to the trio.
- Install grid gains an opencode `install-block` (`"plugin": ["@automattic/radical-pipelines-opencode"]` in `opencode.json`, meta-plugin-only aside) consistent with `plugin.ts` and `opencode.md`; the Claude Code and Pi blocks are unchanged. The `install-note` adds the opencode destinations + Node ≥ 24 / Bun ≥ 1.0 prerequisite.
- **Spot-check (demo untouched):** terminal card label `terminal · claude-code` (index.html:214) and the "Run it yourself →" caption link target `#claude-code-plugin-install` (index.html:233) are unchanged — matching Task 4's leave-the-demo-artifact rule and the still-valid README anchor (Task 1 keeps that section). PASS.

### Task 5 — CONTRIBUTING release rules — PASS

- `changedFilePatterns` list now includes `packages/**` (the `packages/opencode/` sub-package) and the root `package.json` note is reworded so a nested `package.json` matches via `packages/**`, not the anchored root pattern.
  - **Spot-check:** matches `.changeset/config.json:12` = [`skills/**`, `agents/**`, `.claude-plugin/**`, `packages/**`, `package.json`, `README.md`]. PASS.
- Versioning-policy and Release-process sync prose now name `packages/opencode/package.json` alongside `.claude-plugin/plugin.json` ↔ `sync-version.mjs` `TARGET_MANIFESTS`. PASS.
- "private / no npm publish" reconciled: the root stays private, the sub-package is acknowledged as npm-publishable, and the release flow is stated to publish neither. No statement claims the whole repo is unpublishable.
- Bump table, pre-1.0 policy, changeset gate, and manual escape hatch untouched beyond the path/sync reconciliation.
- **Cross-doc consistency:** README versioning (Task 3) and CONTRIBUTING (Task 5) agree — both describe a private root, both manifests version-synced, and a release that publishes nothing to a registry.

### Task 6 — feature changeset — PASS

- Exactly one feature changeset: `.changeset/opencode-support.md`, front matter `"@automattic/radical-pipelines": minor`, one-line imperative summary.
- **Spot-check:** the bump table (CONTRIBUTING) maps a new feature pre-1.0 → `minor`; `minor` passes the changeset gate (not `major`). Front-matter-plus-summary shape matches the existing `.changeset/per-phase-summaries.md` and `fresh-team-per-run.md`. PASS.
- Summary names the `@automattic/radical-pipelines-opencode` sub-package and that owners can install RP and run the pipeline on opencode — granularity consistent with existing entries.

### Task 7 — root package.json `description` — PASS

- `description` reworded from "Radical Pipelines Pi package …" to describe the workspace root that ships across Claude Code, Pi, and opencode and hosts the publishable `@automattic/radical-pipelines-opencode` sub-package under `packages/` — consistent with the README Project Usage framing (Task 1).
- **Spot-check:** the diff changes only `description` (the adjacent `workspaces` field is the code-plan Task 7 structural edit, not this doc task); `name`, `version`, `private`, `keywords` untouched. PASS.

## Cross-cutting checks

- **Drift sweep:** no doc-plan surface left stale (every closed "Claude Code and Pi" pair across README, website, CONTRIBUTING, and root description now includes opencode). No shipped public surface left undocumented (package name, install mechanism, pinned ensemble, Node/Bun prerequisite, meta-plugin-only rule, version-sync targets, `changedFilePatterns`, the changeset all documented).
- **Scope adherence:** no scope creep into the generic skill / convention files (owned by the code plan), agent bodies, or machine config. The deliberately excluded surfaces (`.rp.md`, `marketplace.json`, `.pi/settings.json`, generated `CHANGELOG.md`) are untouched.
- **Hero-stat sanity:** CLIs = 3, agents = 17 — both verified against shipped reality.
- **Convention compliance:** doc prose matches the host docs' voice; no contradiction with `opencode.md`; the README links to the opencode convention file the same way it links to the others rather than restating it.

No issues found. Approved.
