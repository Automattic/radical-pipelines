# Code Plan: Default output rules for pipeline-produced code

## Overview

This feature promotes two always-on output qualities into permanent rules of the tool: **Rule 1** (a change leaves untouched comments and prose exactly as they were) and **Rule 2** (the shipped host-project product reads as if a person wrote it, with no trace of the pipeline that produced it). It ships **no code and no runtime mechanism** — it is an instructions-only change to five Markdown agent profiles under `agents/`. The rules live as standing prose duplicated **byte-identically** into the three producing profiles (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) and the two reviewing profiles (`code-reviewer`, `docs-reviewer`). Producers honor the rules while writing and omit pipeline-naming provenance from product commits; reviewers enforce both rules at the existing per-phase review gate, where a violation is a must-fix issue that blocks phase completion.

The implementation order is: (1) author the single authoritative **canonical rules block** once, as the artifact every later task copies; (2) install it into each producing profile, in each case replacing or layering correctly onto that profile's existing content and adding the product-commit no-provenance constraint to its commit step; (3) install the same canonical block plus an enforcement checklist item and product-commit-message inspection into each reviewing profile. Tasks 2–6 each copy the same block verbatim, so the "stated once and consistently" guarantee holds across all five copies.

Because this repository's own rule is "the skill is prose, not software" (see `CLAUDE.md`), **no task writes structural tests that assert the content, sections, wording, or ordering of any profile or skill file.** Each task's Acceptance describes observable properties of the edited prose — verifiable by reading the resulting file and its diff — not by an automated unit test asserting file contents.

## Guardrail scopes

No guardrail scopes were passed to this plan (the launch prompt contained no `Guardrail scopes to fill:` section).

| Gate | Scope |
| ---- | ----- |
| None | — |

## E2E test plan

This feature ships no runnable product — it changes agent instructions only. There is therefore no automated end-to-end suite to add; every flow below is an **inspection / behavior flow that the `code-reviewer` manually re-drives** during its batch review (its step-3 behavior verification), reading the resulting profiles and reasoning about the behavior the instructions now mandate. Each flow traces to a spec acceptance criterion or edge case. No task is of Type `e2e`; these flows are the reviewer's manual verification contract, not an automated-test deliverable.

### Flow 1: Always-on application, no opt-out

- **Steps:** Read the five edited profiles. Confirm each of the three producing profiles carries the canonical Rule 1 + Rule 2 block as standing prose with no conditional ("if the owner configured…", "when enabled…") guarding it. Search the profiles, the orchestrator, the conventions, and `.rp.md` for any per-run or per-project switch that disables, overrides, or opts out of either rule.
- **Expected:** Both rules are unconditional standing text in every carrying profile; no enable/disable/override/opt-out mechanism exists anywhere.
- **Traces to:** Acceptance "Always-on application" (both criteria); Spec Req 1.

### Flow 2: Rule 1 leaves untouched comments and prose alone

- **Steps:** Read the Rule 1 prose in each producing profile. Confirm it forbids rewording, reflowing, reformatting, or tidying a comment attached to code the change does not modify, or a prose section of a doc the change edits but does not otherwise touch — and that such untouched content must be left exactly as it was.
- **Expected:** Rule 1 prose keys on the touched-vs-untouched axis and mandates leaving untouched comments/prose exactly as they were.
- **Traces to:** Acceptance "Rule 1" (untouched-comments criterion); Spec Req 2.

### Flow 3: Rule 1 permits naturally updating a changed line's own comment, with no duty to preserve

- **Steps:** Read the Rule 1 prose. Confirm it explicitly permits updating a comment or prose that belongs to content the change *is* modifying, states there is no duty to preserve a still-valid comment beside changed code, and states Rule 1 does not apply to commit messages.
- **Expected:** The permitted case and the no-duty-to-preserve case are both stated; Rule 1 is scoped out of commit messages.
- **Traces to:** Acceptance "Rule 1" (naturally-updated, still-valid-comment, and commit-message criteria); Spec Req 3; Out-of-Scope #1, #6.

### Flow 4: Rule 2 content reach across all product surfaces

