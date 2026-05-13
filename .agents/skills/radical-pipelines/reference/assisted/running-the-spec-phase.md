# Running the Spec Phase (Phase 1, Assisted Workflow)

This is the phase-1 step of the **assisted workflow**. It advances the pipeline
from phase 0 (`prompt.md`) to phase 1 (`spec.md`) by driving an iterative Q&A
directly with the owner — no agents are spawned. Assumes phase 0 has finished
(per `../starting-a-pipeline.md`): the worktree is set up, the artifacts folder
exists, and `prompt.md` has been written.

When you start this workflow, tell the owner explicitly that you are running
the **assisted spec phase** so the owner knows what to expect: the two of you
will do a question-by-question pass, you will synthesize a standalone spec,
and the owner approves before anything is committed.

Inputs:

- `<artifacts-folder>/prompt.md`

Outputs:

- `<artifacts-folder>/requirements.md`
- `<artifacts-folder>/spec.md`

## Decisions

The assisted workflow has no per-phase decisions in this version — it is fully
driven by the conversation with the owner.

## Required agents

None. The orchestrator runs the Q&A and synthesis directly.

## Constraints

These rules apply across all steps:

- You MUST ask ONE question at a time. Never list multiple questions in a single
  message.
- You MUST NOT answer your own questions or propose solutions on the owner's
  behalf.
- You MUST NOT propose design or implementation choices — those belong to later
  phases.
- You MUST append every question and answer to `requirements.md` in real time,
  not in batches.
- You MUST NOT proceed past any gate without explicit owner confirmation.
- You MUST NOT commit until the owner has explicitly approved the final
  `spec.md`.
- You MAY (and often should) read the codebase to inform your questions and
  check feasibility. Record any non-trivial findings under `## Research` in
  `requirements.md` with sources cited. Do not produce a separate research
  artifact or directory — that belongs to later phases.

## Steps

### 1. Verify the input

Confirm `<artifacts-folder>/prompt.md` exists. If it does not, the pipeline has
not been started yet — tell the owner, then switch to
`../starting-a-pipeline.md` to bootstrap phase 0. Return here once `prompt.md`
is in place.

### 2. Initialize `requirements.md`

Create `<artifacts-folder>/requirements.md` with the rough idea (the contents of
`prompt.md`) at the top. Leave a `## Q&A` heading ready to receive entries.

### 3. Run the Q&A loop

Ask one question at a time. For each:

1. Formulate the question and append it to `requirements.md` under `## Q&A`.
2. Present it to the owner and wait for the answer.
3. Append the answer to `requirements.md`.
4. Decide what to ask next.

Cover these areas strategically — not as a checklist, and not always in this
order:

- **Scope** — what the feature must do, and what it must not do.
- **Users** — who uses this and how.
- **Constraints** — technical, business, performance, security.
- **Success criteria** — how done is measured.
- **Edge cases** — failure, empty, large, concurrent.
- **Integration** — what existing systems this must work with.
- **Data** — structures, lifecycle, persistence.

Suggest options when the owner is unsure. If a question would benefit from
codebase context, do a quick read first and ground the question in what you
found. Record non-trivial findings under `## Research` in `requirements.md`.

Track exclusions as they surface. Every "no", "not for v1", "we won't worry
about that" is an out-of-scope candidate — note it so it can be confirmed at
step 5.

The Q&A is complete when the owner says it is **and** your self-check (next
step) finds no remaining gaps.

### 4. Coverage self-check

Before synthesis, privately run a review-style check on what you have:

- **Completeness** — are all areas above sufficiently covered?
- **Clarity** — could two implementers read the requirements and build the same
  thing?
- **Feasibility** — does what the owner described fit the existing codebase and
  conventions?
- **Consistency** — do the answers contradict each other?
- **Scope** — are exclusions explicit?

For any gap, return to step 3 and ask the missing question. Do not synthesize
through unanswered gaps.

### 5. Verify out-of-scope

Surface the exclusions you collected during Q&A back to the owner in one
consolidated list and ask whether anything is missing. Update `requirements.md`
with the confirmed exclusions before moving on.

### 6. Consolidate requirements

Append a `## Consolidated Requirements` section at the bottom of
`requirements.md`: a numbered list distilled from the Q&A. Exclusions belong in
the spec's Out of Scope section, not here.

### 7. Synthesize `spec.md`

Write `<artifacts-folder>/spec.md` as a standalone document — understandable
without reading any other file. Use this structure:

```markdown
# Spec: <feature name>

## Overview

## Requirements

## Out of Scope

## Acceptance Criteria
```

- **Standalone** — the reader should not need `requirements.md` or `prompt.md`.
- **Specific** — name exact types, functions, files where possible.
- **No implementation details** — describe WHAT, not HOW to code it.
- **Acceptance criteria** in Given-When-Then format. They drive the tests.
- Architectural and structural details (components, data models, error
  handling, etc.) belong to phase 2 (the design doc), not here.

### 8. Review with the owner

Show the owner `spec.md`. Iterate on edits, additions, or removals. The owner
may also send you back to step 3 for more Q&A; that is allowed and expected.
Repeat until the owner explicitly approves.

### 9. Commit or persist safely

Commit `requirements.md` and `spec.md` together in a single commit only when allowed by the project's **Commits** convention and repository ownership policy. In not-owned repositories, commits are allowed once work is happening in the configured fork worktree. Pull-request publication is outside the assisted spec phase and belongs to the open PR phase. Before any commit, inspect the staged diff and remove unrelated Radical Pipelines, Pi, Claude, agent, or personal configuration files.

### 10. Report

Tell the owner:

- That the assisted spec phase is complete.
- Where `requirements.md` and `spec.md` were written.
- That this run ends here. Continuing to the next phase happens in a separate
  session.
