# Design doc — Restructure the repository layout (issue #70)

## Overview

The Radical Pipelines repository ships two distribution targets side by side — a
Claude Code plugin and a Pi extension — plus files that exist only because the
project dogfoods Radical Pipelines on itself. Today three concerns are tangled:
the **shared distribution** (the methodology skill and the agent profiles), the
**per-tool packaging** (what is specific to Claude Code vs. Pi), and the
**project-level Radical Pipelines state** (this repo's own conventions and
pipeline artifacts). The current layout obscures all three behind a hidden
`.agents/` directory exposed through root symlinks, a duplicated Pi manifest under
`.pi-extension/`, three separate `.rp.md` conventions files, and dogfood-only
dotdirs (`.claude/`, `.pi/`).

This design reorganizes the repository so the three concerns are immediately
legible and adding a future tool becomes a localized change: the shared skill and
agents become real top-level directories (`skills/radical-pipelines/`, `agents/`),
each tool's install path keeps working from a single root manifest, project-level
state consolidates under one `.rp/` namespace, and every cross-reference (shipped
skill content, tooling, docs) stays correct.

This is a repository-restructuring meta-task. The "design" is therefore a concrete
set of file moves, deletions, and edits; the order they must happen in; and how
each install path stays working through the change. The architecture below
describes that target state and the decisions that produce it — the step-by-step
code plan is phase 3.

## Approach

Two externally-pinned anchors constrain everything and are deliberately **not**
moved:

- **Claude Code anchor.** `.claude-plugin/marketplace.json` and
  `.claude-plugin/plugin.json` stay at the repo root, and `marketplace.json`'s
  `plugins[0].source: "./"` is unchanged. Claude Code resolves a `source: "./"`
  plugin's components from the repo root, so `skills/<name>/SKILL.md` and a flat
  `agents/` directory must exist as **real** paths at the root.
- **Pi anchor.** The root `package.json` stays at the root as the single Pi
  manifest. The `git:` install resolves it at the clone root; `pi install . -l`
  resolves it at the local path.

Because both anchors already point at the repo root, the whole restructure reduces
to: promote the two canonical source trees from `.agents/` to real root
directories, delete every mirror symlink and every dogfood-only dotdir, collapse
the three manifests/conventions files to one each, and fix the references that
named the old locations. No new indirection layer is introduced — the `providers/`
folder from the original sketch was dropped by the owner (spec Out of Scope).

The work splits into two layers, and that split is the spine of the design:

- **Layer 1 — shipped skill** (`skills/radical-pipelines/`). Ships to every
  consumer of the methodology, so any edit here is a methodology-wide change. The
  design deliberately minimizes Layer-1 churn: exactly one Layer-1 edit is forced
  regardless of any decision (the health-monitoring self-reference, R7/AC5), one
  cluster is gated on the OD1 decision (the conventions-file path across four
  files), and one single line is the OD3 alignment.
- **Layer 2 — repo-local** (dogfood conventions, tooling, docs, gitignore,
  changeset, pipeline artifacts). Internal to this repository; ships to no
  consumer.

Three sequencing principles govern the ordering:

1. **Promote real sources and delete symlinks before reference rewrites**, so each
   rewrite is validated against the new on-disk reality.
2. **Apply the Layer-1 conventions edits as one atomic group**, so the skill's
   read path, write path, and the dogfood file never disagree at any commit
   boundary (R6/AC6).
3. **Defer empirical install verification** (Claude Code plugin load, Pi install)
   to a later phase, since neither CLI was runnable during spec/design research.

## Components

The restructure touches these components. Each is described by its target state.

### Shared distribution (real top-level sources)

- **`skills/radical-pipelines/`** — promoted from `.agents/skills/radical-pipelines`
  to a real directory. Holds `SKILL.md` and the `reference/` tree. The
  plural-container + named-subdirectory shape (`skills/radical-pipelines/`) is
  mandatory; both tools discover the skill by that path. A singular `skill/`
  directory is invalid and would break discovery once symlinks are gone (R1).
- **`agents/`** — promoted from `.agents/agents` to a real flat directory holding
  the 17 agent profile `.md` files (R1).

### Per-tool packaging (single manifests at root)

- **`.claude-plugin/plugin.json`** and **`.claude-plugin/marketplace.json`** —
  unchanged, at root. `marketplace.json` `source: "./"` unchanged. Sole Claude
  Code packaging surface.
- **`package.json`** (root) — the single Pi manifest. `pi.skills[0]` repointed from
  `.pi-extension/skills` to `"skills"`. `scripts.release:version` trimmed to drop
  the `npm --prefix .pi-extension install` tail.
