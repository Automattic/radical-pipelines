# Doc Plan: Per-phase summaries for the code and docs phases

## Overview

The code phase will leave `4-code/code-summary.md` (written by the `code-reviewer`
on approval) and the docs phase will leave `5-docs/docs-summary.md` (written by the
`doc-reviewer` on approval), so a run's artifact folder records what every phase
produced — not just phases 1–3. The format is defined once in a new skill reference
file and reaches both reviewers through the launch prompt; the per-phase completion
predicate now requires the summary alongside the approval marker.

The feature is implemented as edits to the Radical Pipelines skill's own reference
files and agent profiles (handled by `code-plan.md`). **Those skill/agent reference
edits are the product's source, not documentation**, and are out of scope here — the
`summary-format.md` reference, the reviewer agent profiles, the autonomous-phase
files, `pipeline-versioning.md`, and `SKILL.md` are written by the code phase, not
documented by the docs phase.

I swept the repository end-to-end for external/user-facing documentation that
describes per-phase artifacts, what each phase produces, or the reviewer-written
approval/rejection files — every surface that references the behavior this change
extends. Surfaces checked and their disposition:

- **`README.md` "Configuration" paragraph** (around line 157) — the one prose
  surface that goes stale. It enumerates the per-phase artifacts reviewers commit
  on approval (`<artifact>-review-approved.md`, `<artifact>-review-N-rejected.md`)
  and states "The autonomous-phase and assisted-phase references list the exact
  filenames per phase." With this change the code and docs reviewers also commit a
  summary on approval, and the per-phase completion predicate now requires it. This
  surface gets the one required doc task (**Task 1**).
- **`README.md` "What it does" phase list** (around lines 27–32, "Phase 4. Code." /
  "Phase 5. Docs.") — a high-level outcome list, not a per-artifact enumeration. It
  already says phases produce reviewable artifacts; whether to mention the summary
  here is a judgment call for the doc-writer reading the shipped README. Folded into
  Task 1 as an optional, same-altitude touch — **no separate task**.
- **`website/` landing page (`index.html`, `demo.js`)** — the marketing demo shows
  a sped-up run whose phase-4/5 reviewer writes are `code-review-approved.md` /
  `docs-review-approved.md` (`demo.js` `writes` arrays and `pendingTree`; the hero
  tree in `index.html` stops at phase 3). The demo is explicitly a "reconstructed
  log of a real pipeline run, sped up" — illustrative, not a behavior contract — and
  `website/**` is **not** a release-relevant path (`.changeset/config.json` excludes
  it). Captured as a single **optional, skippable** task (**Task 2**) so a doc-writer
  can keep the marketing surface from drifting; skipping it does not fail the feature.
- **`website/index.html` caption** (around line 230) — uses `spec.md`,
  `spec-review-approved.md`, `…` as illustrative examples of committed artifacts. The
  trailing `…` already implies more files; it makes no per-phase-complete claim, so
  it needs no change. **No task.**
- **`AGENTS.md`** — skill-authoring rules and the standing changeset/README-update
  rule; the summary feature changes neither. **No task.**
- **`CONTRIBUTING.md` / `.changeset/README.md`** — changeset and release mechanics;
  unaffected. **No task.**

The **changeset** for this release-relevant change is owned by **code-plan Task 7**,
not this plan — so the docs phase adds no changeset task and the absence of one here
is intentional, not a gap.

Net result: **1 required doc task** (`README.md` Configuration paragraph) and **1
optional, skippable marketing task** (`website/`). No surface restates the summary
format itself — that lives only in the shipped `summary-format.md`, and duplicating
it in user-facing docs would risk drift.

## Tasks

### Task 1: Record the per-phase summaries in the README's artifact description

- **Goal:** Update `README.md` so its description of the per-phase artifacts
  reflects that the code and docs phases now each leave a summary
  (`4-code/code-summary.md`, `5-docs/docs-summary.md`), written by the reviewer on
  approval, so a run's artifact folder records what every phase produced — no phase
  is represented by approval markers alone. A reader should understand that on
  approval the code/docs reviewer commits the summary alongside the approval marker,
  and that the phase is complete only when both are committed. Keep it at the
  README's altitude — what the summaries are and when they are written — not a
  restatement of the summary format (sections, omit-empty rule, asset convention),
  which lives in the shipped skill reference.
- **Audience:** Users and contributors reading the README to understand what each
  phase produces and what lands in a pipeline's artifact folder (the "Configuration"
  / "what it does" reader). Not the agents.
