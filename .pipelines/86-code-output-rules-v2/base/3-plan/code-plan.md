# Code Plan: Default output rules for pipeline-produced code

## Overview

This feature promotes two always-on output rules into the tool itself: **Rule 1** (a change leaves untouched comments and prose exactly as they were) and **Rule 2** (the shipped host-project product reads as if written by hand, with no trace of the pipeline that produced it). It ships **no runtime code and no new mechanism** — only edits to the Markdown agent profiles under `agents/`. The canonical Rule 1 + Rule 2 statement is authored **once** as a single block of prose and copied **byte-identically** into the five profiles that touch host-project product: the three producing profiles (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) and the two reviewing profiles (`code-reviewer`, `docs-reviewer`). Producers carry the rules to honor them while writing; reviewers carry the same rules plus an enforcement instruction that makes a violation a must-fix issue at the existing per-phase review gate. Each producing profile's commit step also gains a one-line product-commit constraint (author in the host commit format but omit pipeline-naming provenance).

The order is deliberate and drift-driven (Req 11): Task 1 settles the **single authoritative canonical wording** and lands it in the first producing profile (`code-writer-tdd`), replacing the pre-existing narrower Rule 2 line. Tasks 2–5 copy that exact block byte-for-byte into the remaining four profiles and add the per-profile additions (commit constraint for producers; enforcement item, referent discriminator, and — for `docs-reviewer` — a standalone commit-message inspection item for reviewers). Because the wording is fixed in Task 1, every later task depends on Task 1 and reproduces its block verbatim, so the copies are verifiably identical.

Every task is `Type: tdd` — the strict phase-4 type router (`skills/radical-pipelines/reference/autonomous-phases/4 - code.md`) accepts only `tdd` or `e2e`, and these prose-only edits have no end-to-end runtime behavior, so `e2e` does not apply. Each task ships **no test file**: the only "test" that could cover prose acceptance would be a structural assertion over agent-file content, which is forbidden by the repository's no-structural-tests rule (`AGENTS.md:17` / `CLAUDE.md:17`). The dispatched `code-writer-tdd` makes the prose edits and runs the pre-existing guardrail gates (here: none); the `code-reviewer` verifies each task's Acceptance by **direct inspection** of the shipped prose (diff inspection, greps, byte-comparison between profiles) and records evidence in its `## Behavior verification`. Reviewers and writers must **not** demand a test for these tasks (the same no-structural-tests rule binds them).

## Guardrail scopes

No guardrails are defined for this project.

| Gate | Scope |
| ---- | ----- |
| None | None |

## E2E test plan

This feature ships **no runtime code and no executable behavior** — it edits Markdown agent profiles only. There is therefore **no automated end-to-end flow to write**, and there are **no `e2e`-typed tasks**. The spec's acceptance criteria are realized as standing prose in the agent profiles and are verified by the `code-reviewer` through **direct inspection** of the shipped profile prose (diff inspection, greps, byte-comparison), with captured evidence recorded in the review's `## Behavior verification`. The flows below restate the spec's acceptance criteria as the **concrete inspection procedures** the reviewer (and any later re-driver) performs against the shipped `agents/*.md` files. They are inspection flows over prose, not automated tests; no `code-writer-e2e` task implements them.

### Flow 1: Both output rules are present, always-on, and carry no opt-out

- **Steps:**
  1. Open each of `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md`, `agents/code-reviewer.md`, `agents/docs-reviewer.md`.
  2. Locate the canonical Rule 1 + Rule 2 block in each.
  3. Search each block (and the rest of each profile) for any language offering a per-run or per-project override, opt-out, toggle, or owner action to disable either rule.
- **Expected:** All five profiles carry the canonical Rule 1 + Rule 2 block. The block states the rules as in force for the agent's host-project product with no condition, no owner action, and no opt-out. No profile mentions any mechanism to disable, override, or opt out of either rule.
- **Traces to:** Acceptance criteria under "Always-on application" (output subject to both rules with no owner action; no disable/override/opt-out mechanism exists).

### Flow 2: Rule 1 — untouched comments and prose are left alone; naturally-updated comments are permitted; commit messages are exempt

