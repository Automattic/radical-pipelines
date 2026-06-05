# Code Plan: Restructure the repository layout

## Overview

This is a repository-restructuring meta-task: the tasks are file moves, deletions,
and edits — not feature code. The Radical Pipelines repo today tangles three
concerns behind a hidden `.agents/` directory exposed via root symlinks, a
duplicate Pi manifest under `.pi-extension/`, three separate `.rp.md` conventions
files, and dogfood-only dotdirs (`.claude/`, `.pi/`). The end state makes the
shared sources real top-level directories (`skills/radical-pipelines/`, `agents/`),
keeps each tool's install path working from a single root manifest, consolidates
this repo's own Radical Pipelines state under one `.rp/` namespace
(`.rp/CONVENTIONS.md` + `.rp/pipelines/`), and corrects every non-doc cross-reference.

The order is load-bearing. First promote the two canonical source trees to real
root directories and remove the mirror symlinks (so later reference rewrites are
validated against the real on-disk layout). Then collapse the Pi manifest and fix
the tooling that named the removed manifest. Then apply the shipped-skill (Layer-1)
edits — the conventions-path cluster lands as **one atomic group** so the skill's
read path, write path, and this repo's dogfood file never disagree at any commit
boundary. Create the merged `.rp/CONVENTIONS.md` and remove the three old
conventions files. Clean `.gitignore`. Add the new changeset and correct the stale
pending changeset. Finally — and deliberately last among the moves — rename the
running pipeline's own `.pipelines/` to `.rp/pipelines/`; every artifact written
after that rename uses the post-move path. The README rewrite and landing-site copy
are **documentation (phase 5)** and are out of scope here; only non-doc reference
correctness lands in this plan.

Two acceptance criteria (AC2 Claude plugin load, AC3 Pi install) require CLIs that
may be absent in this environment. Their verification tasks instruct the code-writer
to attempt the empirical check and record the honest result (pass / not-runnable),
without blocking on it. AC4 (sync-version) is runnable here.

Throughout: use `git mv` for moves and `git rm` for deletions so history and the
index stay consistent. Symlinks are tracked as `120000`-mode index entries and are
removed with `git rm`. Commit messages follow the project format (imperative,
sentence case, no trailing period, agent name in parentheses).

## Tasks

### Task 1: Promote the canonical skill tree to a real `skills/radical-pipelines/`

- **Goal:** Make `skills/radical-pipelines/` a real directory (not a symlink into a
  hidden dir) holding `SKILL.md` and the full `reference/` tree, so both tools
  discover the skill at the path they require.
- **Files to change:**
  - Remove tracked symlink `skills/radical-pipelines` (target
    `../.agents/skills/radical-pipelines`).
  - Move the real tree from `.agents/skills/radical-pipelines/` to
    `skills/radical-pipelines/` (it currently contains `SKILL.md`,
    `reference/assisted-phases/`, `reference/autonomous-phases/`,
    `reference/conventions/`, and the remaining `reference/*.md` files).
- **Changes:**
  - `git rm skills/radical-pipelines` to delete the symlink entry.
  - `git mv .agents/skills/radical-pipelines skills/radical-pipelines` to relocate
    the real tree. After this, `skills/radical-pipelines/SKILL.md` and
    `skills/radical-pipelines/reference/...` are real files at the repo root.
  - Do **not** edit any file content in this task; content edits to the skill come
    in later tasks (Tasks 7–9). The plural-container + named-subdirectory shape
    (`skills/radical-pipelines/`) must be preserved exactly; a singular `skill/`
    name is invalid.
- **Depends on:** none
- **Traces to:** R1, R2 / AC1, AC2; Design KD1
- **Acceptance:**
  - `skills/radical-pipelines/SKILL.md` exists as a real file (not a symlink).
  - `skills/radical-pipelines/reference/` exists as a real directory with its
    subtree (`assisted-phases/`, `autonomous-phases/`, `conventions/`, and the
    top-level reference `.md` files) present as real files.
  - No symlink remains at `skills/radical-pipelines`.
  - The directory name is the plural-container form `skills/radical-pipelines/`,
    not `skill/`.

### Task 2: Promote the canonical agent profiles to a real `agents/` directory

- **Goal:** Make `agents/` a real flat directory holding the 17 agent profile `.md`
  files, not a symlink into the hidden dir.
- **Files to change:**
  - Remove tracked symlink `agents` (target `.agents/agents`).
  - Move the real directory from `.agents/agents/` to `agents/` (17 files:
    `code-plan-reviewer.md`, `code-plan-writer.md`, `code-reviewer.md`,
    `code-writer.md`, `design-doc-analyst.md`, `design-doc-researcher.md`,
    `design-doc-reviewer.md`, `design-doc-writer.md`, `doc-plan-reviewer.md`,
    `doc-plan-writer.md`, `doc-reviewer.md`, `doc-writer.md`, `spec-analyst.md`,
    `spec-consolidator.md`, `spec-researcher.md`, `spec-reviewer.md`,
    `spec-writer.md`).
