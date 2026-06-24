# Code Plan: Rename "review runs" to "revisions"

## Overview

The Radical Pipelines skill currently calls the runs that follow a pipeline's `base` run "reviews" (`review-1`, `review-2`, …), overloading "review" — which also names the unrelated phase-auditing concepts (reviewer agents like `spec-reviewer`/`code-reviewer`, the `*-review-approved.md` / `*-review-N-rejected.md` artifacts, and the phase-audit reviewing prose). This plan executes a scoped, mechanical rename of the follow-up run and the activity that creates it to the noun **revision** and verb **revise**, so that after the change every remaining "review" in `skills/`, `agents/`, and `.rp.md` denotes phase-auditing only. The change is a closed set of **39 line-edits across 8 files**, plus one history-preserving file rename (`git mv review-pipeline.md → revision-pipeline.md`); the phase-auditing meaning of "review" and the 32 generic-English `revise`/`revision` uses are left byte-unchanged. It does not change how pipelines run and does not migrate existing on-disk run folders under `.pipelines/`. The work is ordered as: capture a verification baseline (Task 1); rename each of the 8 files' bucket-A tokens (Tasks 2–9, including the `git mv` in Task 3); then re-run the greps that defined the rename map to prove the bucket boundaries held (Task 10).

This is a markdown / prose change to a skill, which the project rules treat as prose, not software. Structural unit tests asserting the content, sections, wording, or ordering of skill or agent files are disallowed (they merely restate the skill and break on every legitimate edit). Verification is therefore a **re-grep** of the rename patterns, expressed as the E2E flows below and executed as Task 10 — not as committed content-asserting test files. Every task is type `e2e`; its acceptance is checkable by grep/diff without asserting file content beyond the specific tokens the rename pins.

## Guardrail scopes

None.

## E2E test plan

These flows are the verification surface for the change. They are the same greps that defined the rename map, re-run after editing to prove the four buckets held. A reviewer can re-drive every flow by hand. All greps run from the worktree root over `skills/ agents/ .rp.md`. The phrase "in-scope path" means anywhere under `skills/`, `agents/`, or `.rp.md` (never under `.pipelines/`, which is out of scope).

### Flow 1: No run or run-creation concept is still named "review"

- **Steps:**
  1. Run `grep -rni 'review' skills/ agents/ .rp.md`.
  2. Inspect every remaining hit.
- **Expected:** Every remaining `review` hit denotes a phase-auditing concept (reviewer agent name, `*-review-approved.md`, `*-review-N-rejected.md`, phase-audit reviewing prose such as "review-style check"/"review file", `# Spec Review` / `# Code Review` artifact headings, or generic owner-review-of-artifacts such as "a PR review"). No remaining hit names the follow-up run, the act of creating it, the command document, the route, the intent, the dispatch label, or the base-ref heading. A targeted regex for prose run-creation tokens — `grep -rniE 'review run|review intent|new review|review-[0-9]+-<short' skills/ agents/ .rp.md` — returns zero hits.
- **Traces to:** Acceptance criterion "none of them is named review"; Acceptance criterion on the collision (`revision-2` vs `spec-review-2-rejected.md`); Edge case "Missed rename".

### Flow 2: Every new "revision"/"revise" token lands only on a run or run-creation concept

- **Steps:**
  1. Run `grep -rni 'revision' skills/ agents/ .rp.md` and `grep -rni 'revise' skills/ agents/ .rp.md`.
  2. Inspect every new `revision`/`revise` hit (those not present in the pre-change generic-`revis` baseline from Task 1).
- **Expected:** Every newly introduced `revision`/`revise` token names the run, the act of creating it, the command document, the route, the intent, the dispatch label, or the base-ref heading. None lands on a phase-auditing concept. No bare "revision" is used for the run in run-creation prose — the run always reads "revision run" or `revision-N`. The 32-line generic `revis` baseline is unchanged.
- **Traces to:** Acceptance criteria on revision naming; Acceptance criterion "appears as 'revision run' or `revision-N`, never as a bare 'revision'"; Edge case "Collateral rename"; Edge case "Generic-revis reverse collision".

### Flow 3: The command document is renamed, retitled, and still reachable

