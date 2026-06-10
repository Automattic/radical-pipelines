# Running the Plan Phase (Phase 3)

Advances the pipeline from phase 2 (design doc) to phase 3 (`code-plan.md` + `doc-plan.md`) by working through the implementation plan directly with the owner. You break the design into ordered, traceable tasks captured in two artifacts: `code-plan.md` first, then `doc-plan.md` (which reads `code-plan.md` as input). No agents are spawned.

Inputs:

- `<artifacts-folder>/1-spec/spec.md`
- `<artifacts-folder>/2-design-doc/design-doc.md`

Outputs:

- `<artifacts-folder>/3-plan/plan-notes.md`
- `<artifacts-folder>/3-plan/code-plan.md`
- `<artifacts-folder>/3-plan/doc-plan.md`
- `<artifacts-folder>/3-plan/code-plan-review-approved.md` (the assisted-mode approval file you write on the owner's behalf — see step 11)
- `<artifacts-folder>/3-plan/doc-plan-review-approved.md` (the assisted-mode approval file you write on the owner's behalf — see step 11)

## Constraints

These rules apply across all steps:

- You MUST trace every task — code task to a spec acceptance criterion or design decision; doc task to a spec requirement, acceptance criterion, or code task.
- You MUST cover every spec acceptance criterion with at least one code task.
- You MUST cover every relevant documentation surface with at least one doc task. Sweep the codebase end-to-end for existing references to the behavior the code phase will change; each is a surface that needs a task (in scope or explicitly excluded).
- You MUST keep tasks small enough that the code-writer (phase 4) or doc-writer (phase 5) never has to make a design decision mid-task.
- You MUST name exact files for each task wherever possible — real paths from the codebase, not generic descriptions.
- You MUST give every task one or more acceptance criteria. Code tasks: observable behavior, scoped to the task. Doc tasks: drift-resistant coverage and outcomes (what the reader leaves with, what the docs must cover) — never exact wording, function names, or parameter lists.
- You MUST propose 2-3 credible options with trade-offs when there is a real choice (task slicing, ordering, file boundaries, doc surfaces, audiences). Do not collapse to a single option without surfacing the alternatives.
- You MUST work through ONE topic at a time. Never dump multiple unrelated planning questions on the owner in a single message.
- You MUST NOT plan tests in the code plan — that is the code-writer's responsibility in phase 4 (TDD).
- You MUST NOT plan documentation in the code plan, and MUST NOT include code tasks in the doc plan.
- You MUST NOT write code or documentation content. Describe what to do, not how to phrase it.
- You MUST NOT invent functionality the spec did not ask for, and MUST NOT collapse out-of-scope items into either plan. If a scope question surfaces, log it as an open question or send the owner back to revise the spec or design doc — do not decide it in this phase.
- You MUST append every option, trade-off, and decision to `plan-notes.md` in real time, not in batches.
- You MUST NOT proceed past any gate without explicit owner confirmation.
- You MUST NOT commit until the owner has explicitly approved both `code-plan.md` and `doc-plan.md`. Once both are approved, you also write the two approval files (`code-plan-review-approved.md` and `doc-plan-review-approved.md`) as part of the same commit.
- You SHOULD read the codebase to ground tasks in actual files, modules, and conventions. Record non-trivial findings under `## Research` in `plan-notes.md` with sources cited.

## Steps

### 1. Initialize `plan-notes.md`

Create `<artifacts-folder>/3-plan/plan-notes.md` with this structure:

```markdown
# Plan Notes: <feature name>

## Research

## Code Plan Topics

## Doc Plan Topics

## Open Questions

## Risks
```

Each section is filled in across the next steps: Research grows as you read the codebase, Code Plan Topics gains one entry per topic worked through in step 3, Doc Plan Topics gains one entry per topic in step 7, Open Questions captures unresolved sub-questions deferred to the code-writer or doc-writer, Risks captures anything worth flagging downstream.

Each Topic entry follows this shape:

```markdown
### Topic: <title>

- **Spec / design / code-plan link:** Requirement N / Acceptance criterion N / Design decision X / Code task N
- **Options:**
  1. ...
  2. ...
- **Trade-offs:** ...
- **Decision:** ...
- **Rationale:** ...
```

### 2. Gather context

Read `<artifacts-folder>/1-spec/spec.md` and `<artifacts-folder>/2-design-doc/design-doc.md`. Then explore the codebase to identify the exact files, modules, and conventions tasks will touch — enough to propose grounded task breakdowns, not exhaustively.

Sweep the repository end-to-end for existing text that references the behavior the code phase will change — READMEs at any level, inline comments, examples, configuration descriptions, changelogs, contributor docs, internal conventions. Each match is a documentation surface that may need a task in step 7.

Record non-trivial findings under `## Research` in `plan-notes.md` with sources cited (file paths, function names).

You will keep reading the codebase as new questions surface in steps 3 and 7; this step just establishes the baseline.

### 3. Work through the code plan topics

Work through each code-plan topic in turn. For each:

1. **Frame the topic** — what is the planning question (task slicing, file scope, ordering, granularity, acceptance), and which spec acceptance criterion or design decision does it serve?
2. **Propose 2-3 credible options** grounded in the design doc and the codebase. Spell out the trade-offs.
3. **Present the topic to the owner.** The owner may pick, propose a different option, or ask for more research. Iterate until the owner decides.
4. **Append the topic** to `plan-notes.md` under `## Code Plan Topics`. If the topic uncovers an unresolved sub-question, log it under `## Open Questions`. If it surfaces a risk, log it under `## Risks`.

Cover these topics — order is flexible, and not every topic needs a multi-option choice:

- **Task slicing** — how to break the design into tasks small enough that the code-writer makes no design decisions mid-task.
- **File scope** — which files each task touches; where new code lives.
- **Ordering and dependencies** — which tasks block which; what must land first.
- **Per-task acceptance** — what observable behavior must be true when each task is done.
- **Coverage of acceptance criteria** — every spec acceptance criterion mapped to at least one task.
- **Coverage of the design** — every key design decision executed.

The code plan is ready for synthesis when every spec acceptance criterion and design decision has been mapped to one or more tasks **and** your self-check (next step) finds no remaining gaps.

### 4. Code plan coverage self-check

Before synthesis, privately run a review-style check against `spec.md` and `design-doc.md`:

- **Coverage of acceptance criteria** — does every spec acceptance criterion map to at least one task?
- **Coverage of the design** — does the plan execute every key design decision?
- **Traceability** — does each task point to a specific spec acceptance criterion or design decision?
- **Per-task acceptance** — does every task have observable, testable acceptance criteria, scoped to the task and consistent with the spec criterion it traces to?
- **Ordering and dependencies** — are dependencies correct? Can each task actually run after the tasks it depends on?
- **Granularity** — are tasks small enough that the code-writer never has to make a design decision mid-task?
- **Feasibility** — does each task reference real files, modules, and APIs?
- **Scope** — does the plan stay within the spec and design? Anything beyond, or out-of-scope items that crept back in?
- **No test planning** — does the plan refrain from prescribing specific unit or end-to-end tests?
- **No doc tasks** — does the plan refrain from including documentation work?

For any gap, return to step 3 and work through the missing topic.

### 5. Synthesize `code-plan.md`

Write `<artifacts-folder>/3-plan/code-plan.md` as a standalone document — understandable without reading `plan-notes.md`, `design-doc.md`, `spec.md`, or `intent.md`. Use this structure:

```markdown
# Code Plan: <feature name>

## Overview

## Tasks

### Task 1: <title>

- **Goal:** ...
- **Files to change:** ...
- **Changes:** ...
- **Depends on:** none / Task N
- **Traces to:** Spec requirement N / Acceptance criterion N / Design decision X
- **Acceptance:**
  - <observable behavior 1>
  - <observable behavior 2>
  - ...

### Task 2: ...
```

- **Standalone** — the reader should not need any prior artifact.
- **Ordered and granular** — tasks are sequenced correctly and small enough that the code-writer never has to make a design decision mid-task.
- **Trace every task** — each task points to a spec acceptance criterion or design decision.
- **Cover every acceptance criterion** — every spec acceptance criterion is addressed by at least one task.
- **Per-task acceptance is required** — describe *what must be true*, not *which test to write*. Tests are the code-writer's job in phase 4 (TDD).
- **Name exact files** — use real paths from the codebase.
- **Stay within spec and design** — do not invent functionality, alternative designs, or extra scope.

### 6. Review `code-plan.md` with the owner

Show the owner `code-plan.md`. Iterate on edits, additions, or removals. The owner may also send you back to step 3 for more planning work; that is allowed and expected. Repeat until the owner explicitly approves the code plan.

### 7. Work through the doc plan topics

With the code plan settled, plan the documentation. Treat the approved `code-plan.md` as part of the input — every task that surfaces user-visible behavior (new API, new flag, new config, new flow) may need a corresponding doc task.

Work through each doc-plan topic in turn. For each:

1. **Frame the topic** — what is the planning question (which surface, which audience, what scope), and which spec requirement, acceptance criterion, or code task does it serve?
2. **Propose 2-3 credible options** grounded in the host project's existing documentation conventions and the audiences that already exist. Spell out the trade-offs.
3. **Present the topic to the owner.** Iterate until the owner decides.
4. **Append the topic** to `plan-notes.md` under `## Doc Plan Topics`. Log unresolved sub-questions and risks in their respective sections.

Cover these topics — order is flexible:

- **Surface inventory** — which existing documentation surfaces reference the behavior the code phase will change. Use the sweep from step 2; confirm each surface is in or out of scope.
- **New surfaces** — what new docs need to exist (e.g., a new API page, a new guide).
- **Audience** — for each surface, who the doc is for (external API consumers, internal contributors, end users).
- **Scope per surface** — what sections to add or modify, framed as coverage and audience outcomes rather than exact wording. Stay drift-resistant.
- **Ordering and dependencies** — which doc tasks block which.
- **Per-task acceptance** — what the reader leaves with (capability, understanding) or what the documentation must cover (section, example, cross-link). Drift-resistant.

The doc plan is ready for synthesis when every relevant surface has been mapped to a task **and** your self-check (next step) finds no remaining gaps.

### 8. Doc plan coverage self-check

Before synthesis, privately run a review-style check against `spec.md`, `design-doc.md`, and the approved `code-plan.md`:

- **Surface coverage** — every existing documentation surface that references the changing behavior has a corresponding task, in scope or explicitly excluded.
- **New surface coverage** — every new user-visible capability from the code plan has a documentation surface.
- **Traceability** — does each task point to a specific spec requirement, acceptance criterion, or code task?
- **Per-task acceptance** — does every task have evaluable, drift-resistant acceptance criteria (coverage and outcomes, not function names or wording)?
- **Audience** — does every task name its audience?
- **Drift resistance** — does the plan avoid prescribing exact wording, function names, parameter lists, or other implementation details?
- **Scope** — does the plan stay within spec and design? No invented documentation for unrequested features.
- **No code tasks** — does the plan refrain from including code work?

For any gap, return to step 7 and work through the missing topic. If doc planning reveals a code plan gap, return to step 3 and revise the code plan first.

### 9. Synthesize `doc-plan.md`

Write `<artifacts-folder>/3-plan/doc-plan.md` as a standalone document — understandable without reading any prior artifact. Use this structure:

```markdown
# Doc Plan: <feature name>

## Overview

## Tasks

### Task 1: <title>

- **Goal:** ...
- **Audience:** ...
- **Files to change:** ...
- **Sections / scope:** ...
- **Depends on:** none / Task N
- **Traces to:** Spec requirement N / Acceptance criterion N / Code task N
- **Acceptance:**
  - <what the reader leaves with — capability or understanding>
  - <required coverage element — section, example, cross-link>
  - ...

### Task 2: ...
```

- **Standalone** — the reader should not need any prior artifact.
- **What, where, and for whom — not what the docs say** — name files, sections, and audiences; do not prescribe exact wording, function names, or parameter lists.
- **Drift-resistant** — the doc-writer (phase 5) reads the actual code to fill in details. The plan must survive small implementation changes without becoming stale.
- **Trace every task** — each task points to a spec requirement, acceptance criterion, or code task it documents.
- **Per-task acceptance is required** — describe what the reader leaves with or what the documentation must cover.
- **Stay within spec and design** — no invented documentation for unrequested features.
- **No code tasks** — code work lives in `code-plan.md`.

### 10. Review `doc-plan.md` with the owner

Show the owner `doc-plan.md`. Iterate on edits, additions, or removals. The owner may send you back to step 7 (or further back to step 3 if doc planning reveals a code plan gap). Repeat until the owner explicitly approves the doc plan.

### 11. Commit

Write the two approval files recording the owner's approvals (these are the assisted-mode equivalent of the autonomous `code-plan-reviewer` and `doc-plan-reviewer` approval files, and they satisfy the phase 3 completion predicate in `pipeline-versioning.md`).

`<artifacts-folder>/3-plan/code-plan-review-approved.md`:

```markdown
# Code Plan Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

<one or two lines capturing anything the owner wants recorded about the approval — leave empty if nothing>
```

`<artifacts-folder>/3-plan/doc-plan-review-approved.md`:

```markdown
# Doc Plan Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

<one or two lines capturing anything the owner wants recorded about the approval — leave empty if nothing>
```

Commit `plan-notes.md`, `code-plan.md`, `doc-plan.md`, `code-plan-review-approved.md`, and `doc-plan-review-approved.md` together in a single commit, following the **Commit format** convention.
