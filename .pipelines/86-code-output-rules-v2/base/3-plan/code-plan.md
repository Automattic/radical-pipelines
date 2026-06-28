# Code Plan: Default output rules for pipeline-produced code

## Overview

This feature makes two output qualities permanent, always-on rules of the tool: **Rule 1** — a change leaves untouched comments and unrelated prose exactly as they were; and **Rule 2** — the shipped host-project product (source, tests, inline and external documentation, and the commit messages that ship them) reads as if written by hand, with no trace of the pipeline that produced it. The realization ships **no code and no runtime mechanism**: it is an edit to the tool's *instructions* — the Markdown agent profiles under `agents/`. The rules become standing text in the profiles of the five agents that touch host-project product (the three producers and the two reviewers); earlier-phase artifact-only agents are untouched. The work is ordered so the canonical wording is settled first (Task 1), then duplicated byte-identically into the three producing profiles together with the product-commit no-provenance constraint (Tasks 2–4), then into the two reviewing profiles together with the must-fix enforcement item and product-commit-message inspection (Tasks 5–6). Because the change is instruction prose and not running code, verification is by reading the profiles and confirming the canonical block is byte-identical across all five and that the narrower pre-existing variant is gone — captured here as e2e flows that the reviewer manually re-drives (there is no executable suite to add).

## Guardrail scopes

None.

## E2E test plan

This feature ships no executable code, so these flows are **inspection flows over the five edited profiles and the repository as a whole**. Each is concrete enough for the reviewer to manually re-drive by reading files and running text searches. There is no automated suite to extend; the `code-writer-e2e` agent realizes these as repository-inspection checks per the host testing convention, and the reviewer manually re-drives each one.

The five profiles in scope are:
- Producing: `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md`
- Reviewing: `agents/code-reviewer.md`, `agents/docs-reviewer.md`

### Flow 1: The canonical rules block is present and byte-identical across all five profiles

- **Steps:**
  1. Open each of the five in-scope profiles.
  2. Locate the canonical Rule 1 + Rule 2 block in each.
  3. Extract the canonical block from each profile and compare the five extracted blocks against one another (e.g. byte-for-byte diff of the extracted spans).
- **Expected:** Every one of the five profiles contains the canonical block, and all five extracted instances are byte-identical to one another (same wording, same ordering, same punctuation). No profile carries a paraphrased or narrower variant of the block.
- **Traces to:** Acceptance criterion "Single source and consistency" (rules expressed once and consistently); Requirement 10, Requirement 11.

### Flow 2: The pre-existing narrower Rule 2 statement no longer exists anywhere

- **Steps:**
  1. Search the whole repository (at minimum `agents/` and `skills/`) for the narrower sentence `Comments must be self-contained — never reference the spec, the plan, or any other artifact.`
  2. Inspect `agents/code-writer-tdd.md` around its former location (previously the inline-documentation list of the implement workflow).
- **Expected:** The narrower sentence appears nowhere in the repository. In `agents/code-writer-tdd.md`, the only statement governing comment/identifier/string/log references is the canonical Rule 2; there is no separate, overlapping narrower version.
- **Traces to:** Acceptance criterion "Single source and consistency"; Requirement 11.

### Flow 3: Rule 2's referent-based discriminator is stated, with a not-a-violation example

- **Steps:**
  1. In each of the five profiles, read the canonical Rule 2 statement.
  2. Confirm it frames the violation by **referent** (a reference violates only if it identifies the concrete pipeline run that produced this output) and includes at least one concrete *"this is NOT a violation"* example (e.g. a `spec.md` filename literal or an illustrative `.pipelines/<slug>/.../spec.md` path) covering legitimate pipeline vocabulary, methodology documentation, artifact-type names, and illustrative paths — explicitly including in the self-hosting Radical Pipelines repository.
- **Expected:** The canonical Rule 2 in every profile carries the one-line referent-based decisive test and the negative example; it does not present the violation signals as a token/keyword/path checklist.
- **Traces to:** Acceptance criteria "Rule 2 — content", "Rule 2 — referent-based discriminator"; Requirements 4, 5, 6; Out of Scope 2.

