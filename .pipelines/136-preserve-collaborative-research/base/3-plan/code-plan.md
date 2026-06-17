# Code Plan: Preserve collaborative research across the assisted phases

## Overview

This change edits the Radical Pipelines skill itself: the three assisted-phase references and one new shared reference file beside them. All paths below are real paths in the worktree, rooted at `skills/radical-pipelines/reference/assisted-phases/`:

- `1 - spec.md` — assisted spec phase
- `2 - design-doc.md` — assisted design-doc phase
- `3 - plan.md` — assisted plan phase
- a new shared file (created in Task 1)

The "code" here is skill prose. Every task is governed by the project's skill-authoring rules: minimalist and concise (state the instruction, not the reasoning); no duplication across a single reading path; generic (no tool-specific or issue-tracker-specific mentions); no unnecessary negative phrasing; describe the system as designed; reuse the terms the skill already defines.

The design's five coordinated moves map onto these tasks:

- **Move 1 (shared recording trigger) + Move 3 (advocate-vs-record principle)** → Task 1 creates the shared file; Tasks 2-4 reference it and reword each phase's "don't do the next phase's job" rule.
- **Move 2 (spec-phase `## Topics` home)** → Task 2.
- **Move 4 (forward-drift flag)** → Task 2 (spec) and Task 3 (design-doc); deliberately absent in Task 4 (plan).
- **Move 5 (carry-across by research-file input)** → Task 3 (design-doc reads `spec-research.md`) and Task 4 (plan reads `design-doc-research.md`).

Task 1 must land first because Tasks 2-4 each reference the file it creates by name. Tasks 2, 3, and 4 are independent of each other (each edits a different file) and depend only on Task 1.

The shared file's exact filename and title is a wording call left to this phase: Task 1 fixes a concrete name so Tasks 2-4 can reference it. The recommended name is `collaborative-research.md` (see Task 1). Tasks 2-4 reference whatever filename Task 1 commits — if the writer chooses a different name in Task 1, the same name is used in Tasks 2-4.

## Tasks

### Task 1: Create the shared collaborative-research reference file

- **Goal:** Add the single shared reference file holding the two rules that are identical across all three assisted phases — the settled-thread recording trigger and the advocate-vs-record principle — so the three phase files can reference it by name instead of restating it.
- **Files to change:**
  - New file: `skills/radical-pipelines/reference/assisted-phases/collaborative-research.md`
