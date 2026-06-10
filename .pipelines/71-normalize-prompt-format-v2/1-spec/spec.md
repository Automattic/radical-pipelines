# Spec: Normalize issue content into the standard intent format when creating a pipeline

## Overview

Radical Pipelines is an orchestrator skill that takes a software issue through six sequential phases. Phase 0 ("Intent") turns the originating issue into the `0-intent/intent.md` artifact that seeds every later phase. Today, phase-0 creation adapts the issue content into that artifact but does **not** guarantee a single canonical structure, and it does **not** include an explicit owner-confirmation step before the file is written. As a result, the shape of `intent.md` varies with the shape of the originating issue — an issue authored in this project's format yields a clean artifact, while a free-form third-party issue (prose, no headings, lots of discussion in comments and links) yields a less structured one.

This feature makes phase-0 creation **always** produce `intent.md` in the canonical **Goal / Constraints / Context / Assumptions** format, regardless of the issue's original shape. The orchestrator reads the full picture — the issue body, all of its comments, and any linked or external references — and synthesizes it into that standard format. Because synthesis involves judgment, the owner **confirms** the proposed `intent.md` before it is committed. The one exception is the case where the issue is already canonical, carries no comments, and contains no references in its body: there is nothing to synthesize, so the body maps to `intent.md` directly and confirmation is skipped. The result is that every downstream phase starts from the same canonical input, whether the originating issue was written in this project's format or as a free-form discussion.

The change is confined to the pipeline-creation flow's phase-0 step. The owner is always present when phase 0 runs (it completes before any autonomous run begins), so the confirmation is a plain interactive exchange with no special handling needed for the autonomous "no questions" rule.

## Requirements

### Synthesis into the canonical format

1. When a pipeline is created from an issue, `intent.md` MUST always be written in the canonical intent format: a document whose body consists of a required `## Goal` section followed by any subset of the optional sections `## Constraints`, `## Context`, and `## Assumptions / directions to explore`, in that order. Empty sections are omitted; no `N/A` placeholders are used. The issue title becomes the document's top-level heading (H1), and a source attribution to the originating issue is included so the artifact is self-contained. A body consisting of Goal alone is a complete, valid intent.

2. To produce the canonical intent, the orchestrator MUST take into account the full picture of the issue: the issue body, **all** of the issue's comments, and any linked or external references found in the body or comments (the orchestrator reads the content those references point to, rather than treating the bare link as the whole picture).

3. The orchestrator MUST place each piece of source material in the section that matches its nature:
   - the desired outcome → **Goal**;
   - a binding must/must-not the owner owns (hard boundaries) → **Constraints**;
   - links, prior decisions, or motivation → **Context**;
   - a belief about cause, current state, or a proposed approach → **Assumptions / directions to explore**, labeled as open (something for later phases to confirm or overturn).

   Material drawn from comments or referenced sources is sorted the same way and is **not** treated as more authoritative than the body merely because it appears later in the conversation.

4. The synthesized intent MUST stay faithful to the source: it MUST NOT introduce requirements, technical direction, design, or implementation details that the source did not contain, and it MUST NOT silently substitute a different goal. The Goal remains an outcome (not a solution), and hypotheses remain labeled as open rather than promoted to requirements.

### The confirmation gate (a single authoritative rule)

5. There is exactly **one** confirmation gate. Owner confirmation is REQUIRED before `intent.md` is committed **unless all three** of the skip conditions in requirements 6–8 hold. When all three hold, confirmation is SKIPPED. All three holding **is the definition** of a "no transformation" mapping — there is no separate, independently checked notion of whether the result "transforms the source in any way."

6. **Skip condition A — the issue body is already canonical.** This is a structural check of the body: it contains a non-empty `## Goal`; every section present is one of the four recognized sections; the sections appear in the prescribed order; and there is no content outside those sections (no preamble prose before the first section, no extra or unrecognized headings). The issue title is separate metadata and does not participate in this check. A body containing only a `## Goal` section satisfies this condition. The check is purely structural — the orchestrator does not judge whether the Goal "sounds like an outcome rather than a solution."