- **`teams.yaml`** (root) — moved from `.pi-extension/teams.yaml` to preserve the
  five pi-teams template definitions (see Key Decisions → teams.yaml).

### Project-level Radical Pipelines state (`.rp/`)

- **`.rp/CONVENTIONS.md`** — the single merged conventions file (OD1 Branch A): a
  shared top section plus a per-tool section for Claude Code and for Pi.
- **`.rp/pipelines/<slug>/`** — this repo's pipeline artifacts, renamed from
  `.pipelines/` (R8).

### Tooling, docs, and metadata

- **`scripts/sync-version.mjs`** — `TARGET_MANIFESTS` reduced to
  `[.claude-plugin/plugin.json]` only.
- **`scripts/test/sync-version.test.mjs`** — unchanged; it loops generically over
  `TARGET_MANIFESTS` and auto-adjusts.
- **`.gitignore`** — reduced to `node_modules/` only (dead dotdir/extension entries
  removed).
- **`.changeset/changelog-and-version-sync.md`** — pending entry; stale text
  corrected (see Failure Modes).
- **`.changeset/<new>-restructure.md`** — the new changeset for this change.
- **`README.md`** — ~7 sections rewritten to match the new layout.
- **`CLAUDE.md`** — retained, one-line `@AGENTS.md` (R11/AC9).

### Deleted

`.agents/` (contents promoted); all six tracked mirror symlinks; `.claude/` and
`.pi/` (dogfood dotdirs); `.pi-extension/` (second manifest, lockfile, README,
symlinks — `teams.yaml` moved out first); root `.rp.md` (merged); `.pipelines/`
(renamed); optionally root `assets/` (OD4).

## Interfaces and Data Flow

### Claude Code plugin resolution (AC2/AC3 install path)

```
/plugin marketplace add Automattic/radical-pipelines
  → reads .claude-plugin/marketplace.json (root)
  → plugins[0].source: "./"  → component root = repo root
  → loads skills/radical-pipelines/SKILL.md   (real dir)
  → loads agents/*.md                         (real flat dir)
```

The marketplace copies the entire repo root into the plugin cache (a property of
`source: "./"`, unchanged by this work); only the declared components load, the
rest is inert. Local development loads the plugin from the checkout via
`claude --plugin-dir ./` — no dogfood dotdir required (R3).

### Pi install resolution (AC3 install path)

```
pi install . -l         (after one-time root `npm install`)
  — or —
pi install git:github.com/Automattic/radical-pipelines
  → reads package.json (root, single manifest)
  → pi.skills[0] = "skills"  → resolves skills/radical-pipelines/  (real dir)
```

### Conventions read/write flow (R6/AC6)

The conventions file is **not** auto-read by any tool — neither Claude Code nor Pi
reads `.rp.md`; the tool-native instruction files are `CLAUDE.md`/`AGENTS.md`. The
orchestrator opens the conventions file only because the skill instructs an
explicit Read. The path is therefore whatever the skill says, as long as three
references agree:

```
skill READ path   (reference/conventions/load.md)   ─┐
skill WRITE path  (reference/conventions/setup.md)   ─┼─ all → .rp/CONVENTIONS.md
this repo's dogfood file on disk                     ─┘
```

This is why the Layer-1 conventions edits must land as one atomic group: any
commit where these disagree breaks conventions loading for this repo and every
consumer.

### Version-sync data flow (AC4)

```
root package.json  =  version SOURCE (never a target)
  → scripts/sync-version.mjs
  → TARGET_MANIFESTS = [.claude-plugin/plugin.json]   (sole target)
```

## Key Decisions

Every decision traces to a spec Requirement (Rn) or Acceptance Criterion (ACn).

### KD1 — Promote canonical sources to real root directories (R1, R2 / AC1)

`skills/radical-pipelines/` and `agents/` become real directories; the hidden
`.agents/` tree and all six mirror symlinks are removed. This is the core of the
restructure: the directories consumers read are the real sources, not symlinks
into a hidden dir. The plural-container shape is retained because both tools
require `skills/<name>/SKILL.md` for discovery.

### KD2 — Single Pi manifest at root (R4 / AC3)

The duplicate `.pi-extension/` manifest, its lockfile, and its README are deleted;
`package.json`'s `pi.skills[0]` is repointed to `"skills"`. Both Pi install paths
(`git:` and `pi install . -l`) resolve the single root manifest. Forgetting to
repoint `pi.skills[0]` would leave it pointing at the deleted `.pi-extension/skills`
— the primary Pi-side failure mode.