- **Steps:**
  1. Run `grep -rn 'review-pipeline' skills/ agents/ .rp.md`.
  2. Confirm `skills/radical-pipelines/reference/revision-pipeline.md` exists and `skills/radical-pipelines/reference/review-pipeline.md` does not.
  3. Read the renamed file's H1 title and the dispatcher reference in `work-on-an-issue.md`.
- **Expected:** Zero in-scope `review-pipeline` references remain (every prior pointer now reads `revision-pipeline.md`). The file exists at the new path with git history preserved. Its H1 title reads "Revising a Pipeline". `work-on-an-issue.md` reaches it via `**Revise** read `revision-pipeline.md``, and the in-file direct route reads `"revise this pipeline"`.
- **Traces to:** Acceptance criterion "title is 'Revising a Pipeline', and every reference … resolves to it"; Acceptance criterion "says 'revise this pipeline'"; Edge case "Dangling reference (filename)".

### Flow 4: The base-ref heading is renamed and no inbound reference dangles

- **Steps:**
  1. Run `grep -rn 'Reviewer base ref' skills/ agents/ .rp.md`.
  2. Run `grep -rn 'Revision base ref' skills/ agents/ .rp.md`.
- **Expected:** `Reviewer base ref` returns zero hits. `Revision base ref` returns exactly 5 hits — 1 definition (`pipeline-versioning.md`) plus 4 inbound references (`autonomous-workflow.md`, `revision-pipeline.md`, `autonomous-phases/4 - code.md`, `autonomous-phases/5 - docs.md`). The "Base run" term in `pipeline-versioning.md` is unchanged.
- **Traces to:** Acceptance criterion "'Revision base ref' and 'Revision run' … 'Base run' is unchanged, and every reference … resolves to the renamed heading — none is left dangling"; Edge case "Easily-missed base-ref reference"; Edge case "Precision-surgery lines".

### Flow 5: Phase-audit "review" is preserved byte-for-byte

- **Steps:**
  1. Diff the bucket-B keep files against their pre-change state (`git diff` over `agents/`, `SKILL.md`, the per-phase files, and the completion-table rows in `pipeline-versioning.md`).
  2. Confirm the 6 reviewer agent names, `*-review-approved.md`, and `*-review-N-rejected.md` are unchanged.
- **Expected:** The only changes anywhere in the keep set are the base-ref heading substring on the three base-ref inbound files: the whole line on `autonomous-workflow.md:39`, and the `**Reviewer base ref**` → `**Revision base ref**` substring only on `autonomous-phases/4 - code.md:37` and `autonomous-phases/5 - docs.md:37`. On those two per-phase lines the phase-audit tokens (`code-reviewer`/`docs-reviewer`, `code-review-N-rejected.md`/`docs-review-N-rejected.md`, `code-review-approved.md`/`docs-review-approved.md`) remain byte-unchanged. No reviewer agent profile under `agents/` is touched. The generic owner-review-of-artifacts "a PR review" in the renamed command file is unchanged.
- **Traces to:** Acceptance criterion "phase-auditing 'review' terms … are unchanged"; Edge cases "Precision-surgery lines", "Same-line mixed tokens", "No new revise/revision term on a phase-auditing concept".

### Flow 6: Run-folder naming convention and globs flip to revision-only

- **Steps:**
  1. Read the **Runs within a pipeline** section and the latest-run / next-number rules in `pipeline-versioning.md`.
- **Expected:** A follow-up run is named `revision-N-<short-description>` (e.g. `revision-1-…`, `revision-2-…`); `base` is unchanged. The next-number rule reads "the next integer after the existing `revision-*` folders" and the latest-run rule reads "the highest-numbered `revision-N` run, or `base` if there are no revisions". The `<short-description>` kebab-case pipeline-slug formatting rule and the `N` monotonic-counter rule are unchanged in substance. No `review-*` / `review-N` run-folder glob remains, and no dual-recognition (`review-* OR revision-*`) glob is added.
- **Traces to:** Acceptance criteria on run naming and next-number determination; Edge case "Two run-folder globs flip to `revision-*` only — no dual-recognition".

## Tasks

### Task 1: Capture the verification baseline

