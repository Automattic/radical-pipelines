# Running the Amend Phase Assisted (Phase 1 of an amend run)

Assisted mode covers the amend phase's **plan half**: you drive the research and the plan directly with the owner, and the owner's approval stands in for the plan review. Execution then runs autonomously (step 6).

Inputs:

- `<pipeline-family-folder>/<run>/0-intent/intent.md`

Outputs, at `<pipeline-family-folder>/<run>/1-amend/`:

- `amend-plan-research.md`
- `amend-plan.md`
- `amend-plan-review-approved.md` (written on the owner's approval — see step 5)
- The execution outputs of `../autonomous-phases/1 - amend.md`

## Constraints

- You MUST append every finding and owner decision to `amend-plan-research.md` in real time, not in batches.
- You MUST NOT proceed past any gate without explicit owner confirmation.
- Research the codebase yourself; ask the owner one question at a time when a confirmation of an existing pin is theirs to give. A question that would have the owner make a new design decision is the eject, not Q&A.

## Steps

### 1. Initialize `amend-plan-research.md`

Create `<pipeline-family-folder>/<run>/1-amend/amend-plan-research.md`: an H1, the contents of `intent.md` copied verbatim, and empty `## Q&A` and `## Research` sections to fill as you go.

### 2. Research

Do the two mandatory investigations, recording every search — including the ones that came back empty — under `## Research`:

- **Ramification sweeps.** Enumerate every surface the change touches until the touch map closes.
- **Semantic verification of the pinned target.** Verify the pinned target against reality: read the referenced implementations, docs, and tests rather than trusting the intent's description of them; record any caveat.

When a finding needs the owner's confirmation of an existing pin, ask under `## Q&A` — one question at a time.

**Eject.** If research surfaces a real design decision or the touch map will not stay small and closed, stop: tell the owner the amend exceeds its scope with the discovery and its evidence, and name the follow-up route per `../amend-pipeline.md` ("The eject"). Commit the record as it stands and perform the workflow's close-out.

### 3. Synthesize `amend-plan.md`

Write `<pipeline-family-folder>/<run>/1-amend/amend-plan.md` as a standalone document — understandable without reading any other file — with this structure (semantics per `../autonomous-phases/1 - amend.md` and its lead's discipline: closed touch map backed by recorded sweeps, evidenced pins, granular tasks with observable per-task Acceptance, exact file paths):

```markdown
# Amend Plan: <name>

## Overview

## Pinned target

## Touch map

## E2E test plan

### Flow N: <title>

- **Steps:** ...
- **Expected:** ...
- **Traces to:** Pinned target N

## Gates

## Tasks

### Task 1: <title>

- **Goal:** ...
- **Type:** tdd | e2e | edit | doc
- **Audience:** <!-- doc tasks only -->
- **Files to change:** ...
- **Changes:** ... <!-- doc tasks: a **Sections / scope** field replaces **Changes** -->
- **Depends on:** none / Task N
- **Traces to:** Pinned target N / intent constraint
- **Acceptance:**
  - <observable outcome>

## Out of scope
```

### 4. Review with the owner

Show the owner `amend-plan.md`. Iterate on edits, additions, or removals — returning to step 2 for more research when needed — until the owner explicitly approves.

### 5. Write the approval file

Write `<pipeline-family-folder>/<run>/1-amend/amend-plan-review-approved.md`:

```markdown
# Amend Plan Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

<one or two lines the owner wants recorded — leave empty if nothing>
```

Commit `amend-plan-research.md`, `amend-plan.md`, and `amend-plan-review-approved.md` together in a single commit following the **Commit format** convention.

### 6. Execute

Continue with task execution per `../autonomous-phases/1 - amend.md` steps 5–9, under the autonomous workflow's execution rules (`../autonomous-workflow.md`): its agent-spawning rules (step 5) and its blocker handling — the eject included (step 6). Start a health monitor per `../health-monitoring.md` when execution begins and cancel it whenever execution stops. A rejection naming work outside the touch map returns the map to you and the owner: adjudicate it as in step 2, update `amend-plan.md`, and re-commit it together with a refreshed `amend-plan-review-approved.md` on the owner's approval; re-dispatch only the tasks whose resolution requires new work, and return to the reviewer directly when the plan revision alone resolves the rejection. The phase completes on the reviewer's approval, per the completion predicate (`../pipeline-versioning.md`); the assisted close-out then runs.
