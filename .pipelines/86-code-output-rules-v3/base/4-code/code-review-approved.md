# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Task 1: Add the run-pointer disposition to `code-writer-tdd` and remove the superseded narrower line
- Task 2: Add the run-pointer disposition to `code-writer-e2e`
- Task 3: Add the run-pointer disposition to `docs-writer`
- Task 4: Add the run-pointer detection item to `code-reviewer`
- Task 5: Add the run-pointer detection item to `docs-reviewer`

Base ref: `bf1346868eb2af5d9f73b51064288602154f41f3` → HEAD (`369a026`).

## Summary

The batch is a clean, prose-only edit to exactly the five agent profiles the plan names. Each of the three producers (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) gains one `## Guidelines` disposition bullet in the writing voice; each of the two reviewers (`code-reviewer`, `docs-reviewer`) gains one detection item in its `### 2. Review the changes` checklist in the finding voice; and `code-writer-tdd` has the single planned deletion of the superseded "Comments must be self-contained…" line, which leaves the surrounding "Document every public symbol…" block coherent. Every per-task Acceptance criterion is met, every spec acceptance criterion AC1–AC7 is satisfied by the resulting text, and every design-doc decision the tasks trace to is honored. The three load-bearing wording constraints hold: no added bullet uses "pipeline" (AC5/R4), the reviewer items are referent-based judgments that explicitly say "Judge by the referent, not a token scan" (R5), and the producer disposition and reviewer detection are distinct forms in distinct voices, sections, and even labels — not one duplicated block (AC6). The batch's own product content (the five bullets and the five commit subjects) is itself free of pointers back at this run; the token examples inside the bullets are illustrative examples of the bad pattern, not citations of this run's paperwork as authority.

## Checks

This project defines no Guardrails convention, so there are no gates to run and none to record. The repository's `CLAUDE.md`/`AGENTS.md` forbids structural tests asserting the content, wording, or ordering of skill or agent files, so there are correctly no automated tests; the batch is not faulted for lacking them. Verification is by inspection of the resulting profile text, re-driving the seven inspection flows from `code-plan.md`.

| Check | Command | Result |
| ----- | ------- | ------ |
| Guardrails gates | (none defined by this project) | n/a — no gates |
| Automated tests | (forbidden by repo convention for profile content) | n/a — none expected |

## Behavior verification

This feature ships no runtime behavior and no executable surface. Behavior verification is the re-drive of the seven inspection Flows in `code-plan.md`'s "E2E test plan" section, performed by reading the five edited profiles. Evidence per flow:

- **Flow 1 (AC1 — a run-pointer is caught).** Producer dispositions forbid writing each example pointer: `task3Helper` and "per R9" (number tying to task / requirement-review) are named verbatim; "as the design doc specifies" (named artifact as authority) is named verbatim; a commit subject "Add parser per R9" is covered because "A commit message's descriptive content is in scope." The reviewer items catch each: "does anything the batch writes outside the `<artifacts-folder>`, producer commit subjects included, point at this run: a number tying it to a task or requirement/review, a named artifact of this change … cited as its authority, or another agent credited as author? … A real pointer is a must-fix that blocks approval." All three discriminator forms appear on both the producer and reviewer sides, and producer commit subjects are explicitly among the reviewer's surfaces. Confirmed.
- **Flow 2 (AC2 — domain vocabulary not caught).** Both voices are referent-based. Reviewer items state "Judge by the referent, not a token scan." Both explicitly name the not-a-violation cases: "the domain's own vocabulary used as subject matter — a symbol named `spec`, a doc/test/page about a spec-writing feature, the words task, plan, or phase as subject terms — … an illustrative or example artifact reference." Neither presents a token/keyword/pattern list. Confirmed — holds in this self-hosting repo.
- **Flow 3 (AC3 — agent-name tag allowed).** Producers: "the commit format's agent-name tag is exempt and stays." Reviewers: "the commit's agent-name tag is allowed." Confirmed.
- **Flow 4 (AC4 — artifacts may reference the run).** Every bullet scopes to output *outside* the artifacts: producers use "outside your task's own artifacts" / "outside this run's own artifacts" / "outside the `<artifacts-folder>`"; reviewers use "outside the `<artifacts-folder>`" and ask only about "the batch['s]" host-project output, never the run's own artifacts. Confirmed.
- **Flow 5 (AC5 — pipeline-free).** Mechanically confirmed: no added bullet contains the word "pipeline" (case-insensitive grep over the added lines returned zero hits). Each names only concrete referents (task, requirement/review, spec, plan, design doc, review, agents) and scopes by exclusion relative to the artifacts folder. "This run" refers to the concrete execution the agent already holds, not the abstract "pipeline" concept. Confirmed.
- **Flow 6 (AC6 — role-appropriate placement).** Producers place a Guidelines disposition in the writing voice ("Everything you write … reads as if written by hand and points at nothing behind this change"). Reviewers place a detection predicate in the finding voice ("does anything the batch writes … point at this run? … must-fix that blocks approval"). Different grammatical mood, different section (`## Guidelines` vs. the review checklist), and even different label ("No back-pointers…" for producers vs. "No run-pointers…" for reviewers). They share discriminator vocabulary but are demonstrably not the same block. Confirmed.
- **Flow 7 (AC7 — generic wording).** No bullet hardcodes an artifacts-folder path. The three profiles that already use the placeholder (`docs-writer`, `code-reviewer`, `docs-reviewer`) express the boundary via `<artifacts-folder>`; the two code-writers that do not use it express the boundary in referent terms ("your task's own artifacts" / "this run's own artifacts"). No tool-specific reference anywhere; the deletion's surroundings remain generic. Confirmed.

Additional verification on the batch's own output: the five commits each change a path under `agents/` (a product path), each carries only the convention's agent-name tag `(code-writer-tdd)` — the required commit-format tag, not pipeline-naming provenance — and each subject describes the change in hand-written terms with no number, artifact-as-authority, or foreign author. The token examples inside the added bullets (`R9`, `task3Helper`, "design doc", `spec`) denote *examples of the bad pattern*, not this run's paperwork cited as authority; judged by referent they are legitimate subject matter, not run-pointers.
