# Doc Plan: Restructure the repository layout

## Overview

This is the phase-5 documentation plan for the repository-restructuring meta-task
(issue #70). The code phase (`code-plan.md`, 19 tasks) deliberately defers **all**
documentation edits to phase 5, so this plan must cover every documentation surface
that the restructure leaves stale, factually wrong, or broken.

After the code phase lands, the repository will have:

- real top-level `skills/radical-pipelines/` and `agents/` directories (no hidden
  `.agents/`, no mirror symlinks);
- a single root Pi manifest (`package.json`) with `pi.skills[0] = "skills"`, no
  `.pi-extension/` directory;
- `teams.yaml` moved to the repo root;
- a single merged conventions file at `.rp/CONVENTIONS.md` (the three `.rp.md`
  files — root pointer + `.claude/.rp.md` + `.pi/.rp.md` — are gone);
- this repo's pipeline artifacts under `.rp/pipelines/<slug>/` (no top-level
  `.pipelines/`);
- version-sync targeting only `.claude-plugin/plugin.json`;
- a corrected pending changeset and a new restructure changeset.

The dominant doc surface by far is **`README.md`**, which today describes the OLD
layout in detail across roughly seven sections and contains at least one outright
false claim (the dependency-bundling "root manifest declares the same bundled
dependencies directly" sentence — the root manifest has **no** `bundledDependencies`).
The secondary surface is the **landing site** (`landing/`), which is conditional on
the optional OD4 asset decision. No `CONTRIBUTING`, `docs/`, or wiki surface exists
in this repo.

### Scope boundaries (what this plan does NOT cover)

- **Functional content produced by the code phase is not documentation.** The merged
  `.rp/CONVENTIONS.md` is built in code Task 13; the shipped-skill reference edits
  (`load.md`, `setup.md`, `claude-code.md`, `pi.md`, `health-monitoring.md`) are code
  Tasks 8–10. None of these are planned here.
- **Files the code phase deletes are not phase-5 surfaces.** `.pi-extension/README.md`
  (deleted in code Task 5), the three `.rp.md` files (Tasks 11–13), and
  `.pi/settings.json` (Task 11) are removed by the code phase; do not "update" them.
- **The pending changeset body** (`.changeset/changelog-and-version-sync.md`) is
  corrected in code Task 15, and the **new restructure changeset** is authored in code
  Task 16. They are not phase-5 doc tasks.
- **Historical pipeline artifacts** under `.pipelines/` (this run's own artifacts plus
  the three older pipeline slugs) are immutable records of past runs, not living
  documentation; they are relocated wholesale by code Task 17 and must not be
  content-edited.
- **AGENTS.md / CLAUDE.md** were swept and contain **no** layout references — `AGENTS.md`
  describes the methodology and the changeset rule abstractly; `CLAUDE.md` is the
  one-line `@AGENTS.md` import. No doc task is needed for either (this is a noted
  non-finding, not an omission).
- **The `.changeset/README.md`** was swept; it only points at the README's "Changelog
  and versioning" section and names no removed path. No task needed (non-finding).

### Ordering and dependencies

The doc tasks are largely independent of each other but **all depend on the code phase
being complete**, because every concrete claim (paths, install commands, the true
dependency mechanism) must be verified against the shipped layout, not against the
plan. The one real inter-task ordering constraint is the **OD4 conditional pairing**
(D5 ↔ the code phase's optional Task 18): the README image repoint and the landing
OG-dimension fix must land in the same change as — or after — any asset deletion, so
no broken image reference exists between phases. D1–D4 can be done in any order.

Each task below states Goal / Audience / Files / Sections-scope / Depends on /
Traces to / Acceptance. Tasks describe **what** to document, **where**, and **for
whom** — they do not prescribe wording.

---

## Tasks

### Task D1: Rewrite the README install + usage sections to the new flat layout

- **Goal:** Bring every README section that describes the repository layout, the
  install paths, and the runtime packaging into agreement with the shipped flat
  layout, removing all stale references to the removed hidden directory, the duplicate
  Pi manifest, the symlink scheme, and the dogfood dotdirs — and correcting (not
  carrying forward) the false dependency-bundling claim.
- **Audience:** End users installing the plugin/package, and contributors doing local
  development against a checkout.
- **Files:** `README.md`.
- **Sections-scope:** The "Project Usage" intro and the following subsections, each of
  which currently describes the OLD layout:
  - **Claude Code plugin install** — today it says local edits in
    `.agents/skills/radical-pipelines/` are picked up "through the
    `skills/radical-pipelines/` symlink," and the "plugin currently bundles" bullets
    describe the skill and agents as symlinks into `.agents/`. After the restructure
    these are **real** directories at the root; the symlink language and the `.agents/`
    source-of-truth framing must go. Keep the marketplace-add and `--plugin-dir` flows
    (the resolved paths are unchanged); correct only the now-false mechanism
    description.
  - **Pi package install** — today it says the root manifest "reads the same
    `.pi-extension/` content," and the local-development steps are `cd .pi-extension && npm install && cd .. && pi install ./.pi-extension -l`.
    After the restructure there is a single root manifest, the skill resolves from root
    `skills/`, and the local install is a one-time root `npm install` followed by
    `pi install . -l`. Update the manifest description and the local-development command
    block accordingly.
  - **Pi usage** — today the validation note cites `pi install ./.pi-extension -l`.
    Repoint the install command in this section to `pi install . -l`. (The
    global-`teams.yaml` registration instruction in this section is covered by D3; the
    agent-discovery `.pi/agents/` paths are genuine Pi runtime locations and stay.)
  - **Dependency bundling** — this is the highest-risk section. It must be **rewritten,
    not merely trimmed.** Two specific corrections are required: (a) the entire section
    is framed around `.pi-extension/package.json` as "a Pi package used by local
    development installs" with the root manifest as a second layer — that dual-layer
    framing is gone (single root manifest); (b) the sentence "The root manifest declares
    the same bundled dependencies directly … so both layers share a single source of
    truth" is **factually false today** (the root manifest has no `bundledDependencies`)
    and becomes more false after the restructure. The replacement must describe the
    **true** mechanism: the single root manifest delivers dependencies for the git
    install via its `dependencies` plus Pi's post-clone `npm install`, and references
    bundled third-party Pi resources through `node_modules/...` paths. The final
    paragraph of this section ("The skill at `.agents/skills/...` and the agent profiles
    at `.agents/agents/` are the canonical sources … point at them" via symlinks) must
    be removed or rewritten to state that `skills/radical-pipelines/` and `agents/` are
    the real sources (no symlinks, no `.pi-extension/` paths). Verify the true mechanism
    against the shipped root `package.json` before writing — do not restate the plan's
    description verbatim.
  - **Fallback skill install** — sweep for any symlink/`.pi-extension` mention; the
    current text mentions "symlinks" only as a general caveat about skill-install path
    variability across CLIs, which is still true and may stay. Confirm no
    repository-specific stale path leaks in.
- **Depends on:** Code phase complete (Tasks 1–7, 11–14 — real dirs, single manifest,
  repointed `pi.skills`, cleaned tooling — must exist so the writer verifies against
  reality). Independent of D2–D5.
- **Traces to:** Spec R12 / AC8; design Failure Modes "README factual drift"; code-plan
  "Notes on scope boundaries" (README rewrite is phase 5).
- **Acceptance:** A reader of these sections learns the correct, working install paths
  (marketplace add + `--plugin-dir ./` for Claude Code; `npm install` + `pi install . -l`
  for local Pi, `git:` for remote Pi) and the correct dependency-delivery mechanism. The
  sections contain **no** reference to `.agents/`, `.pi-extension/`, the mirror-symlink
  scheme as the packaging mechanism, or the false "root manifest declares the same
  bundled dependencies directly" claim. Coverage element: AC8 (README documents the new
  flat layout and working install paths with no stale layout/dependency claims).

### Task D2: Rewrite the README "Configuration" section to the single merged conventions file

- **Goal:** Replace the README's three-file, per-CLI conventions description with a
  description of the single merged conventions file at its new location, and fix the
  now-broken in-README links to the removed `.rp.md` files.
- **Audience:** Users configuring Radical Pipelines for their own project (who read this
  to understand where conventions live and how setup writes them) and contributors
  reading how this repo dogfoods its own conventions.
- **Files:** `README.md`.
- **Sections-scope:** The "Configuration" section. Today it:
  - states "Conventions live in a single project-root `.rp.md` file" and that setup
    "writes `.rp.md`" — after the restructure the merged file lives at
    `.rp/CONVENTIONS.md` (the shipped skill's read/write paths are repointed there in
    code Task 9). Any narrative naming the conventions file location must name the new
    location. (Confirm the final location against the shipped
    `skills/radical-pipelines/reference/conventions/load.md` and `setup.md` — they are
    the source of truth for where the skill reads/writes.)
  - contains a dedicated paragraph (the one beginning "This repository documents both Pi
    and Claude Code conventions side-by-side …") that describes the **three-file split**:
    tool-agnostic conventions in project-root `.rp.md`, per-CLI files
    `.claude/.rp.md` and `.pi/.rp.md`, with markdown links to all three
    (`./.rp.md`, `./.claude/.rp.md`, `./.pi/.rp.md`). All three link targets are
    **deleted** by the code phase, so these links break; this paragraph must be rewritten
    to describe the single merged `.rp/CONVENTIONS.md` (shared section + per-tool
    sections) and to explain that this repo, as the only multi-CLI consumer,
    hand-maintains that merged file while a normal single-CLI consumer gets one tool's
    block. The "Most projects use a single CLI and keep all of their conventions in one
    project-root `.rp.md`" sentence should be updated to the merged-file model.
  - The surrounding paragraphs that describe the **content** of shared vs. per-CLI
    conventions (worktree commands, branch naming, team spawning, health monitor, Pi
    agent discovery) describe genuine, still-accurate runtime behavior and may stay —
    but verify none of them embed a now-removed path (e.g. they should not point readers
    at `.claude/.rp.md` / `.pi/.rp.md` as files to open).
- **Depends on:** Code phase complete (Tasks 9, 11, 12, 13 — the merged
  `.rp/CONVENTIONS.md` exists and the three `.rp.md` files are gone). Independent of
  D1, D3–D5.
- **Traces to:** Spec R5, R6, R12 / AC6, AC8; design KD3; code Tasks 9 & 13.
- **Acceptance:** A reader learns that conventions live in one merged file at its new
  location, structured as a shared section plus per-tool sections, and understands the
  single-CLI vs. multi-CLI (this repo) distinction. The section contains **no** broken
  link to `.rp.md` / `.claude/.rp.md` / `.pi/.rp.md`, **no** three-file-split
  description, and **no** instruction to open a removed per-CLI file. Coverage element:
  AC8 (no three-file conventions split) + AC6 narrative (single conventions file).

### Task D3: Repoint the README `teams.yaml` "register globally" instruction to the root location

- **Goal:** Update the README's references that locate the pi-teams template source so
  they point at the moved root `teams.yaml`, while preserving the (still-correct)
  instruction that users register those templates into the **global** `~/.pi/teams.yaml`.
- **Audience:** Pi users setting up predefined teams.
- **Files:** `README.md`.
- **Sections-scope:** The "Pi package install" bullets and "Pi usage" steps that
  describe the pi-teams team templates "as package-local source definitions … intended
  to be registered globally," and the "Pi package limitations" note about registering
  templates in `~/.pi/teams.yaml`. The code phase moves the in-repo source from
  `.pi-extension/teams.yaml` to root `teams.yaml` (code Task 5, design KD9). Any README
  text that locates the **in-repo template source** (currently implicitly under
  `.pi-extension/`) should name the new root `teams.yaml`; the instruction to **register
  into the global** `~/.pi/teams.yaml` is unchanged and must be preserved. Distinguish
  the two `teams.yaml` references carefully — one is the in-repo source (moves to root),
  the other is the user's global registration target (unchanged).
- **Depends on:** Code phase Task 5 (the `git mv .pi-extension/teams.yaml teams.yaml`
  has landed). Independent of D1, D2, D4, D5.
- **Traces to:** Design KD9 (README "register globally" instruction repointed to root
  `teams.yaml`); code Task 5; spec R4.
- **Acceptance:** A Pi user can locate the in-repo team-template source at the correct
  (root) path and still knows to register the templates into the global
  `~/.pi/teams.yaml`. No README text implies the template source lives under
  `.pi-extension/`. Coverage element: AC8 (no stale `.pi-extension/` reference) +
  KD9 (teams.yaml repoint).

### Task D4: Update the README "Changelog and versioning" / "Cutting a version" sections to the single sync target

- **Goal:** Bring the README's version-sync narrative into agreement with the surviving
  single sync target, removing every reference to the deleted Pi manifest and its
  lockfile.
- **Audience:** Maintainers cutting a release and contributors authoring changesets.
- **Files:** `README.md`.
- **Sections-scope:** Within "Changelog and versioning":
  - **"The single source of truth"** — the bulleted list of version-bearing files
    currently includes `.pi-extension/package.json` and "the top-level `version` in
    `.pi-extension/package-lock.json`." After the restructure the only sync target is
    `.claude-plugin/plugin.json` (code Tasks 6–8, design KD8). Remove the two
    `.pi-extension/...` bullets; keep `.claude-plugin/plugin.json` and the
    root-`package.json`-is-authoritative framing and the `marketplace.json`-excluded
    note.
  - **"Cutting a version"** — the numbered steps describe `sync-version.mjs` copying the
    version into `.claude-plugin/plugin.json` **and** `.pi-extension/package.json`, plus
    a step 3 running `npm --prefix .pi-extension install --package-lock-only`. Both the
    `.pi-extension/package.json` target and the entire lockfile-regeneration step are
    removed by the code phase (`release:version` is trimmed in code Task 6). Update the
    steps so they describe only `changeset version` + `node scripts/sync-version.mjs`
    targeting `.claude-plugin/plugin.json`, and update the closing "The result is that
    …" sentence to name only the root `package.json` and `.claude-plugin/plugin.json`.
  - Verify the final command/step list against the shipped root `package.json`
    `scripts.release:version` and `scripts/sync-version.mjs` `TARGET_MANIFESTS`.
- **Depends on:** Code phase Tasks 6, 7 (the `release:version` script trimmed and
  `TARGET_MANIFESTS` reduced). Independent of D1–D3, D5.
- **Traces to:** Spec R9, R12 / AC4, AC8; design KD8; code Tasks 6–7.
- **Acceptance:** A maintainer reading these sections runs the correct release command
  and understands that the single sync target is `.claude-plugin/plugin.json`. The
  sections contain **no** reference to `.pi-extension/package.json`,
  `.pi-extension/package-lock.json`, or the lockfile-regeneration step. Coverage
  element: AC8 (no dual-manifest version-sync description).

### Task D5: (Conditional on OD4) Repoint the README header image and reconcile the landing OG image metadata

- **Goal:** If — and only if — the optional asset merge (OD4 / code Task 18) is
  performed, ensure the single README header image reference and the landing site's
  image metadata point at the surviving image and carry correct dimensions, so no broken
  or mismatched image reference is left between phases. If OD4 is declined (the default),
  this task is a no-op and the README image line and `assets/` stay as-is.
- **Audience:** Anyone viewing the README on GitHub and visitors to the deployed landing
  site / social-preview consumers.
- **Files:** `README.md` (the header `<img>` at the top of the file, currently
  `src="./assets/radical-pipelines.png"`); `landing/index.html` (the Open Graph /
  Twitter / JSON-LD image references and the hardcoded `og:image:width` /
  `og:image:height` meta tags). Note: `landing/` `src`/`href` image references use the
  `assets/`-relative landing path and the deployed `…/radical-pipelines/assets/…` URL —
  these are the **landing** image, not the root `assets/` image.
- **Sections-scope:**
  - **README:** the single header image `src`. Per design KD11's recommended branch
    (keep `landing/assets/radical-pipelines.png`, delete root `assets/`), repoint the
    README `src` to `./landing/assets/radical-pipelines.png`. If the owner instead
    chooses the root image to win, the code phase copies the root PNG over the landing
    filename and the README `src` may keep pointing at a still-present path — confirm
    against the actual post-Task-18 asset location.
  - **Landing OG/Twitter/JSON-LD dimensions — flagged cross-reference the code plan did
    not surface:** `landing/index.html` hardcodes `og:image:width=2508` and
    `og:image:height=627`, which are the dimensions of the **root** `assets/` image
    (2508×627). The landing image is **2791×308**. Today these meta tags are already
    inconsistent with the landing image they describe; the OD4 decision changes which
    image is canonical. If OD4 keeps the landing image (KD11 default), the writer must
    correct `og:image:width`/`og:image:height` to the landing image's actual dimensions.
    If OD4 makes the root image win (copied over the landing filename), the dimensions
    must match whichever bytes end up at that path. Either way, verify the final
    dimensions against the on-disk image after the merge.
  - The README header image is the **only** README image reference; the landing
    `og:image`/`twitter:image`/JSON-LD `image` URLs and the favicon/`link rel` refs all
    target the landing-served `assets/` path and are unaffected by deleting the **root**
    `assets/` (they were never served from it).
- **Depends on:** Owner approval of OD4 and code Task 18 (asset deletion). This task
  **must be coordinated with / land no earlier than** the asset change so the README
  image is never left pointing at a deleted file (design KD11, code Task 18
  "Coordination note"). If OD4 is declined, no dependency and no action.
- **Traces to:** OD4; design KD11; code Task 18 (optional, owner-gated).
- **Acceptance:** If OD4 is performed: exactly one `radical-pipelines.png` remains, the
  README header image resolves to it (not a deleted path), and the landing
  `og:image:width`/`height` match the surviving image's true dimensions — no broken or
  dimensionally-mismatched image reference remains. If OD4 is declined: README line 3
  and `assets/` are unchanged and the landing site is untouched (documented no-op).
  Coverage element: OD4 conditional (README image ref not left broken; landing metadata
  consistent).

---

## Non-findings (swept, no doc task required)

Recording these so phase 5 knows they were checked, not missed:

- **`AGENTS.md`** — methodology + changeset-rule prose only; no layout/path references.
- **`CLAUDE.md`** — one-line `@AGENTS.md` import; retained by code; no edit.
- **`.changeset/README.md`** — boilerplate + pointer to README's versioning section;
  names no removed path.
- **`landing/demo.js` and `landing/index.html` hero/demo terminals** — use a
  **fictional** `.pipelines/issue-1234/` artifact tree purely for illustration (and a
  fictional `requirements.md` in the hero, unrelated to this repo's real artifacts).
  These are demonstration props, not documentation of this repo's layout; the code plan
  explicitly excludes them. The restructure moves **this repo's** artifacts to
  `.rp/pipelines/`, but the demo's invented `.pipelines/issue-1234/` is a stylized
  example a reader is not meant to find on disk — leave as-is unless the owner separately
  wants the demo refreshed (out of scope for #70). Note this for the owner's awareness;
  no task.
- **Shipped skill `reference/` files and the merged `.rp/CONVENTIONS.md`** — functional
  content; produced/edited in the code phase (Tasks 8–13), not documentation here.
- **`.pi-extension/README.md`** — deleted by code Task 5; not a phase-5 surface.

## Coverage summary (doc tasks ↔ acceptance criteria)

- **AC8 (README matches the layout, no stale refs, dependency claim corrected):**
  D1 (install/usage/dependency-bundling), D2 (conventions), D3 (teams.yaml), D4
  (version-sync). Together they cover every README section the code plan named as stale.
- **AC6 narrative (single conventions file):** D2.
- **OD4 (image ref not left broken):** D5 (conditional).
- **R12** is satisfied collectively by D1–D4; **KD9** by D3; **KD8** by D4; **KD11** by D5.

No documentation surface implies a code task missing from `code-plan.md`. One
cross-reference the code plan under-specified (the landing `og:image` width/height
hardcoded to the root image's dimensions) is captured as a sub-scope of D5 so the OD4
decision does not leave the landing metadata inconsistent.