### KD3 — Single conventions file at `.rp/CONVENTIONS.md` (OD1 → Branch A; R5, R6 / AC6)

The three `.rp.md` files (root pointer + one per tool) merge into one
`.rp/CONVENTIONS.md` with a shared section plus per-tool sections. **Branch A
(relocate into `.rp/`) is chosen over Branch B (keep root `.rp.md`)** because:

- The path is technically free to change — no tool forces project-root; relocation
  only requires the skill's read/write/heading references to agree (R6).
- The owner raised this exact relocation in issue #70, and R8 already moves
  pipeline state into `.rp/`. Branch A makes `.rp/` the single home for all
  project-level Radical Pipelines state (conventions + pipelines), which is the
  stated motivation of the restructure.

Branch B remains the documented fallback if the owner wants zero shared-skill
churn; the spec holds under either branch. Under Branch B, the merged file stays at
root `.rp.md`, the four Layer-1 conventions files are left untouched, and `.rp/`
holds only `pipelines/`.

**Name: `.rp/CONVENTIONS.md`** over `.rp/RP.md`. The skill's vocabulary is
"conventions" throughout (`reference/conventions/`, "Load Conventions", "Setup
Conventions"); `CONVENTIONS.md` matches it and avoids the redundant "rp/rp". The
owner left naming open; this is reversible by a single string change in the same
four files.

The Branch A edit set is **12 lines across 4 shipped files** (the exact list, with
file:line evidence, is in design-doc-research §2/OD1): `load.md` ×1 (the READ
path), `setup.md` ×9 (including the load-bearing WRITE path at line 176 and the
read-back reminder at 194), `claude-code.md` ×1 heading, `pi.md` ×1 heading. There
are **zero** other `.rp.md` references anywhere under the shipped skill, which
bounds the blast radius precisely.

### KD4 — Defer multi-tool conventions emission (OD2 → defer; spec Out of Scope)

The shared skill keeps its single-file, single-tool model; it is not taught to
emit a multi-tool `## When using <tool>` file. A normal consumer uses one CLI and
gets one tool's block. This repository is the only multi-CLI consumer and
**hand-maintains** its merged `.rp/CONVENTIONS.md`. Adding a methodology-wide
generator would enlarge Layer-1 for a single beneficiary; R6/AC6 are satisfiable
without it.

### KD5 — Align shipped artifact-folder default to `.rp/pipelines/` (OD3 → align; R8)

`setup.md`'s suggested default changes from `.pipelines/<slug>/` to
`.rp/pipelines/<slug>/` (a single line). It remains a *suggested* default —
consumers still pick their own — so risk is low. The benefit: a consumer who
accepts both suggested defaults ends with `.rp/CONVENTIONS.md` + `.rp/pipelines/`,
the same shape this repo dogfoods, making shipped guidance self-consistent.
(Leaving it at `.pipelines/` is defensible but would ship guidance diverging from
this repo's own layout — the weaker choice.)

### KD6 — Fix the forced shipped-skill self-reference (R7 / AC5)

`reference/health-monitoring.md` line 65 references the canonical source by an
absolute path tied to the old hidden dir
(`.agents/skills/radical-pipelines/reference/health-monitoring.md`). It is
rewritten to the skill-relative `reference/health-monitoring.md`. This is required
**regardless of any other decision**: an outside-the-plugin absolute path is
already broken in an installed plugin cache, independent of the restructure.

### KD7 — Consolidate project state under `.rp/` (R8 / AC7)

`.pipelines/` is renamed to `.rp/pipelines/`. Combined with KD3, `.rp/` becomes the
single top-level home for all project-level Radical Pipelines state. `.rp/` is a
Radical-Pipelines-invented namespace, not harness-reserved, so a file
(`CONVENTIONS.md`) and a directory (`pipelines/`) coexist under it with no
collision.

### KD8 — Version-sync targets only the surviving manifest (R9 / AC4)

`scripts/sync-version.mjs` drops `.pi-extension/package.json` from
`TARGET_MANIFESTS`, leaving only `.claude-plugin/plugin.json`. The root
`package.json` remains the version SOURCE, never a target. `release:version` drops
the `npm --prefix .pi-extension install` step. The sync-version test is unchanged
(generic over `TARGET_MANIFESTS`) and must stay green.

### KD9 — Preserve `teams.yaml` by moving it to root (spec-implicit; supports R4)

`.pi-extension/teams.yaml` is the only in-repo definition of the five pi-teams
templates. It has **no programmatic consumer**: it is referenced only by
`.pi-extension/package.json`'s `files:` publish array (dead for git/local
installs) and by documentary prose telling users to register the templates into
the **global** `~/.pi/teams.yaml`. Deleting `.pi-extension/` literally would
silently lose the canonical template source the README still tells users to
register. Resolution: `git mv .pi-extension/teams.yaml teams.yaml` — preserve the
source next to the single Pi manifest without adding a manifest reference. The
README's "register globally" instruction is repointed to root `teams.yaml`.

### KD10 — Retain `CLAUDE.md` (R11 / AC9)

`CLAUDE.md` (one-line `@AGENTS.md` import) is explicitly **not** deleted. Claude
Code does not read `AGENTS.md` natively; removing `CLAUDE.md` would silently drop
all project instructions for Claude Code. `AGENTS.md` remains the source of truth.

### KD11 — Optional asset merge (OD4 → recommend merge, landing PNG wins)

The two `radical-pipelines.png` files are **not** byte-identical. Recommendation:
keep `landing/assets/radical-pipelines.png` (already deployed to GitHub Pages and
referenced by `landing/index.html`), delete root `assets/`, and repoint the single
README header reference (`README.md:3`) to `./landing/assets/radical-pipelines.png`.
One image, one home, and the README image becomes the deployed-site image. This is
**optional/secondary** per the spec; it is an owner/writer aesthetic call (the
images differ in export size and were not visually diffed). If the owner prefers
the root image, the merge instead copies the root PNG over the landing one (the 4
landing refs keep the same filename) and still deletes root `assets/`. If declined,
root `assets/` and `README.md:3` stay as-is and nothing else depends on it.

### KD12 — Changeset bump type: `minor` recommended (R13 / AC10)

This alters install paths and layout external users could rely on — a breaking
change by strict semver (`major`). But the repo is pre-1.0 (`0.1.1`), 0.x semver
permits treating breaking changes as `minor`, and the project's prior practice
(the pending `changelog-and-version-sync.md`) used `minor` for a comparably
significant change. **Recommend `minor`**, consistent with established 0.x
convention; the owner/writer makes the final call per the README's changelog
guidance. The changeset body describes the flat layout, the single Pi manifest, the
single `.rp/CONVENTIONS.md`, and the removed install paths/symlinks.

## Dependencies

- **No new runtime dependencies.** This is a pure reorganization; no packages are
  added or upgraded.
- **External tooling for verification (later phase):** the `pi` CLI (for
  `pi install . -l` + `pi list`) and a live Claude Code marketplace add /
  `--plugin-dir` load. Neither was available during spec/design research.
- **Ordering dependency (internal):** reference rewrites depend on the moves
  preceding them; the Layer-1 conventions edits depend on each other (atomic
  group). The pipeline-artifact rename (`.pipelines/` → `.rp/pipelines/`) must be
  ordered late because it relocates this running pipeline's own artifacts (see
  Failure Modes → in-flight self-move).