- **Changes:**
  - `git rm agents` to delete the symlink entry.
  - `git mv .agents/agents agents` to relocate the real directory.
  - Do not edit any agent file content.
- **Depends on:** Task 1 (so both promotions happen before symlink/dotdir deletion
  and reference rewrites; Task 1 also empties `.agents/skills/`)
- **Traces to:** R1, R2 / AC1, AC2; Design KD1
- **Acceptance:**
  - `agents/` is a real directory containing all 17 agent profile `.md` files as
    real files.
  - No symlink remains at `agents`.
  - The directory is flat (the `.md` files sit directly under `agents/`).

### Task 3: Delete the remaining mirror symlinks and the now-empty hidden `.agents/`

- **Goal:** Remove every remaining mirror symlink and the emptied hidden directory,
  so no symlink mirrors the canonical sources anywhere and `.agents/` is gone.
- **Files to change:**
  - Remove tracked symlinks: `.claude/skills/radical-pipelines`,
    `.pi/skills/radical-pipelines`, `.pi-extension/agents`,
    `.pi-extension/skills/radical-pipelines`.
  - Remove the now-empty `.agents/` tree (after Tasks 1–2 its real contents were
    moved out).
- **Changes:**
  - `git rm` each of the four remaining symlink entries listed above.
  - Remove the `.agents/` directory from the index/working tree (it should hold no
    tracked files after Tasks 1–2; ensure nothing tracked remains under `.agents/`
    before removing). Do **not** delete the dogfood `.rp.md`/`settings.json` files
    under `.claude/`/`.pi/` here — those are handled in Task 11 (`.pi/`) and the
    conventions merge (Task 13), and the parent dotdirs are removed in Task 12.
- **Depends on:** Task 1, Task 2
- **Traces to:** R2 / AC1; Design KD1
- **Acceptance:**
  - No symlinks remain at `.claude/skills/radical-pipelines`,
    `.pi/skills/radical-pipelines`, `.pi-extension/agents`, or
    `.pi-extension/skills/radical-pipelines`.
  - `.agents/` no longer exists.
  - `git ls-files -s` reports no `120000`-mode entries that mirror the canonical
    skill or agents (the only six pre-existing symlinks — `agents`,
    `skills/radical-pipelines`, and the four above — are all gone).

### Task 4: Repoint the single root Pi manifest at the new `skills/` location

- **Goal:** Make the root `package.json` (the single Pi manifest) resolve the skill
  from the real root `skills/` directory instead of the removed
  `.pi-extension/skills`.
- **Files to change:** `package.json` (root).
- **Changes:**
  - In `pi.skills`, change the first entry from `".pi-extension/skills"` to
    `"skills"`. Leave the other two `pi.skills` entries
    (`node_modules/pi-teams/skills`, `node_modules/@pi-agents/loop/skills`)
    unchanged. (Note: `pi.skills[0]` points at the *container* directory; the real
    skill lives at `skills/radical-pipelines/`, matching how the old
    `.pi-extension/skills` symlinked to the same container.)
  - Do not change any other field in this task (the `release:version` script is
    Task 6).
- **Depends on:** Task 1 (real `skills/` must exist before the manifest points at it)
- **Traces to:** R4 / AC3; Design KD2
- **Acceptance:**
  - `package.json` `pi.skills[0]` equals `"skills"`.
  - No reference to `.pi-extension/skills` remains in `package.json`.
  - The two trailing `node_modules/...` skill entries are unchanged.

### Task 5: Delete the duplicate `.pi-extension/` manifest and supporting files (preserving `teams.yaml`)

- **Goal:** Remove the second Pi manifest, its lockfile, its README, and its
  remaining files so exactly one Pi manifest (root `package.json`) exists — while
  preserving `teams.yaml`, the only in-repo definition of the five pi-teams
  templates, by moving it to the repo root next to the single manifest.
- **Files to change:**
  - Move `.pi-extension/teams.yaml` → `teams.yaml` (root).
  - Delete `.pi-extension/package.json`, `.pi-extension/package-lock.json`,
    `.pi-extension/README.md`.
  - Delete the now-empty `.pi-extension/` directory (its `agents` and
    `skills/radical-pipelines` symlinks were already removed in Task 3).
- **Changes:**
  - `git mv .pi-extension/teams.yaml teams.yaml` **first** (preserve the template
    source before deleting the directory). Do not add any manifest reference to
    the moved `teams.yaml` — it has no programmatic consumer; it is registered
    manually into the global `~/.pi/teams.yaml` per docs (the README repoint to
    root `teams.yaml` is phase 5, not here).
  - `git rm .pi-extension/package.json .pi-extension/package-lock.json
    .pi-extension/README.md`.
  - Ensure `.pi-extension/` no longer exists (no tracked files remain under it).
