# Code Plan: Default output rule — host-project output never references the run that produced it

## Overview

This change promotes a single, always-on rule into five agent profiles under `agents/`: host-project output (everything an agent writes outside the artifacts folder) must never point back at the specific run that produced it — no number pinning output to a task/requirement/review, no named artifact (spec/plan/design doc/review) cited as the change's authority, and no other agent credited as author. The three **producers** (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) each gain one `## Guidelines` disposition bullet in the writing voice; the two **reviewers** (`code-reviewer`, `docs-reviewer`) each gain one detection item in their `### 2. Review the changes` checklist in the finding voice. There is exactly one deletion: the pre-existing narrower line in `code-writer-tdd.md` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact.") is removed because the new broad disposition supersedes it. This is an entirely prose edit to five Markdown files — no application/source code, no scanner, no new files, no shared referenced file. The plan is ordered producers first (Tasks 1–3), reviewers second (Tasks 4–5), each task touching exactly one profile so they can run independently.

**Verification model for this plan (important):** This repository's `AGENTS.md`/`CLAUDE.md` forbids writing structural tests that assert the content, wording, or ordering of skill or agent files. Therefore **no task in this plan adds an automated test**, and no task's Acceptance may be satisfied by such a test. Each task is a prose edit whose Acceptance is verified by direct inspection of the edited profile and, at the gate, by the reviewer reading the diff. The task-level "Acceptance" bullets below describe observable properties of the resulting profile text (what must be true of the words on the page), not tests to write.

## Guardrail scopes

This project defines no Guardrails convention, so there are no scoped gates to fill.

| Gate | Scope |
| ---- | ----- |
| None | None  |

## E2E test plan

This feature ships no runtime behavior and no executable surface — it is prose added to five agent profiles, enforced by human/agent judgment at the existing per-phase review gate. There is nothing to drive through an automated end-to-end test, and the repository forbids tests that assert profile content. Accordingly there are **no automated e2e flows** in this plan, and no `e2e`-type tasks.

The spec's acceptance criteria are instead validated by inspection of the resulting profile text. The following are the acceptance scenarios each restated as an inspection flow, for the reviewer to re-drive by reading the five edited profiles. They are the acceptance-criteria coverage map; they are **not** instructions to automate.

### Flow 1: A run-pointer in host-project output is caught

