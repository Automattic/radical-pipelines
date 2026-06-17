# Design Research: Preserve collaborative research across the assisted phases

> Domain: this pipeline edits the Radical Pipelines skill itself — the three
> assisted-phase references under `skills/radical-pipelines/reference/assisted-phases/`
> (`1 - spec.md`, `2 - design-doc.md`, `3 - plan.md`). Every design choice is
> anchored in a spec requirement / acceptance criterion and honors the
> skill-authoring rules in `CLAUDE.md` (minimalist, no duplication within a
> reading path, generic, avoid unnecessary negatives, describe the system as
> designed).

## Research

(Findings from reads of the skill source. Cite file:line.)

- The three assisted phase references and their current shapes:
  - `1 - spec.md`: `## Constraints` (lines 15-26) + steps. `spec-research.md`
    sections are `## Q&A`, `## Research`, `## Out of Scope`,
    `## Consolidated Requirements` (init skeleton lines 33-45). Recording is
    per-question (step 2 loop, lines 51-56): formulate→present→append answer.
    `## Research` is scoped to the orchestrator's *own* codebase reads
    (constraint line 25; step 2 line 68). The "in real time, not in batches"
    timing line is the constraint at line 22. "Standalone — reader should not
    need `spec-research.md`" at line 110.
  - `2 - design-doc.md`: `## Constraints` (lines 15-29) + steps.
    `design-doc-research.md` sections `## Research`, `## Topics`,
    `## Open Questions`, `## Risks` (init lines 36-46). Topic entry shape lines
    50-62 (Spec link / Options / Trade-offs / Decision / Rationale). Topic loop
    step 3 (lines 72-77): frame→propose→present+iterate until owner decides→
    **append** the distilled entry. "In real time, not in batches" at line 25.
    "Standalone" at line 135. Input is only `spec.md` (line 7).
  - `3 - plan.md`: `## Constraints` (lines 18-38) + steps. `plan-notes.md`
    sections `## Research`, `## Code Plan Topics`, `## Doc Plan Topics`,
    `## Open Questions`, `## Risks` (init lines 45-57). Topic entry shape lines
    63-73. Two topic loops: code-plan step 3 (lines 87-92), doc-plan step 7
    (lines 164-169), both frame→propose→present+iterate→append. "In real time,
    not in batches" at line 34. "Standalone" at line 148. Inputs are `spec.md` +
    `design-doc.md` (lines 7-8).

- Per-phase completion is committed-artifact-based and identical across modes
  (`pipeline-versioning.md` lines 40-49); the assisted phases each commit their
  research artifact with the phase (spec step 8 line 138; design-doc step 7
  line 162; plan step 11 line 272). The artifacts folder persists across
  sessions, so a committed research artifact from phase N is on disk when phase
  N+1 runs in a separate session (`assisted-workflow.md` line 32: continuing to
  a later phase happens in a separate session).

- Assisted and autonomous are SEPARATE reading paths, never loaded together
  (`work-on-an-issue.md` routes a run to either `autonomous-workflow.md` or
  `assisted-workflow.md`; per spec-research Q5). The autonomous analyst agents
  (`agents/spec-analyst.md`, `agents/design-doc-analyst.md`) carry their own
  parallel recording instructions — explicitly out of scope (spec Out of Scope 1).

- No shared constraints file exists today: each assisted phase carries its own
  self-contained `## Constraints` block and format skeleton; the "in real time,
  not in batches" line is written out three times (spec-research Q5c). Cross-file
  references from the assisted phase files go only to `pipeline-versioning.md`
  (completion predicate) and to the **Commit format** convention.

- **Carry-across blast radius (load-bearing for Topic 1).** The standalone
  artifacts `spec.md` / `design-doc.md` are read by a large downstream fan-out
  that spans both reading paths and the agent definitions (out of scope):
  - `spec.md` readers: `agents/design-doc-analyst.md:26`, `design-doc-writer.md:12`,
    `design-doc-reviewer.md:13`, `code-plan-writer.md:12`, `code-plan-reviewer.md:14`,
    `code-reviewer.md:17`, `doc-plan-writer.md:14`, `doc-plan-reviewer.md:15`,
    `doc-writer.md:13`, `doc-reviewer.md:17` (plus the assisted plan phase,
    `assisted-phases/3:7`).
  - `design-doc.md` readers: `agents/code-plan-writer.md:13`, `code-plan-reviewer.md:13`,
    `code-reviewer.md:16`, `doc-plan-writer.md:15`, `doc-plan-reviewer.md:14`,
    `doc-writer.md:14`, `doc-reviewer.md:16`.
  - The "standalone — reader should not need the research/prior artifact"
    guarantee is asserted in ~10 places across all three paths:
    assisted `1:110`, `2:135`, `3:148`/`3:224`; autonomous writer rows
    `autonomous-phases/1:26,33`, `2:26,33`; agent defs `spec-writer.md:19,56`,
    `design-doc-writer.md:19,73`, `code-plan-writer.md:19,56`,
    `doc-plan-writer.md:22,60`, `spec-consolidator.md:31,61`.
  - Implication: folding collaborative research INTO the standalone artifact
    would expose it to that entire fan-out and contradict every standalone
    guarantee — including in the out-of-scope autonomous path. The research
    file is committed with its phase and persists across sessions, so a later
    assisted phase CAN read the prior research file directly without touching
    the standalone artifact or the autonomous path.