- **Steps:** Read the Rule 2 prose in each producing profile. Confirm its reach is total across product content — comments, identifiers and names, string literals, log and error messages, and inline API documentation — not limited to comments, and that it forbids pointing at this run's artifacts, referencing a phase or plan task of this run, narrating the writing agent's own process, or claiming the pipeline or its agents produced the output.
- **Expected:** Rule 2 reaches every listed product surface and forbids every listed referent tell; it is explicitly not comments-only.
- **Traces to:** Acceptance "Rule 2 — content" (source-code and process-narration criteria); Spec Req 4.

### Flow 5: Rule 2 over external documentation

- **Steps:** Read the Rule 2 prose in `docs-writer.md`. Confirm it forbids external documentation (READMEs, guides, changelogs, examples) from referencing this run's pipeline, phases, artifacts, or agents as the origin of the work.
- **Expected:** External-documentation surfaces are covered by Rule 2's prohibition.
- **Traces to:** Acceptance "Rule 2 — content" (external-documentation criterion); Spec Req 5.

### Flow 6: Rule 2 referent-based discriminator (self-hosting safe)

- **Steps:** Read the Rule 2 prose. Confirm it states the decisive test by referent (a reference violates only if it identifies the concrete pipeline run that produced this output), carries at least one concrete "this is NOT a violation" example (e.g. a `spec.md` filename literal or an illustrative `.pipelines/<slug>/…` path), and explicitly does not flag legitimate pipeline vocabulary, methodology documentation, artifact-type names, or illustrative paths — including in the self-hosting Radical Pipelines repository.
- **Expected:** Rule 2 is referent-based, carries a negative example, and is self-hosting-safe; it never reduces to a token/keyword/path checklist.
- **Traces to:** Acceptance "Rule 2 — referent-based discriminator" (both criteria); Spec Req 6; Out-of-Scope #2.

### Flow 7: Product commits carry no pipeline-naming provenance

- **Steps:** Read the commit step of each producing profile. Confirm it instructs the agent to author the commit message in the host commit format **but omit pipeline-naming provenance** (no `(<agent-name>)` tag, no phase/artifact/task naming), as a property applied at authoring time regardless of the host's specific format or the artifact storage mode. Confirm the reviewing profiles' commit steps are unchanged (reviewers keep the full format including the tag).
- **Expected:** Each producer's commit step omits provenance at authoring time; reviewers keep the tag; the constraint never reads or alters the host's specific format.
- **Traces to:** Acceptance "Rule 2 — commit messages and provenance" (untagged-product-commit and host-format-no-contradiction criteria); Spec Req 7, Req 9.

### Flow 8: Commit classification by changed-path boundary

- **Steps:** Read the reviewing profiles' new checklist content. Confirm the reviewer treats a commit as a *product commit* subject to Rule 2's commit-message constraint when at least one changed path is outside the pipeline's artifacts folder (`.pipelines/<slug>/`), and as an *artifact-only commit* — exempt, may carry the provenance tag — when none of its changed paths fall outside the artifacts folder.
- **Expected:** The product-vs-artifact commit boundary is the changed-path test against the artifacts folder; artifact-only commits remain exempt and tagged.
- **Traces to:** Acceptance "Rule 2 — commit messages and provenance" (product-commit-classification and artifact-only-exempt criteria); Spec Req 8.

### Flow 9: Single source and consistency

- **Steps:** Compare the canonical Rule 1 + Rule 2 block across all five profiles for byte-identity. Search `agents/` and `skills/` for the pre-existing narrower Rule 2 line *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* and confirm it no longer exists anywhere as a separate, overlapping version.
- **Expected:** The canonical block is byte-identical across the five copies; the narrower line is gone, with no surviving narrower or conflicting variant.
- **Traces to:** Acceptance "Single source and consistency"; Spec Req 10, Req 11.

### Flow 10: Enforcement blocks phase completion

