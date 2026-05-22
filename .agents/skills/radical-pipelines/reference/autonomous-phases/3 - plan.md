# Running the Plan Phase (Phase 3)

Advances the pipeline from phase 2 (design doc) to phase 3 by spawning two writer/reviewer pairs in sequence: first a code-plan pair that produces `code-plan.md`, then a doc-plan pair that produces `doc-plan.md`. Each pair iterates until its plan is approved.

Inputs:

- `<artifacts-folder>/0-prompt/prompt.md`
- `<artifacts-folder>/1-spec/spec.md`
- `<artifacts-folder>/2-design-doc/design-doc.md`

Outputs:

- `<artifacts-folder>/3-plan/code-plan.md`
- `<artifacts-folder>/3-plan/code-plan-review-N-rejected.md` (one per rejected code-plan iteration, N = 1, 2, 3, …)
- `<artifacts-folder>/3-plan/code-plan-review-approved.md` (single, unnumbered file written on code-plan approval)
- `<artifacts-folder>/3-plan/doc-plan.md`
- `<artifacts-folder>/3-plan/doc-plan-review-N-rejected.md` (one per rejected doc-plan iteration, N = 1, 2, 3, …)
- `<artifacts-folder>/3-plan/doc-plan-review-approved.md` (single, unnumbered file written on doc-plan approval)

## Decisions

This phase has no per-phase decisions.

## Required agents

| Agent                | Role                                                                                                       | Persistent? |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| `code-plan-writer`   | Reads the prompt, spec, and design doc, investigates the codebase, and writes `code-plan.md`.              | No          |
| `code-plan-reviewer` | Reviews the code plan adversarially; writes `code-plan-review-N-rejected.md` on rejection or `code-plan-review-approved.md` on approval.                     | No          |
| `doc-plan-writer`    | Reads the prompt, spec, design doc, and `code-plan.md`; writes `doc-plan.md` focused on what/where/who.    | No          |
| `doc-plan-reviewer`  | Reviews the doc plan adversarially; writes `doc-plan-review-N-rejected.md` on rejection or `doc-plan-review-approved.md` on approval.                       | No          |

## Steps

1. Launch a fresh `code-plan-writer`. It reads `prompt.md`, `spec.md`, and `design-doc.md`, explores the codebase as needed, and writes `code-plan.md`.
2. Launch a fresh `code-plan-reviewer`. On rejection it writes `code-plan-review-N-rejected.md` (N increments per rejection, starting at 1); on approval it writes `code-plan-review-approved.md` (no number — the singleton terminator).
3. On **rejected**, launch a fresh `code-plan-writer` with the rejection file's path. It revises `code-plan.md`. The `code-plan-reviewer` re-reviews.
4. On **approved**, launch a fresh `doc-plan-writer`. It reads `prompt.md`, `spec.md`, `design-doc.md`, and the approved `code-plan.md`; explores the host project's existing documentation as needed; and writes `doc-plan.md`.
5. Launch a fresh `doc-plan-reviewer`. On rejection it writes `doc-plan-review-N-rejected.md` (N increments per rejection, starting at 1); on approval it writes `doc-plan-review-approved.md` (no number — the singleton terminator).
6. On **rejected**, launch a fresh `doc-plan-writer` with the rejection file's path. It revises `doc-plan.md`. The `doc-plan-reviewer` re-reviews.
7. On **approved**, verify the phase 3 completion predicate per `pipeline-versioning.md` ("Per-phase completion"): `code-plan.md`, `code-plan-review-approved.md`, `doc-plan.md`, `doc-plan-review-approved.md`, and every `*-rejected.md` review file are committed on the pipeline branch.

```mermaid
flowchart TD
    A[Orchestrator] -->|launches| B[Code Plan Writer]
    B -->|writes code-plan.md| C[Code Plan Reviewer]
    C -->|writes code-plan-review-N-rejected.md or code-plan-review-approved.md| D{Approved?}
    D -->|no| B
    D -->|yes| E[Doc Plan Writer]
    E -->|writes doc-plan.md| F[Doc Plan Reviewer]
    F -->|writes doc-plan-review-N-rejected.md or doc-plan-review-approved.md| G{Approved?}
    G -->|no| E
    G -->|yes| H[Phase complete]
```
