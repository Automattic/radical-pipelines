# Code Plan: Default output rules for generated code

## Overview

This feature promotes two always-on output rules into the Radical Pipelines tool itself so every run gets them for free, with no owner action and no opt-out. Rule 1 forbids tidying comments or prose belonging to content a change did not touch; Rule 2 forbids the shipped host-project product (code, tests, inline and external docs, and product commit messages) from referencing this run's pipeline, its phases, its artifacts, or its agents. The host project here is Radical Pipelines itself, a prompt/skill system, so the work is entirely edits to the tool's own skill reference files and agent prompt files — no runtime code.

The plan realizes the approved design as a sequence of prose edits. Task 1 creates the single canonical statement of both rules in a new skill reference file (`output-rules.md`). Tasks 2-3 reconcile the commit-format convention so the agent-name provenance tag is documented as belonging to artifact-only commits, not product commits (the convention text in `setup.md`, then the in-repo host format in `.rp.md`) — this must land before the writer commit steps so the three coordinated files stay consistent. Tasks 4-6 update the three producing writer profiles (the shared obey-and-self-check obligation under the name-handle "the output rules", the reworded commit step, and — for `code-writer-tdd` — removal of the superseded narrower line). Tasks 7-8 update the two reviewer profiles (new gather-context input: the batch's commit messages; new "Output rules" checklist entry). Task 9 wires the canonical file into the two phase files so the orchestrator hands its resolved content to the reviewers, mirroring the existing `summary-format.md` delivery channel. Tasks are ordered so each task's dependencies land first; tasks within the same group are independent of one another but ordered for a single sequential working tree.

Two cross-cutting constraints from the project's own rules govern every task: the skill must be minimalist (state the instruction, not the reasoning; no needless negative phrasing), and it must stay free of duplication across reading paths — the operative rule text lives once in `output-rules.md`, and the profile restatements use the shared name-handle "the output rules" exactly as profiles already restate "the workflow's blocker protocol". A profile must never reference a skill file or `.rp.md`; it reads only itself and its launch prompt.

Naming convention used throughout this plan (settled here so writers need not choose): the two rules are referred to collectively by the name-handle **"the output rules"**, and individually as **"Rule 1"** (leave unchanged comments and prose untouched) and **"Rule 2"** (the host-project product is transparent to the pipeline). These names are used consistently in the canonical file and in all five profile restatements.

## Tasks

### Task 1: Create the canonical `output-rules.md` reference file

- **Goal:** Create the single authoritative statement of both output rules as a new skill reference file, to be reached by name (the `summary-format.md` pattern) and never referenced by an agent profile.
- **Files to change:**
  - Create `skills/radical-pipelines/reference/output-rules.md`.
- **Changes:** Write a new minimalist reference file. It is the single source of truth for both rules. Include, in prose consistent with the existing reference files (e.g. `summary-format.md`):
  - A short title and one-line framing: these are tool-default rules applied to every run's host-project output, always-on, with no override.
  - A definition of "host-project product": the source code, tests, inline and external documentation, and the commit messages a run ships into the host repository — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews, and other files the pipeline writes about its own process).
  - **Rule 1 (leave unchanged comments and prose untouched):** its name/handle and obligation — a change must not reword, reflow, reformat, or otherwise tidy comments attached to code the change did not modify, or prose sections of a documentation file the change edits but did not otherwise touch. Its reach: wherever comments or prose exist in a file the change edits. Its carve-out: content the change itself touched is exempt — a comment or prose naturally updated alongside the code/section being changed is not a violation; the rule targets content the change did *not* touch, and imposes no duty to preserve a still-valid comment beside changed code. Note that commit messages carry no pre-existing comments or prose, so Rule 1 does not apply to them.
  - **Rule 2 (the host-project product is transparent to the pipeline):** its name/handle and obligation — the shipped product must not reference this run's pipeline, its phases, its artifacts, or its agents, or narrate the writing agent's own process, anywhere in its content; it must read as if written by hand. Its total reach: code comments, identifiers and names, string literals, log and error messages, inline API documentation, and external documentation — not only the commit message.
  - **Rule 2's referent-based "this-run" discriminator** (the carve-out that prevents over-reach). Rule 2 flags only references whose referent is *this run's* pipeline process, artifacts, or agents — not the vocabulary. Enumerate the forbidden cases: (1) a pointer to this run's actual artifact files or artifacts-folder path (e.g. the concrete `.pipelines/<this-run-slug>/.../spec.md`); (2) a reference to a phase or plan task of this run (e.g. "implements task 4.2 of this code plan", "in the Docs phase"); (3) narration of the writing agent's own task or process (e.g. a comment explaining code in terms of the task the agent was given); (4) any claim the output was produced by the pipeline or its agents, including an agent-name provenance tag. State explicitly that it does **not** flag the tool's vocabulary, nor a host project documenting pipeline concepts or its own artifact *types* in general. Carry the type-level-vs-this-run distinction with the self-hosting Radical Pipelines repository as the worked example: its `README.md`, `website/`, and skill files legitimately use "spec / design doc / plan / pipeline / phases / artifacts" and name the agents as product documentation, and these must pass; a comment like "// added per task 3 of the code plan" fails the referent test and is correctly flagged.
  - **The commit-message clause (R6):** Rule 2 applies to the message of any commit that introduces host-project product — no pipeline-naming provenance, including no agent-name provenance tag. A commit that changes only pipeline artifacts (files under the pipeline's artifacts folder) is exempt and may reference the pipeline freely; this boundary holds the same whether artifacts live in a separate fork or directly in the upstream repository.
  - **The enforcement note:** the Code/Docs phase reviewers (`code-reviewer`, `docs-reviewer`) gate on these rules; a violation is a must-fix that blocks the phase from completing.
- **Depends on:** none
- **Traces to:** Design "One canonical statement of both rules" / Decision "Canonical home is a new `reference/output-rules.md`"; Spec R7 / AC8 (stated once), R2/R3/R5 (rule content and reach), R4/AC6 (this-run discriminator), R6/AC9 (commit-message clause), R8/AC7 (enforcement note).
- **Acceptance:**
  - A new file `skills/radical-pipelines/reference/output-rules.md` exists.
  - The file states both rules by the names "Rule 1" and "Rule 2" and the collective handle "the output rules", and defines "host-project product".
  - Rule 1's text states the no-tidy obligation, its reach across comments and prose in an edited file, and the carve-out for content the change itself touched, and notes Rule 1 does not apply to commit messages.
  - Rule 2's text states the no-reference obligation and lists the full reach (comments, identifiers/names, string literals, log/error messages, inline API docs, external docs).
  - Rule 2's text states the referent-based this-run discriminator with the four enumerated forbidden cases, explicitly excludes the tool's vocabulary and type-level host documentation, and uses the self-hosting repository (README/website) as the worked example.
  - The file states the commit-message clause: no pipeline-naming provenance (including no agent-name tag) on product commits; artifact-only commits exempt; boundary identical in fork and in-repo storage.
  - The file states that the Code/Docs reviewers gate on these rules and a violation blocks phase completion.
  - The file contains no instruction telling any agent profile to read it.

### Task 2: Reconcile the commit-format convention in `setup.md`

- **Goal:** Reconcile the tool's commit-format convention guidance so the `(agent-name)` provenance tag is documented as belonging to artifact-only commits, not to commits that introduce host-project product.
- **Files to change:**
  - `skills/radical-pipelines/reference/conventions/setup.md` (the "Commit format" subsection, lines 54-60).
- **Changes:** Edit the "Commit format" subsection so its guidance and suggested default distinguish two commit kinds:
  - Commits that introduce host-project product (code or external documentation) carry **no** pipeline-naming provenance — no agent-name tag.
  - Commits that change only pipeline artifacts may carry the agent-name provenance tag.
  Reword the existing "Suggested default: `<commit-description> (<agent-name>)`" so the agent-name tag is shown as the default for artifact-only commits, and the product-commit default carries no such tag. Keep the subsection minimalist — state the distinction once, do not restate Rule 2's full definition here (that lives in `output-rules.md`). Preserve the existing instruction to ask the owner for the format and capture a concrete example.
- **Depends on:** none
- **Traces to:** Design Decision "Confine the provenance tag to artifact-only commits; R6 is part of Rule 2's reach" (file (i): the convention `setup.md`); Spec R6 / AC9.
- **Acceptance:**
  - The "Commit format" subsection of `setup.md` documents that product commits carry no agent-name provenance tag and artifact-only commits may carry it.
  - The suggested default no longer puts the agent-name tag on product commits.
  - The subsection still instructs the owner to provide the format and a concrete example.
  - The subsection does not duplicate the full Rule 2 / referent-discriminator definition (it states the commit distinction only).

### Task 3: Reconcile the in-repo host commit format in `.rp.md`

- **Goal:** Reconcile the Radical Pipelines repository's own commit-format convention so it does not mandate the agent-name parenthetical on product commits, preventing the tool from flagging its own product commits.
- **Files to change:**
  - `.rp.md` (the "Commit format" subsection, lines 49-58).
- **Changes:** Edit the "Commit format" subsection so the agent-name parenthetical (or `assisted`) is documented as belonging to **artifact-only** commits, while commits that introduce host-project product (code or external documentation) carry **no** agent-name provenance tag. Keep the existing imperative-mood / sentence-case / no-trailing-period rules unchanged — only the provenance-tag scope changes. Adjust the examples so they illustrate both kinds: an artifact-only commit retaining the tag (e.g. `Add intent (orchestrator)`) and a product commit without a tag. Keep it consistent in meaning with the reconciled `setup.md` convention from Task 2, but written as this repo's own host config (this file is the host format, not the tool convention).
- **Depends on:** Task 2 (the two must express the same reconciled meaning; `setup.md` is the tool convention, `.rp.md` is this host's instance of it).
- **Traces to:** Design Decision "Confine the provenance tag to artifact-only commits…" (file (ii): the in-repo host format `.rp.md`); Spec R6 / AC9; R4/AC6 (so the self-hosting repo is not flagged for its own product commits).
- **Acceptance:**
  - The "Commit format" subsection of `.rp.md` documents that product commits carry no agent-name provenance tag, and artifact-only commits keep the agent-name (or `assisted`) tag.
  - The imperative-mood, sentence-case, no-trailing-period rules are unchanged.
  - The examples illustrate both an artifact-only commit (with tag) and a product commit (without tag).
  - The reconciled meaning matches the `setup.md` convention from Task 2.

### Task 4: Update `code-writer-tdd.md` — obey/self-check obligation, reworded commit step, remove superseded line

- **Goal:** Give `code-writer-tdd` the shared obey-both-output-rules-and-self-check obligation under the name-handle "the output rules", reword its commit step so the no-provenance and host-format instructions cohere, and remove the superseded narrower Rule 2 line.
- **Files to change:**
  - `agents/code-writer-tdd.md` (line 33; the commit step at line 49; and a new obligation in the Guidelines or workflow, mirroring the blocker-protocol restatement placement).
- **Changes:**
  - **Remove** line 33 (`- Comments must be self-contained — never reference the spec, the plan, or any other artifact.`) from the inline-documentation bullet list in step 2. It is superseded by the new consistent statement; no overlapping narrower version may survive.
  - **Add** an obligation, stated under the name-handle "the output rules", that the writer obeys both output rules (Rule 1: leave unchanged comments and prose untouched; Rule 2: no reference to this run's pipeline, its phases, artifacts, or agents, anywhere in code, identifiers, string literals, log/error messages, or inline docs) and **self-checks its own output for both rules before committing**. State the operative obligation in the profile itself (the profile must not reference `output-rules.md`), consistent in wording with the other writer profiles and tied by the shared handle, exactly as the profile already restates "the workflow's blocker protocol". Keep it minimalist.
  - **Reword** the commit step (line 49) so its commit-message guidance is internally consistent: product commit messages carry no pipeline-naming provenance (no agent-name tag), and otherwise follow the host project's commit format. Preserve the existing "Group changes logically. Only commit when every gate passes." instruction.
- **Depends on:** Task 1 (the canonical names/obligation the restatement must match), Task 3 (so the reworded commit step and the host `.rp.md` no longer conflict for this repo).
- **Traces to:** Design "Role-specific obligations restated in the five profiles" + "Removal of the pre-existing narrower Rule 2 line" + writer commit-step rewording; Spec R7/AC8 (consistent statement, narrower line removed), R2/R3/R5 (writer obeys both rules), R6 (product commit no provenance), R8 (self-check as prevention).
- **Acceptance:**
  - `code-writer-tdd.md` no longer contains the line "Comments must be self-contained — never reference the spec, the plan, or any other artifact."
  - `code-writer-tdd.md` states, under the handle "the output rules", that the writer obeys both Rule 1 and Rule 2 and self-checks its output for both before committing.
  - The obligation text does not reference `output-rules.md` or any other skill file.
  - The commit step states that product commit messages carry no pipeline-naming provenance and otherwise follow the host commit format, and retains the group-logically / gates-pass instructions.
  - The restatement uses the same rule names ("Rule 1"/"Rule 2"/"the output rules") as Task 1's canonical file.

### Task 5: Update `code-writer-e2e.md` — obey/self-check obligation and reworded commit step

- **Goal:** Give `code-writer-e2e` the same shared obey-and-self-check obligation under "the output rules", and reword its commit step to cohere with the no-provenance obligation.
- **Files to change:**
  - `agents/code-writer-e2e.md` (the commit step at line 40; and a new obligation in the Guidelines, mirroring Task 4).
- **Changes:**
  - **Add** the same "the output rules" obey-and-self-check obligation as in Task 4, worded consistently with `code-writer-tdd` (scoped to this agent's output: e2e test code, identifiers, string literals, log/error messages, and any inline docs the test convention expects). State it in the profile; do not reference any skill file. Keep it minimalist.
  - **Reword** the commit step (line 40) so product commit messages carry no pipeline-naming provenance and otherwise follow the host commit format. Preserve "Group changes logically. Only commit when every gate passes."
- **Depends on:** Task 1, Task 3. (Independent of Task 4; ordered after it for consistent wording in a single working tree.)
- **Traces to:** Design "Role-specific obligations restated in the five profiles" + writer commit-step rewording; Spec R7/AC8, R2/R3/R5, R6, R8.
- **Acceptance:**
  - `code-writer-e2e.md` states, under the handle "the output rules", that the writer obeys both Rule 1 and Rule 2 and self-checks its output for both before committing.
  - The obligation text does not reference any skill file.
  - The commit step states that product commit messages carry no pipeline-naming provenance and otherwise follow the host commit format, and retains the group-logically / gates-pass instructions.
  - The wording is consistent with `code-writer-tdd.md`'s restatement and uses the same rule names.

### Task 6: Update `docs-writer.md` — obey/self-check obligation and reworded commit step

- **Goal:** Give `docs-writer` the same shared obey-and-self-check obligation under "the output rules", and reword its commit step to cohere with the no-provenance obligation.
- **Files to change:**
  - `agents/docs-writer.md` (the commit step at line 52; and a new obligation in the Guidelines, mirroring Task 4).
- **Changes:**
  - **Add** the same "the output rules" obey-and-self-check obligation, worded consistently with the two code writers but scoped to documentation output: Rule 1 over comments/prose the change did not touch in an edited doc file, and Rule 2 over all external documentation content. State it in the profile; do not reference any skill file. Keep it minimalist.
  - **Reword** the commit step (line 52) so product commit messages carry no pipeline-naming provenance and otherwise follow the host commit format. Preserve "Group changes logically. Only commit when every gate passes."
- **Depends on:** Task 1, Task 3. (Independent of Tasks 4-5; ordered after them for consistent wording in a single working tree.)
- **Traces to:** Design "Role-specific obligations restated in the five profiles" + writer commit-step rewording; Spec R7/AC8, R2/R3/R5, R6, R8.
- **Acceptance:**
  - `docs-writer.md` states, under the handle "the output rules", that the writer obeys both Rule 1 and Rule 2 and self-checks its output for both before committing.
  - The obligation text does not reference any skill file.
  - The commit step states that product commit messages carry no pipeline-naming provenance and otherwise follow the host commit format, and retains the group-logically / gates-pass instructions.
  - The wording is consistent with the two code-writer restatements and uses the same rule names.

### Task 7: Update `code-reviewer.md` — commit-messages gather-context input and "Output rules" check

- **Goal:** Give `code-reviewer` the data and the checklist entry to enforce the output rules: a new gather-context input (the batch's commit messages) and an "Output rules" entry in its step-2 review checklist.
- **Files to change:**
  - `agents/code-reviewer.md` (step 1 "Gather context", after the diff input at line 19; step 2 "Review the changes" checklist, lines 23-31).
- **Changes:**
  - **Add a gather-context input** in step 1, alongside the existing "Inspect the diff for the batch (base ref → current HEAD)": the batch's commit messages — the base→HEAD `git log` — as an explicit, separate input, since the diff carries no commit messages. State it as a distinct step, not folded into "inspect the diff".
  - **Add an "Output rules" entry** to the step-2 checklist (the list that already covers Acceptance coverage, design alignment, plan adherence, test quality, inline docs, convention compliance). The entry directs the reviewer to apply the output rules from its launch prompt over two inputs: (a) the batch diff — Rule 1 (no tidying of comments/prose belonging to content the change did not touch) and Rule 2 (no reference to this run's pipeline, phases, artifacts, or agents, and no process/provenance narration, anywhere in code, identifiers, string literals, log/error messages, or inline docs), applying the referent-based this-run discriminator so legitimate host vocabulary (including this self-hosting repo's own README/website) is not flagged; and (b) the batch's commit messages — Rule 2's commit clause (R6). State that within this batch every commit is a product commit (the writers commit only host-project product, never pipeline artifacts), so the commit-message check is simply "no pipeline-naming provenance (including no agent-name tag) on any commit in the batch"; the reviewer runs no per-commit artifact-vs-product discriminator here. Refer to the rules by the handle "the output rules from your launch prompt", mirroring how step 5 already refers to "the summary format from your launch prompt" — do not name the skill file. A finding flows through the existing Issues schema (a must-fix issue tagged to the offending task) and rejection path with no structural change.
- **Depends on:** Task 1 (defines the rules and the discriminator the reviewer applies), Task 9 (the phase file that actually inlines the rules into the launch prompt — but the profile edit references "your launch prompt" so it does not require Task 9 to be present in the file; ordered before Task 9 is acceptable, the dependency is logical not textual). Mark **Depends on: Task 1**.
- **Traces to:** Design "Reviewer profiles" (new gather-context input + "Output rules" checklist entry) / Decision "Reviewer-style enforcement…"; Spec R8/AC7 (enforcement), AC4 (code content), AC5 (commit messages), R6/AC9, R4/AC6 (discriminator).
- **Acceptance:**
  - `code-reviewer.md` step 1 lists the batch's commit messages (base→HEAD `git log`) as an explicit gather-context input, distinct from the diff.
  - `code-reviewer.md` step 2 contains an "Output rules" checklist entry covering Rule 1 and Rule 2 over the batch diff and Rule 2's commit clause over the batch's commit messages.
  - The entry states the within-batch simplification (every commit is a product commit; check is "no pipeline-naming provenance on any commit in the batch"; no per-commit artifact discriminator).
  - The entry instructs applying the referent-based this-run discriminator so legitimate host vocabulary is not flagged.
  - The entry refers to the rules via "your launch prompt" / the "the output rules" handle and does not name `output-rules.md` or any skill file.
  - A finding is described as flowing through the existing Issues / rejection path (no new schema).

### Task 8: Update `docs-reviewer.md` — commit-messages gather-context input and "Output rules" check

- **Goal:** Give `docs-reviewer` the same new gather-context input and "Output rules" checklist entry as `code-reviewer`, scoped to docs output.
- **Files to change:**
  - `agents/docs-reviewer.md` (step 1 "Gather context", after the diff input at line 21; step 2 "Review the changes" checklist, lines 25-33).
- **Changes:**
  - **Add a gather-context input** in step 1, alongside "Inspect the docs diff for the batch (base ref → current HEAD)": the batch's commit messages — the base→HEAD `git log` — as an explicit, separate input.
  - **Add an "Output rules" entry** to the step-2 checklist (the list that already covers Acceptance coverage, accuracy, audience fit, faithful rationale, drift sweep, docs-plan adherence, convention compliance). The entry directs the reviewer to apply the output rules from its launch prompt over (a) the batch docs diff — Rule 1 (no reflowing/rewording of prose sections the change did not touch in an edited doc file; the diff shows whether the section's own content changed) and Rule 2 (no reference to this run's pipeline, phases, artifacts, or agents anywhere in the external documentation), applying the referent-based this-run discriminator so legitimate host vocabulary (including this self-hosting repo's own docs) is not flagged; and (b) the batch's commit messages — Rule 2's commit clause (R6), with the same within-batch simplification (every commit is a product commit; "no pipeline-naming provenance on any commit in the batch"; no per-commit artifact discriminator). Refer to the rules by "the output rules from your launch prompt", mirroring the existing "the summary format from your launch prompt"; do not name the skill file. A finding flows through the existing Issues schema and rejection path unchanged.
- **Depends on:** Task 1. (Independent of Task 7; ordered after it for consistent wording.)
- **Traces to:** Design "Reviewer profiles"; Spec R8/AC7, AC5 (external docs + commit messages), R6/AC9, R4/AC6, and R2/R5 (Rule 1 over docs prose).
- **Acceptance:**
  - `docs-reviewer.md` step 1 lists the batch's commit messages (base→HEAD `git log`) as an explicit gather-context input, distinct from the diff.
  - `docs-reviewer.md` step 2 contains an "Output rules" checklist entry covering Rule 1 (untouched prose) and Rule 2 over the batch docs diff and Rule 2's commit clause over the batch's commit messages.
  - The entry states the within-batch simplification and instructs applying the referent-based this-run discriminator so legitimate host vocabulary is not flagged.
  - The entry refers to the rules via "your launch prompt" / the "the output rules" handle and does not name any skill file.
  - The wording is consistent with `code-reviewer.md`'s entry (Task 7), adapted to docs surfaces.

### Task 9: Wire `output-rules.md` into the two phase files' reviewer-dispatch step

- **Goal:** Have the orchestrator pass the resolved content of `output-rules.md` to each reviewer at launch, mirroring how it already passes the resolved content of `summary-format.md`, so the reviewers' "Output rules from your launch prompt" handle is anchored to the canonical statement without any profile referencing the file.
- **Files to change:**
  - `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` (step 4, line 37).
  - `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` (step 4, line 37).
- **Changes:** In each phase file's reviewer-dispatch step (step 4), add "the resolved content of `output-rules.md`" to the list of items passed to the reviewer at launch, placed alongside the existing "the resolved content of `summary-format.md`". Use the same phrasing as the existing `summary-format.md` pass so the two are delivered through the identical channel. Keep the edit minimalist — add the one input; do not restate the rules' content in the phase file (that would duplicate `output-rules.md` across reading paths).
- **Depends on:** Task 1 (the file being passed must exist). (Independent of Tasks 7-8; the reviewer profiles already refer to "your launch prompt".)
- **Traces to:** Design "Phase files" component + Interfaces "Skill → reviewer (orchestrator-inlined content)" / Decision "Canonical home is a new `reference/output-rules.md`"; Spec R8/AC7 (the reviewer's check is anchored to the canonical statement), R7/AC8 (one canonical statement reached by name).
- **Acceptance:**
  - `4 - code.md` step 4 passes the resolved content of `output-rules.md` to the `code-reviewer` at launch, alongside the resolved content of `summary-format.md`.
  - `5 - docs.md` step 4 passes the resolved content of `output-rules.md` to the `docs-reviewer` at launch, alongside the resolved content of `summary-format.md`.
  - Neither phase file restates the rules' content inline (the canonical text stays only in `output-rules.md`).
  - The new pass uses the same phrasing/channel as the existing `summary-format.md` pass.