- **Depends on:** Task 3 (the `.pi-extension/` symlinks must be removed first), Task
  4 (root manifest already repointed off `.pi-extension/skills`)
- **Traces to:** R4 / AC1, AC3; Design KD2, KD9
- **Acceptance:**
  - `teams.yaml` exists at the repo root with the same content as the former
    `.pi-extension/teams.yaml`.
  - `.pi-extension/` no longer exists; none of `.pi-extension/package.json`,
    `.pi-extension/package-lock.json`, `.pi-extension/README.md`,
    `.pi-extension/teams.yaml` exist under `.pi-extension/`.
  - Exactly one Pi manifest exists in the repo (root `package.json`).

### Task 6: Trim `release:version` to stop installing the removed manifest

- **Goal:** Remove the release-script step that installs/updates the deleted
  `.pi-extension/` manifest, so `npm run release:version` no longer references a
  non-existent directory.
- **Files to change:** `package.json` (root), `scripts.release:version`.
- **Changes:**
  - Change `release:version` from
    `"changeset version && node scripts/sync-version.mjs && npm --prefix .pi-extension install --package-lock-only"`
    to `"changeset version && node scripts/sync-version.mjs"` (drop the trailing
    `&& npm --prefix .pi-extension install --package-lock-only`).
- **Depends on:** Task 5 (the manifest it referenced is gone)
- **Traces to:** R9 / AC4; Design KD8
- **Acceptance:**
  - `package.json` `scripts.release:version` is exactly
    `"changeset version && node scripts/sync-version.mjs"`.
  - No reference to `.pi-extension` remains anywhere in `package.json`.

### Task 7: Drop the removed Pi manifest from the version-sync targets

- **Goal:** Make `scripts/sync-version.mjs` target only the surviving Claude Code
  plugin manifest, so syncing never writes the deleted `.pi-extension/package.json`.
- **Files to change:** `scripts/sync-version.mjs` (`TARGET_MANIFESTS`).
- **Changes:**
  - Change `TARGET_MANIFESTS` from
    `[".claude-plugin/plugin.json", ".pi-extension/package.json"]` to
    `[".claude-plugin/plugin.json"]` (remove the `.pi-extension/package.json`
    element). Leave the rest of the script unchanged — it loops generically over
    `TARGET_MANIFESTS`. The root `package.json` remains the version SOURCE, never a
    target.
- **Depends on:** Task 5
- **Traces to:** R9 / AC4; Design KD8
- **Acceptance:**
  - `TARGET_MANIFESTS` in `scripts/sync-version.mjs` contains exactly
    `".claude-plugin/plugin.json"` and no longer contains
    `".pi-extension/package.json"`.
  - Running `node scripts/sync-version.mjs` references only
    `.claude-plugin/plugin.json` (no attempt to read/write any `.pi-extension`
    path).
  - The existing sync-version test still passes:
    `node --test scripts/test/sync-version.test.mjs` reports 0 failures (the test
    loops over `TARGET_MANIFESTS` and auto-adjusts; do not edit the test file).

### Task 8: Fix the forced shipped-skill self-reference in `health-monitoring.md`

- **Goal:** Make the health-monitoring self-reference inside the monitoring prompt
  template resolve from within an installed plugin by making it skill-relative,
  instead of an absolute path tied to the old hidden `.agents/` directory (already
  broken for installed plugins). This is forced regardless of OD1.
- **Files to change:**
  `skills/radical-pipelines/reference/health-monitoring.md` (line 65, inside the
  monitor prompt template block).
- **Changes:**
  - Replace the absolute path
    `.agents/skills/radical-pipelines/reference/health-monitoring.md` with the
    skill-relative path `reference/health-monitoring.md`, so the sentence reads:
    "...apply up to 2 auto-recovery actions per the recovery table in
    `reference/health-monitoring.md`." Change only that path token; leave the
    surrounding prompt text intact.
- **Depends on:** Task 1 (the file now lives under real `skills/radical-pipelines/`)
- **Traces to:** R7 / AC5; Design KD6
- **Acceptance:**
  - `skills/radical-pipelines/reference/health-monitoring.md` no longer contains the
    string `.agents/`.
  - The recovery-table reference reads `reference/health-monitoring.md`
    (skill-relative).
  - No file under `skills/` references the canonical sources by an absolute path
    tied to the old hidden directory.

### Task 9: Repoint the shipped-skill conventions read/write/heading paths to `.rp/CONVENTIONS.md` (atomic group — OD1 12-occurrence edit)

- **Goal:** Update every shipped-skill reference to the conventions-file location
  so the skill's READ path, WRITE path, and the per-tool heading references all name
  `.rp/CONVENTIONS.md`. These edits must land **together in one commit** so the read
  path, write path, and the dogfood file never disagree at any commit boundary.
  This task covers the 12 `.rp.md`→`.rp/CONVENTIONS.md` occurrences across 4 files;
  it is **distinct** from the `setup.md:52` artifact-default edit (Task 10) and from
  the `health-monitoring.md` fix (Task 8).