### Flow 4: Producing profiles carry the product-commit no-provenance constraint; reviewing profiles do not

- **Steps:**
  1. In each producing profile (`code-writer-tdd.md`, `code-writer-e2e.md`, `docs-writer.md`), read the commit step.
  2. In each reviewing profile (`code-reviewer.md`, `docs-reviewer.md`), read the commit step.
- **Expected:** Each producing profile's commit step instructs the agent to follow the host commit format **but omit the pipeline-naming provenance** (no agent-name provenance tag, no phase/artifact/task naming). Each reviewing profile's commit step is unchanged and still applies the host commit format in full (including the agent-name provenance tag) to its artifact-only commits.
- **Traces to:** Acceptance criteria "Rule 2 — commit messages and provenance"; Requirements 7, 8, 9.

### Flow 5: Reviewing profiles enforce both rules as must-fix and inspect product-commit messages

- **Steps:**
  1. In `code-reviewer.md` and `docs-reviewer.md`, read the step-2 "Review the changes" checklist.
- **Expected:** Each reviewing profile's step-2 checklist contains an item that (a) checks the batch for Rule 1 and Rule 2 violations applying the referent-based discriminator, (b) treats any found violation as a must-fix issue (reusing the existing every-issue-is-must-fix / reject-liberally machinery, so a recorded violation forces a `rejected` verdict and withholds the approval artifact), and (c) inspects product-commit messages for pipeline-naming provenance leaks.
- **Traces to:** Acceptance criterion "Enforcement"; Requirements 10, 12.

### Flow 6: Artifact-only producing/reviewing scope is preserved — no rules leak into earlier-phase profiles

- **Steps:**
  1. Search `agents/` for the canonical block and the product-commit no-provenance constraint.
- **Expected:** The canonical block and the no-provenance constraint appear **only** in the five in-scope profiles. The earlier-phase artifact-only profiles (spec/design/plan writers, analysts, researchers, consolidators, and their reviewers) are untouched and still apply the host commit format in full to their artifact commits.
- **Traces to:** Requirements 1, 8, 10; design decision "Scope by the product/artifact boundary".

## Tasks

### Task 1: Author the canonical Rule 1 + Rule 2 block as the single source of wording