- **Steps:**
  1. Read the canonical Rule 1 statement in `agents/code-writer-tdd.md`.
  2. Confirm it forbids rewording, reflowing, reformatting, or tidying a comment attached to code the change did not modify, or a prose section of a doc the change edits but does not otherwise touch.
  3. Confirm it states the permitted case (updating a comment/prose that belongs to content the change *is* modifying is allowed) and that it imposes no duty to preserve a still-valid comment beside changed code.
  4. Confirm Rule 1 does not extend to commit messages (the commit step carries no Rule 1 obligation).
- **Expected:** The canonical Rule 1 statement keys on the touched-vs-untouched axis, names the forbidden action (tidy untouched comments/prose), names the permitted case (naturally update a changed line's own comment), disclaims any preserve-still-valid-comment duty, and does not apply to commit messages.
- **Traces to:** Acceptance criteria under "Rule 1" (untouched comments/prose left exactly as they were; naturally-updated comment not a violation; no duty to preserve a still-valid comment; Rule 1 does not apply to commit messages).

### Flow 3: Rule 2 — content reach is total, and the discriminator is referent-based

- **Steps:**
  1. Read the canonical Rule 2 statement in any one profile.
  2. Confirm its reach spans all product content — comments, identifiers and names, string literals, log and error messages, and inline API documentation — not comments alone.
  3. Confirm it includes the one-line decisive criterion: a reference violates Rule 2 only if it identifies the **concrete pipeline run** that produced this output (its phases, artifacts, plan tasks, or agents as the authors of this work) or narrates the writing agent's own process.
  4. Confirm it carries at least one concrete **"this is NOT a violation"** negative example (e.g. a `spec.md` filename literal or an illustrative `.pipelines/<slug>/…` path), and explicitly covers the self-hosting Radical Pipelines repository's legitimate use of pipeline vocabulary, methodology documentation, artifact-type names, and illustrative paths.
- **Expected:** The Rule 2 statement is referent-based (subject-matter vs. producing-process), spans the full content surface, illustrates a violating referent without reducing to a token/keyword/path checklist, and includes the self-hosting carve-out as a negative example.
- **Traces to:** Acceptance criteria under "Rule 2 — content" and "Rule 2 — referent-based discriminator"; Out-of-Scope #2.

### Flow 4: Rule 2 — product commit messages carry no pipeline-naming provenance, format-agnostically

- **Steps:**
  1. Read the commit step of each producing profile (`agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md`).
  2. Confirm each instructs the agent to author the message in the host commit format **but omit the pipeline-naming provenance** (no `(<agent-name>)` tag, no phase/artifact/task naming), without depending on or altering the host's specific format.
  3. Read the reviewing profiles' commit steps (`agents/code-reviewer.md`, `agents/docs-reviewer.md`) and confirm they are unchanged — reviewers commit only artifact files and keep the full host commit format including the provenance tag.
- **Expected:** Producer commit steps strip pipeline-naming provenance at authoring time as a format-agnostic property; reviewer commit steps are untouched and retain the tag.
- **Traces to:** Acceptance criteria under "Rule 2 — commit messages and provenance" (product commit names no pipeline/phase/artifact/agent and carries no provenance tag regardless of storage mode or host format; artifact-only commits keep the tag; no contradiction with the host format).

### Flow 5: Enforcement — a violation is a must-fix issue at each product-producing review gate

- **Steps:**
  1. Read the step-2 "Review the changes" checklist of `agents/code-reviewer.md` and `agents/docs-reviewer.md`.
  2. Confirm each carries the canonical Rule 1 + Rule 2 statement (including the referent discriminator) and a must-fix checklist item that treats a Rule 1 or Rule 2 violation found in the batch as a must-fix issue.
  3. Confirm `agents/code-reviewer.md` enforces the product-commit no-provenance check via its existing "Convention compliance" item (which already names commit conventions, `code-reviewer.md:31`).
  4. Confirm `agents/docs-reviewer.md` carries a **distinct, standalone** product-commit-message inspection checklist item (its existing convention-compliance item covers documentation content only and names no commit conventions).
- **Expected:** Both reviewer profiles enforce Rule 1 and Rule 2 as must-fix issues through the existing reject-liberally / every-issue-is-must-fix machinery (a recorded violation forces a `rejected` verdict, no approval artifact is written, the phase does not complete, flagged tasks are re-dispatched). The commit-message inspection rides on the existing commit hook in `code-reviewer` and is a new standalone item in `docs-reviewer`. No new gate, no bypass.
- **Traces to:** Acceptance criteria under "Enforcement" (a seen violation is recorded must-fix, no approval, phase does not complete, work sent back; review gate is the only route to completion with no bypass); Acceptance under "Rule 2 — commit messages and provenance" (commit classification by changed-path test).

### Flow 6: Single source and consistency — one canonical wording, byte-identical, no surviving narrower variant

- **Steps:**
  1. Extract the canonical Rule 1 + Rule 2 block from each of the five profiles.
  2. Byte-compare the blocks pairwise (e.g. `diff`).
  3. Search all of `agents/` and `skills/` for the pre-existing narrower Rule 2 line ("Comments must be self-contained — never reference the spec, the plan, or any other artifact") and for any other separate, narrower statement of Rule 2.
- **Expected:** The canonical block is byte-identical across all five profiles. The pre-existing narrower line no longer exists anywhere in `agents/` or `skills/`, and no other narrower or conflicting Rule 2 statement survives.
- **Traces to:** Acceptance criterion under "Single source and consistency" (rules expressed once and consistently; earlier narrower statement in the code writer's profile no longer exists as a separate, conflicting version).

## Tasks

### Task 1: Author the canonical Rule 1 + Rule 2 block and land it in `code-writer-tdd`, replacing the narrower Rule 2 line

- **Goal:** Settle the single authoritative canonical wording of Rule 1 and Rule 2 (referent-based, with negative examples and the self-hosting carve-out), add it to `agents/code-writer-tdd.md` as the agent's standing output rules, replace the pre-existing narrower Rule 2 line with the canonical Rule 2, and add the product-commit no-provenance constraint to its commit step. This task is the source of truth that Tasks 2–5 copy verbatim.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md`
- **Changes:**
  - Author the canonical Rule 1 + Rule 2 block as a **single, self-contained block of prose** that will be copied byte-identically into the other four profiles. Follow the phrasing shape the existing profiles use to pin a fine semantic line: a **named rule → a one-line decisive criterion → a concrete "this is NOT a violation" example → the action**.
    - **Rule 1** — keyed to the touched-vs-untouched axis: do not reword, reflow, reformat, or tidy a comment attached to code the change does not modify, or a prose section of a documentation file the change edits but does not otherwise touch — leave it exactly as it was. State the permitted case: updating a comment or prose that belongs to content the change *is* modifying is allowed. State that there is no duty to preserve a still-valid comment beside code that was changed. State that Rule 1 does not apply to commit messages.
    - **Rule 2** — referent-based, with total content reach (comments, identifiers and names, string literals, log and error messages, inline API documentation): a reference violates Rule 2 only if it identifies the concrete pipeline run that produced this output — its phases, artifacts, plan tasks, or agents as the authors of this work — or narrates the writing agent's own process. The product reads as if written by hand. Include the decisive one-line test (subject-matter-of-the-product vs. process-that-produced-it) and at least one concrete negative example that is **not** a violation (e.g. a `spec.md` filename literal or an illustrative `.pipelines/<slug>/…` path), explicitly including the self-hosting Radical Pipelines repository's legitimate use of pipeline vocabulary, methodology documentation, artifact-type names, and illustrative paths. Do **not** phrase Rule 2 as a token/keyword/path checklist.
  - Place this canonical block in `code-writer-tdd.md` where the agent's content-discipline rules naturally live (e.g. within the implement workflow / inline-documentation area at step 2 of the "Implement with TDD" section, around the current `code-writer-tdd.md:33`).
  - **Delete** the existing narrower line at `code-writer-tdd.md:33` — "Comments must be self-contained — never reference the spec, the plan, or any other artifact." — and let the canonical Rule 2 stand in its place. This is the only occurrence of the narrower statement in `agents/` or `skills/`.
  - In the commit step ("4. Commit and report", around `code-writer-tdd.md:49`), add a one-line constraint: author the commit message in the host project's commit format **but omit the pipeline-naming provenance** (no agent-name tag, no phase/artifact/task naming). Do not otherwise change how the host commit format is applied.
  - Write no test file. There is no runnable behavior to cover, and a structural assertion over the profile's content is forbidden by `AGENTS.md:17` / `CLAUDE.md:17`.
- **Depends on:** none
- **Traces to:** Spec Req 1, Req 2, Req 3, Req 4, Req 6, Req 7, Req 9, Req 11; Design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Replace the pre-existing narrower Rule 2 line with the canonical Rule 2", "Rule 2 is expressed as a referent-based test with concrete negative examples", "Rule 1 is a content-discipline rule … on the touched-vs-untouched axis", "Strip pipeline-naming provenance from product commits at authoring time", "This feature's own Code phase types its prose tasks `tdd` and verifies them by reviewer inspection". Acceptance: "Always-on application", "Rule 1", "Rule 2 — content", "Rule 2 — referent-based discriminator", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - `agents/code-writer-tdd.md` carries a single canonical Rule 1 + Rule 2 block stating both rules.
  - The Rule 1 portion forbids rewording/reflowing/reformatting/tidying comments or prose the change did not touch, explicitly permits updating a comment/prose belonging to content the change does modify, disclaims any duty to preserve a still-valid comment beside changed code, and states Rule 1 does not apply to commit messages.
  - The Rule 2 portion states the rule for all product content (comments, identifiers and names, string literals, log and error messages, inline API documentation), is referent-based (it identifies a violation only when the reference points at the concrete pipeline run that produced this output, or narrates the writing agent's process), carries the one-line decisive test, includes at least one concrete "this is NOT a violation" negative example, and explicitly covers the self-hosting Radical Pipelines repository's legitimate vocabulary/methodology/artifact-type/illustrative-path use.
  - The Rule 2 portion is not phrased as a token, keyword, or path checklist.
  - The pre-existing narrower line "Comments must be self-contained — never reference the spec, the plan, or any other artifact." no longer appears in `agents/code-writer-tdd.md`.
  - The commit step instructs the agent to follow the host commit format while omitting pipeline-naming provenance (no agent-name tag, no phase/artifact/task naming), without depending on or altering the host's specific format.
  - No test file is added for this task.

### Task 2: Copy the canonical block into `code-writer-e2e` and add the product-commit constraint

- **Goal:** Add the byte-identical canonical Rule 1 + Rule 2 block to `agents/code-writer-e2e.md`, phrased to read sensibly for an agent whose product is e2e test code (test comments, string literals, identifiers) rather than inline API docs, and add the product-commit no-provenance constraint to its commit step.
- **Type:** tdd
- **Files to change:** `agents/code-writer-e2e.md`
- **Changes:**
  - Insert the canonical Rule 1 + Rule 2 block from Task 1 **byte-identically** into `code-writer-e2e.md`, in a location where the agent's content-discipline rules naturally read (e.g. the "Implement the planned e2e flows" section or the Guidelines). The canonical block text must be the exact same bytes as in `code-writer-tdd.md`; the surrounding profile context (not the block itself) makes clear that this agent's product is test code.
  - In the commit step ("4. Commit and report", around `code-writer-e2e.md:40`), add the same one-line product-commit constraint as Task 1: author in the host commit format but omit pipeline-naming provenance.
  - Write no test file (same rationale as Task 1).
- **Depends on:** Task 1
- **Traces to:** Spec Req 1, Req 2, Req 3, Req 4, Req 6, Req 7, Req 9, Req 10, Req 11; Design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Strip pipeline-naming provenance from product commits at authoring time", "Scope by the product/artifact boundary"; Open Question "`code-writer-e2e` fit". Acceptance: "Always-on application", "Rule 1", "Rule 2 — content", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - `agents/code-writer-e2e.md` carries the canonical Rule 1 + Rule 2 block, byte-identical to the block in `agents/code-writer-tdd.md`.
  - The block reads sensibly in context for an agent whose product is e2e test code (its surrounding context, not edits to the block, conveys this).
  - The commit step instructs the agent to follow the host commit format while omitting pipeline-naming provenance.
  - No test file is added for this task.

### Task 3: Copy the canonical block into `docs-writer` and add the product-commit constraint

- **Goal:** Add the byte-identical canonical Rule 1 + Rule 2 block to `agents/docs-writer.md`, scoped naturally to documentation surfaces (READMEs, guides, examples, changelogs, configuration descriptions, non-symbol inline narrative), and add the product-commit no-provenance constraint to its commit step.
- **Type:** tdd
- **Files to change:** `agents/docs-writer.md`
- **Changes:**
  - Insert the canonical Rule 1 + Rule 2 block from Task 1 **byte-identically** into `docs-writer.md`, in a location where the agent's content-discipline rules naturally read (e.g. the "Draft" section or the Guidelines). The canonical block text must be the exact same bytes as in `code-writer-tdd.md`; the surrounding profile context makes clear this agent produces external documentation.
  - In the commit step ("5. Commit and report", around `docs-writer.md:52`), add the same one-line product-commit constraint as Task 1: author in the host commit format but omit pipeline-naming provenance.
  - Write no test file (same rationale as Task 1).
- **Depends on:** Task 1
- **Traces to:** Spec Req 1, Req 2, Req 3, Req 4, Req 5, Req 6, Req 7, Req 9, Req 10, Req 11; Design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Strip pipeline-naming provenance from product commits at authoring time", "Scope by the product/artifact boundary". Acceptance: "Always-on application", "Rule 1", "Rule 2 — content", "Rule 2 — commit messages and provenance", "Single source and consistency".
- **Acceptance:**
  - `agents/docs-writer.md` carries the canonical Rule 1 + Rule 2 block, byte-identical to the block in `agents/code-writer-tdd.md`.
  - The block reads sensibly in context for an agent whose product is external documentation (its surrounding context, not edits to the block, conveys this).
  - The commit step instructs the agent to follow the host commit format while omitting pipeline-naming provenance.
  - No test file is added for this task.

### Task 4: Add the canonical block plus enforcement to `code-reviewer`

- **Goal:** Add the byte-identical canonical Rule 1 + Rule 2 block (including the referent discriminator) to `agents/code-reviewer.md` and add a must-fix checklist item to its step-2 "Review the changes" checklist that enforces both rules; ride the product-commit no-provenance check on the existing "Convention compliance" item, which already names commit conventions. Leave the reviewer's own commit step (which commits artifact files) unchanged.
- **Type:** tdd
- **Files to change:** `agents/code-reviewer.md`
- **Changes:**
  - Insert the canonical Rule 1 + Rule 2 block from Task 1 **byte-identically** into `code-reviewer.md` so the reviewer applies the same rules and the same referent test the producers carry.
  - Add a new must-fix item to the step-2 "Review the changes" checklist (around `code-reviewer.md:23–31`): a Rule 1 or Rule 2 violation found anywhere in the batch's product content is a must-fix issue, applying the referent-based discriminator so legitimate pipeline vocabulary, methodology documentation, artifact-type names, and illustrative paths (including in the self-hosting repo) are not flagged.
  - Make explicit that the existing "Convention compliance" item (`code-reviewer.md:31`, which already reads "host project's coding, testing, build, and commit conventions") covers the product-commit no-provenance check: a product commit in the batch carrying an agent-name/pipeline-naming tag fails convention compliance and is a must-fix Req 7 violation. (Use the changed-path test — a commit is a product commit iff at least one changed path is not under the artifacts folder `.pipelines/<slug>/` — to classify; in practice writers commit product only.)
  - Do **not** change the reviewer's own commit step — it commits only artifact files (review/summary) and keeps the full host commit format including the provenance tag.
  - The reviewer must not demand a test for prose/instruction-only tasks; do not add any instruction requiring one (the no-structural-tests rule, `AGENTS.md:17` / `CLAUDE.md:17`, binds the reviewer too).
  - Write no test file (same rationale as Task 1).
- **Depends on:** Task 1
- **Traces to:** Spec Req 6, Req 7, Req 8, Req 9, Req 10, Req 11, Req 12; Design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Rule 2 is expressed as a referent-based test …", "Enforcement reuses the existing review gate — a violation is a must-fix issue", "Scope by the product/artifact boundary". Acceptance: "Rule 2 — referent-based discriminator", "Rule 2 — commit messages and provenance", "Enforcement", "Single source and consistency".
- **Acceptance:**
  - `agents/code-reviewer.md` carries the canonical Rule 1 + Rule 2 block, byte-identical to the block in `agents/code-writer-tdd.md`.
  - Its step-2 "Review the changes" checklist includes a must-fix item enforcing Rule 1 and Rule 2, applying the referent-based discriminator so legitimate vocabulary/methodology/artifact-type/illustrative-path content is not flagged.
  - The product-commit no-provenance check is enforced through the existing "Convention compliance" commit hook (a product commit carrying a pipeline-naming/agent-name tag is a must-fix violation), with product commits identified by the changed-path test against the artifacts folder.
  - The reviewer's own commit step is unchanged and retains the full host commit format including the provenance tag.
  - The profile contains no instruction demanding a test for prose/instruction-only tasks.
  - No test file is added for this task.

### Task 5: Add the canonical block, enforcement, and a standalone commit-message inspection item to `docs-reviewer`

- **Goal:** Add the byte-identical canonical Rule 1 + Rule 2 block (including the referent discriminator) to `agents/docs-reviewer.md`, add a must-fix checklist item to its step-2 "Review the changes" checklist enforcing both rules, and add a **distinct, standalone** product-commit-message inspection item (because the docs-reviewer's existing convention-compliance item covers documentation content only and names no commit conventions). Leave the reviewer's own commit step unchanged.
- **Type:** tdd
- **Files to change:** `agents/docs-reviewer.md`
- **Changes:**
  - Insert the canonical Rule 1 + Rule 2 block from Task 1 **byte-identically** into `docs-reviewer.md` so the reviewer applies the same rules and the same referent test the producers carry.
  - Add a new must-fix item to the step-2 "Review the changes" checklist (around `docs-reviewer.md:25–33`): a Rule 1 or Rule 2 violation found anywhere in the batch's documentation content is a must-fix issue, applying the referent-based discriminator so legitimate vocabulary/methodology/artifact-type/illustrative-path content (including in the self-hosting repo) is not flagged.
  - Add a **separate, standalone** checklist item (distinct from the existing "Convention compliance" item at `docs-reviewer.md:33`, which is scoped to documentation content only and names no commit conventions): inspect each product commit message in the batch and flag any pipeline-naming provenance — an agent-name tag or any phase/artifact/task naming — as a must-fix Req 7 violation. Classify product commits by the changed-path test (a commit is a product commit iff at least one changed path is not under the artifacts folder `.pipelines/<slug>/`); in practice the docs-writer commits external documentation (product).
  - Do **not** change the reviewer's own commit step — it commits only artifact files (review/summary) and keeps the full host commit format including the provenance tag.
  - The reviewer must not demand a test for prose/instruction-only tasks; do not add any instruction requiring one.
  - Write no test file (same rationale as Task 1).
- **Depends on:** Task 1
- **Traces to:** Spec Req 5, Req 6, Req 7, Req 8, Req 9, Req 10, Req 11, Req 12; Design decisions "The canonical rules live in agent profiles, duplicated verbatim", "Rule 2 is expressed as a referent-based test …", "Enforcement reuses the existing review gate — a violation is a must-fix issue" (including the docs-reviewer asymmetry), "Scope by the product/artifact boundary". Acceptance: "Rule 2 — referent-based discriminator", "Rule 2 — commit messages and provenance", "Enforcement", "Single source and consistency".
- **Acceptance:**
  - `agents/docs-reviewer.md` carries the canonical Rule 1 + Rule 2 block, byte-identical to the block in `agents/code-writer-tdd.md`.
  - Its step-2 "Review the changes" checklist includes a must-fix item enforcing Rule 1 and Rule 2, applying the referent-based discriminator.
  - It carries a distinct, standalone checklist item — separate from the documentation "Convention compliance" item — that inspects each product commit message and flags any pipeline-naming provenance (agent-name tag or phase/artifact/task naming) as a must-fix Req 7 violation, with product commits identified by the changed-path test against the artifacts folder.
  - The reviewer's own commit step is unchanged and retains the full host commit format including the provenance tag.
  - The profile contains no instruction demanding a test for prose/instruction-only tasks.
  - No test file is added for this task.
