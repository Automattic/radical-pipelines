# Design-doc research — Restructure the repository layout (issue #70)

This is the design-phase research that turns the approved `1-spec/spec.md` into
concrete, ordered, file-level decisions. The spec is authoritative;
`1-spec/spec-research.md` is background. Every decision below is traced to a spec
requirement (R1–R13) or acceptance criterion (AC1–AC10), and validated against
the real files in the worktree (branch `worktree-70-restructure-repository-layout`).

All spec-research structural claims were independently re-verified against the
live tree before being relied on here; deltas and a few items the spec left
implicit (the six tracked symlinks, the pending changeset's stale text, the
`teams.yaml` orphaning, and the in-flight-artifact self-move) are called out
explicitly.

---

## 1. Approach / methodology

The restructure is a pure repository reorganization at v0.1 with two hard,
externally-pinned anchors that constrain everything else:

- `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` stay at the
  repo root, and `marketplace.json`'s `plugins[0].source: "./"` is unchanged.
  Claude Code resolves a `source: "./"` plugin's components from the repo root,
  so `skills/<name>/SKILL.md` and a flat `agents/` directory must exist as real
  paths at the root.
- The root `package.json` stays at the root and is the single Pi manifest; the
  `git:` install resolves it at the clone root, and `pi install . -l` resolves it
  at the local path.

Because both anchors already point at the repo root, the entire restructure is:
promote the two canonical source trees from the hidden `.agents/` directory to
real root directories, delete every mirror symlink and every dogfood-only
dotdir, collapse the three manifests/conventions files to one each, and fix the
references that named the old locations. There is no new indirection layer
(`providers/` was killed by the owner — spec Out-of-Scope, confirmed in
spec-research Q1).

The work splits cleanly into two layers, and the layer split is the spine of the
plan:

- **Layer 1 — shipped skill** (`skills/radical-pipelines/`, ships to every
  consumer of the methodology). Touching it is a methodology-wide change. The
  spec deliberately minimizes Layer-1 churn: exactly one Layer-1 edit is forced
  regardless of any decision (the health-monitoring self-reference, R7/FR5/AC5),
  and one cluster of Layer-1 edits is gated entirely on OD1 (the conventions-file
  path in `load.md`/`setup.md`/`claude-code.md`/`pi.md`).
- **Layer 2 — repo-local** (dogfood conventions, tooling, docs, gitignore,
  changeset, pipeline artifacts). All of this is internal to this repository and
  ships to no consumer.

Sequencing principle: do the moves that promote real sources and delete symlinks
**before** the reference rewrites, so each rewrite can be validated against the
new on-disk reality; do Layer-1 edits as one atomic group so the skill's read
path, write path, and dogfood file never disagree at any commit boundary
(R6/AC6); and verify both install paths (Claude Code plugin load, Pi install)
empirically in a later phase, since neither CLI was runnable in spec/design
research (carried-forward verification caveat).

---

## 2. Open-decision resolutions

### OD1 — Conventions file location and name → **Branch A: relocate to `.rp/CONVENTIONS.md`** (recommended)

**Decision:** the merged conventions file lives at `.rp/CONVENTIONS.md`, and the
four shipped skill files that name the conventions path are updated so the read
path (`load.md`), the write path (`setup.md`), and the two canonical-content
headings (`claude-code.md`, `pi.md`) all reference `.rp/CONVENTIONS.md`. This is a
Layer-1, ships-to-every-consumer change, taken deliberately.

**Why A over B (evidence; independently re-verified against the live tree):**
- No tool forces project-root. Neither Claude Code nor Pi auto-reads `.rp.md`;
  the tool-native instruction files are `CLAUDE.md`/`AGENTS.md`. The orchestrator
  opens the conventions file only because the skill instructs an explicit Read
  (`load.md:5`) — confirmed there is no harness/manifest reference to `.rp.md`
  anywhere (the only references are the skill's own instructions plus this repo's
  dogfood files and docs). The path is therefore purely whatever the skill says, as long as
  the write path (`setup.md`), the read path (`load.md`), and this repo's dogfood
  file agree (R6). So relocation is technically free and the choice is about
  whether the goal "everything Radical Pipelines under `.rp/`" (R8) should extend
  to the conventions file.