- **Steps:** Read the producer disposition (Tasks 1–3) and the reviewer detection item (Tasks 4–5). Consider the example pointers: a comment `// per R5`, an identifier `task3Helper`, a doc line "as the design doc specifies", a commit subject "Add parser per R9".
- **Expected:** The producer disposition forbids writing each of those (they are host-project output pointing at this run), and the reviewer detection item is worded to catch each of them as a must-fix that blocks approval (it ties into the reviewers' existing must-fix / reject-liberally posture). All three discriminator forms — a number tying output to the task or a requirement/review; a named artifact behind the change cited as its authority; another agent credited as author — are named on both the producer and reviewer sides, and producer commit subjects are among the surfaces covered.
- **Traces to:** Acceptance criterion AC1.

### Flow 2: Domain vocabulary is not caught

- **Steps:** Read the producer disposition and reviewer detection item. Consider domain-vocabulary usages: a symbol named `spec`, a doc describing a spec-writing feature, and the words "task"/"plan"/"phase"/"pipeline" used as the product's own subject matter (this self-hosting repo is the acute case).
- **Expected:** Both the disposition and the detection item are unmistakably referent-based (they key on whether a token points at *this run's* paperwork, never on the presence of a word), and both explicitly name the not-a-violation cases (domain vocabulary as subject matter; illustrative/example artifact references). Neither presents a word/token/pattern list to scan for. Domain vocabulary as subject matter satisfies none of the three discriminator clauses, so it is not flagged — in any repository including this one.
- **Traces to:** Acceptance criterion AC2.

### Flow 3: The commit agent-name tag is allowed

- **Steps:** Read the producer disposition and reviewer detection item. Consider a commit subject with the convention's agent-name tag, e.g. "Add parser (code-writer-tdd)".
- **Expected:** The producer disposition states that descriptive commit content is in scope while the commit format's agent-name tag stays (is exempt); the reviewer detection item exempts the same tag. The tag is not treated as a violation, only descriptive commit content is in scope.
- **Traces to:** Acceptance criterion AC3.

### Flow 4: Artifacts may reference the run

- **Steps:** Read the scope boundary in all five bullets. Consider the run's own artifacts under `<artifacts-folder>` referencing its tasks, phases, and agents.
- **Expected:** Every bullet scopes the rule to output *outside the artifacts folder*; the artifacts folder is excluded. The reviewer item asks only about the batch's host-project output, never the run's own artifacts. An artifact referencing its tasks/phases/agents is therefore never flagged.
- **Traces to:** Acceptance criterion AC4.

### Flow 5: The rule text is pipeline-free

- **Steps:** Read all five added bullets (and re-read them after any wording revision).
- **Expected:** No bullet uses the word "pipeline", and none assumes the agent knows what a pipeline (or "the run" as an abstract concept) is. Each bullet names only concrete referents the agent already holds — its task, the spec/plan/design doc/review it followed, and the other agents — and states scope by exclusion relative to the artifacts folder.
- **Traces to:** Acceptance criterion AC5.

### Flow 6: Role-appropriate placement

- **Steps:** Locate each added bullet. Confirm placement and voice.
- **Expected:** Each producer's bullet sits in its `## Guidelines` list in the writing voice (a "what you write never points at this run" disposition). Each reviewer's bullet sits in its `### 2. Review the changes` → "Check, for the tasks in this batch:" checklist in the finding voice (a "does the batch's output point at this run?" detection predicate). The producer and reviewer forms are different grammatical moods in different sections; they share the discriminator vocabulary but are not the same block duplicated verbatim.
- **Traces to:** Acceptance criterion AC6.

### Flow 7: Generic wording

- **Steps:** Read all five added bullets and the one deletion's surroundings.
- **Expected:** No bullet hardcodes an artifacts-folder path and none carries a tool-specific reference. The scope boundary is expressed via the `<artifacts-folder>` placeholder (in `docs-writer`, `code-reviewer`, `docs-reviewer`, which already use that idiom) or in referent terms ("this run's artifacts" / "your task's own artifacts") for the two code-writers that do not use the placeholder today, optionally naming the `<artifacts-folder>` placeholder generically if a concrete boundary token reads more clearly.
- **Traces to:** Acceptance criterion AC7.

## Tasks

Each task edits exactly one profile file. Tasks 1–3 (producers) and Tasks 4–5 (reviewers) have no ordering dependency on each other, but the plan lists producers first because the reviewer's detection item mirrors the producer disposition's discriminator vocabulary; a writer executing a reviewer task should keep the shared discriminator clause (number / named artifact / agent-as-author, plus the not-a-violation cases and the agent-name-tag exemption) aligned with the producer wording described here.

**Shared discriminator content (the same in all five bullets — keep aligned; do NOT paste as one identical block).** Every bullet expresses:

- **Scope:** everything written *outside the artifacts folder* is host-project output and is governed; the artifacts folder is the one place references to the run are allowed.
- **The three pointer forms (the discriminator):** (a) a number tying output to the agent's task or to a requirement/review (e.g. `task3Helper`, "per R9"); (b) a named artifact behind this change — the spec, the plan, the design doc, or the review — cited as its authority/origin (e.g. "as the design doc specifies"); (c) another agent credited as the author of the work.
- **The not-a-violation cases:** the domain's own vocabulary used as subject matter (a symbol named `spec`, a doc about a spec-writing feature, the words task/plan/phase/pipeline as domain terms) is not a pointer; an illustrative or example artifact reference is not a pointer.
- **Commit handling:** a commit message's descriptive content is in scope; the commit format's agent-name tag (e.g. `(code-writer-tdd)`) is exempt and stays.

**Voice differs by role (this is what makes them not the same block — AC6):**

- Producers state it as a **disposition** in the writing voice: "everything you write outside the artifacts folder … reads as if written by hand and carries no pointer back at this run."
- Reviewers state it as a **detection predicate** in the finding voice: "does anything the batch writes outside the artifacts folder point at this run? … a real pointer is a must-fix that blocks approval."

The illustrative (NON-binding) sketches from the design doc are reproduced under Tasks 1 and 4 as shape/voice guidance; they are not frozen text. The writer drafts the final sentence within the fixed strategy (referent-based, pipeline-free, `<artifacts-folder>` boundary, discriminator above, commit-tag exemption).

---

### Task 1: Add the run-pointer disposition to `code-writer-tdd` and remove the superseded narrower line

- **Goal:** Give `code-writer-tdd` the standing "host-project output never points at this run" rule as a `## Guidelines` disposition, and delete the pre-existing narrower comment-only line that the new disposition supersedes.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md`
- **Changes:**
  1. **Delete** the line currently in Workflow step 2 ("Implement with TDD"), in the "Document every public symbol you add or modify" bullet block: `- Comments must be self-contained — never reference the spec, the plan, or any other artifact.` (currently the last sub-bullet of that block). After removal, the surrounding "Document every public symbol…" sub-bullets ("Symbols to cover…", "Follow the host project's inline API-documentation convention…", "Include description, parameters, return values, and examples…", "Document object properties individually…") must still read as a coherent list — do not leave a dangling connective or an orphaned lead-in.
  2. **Add** one new bullet to the `## Guidelines` list (the bullet list beginning "Single task only." and ending "Stop and report blockers."). The bullet uses the list's house style: a bold imperative lead-in followed by one or two sentences. It states the rule in the **writing voice** using the shared discriminator content above. Because `code-writer-tdd` does **not** use the `<artifacts-folder>` placeholder elsewhere in its profile, express the scope boundary in referent terms ("this run's artifacts" / "your task's own artifacts"); the `<artifacts-folder>` placeholder may be named generically if a concrete boundary token reads more clearly, but no path is ever hardcoded. Placement within the list is the writer's choice among the standing dispositions; it must not go inside any numbered workflow step.
- **Depends on:** none
- **Traces to:** Spec requirements R2, R3, R5, R6, R7, R10; Design decisions "Distinct role-appropriate forms — disposition vs. detection", "Remove the pre-existing narrower comment rule in code-writer-tdd", "Take the scope boundary from the `<artifacts-folder>` convention"; Acceptance criteria AC1, AC2, AC3, AC4, AC5, AC6, AC7.
- **Illustrative sketch (NON-binding — shows shape and voice, not frozen text):**
  > **No run-pointers in host-project output.** Everything you write outside this run's artifacts — code, identifiers, comments, string and test names, messages, files you create, and commit descriptions — reads as if written by hand: it never points at this run's paperwork. A pointer is a number tying it to your task or a requirement/review (`task3Helper`, "per R9"), a named artifact behind this change cited as its authority (the spec, the plan, the design doc, the review — e.g. "as the design doc specifies"), or another agent credited as author. The domain's own vocabulary used as subject matter (a symbol `spec`, a doc about a spec-writing feature, the words task/plan/phase) is not a pointer, nor is an example artifact reference. Descriptive commit content is in scope; the commit format's agent-name tag stays.
- **Acceptance:**
  - The line "Comments must be self-contained — never reference the spec, the plan, or any other artifact." no longer appears anywhere in `agents/code-writer-tdd.md`.
  - After the deletion, the "Document every public symbol you add or modify" block and its remaining sub-bullets read as a coherent, non-dangling list.
  - `agents/code-writer-tdd.md` gains exactly one new bullet, and that bullet lives in the `## Guidelines` list — not inside any numbered workflow step.
  - The new bullet is in the writing/disposition voice ("what you write never points at this run"), matching the existing Guidelines house style (bold imperative lead-in + one or two sentences).
  - The new bullet scopes the rule to output outside the run's artifacts, and identifies a violation by all three discriminator forms: a number tying output to the task or a requirement/review; a named artifact (spec/plan/design doc/review) cited as the change's authority; another agent credited as author.
  - The new bullet explicitly states the not-a-violation cases: domain vocabulary used as subject matter, and illustrative/example artifact references.
  - The new bullet states that descriptive commit content is in scope while the commit-format agent-name tag is exempt and stays.
  - The new bullet does not use the word "pipeline" and does not assume the agent knows what a pipeline (or "the run" as an abstract concept) is; it names only concrete referents (task, spec, plan, design doc, review, agents).
  - The new bullet hardcodes no artifacts-folder path and contains no tool-specific reference.

### Task 2: Add the run-pointer disposition to `code-writer-e2e`

- **Goal:** Give `code-writer-e2e` the same standing "host-project output never points at this run" rule as a `## Guidelines` disposition.
- **Type:** tdd
- **Files to change:** `agents/code-writer-e2e.md`
- **Changes:** Add one new bullet to the `## Guidelines` list (the bullet list beginning "Single task only." and ending "Stop and report blockers."). Use the list's house style (bold imperative lead-in + one or two sentences), the **writing voice**, and the shared discriminator content above. There is no pre-existing line to reconcile in this profile. Because `code-writer-e2e` does **not** use the `<artifacts-folder>` placeholder elsewhere, express the scope boundary in referent terms ("this run's artifacts" / "your task's own artifacts"); the placeholder may be named generically if clearer, but no path is hardcoded. Keep the shared discriminator clause aligned with Task 1's wording (do not copy Task 1's bullet verbatim word-for-word beyond the shared discriminator content; the surrounding sentence adapts to this profile's surfaces — e2e test code, test names, files it creates, commit descriptions). Placement within the list is the writer's choice; not inside any numbered workflow step.
- **Depends on:** none (keep the shared discriminator clause consistent with Task 1)
- **Traces to:** Spec requirements R2, R3, R5, R6, R7, R10; Design decisions "Distinct role-appropriate forms — disposition vs. detection", "Take the scope boundary from the `<artifacts-folder>` convention"; Acceptance criteria AC1, AC2, AC3, AC4, AC5, AC6, AC7.
- **Acceptance:**
  - `agents/code-writer-e2e.md` gains exactly one new bullet, in the `## Guidelines` list, not inside any numbered workflow step.
  - The new bullet is in the writing/disposition voice, matching the Guidelines house style.
  - The new bullet scopes the rule to output outside the run's artifacts, and names all three discriminator forms (number tying to task/requirement/review; named artifact cited as authority; agent credited as author).
  - The new bullet states the not-a-violation cases (domain vocabulary as subject matter; illustrative/example artifact references).
  - The new bullet states that descriptive commit content is in scope while the agent-name tag is exempt.
  - The new bullet does not use "pipeline" and names only concrete referents.
  - The new bullet hardcodes no path and carries no tool-specific reference.

### Task 3: Add the run-pointer disposition to `docs-writer`

- **Goal:** Give `docs-writer` the same standing "host-project output never points at this run" rule as a `## Guidelines` disposition, scoped to its external-documentation output surface.
- **Type:** tdd
- **Files to change:** `agents/docs-writer.md`
- **Changes:** Add one new bullet to the `## Guidelines` list (the bullet list beginning "Single task only." and ending "Stop and report blockers."). Use the list's house style (bold imperative lead-in + one or two sentences), the **writing voice**, and the shared discriminator content above. There is no pre-existing line to reconcile. `docs-writer` already uses the `<artifacts-folder>` placeholder in its prose, so express the scope boundary with that established token ("outside the `<artifacts-folder>`"); no path is hardcoded. Adapt the surrounding sentence to this profile's surfaces — external documentation (READMEs, guides, examples, configuration descriptions, changelogs, contributor docs, internal conventions) and the commit description. Keep the shared discriminator clause aligned with Tasks 1–2. Placement within the list is the writer's choice; not inside any numbered workflow step.
- **Depends on:** none (keep the shared discriminator clause consistent with Tasks 1–2)
- **Traces to:** Spec requirements R2, R3, R5, R6, R7, R10; Design decisions "Distinct role-appropriate forms — disposition vs. detection", "Take the scope boundary from the `<artifacts-folder>` convention"; Acceptance criteria AC1, AC2, AC3, AC4, AC5, AC6, AC7.
- **Acceptance:**
  - `agents/docs-writer.md` gains exactly one new bullet, in the `## Guidelines` list, not inside any numbered workflow step.
  - The new bullet is in the writing/disposition voice, matching the Guidelines house style.
  - The new bullet scopes the rule to output outside the `<artifacts-folder>`, and names all three discriminator forms (number tying to task/requirement/review; named artifact cited as authority; agent credited as author).
  - The new bullet states the not-a-violation cases (domain vocabulary as subject matter; illustrative/example artifact references).
  - The new bullet states that descriptive commit content is in scope while the agent-name tag is exempt.
  - The new bullet does not use "pipeline" and names only concrete referents.
  - The new bullet hardcodes no path (uses the `<artifacts-folder>` placeholder for the boundary) and carries no tool-specific reference.

### Task 4: Add the run-pointer detection item to `code-reviewer`

- **Goal:** Give `code-reviewer` a detection checklist item that catches host-project run-pointers in a batch and treats a real pointer as a must-fix that blocks approval.
- **Type:** tdd
- **Files to change:** `agents/code-reviewer.md`
- **Changes:** Add one new bullet to the `### 2. Review the changes` → "Check, for the tasks in this batch:" list (the list whose items are **Per-task Acceptance coverage**, **Spec acceptance coverage**, **Design alignment**, **Plan adherence**, **Test quality**, **Inline documentation**, **Convention compliance**). The new item slots in as a peer detection check in that list's house style: a bold noun-phrase label followed by a "— does …?" predicate that surfaces the defect (matching, e.g., "**Convention compliance** — host project's coding, testing, build, and commit conventions."). State the rule in the **finding voice** using the shared discriminator content above: does anything the batch writes outside the `<artifacts-folder>` point at this run — a number tying it to a task or requirement/review, a named artifact of this change cited as its authority, or another agent credited as author? Name the same not-a-violation cases (domain vocabulary as subject matter; example artifact references) and exempt the commit's agent-name tag. Tie into the reviewers' existing must-fix posture so a real pointer blocks approval (the reviewer's `## Guidelines` already carry "every issue is must-fix" and "reject liberally" — do not add new gate text; the detection item simply produces a must-fix issue). This reviewer already uses the `<artifacts-folder>` placeholder in its prose, so express the boundary with that token; no path is hardcoded. The item covers the batch's host-project output including producer commit subjects; it does not inspect the run's own artifacts. This is a detection predicate, NOT the producer disposition pasted verbatim (AC6).
- **Depends on:** none (keep the shared discriminator clause consistent with the producer bullets in Tasks 1–3)
- **Traces to:** Spec requirements R2, R3, R5, R6, R8, R9, R10; Design decisions "Referent-based detection by reviewer judgment, not a token scan", "Distinct role-appropriate forms — disposition vs. detection", "Commit descriptive content is in scope; the agent-name tag is exempt"; Acceptance criteria AC1, AC2, AC3, AC4, AC5, AC6, AC7.
- **Illustrative sketch (NON-binding — shows shape and voice, not frozen text):**
  > **No run-pointers in host-project output** — does anything the batch writes outside the `<artifacts-folder>` point at this run: a number tying it to a task or requirement/review, a named artifact of this change (the spec, plan, design doc, or review) cited as its authority, or another agent credited as author? Domain vocabulary used as subject matter and example artifact references are not violations, and the commit's agent-name tag is allowed. A real pointer is a must-fix that blocks approval.
- **Acceptance:**
  - `agents/code-reviewer.md` gains exactly one new bullet, in the `### 2. Review the changes` → "Check, for the tasks in this batch:" list, as a peer of the existing check items.
  - The new item is in the finding/detection voice (a "— does …?" predicate that surfaces the defect), matching the checklist house style (bold noun-phrase label + predicate) — it is not the producer disposition worded as an instruction to write.
  - The new item scopes detection to output outside the `<artifacts-folder>` (the batch's host-project output, including producer commit subjects) and does not ask the reviewer to inspect the run's own artifacts.
  - The new item identifies a violation by all three discriminator forms (number tying to task/requirement/review; named artifact cited as authority; agent credited as author) and is phrased as a judgment about the referent — it presents no token/keyword/pattern list to grep.
  - The new item names the not-a-violation cases (domain vocabulary as subject matter; example artifact references) and exempts the commit agent-name tag.
  - The new item ties a real pointer to the must-fix / block-approval posture, adding no new gate text.
  - The new item does not use "pipeline" and names only concrete referents.
  - The new item hardcodes no path (uses the `<artifacts-folder>` placeholder) and carries no tool-specific reference.

### Task 5: Add the run-pointer detection item to `docs-reviewer`

- **Goal:** Give `docs-reviewer` the same detection checklist item, catching host-project run-pointers in a docs batch and treating a real pointer as a must-fix that blocks approval.
- **Type:** tdd
- **Files to change:** `agents/docs-reviewer.md`
- **Changes:** Add one new bullet to the `### 2. Review the changes` → "Check, for the tasks in this batch:" list (the list whose items are **Per-task Acceptance coverage**, **Accuracy against shipped code**, **Audience fit**, **Faithful rationale**, **Drift sweep**, **Docs-plan adherence**, **Convention compliance**). Use the checklist's house style and the **finding voice**, mirroring the `code-reviewer` detection item from Task 4 (same discriminator, same not-a-violation cases, same agent-name-tag exemption, same must-fix tie-in), adapting only to this reviewer's docs surfaces. This reviewer already uses the `<artifacts-folder>` placeholder, so express the boundary with that token; no path is hardcoded. Keep the shared discriminator clause aligned with Task 4. This is a detection predicate, NOT the producer disposition pasted verbatim (AC6).
- **Depends on:** none (keep the shared discriminator clause consistent with Task 4 and the producer bullets)
- **Traces to:** Spec requirements R2, R3, R5, R6, R8, R9, R10; Design decisions "Referent-based detection by reviewer judgment, not a token scan", "Distinct role-appropriate forms — disposition vs. detection", "Commit descriptive content is in scope; the agent-name tag is exempt"; Acceptance criteria AC1, AC2, AC3, AC4, AC5, AC6, AC7.
- **Acceptance:**
  - `agents/docs-reviewer.md` gains exactly one new bullet, in the `### 2. Review the changes` → "Check, for the tasks in this batch:" list, as a peer of the existing check items.
  - The new item is in the finding/detection voice matching the checklist house style — not the producer disposition worded as an instruction to write.
  - The new item scopes detection to output outside the `<artifacts-folder>` (the batch's host-project output, including producer commit subjects) and does not ask the reviewer to inspect the run's own artifacts.
  - The new item identifies a violation by all three discriminator forms and is phrased as a judgment about the referent — no token/keyword/pattern list to grep.
  - The new item names the not-a-violation cases (domain vocabulary as subject matter; example artifact references) and exempts the commit agent-name tag.
  - The new item ties a real pointer to the must-fix / block-approval posture, adding no new gate text.
  - The new item does not use "pipeline" and names only concrete referents.
  - The new item hardcodes no path (uses the `<artifacts-folder>` placeholder) and carries no tool-specific reference.

## Acceptance-criteria coverage map

- **AC1** (a run-pointer is caught) → Tasks 1–3 (producers forbid writing it) and Tasks 4–5 (reviewers catch it as a must-fix); Flow 1.
- **AC2** (domain vocabulary not caught) → all five tasks state the referent-based discriminator and the not-a-violation cases; Flow 2.
- **AC3** (agent-name tag allowed) → all five tasks exempt the tag; Flow 3.
- **AC4** (artifacts may reference the run) → all five tasks scope the rule to output outside the artifacts folder; Tasks 4–5 restrict the reviewer to host-project output; Flow 4.
- **AC5** (rule text is pipeline-free) → all five tasks name only concrete referents and avoid "pipeline"; Flow 5.
- **AC6** (role-appropriate placement) → Tasks 1–3 place a Guidelines disposition; Tasks 4–5 place a review-checklist detection item; the two forms differ in voice and placement; Flow 6.
- **AC7** (generic wording) → all five tasks hardcode no path and carry no tool-specific reference; Flow 7.
