# Doc Plan: Bring the reviews-feature prose into AGENTS.md compliance

## Overview

Read together with `../1-spec/spec.md`, `../2-design-doc/design-doc.md`, and the sibling
`code-plan.md`. This is the **documentation phase** breakdown for review-2 of the reviews feature.

**Bottom line: there is no additional documentation work.** This review is itself an editorial pass —
nine precise prose edits across six files plus a changeset reword — with **no behavior change**. In
this repo the docs **are** the product (the shipped skill, agent profiles, README, changeset), so the
review's entire documentation surface is already enumerated as concrete edits in the code plan's nine
edit tasks. There is no separate "now document the code" deliverable, and the changelog surface is
already owned by code-plan Task 9. This doc plan therefore contains **no edit tasks**; it records the
one read-only documentation-completeness verification the review still needs and, just as important,
the documentation surfaces this review deliberately does **not** touch.

The governing constraint is the same as the rest of the review: every distinct fact the flagged
passages convey today must still be conveyed afterwards — stated once at a canonical location or
reachable through an explicit same-path reference (spec requirement 10; design "Failure Modes"). No
fact is removed, only deduplicated and tightened.

## Why there is no additional doc work (verification record)

The following was checked against the current tree before concluding:

1. **The changelog surface is already handled by the code phase — no new changeset, no doc-side
   changeset edit.** The reviews feature ships exactly one changeset, `.changeset/pipeline-reviews.md`.
   This review adds **no** new changeset (a review reuses the branch and PR #106, creating no new
   pipeline or branch, and the per-PR Changeset Gate is satisfied by the one existing changeset — spec
   requirement 12). The single change to that changeset — rewording its body so it no longer shares the
   run-model sentence near-verbatim with `README.md:157` — is **code-plan Task 9**, a code-phase edit,
   not a separate doc task. Its front matter (`"@automattic/radical-pipelines": minor`) stays
   byte-identical, so the changelog/release-notes surface needs no further documentation action.

2. **The README is deliberately preserved and stays accurate.** Finding 6c (the README ↔ changeset
   near-duplicate) is resolved **entirely on the changeset side**; `README.md:157` is left
   byte-identical because its run-model sentence is load-bearing connective tissue mid-paragraph
   (design Decision 9; code-plan "files that must stay byte-identical"). Verified that none of the
   review's deduplications can make the README stale: the README carries **none** of the deduped facts
   — a token search over `README.md` for "advisor", "tree node", "sharpest", "base ref", and "Reviewer
   base" returns **zero** hits, so removing those restatements inside the skill cannot leave the README
   describing something the skill no longer says. The README documents the run model for a project-docs
   reader and continues to read coherently untouched.

3. **No documentation surface outside the skill carries a flagged passage.** Every one of the nine edit
   sites lives under `skills/radical-pipelines/reference/` or in `.changeset/pipeline-reviews.md`. A
   repo-wide check confirms the four deleted/reworded sentences appear **nowhere** in the other doc
   surfaces — `grep -rn` for "shows no run chain", "The rows are unchanged", "sharpest discriminator",
   and "never unilaterally redirects" over `README.md`, `website/`, `CONTRIBUTING.md`, `AGENTS.md`, and
   `agents/` returns **zero** hits each. So no contributor doc, website page, agent profile, or
   convention file needs a parallel edit; the change is fully contained in the six code-plan files.

4. **`AGENTS.md` is the standard, not an edit target.** The five rules the edits bring the prose into
   compliance with live at `AGENTS.md:5–11` ("Rules when modifying the skill"). `AGENTS.md` itself is
   unchanged — it is what the review is measured against (design "Dependencies"), and its rules are
   scoped by their own wording to "the skill" (`skills/radical-pipelines/`), which is exactly the
   jurisdiction the edits stay within.

## Task D1 — Verify the documentation is complete and consistent (read-only, no edits)