- **Goal:** Record the pre-change grep counts and the generic-`revis` baseline so later tasks and the final re-grep can prove the bucket boundaries held.
- **Type:** e2e
- **Files to change:** None (read-only capture; no edits committed in this task).
- **Changes:** Run and record, from the worktree root over `skills/ agents/ .rp.md`: `grep -rni 'review' | wc -l` (expect 252), `grep -rni 'revis' | wc -l` (expect 32), `grep -rni 'review' agents/ | wc -l` (expect 105, all phase-audit), `grep -rn 'Reviewer base ref'` (expect 1 definition + 4 inbound = 5 hits), `grep -rn 'review-pipeline'` (expect 1 in-scope hit at `work-on-an-issue.md`), and capture the full `grep -rni 'revis'` line set as the generic baseline that must remain unchanged.
- **Depends on:** none
- **Traces to:** Design "Failure Modes and Observability" (re-grep approach); Acceptance criteria invariants.
- **Acceptance:**
  - The recorded baseline shows 252 `review` lines and 32 `revis` lines across `skills/ agents/ .rp.md`.
  - `agents/` shows 105 `review` hits and all are phase-audit (reviewer agent names / rejection-iteration / approval artifacts), confirming no agent profile is in the rename surface.
  - `Reviewer base ref` resolves to exactly 5 sites (1 definition + 4 inbound); `review-pipeline` resolves to exactly 1 in-scope reference.
  - The 32 generic `revis` lines are captured verbatim for later comparison.

### Task 2: Rename run-creation tokens in `pipeline-versioning.md`

- **Goal:** Rename the 9 bucket-A run-creation tokens in the run-folder-convention file to "revision"/"revise" while leaving its phase-audit and generic-`revis` lines byte-unchanged.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Changes:** Edit exactly these 9 lines, re-reading each rewritten sentence for natural English (swap tokens, then make the sentence read naturally):
  - `:15` — run-name examples `review-1-<short-description>`, `review-2-…` → `revision-1-<short-description>`, `revision-2-…`.
  - `:17` — "rewritten by a review; a review only ADDS … the review's goal … `review-N-…` … existing `review-*` folders": replace every run-creation "review" with "revision"; keep the `N` monotonic-counter rule and the kebab-case `<short-description>` rule unchanged in substance; the next-number glob becomes "existing `revision-*` folders".
  - `:19` — "every review of a pipeline … Reviews are added one at a time" → "every revision of a pipeline … Revisions are added one at a time".
  - `:21` — heading `### Reviewer base ref` → `### Revision base ref` (definition site).
  - `:25` — `**Review run**` → `**Revision run**`; `review-(N-1)` → `revision-(N-1)`; "the review run begins … the review's intent … the review run's first commit" → "the revision run begins … the revision's intent … the revision run's first commit"; the `**Base run**` term on the next bullet is unchanged.
  - `:53` — "highest-numbered `review-N` run … if there are no reviews" → "highest-numbered `revision-N` run … if there are no revisions".
  - `:55` — "a new review may start … a review is in flight … a review run has only … that review's phase 1" → "revision" throughout (run sense, qualified).
  - `:65` — "reviews are not part of the cross-pipeline tree" → "revisions are not part of the cross-pipeline tree".
  - `:117` — chain `base → review-1-<short-description> → review-2-…` → `base → revision-1-<short-description> → revision-2-…`.
  - Leave unchanged (keep): `:28` "code/docs reviewer invocation" (phase-audit); `:45-49` completion-table `*-review-approved.md` rows (phase-audit); `:112` "v4 … revised the spec … revised the **intent**" (generic edit, bucket D).
- **Depends on:** Task 1
- **Traces to:** Spec requirements 1, 2, 3, 5, 9; Acceptance criteria on run naming, next-number, "Revision run"/"Revision base ref"/"Base run unchanged"; Design "Authoritative rename map" (`pipeline-versioning.md`).
- **Acceptance:**
  - The **Runs within a pipeline** section names follow-up runs `revision-N-<short-description>` and `base` is unchanged.
  - The next-number rule reads "existing `revision-*` folders" and the latest-run rule reads "highest-numbered `revision-N` run, or `base` if there are no revisions"; no `review-*`/`review-N` run-folder glob remains in the file.
  - The base-ref heading reads `### Revision base ref`, the convention term reads `**Revision run**`, and `**Base run**` is unchanged.
  - The run is written as "revision run" or `revision-N`, never as a bare "revision".
  - `:112` ("revised the spec"/"revised the **intent**"), `:28`, and the `:45-49` `*-review-approved.md` rows are byte-unchanged.

### Task 3: Rename the command file and its in-file tokens (`review-pipeline.md` → `revision-pipeline.md`)