- The owner raised exactly this in issue #70 ("we could make the skill read it
  from the `.rp/` folder, right?"), and R8 already moves pipeline state into
  `.rp/`. Branch A makes `.rp/` the single home for all project-level Radical
  Pipelines state — conventions + pipelines — which is the stated motivation of
  the whole restructure (spec Overview).
- Branch B (keep root `.rp.md`, skill untouched) is clean and lower-blast-radius,
  and the spec is written to hold either way (R6, OD1). It remains the fallback if
  the owner wants zero shared-skill churn. But it leaves `.rp/` holding only
  `pipelines/` and keeps a methodology artifact at the root that the `.rp/` goal
  wants gathered — so on the project's own stated goal, A is the better fit.

**Name: `.rp/CONVENTIONS.md`** over `.rp/RP.md`. The skill's own vocabulary is
"conventions" throughout — the reference directory is `reference/conventions/`,
the loader is titled "Load Conventions" (`load.md:1`), the table is the
"Conventions" table (`load.md:9`), setup is "Setup Conventions." `CONVENTIONS.md`
matches that vocabulary; `.rp/RP.md` is redundant ("rp/rp"). The owner left
naming open, so this is a terminology-grounded design call, reversible by a
single string change in the same four files.

**Exact Layer-1 occurrences Branch A must change (11, across 4 files) —
independently re-verified by repo-wide grep:**

| File:line | Text today | Class | New |
| --- | --- | --- | --- |
| `reference/conventions/load.md:5` | "stored in the project-root `.rp.md` file" | hard READ path | "stored in the project's `.rp/CONVENTIONS.md` file" |
| `reference/conventions/setup.md:100` | "The project-level `.rp.md` config file" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:108` | "Can `.rp.md`, the artifact folder…" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:115` | "`.rp.md`, the artifact folder…" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:167` | "summarize the proposed `.rp.md` content" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:169` | "If `.rp.md` does not exist" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:176` | "Write project-root `.rp.md`" | hard WRITE path | "Write `.rp/CONVENTIONS.md`" |
| `reference/conventions/setup.md:185` | "commit it alongside `.rp.md`" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:193` | "That `.rp.md` was created or updated" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/setup.md:194` | "future runs should read `.rp.md`" | path-in-prose | `.rp/CONVENTIONS.md` |
| `reference/conventions/claude-code.md:7` | "canonical content for `.rp.md`" | heading-in-prose | "canonical content for `.rp/CONVENTIONS.md`" |
| `reference/conventions/pi.md:5` | "Canonical `.rp.md` content for Pi" | heading-in-prose | "Canonical `.rp/CONVENTIONS.md` content for Pi" |

(That is 10 in `load.md`+`setup.md` plus the 2 headings = 12 lines; the spec-research's
"11 occurrences" undercounted `setup.md:108` vs counted `load.md`+`setup.md` as 9
— the authoritative grep shows **load.md ×1, setup.md ×9, claude-code.md ×1,
pi.md ×1 = 12 lines**. The exact list above governs.) The two `setup.md` lines
that are genuinely load-bearing are the WRITE path (176) and the read-back
reminder (194); the rest are prose that must stay consistent or the doc reads as
self-contradictory. There are **zero** `.rp.md` references anywhere else under
the shipped skill (SKILL.md, all phase references, create/work-on/resume/fork
references, health-monitoring, pipeline-versioning, manage-issues) — conventions
are loaded once via `load.md` and passed down, so no phase reference re-derives
the path. This bounds the Layer-1 blast radius precisely.

**No `.rp/`-namespace conflict.** `.rp/CONVENTIONS.md` (a file) and
`.rp/pipelines/` (a directory) coexist with no collision; no tool treats `.rp/`
specially (it is a Radical-Pipelines-invented namespace, not harness-reserved).

**Layer-2 `.rp.md` occurrences Branch A must also update (repo-local, easy to
miss) — from the authoritative repo-wide grep:**
- root `.rp.md:7-8` — the per-tool pointer; the whole file is merged and deleted
  in current form (FR4).
- `README.md:155`, `README.md:157`, `README.md:169` — Configuration section
  prose naming `.rp.md` (line 169 is the three-file split paragraph, which dies
  entirely). FR9.
- `AGENTS.md` — **no** `.rp.md` reference (verified); needs no edit for OD1.
- the 17 agent profile files — **no** `.rp.md` references (the orchestrator passes
  resolved paths down; agents never name the conventions file). Verified by grep.
- the pending `.changeset/changelog-and-version-sync.md` — names version-bearing
  files, not `.rp.md`; handled under OD-adjacent item below, not by OD1.

### OD2 — Multi-tool `## When using <tool>` skill emission → **Defer (out of scope), confirmed**