- **Git operations:** moves use `git mv` and deletions use `git rm` so history and
  the index stay consistent; the symlink entries are removed as tracked
  `120000`-mode index entries.

## Failure Modes and Observability

### Failure modes (each with its mitigation)

- **Layer-1 path disagreement (R6/AC6).** If the conventions edits split across
  commits or one line is missed, the skill could read one path and write another,
  breaking conventions loading for every consumer. *Mitigation:* apply all 12
  conventions edits as one atomic group.
- **Missed forced Layer-1 fix (R7/AC5).** Forgetting the `health-monitoring.md:65`
  rewrite leaves a broken absolute path in installed plugins. *Mitigation:*
  explicit dedicated edit (KD6).
- **Pi skill-resolution break (R4/AC3).** Forgetting to repoint `pi.skills[0]`
  leaves it pointing at deleted `.pi-extension/skills`. *Mitigation:* KD2; empirical
  `pi install . -l` + `pi list` in verification.
- **Release-script break (R9/AC4).** Leaving the `npm --prefix .pi-extension` step
  makes `release:version` fail (installs a non-existent dir); leaving the
  `.pi-extension/package.json` sync target makes `sync-version.mjs` write a deleted
  file. *Mitigation:* KD2 + KD8; run the sync-version test.
- **In-flight artifact self-move.** `.pipelines/` is tracked and contains this very
  pipeline's artifacts. Renaming it to `.rp/pipelines/` relocates the running
  pipeline's own artifact folder. The move itself is a `git mv` of committed files
  and is safe; the orchestrator must use the post-move path (`.rp/pipelines/<slug>`)
  for any artifact written after the rename. *Mitigation:* order the rename late;
  treat the artifact path as `.rp/pipelines/<slug>` for all post-move writes. (This
  design phase's own `2-design-doc/` artifacts are written before the code phase
  under the old `.pipelines/` path and move with everything else — no special
  handling beyond awareness.)
