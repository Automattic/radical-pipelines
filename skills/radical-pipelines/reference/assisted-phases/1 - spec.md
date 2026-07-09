# Running the Spec Phase (Phase 1)

Advances the pipeline from phase 0 (`intent.md`) to phase 1 (`spec.md`) by driving an iterative Q&A directly with the owner.

Inputs:

- `<pipeline-family-folder>/<run>/0-intent/intent.md`

Outputs:

- `<pipeline-family-folder>/<run>/1-spec/spec-research.md`
- `<pipeline-family-folder>/<run>/1-spec/spec.md`
- `<pipeline-family-folder>/<run>/1-spec/spec-review-approved.md` (written on the owner's approval — see step 8)

## Constraints

These rules apply across all steps:

- You MUST ask ONE question at a time. Never list multiple questions in a single message.
- You MUST NOT answer your own questions or propose solutions on the owner's behalf.
- You MUST NOT propose design or implementation choices — those belong to later phases.
- You MUST append every question and answer to `spec-research.md` in real time, not in batches.
- You MUST NOT proceed past any gate without explicit owner confirmation.
- You MAY (and often should) read the codebase to inform your questions and check feasibility. Record any non-trivial findings under `## Research` in `spec-research.md` with sources cited. Do not produce a separate research artifact or directory — that belongs to later phases.

## Steps

### 1. Initialize `spec-research.md`

Create `<pipeline-family-folder>/<run>/1-spec/spec-research.md` with this structure:

```markdown
# Spec Research: <feature name>

<contents of `intent.md`, copied verbatim>

## Q&A

## Research

## Out of Scope

## Consolidated Requirements
```

The rough idea sits under the H1 and is populated now. The other sections start empty and are filled in by later steps: Q&A grows during step 2, Research during step 2 as findings surface, Out of Scope is confirmed in step 4, and Consolidated Requirements is written in step 5.

### 2. Run the Q&A loop

Ask one question at a time. For each:

1. Formulate the question and append it to `spec-research.md` under `## Q&A`.
2. Present it to the owner and wait for the answer.
3. Append the answer to `spec-research.md`.
4. Decide what to ask next.

Cover these areas strategically — not as a checklist, and not always in this order:

- **Scope** — what the feature must do, and what it must not do.
- **Users** — who uses this and how.
- **Constraints** — technical, business, performance, security.
- **Success criteria** — how done is measured.
- **Edge cases** — failure, empty, large, concurrent.
- **Integration** — what existing systems this must work with.
- **Data** — structures, lifecycle, persistence.

Suggest options when the owner is unsure. If a question would benefit from codebase context, do a quick read first and ground the question in what you found. Record non-trivial findings under `## Research` in `spec-research.md`.

Track exclusions as they surface. Every "no", "not for v1", "we won't worry about that" is an out-of-scope candidate — note it so it can be confirmed at step 4.

The Q&A is complete when the owner says it is **and** your self-check (next step) finds no remaining gaps.

### 3. Coverage self-check

Before synthesis, privately run a review-style check on what you have:

- **Completeness** — are all areas above sufficiently covered?
- **Clarity** — could two implementers read the requirements and build the same thing?
- **Feasibility** — does what the owner described fit the existing codebase and conventions?
- **Consistency** — do the answers contradict each other?
- **Scope** — are exclusions explicit?

For any gap, return to step 2 and ask the missing question. Do not synthesize through unanswered gaps.

### 4. Verify out-of-scope

Surface the exclusions you collected during Q&A back to the owner in one consolidated list and ask whether anything is missing. Update `spec-research.md` with the confirmed exclusions before moving on.

### 5. Consolidate requirements

Fill `## Consolidated Requirements` in `spec-research.md`: a numbered list distilled from the Q&A. Exclusions belong in the spec's Out of Scope section, not here.

### 6. Synthesize `spec.md`

Write `<pipeline-family-folder>/<run>/1-spec/spec.md` as a standalone document — understandable without reading any other file. Use this structure:

```markdown
# Spec: <feature name>

## Overview

## Requirements

## Out of Scope

## Acceptance Criteria
```

- **Standalone** — the reader should not need `spec-research.md` or `intent.md`.
- **Specific** — name exact types, functions, files where possible.
- **Sized by the evidence** — the spec's depth follows what the Q&A and research found; omit sections with nothing to record.
- **No implementation details** — describe WHAT, not HOW to code it.
- **Acceptance criteria** in Given-When-Then format. They drive the tests.
- Architectural and structural details (components, data models, error handling, etc.) belong to phase 2 (the design doc), not here.

### 7. Review with the owner

Show the owner `spec.md`. Iterate on edits, additions, or removals. The owner may also send you back to step 2 for more Q&A; that is allowed and expected. Repeat until the owner explicitly approves.

### 8. Write the approval file

Write `<pipeline-family-folder>/<run>/1-spec/spec-review-approved.md` recording the owner's approval:

```markdown
# Spec Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

<one or two lines capturing anything the owner wants recorded about the approval — leave empty if nothing>
```

The artifacts to commit together: `spec-research.md`, `spec.md`, and `spec-review-approved.md`.
