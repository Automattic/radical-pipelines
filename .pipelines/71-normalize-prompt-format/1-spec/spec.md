# Spec: Normalize issue content into the standard prompt format when creating a pipeline

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline"

## Overview

This is a change to the Radical Pipelines orchestrator skill itself — specifically the pipeline-creation flow that turns an issue into the phase-0 `prompt.md` artifact. That flow is reachable when the owner starts work on an issue and no pipeline yet exists for it, at which point the orchestrator creates the worktree, writes `prompt.md`, and commits. Today that flow simply "adapts the issue content" into a prompt: it reads the issue body, does not guarantee a single canonical structure for `prompt.md`, does not read the issue's comments or follow its links, and writes the file without an explicit owner-confirmation step. As a result, the shape of `prompt.md` varies with the shape of the originating issue, and free-form third-party issues produce a different starting point than issues already written in this project's format.

This feature makes the pipeline-creation flow always produce `prompt.md` in the project's one canonical format — **Title + Goal / Constraints / Context / Assumptions** — regardless of the issue's original shape. The flow reads the full picture (the issue body, all of its comments, and references cited directly in them), synthesizes that material into the canonical format without converging on requirements or design, and shows the owner the full rendered prompt for confirmation before anything is committed. The outcome: every downstream phase starts from the same canonical input, whether the originating issue was written in this project's format or as a free-form third-party discussion.

The canonical format already exists and is defined in exactly one place in the skill (`skills/radical-pipelines/reference/manage-issues.md`, "The issue format"), which states that the issue body *is* the phase-0 prompt. This work reuses that single definition rather than introducing a competing one, and pins down the parts of "the canonical format" that are currently established only by example so that "always written in the canonical format" becomes checkable.

Throughout this spec, **the flow** means the pipeline-creation flow that produces `0-prompt/prompt.md`; **the synthesis** means the act of reorganizing the gathered issue material into the canonical format; **the owner** is the person the orchestrator drives the confirmation Q&A with.

## Requirements

### Canonical format

1. **Single canonical format, single source of truth.** `prompt.md` is written in one canonical format. The format's section taxonomy is defined in exactly one place in the skill (today: `manage-issues.md`, "The issue format"). The creation flow does not define or maintain a competing format definition.

2. **The format is Title + Goal / Constraints / Context / Assumptions, with empty sections omitted.** The canonical body sections, in order, are:
   - **Goal** — always present; stated as a desired *outcome*, not a solution.
   - **Constraints** *(optional)* — binding must/must-not the owner owns.
   - **Context** *(optional)* — links, prior decisions, motivation only the owner holds.
   - **Assumptions / directions to explore** *(optional)* — the owner's (or participants') hypotheses and proposed directions, labeled open.

   The Title maps to the issue's title. Optional sections with no content are omitted entirely — no `N/A` placeholders and no empty headings. A minimal valid prompt is Title + Goal alone.

3. **The format is referenced, not duplicated.** The creation flow cites the single canonical-format definition rather than restating the section list, so the creation flow and the definition cannot drift apart.

4. **The prompt-file rendering is documented.** The literal shape of `prompt.md` as a file — currently established only by example — is written down so that "always written in the canonical format" is checkable. The documented rendering covers: a top heading identifying the file as the prompt, a source-attribution line pointing to the originating issue, a note that the file is self-contained (downstream agents do not need to open the issue), and then the canonical body sections from requirement 2. (The exact heading text and wording are a design-phase decision; the requirement is that the rendering is specified rather than left to example, and that produced files match it.)

### Synthesis inputs

5. **The synthesis reads the issue body and all of its comments.** The flow reads the full issue conversation — the body plus every comment, each comment attributed to its author — not the body alone. The "participants' conversation" is satisfied by reading all comments; it is not a separate input beyond the body and comments.