- **`teams.yaml` silent loss.** Deleting `.pi-extension/` without preserving
  `teams.yaml` drops the only in-repo template definition. *Mitigation:* KD9 moves
  it to root first.
- **Pending-changeset stale text (R9-adjacent).** `.changeset/changelog-and-version-sync.md`
  currently states the version step propagates to `.pi-extension/package.json` and
  regenerates the extension lockfile. After this restructure that sentence is false
  and would be written verbatim into `CHANGELOG.md` at the next release — so this is
  **not merely editorial**. *Mitigation:* correct the pending entry to name only
  `.claude-plugin/plugin.json` and drop the lockfile clause. (Distinct from the new
  restructure changeset.)
- **README factual drift (R12/AC8).** The README's "Dependency bundling" section
  claims "the root manifest declares the same bundled dependencies directly" — but
  the root manifest has **no** `bundledDependencies`. *Mitigation:* rewrite to the
  true mechanism (git-install delivers deps via `dependencies` + Pi's post-clone
  `npm install`); remove the dual-layer/`.pi-extension/`/symlink descriptions.
- **Plugin cache copies the whole repo.** With `source: "./"`, marketplace install
  copies the entire repo root; only declared components load. This is unchanged by
  #70 and the restructure actually *shrinks* the copy by deleting the dotdirs and
  `.pi-extension/`. Not a regression.

### Observability / verification (later phase)

The restructure has no runtime telemetry; "observability" here is the post-change
verification suite (AC checks):

- `git ls-files -s | grep '^120000'` → empty (no symlinks remain; AC1).
- `test ! -e .agents -a ! -e .pi -a ! -e .claude -a ! -e .pi-extension -a ! -e .rp.md -a ! -e .pipelines` (AC1/AC7).
- `grep -rn '\.agents/' skills/` → empty (AC5); `grep -rn '\.rp\.md' skills/` → empty (AC6).
- `node --test scripts/test/sync-version.test.mjs` green; `node scripts/sync-version.mjs` targets only `plugin.json` (AC4).
- README grep: no `.agents/`, `.pi-extension/`, "bundled dependencies directly", three-file split, dual-manifest sync (AC8).
- `.changeset/*.md` present for the change (AC10); `CLAUDE.md` exists and imports `AGENTS.md` (AC9).
- **Empirical (the deferred ACs):**
  - **AC2 (Claude plugin load):** `claude --plugin-dir ./` or marketplace add →
    `radical-pipelines` skill + the agent profiles exposed.
  - **AC3 (Pi install):** `pi install . -l` after root `npm install` → `pi list`
    shows the skill resolving from root `skills/`.

  **Honest caveat:** neither AC2 nor AC3 could be confirmed empirically during
  spec/design research — neither the `pi` CLI nor a live Claude Code marketplace/
  `--plugin-dir` load was runnable. The layout claims rest on the official plugin/
  manifest resolution rules **plus** the fact that the current root-served-via-symlink
  setup already works; replacing symlinks with the real directories they point at
  preserves the resolved paths. A later phase must run both checks on a machine where
  the CLIs are available before AC2/AC3 are considered satisfied.

## Risks and Open Questions

- **Empirical verification gap (carried forward).** AC2 and AC3 rest on
  documentation + the working symlink setup, not on a live run. This is the single
  largest residual risk and is explicitly deferred to a verification phase (see
  Observability caveat). It is a verification gap, not a design gap — the resolved
  paths are identical to today's working paths.
- **OD4 is an owner aesthetic call.** The two PNGs differ and were not visually
  diffed. The merge is recommended but optional; if the owner has a preference for
  which image wins, that overrides KD11. Nothing else in the restructure depends on
  OD4.
- **Changeset bump type is owner-final.** KD12 recommends `minor` per 0.x convention
  and prior practice, but the strict-semver reading is `major`; the owner/writer
  makes the final call.
- **`teams.yaml` home.** Root is the recommended home (next to the single Pi
  manifest, matches the README's "register globally" instruction). A home under
  `.rp/` or alongside the skill is possible; the owner may override. The KD9
  decision (preserve, do not delete) is firm regardless of final location.
- **No genuine open design questions block phase 3.** The OD1–OD4 resolutions are
  settled with documented fallbacks; the spec-implicit items (teams.yaml, pending
  changeset, in-flight self-move) are resolved above. Phase 3 owns final task
  granularity and the empirical verification run.