The spec lists this in Out of Scope and OD2 recommends deferral. Decision:
**do not teach the skill multi-tool emission.** Evidence supports this cleanly:
the skill already encodes a single-file, single-tool model (`setup.md` writes one
file; `claude-code.md`/`pi.md` each emit one canonical block for the active tool).
A normal consumer uses one CLI and gets one conventions file with one tool's
block. This repository is the **only** multi-CLI consumer, and it hand-maintains
its merged `.rp/CONVENTIONS.md` with a shared section plus a per-tool section for
each of Claude Code and Pi. Adding a methodology-wide multi-tool generator is
unrequired work that would enlarge Layer-1 for a single beneficiary. The merged
dogfood file (FR4/R5) is authored by hand in this restructure; the skill's
emission behavior is untouched beyond the OD1 path rename. This keeps R6/AC6
satisfiable without new skill capability.

### OD3 — Shipped artifact-folder default → **Align to `.rp/pipelines/`**

`setup.md:52` ships the suggested default `Suggested default:
\`.pipelines/<pipeline-slug>/\``. Decision: **change the shipped default to
`.rp/pipelines/<pipeline-slug>/`** so the methodology's suggested default matches
the namespace this repo adopts (R8/FR8) and matches OD1's `.rp/` consolidation.
It remains a *suggested* default — consumers still pick their own — so this is low
risk and purely a consistency improvement. This is a second Layer-1 edit beyond
the OD1 cluster, but a single line (`setup.md:52`), and it makes the shipped guidance
self-consistent: a consumer who accepts both suggested defaults ends with
`.rp/CONVENTIONS.md` + `.rp/pipelines/`, the same shape this repo dogfoods.
(If the owner prefers to leave the shipped default at `.pipelines/` to avoid any
Layer-1 change not strictly forced, that is defensible — but it would ship
guidance that diverges from this repo's own adopted layout, which is the weaker
choice. Recommend aligning.)

### OD4 — Asset merge → **Recommend doing it; landing's 246 KB PNG wins**

The two PNGs are not byte-identical (`assets/radical-pipelines.png` = 326 692 B,
MD5 `0407…`; `landing/assets/radical-pipelines.png` = 246 316 B, MD5 `d627…`).
Decision recommendation: **merge** — keep the existing `landing/assets/radical-pipelines.png`
(it is the one already deployed to the GitHub Pages site and already referenced by
`landing/index.html` lines 22/32/41-42/58), delete the root `assets/` directory,
and repoint the single root README reference (`README.md:3`,
`src="./assets/radical-pipelines.png"`) to `./landing/assets/radical-pipelines.png`.
Rationale: one image, one home, and the README image becomes the deployed-site
image. The only cost is the README header renders the 246 KB image instead of the
326 KB one; they are "the same artwork at different export settings" only by
assumption (not visually diffed), so this is an owner/writer aesthetic call. If
the owner prefers the 326 KB image, the merge instead copies the root PNG over
`landing/assets/radical-pipelines.png` (updating the 4 landing refs implicitly,
since they keep the same filename) and still deletes root `assets/`. **OD4 is
optional/secondary** per the spec; if the owner declines, root `assets/` and
`README.md:3` stay as-is and nothing else in the restructure depends on it.

### Spec-implicit decision — `teams.yaml` fate (raised by design, pending researcher confirmation)

`.pi-extension/teams.yaml` is the canonical source of the five pi-teams templates.
FR3 deletes `.pi-extension/` entirely, and the **root** `package.json` has no
`files`/`teams` entry referencing it — so a literal deletion drops the only
in-repo copy of the team-template source. Repo-wide, `teams.yaml` is referenced
only by `.pi-extension/package.json:13` (the `files:` publish array) and by
documentary prose (README:113/130/248, `.pi-extension/README.md:54/60/84`) that
says these templates must be **manually registered into the global
`~/.pi/teams.yaml`** because pi-teams does not read package-local team files.
**Pending researcher confirmation** that no install path consumes
`.pi-extension/teams.yaml` programmatically. If confirmed (expected), the source
is purely documentary, so the safe resolution is to **preserve the template
source by moving `teams.yaml` to the repo root** (`/teams.yaml`), keeping the
human-registration source-of-truth alive without adding a manifest reference; the
README's "register globally" instruction then points at root `teams.yaml`.
Dropping it entirely would lose the canonical definition of the five templates the
README still tells users to register — a silent regression — so preservation is
recommended over deletion. (Resolution finalized in §8 after researcher reply.)