- **Changes:**
  - Create the new file. Recommended filename `collaborative-research.md`; recommended H1 title along the lines of `# Recording Collaborative Research`. (Filename/title is a wording call for this phase per the design's Open Questions; pick one here and reuse it verbatim in Tasks 2-4.)
  - The file states exactly two rules and nothing phase-specific:
    1. **The recording trigger.** When a thread of exploration settles (a question or topic is resolved), before moving to the next, append the distilled entry to the phase's recording section. The recorded unit is a distilled per-settled-thread entry capturing the exploration and its outcome — not a raw transcript of every reply.
    2. **The advocate-vs-record principle.** The "don't do the next phase's job" rule constrains advocating for or committing to a choice that belongs to a later phase; recording design-adjacent (or plan-adjacent) exploration that arose collaboratively with the owner is preserved.
  - Refer to the phase's recording section and recording unit generically (e.g. "the phase's recording section", "the distilled entry") — do not name `## Q&A`, `## Topics`, `## Code Plan Topics`, `## Doc Plan Topics`, the per-phase later-phase targets, or the forward-drift flag. Those stay inline in the phase files (Tasks 2-4).
  - Write it in the skill's imperative reference-prose voice, matching the tone and density of the existing `## Constraints` bullets in the three phase files.
- **Depends on:** none
- **Traces to:** Design "New: shared recording-and-record reference file"; Decision "One shared file for the identical cross-phase rules (hybrid extraction)"; Decision "Explicit settled-thread recording trigger across all three phases"; Decision "Advocate-vs-record carve-out". Spec Requirement 1 / AC 1, AC 2; Requirement 3 / AC 5; Requirement 7 / AC 9.
- **Acceptance:**
  - The file `skills/radical-pipelines/reference/assisted-phases/collaborative-research.md` exists.
  - It states the settled-thread recording trigger (record at the resolution of a settled thread, before moving to the next) and that the recorded unit is a distilled per-settled-thread entry, not a raw transcript.
  - It states the advocate-vs-record principle (the rule constrains advocating for / committing to a later-phase choice; recording design/plan-adjacent collaborative exploration is preserved).
  - It contains no phase-specific content: no per-phase section names, no per-phase later-phase targets, no forward-drift flag.
  - It contains no tool-specific or issue-tracker-specific mentions and no unnecessary negative phrasing.

### Task 2: Update the assisted spec phase (`1 - spec.md`)

- **Goal:** Bring the spec phase to parity — give `spec-research.md` a `## Topics` home for collaborative exploration, name owner-initiated dialogue as recordable and route it there, reword the "don't propose design/implementation" rule to the advocate-vs-record shape, add the forward-drift flag, and reference the shared file — while keeping the spec's requirements-only synthesis sources (`## Q&A`, `## Consolidated Requirements`) unchanged.
- **Files to change:**
  - `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`
- **Changes:**
  - **Reference the shared file.** Add a reference to the file Task 1 created, by name, using the same by-name idiom the file already uses for `pipeline-versioning.md`. Place it where the recording and advocate-vs-record rules live (the `## Constraints` block). The shared trigger replaces sole reliance on the existing line 22 ("You MUST append every question and answer to `spec-research.md` in real time, not in batches"): the settled-thread trigger now comes from the shared file. Whether the "in real time" phrase is dropped or kept only as a secondary nudge is a wording call — it must no longer be the sole timing guidance.
  - **`## Topics` section in `spec-research.md`.** In the `### 1. Initialize spec-research.md` template (lines 33-45) and its accompanying prose (line 47), add a `## Topics` section to the `spec-research.md` structure. `## Topics` holds owner-initiated questions, the explanatory exchanges that resolve them, and design-adjacent collaborative exploration, recorded as distilled per-settled-thread entries. Reuse the skill's existing `## Topics` name and `### Topic:` entry shape, adapted to a lighter spec-phase shape (frame / exploration / outcome) since spec threads are not always multi-option decisions. `## Q&A` stays the requirements-oriented Q&A and `## Research` stays the orchestrator's cited codebase reads — leave both unchanged in purpose.
  - **Q&A-loop guidance routes owner-initiated dialogue.** In `### 2. Run the Q&A loop` (lines 49-72), name questions the owner raises, and the explanatory exchanges that resolve them, as research worth preserving alongside the orchestrator's own questions, and route them (and design-adjacent collaborative exploration) into the new `## Topics` home, distilled per settled thread. The orchestrator's own requirements questions continue to land in `## Q&A`.
  - **Reword the "don't do the next phase's job" rule.** Change line 21 ("You MUST NOT propose design or implementation choices — those belong to later phases.") so it constrains advocating for or committing to design and implementation choices (the spec's specific later-phase targets stay inline), with the general advocate-vs-record principle sourced from the shared file. It must no longer read as forbidding the recording of design-adjacent exploration.
  - **Add the forward-drift flag.** Add an inline instruction (reusing the established when-X-do-Y idiom): when discussion drifts into design territory, flag it to the owner and recommend running the assisted design-doc phase once the spec phase completes, while context is fresh. This is distinct from existing guidance; the spec phase has no backward scope-drift handler to fold it into, so it is a new inline instruction.
  - Leave the spec synthesis sources unchanged: `### 5. Consolidate requirements` and `### 6. Synthesize spec.md` continue to draw on `## Q&A` and `## Consolidated Requirements` only — design-adjacent material in `## Topics` does not feed `spec.md`.
- **Depends on:** Task 1
- **Traces to:** Design "Modified: `1 - spec.md`"; Decision "Spec-phase `## Topics` home"; Decision "Forward-drift flag in spec and design-doc"; Decision "Advocate-vs-record carve-out"; Decision "Explicit settled-thread recording trigger". Spec Requirement 1 / AC 1; Requirement 2 / AC 3, AC 4; Requirement 3 / AC 5; Requirement 4 / AC 6; Requirement 6 / AC 8; Requirement 7 / AC 9.
- **Acceptance:**
  - `spec-research.md`'s documented structure includes a `## Topics` section providing an explicit home for owner-initiated questions, their explanatory exchanges, and design-adjacent collaborative exploration, with a stated entry shape.
  - The Q&A-loop guidance explicitly identifies questions the owner raises and the exchanges that resolve them as research worth preserving, and routes them into `## Topics`.
  - The reworded line-21 rule constrains advocating for / committing to design and implementation choices and no longer reads as forbidding recording of design-adjacent exploration.
  - A forward-drift flag instructs flagging to the owner and recommending the assisted design-doc phase once the spec phase completes.
  - The file references the shared file by name, and the recording trigger no longer relies solely on "in real time, not in batches".
  - `## Q&A` and `## Consolidated Requirements` remain the spec's only synthesis sources; `## Research` keeps its cited-codebase-reads meaning.
  - No tool-specific or issue-tracker-specific mentions; no unnecessary negative phrasing; no instruction duplicated from the shared file.

### Task 3: Update the assisted design-doc phase (`2 - design-doc.md`)

- **Goal:** Add `spec-research.md` as a supplementary input (carry-across), source the recording trigger from the shared file and make the existing topic-loop trigger consistent with it, reword the "don't write the implementation plan" rule to the advocate-vs-record shape, add the forward-drift flag distinct from the existing backward scope-drift handler, and reference the shared file.
- **Files to change:**
  - `skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md`
- **Changes:**
  - **Carry-across input.** In the `Inputs:` list (lines 5-7), add `<artifacts-folder>/1-spec/spec-research.md` as supplementary collaborative context, beside the existing authoritative input `spec.md`. Frame `spec.md` as the authoritative statement of intent and `spec-research.md` as supplementary collaborative context (not a second source of truth). If `### 2. Gather context` (line 64-69) reads `spec.md`, extend it to also read `spec-research.md` as supplementary context.
  - **Reference the shared file.** Add a by-name reference to the file Task 1 created, in the `## Constraints` block, using the existing by-name idiom. The settled-thread trigger now comes from the shared file; make the existing line 25 ("You MUST append every option, trade-off, and decision to `design-doc-research.md` in real time, not in batches") and the implicit topic-loop trigger in `### 3` step 4 (line 77) consistent with it. The recorded unit stays the distilled `## Topics` entry. "In real time, not in batches" must no longer be the sole timing guidance.
  - **Reword the "don't do the next phase's job" rule.** Change line 24 ("You MUST NOT write the implementation plan (ordered steps, task breakdown) — that belongs to phase 3.") so it constrains advocating for or committing to the implementation plan (the specific later-phase target stays inline), with the general advocate-vs-record principle from the shared file. It must no longer read as forbidding the recording of plan-adjacent exploration. Leave the existing production-code carve-out on line 23 ("You MUST NOT write production code. Interface sketches and small illustrative snippets are fine.") as the established precedent it already is — only the line-24 implementation-plan rule needs the advocate-vs-record rewording for this change.
  - **Add the forward-drift flag.** Add an inline instruction (when-X-do-Y idiom): when discussion drifts into plan territory, flag it to the owner and recommend running the assisted plan phase once the design-doc phase completes, while context is fresh. Keep it distinct from and alongside the existing backward scope-drift handler on line 22 ("If a scope question surfaces during design, log it as an open question or send the owner back to revise the spec") — the backward handler routes the owner back to the spec; the forward-drift flag routes forward to the plan phase. Do not fold them together.
- **Depends on:** Task 1
- **Traces to:** Design "Modified: `2 - design-doc.md`"; Decision "Carry-across by research-file input"; Decision "Forward-drift flag in spec and design-doc"; Decision "Advocate-vs-record carve-out"; Decision "Explicit settled-thread recording trigger". Spec Requirement 1 / AC 1; Requirement 3 / AC 5; Requirement 4 / AC 6; Requirement 5 / AC 7; Requirement 6 / AC 8; Requirement 7 / AC 9.
- **Acceptance:**
  - The Inputs list includes `<artifacts-folder>/1-spec/spec-research.md`, framed as supplementary collaborative context, with `spec.md` remaining the authoritative input.
  - The recording trigger is sourced from the shared file (referenced by name) and the topic-loop trigger is consistent with it; "in real time, not in batches" is no longer the sole timing guidance.
  - The reworded implementation-plan rule constrains advocating for / committing to the implementation plan and no longer reads as forbidding recording of plan-adjacent exploration.
  - A forward-drift flag instructs flagging to the owner and recommending the assisted plan phase once the design-doc phase completes, sitting distinct from the existing backward scope-drift handler.
  - The recorded unit remains the distilled `## Topics` entry; `design-doc.md` (the standalone artifact) is not used to carry research.
  - No tool-specific or issue-tracker-specific mentions; no unnecessary negative phrasing; no instruction duplicated from the shared file.

### Task 4: Update the assisted plan phase (`3 - plan.md`)

- **Goal:** Add `design-doc-research.md` as a supplementary input (carry-across), source the recording trigger from the shared file and make both topic-loop triggers consistent with it, reword the "don't write code or documentation content" rule to the advocate-vs-record shape, reference the shared file — and add no forward-drift flag (the plan phase's next phase has no assisted form).
- **Files to change:**
  - `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- **Changes:**
  - **Carry-across input.** In the `Inputs:` list (lines 5-8), add `<artifacts-folder>/2-design-doc/design-doc-research.md` as supplementary collaborative context, beside the existing authoritative inputs `spec.md` and `design-doc.md`. Frame the two standalone artifacts as authoritative and `design-doc-research.md` as supplementary collaborative context (not a second source of truth). If `### 2. Gather context` (lines 75-83) reads `spec.md` and `design-doc.md`, extend it to also read `design-doc-research.md` as supplementary context.
  - **Reference the shared file.** Add a by-name reference to the file Task 1 created, in the `## Constraints` block, using the existing by-name idiom. The settled-thread trigger now comes from the shared file; make the existing line 34 ("You MUST append every option, trade-off, and decision to `plan-notes.md` in real time, not in batches") and the implicit triggers in both topic loops — `### 3. Work through the code plan topics` step 4 (line 92) and `### 7. Work through the doc plan topics` step 4 (line 169) — consistent with it. The recorded unit stays the distilled `## Code Plan Topics` / `## Doc Plan Topics` entry. "In real time, not in batches" must no longer be the sole timing guidance.
  - **Reword the "don't do the next phase's job" rule.** Change line 32 ("You MUST NOT write code or documentation content. Describe what to do, not how to phrase it.") so it constrains advocating for or committing to code and documentation content (the specific later-phase targets — code and documentation content — stay inline), with the general advocate-vs-record principle from the shared file. It must no longer read as forbidding the recording of plan-adjacent exploration. The plan phase's "MUST NOT plan tests" (line 30) is a same-phase boundary between code plan and TDD, not a next-phase-job rule; leave lines 30-31 unchanged unless the advocate-vs-record rewording of line 32 requires a minimal adjustment for consistency. (If the writer judges that the design's "tests, code, and documentation content" target list is best expressed by also touching the tests target, keep tests as a code-plan/TDD boundary, not as advocate-vs-record — the design's later-phase targets for the carve-out are code and documentation content.)
  - **No forward-drift flag.** Add none. The plan phase's next phase (code) has no assisted form, so the flag stops here. The existing backward scope-drift handler on line 33 ("If a scope question surfaces, log it as an open question or send the owner back to revise the spec or design doc") stays as-is.
- **Depends on:** Task 1
- **Traces to:** Design "Modified: `3 - plan.md`"; Decision "Carry-across by research-file input"; Decision "Forward-drift flag in spec and design-doc, absent in plan"; Decision "Advocate-vs-record carve-out"; Decision "Explicit settled-thread recording trigger". Spec Requirement 1 / AC 1; Requirement 3 / AC 5; Requirement 4 / AC 6 (absent-in-plan clause); Requirement 5 / AC 7; Requirement 6 / AC 8; Requirement 7 / AC 9.
- **Acceptance:**
  - The Inputs list includes `<artifacts-folder>/2-design-doc/design-doc-research.md`, framed as supplementary collaborative context, with `spec.md` and `design-doc.md` remaining authoritative inputs.
  - The recording trigger is sourced from the shared file (referenced by name) and both topic-loop triggers (code plan and doc plan) are consistent with it; "in real time, not in batches" is no longer the sole timing guidance.
  - The reworded code/documentation-content rule constrains advocating for / committing to those choices and no longer reads as forbidding recording of plan-adjacent exploration.
  - No forward-drift flag is present anywhere in the file; the existing backward scope-drift handler is unchanged.
  - The recorded unit remains the distilled `## Code Plan Topics` / `## Doc Plan Topics` entry; neither standalone plan artifact is used to carry research.
  - No tool-specific or issue-tracker-specific mentions; no unnecessary negative phrasing; no instruction duplicated from the shared file.
