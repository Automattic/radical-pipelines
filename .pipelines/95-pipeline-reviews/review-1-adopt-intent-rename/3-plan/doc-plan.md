# Doc Plan: Adopt the prompt → intent rename in the reviews feature

## Overview

This is a documentation-only review of a documentation-only change. In this repo the docs **are** the
product (the shipped skill, agent profiles, README, and website), so the rename's documentation
surface is already enumerated as concrete edits in the code plan's 14 tasks — there is no separate
"now document the code" deliverable. This doc plan therefore does **not** restate those edits. It
records the small amount of documentation work the review still needs that lives *outside* the code
plan's shipped-file edits — the changelog entry and the documentation-completeness verification — and,
just as important, the documentation surfaces this review deliberately does **not** touch.

The governing constraint is the same as the rest of the review: only the **phase-0 sense** of "prompt"
(the input artifact a run starts from) is renamed to "intent"; the **generic sense** (LLM / launch /
spawn / loop prompts, the `cc-prompt` CSS class, SEO copy, the live `.rp.md` Linear state) is left
verbatim (spec "Terminology"; design doc "Approach").

## What documentation work this review needs (and what it does not)

### 1. Changelog entry — no new changeset; the existing one stays as-is

- **What:** The reviews feature already ships a changeset, `.changeset/pipeline-reviews.md`, describing
  the feature for the release changelog. This review adds **no** new changeset and **edits** the
  existing one **in no way**.
- **Why:** The existing changeset describes the *reviews feature mechanics* (the `base/` run, the
  sibling `review-N-<short-description>/` runs, phase folders moving under a run folder). It contains
  **zero** phase-0 "prompt" terminology, so the rename does not make it stale (verified: a grep for
  `prompt` over `.changeset/pipeline-reviews.md` returns no matches). The spec lists it in **Out of
  Scope** ("`.changeset/pipeline-reviews.md` — no phase-0 'prompt' term") and acceptance criterion 8
  requires it to be **unchanged** by this review.