---

## 3. Target end-state layout

```
radical-pipelines/
├── .claude-plugin/
│   ├── plugin.json                 # stays at root; version-sync target (sole target)
│   └── marketplace.json            # stays at root; source: "./" UNCHANGED
├── .changeset/
│   ├── config.json                 # unchanged (baseBranch trunk)
│   ├── README.md
│   ├── changelog-and-version-sync.md  # pending entry — STALE text corrected (see §5)
│   └── <new>-restructure.md        # this change's changeset (FR10/R13/AC10)
├── .github/workflows/deploy-landing.yml   # unchanged (landing/ only)
├── .gitignore                      # node_modules/ only (dead entries removed)
├── .rp/                            # single home for project-level RP state
│   ├── CONVENTIONS.md              # merged conventions (OD1 Branch A)
│   └── pipelines/                  # was .pipelines/ (FR8)
│       └── <slug>/ …
├── skills/
│   └── radical-pipelines/          # REAL dir (promoted from .agents/skills/…)
│       ├── SKILL.md
│       └── reference/ …            # health-monitoring.md:65 made skill-relative
├── agents/                         # REAL dir, 17 .md files (promoted from .agents/agents/)
├── landing/                        # optional: root assets/ merged into landing/assets/
├── scripts/
│   ├── sync-version.mjs            # TARGET_MANIFESTS = [plugin.json] only
│   └── test/sync-version.test.mjs  # unchanged (generic over TARGET_MANIFESTS)
├── teams.yaml                      # moved from .pi-extension/ (pending §8 confirm)
├── package.json                    # single Pi manifest; pi.skills[0]="skills"; release:version trimmed
├── package-lock.json
├── AGENTS.md                       # source of truth for project instructions (no .rp.md ref)
├── CLAUDE.md                       # KEPT — one-line @AGENTS.md
├── README.md                       # rewritten (~7 sections)
└── LICENSE
```

**Deleted:** `.agents/` (contents promoted); all six tracked mirror symlinks
(see §4); `.claude/` (dogfood dir: `.rp.md` + `skills/` symlink); `.pi/`
(`.rp.md` + `settings.json` + `skills/` symlink); `.pi-extension/` (entire
folder: second manifest, lockfile, README, `agents`/`skills` symlinks; `teams.yaml`
preserved by moving it to root first); root `.rp.md` (merged); `.pipelines/`
(renamed to `.rp/pipelines/`); optionally root `assets/` (OD4).

**Explicitly NOT deleted:** `CLAUDE.md` (R11/AC9 — Claude Code does not read
`AGENTS.md` natively; deleting it silently drops all project instructions), root
`package.json`, both `.claude-plugin/` files.

---

## 4. File-level move/edit plan, in execution order

Ordered so every reference rewrite is validated against the post-move reality and
Layer-1 stays internally consistent at each commit boundary. (This is the
design-phase ordering; the phase-3 code plan owns final task granularity.)

**Step 0 — preconditions.** Confirm the six tracked symlinks and the `.agents/`
real tree exist as catalogued (done in research). Note the in-flight-artifact
self-move caveat (§6).

**Step 1 — promote canonical sources to real root dirs (R1/AC1).**
1. Remove the root `skills/radical-pipelines` symlink and the root `agents`
   symlink (`git rm` the symlink entries).
2. `git mv .agents/skills/radical-pipelines skills/radical-pipelines` and
   `git mv .agents/agents agents` (promoting the real trees to the names the
   symlinks used to expose). After this, `skills/radical-pipelines/SKILL.md` and
   `agents/*.md` (17) are real files.
3. Remove the now-empty `.agents/` (and `.agents/skills/`) directory.
   Singular `skill/` is invalid — both tools require `skills/<name>/SKILL.md`
   (R1, spec-research Q4a).

**Step 2 — fix the one forced Layer-1 reference (R7/FR5/AC5).** Edit
`skills/radical-pipelines/reference/health-monitoring.md:65`: replace the absolute
`.agents/skills/radical-pipelines/reference/health-monitoring.md` with the
skill-relative `reference/health-monitoring.md`. This both removes the post-move
dangle and fixes a pre-existing break (outside-plugin-dir absolute paths do not
resolve in an installed plugin cache). Required regardless of any OD.