- **Files to change (12 occurrences total):**
  - `skills/radical-pipelines/reference/conventions/load.md` — 1 occurrence (line 5,
    the READ path).
  - `skills/radical-pipelines/reference/conventions/setup.md` — 9 occurrences (lines
    100, 108, 115, 167, 169, 176 [the load-bearing WRITE path], 185, 193, 194 [the
    read-back reminder]).
  - `skills/radical-pipelines/reference/conventions/claude-code.md` — 1 occurrence
    (line 7, the "canonical content for `.rp.md`" reference).
  - `skills/radical-pipelines/reference/conventions/pi.md` — 1 occurrence (line 5,
    the "Canonical `.rp.md` content for Pi" heading).
- **Changes:**
  - In every occurrence, replace the conventions-file location string `.rp.md` with
    `.rp/CONVENTIONS.md`. Where the prose says "project-root `.rp.md`" (load.md line
    5; setup.md line 176), drop the "project-root" qualifier as appropriate so the
    instruction reads naturally pointing at `.rp/CONVENTIONS.md` (the file is no
    longer at the project root). Keep the read path (load.md) and the write path
    (setup.md line 176) pointing at the **same** location, `.rp/CONVENTIONS.md`.
  - Do **not** change `setup.md` line 52 (the artifact-folder default — Task 10).
  - Do not introduce a multi-tool emission format; the skill keeps its single-file,
    single-tool model (this repo hand-maintains the merged file). Per-tool headings
    in `claude-code.md`/`pi.md` continue to describe each tool's canonical block.
- **Depends on:** Task 1 (the four files now live under real
  `skills/radical-pipelines/reference/conventions/`)
- **Traces to:** R5, R6 / AC6; Design KD3, KD4
- **Acceptance:**
  - `grep -rn '\.rp\.md' skills/` returns no matches (zero remaining `.rp.md`
    references anywhere under the shipped skill).
  - `load.md` (READ) and `setup.md` line 176 (WRITE) both reference
    `.rp/CONVENTIONS.md` — the same location.
  - `setup.md` has 9 references now naming `.rp/CONVENTIONS.md`; `claude-code.md`
    and `pi.md` each name `.rp/CONVENTIONS.md` in their canonical-content reference.
  - All these edits are committed together (single atomic commit), so no
    intermediate state has the read and write paths disagreeing.

### Task 10: Align the shipped artifact-folder default to `.rp/pipelines/` (OD3, single line)

- **Goal:** Change the skill's *suggested* artifact-folder default from
  `.pipelines/<slug>/` to `.rp/pipelines/<slug>/`, so a consumer accepting both
  suggested defaults ends with the same `.rp/`-rooted shape this repo dogfoods. This
  is a single line, distinct from the Task 9 conventions-path cluster.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`
  (line 52, "Suggested default" for the Artifact folder convention).
- **Changes:**
  - Change `Suggested default: \`.pipelines/<pipeline-slug>/\`.` to
    `Suggested default: \`.rp/pipelines/<pipeline-slug>/\`.`. It remains a suggested
    default — consumers still pick their own; no other text changes.
- **Depends on:** Task 1
- **Traces to:** R8 (shipped-default alignment) / AC7-adjacent; Design KD5, OD3
- **Acceptance:**
  - `setup.md` line 52 reads the artifact-folder suggested default as
    `.rp/pipelines/<pipeline-slug>/`.
  - The wording still presents it as a suggested default, not a mandate.

### Task 11: Delete the `.pi/` dogfood dotdir (settings + conventions + worktree caches)

- **Goal:** Remove the Pi dogfood-only dotdir entirely; an installed extension does
  not need it, and its conventions content is consolidated into the merged file
  (Task 13).
- **Files to change:**
  - Delete tracked files `.pi/.rp.md` and `.pi/settings.json`.
  - Remove the `.pi/` directory (its `skills/radical-pipelines` symlink was removed
    in Task 3; its `npm/` and `worktrees/` caches are untracked/gitignored).
- **Changes:**
  - `git rm .pi/.rp.md .pi/settings.json`.
  - Ensure no tracked files remain under `.pi/` and the directory is gone from the
    working tree. The genuine Pi tool-runtime conventions in `.pi/.rp.md` (Pi
    worktrees, branch names, team spawning, agent setup, health monitoring) are
    preserved by being merged into `.rp/CONVENTIONS.md` in Task 13 — do not lose
    them; this task only removes the file after Task 13's merge captures the content.
    (Read `.pi/.rp.md` before deletion if needed to carry content into Task 13.)
- **Depends on:** Task 3, and Task 13 must capture the Pi conventions content before
  this deletion is final (do Task 13's content capture first, or read `.pi/.rp.md`
  here and hand the content to Task 13; sequence so no conventions content is lost)