- **Shared-content patterns the skill already uses (load-bearing for Topic 2).**
  Two idioms exist for content that must be identical across files:
  1. **Named convention** — referenced by name (e.g. "the **Commit format**
     convention") and defined once. But conventions are *project-specific*,
     stored in `.rp.md` and registered in `conventions/load.md` (lines 11-22);
     they are not the home for skill-authored cross-phase instructions.
  2. **Cross-file reference by filename** — the assisted phase files already
     point at `pipeline-versioning.md` by name for the completion predicate
     (`assisted-phases/1:122`, `2:146`, `3:238`). This is the idiomatic home for
     a skill-authored rule shared across the three assisted files: a new
     reference file under `assisted-phases/` that all three reference by name.
  - The three assisted files have no shared `## Constraints` source today; the
    "in real time, not in batches" line is written out three times
    (`1:22`, `2:25`, `3:34`). A rule that must apply identically to all three
    (the recording trigger, Req 1; the design-adjacent carve-out, Req 3) is a
    candidate for extraction into a shared reference file (CLAUDE.md de-dup rule
    + spec Req 7 / AC9). The next-phase-drift flag (Req 4) is NOT identical
    across all three (absent in plan), so it is a partial case, not a clean
    shared rule.

- **No research/notes file is currently a cross-phase input anywhere.** Assisted
  design-doc input is only `spec.md` (`assisted-phases/2:7`); assisted plan
  inputs are only `spec.md` + `design-doc.md` (`assisted-phases/3:7-8`). The
  within-phase autonomous writer reads its OWN research file (autonomous
  `design-doc-writer` synthesizes from `spec.md` AND `design-doc-research.md`,
  `autonomous-phases/2:26,33`; `agents/design-doc-writer.md:13`), but no phase
  reads a PRIOR phase's research file. So adding the prior research file as a
  next-phase input is a new, additive cross-phase read.

## Topics

(One entry per design decision worked through with the owner. Shape: Spec link /
Options / Trade-offs / Decision / Rationale.)

### Topic: Carry-across mechanism

- **Spec link:** Requirement 5 / Acceptance criterion 7.
- **Options:**
  1. The next assisted phase reads the prior phase's **research artifact**
     directly — add it as an input to the assisted phase only (assisted
     design-doc adds `1-spec/spec-research.md`; assisted plan adds
     `2-design-doc/design-doc-research.md`).
  2. Fold the carried research INTO the standalone artifact the next phase
     already reads (a section in `spec.md` / `design-doc.md`).
  3. A dedicated hand-off file distinct from both the research and the standalone
     artifact.
- **Trade-offs:**
  - (1) Confined to the in-scope assisted reading path; zero change to standalone
    artifacts or the autonomous path; carries the full distilled research
    losslessly. Cost: a second input file at phase start, a new cross-phase read
    shape (no phase reads a prior phase's research file today).
  - (2) No new input, but contradicts the ~10 "standalone" guarantees and leaks
    research to the entire downstream fan-out including the out-of-scope
    autonomous writers/reviewers (spec Out of Scope 1). Pollutes the clean
    standalone artifacts.
  - (3) Keeps standalone artifacts clean but introduces new artifact machinery
    (against spec Out of Scope 6) and duplicates the research file that already
    holds this material.
- **Decision:** _pending owner_ (recommended: Option 1).
- **Rationale:** Option 1 is the only mechanism that stays inside the in-scope
  reading path, respects the standalone guarantees, leaves the autonomous path
  untouched, and carries the research losslessly. Word the new input as
  *supplementary collaborative context*; the prior standalone artifact remains
  the authoritative statement of intent so the research file is not mistaken for
  a second source of truth.

## Open Questions

## Risks
