# Doc plan — Changelog with Changesets and version synchronization (Issue #81)

This plan covers the **DOCS** scope only: the developer-facing documentation of
the changelog/Changesets workflow and the version single-source-of-truth, the
standing contributor-docs rule that makes "record a changeset for every change"
durable and enforceable, the actual per-change `.changeset/*.md` entry for this
issue, and keeping `README.md` in sync with what shipped (the project's standing
per-change README rule).

It executes the design doc's components **C6** (Docs-phase changeset authoring)
and **C7** (contributor documentation and README), satisfying spec **R6**,
**R13** and acceptance criteria **AC2** and **AC8**.

**Explicitly out of scope here (handled by the Code phase / code-plan):**
installing and configuring Changesets (C1), the version-sync script (C2), the
bundled version-step run-script (C3), the lockfile regeneration mechanism (C4),
and the one-time drift correction to the `0.1.1` baseline (C5). This plan writes
**documentation and the one metadata changeset file only** — it adds no code,
no config, no scripts, and no tests.

## Inputs the doc-writer must reconcile against

- The **shipped code from phase 4** is the source of truth for every concrete
  claim: the exact `.changeset/config.json` keys, the exact run-script **name**
  and command string in root `package.json` `scripts`, the sync-script path and
  filename (`scripts/sync-version.mjs` per the design, but verify against what
  shipped), the lockfile-regen command, and the set of version-bearing files and
  their post-correction `0.1.1` baseline. Adapt naturally to any wording-level
  renames the code phase made; a name mismatch is not drift.
- The **design review forward-note** (`2-design-doc/design-doc-review-approved.md`,
  note 1): the per-change changeset obligation is made durable by a **standing
  contributor-docs rule** (Task 1 below), mirroring the existing `AGENTS.md`
  README rule — not by an agent inventing a duty. The doc-writer that authors
  this issue's changeset (Task 4) does so because **this doc plan carries that
  task**, which is the correct wiring.

## Existing documentation surfaces swept (host project)

- `AGENTS.md` — the project's standing cross-agent conventions; line 7 holds the
  existing per-change rule: "Whenever any task is performed that changes the code
  in this repository, the README.md must be updated to keep it up to date." This
  is the canonical home for the sibling changeset rule (Task 1).
- `README.md` — the single end-to-end project doc (problem, proposal, phases,
  **Project Usage** with install flows for the Pi package and Claude Code plugin,
  **Configuration**, **Current status and limitations**). It documents how
  consumers install direct-from-git / via the marketplace. Home for the
  changelog/versioning workflow section (Task 2).
- `CLAUDE.md` — a thin `@AGENTS.md` pointer; **no edit** (it inherits the new
  `AGENTS.md` rule automatically).
- `.pi-extension/README.md` — Pi-package-scoped README. Reviewed: it documents
  the Pi package's contents, install, and bundled deps. The versioning/changelog
  workflow is repository-wide, not Pi-package-specific, so the canonical
  workflow doc lives in the root `README.md`; `.pi-extension/README.md` gets at
  most a one-line pointer **only if** the doc-writer judges a Pi-package reader
  would otherwise miss it (Task 2, optional sub-scope — do not duplicate the
  workflow).