- **Files to change:** `README.md`
- **Sections / scope:**
  - The **"Configuration"** paragraph that today describes reviewers writing
    `<artifact>-review-N-rejected.md` and `<artifact>-review-approved.md` and points
    to the autonomous-phase/assisted-phase references and `pipeline-versioning.md`.
    Add a concise statement that the code and docs phases additionally leave a
    summary written by the reviewer on approval, committed alongside the approval
    marker, and that the phase's completion now requires it. Keep the existing
    run-folder, rejection/approval-filename, and completion-detection prose accurate;
    do not restate the summary format.
  - **Optionally**, the **"What it does" phase list** (the "Phase 4. Code." / "Phase
    5. Docs." bullets): if the doc-writer judges it useful, note at the same altitude
    that these phases now also produce a human-readable summary. This is a same-line
    enrichment, not a new section; skipping it is acceptable if the Configuration
    paragraph already carries the coverage.
  - Do **not** add a new top-level section, restate the summary format, or alter the
    changelog/versioning, entry-point, or workflow sections.
- **Depends on:** Code Task 1 (`summary-format.md`) and Code Tasks 4/6
  (`autonomous-phases/4 - code.md`, `pipeline-versioning.md`) must have landed so the
  doc-writer can confirm the real artifact paths (`4-code/code-summary.md`,
  `5-docs/docs-summary.md`), that the reviewer writes them on approval, and that the
  completion predicate requires them.
- **Traces to:** Spec requirements 1, 2, 5 and acceptance criteria 1, 2, 3, 6 (each
  phase leaves a human-readable record; completion gates on the summary). Maps to
  code-plan Tasks 1–6.
- **Acceptance:**
  - After phase 5, a reader of `README.md` learns that the code and docs phases each
    leave a summary, written by the reviewer on approval and committed alongside the
    approval marker, so every phase's artifact folder records what it produced.
  - The description names the summaries by their real role/location (a per-phase
    summary in the phase folder, written on approval), consistent with what the code
    phase shipped, and states that phase completion now requires the summary.
  - The README does **not** reproduce the summary format — its sections, the
    omit-empty rule, or the asset convention; those live in the shipped skill
    reference, and the README points to the references as it already does rather than
    restating them.
  - The existing run-folder, rejection/approval-filename, completion-detection, and
    changelog/versioning prose remains accurate and is not duplicated or contradicted.
  - The edit stays within `README.md` and introduces no new top-level section.

### Task 2 (OPTIONAL — marketing, skippable): Refresh the website demo to show the per-phase summaries

- **Goal:** Keep the marketing landing page from showing a phase-4/5 flow that omits
  the new summaries. The demo in `website/demo.js` lists each reviewer's `writes`
  (phase 4 → `code-review-approved.md`, phase 5 → `docs-review-approved.md`) and a
  `pendingTree` of committed files; the hero tree in `index.html` stops earlier. This
  task updates the illustrative demo so the marketing surface depicts the code/docs
  reviewer also committing a summary on approval, matching the shipped behavior.
- **Audience:** Website visitors (marketing), not users or contributors.
- **Files to change:** `website/demo.js` (and `website/index.html` only if its
  rendered tree or caption would otherwise contradict the shipped behavior).
- **Sections / scope:**
  - In `demo.js`, the phase-4 `code-reviewer` and phase-5 `doc-reviewer` step
    `writes` arrays and the corresponding `pendingTree` entries: depict the reviewer
    committing the summary (`code-summary.md` / `docs-summary.md`) alongside the
    approval marker, consistent with the shipped per-phase summary behavior.
  - This is **cosmetic/illustrative only**. The demo is a "reconstructed log of a
    real pipeline run, sped up," not a behavior contract, and `website/**` is **not**
    a release-relevant path — this task needs **no** changeset and does **not** gate
    the feature.
  - Do not introduce summary-specific marketing copy beyond keeping the example
    accurate; new feature-marketing is out of scope for this pipeline.
- **Depends on:** Task 1 (the behavior it should mirror) and code-plan Tasks 2/3 (the
  reviewer writes that ship the summaries).
- **Traces to:** Spec requirements 1, 2 / acceptance criterion 6 — illustrative
  consistency only. No spec acceptance criterion depends on the website.
- **Acceptance (only if the task is undertaken):**
  - The website's demo no longer shows the phase-4/5 reviewer committing only the
    approval marker in a way that contradicts the shipped per-phase summary behavior;
    the summary appears alongside it.
  - No changeset is added for a website-only change.
  - If the doc-writer chooses to skip this task, that is acceptable and the feature's
    documentation is still complete (Task 1 carries the required coverage).