- **Goal:** Settle the single authoritative prose for the canonical Rule 1 + Rule 2 block — the exact bytes that Tasks 2–6 copy verbatim into the five profiles. This task produces the wording by embedding the first copy into the first producing profile so a concrete, reviewable instance exists; Tasks 2–6 copy from this instance.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md`
- **Changes:**
  - Compose one canonical block stating both rules, following the house template the existing profiles use for a fine semantic line (a named rule, a one-line decisive criterion, a concrete *"this is NOT a violation"* example, then the action). The block must contain:
    - **Rule 1** — keyed to the touched-vs-untouched axis: do not reword, reflow, reformat, or tidy a comment attached to code the change does not modify, or a prose section of a documentation file the change edits but does not otherwise touch; leave such untouched comments and unrelated prose exactly as they were. State both the permitted case (updating a comment or prose that belongs to content the change *is* modifying is allowed) and the no-duty case (there is no duty to preserve a still-valid comment beside changed code). State that Rule 1 does not apply to commit messages.
    - **Rule 2** — the host-project product is transparent to the pipeline: no part of the shipped product (comments, identifiers and names, string literals, log and error messages, inline API documentation, and external documentation) references this run's pipeline, its phases, its artifacts, its plan tasks, or its agents, nor narrates the writing agent's own process, nor claims the output was produced by the pipeline. Frame the decisive test by **referent**: a reference violates Rule 2 only if it identifies the concrete pipeline instance that produced this output. Include the mental check ("Is this reference about the subject matter of the product, or about the process that produced this artifact?") and at least one concrete *"this is NOT a violation"* example (a `spec.md` filename literal or an illustrative `.pipelines/<slug>/.../spec.md` path), noting legitimate pipeline vocabulary, methodology documentation, and artifact-type names are never violations — explicitly including in the self-hosting Radical Pipelines repository. Present the observable tells of a violating referent as illustrations, never as a token/keyword/path checklist.
  - Place this canonical block into `agents/code-writer-tdd.md` in the implement workflow, **replacing** the existing narrower line at the inline-documentation list: `- Comments must be self-contained — never reference the spec, the plan, or any other artifact.` The canonical block subsumes and broadens this line.
  - Within this profile, the surrounding context (its inline-API-documentation focus) may introduce the block, but the canonical block's own wording must stand as a self-contained, copyable unit so Tasks 2–6 reproduce it byte-identically.
  - Do not alter this profile's commit step in this task (that is Task 2).
- **Depends on:** none
- **Traces to:** Requirement 11 (stated once and consistently; narrower variant gone), Requirements 2, 3, 4, 5, 6; design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Replace the pre-existing narrower Rule 2 line with the canonical Rule 2", "Rule 2 is expressed as a referent-based test", "Rule 1 is a content-discipline rule".
- **Acceptance:**
  - `agents/code-writer-tdd.md` contains a single self-contained canonical block stating both Rule 1 and Rule 2.
  - The block states Rule 1 on the touched-vs-untouched axis and includes both the permitted (naturally-updated comment) and the no-duty (still-valid comment) cases, and states that Rule 1 does not apply to commit messages.
  - The block states Rule 2 covering comments, identifiers/names, string literals, log/error messages, inline API documentation, and external documentation, and frames it by referent with at least one concrete *"not a violation"* example and the subject-matter-vs-process mental check.
  - The block presents violation tells as illustrations, not as a token/keyword/path checklist.
  - The sentence `Comments must be self-contained — never reference the spec, the plan, or any other artifact.` no longer appears anywhere in the repository.

### Task 2: Add the product-commit no-provenance constraint to `code-writer-tdd`

- **Goal:** Make the `code-writer-tdd` profile author its product commits with the host commit format minus the pipeline-naming provenance.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md`
- **Changes:**
  - In the commit step ("4. Commit and report", item 1), add a one-line constraint: the agent authors its commit message in the host commit format **but omits the pipeline-naming provenance** — no agent-name provenance tag, no naming of a phase, artifact, plan task, or agent. Phrase it as a property of the message (drop the provenance), independent of the host's specific format, so it holds regardless of artifact storage mode.
  - Do not change any guardrails, the workflow ordering, or the canonical block placed in Task 1.
- **Depends on:** Task 1
- **Traces to:** Requirement 7 (product commit carries no pipeline-naming provenance / no agent-name tag, regardless of storage mode and host format), Requirement 9 (rule and host commit format do not contradict); design decision "Strip pipeline-naming provenance from product commits at authoring time".
- **Acceptance:**
  - The `code-writer-tdd` commit step instructs the agent to apply the host commit format but omit the pipeline-naming provenance (no agent-name tag; no phase/artifact/task naming).
  - The constraint is expressed as a property of the product commit message, not as a rewrite of the host commit format, and does not reference any specific host format.

### Task 3: Add the canonical block and product-commit constraint to `code-writer-e2e`