- **Not a second changeset for the rename either.** Trunk's #109 carried its own changeset
  (`.changeset/rename-prompt-to-intent.md`: "Rename the phase-0 pipeline artifact, folder, and phase
  label from 'prompt' to 'intent'."). This review does **not** add a parallel rename changeset on the
  branch: the user-facing changelog effect of the rename is already owned by #109's changeset on
  trunk, and this review's job is only to make the *branch* consistent so the eventual human merge
  re-introduces no divergence — not to re-announce trunk's already-released rename. Adding one here
  would double-announce the same rename in the merged changelog.
- **Where:** `.changeset/pipeline-reviews.md` (left untouched).
- **Who:** code-writer (as a no-op — the verification in item 2 confirms it stayed unchanged); no
  separate doc-writer action.

### 2. Documentation-completeness verification — the grep acceptance suite is the doc gate

- **What:** Confirm that **no** documentation surface — internal reference docs, agent profiles,
  README, or the external website — still presents the phase-0 artifact as "prompt", while every
  deliberately-preserved generic "prompt" and every out-of-scope file remains exactly as it was. This
  is the documentation phase's gate; it is the same grep-based acceptance suite the code plan runs in
  its Task 14, re-read here as a **documentation** check rather than a code check.
- **Why:** Because the docs are the product, "is the documentation complete and consistent?" and "did
  the rename land correctly?" are the *same* question, answered by the same greps. The doc phase does
  not need a separate verification mechanism; it needs to confirm the code plan's acceptance suite
  passed and that it genuinely covers the whole documentation surface (it does — see "Coverage" below).
- **Where:** the shipped documentation surface — `skills/`, `agents/`, `README.md`, `website/` — plus
  the out-of-scope guardrail files.
- **Who:** code-writer runs the suite (code-plan Task 14); the doc-reviewer independently re-runs the
  documentation-facing checks below as the phase gate.
- **Checks (documentation-facing subset of code-plan acceptance criteria 1–8):**
  - **No stale phase-0 "prompt" anywhere in shipped docs.** `grep -rnE '0-prompt|prompt\.md'
    skills/ agents/ README.md website/` → zero; and the prose/label forms `grep -rniE 'Phase 0\. Prompt|\(Prompt →|\| 0 +\| Prompt|0 - Prompt|phase 0 \(prompt\)|base prompt|review prompt|review.s prompt|the raw prompt' skills/ agents/ README.md website/`
    → zero; plus `grep -rn 'in the prompt' skills/ agents/ README.md website/` → zero (the
    `intent-format.md:21` authoring-discipline bullet now reads "in the intent").
  - **Every remaining "prompt" in shipped docs is generic-sense.** Inspect `grep -rniE 'prompt' skills/ agents/ README.md website/`
    and confirm each hit is one of: `cc-prompt`, `/loop <prompt>` / loop / self-contained prompt,
    launch / spawn / initial prompt (`autonomous-workflow.md:61`), "prompt engineering"
    (`index.html:12`), "Same prompt" (`index.html:153`), or `code-writer.md:62` "read the prompt".
  - **The shared format file is renamed and re-pointed (the cross-reference graph is intact).**
    `prompt-format.md` no longer exists; `intent-format.md` exists; `grep -rln 'prompt-format' skills/ agents/ README.md website/`
    → zero; `grep -rln 'intent-format' skills/` → exactly `create-pipeline.md`, `manage-issues.md`,
    `review-pipeline.md`; and `grep -nE 'prompt' .../intent-format.md` → zero. A dangling
    documentation cross-reference is the one failure mode unique to renaming a referenced doc.
  - **The four non-mechanical wordings read as trunk specifies** (documentation accuracy, not a token
    swap): SKILL.md phase-0 row `| 0 | Intent | 0-intent | The input |`; `README.md:112` "phase 0 is
    the **intent**" with **"raw" dropped**, while `website/demo.js:281` independently keeps "raw"
    ("Phase 0 is the raw intent"); `create-pipeline.md`'s adapt bullet uses "into the intent that
    seeds the subsequent phases" **and** keeps the `intent-format.md` pointer; `manage-issues.md:14`
    keeps the extracted-`intent-format.md` reference and the `base/0-intent/intent.md` path (schema
    not re-inlined).

### 3. Out-of-scope documentation surfaces — explicitly NOT touched

These were checked and confirmed to need no documentation change; recording them prevents a later
reviewer from "fixing" them:

- **`AGENTS.md`, `CONTRIBUTING.md`** (repo-root contributor docs): verified to carry **no** "prompt",
  "intent", or phase-0 token at all, and #109 left both untouched. They are not part of the rename
  surface and stay exactly as-is. (These two are not named in the code plan precisely because they
  have nothing to rename — this doc plan records that they were checked, so the absence is intentional,
  not an oversight.)
- **`.changeset/pipeline-reviews.md`** — unchanged (item 1).
- **`.rp.md`** — left entirely untouched: its `0 - Prompt` reference (line 35) names a **live external
  Linear workflow state**, and the example commit `Add prompt (orchestrator)` (line 54) is generic;
  renaming either would be a behavior change, not a doc edit (spec Out of Scope; #109 left `.rp.md`
  untouched for the same reason).
- **All frozen `base/` and `.pipelines/` run artifacts** (this review's own prior-run records and any
  historical run records) — historical record, never rewritten (spec Out of Scope; precedent: #109
  rewrote zero `.pipelines/` artifacts).
- **Generic-only documentation** — `conventions/load.md`, `conventions/claude-code.md`,
  `conventions/pi.md`, `health-monitoring.md`, the #106-only no-phase-0-token reference docs
  (`autonomous-phases/4 - code.md`, `5 - docs.md`, `resume-pipeline.md`, `work-on-an-issue.md`), and
  the 6 reviewer agent profiles — left verbatim (spec Out of Scope; code-plan guardrails).

## Coverage: the code plan's 14 tasks already span the whole documentation surface

Every shipped documentation artifact that carries a phase-0 "prompt" token is covered by a code-plan
task, so there is no documentation edit left over for a separate doc-writer pass:

| Documentation surface | Covered by code-plan task |
| --- | --- |
| Shared format reference doc (`prompt-format.md` → `intent-format.md`, body + retitle) | Task 1 |
| Skill manifest (`SKILL.md` description + phase table) | Task 2 |
| Agent profiles (`spec-analyst/-consolidator/-reviewer/-writer`) | Task 3 |
| Issue-authoring reference (`manage-issues.md`) | Task 4 |
| Versioning reference (`pipeline-versioning.md`) | Task 5 |
| Phase reference docs (assisted 1/2/3, autonomous 1) | Task 6 |
| Workflow reference docs (assisted / autonomous) | Task 7 |
| Setup convention (`conventions/setup.md`) | Task 8 |
| Pipeline-creation reference (`create-pipeline.md`) | Task 9 |
| Fork reference (`fork-pipeline.md`) | Task 10 |
| Review reference (`review-pipeline.md`) | Task 11 |
| README (the product's front-page docs) | Task 12 |
| Website (`index.html`, `demo.js`) — external docs | Task 13 |
| Doc-completeness verification (the grep suite as the doc gate) | Task 14 |

The only documentation work *not* in that table is the two no-op confirmations above: the changeset
stays as-is (item 1), and `AGENTS.md` / `CONTRIBUTING.md` need nothing (item 3). Both are verified by
the code-plan Task 14 "out-of-scope files unchanged" check (`git status --porcelain` lists only the
Tasks 1–13 files).

## Who does what

- **code-writer** (code phase): performs all shipped-doc edits (code-plan Tasks 1–13) and runs the
  grep acceptance suite (Task 14), which doubles as the documentation-completeness check. Confirms the
  changeset and the contributor docs stayed unchanged.
- **doc-writer** (docs phase): **no new documentation to author.** The shipped docs are the product
  and were edited in the code phase; the changelog entry already exists and is correct. The doc-writer
  has nothing to add here beyond confirming this.
- **doc-reviewer** (docs phase gate): independently re-runs the documentation-facing verification in
  item 2 (no stale phase-0 "prompt" in any doc surface, every residual "prompt" is generic, the
  format-file cross-reference graph is intact and re-pointed, the four non-mechanical wordings read as
  specified) and confirms the out-of-scope documentation surfaces are unchanged.