- **Steps:** Read the step-2 review checklist of `code-reviewer.md` and `docs-reviewer.md`. Confirm each carries a must-fix item enforcing Rule 1 and Rule 2 (applying the referent discriminator) plus an explicit line to inspect product-commit messages for provenance leaks. Trace the consequence through the unchanged machinery: a recorded violation is a must-fix issue → forces a `rejected` verdict → no `*-review-approved.md` is written → the phase-completion predicate is not met → flagged tasks are re-dispatched until resolved, with the review gate the only route to completion.
- **Expected:** A seen violation is recorded as a must-fix issue and blocks phase completion via the existing reject-liberally / no-approval-artifact machinery; there is no bypass.
- **Traces to:** Acceptance "Enforcement" (both criteria); Spec Req 12, Req 10.

## Tasks

### Task 1: Author the canonical Rule 1 + Rule 2 block (single authoritative copy)

- **Goal:** Produce the single authoritative prose block stating Rule 1 and Rule 2, to be copied byte-identically into the five carrying profiles by Tasks 2–6. This task fixes the exact wording so every later copy is verifiably identical.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md` (the canonical copy is authored here, replacing the narrower line at line 33 — see Changes; Tasks 4–6 copy this block verbatim). No new file is created — per `CLAUDE.md` a profile instruction is duplicated into each profile, never extracted to a referenced file.
- **Changes:**
  - Write a self-contained prose block (the **canonical rules block**) that states both rules using the house template the existing profiles use (a named rule, a one-line decisive criterion, a concrete "this is NOT a violation" example, then the action). The block must:
    - **Rule 1 — leave unchanged comments and prose untouched.** Forbid rewording, reflowing, reformatting, or tidying a comment attached to code the change did not modify, or a prose section of a documentation file the change edits but does not otherwise touch; such untouched content is left exactly as it was. Explicitly permit updating a comment or prose that belongs to content the change *is* modifying. State there is no duty to preserve a still-valid comment beside code that was changed. State Rule 1 does not apply to commit messages.
    - **Rule 2 — the host-project product is transparent to the pipeline.** State the reach is total across product content: comments, identifiers and names, string literals, log and error messages, and inline API documentation (and, for the doc surfaces, external documentation). Forbid any reference to this run's pipeline, its phases, its artifacts, its plan tasks, or its agents, and forbid narrating the writing agent's own process or claiming the pipeline produced the output. Frame the decisive test by **referent**: a reference violates Rule 2 only if it identifies the concrete pipeline run that produced this output. Include at least one concrete "this is NOT a violation" negative example (e.g. a `spec.md` filename literal used as product data, or an illustrative `.pipelines/<slug>/…/spec.md` path shown in docs) and state that legitimate pipeline vocabulary, methodology documentation, artifact-type names in general, and illustrative paths are never violations — including in the self-hosting Radical Pipelines repository. Carry the subject-matter-vs-process mental check ("Is this reference about the subject matter of the product, or about the process that produced this artifact?"). The observable tells of a violating referent appear as illustrations, never as a checklist of tokens to scan for.
  - Install this canonical block in `agents/code-writer-tdd.md` by **deleting** the existing narrower line at line 33 — *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* — and putting the canonical block in its place within the step-2 "Implement with TDD" section (where that line currently sits, among the inline-documentation guidance). Phrase any surrounding lead-in so the block reads sensibly for an agent whose product is code, unit tests, and symbol-level inline API documentation.
  - Record the exact authored block in this task's commit so Tasks 4–6 can copy it verbatim. (Tasks 4–6 will read the committed `code-writer-tdd.md` to obtain the byte-exact block.)
- **Depends on:** none
- **Traces to:** Spec Req 4, Req 6, Req 11 (the narrower line no longer exists as a separate version), Req 2, Req 3; Design "Decision: The canonical rules live in agent profiles, duplicated verbatim", "Decision: Replace the pre-existing narrower Rule 2 line with the canonical Rule 2", "Decision: Rule 2 is expressed as a referent-based test with concrete negative examples", "Decision: Rule 1 is a content-discipline rule"; Acceptance "Rule 1", "Rule 2 — content", "Rule 2 — referent-based discriminator", "Single source and consistency".
- **Acceptance:**
  - The canonical block states Rule 1 keyed to the touched-vs-untouched axis: it forbids tidying comments/prose on content the change did not touch and mandates leaving them exactly as they were.
  - The canonical block explicitly permits updating a comment/prose belonging to content the change is modifying, states no duty to preserve a still-valid comment beside changed code, and states Rule 1 does not apply to commit messages.
  - The canonical block states Rule 2's reach across comments, identifiers and names, string literals, log and error messages, and inline API documentation, and forbids references to this run's pipeline/phases/artifacts/plan-tasks/agents and narration of the writing agent's process.
  - The canonical block frames Rule 2 by referent (violation only if the reference identifies the concrete pipeline run that produced this output) and carries at least one concrete "this is NOT a violation" example plus an explicit self-hosting-safe carve-out for legitimate vocabulary, methodology docs, artifact-type names, and illustrative paths.
  - The canonical block expresses no token/keyword/path checklist to scan for; the violating-referent tells appear only as illustrations.
  - In `agents/code-writer-tdd.md`, the line *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* no longer exists, and the canonical block sits in its place within the step-2 section.

### Task 2: Add the product-commit no-provenance constraint to `code-writer-tdd`'s commit step

- **Goal:** Make `code-writer-tdd` author product commits in the host commit format while omitting pipeline-naming provenance.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md` (commit step — step 4 "Commit and report", currently line 49).
- **Changes:**
  - Amend the commit instruction (currently "Commit the code, tests, and inline documentation using the host project's commit format.") to add a one-line constraint: author the message in the host commit format **but omit pipeline-naming provenance** — no agent-name tag (e.g. no `(code-writer-tdd)`), and no phase, artifact, or plan-task naming in the message. State this as a property applied at authoring time, independent of the host's specific commit format and independent of how the pipeline's artifacts are stored. Do not have the agent read or alter the host's specific format string; it only subtracts the provenance.