**Step 3 — Layer-1 conventions path rename (OD1 Branch A; R6/AC6).** As one atomic
group, apply the 12 edits in §2/OD1 to `load.md`, `setup.md`, `claude-code.md`,
`pi.md`, plus the OD3 edit to `setup.md:52`. After this the skill's read path,
write path, and shipped headings all say `.rp/CONVENTIONS.md` and the suggested
artifact default says `.rp/pipelines/`.

**Step 4 — delete dogfood dotdirs and consolidate conventions (R5/FR4/AC1/AC6).**
1. Author `.rp/CONVENTIONS.md` by merging root `.rp.md` + `.claude/.rp.md` +
   `.pi/.rp.md` into one file: a shared top section (everything in root `.rp.md`
   §Managing tasks / Pipeline slugs / Artifact folders / Commit format, minus the
   per-tool pointer at lines 5–8) + a per-tool section for Claude Code and for Pi.
   In the merge: drop the per-tool pointer; rewrite the Artifact-folders value to
   `.rp/pipelines/<slug>` (FR8); replace `pi install ./.pi-extension -l` with
   `pi install . -l`; drop the `.pi/settings.json` auto-install language; rewrite
   `.pi/.rp.md:47` ("canonical agents in `.agents/agents/` via symlinks") to
   describe the real root `agents/` with no symlinks; fix `.claude/.rp.md:19` and
   `.pi/.rp.md:53` (`.agents/.../health-monitoring.md` literal) to skill-relative
   `reference/health-monitoring.md`. **Keep** runtime conventions verbatim:
   `.claude/worktrees/` (claude-code), `.pi/worktrees` and `.pi/agents/` /
   `~/.pi/agent/agents/` discovery (pi).
2. `git rm` the root `.rp.md`, the `.claude/` directory (incl. `.rp.md` and the
   `skills/radical-pipelines` symlink), and the `.pi/` directory (incl. `.rp.md`,
   `settings.json`, and the `skills/radical-pipelines` symlink).

**Step 5 — collapse to a single Pi manifest (R4/FR3/AC3).**
1. In root `package.json`: repoint `pi.skills[0]` from `.pi-extension/skills` to
   `"skills"`; trim `scripts.release:version` to
   `changeset version && node scripts/sync-version.mjs` (drop the trailing
   `&& npm --prefix .pi-extension install --package-lock-only`).
2. Move `teams.yaml` to repo root (`git mv .pi-extension/teams.yaml teams.yaml`)
   to preserve the template source (§2 teams.yaml / §8).
3. `git rm -r .pi-extension/` (second manifest, its lockfile, its README, the
   `agents` and `skills/radical-pipelines` symlinks).

**Step 6 — version-sync tooling (R9/FR6/AC4).** In `scripts/sync-version.mjs`,
remove `.pi-extension/package.json` from `TARGET_MANIFESTS`, leaving only
`.claude-plugin/plugin.json` (root `package.json` remains the SOURCE, never a
target). No edit to `scripts/test/sync-version.test.mjs` — it loops generically
over `TARGET_MANIFESTS` and auto-adjusts to one entry (verified). Re-run
`node --test scripts/test/sync-version.test.mjs` to confirm green.

**Step 7 — `.gitignore` (R10/FR7).** Remove `.pi/npm/node_modules/`,
`.pi/worktrees/`, `.pi-extension/node_modules/`; keep the `node_modules/` line
(still covers the root). End state: `node_modules/` only.

