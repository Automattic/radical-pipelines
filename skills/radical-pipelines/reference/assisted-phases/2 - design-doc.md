# Running the Design Doc Phase (Phase 2)

Advances the pipeline from phase 1 (spec) to phase 2 (design-doc) by working through the design directly with the owner. You investigate the codebase, propose options for each design topic, and synthesize a standalone design doc. No agents are spawned.

Inputs:

- `<artifacts-folder>/1-spec/spec.md`

Outputs:

- `<artifacts-folder>/2-design-doc/design-doc-research.md`
- `<artifacts-folder>/2-design-doc/design-doc.md`
- `<artifacts-folder>/2-design-doc/design-doc-review-approved.md` (the assisted-mode approval file you write on the owner's behalf — see step 7)

## Constraints

These rules apply across all steps:

- You MUST anchor every design choice in the spec — point at the requirement or acceptance criterion it serves.
- You MUST propose 2-3 credible options with trade-offs when there is a real choice. Do not collapse to a single option without surfacing the alternatives.
- You MUST work through ONE topic at a time. Never dump multiple unrelated design questions on the owner in a single message.
- You MUST NOT invent functionality the spec did not ask for, and MUST NOT collapse out-of-scope items into the design. If a scope question surfaces during design, log it as an open question or send the owner back to revise the spec — do not decide it in this phase.
- You MUST NOT write production code. Interface sketches and small illustrative snippets are fine.
- You MUST NOT write the implementation plan (ordered steps, task breakdown) — that belongs to phase 3.
- You MUST append every option, trade-off, and decision to `design-doc-research.md` in real time, not in batches.
- You MUST NOT proceed past any gate without explicit owner confirmation.
- You MUST NOT commit until the owner has explicitly approved the final `design-doc.md`.
- You SHOULD read the codebase extensively to ground the design in existing patterns, components, and conventions. Record non-trivial findings under `## Research` in `design-doc-research.md` with sources cited.

## Steps

### 1. Initialize `design-doc-research.md`

Create `<artifacts-folder>/2-design-doc/design-doc-research.md` with this structure:

```markdown
# Design Research: <feature name>

## Research

## Topics

## Open Questions

## Risks
```

Each section is filled in across the next steps: Research grows as you read the codebase, Topics gains one entry per topic worked through in step 3, Open Questions captures unresolved sub-questions deferred to the code-writer, Risks captures anything worth flagging to the code-writer.

Each Topic entry follows this shape:

```markdown
### Topic: <title>

- **Spec link:** Requirement N / Acceptance criterion N
- **Options:**
  1. ...
  2. ...
- **Trade-offs:** ...
- **Decision:** ...
- **Rationale:** ...
```

### 2. Gather context

Read `<artifacts-folder>/1-spec/spec.md` — the authoritative statement of intent for this phase. Then explore the codebase for the components, patterns, and conventions this design will touch — enough to propose grounded options in step 3, not exhaustively. Record non-trivial findings under `## Research` in `design-doc-research.md` with sources cited (file paths, function names).

You will keep reading the codebase as new questions surface in step 3; this step just establishes the baseline.

### 3. Work through the design topics

Work through each design topic in turn. For each:

1. **Frame the topic** — what is the question, and which spec requirement(s) or acceptance criterion(s) does it serve?
2. **Propose 2-3 credible options** grounded in what the codebase already does. Spell out the trade-offs.
3. **Present the topic to the owner.** The owner may pick an option, propose a different one, or ask for more research. Iterate until the owner decides.
4. **Append the topic** (frame, options, trade-offs, decision, rationale) to `design-doc-research.md` under `## Topics`. If the topic uncovers an unresolved sub-question, log it under `## Open Questions`. If it surfaces a risk, log it under `## Risks`.

Cover these topics — order is flexible, and not every topic needs a multi-option choice:

- **Approach** — the mental model the code-writer will work from end-to-end.
- **Components** — new components, modified components, untouched-but-relevant components.
- **Interfaces and data flow** — public interfaces (APIs, function signatures, message shapes, file formats), and how data moves between components.
- **Key decisions** — anything where multiple credible options exist and the choice has consequences.
- **Dependencies** — internal modules, external libraries, services, or systems the design depends on. Call out new dependencies explicitly.
- **Failure modes and observability** — how the design fails, how failures are detected, what is logged or surfaced.
- **Risks and open questions** — anything the implementation plan must resolve.

The design phase is complete when every spec requirement and acceptance criterion has been addressed **and** your self-check (next step) finds no remaining gaps.

### 4. Coverage self-check

Before synthesis, privately run a review-style check against `spec.md`:

- **Coverage** — does every spec requirement and acceptance criterion have a corresponding decision or component?
- **Traceability** — does each topic in `design-doc-research.md` point to a specific spec requirement or acceptance criterion?
- **Feasibility** — can this design actually be built against the existing codebase, conventions, and dependencies?
- **Dependencies** — are internal and external dependencies named? Any hidden ones implied by the design but not listed?
- **Scope** — does the design stay within the spec? Anything beyond the spec, or out-of-scope items that crept back in?
- **Clarity** — would two code-writers read this and build the same thing?

For any gap, return to step 3 and work through the missing topic.

### 5. Synthesize `design-doc.md`

Write `<artifacts-folder>/2-design-doc/design-doc.md` as a standalone document — understandable without reading `design-doc-research.md`, `spec.md`, or `intent.md`. Use this structure:

```markdown
# Design Doc: <feature name>

## Overview

## Approach

## Components

## Interfaces and Data Flow

## Key Decisions

### Decision: <title>

- **Choice:** ...
- **Alternatives:** ...
- **Trade-offs:** ...
- **Traces to:** Requirement N / Acceptance criterion N

## Dependencies

## Failure Modes and Observability

## Risks and Open Questions
```

- **Standalone** — the reader should not need `design-doc-research.md`, `spec.md`, or `intent.md`.
- **Trace every decision** — each Key Decision points to the spec requirement or acceptance criterion it serves.
- **Cover every acceptance criterion** — the design must explain how each criterion will be met.
- **Design, do not plan** — describe architecture and decisions, not an ordered list of implementation steps. That is phase 3.

### 6. Review with the owner

Show the owner `design-doc.md`. Iterate on edits, additions, or removals. The owner may also send you back to step 3 for more design work; that is allowed and expected. Repeat until the owner explicitly approves.

### 7. Commit

Write `<artifacts-folder>/2-design-doc/design-doc-review-approved.md` recording the owner's approval (this is the assisted-mode equivalent of the autonomous `design-doc-reviewer`'s approval file, and it satisfies the phase 2 completion predicate in `pipeline-versioning.md`):

```markdown
# Design Doc Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

<one or two lines capturing anything the owner wants recorded about the approval — leave empty if nothing>
```

Commit `design-doc-research.md`, `design-doc.md`, and `design-doc-review-approved.md` together in a single commit, following the **Commit format** convention.
