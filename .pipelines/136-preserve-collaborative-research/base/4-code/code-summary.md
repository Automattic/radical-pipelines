# Code Phase Summary: Preserve collaborative research across the assisted phases

## What

Edited the Radical Pipelines skill so the assisted phases reliably preserve the
collaborative research from each owner session and carry it across the phase
boundary. Four files in the assisted reading path:

- **New:** `skills/radical-pipelines/reference/assisted-phases/collaborative-research.md`
  — one shared reference holding the two rules identical across all three assisted
  phases: the settled-thread recording trigger and the advocate-vs-record
  principle.
- `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`
- `skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md`
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`

## Why

In assisted mode the substantive exploration with the owner — candidate
solutions, trade-offs, the owner's own questions and the exchanges that resolve
them — was often lost to the chat. The recording instruction relied on the
aspirational "in real time, not in batches" with no concrete firing moment; the
spec phase had no documented home for owner-initiated or design-adjacent
exploration; and exploration that drifted into the next phase's territory had no
way to reach the next phase, which reads only the prior phase's standalone
artifact.

## How

Five coordinated moves across four tasks:

- **Task 1** created the shared file. It states the recording trigger (when a
  thread settles, append the distilled per-settled-thread entry before moving on —
  not a raw transcript) and the advocate-vs-record principle (the "don't do the
  next phase's job" rule constrains advocating for / committing to a later-phase
  choice; design/plan-adjacent exploration that arose with the owner is recorded).
  It holds nothing phase-specific and is referenced by name from each phase file,
  reusing the existing `pipeline-versioning.md` reference idiom.
- **Task 2** (`1 - spec.md`) added a `## Topics` section to `spec-research.md`
  (frame / exploration / outcome) as the home for owner-initiated questions, their
  explanatory exchanges, and design-adjacent exploration; named owner-raised
  dialogue as research worth preserving and routed it to `## Topics`; reworded the
  "propose design or implementation choices" rule to advocate/commit; added the
  forward-drift flag (flag drift into design, recommend the assisted design-doc
  phase once spec completes); and referenced the shared file. The spec's
  requirements-only synthesis sources (`## Q&A`, `## Consolidated Requirements`)
  were left unchanged so design-adjacent material does not leak into `spec.md`.
- **Task 3** (`2 - design-doc.md`) added `1-spec/spec-research.md` as a
  supplementary input (read in step 2, "not a second source of truth"); sourced
  the trigger from the shared file and made the topic-loop step consistent ("once
  it settles"); reworded the "write the implementation plan" rule to
  advocate/commit; and added the forward-drift flag (drift into plan → recommend
  the assisted plan phase once design-doc completes), distinct from and alongside
  the existing backward scope-drift handler.
- **Task 4** (`3 - plan.md`) added `2-design-doc/design-doc-research.md` as a
  supplementary input; sourced the trigger from the shared file and made both
  topic loops (code-plan and doc-plan) consistent; reworded the "write code or
  documentation content" rule to advocate/commit; and added no forward-drift flag,
  since the plan phase's next phase (code) has no assisted form. The same-phase
  test/doc planning boundaries were left unchanged.

## Key decisions

- **Carry-across by research-file input.** The next assisted phase reads the prior
  phase's research artifact directly as a supplementary input; the standalone
  artifact stays authoritative. This keeps the change inside the assisted reading
  path and avoids folding research into the standalone artifacts (which would
  contradict the standalone guarantee and leak into the out-of-scope autonomous
  path).
- **Hybrid extraction into one shared file.** Only the genuinely identical core
  (recording trigger + advocate-vs-record principle) was extracted; each phase's
  specifics (recording unit, section name, its own later-phase targets, the
  forward-drift flag) stay inline. This satisfies the no-duplication rule without
  flattening the per-phase asymmetry the spec requires preserving.

## Known limitations

- The autonomous (agent-driven) phase references and the analyst agent definitions
  carry parallel recording instructions that are deliberately left untouched
  (out of scope). After this change the assisted and autonomous recording
  instructions differ by design; a future reader could mistake this for an
  oversight.