**Step 8 — rename pipeline artifacts namespace (R8/FR8/AC7).**
`git mv .pipelines .rp/pipelines` (moves all four current pipeline slug folders,
including this pipeline's own in-flight artifacts — see §6). After this the only
top-level RP-state dir is `.rp/`.

**Step 9 — correct the pending changeset's stale text (R9-adjacent; see §5).**
Edit `.changeset/changelog-and-version-sync.md` so it no longer claims the
version step propagates to `.pi-extension/package.json` / regenerates the
extension lockfile (those targets no longer exist; the entry is still pending and
will land in `CHANGELOG.md` at the next `release:version`).

**Step 10 — README rewrite (R12/FR9/AC8).** Rewrite the ~7 affected sections
(§5). Includes the OD4 image-ref repoint if the merge is done.

**Step 11 — add the restructure changeset (R13/FR10/AC10).** `npx changeset`,
bump type per §7.

**Step 12 — verification (later phase, §9).** Empirically load the Claude Code
plugin and run the Pi install; run the sync-version test; grep for residual
`.agents/`, `.pi-extension/`, `.rp.md`, symlink references.

---

## 5. Reference-update blast radius

### Layer 1 — shipped skill (`skills/radical-pipelines/`, ships to every consumer)
- **Forced, any decision:** `reference/health-monitoring.md:65` → skill-relative
  (Step 2).
- **OD1 Branch A cluster:** the 12 conventions-path lines in `load.md`/`setup.md`/
  `claude-code.md`/`pi.md` (Step 3, table in §2).
- **OD3:** `reference/conventions/setup.md:52` suggested default → `.rp/pipelines/`.
- **DO NOT TOUCH (runtime conventions, not source moves):** `pi.md:12`
  (`.pi/worktrees`), `pi.md` Pi-discovery lines, `claude-code.md:14-15`
  (`.claude/worktrees/` EnterWorktree path). These are tool runtime behaviors.
- Confirmed **zero** other `.rp.md` or absolute `.agents/` references anywhere
  under the shipped skill (authoritative grep).

### Layer 2 — repo-local (ships to no consumer)
- **Dogfood conventions (merged then deleted):** root `.rp.md` (pointer dies;
  artifact-folder line → `.rp/pipelines/`), `.claude/.rp.md` (health-monitoring
  literal → relative; worktree convention kept), `.pi/.rp.md` (prereqs/auto-install
  language dropped, `pi install . -l`, symlink-agents sentence rewritten,
  health-monitoring literal → relative; worktree/discovery conventions kept),
  `.pi/settings.json` (deleted with `.pi/`).
- **Tooling (live correctness):** `package.json` `release:version` (drop npm
  --prefix step) + `pi.skills[0]` (→ `"skills"`); `scripts/sync-version.mjs`
  `TARGET_MANIFESTS` (drop `.pi-extension/package.json`). Test file unchanged.
- **`.gitignore`:** drop three dead entries.
- **`.changeset/changelog-and-version-sync.md`:** this is a **pending** entry
  (still in `.changeset/`, not yet consumed into `CHANGELOG.md`). Its body
  currently states the version step "propagate[s] the root `package.json` version
  to `.claude-plugin/plugin.json` and `.pi-extension/package.json` and regenerates
  the extension lockfile." After this restructure that sentence is false and would
  be written verbatim into `CHANGELOG.md` at the next release. So this is **not
  merely editorial** — it must be corrected to name only `.claude-plugin/plugin.json`
  and drop the lockfile clause. (Distinct from the new restructure changeset of
  Step 11.)
- **README.md (~7 sections, FR9/AC8):**
  - line 3 header image ref — only if OD4 merge done.
  - "Claude Code plugin install" — line 90 ("through the `skills/radical-pipelines/`
    symlink"), lines 94-95 (the two symlink bullets) → describe real
    `skills/radical-pipelines/` + `agents/`, no symlinks.
  - "Pi package install" — line 107 ("reads the same `.pi-extension/` content"),
    lines 116-123 (`cd .pi-extension && npm install … pi install ./.pi-extension -l`)
    → single root manifest, root `npm install` + `pi install . -l`.
  - "Pi usage" — line 133 (`pi install ./.pi-extension -l` validation prose) →
    `pi install . -l`.
  - "Dependency bundling" (largest, lines 135-141) — **delete the false sentence**
    at 139 ("The root manifest declares the same bundled dependencies directly…"):
    the root manifest has **no** `bundledDependencies` (verified). Rewrite to the
    true mechanism: git-install delivers deps via `dependencies` + Pi's post-clone
    `npm install`; remove the dual-layer / `.pi-extension/` / symlink description
    at 137-141.
  - "Configuration" — lines 155, 157 (`.rp.md` → `.rp/CONVENTIONS.md`), line 169
    (the three-file split paragraph) deleted; note the methodology default is
    single-file and this repo hand-maintains a merged shared+per-tool file.
  - "Changelog and versioning" — line 192 (`.pi-extension/package.json`), line 193
    (`.pi-extension/package-lock.json`) removed from version-bearing list, leaving
    `.claude-plugin/plugin.json`; lines 208-211 (Cutting a version) drop the
    `.pi-extension` sync target, the npm --prefix step (3), and the lockfile from
    the result sentence.
  - "Current status and limitations" — line 248 pi-teams/`~/.pi/teams.yaml`
    wording re-validated against the moved root `teams.yaml`; line 130 likewise.
  - `.pi-extension/README.md` is deleted with the folder; fold only the minor
    verification-note provenance (print-mode `/skill:radical-pipelines` check;
    Node-engine/audit caveats at its lines 60/84) into the root README if the
    writer judges them worth keeping. No unique architectural content is lost.

### The six tracked mirror symlinks (R2/AC1) — exhaustive, from `git ls-files -s`
1. root `agents` → `.agents/agents` (removed in Step 1)
2. root `skills/radical-pipelines` → `../.agents/skills/radical-pipelines` (Step 1)
3. `.claude/skills/radical-pipelines` (deleted with `.claude/`, Step 4)
4. `.pi/skills/radical-pipelines` (deleted with `.pi/`, Step 4)
5. `.pi-extension/skills/radical-pipelines` (deleted with `.pi-extension/`, Step 5)
6. `.pi-extension/agents` → `../.agents/agents` (deleted with `.pi-extension/`, Step 5)
After the plan, `git ls-files -s | grep '^120000'` must return empty (AC1 check).

---

## 6. Failure modes and risks

- **Layer-1 path disagreement (R6/AC6).** If Step 3's 12 edits are split across
  commits or one line is missed, the skill could read from one path and write to
  another, or the dogfood file disagree with the skill — breaking conventions
  loading for this repo and every consumer. Mitigation: apply Step 3 as one atomic
  group; final grep for residual `.rp.md` under `skills/` must be empty.
- **Missed forced Layer-1 fix (R7/AC5).** Forgetting `health-monitoring.md:65`
  leaves a broken absolute path in installed plugins. Mitigation: explicit Step 2;
  AC5 grep for absolute `.agents/` under `skills/` must be empty.
- **Pi skill resolution break (R4/AC3).** Forgetting to repoint `pi.skills[0]`
  leaves it pointing at the deleted `.pi-extension/skills`. Mitigation: Step 5.1;
  empirical `pi install . -l` + `pi list` in verification.
- **Release-script break (R9/AC4).** Leaving the `npm --prefix .pi-extension`
  step makes `release:version` fail (installs a non-existent dir); leaving the
  `.pi-extension/package.json` sync target makes `sync-version.mjs` write a
  deleted file. Mitigation: Steps 5.1 + 6; run the sync-version test.
- **In-flight artifact self-move (Step 8).** `.pipelines/` is tracked and contains
  this very pipeline's artifacts (`.pipelines/70-restructure-repository-layout/`).
  Moving it to `.rp/pipelines/` relocates the running pipeline's own artifact
  folder. In practice #70's code phase runs in its own worktree and reads its
  artifact-folder path from `.rp/CONVENTIONS.md`, so the orchestrator must use the
  post-move path for any artifact written after Step 8; the move itself is a
  `git mv` of committed files and is safe. Flag for the code plan: order Step 8
  late and treat the artifact path as `.rp/pipelines/<slug>` for all post-move
  writes. (Also: the `2-design-doc/` artifacts of this design phase are written
  before the code phase runs, under the old `.pipelines/` path; they move with
  everything else — no special handling beyond awareness.)
- **`teams.yaml` silent loss.** Deleting `.pi-extension/` without preserving
  `teams.yaml` drops the only in-repo definition of the five team templates the
  README still tells users to register globally. Mitigation: Step 5.2 moves it to
  root (pending §8 confirmation it has no programmatic consumer).
- **Pending-changeset stale text (R9-adjacent).** Not correcting
  `.changeset/changelog-and-version-sync.md` bakes a false statement into the next
  `CHANGELOG.md`. Mitigation: Step 9.
- **Plugin cache copies the whole repo.** With `source: "./"`, marketplace install
  copies the entire repo root to the plugin cache; only declared components load,
  the rest is inert. This is unchanged by #70 (the value was always `"./"`); the
  restructure SHRINKS the copy by deleting `.agents/`/`.pi/`/`.claude/`/`.pi-extension/`.
  Not a regression.
- **Verification gap (carried-forward caveat).** Neither `pi` nor a live
  `claude --plugin-dir`/marketplace-add was runnable in spec/design research. AC2
  and AC3 require empirical confirmation in a later phase; the layout claims rest
  on official docs + the fact that the current root-served-via-symlink setup
  already works.

---

## 7. Changeset / versioning (R13/FR10/AC10)

A committed `.changeset/*.md` accompanies the change. Bump type: this alters
install paths and layout external users could rely on, which is a breaking change
by semver → `major`. But the repo is pre-1.0 (`0.1.1`) and the existing pending
entry (`changelog-and-version-sync.md`) used `minor` for a comparably significant
change; at 0.x, semver permits treating breaking changes as `minor`, and the
project's prior practice is `minor`. **Recommend `minor`**, consistent with the
project's established 0.x convention, but the owner/writer makes the final call
per the README's changelog guidance (lines 185, 177). The changeset body should
describe the flat layout, the single Pi manifest, the single conventions file at
`.rp/CONVENTIONS.md`, and the removed install paths/symlinks.

---

## 8. teams.yaml — resolution

**Resolution: move `.pi-extension/teams.yaml` → root `teams.yaml`** to preserve
the template source. Independently verified: `teams.yaml` is referenced **only**
in `.pi-extension/package.json:13`, inside the `files:` npm-publish array (dead
for git/local installs, per spec-research Q1/Q2). There is **no `pi.teams`
manifest field** anywhere, no script under `scripts/` reads it, and the root
`package.json` does not reference it at all. The five templates
(radical-pipelines-spec/design/plan/code/docs) are consumed by `pi-teams` from the
**global** `~/.pi/teams.yaml` after manual registration — so `.pi-extension/teams.yaml`
is purely documentary source for that registration. No install path consumes it
programmatically, so deleting it would not break a tool — but it would silently
delete the only in-repo definition of the templates the README (lines 113/130/248)
still instructs users to register. Preserving it by moving to root keeps it next
to the single Pi manifest, matches the README's "register globally" instruction,
and is the least-churn home. (An alternative home under `.rp/` or alongside the
skill is possible; root is preferred. The owner may override.) The README's
team-registration prose is repointed from package-local to root `teams.yaml`.

---

## 9. Requirement / AC traceability

| Spec | Served by |
| --- | --- |
| R1 / AC1 (real sources, no hidden dir) | Step 1 |
| R2 / AC1 (no symlinks) | Steps 1,4,5; §5 six-symlink list; AC1 grep |
| R3 / AC2 (Claude Code plugin) | Steps 1-2; marketplace.json untouched; §9 verify |
| R4 / AC3 (single Pi manifest) | Step 5; §9 verify |
| R5 / AC6 (single conventions file) | Steps 3-4; OD1 |
| R6 / AC6 (read/write paths agree) | Step 3 atomic group; OD1 |
| R7 / AC5 (no broken shipped refs) | Step 2 |
| R8 / AC7 (`.rp/` consolidation) | Steps 4,8; OD1; OD3 |
| R9 / AC4 (version-sync clean) | Steps 5.1, 6, 9 |
| R10 (gitignore) | Step 7 |
| R11 / AC9 (CLAUDE.md retained) | not touched (explicit) |
| R12 / AC8 (README) | Step 10; §5 |
| R13 / AC10 (changeset) | Step 11; §7 |
| OD1 | §2 → Branch A, `.rp/CONVENTIONS.md` |
| OD2 | §2 → defer (out of scope) |
| OD3 | §2 → align shipped default to `.rp/pipelines/` |
| OD4 | §2 → recommend merge, landing PNG wins |

## 10. Verification plan for later phases
- `git ls-files -s | grep '^120000'` → empty (no symlinks, AC1).
- `test ! -e .agents -a ! -e .pi -a ! -e .claude -a ! -e .pi-extension -a ! -e .rp.md -a ! -e .pipelines` (AC1/AC7).
- `grep -rn '\.agents/' skills/` → empty (AC5); `grep -rn '\.rp\.md' skills/` → empty (AC6).
- `node --test scripts/test/sync-version.test.mjs` green; `node scripts/sync-version.mjs` targets only plugin.json (AC4).
- Empirical: `pi install . -l` after root `npm install` → `pi list` shows the skill (AC3); `claude --plugin-dir ./` or marketplace add → skill + agents exposed (AC2).
- README grep: no `.agents/`, `.pi-extension/`, "bundled dependencies directly", three-file split, dual-manifest sync (AC8).
- `.changeset/*.md` present for the change (AC10); CLAUDE.md exists and imports AGENTS.md (AC9).
```