- **Traces to:** R5 / AC1; Design KD3, KD7, "Deleted" component list
- **Acceptance:**
  - `.pi/` no longer exists; `.pi/.rp.md` and `.pi/settings.json` are removed.
  - No tracked `.pi/...` files remain.
  - The genuine Pi runtime conventions previously in `.pi/.rp.md` are not lost (they
    appear in the merged `.rp/CONVENTIONS.md` per Task 13).

### Task 12: Delete the `.claude/` dogfood dotdir (conventions + skill symlink parent)

- **Goal:** Remove the Claude Code dogfood-only dotdir; local plugin loading uses
  `claude --plugin-dir ./` against the real root directories, so no dogfood dotdir
  is needed. Its conventions content is consolidated into the merged file (Task 13).
- **Files to change:**
  - Delete tracked file `.claude/.rp.md`.
  - Remove the `.claude/` directory (its `skills/radical-pipelines` symlink was
    removed in Task 3).
- **Changes:**
  - `git rm .claude/.rp.md`.
  - Ensure no tracked files remain under `.claude/` and the directory is gone. The
    genuine Claude Code tool-runtime conventions in `.claude/.rp.md` (Claude Code
    worktrees, branch names, team spawning, health monitoring) are preserved by
    being merged into `.rp/CONVENTIONS.md` in Task 13 — do not lose them; this task
    only removes the file after Task 13's merge captures the content. (Read
    `.claude/.rp.md` before deletion if needed to carry content into Task 13.)
  - Note: this is the dogfood `.claude/` at the repo root. The Claude Code worktree
    machinery lives under `.claude/worktrees/<slug>/` (gitignored / not tracked);
    removing tracked `.claude/.rp.md` does not touch the active worktree's runtime.
- **Depends on:** Task 3, and Task 13 must capture the Claude Code conventions
  content before this deletion is final (sequence so no conventions content is lost)
- **Traces to:** R3, R5 / AC1; Design KD3, KD7, "Deleted" component list
- **Acceptance:**
  - The dogfood `.claude/.rp.md` is removed; no tracked `.claude/.rp.md` remains.
  - The genuine Claude Code runtime conventions previously in `.claude/.rp.md` are
    not lost (they appear in the merged `.rp/CONVENTIONS.md` per Task 13).

### Task 13: Create the single merged `.rp/CONVENTIONS.md` and remove the root `.rp.md` pointer

- **Goal:** Produce exactly one merged conventions file at `.rp/CONVENTIONS.md`
  containing a shared top section (conventions common to all tools) plus a per-tool
  section for Claude Code and for Pi, with all stale content removed; and delete the
  root `.rp.md` pointer. This is the dogfood file the skill's read/write paths (Task
  9) point at — it must match `.rp/CONVENTIONS.md` so this repo's pipelines load
  conventions.
- **Files to change:**
  - Create `.rp/CONVENTIONS.md` (new file).
  - Delete root `.rp.md`.
  - (The per-tool source content comes from the soon-to-be-deleted `.claude/.rp.md`
    and `.pi/.rp.md` — Tasks 11/12 — and the shared content from root `.rp.md`.)
- **Changes:**
  - Build `.rp/CONVENTIONS.md` from three sources:
    - **Shared section** — from root `.rp.md`: managing tasks (GitHub source of
      truth + Linear mirror), creating/modifying issues, orchestrator Linear/branch
      updates during a run, pipeline slugs, artifact folder (`.rp/pipelines/<slug>`
      — see below), commit format. Drop the opening pointer text that says "also
      read the conventions for the active tool — Claude agents: `.claude/.rp.md`;
      Pi agents: `.pi/.rp.md`" (stale per-tool-file pointer — must not survive).
    - **Per-tool section: Claude Code** — from `.claude/.rp.md`: worktrees, branch
      names, team spawning, health monitoring. Fix the health-monitoring template
      reference that currently reads
      `.agents/skills/radical-pipelines/reference/health-monitoring.md` to point at
      the real shipped location (`skills/radical-pipelines/reference/health-monitoring.md`
      or skill-relative `reference/health-monitoring.md`, consistent with Task 8).
    - **Per-tool section: Pi** — from `.pi/.rp.md`: worktrees, branch names, team
      spawning, agent setup, health monitoring. Apply the R5 stale-content
      corrections (see below). Preserve genuine tool-runtime conventions (per-tool
      worktree locations, agent-discovery locations, the provider-qualified-model
      and provider-failure recovery guidance).
  - **Stale content that must NOT appear in the merged file** (R5):
    - No pointer to per-tool conventions files (`.claude/.rp.md`, `.pi/.rp.md`).
    - No reference to a dogfood auto-install mechanism — remove the Pi "Pi
      prerequisites" paragraph that says the package "is declared in
      `.pi/settings.json` and pi installs it automatically on startup … the package
      bundles …", since `.pi/settings.json` is deleted (Task 11).
    - No claim that agents are exposed via symlinks from a hidden directory — rewrite
      the Pi "Pi agent setup" sentence that says "the canonical phase agent source
      files live in `.agents/agents/` and are exposed to packages through symlinks"
      so it names the real `agents/` directory and drops the symlink claim.
    - The Pi local-install instruction must read `pi install . -l` (not
      `pi install ./.pi-extension -l`).
    - Fix the artifact-folder line in the shared section to `.rp/pipelines/<slug>`
      (this repo adopts `.rp/pipelines/` per R8; was `.pipelines/<pipeline-slug>`).
    - Update the Pi worktree-root one-time-setup reference if it names a dotdir that
      is being removed — keep only genuine runtime guidance; do not reference deleted
      paths.
  - Preserve genuine tool-runtime conventions verbatim where they are still accurate
    (worktree commands, branch-name formats, team-spawning tools, agent-discovery
    locations, monitor start/list/cancel commands).