7. **Skip condition B — the issue has no comments.** The issue carries zero comments, counted strictly: any comment at all — from any author, for any reason — fails this condition. Comment author and substance are not assessed. This is evaluated against the GitHub issue, which is the source of truth; comments mirrored elsewhere (e.g. Linear) are not considered.

8. **Skip condition C — the issue body contains no references.** The body contains no external URL and no GitHub cross-reference to another issue or pull request (short form such as `#42`, long form such as `owner/repo#42`, or a full GitHub issue/PR URL). The following do **not** count as references for this condition: @-mentions, embedded images / screenshots / attached assets, and links that point to files in the repository. This condition is evaluated against the body only.

9. When all three skip conditions hold, the orchestrator maps the issue body directly to `intent.md` (the body's sections, plus the standard H1 title and source attribution), performs no synthesis, skips confirmation, and commits. Incidental, format-level differences — the title becoming the H1, the added source attribution, whitespace, a trailing newline — do not constitute a transformation and do not require confirmation.

10. When **any** of the three skip conditions fails, the orchestrator MUST synthesize the intent per requirements 1–4 and MUST obtain the owner's confirmation before committing. There is no escape hatch for a synthesized result that happens to resemble the original body: a failing condition means the orchestrator had to look beyond the bare body and exercise judgment, and that judgment is what the owner verifies.

### The confirmation interaction

11. At confirmation, the orchestrator MUST present the owner with the **full proposed `intent.md`** as the primary thing to review (not merely a diff or a list of changes). A short "what changed" summary MAY be offered in addition, but it does not replace showing the full proposed artifact.

12. Confirmation MUST be an iterate-until-approved exchange, not a single yes/no. The owner may approve the proposal or request corrections; on a correction request, the orchestrator revises the proposed `intent.md` and shows it again. The commit happens only on the owner's explicit approval.

13. Confirmation MUST NOT create any additional persisted artifact (no approval or review file). It is a transient gate on the single commit of `intent.md`. The condition for phase 0 being complete is unchanged: `0-intent/intent.md` committed, and nothing more.

### Scope of the change relative to existing behavior

14. The new behavior (evaluating the skip conditions and, when they fail, synthesizing and confirming) belongs to the phase-0 intent-generation step of the pipeline-creation flow, occurring before the existing commit. The existing handling of screenshots and other issue assets — downloading them into the phase-0 folder and referencing them by relative path so the artifact is self-contained — MUST be preserved unchanged and applies on both the skip path and the synthesis path.

15. Only the fresh-creation-from-an-issue path gains this behavior. Forking a pipeline (which inherits the parent's `0-intent` folder by copy rather than re-deriving it from the issue), resuming an existing pipeline (which never re-runs phase 0), the issue-authoring flow, and downstream phases 1–5 all keep their current behavior. Because phase 0 always runs with the owner present and completes before any autonomous run begins, the confirmation needs no special handling for the autonomous "no questions" rule.

## Out of Scope

1. **No modification of the source issue.** The flow reads the issue — body, comments, and references — but never writes back to it. The canonical, synthesized intent is recorded only in `intent.md`; the originating issue is left exactly as it was. Writing a synthesized "upgrade" back into the issue body would be a separate, consent-bearing change and is not part of this feature.

2. **No persisted approval or review artifact.** Confirmation is a transient interactive gate; the only file the creation flow produces for phase 0 is `intent.md`. The phase-0 completion condition is unchanged.

3. **No change to forking.** A forked pipeline inherits its `0-intent` from its parent by copy; the intent is not re-synthesized at fork time.

4. **No change to the issue-authoring flow.** The flow that creates or edits an issue already produces canonical issues; this feature does not alter how issues are written.

5. **No change to phases 1–5.** They consume `intent.md` as a self-contained input; their contract is unchanged.

6. **No semantic quality gate on "already canonical."** The canonical check is purely structural. The orchestrator does not assess whether a well-formed Goal genuinely reads as an outcome versus a solution when deciding whether to skip.

7. **No author/automation filtering of comments.** Any comment at all defeats the skip; comments are not categorized as human vs. bot, relevant vs. irrelevant.

8. **No recursive reference-following.** Only references that appear directly in the issue body or its comments are read. References discovered inside those fetched sources are not transitively followed.

9. **No mitigation for divergent intent across independently created (non-fork) pipelines.** Two pipelines created from the same issue at different times — through fresh creation rather than forking — may synthesize slightly different `intent.md` files. This is an accepted, pre-existing, and structurally rare limitation (the supported way to make a second pipeline for an issue is forking, which copies the intent verbatim). It is not addressed here.

## Acceptance Criteria

Given an issue whose body is already in the canonical format (a non-empty Goal, only recognized sections in the prescribed order, nothing outside them), with zero comments and no references in its body:
- **When** a pipeline is created from it, **then** `intent.md` is written with the issue's body sections preserved plus the standard title-as-H1 and source attribution, the owner is **not** asked to confirm, and the artifact is committed.

Given an issue whose body is canonical and has no references, but which carries at least one comment (from any author, of any kind):
- **When** a pipeline is created from it, **then** the orchestrator synthesizes the intent taking the comment into account, presents the full proposed `intent.md` to the owner, and commits only after the owner explicitly approves.

Given an issue whose body is canonical and has no comments, but whose body contains an external URL or a GitHub cross-reference (e.g. `#42` or `owner/repo#42`):
- **When** a pipeline is created from it, **then** the orchestrator reads the referenced content, synthesizes the intent, presents the full proposed `intent.md`, and commits only after explicit owner approval.

Given an issue whose body is **not** canonical (e.g. free-form prose with no headings, or extra/unrecognized headings, or content before the first recognized section), with no comments and no references:
- **When** a pipeline is created from it, **then** the orchestrator restructures the content into the canonical Goal / Constraints / Context / Assumptions format, presents the full proposed `intent.md`, and commits only after explicit owner approval.

Given an issue whose body contains only a `## Goal` section (and nothing else), with no comments and no references:
- **When** a pipeline is created from it, **then** the body is treated as already canonical, no confirmation is requested, and `intent.md` is committed with that single Goal section.

Given an issue body that contains only an @-mention, an embedded screenshot/asset, and/or a link to a file in the repository — and no external URL and no issue/PR cross-reference — and the body is canonical with no comments:
- **When** a pipeline is created from it, **then** these items do not count as references, all three skip conditions hold, confirmation is skipped, and `intent.md` is committed (with any screenshots/assets still downloaded into the phase-0 folder and referenced by relative path).

Given any issue for which synthesis is required (any skip condition failed):
- **When** the orchestrator presents the proposed `intent.md` and the owner requests a correction, **then** the orchestrator revises the proposal and shows the full updated `intent.md` again, repeating until the owner explicitly approves, and only then commits.

Given a synthesized intent whose final text happens to closely resemble the original issue body:
- **When** a pipeline is created from an issue that failed at least one skip condition, **then** confirmation is still requested before committing — the resemblance does not bypass the gate.

Given any pipeline created through this flow (skip path or synthesis path):
- **When** phase 0 completes, **then** the only artifact committed for phase 0 is `intent.md` (plus any downloaded assets) — no approval or review file is created — and the source issue is left unmodified.

Given the synthesis path is exercised:
- **When** the orchestrator writes the proposed `intent.md`, **then** it adds no requirements, technical direction, design, or implementation details beyond what the source contained, keeps the Goal stated as an outcome, and records any hypothesis or proposed approach under Assumptions labeled as open.

Given a request to create a pipeline by forking an existing one, or to resume an existing pipeline:
- **When** that path runs, **then** phase 0 is not re-derived from the issue and neither the skip-condition evaluation nor the confirmation gate is invoked (the inherited or existing `intent.md` is used as-is).