- **Goal:** History-preservingly rename the run-creation command document and rename all 20 of its bucket-A in-file tokens, keeping the one within-line "a PR review" generic use and the inbound base-ref reference correct.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/review-pipeline.md` → `skills/radical-pipelines/reference/revision-pipeline.md`
- **Changes:**
  - Rename the file with `git mv skills/radical-pipelines/reference/review-pipeline.md skills/radical-pipelines/reference/revision-pipeline.md` (preserves history).
  - In the renamed file, edit the bucket-A tokens, re-reading multi-token sentences for natural English:
    - `:1` title "Reviewing a Pipeline" → "Revising a Pipeline".
    - `:3,7,11,12,14,18,19,21,33,35,37,40,42,50,52,54` — replace run-creation "review"/"reviewing" with "revision"/"revising" (run sense always qualified as "revision run"/`revision-N`, never bare "revision"); section-heading wording (e.g. `:7` "Confirm review preconditions") is an authoring choice as long as "review"→"revision".
    - `:9` — direct route phrase `"review this pipeline"` → `"revise this pipeline"`.
    - `:18` — "**Fork vs. review.**" → "**Fork vs. revision.**" (the word "fork" is kept).
    - `:29` — inbound base-ref reference `**Reviewer base ref**` → `**Revision base ref**`.
    - `:39` — within-line precision: rename the run-creation tokens ("MANDATORY for reviews", "this review intent") to "revision", but keep "a PR review" verbatim (it names a generic owner-review-of-artifacts source, not a run).
  - Keep elsewhere in the file: "fork", "tracker issue", "health monitor".
- **Depends on:** Task 1
- **Traces to:** Spec requirements 3, 5, 6, 7, 9; Acceptance criteria on the command title, the direct route phrase, and the base-ref reference; Design decisions "Rename the command file with `git mv`" and "Within-line precision — keep 'a PR review'".
- **Acceptance:**
  - `skills/radical-pipelines/reference/revision-pipeline.md` exists with git history preserved; `review-pipeline.md` no longer exists.
  - The H1 title reads "Revising a Pipeline".
  - The direct route phrase reads `"revise this pipeline"`.
  - The inbound base-ref reference on `:29` reads `**Revision base ref**`.
  - "a PR review" on `:39` is unchanged; no in-file run-creation token still reads "review"; no bare "revision" is used for the run.

### Task 4: Update the dispatcher reference and advisory in `work-on-an-issue.md`

- **Goal:** Update the entry-point dispatcher's **Revise** label, the filename reference to the renamed command document, and the same-issue-action advisory.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/work-on-an-issue.md`
- **Changes:**
  - `:36` — "**Review** read `review-pipeline.md`, then continue to step 3." → "**Revise** read `revision-pipeline.md`, then continue to step 3." (dispatch label + filename reference).
  - `:40` — same-issue-action advisory "**Review** — layer an incremental change on a complete run …" → "**Revise** — layer an incremental change on a complete run …".
  - Leave the **Resume**, **Fork**, **Merge**, and **Close** entries unchanged.
- **Depends on:** Task 3 (the new filename `revision-pipeline.md` must exist for the reference to resolve)
- **Traces to:** Spec requirements 6, 8; Acceptance criteria on the command document reachability and the "Revise" dispatch/advisory label; Design "Reachability data flow".
- **Acceptance:**
  - The dispatcher menu reaches the command via `**Revise** read `revision-pipeline.md``.
  - The same-issue-action advisory reads "**Revise**" rather than "**Review**".
  - No `review-pipeline` reference remains in this file.

### Task 5: Rename the intent type in `intent-format.md`