- **Depends on:** Task 1 (real `skills/` exists, for the corrected health-monitoring
  reference), Task 8 (skill-relative health-monitoring fix), Task 9 (read/write paths
  now point at `.rp/CONVENTIONS.md`); must run before/with Tasks 11–12 finalizing the
  deletion of the per-tool dogfood files (capture their content here first)
- **Traces to:** R5, R6 / AC6; Design KD3, KD4, KD7
- **Acceptance:**
  - Exactly one merged conventions file exists at `.rp/CONVENTIONS.md`; root `.rp.md`
    no longer exists.
  - `.rp/CONVENTIONS.md` has a shared top section plus a per-tool section for Claude
    Code and for Pi.
  - The file contains no pointer to per-tool conventions files, no dogfood
    auto-install reference, no symlink-exposure claim, and no `.agents/` path.
  - The Pi local-install instruction reads `pi install . -l`.
  - The artifact-folder convention reads `.rp/pipelines/<slug>`.
  - The location `.rp/CONVENTIONS.md` matches the skill's read path (load.md) and
    write path (setup.md line 176) from Task 9, so this repo's dogfood conventions
    load correctly.

### Task 14: Clean `.gitignore` of entries for removed paths

- **Goal:** Remove `.gitignore` entries for directories deleted by this restructure,
  keeping only the still-needed `node_modules/` ignore.
- **Files to change:** `.gitignore`.
- **Changes:**
  - Remove the lines `.pi/npm/node_modules/`, `.pi/worktrees/`, and
    `.pi-extension/node_modules/` (their parent dirs `.pi/` and `.pi-extension/` no
    longer exist after Tasks 5, 11).
  - Keep `node_modules/` (the root install dir for `pi install . -l`).
  - Result: `.gitignore` contains only `node_modules/`. (The active Claude Code
    worktree dir under `.claude/worktrees/` is created by the harness at runtime and
    is not tracked; this restructure does not require adding a new ignore entry for
    it, and none exists today to preserve.)
- **Depends on:** Task 5, Task 11
- **Traces to:** R10 / AC1; Design KD-Deleted, R10
- **Acceptance:**
  - `.gitignore` no longer contains `.pi/npm/node_modules/`, `.pi/worktrees/`, or
    `.pi-extension/node_modules/`.
  - `.gitignore` still contains `node_modules/`.

### Task 15: Correct the stale pending changeset entry

- **Goal:** Fix the pending changeset whose body would otherwise be written verbatim
  into `CHANGELOG.md` claiming the version step propagates to
  `.pi-extension/package.json` and regenerates the extension lockfile — both false
  after this restructure. This is not merely editorial; it corrects a future
  generated changelog. (This is the *pending* changeset, distinct from the new
  restructure changeset in Task 16.)
- **Files to change:** `.changeset/changelog-and-version-sync.md`.
- **Changes:**
  - In the body, change the sentence that says the version step "propagates the root
    `package.json` version to `.claude-plugin/plugin.json` and
    `.pi-extension/package.json` and regenerates the extension lockfile" so it names
    only `.claude-plugin/plugin.json` and drops the `.pi-extension/package.json`
    reference and the "regenerates the extension lockfile" clause. Keep the rest of
    the entry (the Changesets adoption description) and the YAML front matter
    (`"@automattic/radical-pipelines": minor`) unchanged.
- **Depends on:** Task 5, Task 7 (the manifest and sync target it described are gone)
- **Traces to:** R9 / AC4-adjacent; Design Failure Modes "Pending-changeset stale text"
- **Acceptance:**
  - `.changeset/changelog-and-version-sync.md` body no longer mentions
    `.pi-extension/package.json` or regenerating the extension lockfile.
  - The body names only `.claude-plugin/plugin.json` as the propagation target.
  - The YAML front matter is unchanged.

### Task 16: Add the restructure changeset

- **Goal:** Add a committed changeset entry for this restructure, with a bump type
  chosen per the project's 0.x versioning guidance.