- **Goal.** Confirm — after the code phase (`code-plan.md` Tasks 1–9) lands — that the documentation
  surface is complete: every distinct fact the flagged passages conveyed before this change is still
  reachable (stated once or via an in-path reference), no new violation was introduced, the README and
  the other untouchable patterns are byte-identical, and no doc surface outside the six edited files
  needs a parallel edit. This task **edits nothing**; it is the documentation phase's gate and a guard
  against missed or invented doc work.
- **Audience.** Doc-phase reviewer / orchestrator — the gate that confirms the docs phase is genuinely
  a no-op-beyond-verification for this editorial review.
- **Files.** None edited. Read-only inspection of the six edited files (`fork-pipeline.md`,
  `review-pipeline.md`, `pipeline-versioning.md`, `work-on-an-issue.md`, `autonomous-workflow.md`,
  `.changeset/pipeline-reviews.md`) and the untouchable surfaces (`README.md`, the
  `autonomous-phases/4 - code.md` / `5 - docs.md` base-ref parentheticals, `intent-format.md`, the
  canonical `pipeline-versioning.md:21–28` rule).
- **Relationship to the code plan.** This is the **documentation-facing reading** of code-plan Task 10
  (the three-layer manual check + Changeset Gate). The code phase runs that check as its acceptance
  gate; the doc phase re-reads its meaning-preservation and no-new-violation layers as the
  documentation completeness/consistency check, because where the docs are the product, "did the edit
  land correctly?" and "is the documentation complete and consistent?" are the same question answered
  by the same re-read.
- **Depends on.** Code-plan Tasks 1–9 (all nine edits must be in place first — this task verifies
  against the finished tree). It does not re-perform any edit.
- **Traces to.** Spec requirements 10, 11, 13 / acceptance criteria 10, 11; design "Failure Modes and
  Observability" (verification layers 2 and the byte-identical checks).
- **Acceptance.**
  - **No meaning lost.** Every fact in the spec's requirement-10 enumeration is still reachable after
    the edits: fork inherits only `base/`, reviews not inherited (1); advisories never gate an
    owner-chosen review (2); reviews are not cross-pipeline-tree nodes (3); a review-less pipeline's
    empty run chain is derivable from the general run-chain rule (4); the resume/review/fork distinction
    (5); the base-ref value/timing/hold-constant substance, reachable from both citing steps at the
    canonical `pipeline-versioning.md:21–28` rule (6); where the per-phase predicate is evaluated (7);
    that a review reuses the branch and leaves the version unchanged (8); the run model in both the
    README and the changelog (9).
  - **No new violation.** No edit adds duplication, unnecessary negative phrasing, or non-minimal
    wording anywhere in the PR #106 prose, and no fix reintroduces a deduped fact at another in-path
    location.
  - **Untouchable patterns byte-identical.** `README.md` (especially line 157), the
    `autonomous-phases/4 - code.md:35` and `5 - docs.md:36` **Reviewer base ref** reference
    parentheticals, `intent-format.md`, and the canonical **Reviewer base ref** rule at
    `pipeline-versioning.md:21–28` are unchanged.
  - **Containment confirmed.** No doc surface outside the six edited files carries any flagged passage
    (the grep checks in verification record item 3 return zero hits); `git diff --stat` lists only the
    six expected files.
  - **Outcome to record.** The documentation phase is a verified completeness check for this editorial
    review — no doc edits to author, none invented; the changelog surface was already handled in the
    code phase (Task 9); the README was deliberately and correctly left untouched.

## Who does what

- **code-writer** (code phase): performs all nine prose edits (code-plan Tasks 1–9), including the
  changeset body reword (Task 9), and runs the three-layer verification (Task 10), which doubles as the
  documentation-completeness check.
- **doc-writer** (docs phase): **no new documentation to author.** The shipped docs are the product and
  were edited in the code phase; the changelog entry already exists and is correct after Task 9. There
  is nothing to add beyond confirming this.
- **doc-reviewer** (docs phase gate): independently runs Task D1 — re-reads the edited prose for
  meaning preservation and no new violations, confirms the untouchable patterns (README, the 4/5
  base-ref parentheticals, `intent-format.md`, the canonical base-ref rule) are byte-identical, and
  confirms no doc surface outside the six edited files needs a parallel edit.