- **Goal:** Give the `code-writer-e2e` profile the same canonical Rule 1 + Rule 2 block (byte-identical to Task 1's) and the product-commit no-provenance constraint, with surrounding context that reads sensibly for an agent whose product is test code.
- **Type:** tdd
- **Files to change:** `agents/code-writer-e2e.md`
- **Changes:**
  - Copy the canonical block from `agents/code-writer-tdd.md` **byte-identically** into `agents/code-writer-e2e.md`, in a sensible location within its implement workflow (this profile has no inline-API-docs step; surrounding context should make clear its product is e2e test code — comments, string literals, identifiers in tests — but the canonical block's own wording must not change).
  - In its commit step ("4. Commit and report", item 1), add the same one-line product-commit no-provenance constraint as Task 2: author in the host commit format but omit the pipeline-naming provenance.
- **Depends on:** Task 1 (must copy the settled wording); Task 2 supplies the exact constraint phrasing to mirror.
- **Traces to:** Requirements 4, 5, 6, 7, 9, 10, 11; design decisions "duplicated verbatim", "Strip pipeline-naming provenance from product commits"; design doc open question "`code-writer-e2e` fit".
- **Acceptance:**
  - `agents/code-writer-e2e.md` contains the canonical Rule 1 + Rule 2 block byte-identical to the instance in `agents/code-writer-tdd.md`.
  - The block's surrounding context reads sensibly for an agent whose product is test code, without altering the canonical block's wording.
  - The `code-writer-e2e` commit step instructs the agent to apply the host commit format but omit the pipeline-naming provenance.

### Task 4: Add the canonical block and product-commit constraint to `docs-writer`

- **Goal:** Give the `docs-writer` profile the same canonical Rule 1 + Rule 2 block (byte-identical to Task 1's) and the product-commit no-provenance constraint, scoped naturally to documentation surfaces.
- **Type:** tdd
- **Files to change:** `agents/docs-writer.md`
- **Changes:**
  - Copy the canonical block from `agents/code-writer-tdd.md` **byte-identically** into `agents/docs-writer.md`, in a sensible location (e.g. the Draft step or the Guidelines), with surrounding context making clear this agent's product is external documentation and non-symbol inline narrative; the canonical block's own wording must not change.
  - In its commit step ("5. Commit and report", item 1), add the same one-line product-commit no-provenance constraint as Task 2: author in the host commit format but omit the pipeline-naming provenance.
- **Depends on:** Task 1 (must copy the settled wording); Task 2 supplies the exact constraint phrasing to mirror.
- **Traces to:** Requirements 4, 5, 6, 7, 9, 10, 11; design decisions "duplicated verbatim", "Strip pipeline-naming provenance from product commits".
- **Acceptance:**
  - `agents/docs-writer.md` contains the canonical Rule 1 + Rule 2 block byte-identical to the instance in `agents/code-writer-tdd.md`.
  - The block's surrounding context reads sensibly for an agent whose product is external documentation, without altering the canonical block's wording.
  - The `docs-writer` commit step instructs the agent to apply the host commit format but omit the pipeline-naming provenance.

### Task 5: Add the canonical block plus must-fix enforcement and commit inspection to `code-reviewer`

- **Goal:** Give the `code-reviewer` profile the same canonical Rule 1 + Rule 2 block (byte-identical to Task 1's) plus an enforcement item in its step-2 checklist that treats a Rule 1 or Rule 2 violation as must-fix and inspects product-commit messages for provenance leaks.
- **Type:** tdd
- **Files to change:** `agents/code-reviewer.md`
- **Changes:**
  - Copy the canonical block from `agents/code-writer-tdd.md` **byte-identically** into `agents/code-reviewer.md` (including the referent-based discriminator), placed so the reviewer reads it before applying the checklist.
  - Add a must-fix item to the step-2 "Review the changes" checklist: check the batch for Rule 1 and Rule 2 violations applying the referent-based discriminator, and inspect the product-commit messages for pipeline-naming provenance leaks; a found violation is recorded as a must-fix issue, which (via the existing every-issue-is-must-fix / reject-liberally machinery) forces a `rejected` verdict and withholds the approval artifact.
  - Do not change the reviewer's own commit step (the reviewer commits only artifact files and keeps the host commit format in full, including the provenance tag). Do not add any mechanical token/keyword/path scan.
- **Depends on:** Task 1 (must copy the settled wording).
- **Traces to:** Requirement 12 (a violation blocks completion; review gate is the only route; a seen violation cannot be approved), Requirements 6, 7, 10; design decisions "Enforcement reuses the existing review gate", "Scope by the product/artifact boundary".
- **Acceptance:**
  - `agents/code-reviewer.md` contains the canonical Rule 1 + Rule 2 block byte-identical to the instance in `agents/code-writer-tdd.md`, including the referent-based discriminator.
  - The step-2 "Review the changes" checklist contains a must-fix item enforcing Rule 1 and Rule 2 via the referent-based discriminator and inspecting product-commit messages for provenance leaks.
  - The item reuses the existing must-fix / reject-liberally machinery (a found violation forces `rejected` and withholds the approval artifact) and introduces no mechanical token/keyword/path scan.
  - The `code-reviewer` commit step is unchanged (artifact commits keep the full host commit format including the provenance tag).

### Task 6: Add the canonical block plus must-fix enforcement and commit inspection to `docs-reviewer`

- **Goal:** Give the `docs-reviewer` profile the same canonical Rule 1 + Rule 2 block (byte-identical to Task 1's) plus the same step-2 enforcement item and product-commit-message inspection.
- **Type:** tdd
- **Files to change:** `agents/docs-reviewer.md`
- **Changes:**
  - Copy the canonical block from `agents/code-writer-tdd.md` **byte-identically** into `agents/docs-reviewer.md` (including the referent-based discriminator).
  - Add the same must-fix item to the step-2 "Review the changes" checklist as Task 5: check the batch for Rule 1 and Rule 2 violations applying the referent-based discriminator, and inspect product-commit messages for pipeline-naming provenance leaks; a found violation is a must-fix issue forcing a `rejected` verdict and withholding the approval artifact.
  - Do not change the reviewer's own commit step. Do not add any mechanical scan.
- **Depends on:** Task 1 (must copy the settled wording); Task 5 supplies the exact enforcement-item phrasing to mirror.
- **Traces to:** Requirement 12, Requirements 6, 7, 10; design decisions "Enforcement reuses the existing review gate", "Scope by the product/artifact boundary".
- **Acceptance:**
  - `agents/docs-reviewer.md` contains the canonical Rule 1 + Rule 2 block byte-identical to the instance in `agents/code-writer-tdd.md`, including the referent-based discriminator.
  - The step-2 "Review the changes" checklist contains a must-fix item enforcing Rule 1 and Rule 2 via the referent-based discriminator and inspecting product-commit messages for provenance leaks.
  - The item reuses the existing must-fix / reject-liberally machinery and introduces no mechanical token/keyword/path scan.
  - The `docs-reviewer` commit step is unchanged (artifact commits keep the full host commit format including the provenance tag).

### Task 7: Verify cross-profile consistency and scope of the canonical block

- **Type:** e2e
- **Goal:** Confirm, by repository inspection, that the canonical block is byte-identical across all five in-scope profiles, that the narrower pre-existing Rule 2 statement is gone, that the product-commit constraint and canonical block appear only in the in-scope profiles, and that the reviewing profiles carry the must-fix enforcement item — realizing E2E test plan Flows 1–6.
- **Files to change:** No production files. Realize Flows 1–6 as repository-inspection checks per the host testing convention. If the host project has no executable test surface for Markdown profiles, the realization is the documented inspection procedure (file reads plus text searches) that the reviewer manually re-drives; capture the evidence (the extracted canonical blocks compared, the empty search result for the narrower sentence, the scope search results).
- **Changes:** Implement the inspection checks for E2E test plan Flows 1, 2, 3, 4, 5, and 6 against the five edited profiles and the repository.
- **Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
- **Traces to:** Requirements 1, 10, 11, 12; design decisions "duplicated verbatim", "Scope by the product/artifact boundary"; design doc risk "Drift between the duplicated copies". E2E test plan Flows 1–6.
- **Acceptance:**
  - Flow 1 passes: the canonical block is present in all five in-scope profiles and byte-identical across them.
  - Flow 2 passes: the sentence `Comments must be self-contained — never reference the spec, the plan, or any other artifact.` appears nowhere in the repository, and `agents/code-writer-tdd.md` carries only the canonical Rule 2.
  - Flow 3 passes: each profile's Rule 2 states the referent-based decisive test with a not-a-violation example and is not a token/keyword/path checklist.
  - Flow 4 passes: the three producing profiles carry the product-commit no-provenance constraint; the two reviewing profiles' commit steps are unchanged.
  - Flow 5 passes: both reviewing profiles' step-2 checklists carry the must-fix enforcement item with product-commit-message inspection.
  - Flow 6 passes: the canonical block and the no-provenance constraint appear only in the five in-scope profiles; earlier-phase artifact-only profiles are untouched.