- **Files to change:** Create a new file `.changeset/<descriptive-name>-restructure.md`
  (e.g. `.changeset/restructure-repository-layout.md`; the exact slug follows the
  changeset README's naming, which generates random names but a descriptive name is
  acceptable).
- **Changes:**
  - YAML front matter: `"@automattic/radical-pipelines": minor` (the project is
    pre-1.0 at `0.1.1`; 0.x semver permits treating breaking changes as `minor`, and
    prior practice used `minor` for a comparably significant change — Design KD12).
  - Body: describe the restructure — the flat root-served layout (real
    `skills/radical-pipelines/` and `agents/`), the single root Pi manifest, the
    single `.rp/CONVENTIONS.md`, consolidated `.rp/pipelines/` state, and the removed
    install paths/symlinks/duplicate manifest. (Keep to a changeset entry, not full
    docs.)
- **Depends on:** none (independent of the moves; can be authored any time, but its
  description should reflect the final layout — author after the structural tasks)
- **Traces to:** R13 / AC10; Design KD12
- **Acceptance:**
  - A new changeset file exists under `.changeset/` for this change.
  - Its front matter sets the `@automattic/radical-pipelines` bump to `minor`.
  - Its body describes the flat layout, single Pi manifest, single
    `.rp/CONVENTIONS.md`, and removed install paths/symlinks.

### Task 17: Rename `.pipelines/` to `.rp/pipelines/` (in-flight self-move — sequence LAST among moves)

- **Goal:** Consolidate this repo's pipeline artifacts under the single `.rp/`
  namespace by renaming `.pipelines/` to `.rp/pipelines/`. This relocates the running
  pipeline's own artifact folder, so it is ordered last among the structural moves;
  every artifact written after this rename uses the post-move path
  `.rp/pipelines/<slug>/`.
- **Files to change:**
  - Move the tracked tree `.pipelines/` → `.rp/pipelines/` (it currently contains
    four pipeline slugs: `70-restructure-repository-layout` [this running pipeline],
    `8-research-how-to-package-agents-and-skills-in-pi`, `81-changelog-version-sync`,
    `9-create-setup-to-populate-project-conventions`).
- **Changes:**
  - `git mv .pipelines .rp/pipelines` (a `git mv` of committed files; safe). The
    `.rp/` directory already exists (created in Task 13 for `CONVENTIONS.md`); `.rp/`
    is a Radical-Pipelines-invented namespace, not harness-reserved, so
    `CONVENTIONS.md` and `pipelines/` coexist under it.
  - After this move, the orchestrator and any later agent must treat this pipeline's
    artifact folder as `.rp/pipelines/70-restructure-repository-layout/` — including
    this code-plan and any phase-4/5 artifacts written afterward. The phase-3
    `3-plan/code-plan.md` itself was authored under the pre-move `.pipelines/` path
    and moves with everything else; no content edit is needed for the move.
- **Depends on:** Task 13 (`.rp/` exists), and should be sequenced after Tasks 1–16
  (last among moves) so the running pipeline's artifacts are relocated only once the
  rest of the restructure is in place
- **Traces to:** R8 / AC7; Design KD7, Failure Modes "in-flight artifact self-move"
- **Acceptance:**
  - `.rp/pipelines/<slug>/` exists for all four pipeline slugs (including
    `70-restructure-repository-layout`); the artifacts moved intact.
  - No standalone top-level `.pipelines/` directory remains.
  - `.rp/` contains both `CONVENTIONS.md` (Task 13) and `pipelines/` with no
    collision.

### Task 18: (Optional, owner-gated) Merge the duplicate `radical-pipelines.png` asset

- **Goal:** Optionally collapse the two non-identical `radical-pipelines.png` files
  to one home. This is **optional/secondary** per the spec (OD4) and is an owner
  aesthetic call; skip unless the owner approves it.
- **Files to change:**
  - Delete root `assets/radical-pipelines.png` and the root `assets/` directory
    (recommended: keep `landing/assets/radical-pipelines.png`, the
    already-deployed/landing-referenced image).
  - **Coordination note:** the single README reference to the root image
    (`README.md:3`, `src="./assets/radical-pipelines.png"`) must be repointed to
    `./landing/assets/radical-pipelines.png`. That README edit is **documentation
    (phase 5)** and is therefore NOT performed in this code-plan. To avoid leaving a
    broken README image reference between phases, this asset deletion should be
    coordinated with the phase-5 README repoint — either defer the deletion until the
    README repoint lands, or skip this optional task entirely.
- **Changes:**
  - If the owner approves and the README repoint is coordinated: `git rm
    assets/radical-pipelines.png` and remove the empty root `assets/`. (If the owner
    instead prefers the root image to win, copy the root PNG over
    `landing/assets/radical-pipelines.png` keeping the landing filename, then still
    delete root `assets/`; the four landing refs keep the same filename.)
  - If declined (the default): make no change — root `assets/` and `README.md:3`
    stay as-is; nothing else depends on it.
- **Depends on:** none structurally; gated on owner approval and coordinated with the
  phase-5 README image repoint