- **Goal:** Name the follow-up-run intent a "revision intent" wherever the file names intent types, keeping the mandatory **Origin** section name.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/intent-format.md`
- **Changes:**
  - `:3` — "whether a tracker issue body, a base intent, or a review intent" → "… or a revision intent".
  - `:33` — "Review intents carry their mandatory **Origin** section as their provenance instead." → "Revision intents carry their mandatory **Origin** section as their provenance instead." (the **Origin** name is kept).
- **Depends on:** Task 1
- **Traces to:** Spec requirement 4; Acceptance criterion "named 'revision intent' and its mandatory **Origin** section keeps its name".
- **Acceptance:**
  - The intent type reads "revision intent" wherever the file names intent types.
  - The mandatory **Origin** section name is unchanged.

### Task 6: Update orchestrator-update prose and the action-list verb in `.rp.md`

- **Goal:** Rename the 3 bucket-A run-creation tokens in the conventions file's orchestrator-update prose, keeping per-phase status labels and the reviewer model-table rows byte-unchanged.
- **Type:** e2e
- **Files to change:** `.rp.md`
- **Changes:**
  - `:35` — "For a review run the status re-cycles from `1 - Spec` through `5 - Docs` … not on a review's intent." → "For a revision run the status re-cycles … not on a revision's intent." The per-phase status labels `0 - Intent`, `1 - Spec`, `2 - Design Doc`, `3 - Plan`, `4 - Code`, `5 - Docs` are unchanged.
  - `:36` — action list "when starting work on a pipeline (creating, resuming, forking, or reviewing)" → "… or revising".
  - `:37` — same action list "(creating, resuming, forking, or reviewing)" → "… or revising".
  - Leave unchanged (keep): `:56` commit example `Add spec (spec-reviewer)`; `:83,87,89,91,93,95` reviewer model-table rows (`spec-reviewer`, `design-doc-reviewer`, `code-plan-reviewer`, `docs-plan-reviewer`, `code-reviewer`, `docs-reviewer`).
- **Depends on:** Task 1
- **Traces to:** Spec requirement 10; Acceptance criterion invariant "no run/run-creation concept is named review"; Design "Authoritative rename map" (`.rp.md`).
- **Acceptance:**
  - The orchestrator-update prose refers to a "revision run" and to a "revision's intent"; the action-list verb reads "revising".
  - The per-phase status labels (`0 - Intent` … `5 - Docs`) are unchanged.
  - The commit example `(spec-reviewer)` and the six reviewer model-table rows are byte-unchanged.

### Task 7: Rename the base-ref inbound reference in `autonomous-workflow.md`

- **Goal:** Rename the sole base-ref inbound reference on this file's line so the renamed `### Revision base ref` heading leaves no dangling pointer. This line carries no phase-audit token — the whole reference renames.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/autonomous-workflow.md`
- **Changes:**
  - `:39` — "Capture the run's base ref per the **Reviewer base ref** rule in `pipeline-versioning.md`." → "… per the **Revision base ref** rule in `pipeline-versioning.md`."
  - Leave the generic-`revis` lines `:29` ("revise and confirm again") and `:72` ("smallest revision that would unblock") unchanged.
- **Depends on:** Task 2 (the renamed heading definition `### Revision base ref` must exist for this reference to resolve)
- **Traces to:** Spec requirement 9 (invariant on inbound references); Acceptance criterion "every reference to the heading … resolves to the renamed heading — none is left dangling"; Design "Base-ref inbound group"; Edge case "Easily-missed base-ref reference".
- **Acceptance:**
  - Line 39's base-ref reference reads `**Revision base ref**`.
  - No `Reviewer base ref` token remains in this file.
  - The generic-`revis` lines `:29` and `:72` are unchanged.

### Task 8: Rename only the base-ref substring in `autonomous-phases/4 - code.md`

- **Goal:** Rename only the `**Reviewer base ref**` substring on this phase-audit line, keeping every phase-audit token on the same line byte-unchanged.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
- **Changes:**
  - `:37` — within-line precision: change the substring "see the **Reviewer base ref** rule in `pipeline-versioning.md`" to "see the **Revision base ref** rule in `pipeline-versioning.md`". Keep verbatim on the same line: `code-reviewer`, `code-review-N-rejected.md`, `code-review-approved.md`, and all surrounding phase-audit prose.
- **Depends on:** Task 2 (the renamed heading definition must exist)
- **Traces to:** Spec requirements 9, 11, 12; Acceptance criteria on the base-ref inbound invariant and "phase-auditing 'review' terms … are unchanged"; Design "Base-ref inbound group" / "Precision-surgery lines".
- **Acceptance:**
  - The base-ref substring on line 37 reads `**Revision base ref**`.
  - `code-reviewer`, `code-review-N-rejected.md`, and `code-review-approved.md` on that line are byte-unchanged.
  - No other token in the file is changed.

### Task 9: Rename only the base-ref substring in `autonomous-phases/5 - docs.md`