6. **Directly-cited references are fetched and read (one hop, best-effort).** References cited directly in the issue body or in any comment are fetched and read to inform the synthesis (GitHub-internal links via the project's tracker access mechanism; other URLs via web fetch). Following stops at one hop: references found *inside* those fetched references are not recursively crawled — that transitive and deep research belongs to later phases. Reference-following is best-effort: an unreachable or gated reference does not block pipeline creation; the flow proceeds on what is accessible.

### Synthesis behavior (normalize, don't converge)

7. **The synthesis normalizes; it does not converge.** The flow reorganizes the gathered material (body, comments, one-hop references) into the canonical sections while preserving the participants' stated intent in substance. It files hypotheses, proposed directions, and beliefs about cause or current state under **Assumptions / directions to explore**, labeled open. It adds no requirements, acceptance criteria, technical directions, design, or implementation detail beyond what the source already held — those belong to later phases. The synthesis never silently substitutes a different goal for the one the source expresses.

8. **Conflicts and revisions are surfaced, never silently resolved.** When the body and comments conflict, or when a later comment appears to revise the original ask, the synthesis does not silently pick one reading or drop content. It reflects its best current reading and surfaces the conflict or evolution to the owner at the confirmation step, so the owner decides.

### Owner confirmation

9. **Owner confirmation is required before commit, always, regardless of mode.** The synthesized `prompt.md` is never written or committed silently. The owner must confirm it first. This holds for every run, including runs that will subsequently proceed in autonomous mode — pipeline creation (and thus synthesis and confirmation) happens before the owner picks the workflow mode and before any autonomous run starts, so the confirmation does not conflict with the autonomous workflow's "no further questions once the run starts" rule. There is no pass-through exemption for issues already written in the canonical format: synthesize → confirm → write runs every time, even when the synthesis is a near-identity reformat.

10. **The owner is shown the full rendered prompt.** Confirmation presents the actual rendered `prompt.md` text — the exact content that will be written — not a summary of it.

11. **There is an explicit revise-and-re-confirm loop.** If the owner requests changes, the flow revises the prompt and shows it again for approval. Nothing is committed until the owner approves; the loop repeats until then.

### Preserved behaviors (no regression)

12. **Assets and self-containment are preserved and extended to the new inputs.** The flow still downloads the issue's screenshots and other assets into the phase-0 folder and references them with relative paths. The phase-0 folder remains self-contained: once committed, downstream agents need not reach back to the issue source to understand the issue. Because comments and one-hop references are now inputs, self-containment extends to them — whatever an agent needs to understand the issue from the body, the comments, and the directly-cited references must be captured into `prompt.md` (and assets into the phase-0 folder).

## Out of Scope

- **No phase-0 approval file.** Owner confirmation is transient (a gate before the write). This work does not introduce a committed phase-0 approval artifact. (The assisted workflow's persisted `-review-approved.md` file is assisted-only and does not apply to phase 0.)
- **No transitive or deep external research at phase 0.** Reference-following is one hop only. Deep web and codebase research is the job of the later research agents (spec and design-doc phases), not pipeline creation.
- **No PR review-thread ingestion.** Pipelines are created from issues. Issue review/inline threads do not exist, and following the issue's closing-PR cross-reference is out of scope; only the issue body and its comments (plus one-hop cited references) are inputs.
- **No requirements, acceptance criteria, design, architecture, or task breakdown in `prompt.md`.** Those are produced by later phases; the synthesis must not pre-empt them.
- **No goal substitution.** The synthesis must preserve the source's intent and may not silently replace the goal.
- **No new prompt format.** The canonical section taxonomy is the existing one; this work does not invent new sections or a second format definition. The only new written-down piece is the prompt-file rendering convention (requirement 4), which pins existing by-example behavior.

## Acceptance Criteria

### Canonical format

- **AC1 — Single source of truth.** Given the skill after this change, when the prompt/issue section taxonomy is located, then it is defined in exactly one place and the creation flow does not contain a second, independent definition of it.

- **AC2 — Canonical sections with omit-empty.** Given an issue that produces a pipeline, when `prompt.md` is written, then it contains a `## Goal` section stated as an outcome and only those of `## Constraints` / `## Context` / `## Assumptions / directions to explore` that have content; no placeholder or empty sections appear.

- **AC3 — Minimal issue yields minimal prompt.** Given an issue that conveys only a goal (no constraints, context, or assumptions), when `prompt.md` is written, then it contains the Title and `## Goal` and no other body sections, and is still a complete, valid prompt.

- **AC4 — Format referenced, not duplicated.** Given the creation flow's reference, when it is read, then it points to the canonical-format definition rather than re-enumerating the full section list.

- **AC5 — Rendering documented and matched.** Given the skill after this change, when the prompt-file rendering is located, then a reference documents the wrapper (top heading + source attribution + self-contained note + canonical body sections); and given a produced `prompt.md`, when it is inspected, then it matches that documented rendering.

### Synthesis inputs

- **AC6 — Body and all comments are read.** Given an issue with a body and one or more comments, when the flow synthesizes `prompt.md`, then the synthesis incorporates content from the comments (not the body alone), and content present only in a comment is not dropped.

- **AC7 — One-hop references are fetched and used.** Given an issue whose body or a comment cites a reference (a GitHub link or an external URL), when the flow synthesizes `prompt.md`, then that directly-cited reference is fetched and used to inform the synthesis, while references found only inside that fetched reference are not crawled.

- **AC8 — Inaccessible reference does not block creation.** Given an issue that cites a reference which is unreachable or gated, when the flow runs, then pipeline creation still proceeds (the inaccessible reference is noted rather than fetched), and `prompt.md` is produced from the accessible material.

### Synthesis behavior

- **AC9 — Normalize, not converge.** Given a free-form third-party issue, when `prompt.md` is written, then it reflects the source's intent without goal substitution, files proposed directions and beliefs under **Assumptions / directions to explore** (labeled open) rather than as requirements, and contains no requirements, acceptance criteria, design, or implementation detail beyond what the source held.

- **AC10 — Conflicts surfaced.** Given an issue whose comments revise or contradict the body, when the synthesized draft is shown for confirmation, then it surfaces the conflict or revision to the owner rather than silently dropping or substituting content.

### Owner confirmation

- **AC11 — Commit gated on confirmation, always.** Given any issue (including one already written in the canonical format), when the flow produces `prompt.md`, then it is committed only after the owner explicitly confirms it; it is never written silently, and no per-run mode (autonomous or assisted) skips the confirmation.

- **AC12 — Full rendered prompt shown.** Given the confirmation step, when the orchestrator presents the prompt for approval, then it shows the complete rendered `prompt.md` content in the canonical format, not a summary.

- **AC13 — Revise-and-re-confirm.** Given the owner requests changes at confirmation, when the flow responds, then it produces a revised draft and shows it again for approval, committing only once the owner approves.

- **AC14 — No phase-0 approval file.** Given a pipeline created through this flow, when the phase-0 folder is inspected after commit, then it contains `prompt.md` (and any downloaded assets) but no committed approval-record artifact for phase 0.

### Preserved behaviors

- **AC15 — Assets and self-containment.** Given an issue (or a comment) that includes screenshots or other assets, when the pipeline is created, then those assets appear in the phase-0 folder and are referenced from `prompt.md` by relative path; and given the committed `prompt.md` plus those assets, when a downstream agent reads them, then they are sufficient to understand the issue without opening the issue, its comments, or its links.
