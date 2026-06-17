# Spec Review

## Verdict: approved

## Reviewer

spec-reviewer

## Summary

The spec is complete, faithful to the intent and research, well-scoped at the WHAT level, and testable. It is approved.

## What was verified

- **Faithfulness to source.** Every factual claim was checked against the actual skill files, not just the research:
  - The aspirational "in real time, not in batches" trigger exists in all three phases (`1 - spec.md:22`, `2 - design-doc.md:25`, `3 - plan.md:34`).
  - The spec phase's `## Q&A` is a one-directional orchestrator-question/owner-answer transcript (`1 - spec.md:53-56`), and `## Research` is scoped to the orchestrator's own codebase reads (`1 - spec.md:25, 68`) — confirming Requirement 2 / AC3's premise that owner-initiated and design-adjacent exploration has no home.
  - The "don't do the next phase's job" constraints are present and flat as described (`1 - spec.md:21`; `2 - design-doc.md:24`; `3 - plan.md:30-32`).
  - Phases 4 and 5 have no assisted form (`assisted-workflow.md:21-22`), validating Requirement 4 / AC6's claim that the plan phase carries no drift flag.
  - The carry-across gap is real: design-doc input is `spec.md` only, plan input is `spec.md` + `design-doc.md`; no downstream phase reads a prior research artifact, and the standalone artifacts state the reader should not need the research file. This grounds Requirement 5.
  - The autonomous-side boundary is faithful: the analyst agent definitions (`agents/spec-analyst.md`, `agents/design-doc-analyst.md`) carry the parallel recording instruction and are correctly placed out of scope (Out of Scope 1).

- **Completeness.** Requirements 1-7 map 1:1 to the research's Consolidated Requirements 1-7; Out of Scope 1-6 map to the research's Out of Scope 1-6. No requirement was dropped.

- **Altitude.** The spec stays at WHAT, correctly deferring to design/plan: the carry-across mechanism (Out of Scope 3), shared-file-vs-restate (Out of Scope 4), and exact wording (Out of Scope 2). Requirement 1's "before moving to the next question or topic" names a timing moment (the subject of the requirement), not wording or structure, so it does not leak HOW. Requirement 2 asks for "a documented home" without prescribing a section name or `## Topics` clone — correct.

- **Testability.** Acceptance criteria 1-10 are observable against the resulting skill text and the diff. AC7 tests that a carry-across mechanism is *stated* without dictating it. AC8 ("not weaker") is anchored to the same three improvements the design-doc/plan phases receive, with the one allowed difference (the spec phase's Q&A-pair unit) pinned in the parenthetical, making it evaluable by structural comparison. AC10 is a scoping check against the touched-files set.

- **Skill-authoring rules.** Requirement 7 / AC9 correctly require the edits to be minimalist, free of duplication within a single assisted reading path, generic, free of unnecessary negatives, and descriptive of the system as designed — and push the shared-file-vs-restate decision to a later phase rather than pre-deciding it.

## Non-blocking observations (for design/plan, not rejection grounds)

1. **Requirement 3's "design-adjacent (or plan-adjacent)" is illustrative, not exhaustive.** The spec phase's constraint (`1 - spec.md:21`) covers both design *and* implementation choices, and the plan phase's forward territory is code/documentation. AC5's generic framing ("any of the three assisted phase references that carries a 'don't do the next phase's job' rule ... exploration that belongs to a later phase") carries the testable obligation and covers all three phases correctly, so the parenthetical's non-exhaustive enumeration is acceptable. Design should read it as an "e.g." spanning each phase's own forward territory.

2. **Requirement 4's "while the context is still fresh" vs. one-phase-per-session.** `assisted-workflow.md:32` states continuation happens in a separate session. The phrasing "recommend running the next assisted phase once the current phase completes" reads as a recommendation for a future (separate-session) run, not in-session continuation, and Out of Scope 6 forbids changing the phase machinery — so the spec is internally consistent with the existing one-phase-per-session design. Design should preserve this reading (a cross-session handoff recommendation) when wording the flag.