- **Depends on:** Task 1 (same file; Task 1 establishes the canonical block in step 2 first to avoid edit conflicts).
- **Traces to:** Spec Req 7, Req 9; Design "Decision: Strip pipeline-naming provenance from product commits at authoring time"; Acceptance "Rule 2 — commit messages and provenance".
- **Acceptance:**
  - The commit step instructs the agent to use the host commit format but omit pipeline-naming provenance (no agent-name tag, no phase/artifact/plan-task naming).
  - The constraint is stated as authoring-time and format-agnostic — it does not depend on, read, or alter the host's specific commit-format string or the artifact storage mode.

### Task 3: Confirm `code-writer-tdd` reads coherently after Tasks 1–2

- **Goal:** Verify the two edits to `agents/code-writer-tdd.md` integrate cleanly — the canonical block reads sensibly in context and the commit-step constraint coexists with the existing commit instruction, with no contradiction or duplication left behind.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md` (light prose fixups only, if integration reveals an awkward seam; no behavioral change).
- **Changes:**
  - Read the full edited profile end to end. Confirm the canonical block sits coherently among the step-2 inline-documentation guidance and that no orphaned remnant of the deleted narrower line survives. Confirm the step-4 commit constraint does not contradict or duplicate the base "use the host project's commit format" instruction. Make only minimal prose-smoothing edits if a seam reads awkwardly; introduce no new rule content.
- **Depends on:** Task 1, Task 2.
- **Traces to:** Spec Req 11 (single, consistent statement; no surviving narrower variant); Design "Decision: Replace the pre-existing narrower Rule 2 line"; Acceptance "Single source and consistency".
- **Acceptance:**
  - The edited `code-writer-tdd.md` reads coherently: the canonical block is integrated in step 2 and the commit constraint in step 4, with no leftover fragment of the deleted narrower line.
  - No new rule content was introduced beyond Tasks 1–2; the commit step contains no contradiction between the base format instruction and the no-provenance constraint.

### Task 4: Install the canonical block and commit constraint into `code-writer-e2e`

- **Goal:** Give `code-writer-e2e` the byte-identical canonical Rule 1 + Rule 2 block and the product-commit no-provenance constraint, phrased to read sensibly for an agent whose product is end-to-end test code.
- **Type:** tdd
- **Files to change:** `agents/code-writer-e2e.md` (add the canonical block in the workflow body — a natural home is within or adjacent to step 2 "Implement the planned e2e flows", line ~16–24; amend the commit step — step 4 "Commit and report", currently line 40).
- **Changes:**
  - Copy the canonical Rule 1 + Rule 2 block **byte-identically** from the committed `agents/code-writer-tdd.md` (authored in Task 1). Place it in the workflow body so an e2e writer reads it before/while writing test code. Add only a surrounding lead-in (not part of the canonical block) if needed so the block reads sensibly for an agent whose product is test code — its comments, string literals, and identifiers — rather than API docs; the canonical block text itself is unchanged. `code-writer-e2e` carries no narrower-Rule-2 line today, so nothing is deleted.
  - Amend the commit step (currently "Commit the tests using the host project's commit format.") with the same one-line product-commit no-provenance constraint as Task 2: author in the host commit format but omit pipeline-naming provenance (no agent-name tag, no phase/artifact/plan-task naming), at authoring time, format-agnostic.
- **Depends on:** Task 1 (provides the byte-exact canonical block to copy).
- **Traces to:** Spec Req 4, Req 6, Req 2, Req 3, Req 7, Req 9, Req 10, Req 11; Design "Decision: The canonical rules live in agent profiles, duplicated verbatim", "Decision: Scope by the product/artifact boundary", "Decision: Strip pipeline-naming provenance from product commits at authoring time"; "Open questions … `code-writer-e2e` fit"; Acceptance "Rule 1", "Rule 2 — content", "Rule 2 — referent-based discriminator", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - The canonical Rule 1 + Rule 2 block in `code-writer-e2e.md` is byte-identical to the copy in `code-writer-tdd.md` (only non-canonical surrounding lead-in prose may differ).
  - The block is placed so an e2e writer encounters it while writing test code, and reads sensibly for an agent whose product is test code rather than API docs.
  - The commit step instructs the agent to use the host commit format but omit pipeline-naming provenance (no agent-name tag, no phase/artifact/plan-task naming), at authoring time and format-agnostic.

### Task 5: Install the canonical block and commit constraint into `docs-writer`

- **Goal:** Give `docs-writer` the byte-identical canonical Rule 1 + Rule 2 block and the product-commit no-provenance constraint, scoped naturally to documentation surfaces.
- **Type:** tdd
- **Files to change:** `agents/docs-writer.md` (add the canonical block in the workflow body — a natural home is within or adjacent to step 2 "Draft", line ~21–28; amend the commit step — step 5 "Commit and report", currently line 52).
- **Changes:**
  - Copy the canonical Rule 1 + Rule 2 block **byte-identically** from the committed `agents/code-writer-tdd.md` (authored in Task 1). Place it in the workflow body so a docs writer reads it while drafting. Add only a surrounding lead-in (not part of the canonical block) if needed so the block reads sensibly for an agent whose product is external documentation (READMEs, guides, changelogs, examples, configuration descriptions) and non-symbol inline narrative — the canonical block already covers external documentation and inline API documentation; the block text itself is unchanged. `docs-writer` carries no narrower-Rule-2 line today, so nothing is deleted.
  - Amend the commit step (currently "Commit the documentation changes using the host project's commit format.") with the same one-line product-commit no-provenance constraint as Task 2: author in the host commit format but omit pipeline-naming provenance (no agent-name tag, no phase/artifact/plan-task naming), at authoring time, format-agnostic.
- **Depends on:** Task 1 (provides the byte-exact canonical block to copy).
- **Traces to:** Spec Req 4, Req 5, Req 6, Req 2, Req 3, Req 7, Req 9, Req 10, Req 11; Design "Decision: The canonical rules live in agent profiles, duplicated verbatim", "Decision: Scope by the product/artifact boundary", "Decision: Strip pipeline-naming provenance from product commits at authoring time"; Acceptance "Rule 1", "Rule 2 — content", "Rule 2 — referent-based discriminator", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - The canonical Rule 1 + Rule 2 block in `docs-writer.md` is byte-identical to the copy in `code-writer-tdd.md` (only non-canonical surrounding lead-in prose may differ).
  - The block is placed so a docs writer encounters it while drafting and reads sensibly for an agent whose product is external documentation and non-symbol inline narrative, with Rule 2's external-documentation reach intact.
  - The commit step instructs the agent to use the host commit format but omit pipeline-naming provenance (no agent-name tag, no phase/artifact/plan-task naming), at authoring time and format-agnostic.

### Task 6: Install the canonical block plus enforcement checklist into `code-reviewer`

- **Goal:** Give `code-reviewer` the byte-identical canonical Rule 1 + Rule 2 block and a must-fix enforcement item in its step-2 review checklist, including an explicit line to inspect product-commit messages for pipeline-naming provenance leaks.
- **Type:** tdd
- **Files to change:** `agents/code-reviewer.md` (add the canonical block in the workflow body so the reviewer applies the same rules and referent test; add the enforcement checklist item and the product-commit-message inspection line to the step-2 "Review the changes" checklist, currently lines 23–31).
- **Changes:**
  - Copy the canonical Rule 1 + Rule 2 block **byte-identically** from the committed `agents/code-writer-tdd.md` (authored in Task 1), placing it where the reviewer reads it before applying the checklist (e.g. just before or within step 2). The reviewer applies the **same** referent-based discriminator as the producers — one shared test, no divergent second statement — so it does not manufacture false rejections from legitimate vocabulary (most acute in the self-hosting repo).
  - Add a must-fix item to the step-2 "Review the changes" checklist: a Rule 1 or Rule 2 violation found in the batch is a must-fix issue (recorded in `## Issues`, tagged to the offending task), applying the referent-based discriminator. This reuses the reviewer's existing "every issue is must-fix" / "reject liberally" machinery — no new gate, no orchestrator change.
  - Add an explicit checklist line to inspect **product-commit messages** for provenance leaks: classify a commit as a *product commit* (subject to Rule 2's commit-message constraint) when at least one of its changed paths is **not** under the pipeline's artifacts folder (`.pipelines/<slug>/`), and as an *artifact-only commit* (exempt; may carry the agent-name provenance tag) when **none** of its changed paths fall outside the artifacts folder; a product commit must carry no pipeline-naming provenance in its message.
- **Depends on:** Task 1 (provides the byte-exact canonical block to copy).
- **Traces to:** Spec Req 8, Req 12, Req 10, Req 11, Req 4, Req 6; Design "Decision: Enforcement reuses the existing review gate", "Decision: The canonical rules live in agent profiles, duplicated verbatim"; design-review note (2) "add an explicit reviewer-checklist line for inspecting product commit messages"; Acceptance "Enforcement", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - The canonical Rule 1 + Rule 2 block in `code-reviewer.md` is byte-identical to the copy in `code-writer-tdd.md` (only non-canonical surrounding lead-in prose may differ).
  - The step-2 review checklist contains a must-fix item: a Rule 1 or Rule 2 violation in the batch is a must-fix issue, tagged to the offending task, applying the referent-based discriminator.
  - The step-2 checklist contains an explicit line to inspect product-commit messages for pipeline-naming provenance, with the product-vs-artifact classification stated as the changed-path test against the artifacts folder (product commit = at least one changed path outside; artifact-only = none outside, exempt and may carry the tag).
  - The enforcement reuses the existing must-fix / reject-liberally machinery; no new gate, no orchestrator change, no bypass is introduced.

### Task 7: Install the canonical block plus enforcement checklist into `docs-reviewer`

- **Goal:** Give `docs-reviewer` the byte-identical canonical Rule 1 + Rule 2 block and a must-fix enforcement item in its step-2 review checklist, including an explicit line to inspect product-commit messages for pipeline-naming provenance leaks.
- **Type:** tdd
- **Files to change:** `agents/docs-reviewer.md` (add the canonical block in the workflow body; add the enforcement checklist item and product-commit-message inspection line to the step-2 "Review the changes" checklist, currently lines 25–33).
- **Changes:**
  - Copy the canonical Rule 1 + Rule 2 block **byte-identically** from the committed `agents/code-writer-tdd.md` (authored in Task 1), placing it where the reviewer reads it before applying the checklist. The reviewer applies the same referent-based discriminator as the producers — one shared test — so legitimate documentation-of-the-methodology and pipeline vocabulary are not falsely flagged, including in the self-hosting repo.
  - Add the same must-fix enforcement item as Task 6 to the step-2 "Review the changes" checklist: a Rule 1 or Rule 2 violation found in the batch is a must-fix issue, tagged to the offending task, applying the referent-based discriminator, reusing the existing must-fix / reject-liberally machinery.
  - Add the same explicit product-commit-message inspection line as Task 6, with the identical changed-path classification (product commit = at least one changed path outside `.pipelines/<slug>/`; artifact-only = none outside, exempt and may carry the tag); a product commit must carry no pipeline-naming provenance in its message.
- **Depends on:** Task 1 (provides the byte-exact canonical block to copy).
- **Traces to:** Spec Req 8, Req 12, Req 10, Req 11, Req 5, Req 6; Design "Decision: Enforcement reuses the existing review gate", "Decision: The canonical rules live in agent profiles, duplicated verbatim", "Decision: Scope by the product/artifact boundary"; design-review note (2) "add an explicit reviewer-checklist line for inspecting product commit messages"; Acceptance "Enforcement", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - The canonical Rule 1 + Rule 2 block in `docs-reviewer.md` is byte-identical to the copy in `code-writer-tdd.md` (only non-canonical surrounding lead-in prose may differ).
  - The step-2 review checklist contains a must-fix item: a Rule 1 or Rule 2 violation in the batch is a must-fix issue, tagged to the offending task, applying the referent-based discriminator.
  - The step-2 checklist contains an explicit line to inspect product-commit messages for pipeline-naming provenance, with the product-vs-artifact classification stated as the changed-path test against the artifacts folder.
  - The enforcement reuses the existing must-fix / reject-liberally machinery; no new gate, no orchestrator change, no bypass is introduced.

### Task 8: Verify single-source byte-identity across all five copies and absence of the narrower variant

- **Goal:** Confirm the canonical Rule 1 + Rule 2 block is byte-identical across all five carrying profiles and that no narrower or conflicting variant of Rule 2 survives anywhere in `agents/` or `skills/`.
- **Type:** tdd
- **Files to change:** None expected. If a discrepancy is found, correct the affected profile so its copy matches the canonical block byte-for-byte. (This task makes no rule-content decisions; it only enforces identity to the block authored in Task 1.) Do **not** add a structural test asserting file content — per `CLAUDE.md`, the skill is prose, not software; verification here is by inspection/diff, not by an automated content-asserting test.
- **Changes:**
  - Extract the canonical block from each of the five profiles (`code-writer-tdd.md`, `code-writer-e2e.md`, `docs-writer.md`, `code-reviewer.md`, `docs-reviewer.md`) and compare them for byte-identity. Differences in non-canonical surrounding lead-in prose are permitted; the canonical block itself must match exactly.
  - Search `agents/` and `skills/` for the pre-existing narrower line *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* and confirm zero occurrences remain.
  - If any copy diverges, fix that copy to match the Task 1 canonical block exactly.
- **Depends on:** Task 1, Task 3, Task 4, Task 5, Task 6, Task 7.
- **Traces to:** Spec Req 10, Req 11; Design "Decision: The canonical rules live in agent profiles, duplicated verbatim", "Failure Modes … Drift between the duplicated copies", design-review note (1) "pin ONE authoritative copy … and have every carrying profile receive it byte-identically"; Acceptance "Single source and consistency".
- **Acceptance:**
  - The canonical Rule 1 + Rule 2 block is byte-identical across all five carrying profiles.
  - The narrower line *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* exists nowhere in `agents/` or `skills/`.
  - No second, narrower, or conflicting statement of Rule 1 or Rule 2 survives in any of the five profiles.
