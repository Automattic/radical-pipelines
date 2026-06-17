# Spec: Preserve collaborative research across the assisted phases

## Overview

This change modifies the Radical Pipelines skill itself — specifically the three assisted-mode phase references that direct the orchestrator's hand-to-hand work with the owner:

- `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`
- `skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md`
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`

In assisted mode, the orchestrator drives one phase per session through dialogue with a human owner, recording its work in that phase's research artifact (`spec-research.md`, `design-doc-research.md`, `plan-notes.md`). The substantive collaborative exploration — candidate solutions, the problems with each, trade-offs weighed together, and the owner's own questions and the explanatory exchanges that resolve them — is often the most valuable output of a phase. Today that exploration can be lost to the chat: the recording instruction is the aspirational "in real time, not in batches" with no concrete moment that reliably fires, and in the spec phase the research artifact has no documented section where owner-initiated and design-adjacent exploration can land. Additionally, when a phase's discussion drifts into the next phase's territory there is no mechanism to carry that exploration forward, because each phase reads only the prior phase's standalone artifact.

This change makes collaborative research reliably preserved within each assisted phase and carried across the phase boundary so the next assisted phase can use it. It does not change the autonomous (agent-driven) phases, the artifact filenames, the phase ordering, or the pipeline's versioning machinery.

## Requirements

All requirements apply to the three assisted phase references listed above unless noted otherwise. They constrain WHAT the resulting skill text must instruct, not its exact wording.

1. **Reliable, per-settled-thread recording trigger.** Each assisted phase must instruct the orchestrator to record collaborative research at a concrete, noticeable moment tied to a settled thread of exploration — once a question or topic is resolved, before moving on to the next. This trigger replaces reliance on the aspirational "in real time, not in batches" as the sole timing guidance. The recorded unit is a distilled per-settled-thread entry — the exploration and its outcome — not a raw running transcript of every reply.

2. **Owner-initiated and explanatory dialogue is recordable (spec phase).** The spec phase must make explicit that questions the owner raises, and the explanatory exchanges that resolve them, are research worth preserving — not only the orchestrator's own scripted questions. The spec-research artifact must provide a documented home for this collaborative exploration. (The design-doc and plan phases already provide such a home through their existing per-topic structure; the spec phase must reach parity in having somewhere for collaborative exploration to land.)

3. **Distinguish advocating a design from recording design-adjacent exploration.** The existing "don't do the next phase's job" rules — the spec phase's prohibition on proposing design or implementation choices, and the design-doc and plan analogues — must constrain advocating for or committing to choices that belong to a later phase, while making clear that recording design-adjacent (or plan-adjacent) exploration that arose collaboratively with the owner is preserved. These rules must no longer read as forbidding the recording itself.

4. **Next-phase-drift flag with a forward recommendation.** When an assisted phase's discussion drifts into the next phase's territory (spec → design, design → plan), the orchestrator must flag this to the owner and recommend running the next assisted phase once the current phase completes, while the context is still fresh, so those decisions land in their proper phase's artifact. This applies to the spec and design-doc phases. The plan phase's next phase has no assisted form, so the plan phase carries no such flag.

5. **Carry the collaborative research across the phase boundary.** The collaborative research recorded in an assisted phase must be available to the next assisted phase, even though phases otherwise read only the prior phase's standalone artifact. The requirement is that the research reaches the next phase; the carry-across mechanism is left to design.

6. **Consistency across the three assisted phases.** The recording-trigger and design-adjacent-recording improvements (requirements 1 and 3) must be expressed consistently across all three assisted phase references, accounting for the existing asymmetry between them (the spec phase records Q&A pairs and lacks a per-topic structure; the design-doc and plan phases record distilled per-topic entries). The result must not leave the spec phase weaker than the design-doc and plan phases at preserving collaborative research.

7. **Honor the skill-authoring rules.** All changes must comply with the skill-modification rules: minimalist and concise; no duplication across a single reading path; generic (no tool-specific or issue-tracker-specific mentions); free of unnecessary negative phrasing; describing the system as designed. Any rule that must apply identically to all three assisted phases must be expressed without creating divergent duplicate copies within the assisted reading path.

## Out of Scope

1. **The autonomous (agent-driven) phase references and the analyst agent definitions** (`autonomous-phases/*`, `agents/spec-analyst.md`, `agents/design-doc-analyst.md`, and the like). This work is scoped to the three assisted phase references only. Autonomous mode is a separate reading path and is structurally protected from the lost-research failure mode; its parallel recording instructions are knowingly left untouched.

2. **The exact wording of the skill edits.** Requirements stay at the WHAT level; the precise phrasing of new or changed instructions is for later phases, governed by the skill-authoring rules.

3. **Choosing the carry-across mechanism.** Whether the next phase reads the prior phase's research artifact directly, or the carried research is folded into the standalone artifact the next phase already reads, is a design-phase decision. This spec states only that the research must reach the next phase.

4. **Choosing between a shared instruction file and per-file restatement.** Whether a new cross-phase rule lives in a new shared file referenced by all three assisted phase references, or is restated in each of the three self-contained files, is a design or plan decision.

5. **Phase 4 (code) and phase 5 (docs).** They have no assisted form, so the next-phase-drift flag has no forward assisted target after the plan phase and naturally stops there.

6. **Changing the artifact filenames, the phase ordering, the approval-file mechanism, or the completion predicate.** This work changes how collaborative research is recorded and carried, not the pipeline's phase or versioning machinery.

## Acceptance Criteria

Criteria are observable against the resulting skill text and the behavior it directs. "The assisted phase references" means the three files listed in the Overview.

1. **Concrete recording trigger replaces the aspirational timing.**
   Given any of the three assisted phase references,
   When its recording guidance is read,
   Then it ties recording to a concrete moment at the resolution of a settled thread of exploration (before moving to the next question or topic), rather than relying solely on "in real time, not in batches" as the timing guidance.

2. **Distilled per-settled-thread unit.**
   Given any of the three assisted phase references,
   When the recorded unit is described,
   Then it is a distilled entry capturing a settled thread's exploration and its outcome, not a raw transcript of every individual reply.

3. **Spec phase has a home for collaborative exploration.**
   Given the spec phase reference,
   When the spec-research artifact's documented structure is read,
   Then it provides an explicit place for owner-initiated questions and the explanatory exchanges that resolve them, and for design-adjacent collaborative exploration — material that previously fit neither the one-directional Q&A nor the codebase-reads-only Research section.

4. **Owner-initiated dialogue is named as recordable.**
   Given the spec phase reference,
   When its guidance on what to record is read,
   Then questions the owner raises and the explanatory exchanges that resolve them are explicitly identified as research worth preserving, alongside the orchestrator's own questions.

5. **"Don't do the next phase's job" rules permit recording.**
   Given any of the three assisted phase references that carries a "don't do the next phase's job" rule,
   When that rule is read,
   Then it constrains advocating for or committing to choices that belong to a later phase, and does not read as forbidding the recording of design-adjacent (or plan-adjacent) exploration that arose collaboratively with the owner.

6. **Next-phase-drift flag present in spec and design-doc, absent in plan.**
   Given the spec and design-doc phase references,
   When their drift handling is read,
   Then each instructs the orchestrator to flag to the owner when discussion drifts into the next phase's territory and to recommend running the next assisted phase once the current phase completes;
   And given the plan phase reference, no such next-phase-drift flag is present.

7. **Recorded research reaches the next assisted phase.**
   Given the assisted phase references taken together,
   When the inputs and carry-across of the next assisted phase are read,
   Then the collaborative research recorded in a phase is made available to the next assisted phase by a stated mechanism, despite phases otherwise reading only the prior phase's standalone artifact.

8. **Consistency without leaving the spec phase weaker.**
   Given the three assisted phase references compared against each other,
   When the recording-trigger and design-adjacent-recording guidance is read across all three,
   Then the guidance is consistent across the phases (accounting for the spec phase's Q&A-pair unit versus the design-doc and plan phases' distilled per-topic unit), and the spec phase is not weaker than the design-doc and plan phases at preserving collaborative research.

9. **Skill-authoring rules upheld.**
   Given the full set of edits,
   When the changed text is read,
   Then it is minimalist and concise, introduces no duplicated instruction across a single assisted reading path, contains no tool-specific or issue-tracker-specific mentions, avoids unnecessary negative phrasing, and describes the system as designed.

10. **Scoped to assisted mode only.**
    Given the change set,
    When its touched files are reviewed,
    Then only the three assisted phase references are modified for this behavior; the autonomous phase references, the analyst agent definitions, the artifact filenames, the phase ordering, the approval-file mechanism, and the completion predicate are unchanged.