- `.changeset/README.md` — may be scaffolded by the code phase's `changeset
  init`-equivalent (code-plan Task 2 notes it as optional). If present after
  phase 4, it is the stock Changesets explainer; see Task 3.
- Per-CLI convention files `.claude/.rp.md` and `.pi/.rp.md`, and the skill
  `reference/` docs — reviewed and **out of scope**: they cover worktrees,
  branch naming, team spawning, health monitoring, and pipeline mechanics, none
  of which the changelog/versioning workflow touches.

---

## Task 1 — Add the standing "record a changeset for every change" rule to `AGENTS.md`

**Goal:** Make the per-change changeset obligation a **durable, enforceable
project convention** by stating it as a standing rule alongside the existing
per-change README rule — so every future contributor (human or pipeline agent)
authors a `.changeset/*.md` for every change, without any agent having to invent
the duty. This is the C7 "standing contributor-docs rule" and the durable
mechanism the design review (note 1) asked to be made explicit.

**Audience:** Every contributor to this repository — human contributors and
pipeline agents (especially the phase-5 `doc-writer`, which reads `AGENTS.md` as
the host project's documentation convention). Voice: terse, imperative, rule-like
— match the existing single-line conventions already in `AGENTS.md`.

**Files to change:**
- `AGENTS.md`

**Sections-scope:**
- Add a standing rule, as a sibling to the existing line 7 README rule, stating
  that whenever a change is made to the repository a changeset is recorded — a
  committed `.changeset/*.md` that declares the change and its bump type and
  travels with the pull request. Keep it parallel in phrasing and altitude to the
  README rule so the two read as one convention family.
- Include the brief bump-type guidance so the call stays consistent across
  contributors: behavior-preserving fix → **patch**; backward-compatible feature
  → **minor**; breaking change → **major** (design C6 / OQ-3). State it compactly;
  do not turn `AGENTS.md` into a Changesets tutorial — point detailed
  how-to at the `README.md` workflow section (Task 2).
- Do **not** restate install/propagation mechanics here; this file carries the
  *obligation*, the README carries the *workflow*.

**Depends on:** None for authoring the rule text. (Logically pairs with Task 2,
which holds the how-to it points to; either order is fine, but keep the pointer
target accurate.)

**Traces to:** R6; AC8 (first clause — "each repository change records a
changeset"); design doc C6, C7, K5; design-doc-review note 1.

**Acceptance:**
- `AGENTS.md` contains a standing rule that each repository change records a
  committed `.changeset/*.md` declaring the change and its bump type, phrased as
  a sibling to the existing README per-change rule.
- The rule includes the patch/minor/major bump-type guidance.
- The rule is stated as a project convention (applies to all contributors and
  agents), not as a duty assigned to one named agent.
- `CLAUDE.md` is unchanged (it inherits the rule via `@AGENTS.md`).

---

## Task 2 — Document the changelog and versioning workflow in `README.md`

**Goal:** Per the repository's standing rule that the README is updated on every
change, document the new changelog/versioning workflow so a developer can: add a
changeset, understand that cutting a version propagates the version identically
to every version-bearing file and regenerates the extension lockfile, understand
that the version step is an **operator-run local action** (not CI, no publish, no
tags), and understand that consumers pick up new versions on their **next
git-source or marketplace install**.

**Audience:** Developers and maintainers of the Radical Pipelines repository —
both contributors who add changesets per change and maintainers who cut a
version. Assumes familiarity with npm and git; does not assume prior Changesets
knowledge. Voice and structure: match the existing `README.md` (prose sections
with fenced command blocks, e.g. the **Project Usage** install sections).

**Files to change:**
- `README.md`
- *(Optional, only if a Pi-package reader would otherwise miss it)*
  `.pi-extension/README.md` — at most a one-line pointer to the root README's
  workflow section; **do not** duplicate the workflow there.

**Sections-scope:** Add a changelog/versioning section to `README.md` (placement:
near **Project Usage** / **Configuration**, wherever it reads naturally as
repository-maintenance guidance) covering:
- **Adding a changeset** — how a contributor records a change as a committed
  `.changeset/*.md` (the command/flow Changesets exposes, verified against the
  shipped tooling), what the entry declares (change description + bump type), and
  that it travels with the PR and accumulates on `trunk` until a version is cut.
  Cross-reference the standing rule in `AGENTS.md` (Task 1).
- **The single source of truth** — the root `package.json` `version` is
  authoritative; the other version-bearing files
  (`.claude-plugin/plugin.json`, `.pi-extension/package.json`, and the
  `.pi-extension/package-lock.json` top-level version) are kept identical to it,
  never independently edited.
- **Cutting a version (operator, local)** — that a maintainer runs the single
  bundled version run-script (name and command verified against the shipped root
  `package.json` `scripts`; the design uses `release:version`), what it does in
  one fail-fast invocation (consume pending changesets, write/update root
  `CHANGELOG.md`, bump the root version, propagate it to every version-bearing
  file, regenerate the extension lockfile), and that it is **local/manual** with
  no CI, no `npm publish`, and no git tags.
- **How consumers get new versions** — because the repo is consumed
  direct-from-git (Pi via `pi install git:…`) and via the Claude Code marketplace
  (`source: "./"`), and the root package is `"private": true`, "release" means
  the version files and `CHANGELOG.md` are updated and committed; consumers pick
  up a new version on their **next git-source or marketplace install**. Tie this
  to the existing install instructions already in **Project Usage**.

**Depends on:** Shipped phase-4 code for all concrete claims (config keys,
run-script name + command, sync-script path, lockfile command, version-bearing
file set). Pairs with Task 1 (the `AGENTS.md` rule points here for how-to).

**Traces to:** R13; AC8 (second clause — README documents how to add a changeset,
that the version step propagates to every version-bearing file, and that
consumers pick up new versions on next git-source/marketplace install); design
doc C7, K3, and the Interfaces/Data-Flow section.

**Acceptance:**
- `README.md` documents how to add a changeset.
- `README.md` states that the version step propagates the version to **every**
  version-bearing file and regenerates the extension lockfile.
- `README.md` states the version step is an operator-run local action with no
  publish, no tags, and no release CI.
- `README.md` states consumers pick up new versions on their next git-source or
  marketplace install.
- Every command, file path, and run-script name in the section matches the
  shipped code exactly (verified, not from memory).
- `.claude-plugin/marketplace.json`'s exclusion from version sync is not
  contradicted (the doc never implies marketplace.json carries a version).

---

## Task 3 — Reconcile any scaffolded `.changeset/README.md` (conditional)

**Goal:** If the code phase's `changeset init`-equivalent scaffolded a stock
`.changeset/README.md`, ensure it does not contradict this repository's actual
workflow (operator-run local version step, no CI, no publish, no tags) and points
readers to the canonical `README.md` workflow section rather than competing with
it.

**Audience:** A contributor who opens `.changeset/` and reads the stock
explainer. Voice: minimal — keep the stock Changesets text; only correct or
annotate where it would mislead about *this* repo's local/no-publish flow.

**Files to change:**
- `.changeset/README.md` — **only if it exists after phase 4.**

**Sections-scope:**
- If the file is absent, this task is a no-op — record that and move on; do not
  create one (the code plan made it optional and it is not load-bearing).
- If present and its stock content is accurate enough to stand, leave it; add at
  most a one-line pointer to the root `README.md` workflow section (Task 2).
- If present and it asserts a publish/CI/tag-based release flow that contradicts
  this repo's local, no-publish, no-tag flow, replace those misleading lines with
  a short, accurate pointer to the root `README.md` workflow section.

**Depends on:** Phase-4 output (whether the file was scaffolded). Task 2 (the
pointer target).

**Traces to:** R13; AC8; design doc C7. (Supporting/clarity task; no AC depends
on this file existing.)

**Acceptance:**
- If `.changeset/README.md` exists, it does not contradict the repository's
  operator-run, no-publish, no-tag version workflow, and it points to the
  canonical `README.md` workflow section.
- If it does not exist, no file is created and the no-op is recorded.

---

## Task 4 — Author this issue's changeset entry (`.changeset/*.md`)

**Goal:** Satisfy the per-change obligation **for this very issue** by authoring
and committing a `.changeset/*.md` that declares this change (adopting Changesets
for changelog + version sync) and its bump type, so it travels with the PR and
proves the workflow end-to-end. This is the design's C6 in action and the
concrete artifact AC2 requires; it is the durable rule (Task 1) being followed on
its first applicable change.

**Audience:** The changelog reader and reviewers — the entry body becomes a
`CHANGELOG.md` line when a version is eventually cut. Voice: a concise,
user-facing description of the change (what changed and why it matters),
following the Changesets front-matter + body format the shipped `.changeset/`
config expects.

**Files to change:**
- `.changeset/<id>.md` (new) — front-matter declares the affected package
  (`@automattic/radical-pipelines`, the root) and the bump type; body describes
  the change.

**Sections-scope:**
- Front-matter: name the root package and set the bump type. Adopting a
  changelog/versioning workflow is a **backward-compatible feature** addition
  (no consumer-facing behavior is broken), so **minor** is the expected call;
  confirm against the bump-type guidance (Task 1 / design C6) and what actually
  shipped before committing.
- Body: a concise, reader-facing description — that the repository now tracks
  changes with a Changesets-driven `CHANGELOG.md` and keeps the project version
  synchronized across all version-bearing files via the bundled version step.
- Do **not** run `changeset version`; the entry stays **pending** and is consumed
  by a future operator-run version cut. Do not create or modify `CHANGELOG.md`
  (the one-time `0.1.1` drift correction is explicitly *not* a changelog entry,
  per design C5/K6 — the first changelog entry appears only when an operator
  first runs the version step).
- This is a `.changeset/*.md` metadata/documentation file, not source code — it
  is within the doc-writer's remit (design C6; doc-writer rule on source code).

**Depends on:** Phase-4 code (Changesets configured: `.changeset/config.json`
present with the expected format, and the affected-package name resolved from the
shipped root `package.json`). Task 1 (bump-type guidance). Conceptually the last
task, after the workflow it documents exists.

**Traces to:** R5, R6; AC2 (a committed `.changeset/*.md` describing the change
and its bump type exists on the branch and is part of the PR); AC8; design doc
C6, K5; design-doc-review note 1.

**Acceptance:**
- A committed `.changeset/*.md` exists on the pipeline branch.
- Its front-matter names the root package and declares a bump type consistent
  with the bump-type guidance (expected: minor).
- Its body concisely describes this change (Changesets-driven changelog +
  version synchronization) for the changelog reader.
- `changeset version` was **not** run by this task; `CHANGELOG.md` was **not**
  created or modified; the entry remains pending.

---

## Coverage map (acceptance criteria → tasks)

- **AC2** (a committed `.changeset/*.md` describing the change and its bump type
  exists on the branch, part of the PR) → **Task 4** (enabled by the phase-4
  Changesets tooling).
- **AC8, first clause** (contributor docs state each repository change records a
  changeset) → **Task 1** (standing `AGENTS.md` rule), demonstrated by **Task 4**.
- **AC8, second clause** (README documents how to add a changeset, that the
  version step propagates to every version-bearing file, and that consumers pick
  up new versions on next git-source/marketplace install) → **Task 2**.
- **R13** (README updated per the standing rule) → **Task 2**.
- **R6** (recording a changeset documented as a per-change obligation) → **Task 1**
  (+ Task 2 cross-reference).
- Supporting clarity (no AC strictly depends on it): scaffolded
  `.changeset/README.md` reconciliation → **Task 3** (conditional).

## Notes for the doc-writer

- **Verify every concrete claim against the shipped phase-4 code**, never from
  this plan or from memory: the run-script **name** and exact command string, the
  config keys, the sync-script path/filename, the lockfile command, and the
  version-bearing file set. The design uses `scripts/sync-version.mjs` and
  `release:version`, but the shipped code is authoritative — adapt to renames
  (a rename is not design↔code drift).
- **Do not document a publish/tag/CI release flow.** This repo is private,
  consumed direct-from-git/marketplace; "release" = version files + `CHANGELOG.md`
  updated and committed (design K3, spec Out-of-Scope, AC9). If the shipped code
  somehow added publishing/tags/release-CI, that is design↔code drift — stop and
  report a blocker rather than documenting it.
- **`.claude-plugin/marketplace.json` carries no version** and is excluded from
  sync (R10/AC6) — never imply otherwise in any doc.
- **The one-time `0.1.1` correction gets no changelog entry** (design C5/K6).
  Task 4 must not run `changeset version` and must not touch `CHANGELOG.md`.