- **Traces to:** OD4 / Design KD11 (optional)
- **Acceptance:**
  - If performed: only one `radical-pipelines.png` remains (under `landing/assets/`),
    root `assets/` is gone, and the README image reference is not left broken (the
    phase-5 repoint is coordinated).
  - If declined: root `assets/radical-pipelines.png` and `README.md:3` are unchanged,
    and the build/landing site is unaffected.

### Task 19: Verify install paths and AC checks (empirical where runnable, honest record otherwise)

- **Goal:** Run the verification checks for the restructure and record honest
  results, including the deferred empirical install checks (AC2, AC3) that may be
  unrunnable in this environment.
- **Files to change:** none (verification only; this task produces no artifact edit —
  it gates the code phase's done-ness).
- **Changes / checks to perform and record:**
  - **AC1/AC7 structural (runnable here):**
    - `git ls-files -s | grep '^120000'` → empty (no symlinks remain).
    - None of `.agents`, `.pi`, `.claude/.rp.md` (dogfood), `.pi-extension`, `.rp.md`,
      `.pipelines` exist as tracked paths.
    - `skills/radical-pipelines/SKILL.md` and `agents/*.md` exist as real files.
  - **AC4 version-sync (runnable here):**
    - `node --test scripts/test/sync-version.test.mjs` → 0 failures.
    - `node scripts/sync-version.mjs` → targets only `.claude-plugin/plugin.json`,
      no `.pi-extension` reference.
  - **AC5 (runnable here):** `grep -rn '\.agents/' skills/` → empty;
    `grep -rn '\.rp\.md' skills/` → empty.
  - **AC6 (runnable here):** `.rp/CONVENTIONS.md` exists; read path (load.md) and
    write path (setup.md:176) both name `.rp/CONVENTIONS.md`.
  - **AC2 (Claude plugin load — may NOT be runnable):** attempt
    `claude --plugin-dir ./` (or marketplace add) and confirm the `radical-pipelines`
    skill and agent profiles are exposed. If the Claude Code CLI / marketplace load
    is unavailable in this environment, record that it was not runnable and verify
    the layout against the documented resolution rule instead
    (`skills/<name>/SKILL.md` + flat `agents/` under a `source: "./"` root plugin),
    noting AC2 must be confirmed empirically in a later phase.
  - **AC3 (Pi install — may NOT be runnable):** attempt `npm install` then
    `pi install . -l` and `pi list`, confirming the skill resolves from root
    `skills/`. If the `pi` CLI is unavailable, record that it was not runnable and
    verify `package.json` `pi.skills[0] == "skills"` and that `skills/radical-pipelines/`
    is a real dir, noting AC3 must be confirmed empirically in a later phase.
  - **AC9 (runnable here):** `CLAUDE.md` exists and contains the `@AGENTS.md` import.
  - **AC10 (runnable here):** a changeset entry for this change exists under
    `.changeset/`.
- **Depends on:** Tasks 1–17 (all structural tasks complete; run after Task 17's
  rename so checks reflect the final layout)
- **Traces to:** AC1–AC7, AC9, AC10; Design "Observability / verification"
- **Acceptance:**
  - All runnable checks above pass (symlinks gone, removed paths absent, real sources
    present, sync-version test green, no `.agents/`/`.rp.md` under `skills/`,
    `.rp/CONVENTIONS.md` present with agreeing paths, `CLAUDE.md` retained, changeset
    present).
  - For AC2 and AC3, the code-writer records the honest outcome: either the empirical
    install succeeded, or it was not runnable in this environment (with the
    documentation-based layout confirmation recorded and the empirical check flagged
    for a later phase). The result is reported, not silently skipped.

## Notes on scope boundaries (for the executing code-writers)

- **Documentation is phase 5, not here.** The README rewrite (R12/AC8 — flat layout,
  install paths, removing stale `.agents/`/`.pi-extension/`/symlink/three-file-split/
  dual-manifest descriptions, and correcting the "bundled dependencies directly"
  claim), the README `teams.yaml` "register globally" repoint (KD9), the README image
  repoint (KD11), and the landing-site illustrative copy (`landing/index.html`,
  `landing/demo.js`, which use a fictional `.pipelines/issue-1234/` for demonstration,
  not this repo's real artifact path) are all documentation and are planned in
  `doc-plan.md` / executed in phase 5 — **do not edit them in the code phase.**
- **Non-doc reference correctness IS here.** All functional references in shipped
  skill files (Tasks 8–10), the Pi manifest (Tasks 4, 6), the version-sync script
  (Task 7), `.gitignore` (Task 14), and the changeset files (Tasks 15, 16) are
  corrected in this plan.
- **No tests are planned here.** Code-writers add tests via TDD as appropriate; the
  one pre-existing test (`scripts/test/sync-version.test.mjs`) must stay green and is
  not edited (it loops generically over `TARGET_MANIFESTS`).
