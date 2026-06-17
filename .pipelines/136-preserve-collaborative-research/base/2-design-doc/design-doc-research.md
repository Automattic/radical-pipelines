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

## Topics

(One entry per design decision worked through with the owner. Shape: Spec link /
Options / Trade-offs / Decision / Rationale.)

## Open Questions

## Risks