- **Goal:** Rename only the `**Reviewer base ref**` substring on this phase-audit line, keeping every phase-audit token on the same line byte-unchanged.
- **Type:** e2e
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Changes:**
  - `:37` — within-line precision: change the substring "see the **Reviewer base ref** rule in `pipeline-versioning.md`" to "see the **Revision base ref** rule in `pipeline-versioning.md`". Keep verbatim on the same line: `docs-reviewer`, `docs-review-N-rejected.md`, `docs-review-approved.md`, and all surrounding phase-audit prose.
- **Depends on:** Task 2 (the renamed heading definition must exist)
- **Traces to:** Spec requirements 9, 11, 12; Acceptance criteria on the base-ref inbound invariant and "phase-auditing 'review' terms … are unchanged"; Design "Base-ref inbound group" / "Precision-surgery lines".
- **Acceptance:**
  - The base-ref substring on line 37 reads `**Revision base ref**`.
  - `docs-reviewer`, `docs-review-N-rejected.md`, and `docs-review-approved.md` on that line are byte-unchanged.
  - No other token in the file is changed.

### Task 10: Re-grep verification — prove the bucket boundaries held

- **Goal:** Re-run the greps that defined the rename map and confirm all four buckets held: no missed rename, no collateral rename, no dangling reference, and phase-audit/generic uses preserved. This is the verification surface for the whole change.
- **Type:** e2e
- **Files to change:** None (read-only verification; no edits expected — if a check fails, the failure is fixed in the corresponding Task 2–9 and this task re-run).
- **Changes:** Run, from the worktree root over `skills/ agents/ .rp.md`, and confirm the expected results (cross-checking against Task 1's baseline):
  - **Missed rename:** `grep -rni 'review' skills/ agents/ .rp.md` — every remaining hit is phase-audit. `grep -rniE 'review run|review intent|new review|review-[0-9]+-<short' skills/ agents/ .rp.md` returns zero hits.
  - **Collateral rename:** `grep -rni 'revision' skills/ agents/ .rp.md` and `grep -rni 'revise' skills/ agents/ .rp.md` — every new token names a run/run-creation concept; no new token lands on a phase-audit concept; no bare "revision" for the run in run-creation prose. The 32-line generic `revis` baseline from Task 1 is unchanged.
  - **Dangling reference (filename):** `grep -rn 'review-pipeline' skills/ agents/ .rp.md` → zero hits.
  - **Dangling reference (heading):** `grep -rn 'Reviewer base ref' skills/ agents/ .rp.md` → zero hits; `grep -rn 'Revision base ref' skills/ agents/ .rp.md` → exactly 5 hits (1 definition in `pipeline-versioning.md` + 4 inbound in `autonomous-workflow.md`, `revision-pipeline.md`, `autonomous-phases/4 - code.md`, `autonomous-phases/5 - docs.md`).
  - **Phase-audit preserved:** `git diff` over the bucket-B keep set shows zero change except the base-ref substring on the three inbound files (whole line on `autonomous-workflow.md:39`; substring only on `4 - code.md:37` and `5 - docs.md:37`). No reviewer agent profile under `agents/` is changed. The 6 reviewer agent names, `*-review-approved.md`, and `*-review-N-rejected.md` are byte-unchanged.
  - **Collision check:** confirm no `revision-N` run name collides with a rejection-iteration name (e.g. `revision-2` vs `spec-review-2-rejected.md` are unambiguously different) — automatic once runs are `revision-N`.
- **Depends on:** Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9
- **Traces to:** All spec Acceptance Criteria (invariants and named-token); Design "Failure Modes and Observability"; Edge cases "Missed rename", "Collateral rename", "Dangling reference".
- **Acceptance:**
  - Every remaining `review` hit in `skills/ agents/ .rp.md` denotes a phase-auditing concept; the run-creation-token regex returns zero hits.
  - Every new `revision`/`revise` token names a run/run-creation concept; the generic-`revis` baseline (32 lines) is unchanged.
  - `review-pipeline` and `Reviewer base ref` each return zero in-scope hits; `Revision base ref` returns exactly 5 (1 definition + 4 inbound).
  - The bucket-B keep set is byte-unchanged except the three base-ref inbound substrings; no agent profile is touched; the reviewer agent names and `*-review-approved.md` / `*-review-N-rejected.md` artifacts are byte-unchanged.
  - No `revision-N` run name collides with any `*-review-N-rejected.md` rejection-iteration name.
