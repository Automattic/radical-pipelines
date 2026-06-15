# Code Plan: Plan-driven test selection and reviewer-side behavior verification

## Overview

This feature edits this repository's own Radical Pipelines skill (Markdown agent and reference files) to (1) make test selection a phase-3 planning duty — the code-plan-writer adds a required-test-commands floor and an e2e test plan to `code-plan.md`, and the code-plan-reviewer validates both; (2) relocate behavior verification from the writer to the code-reviewer; and (3) split the single `code-writer` agent into `code-writer-tdd` and `code-writer-e2e`, dispatched by a plan-declared task `Type`. The tasks below are ordered so the agent-file edits land first, then the two convention/reference/roster lockstep edits, then a final structural-check test that asserts the whole edit is internally consistent. All paths are real paths verified in this worktree. The skill root is `skills/radical-pipelines/`; agent files live at the repository-root `agents/` directory; `README.md` and `.rp.md` are at the repository root.

**Important divergence from the design doc (resolved against the actual post-#121 codebase, not a prior-phase decision):** Design §6 and spec R8/AC5 say the *gate-running-agents enumeration* lives in `load.md` (L30) and that `setup.md` has an *illustrative example row* (L189). Neither is true in this worktree. #121 (merged as PR #124) placed the gate-running-agents enumeration entirely in `setup.md`: line 183 (`one or more of \`code-writer\`, \`code-reviewer\`, \`doc-writer\`, \`doc-reviewer\``) and line 185 (the per-task/per-pipeline reminder, which also names those agents). `load.md` contains **no** such enumeration, and `setup.md` has **no** illustrative agents example row. The spec's *intent* — every live place that enumerates the gate-running agents must name the two new writers and the views must agree — is satisfied by editing the real locations (`setup.md` L183 and L185). `load.md` needs no edit. The "setup.md example row" sub-edit is vacuous (nothing to change) and is dropped. This is recorded so the reviewer and writers are not misled by the design's stale `load.md`/`L189` references. The `.changeset/agent-scoped-guardrails.md` enumeration is a historical record of #121 and is out of scope (editing it would be migration/historical churn, contrary to AC8).

## Required test commands

<!-- Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid. -->

| Name | Command | Covers |
| ---- | ------- | ------ |
| tests | `npm test` | Runs the project's Node test suite (`node --test 'scripts/test/**/*.test.mjs'`). Confirms the test runner resolves and terminates and that nothing structural regressed across the commits. |

<!--
Floor rationale: `.rp.md` defines no Guardrails convention, so there is no project-wide guardrails channel for this repo; `npm test` is the project's single test command. It is uniform across both writer types and runs/terminates today (verified: 22 pass). Every task in this plan is a Markdown-only skill edit that does not touch any code the existing tests cover, so the floor runs and stays green at every commit — the planner's floor-satisfiability obligation holds trivially. The feature adds no automatable runtime behavior, so no test command beyond this floor is required.
-->

## E2E test plan

<!-- The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive. -->

This feature's user-observable behavior is the **content of the shipped skill files** — what each agent file instructs, which phrases are present or absent, and that the lockstep views agree. There is no interactive runtime surface and no automatable test harness for skill prose, so each flow is a concrete, re-drivable inspection: a `git grep` / file-read assertion over the worktree's skill tree (excluding `.pipelines/` artifacts and, where noted, the project `.rp.md`). These flows have a single consumer here — the **code-reviewer**, which manually re-drives them per spec R7/R2 (re-driving the planned e2e flows from `code-plan.md`). There is no e2e *task* in this plan: the feature adds no automatable runtime behavior, so introducing a `scripts/test/` test file would be functionality beyond the spec and design (scope creep). Run all `git grep` from the repository root `/Users/luisherranz/Code/radical-pipelines/.claude/worktrees/122-plan-driven-test-selection-v2`.

### Flow 1: Planner owns the two new sections; old prohibition and false phrase gone

- **Steps:**
  1. Read `agents/code-plan-writer.md`.
  2. Confirm the plan-structure template contains a `## Required test commands` section and a `## E2E test plan` section, both between `## Overview` and `## Tasks`, with section order `# Code Plan` → `## Overview` → `## Required test commands` → `## E2E test plan` → `## Tasks`.
  3. Confirm the task-block template has a `- **Type:** tdd | e2e` line directly after `- **Goal:**`.
  4. `git grep -n "Do NOT plan tests" agents/code-plan-writer.md` and `git grep -n "derived from browser verification" agents/code-plan-writer.md`.
- **Expected:** Both grep commands return no matches. The two new sections and the `Type` field are present in the order above.
- **Traces to:** Acceptance criterion 1.

### Flow 2: Plan-reviewer executes commands, judges coverage, checks e2e, reworks the check

- **Steps:**
  1. Read `agents/code-plan-reviewer.md`.
  2. Confirm a step exists that instructs executing each command in the plan's Required test commands section exactly as written, asking only "did the command's runner resolve and terminate?", treating zero/missing tests at plan time as legitimate (not a rejection) and an unrunnable command as a rejection, per-command and independent, with a judge-before-running-destructive caveat.
  3. Confirm two judgment checklist items exist: required-test-commands coverage (credible floor, not exhaustive) and e2e coverage (planned flows cover the spec's acceptance criteria and edge cases).
  4. Confirm the old "No test planning" check is reworked to a scoped "No unit-test planning" check (flags only tasks prescribing specific *unit* tests; the floor and e2e plan are planner-owned and not violations).
  5. `git grep -n "derived from browser verification" agents/code-plan-reviewer.md`.
- **Expected:** The execution step and both coverage checks are present; the reworked check is scoped to unit tests; the grep returns no matches.
- **Traces to:** Acceptance criterion 2.

### Flow 3: Old writer gone; two new writers exist and are correctly shaped

- **Steps:**
  1. `ls agents/code-writer.md` (expect: not found); `ls agents/code-writer-tdd.md agents/code-writer-e2e.md` (expect: both exist).
  2. Confirm `agents/code-writer-tdd.md` frontmatter is `name: code-writer-tdd` and `agents/code-writer-e2e.md` frontmatter is `name: code-writer-e2e`.
  3. Confirm the tdd writer writes unit tests via RED/GREEN/REFACTOR only and carries the UI-conventions duty; the e2e writer implements the planner's e2e specs (realize each named flow's Steps/Expected as an automated e2e test) with no RED/GREEN/REFACTOR.
  4. Confirm neither file contains a "Behavior verification" step nor a "Derive end-to-end tests" self-derivation step. `git grep -n "Behavior verification\|Derive end-to-end" agents/code-writer-tdd.md agents/code-writer-e2e.md`.
  5. Confirm each file has a "Run the gates" step that runs BOTH its guardrail selection AND the required-test-commands floor before commit, under one shared two-question outcome model (unrunnable declared gate = blocker/drift; runs-and-exits-non-zero = work to do).
  6. Confirm the tdd writer's guardrail-read line names `code-writer-tdd` and the e2e writer's names `code-writer-e2e`, each also selecting no-agent guardrails.
- **Expected:** `code-writer.md` absent; both new files present with correct frontmatter and the shapes above; no verification/derive step in either; both run guardrails + floor before commit; the grep at step 4 returns no matches.
- **Traces to:** Acceptance criterion 3.

### Flow 4: Reviewer keeps free-form verification + evidence byte-identical and adds the re-drive

- **Steps:**
  1. Read `agents/code-reviewer.md` step "### 3. Behavior verification".
  2. Confirm the original free-form verification body and its evidence sentence ("A verification claim without evidence is not a verification — either produce the evidence or reject the batch.") are present byte-identical to the pre-change text.
  3. Confirm a new sentence instructing the reviewer to additionally re-drive each flow in the plan's E2E test plan section of `code-plan.md` (perform Steps, confirm Expected, capture evidence as above) appears in step 3, positioned before the evidence sentence.
- **Expected:** The free-form verification and evidence text are unchanged; the re-drive sentence is present and ordered before the evidence sentence.
- **Traces to:** Acceptance criterion 4.

### Flow 5: Gate-running enumeration and Agents-field name the two writers and agree

- **Steps:**
  1. `git grep -n "code-writer-tdd\|code-writer-e2e" skills/radical-pipelines/reference/conventions/setup.md`.
  2. Confirm `setup.md` line 183's agents list and line 185's per-task/per-pipeline reminder both name `code-writer-tdd` and `code-writer-e2e` (and `code-reviewer`, `doc-writer`, `doc-reviewer`) and no longer name a bare `code-writer`.
  3. Confirm the two views (L183 option list and L185 reminder) name the same set.
- **Expected:** Both `setup.md` enumerations name the two new writers and agree; no bare `code-writer` remains in either. (`load.md` is unchanged — it carries no such enumeration; see Overview divergence note.)
- **Traces to:** Acceptance criterion 5.

### Flow 6: Phase-4 reference dispatches by Type with two writer rows

- **Steps:**
  1. Read `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`.
  2. Confirm the overview and step 3.1 launch dispatch by the task's `Type` — `code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task — and that `Type` is added to the launch field list.
  3. Confirm the Required-agents table has two writer rows (`code-writer-tdd`, `code-writer-e2e`), neither attributing behavior verification to the writer, and that no required-agents table row or step still names a single bare `code-writer`. (`git grep -n "\`code-writer\`" "skills/radical-pipelines/reference/autonomous-phases/4 - code.md"` returns no match for the exact `code-writer` token in a row/step; generic plural "code-writers"/"code-writer in the batch" sequencing prose may remain.)
- **Expected:** Two writer rows; type-conditional launch with `Type` in the field list; no behavior-verification attribution to the writer; no bare-`code-writer` dispatch row/step.
- **Traces to:** Acceptance criterion 6.

### Flow 7: Assisted phase-3 carries the new sections + inverted rules; README roster updated; no contradicting live `code-writer`

- **Steps:**
  1. Read `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`. Confirm the `code-plan.md` skeleton gains `## Required test commands` and `## E2E test plan` (same shapes as the autonomous schema) and `- **Type:** tdd | e2e` after Goal; confirm the L30 constraint and L117 self-check are inverted to the planner-owns-floor-and-e2e / unit-tests-stay-the-writer's boundary, and L152's wording is narrowed accordingly.
  2. Confirm the step-4 self-check gains a required-test-commands validation item (driver executes each command and surfaces the result to the owner — runner resolves/terminates; zero/missing tests fine; unrunnable is a problem to fix with the owner; per-command and independent) and an e2e-coverage item next to the existing coverage self-check.
  3. Read `README.md` line 112: confirm the shipped-agent roster names `code-writer-tdd` and `code-writer-e2e` and no longer names a bare `code-writer`.
  4. `git grep -n "\`code-writer\`" -- ':!.pipelines/*' ':!.rp.md'` across the worktree. Confirm every remaining hit is either an abstract phase-4-role mention true of both writers (assisted 3 L25/L59/L96/L114; assisted 2 L48/L81/L100) or a purely illustrative example (`agents/doc-writer.md`, `website/demo.js`) — none presents `code-writer` as a current shipped/dispatched agent.
- **Expected:** Assisted phase-3 carries both sections, the `Type` field, the inverted rules, and the two new self-check items; README roster updated; no live skill file presents a bare `code-writer` as a current agent in a way that contradicts the split.
- **Traces to:** Acceptance criterion 7.

### Flow 8: No migration or backward-compatibility text introduced

- **Steps:**
  1. Review the full diff of this feature (`git diff <base>..HEAD`).
  2. Confirm no added text describes migrating, deprecating, or maintaining backward compatibility for a now-gone `code-writer` agent or for guardrails naming it; the steady-state inert-guardrail rule is relied on without new restatement.
- **Expected:** No migration/backward-compatibility prose anywhere in the diff.
- **Traces to:** Acceptance criterion 8.

## Tasks

<!-- Ordered, numbered. Every task is a tdd-type Markdown skill edit: this feature edits documentation/skill prose and adds no automatable runtime behavior, so there is no e2e task (an e2e task would require a runtime flow to automate, which this feature does not introduce — adding one would be scope creep). The E2E test plan flows above are re-driven by the code-reviewer per spec R7, not by a code-writer-e2e. Per-task unit-test selection stays the tdd writer's, and for pure-prose edits the RED phase reduces to the structural-content assertions the task Acceptance describes. -->

### Task 1: Add the two planner sections, the Type field, and invert test-planning rules in code-plan-writer.md

- **Type:** tdd
- **Goal:** Make the code-plan-writer produce a `## Required test commands` section and a `## E2E test plan` section in `code-plan.md`, add `- **Type:** tdd | e2e` to the task-block template, and invert the test-planning prohibition (removing the false "derived from browser verification" phrase), per design §1.
- **Files to change:** `agents/code-plan-writer.md`
- **Changes:**
  - In the plan-structure template (currently the fenced block at lines 23–47), insert two new sections between `## Overview` and `## Tasks`, in this order: `## Required test commands` then `## E2E test plan`. Final section order: `# Code Plan` → `## Overview` → `## Required test commands` → `## E2E test plan` → `## Tasks`.
    - `## Required test commands` shape — pure data, no discipline text: an HTML comment `<!-- Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid. -->` followed by a Markdown table with columns `Name | Command | Covers`. Do not add an `Agents` column (the floor is uniform). Do not embed run-before-every-commit / two-question discipline text (that lives at the consumers).
    - `## E2E test plan` shape: an HTML comment `<!-- The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive. -->` followed by a numbered list of `### Flow N: <title>` blocks, each with `- **Steps:** ...`, `- **Expected:** ...`, `- **Traces to:** Acceptance criterion N / Edge case <desc>` (reuse the existing `Traces to` identifier; introduce no new notation).
  - In the task-block template, add `- **Type:** tdd | e2e` directly after `- **Goal:** ...`.
  - Replace the "Do NOT plan tests" guideline (currently line 64) with a positive instruction in the spirit of design §1: instruct the planner to choose the required-test-commands floor and transform the spec's acceptance criteria and edge cases into the e2e test plan (the two new sections); state that per-task unit-test selection stays the writer's (task Acceptance describes *what must be true*, and the tdd writer turns it into unit tests in the RED phase) and that the planner must not prescribe which unit tests a task writes. Remove the "derived from browser verification" phrasing.
  - Narrow the per-task-acceptance guideline (currently line 60) so the actor that turns Acceptance into unit tests is "the **tdd writer**" in the RED phase (not a universal "the code-writer"), since e2e tasks now exist.
- **Depends on:** none
- **Traces to:** Spec R1, R2, R3 / Acceptance criterion 1 / Design §1
- **Acceptance:**
  - `agents/code-plan-writer.md`'s plan template contains `## Required test commands` (with the `Name | Command | Covers` table and the "floor / None is valid" comment) and `## E2E test plan` (with `### Flow N` blocks carrying Steps/Expected/Traces to), both between `## Overview` and `## Tasks`, in that order.
  - The task-block template has `- **Type:** tdd | e2e` immediately after `- **Goal:**`.
  - The file no longer contains the phrases "Do NOT plan tests" or "derived from browser verification".
  - The file instructs planning the floor and e2e flows while leaving per-task unit-test selection to the tdd writer's RED phase, and does not mandate unit-test planning.
  - The per-task-acceptance guideline attributes turning Acceptance into unit tests to the tdd writer in the RED phase.

### Task 2: Add the execution step, coverage checks, and reworked unit-test check in code-plan-reviewer.md

- **Type:** tdd
- **Goal:** Give the code-plan-reviewer an execute-the-required-test-commands step, two new coverage judgment items, and a reworked scoped "No unit-test planning" check; remove the false "derived from browser verification" phrase, per design §2.
- **Files to change:** `agents/code-plan-reviewer.md`
- **Changes:**
  - Insert a new execution step as step 2 (pushing the current "Review the plan" to step 3), instructing the reviewer to execute each command in the plan's Required test commands section exactly as written. The single question is "did the command's runner resolve and terminate?" — not whether tests exist or pass. State that the feature is not implemented yet, so a runner that runs but reports zero or missing tests is legitimate and is NOT a rejection; a command that cannot run (runner missing, bad invocation, never returns) IS a rejection; validation is per-command and independent; and a command that writes/deploys/destroys takes effect against the worktree, so judge before running it. Restate inline — no reference to `setup.md`.
  - In the review checklist (currently in the "Review the plan" step), add two judgment items next to the existing Coverage / Feasibility items:
    - **Required-test-commands coverage** — does the floor plausibly cover the feature? A credible floor, not exhaustive (writers add their own tests).
    - **E2E coverage** — do the planned e2e flows cover the spec's acceptance criteria and edge cases? Flag any criterion or material edge case with no covering flow.
  - Rework the existing "No test planning" check (currently line 28) into a scoped "No unit-test planning" check: does the plan refrain from prescribing which *unit* tests a task writes? Unit-test selection stays the writer's (TDD from per-task Acceptance); flag any task that prescribes specific unit tests; note that the required-test-commands floor and the e2e test plan are planner-owned and validated above, so they are not a violation. Remove the "derived from browser verification" phrase.
- **Depends on:** none
- **Traces to:** Spec R3, R4 / Acceptance criterion 2 / Design §2
- **Acceptance:**
  - `agents/code-plan-reviewer.md` has a step that instructs executing each required-test-command exactly as written, asking only whether the runner resolves and terminates, treating zero/missing tests at plan time as legitimate, rejecting an unrunnable command, per-command and independent, with a judge-before-running-destructive caveat, and without referencing `setup.md`.
  - The review checklist contains a required-test-commands-coverage item and an e2e-coverage item.
  - The old "No test planning" check is reworked to a scoped check that flags only prescribing specific *unit* tests and explicitly does not treat the planner-owned floor or e2e plan as a violation.
  - The file no longer contains the phrase "derived from browser verification".

### Task 3: Create agents/code-writer-tdd.md

- **Type:** tdd
- **Goal:** Create the new `code-writer-tdd` agent file — unit tests via TDD only, carrying the UI-conventions duty, running its guardrail selection AND the required-test-commands floor before commit, with no behavior-verification or e2e-self-derivation step — per design §3.
- **Files to change:** `agents/code-writer-tdd.md` (new)
- **Changes:** Author a new agent file modeled on the current `agents/code-writer.md` scaffolding (role frame, gather-context, run-the-gates, commit-and-report, guidelines), collapsed to four steps — **Gather context / Implement with TDD / Run the gates / Commit and report** — with these specifics:
  - Frontmatter: `name: code-writer-tdd`; description naming unit tests via TDD.
  - Gather context: the assigned task block; the Required test commands section of `code-plan.md`; guardrails naming `code-writer-tdd` or no agents; any cited review issues scoped to the task.
  - Implement with TDD: keep RED/GREEN/REFACTOR for unit tests and the public-symbol inline-documentation block. Replace the old "e2e not in RED, added in step 4…" line with a one-line positive statement that this writer writes unit tests only (no step-4 back-reference). Keep the UI-conventions duty here, phrased conditionally ("if your task involves UI, follow the host project's UI conventions").
  - Run the gates: rename to "Run the gates"; the writer runs two command sets — (i) its guardrail selection and (ii) the required-test-commands floor — under ONE shared two-question outcome model stated once and applying to both: an unrunnable declared gate is a blocker (drift — the plan-reviewer already validated the floor runs); a gate that runs and exits non-zero is work to do, not a blocker; no bypass; all pass before commit. Drop the back-reference to the removed verification step.
  - Commit and report: as in the current writer.
  - Guidelines: carry over the current writer's guidelines, adjusting the self-containment guideline to: "The task block plus the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan." The guardrail-read line names `code-writer-tdd`.
  - The file must not contain a "Behavior verification" step or a "Derive end-to-end tests" step.
- **Depends on:** none
- **Traces to:** Spec R5, R6 / Acceptance criterion 3 / Design §3
- **Acceptance:**
  - `agents/code-writer-tdd.md` exists with frontmatter `name: code-writer-tdd`.
  - It instructs writing unit tests via RED/GREEN/REFACTOR only and documents public symbols; it carries the UI-conventions duty conditionally.
  - It has no "Behavior verification" step and no "Derive end-to-end tests" step.
  - It has a "Run the gates" step that runs both the guardrail selection and the required-test-commands floor before commit, under one two-question outcome model (unrunnable declared gate = blocker/drift; runs-and-exits-non-zero = work to do; no bypass; all pass before commit).
  - Its guardrail-read line names `code-writer-tdd` and it selects no-agent guardrails too.
  - Its self-containment guideline names the task block plus the Required test commands section as inputs.

### Task 4: Create agents/code-writer-e2e.md

- **Type:** tdd
- **Goal:** Create the new `code-writer-e2e` agent file — implements the planner's e2e specs from `code-plan.md`, runs its guardrail selection AND the required-test-commands floor before commit, with no behavior-verification or e2e-self-derivation step and no RED/GREEN/REFACTOR — per design §3.
- **Files to change:** `agents/code-writer-e2e.md` (new)
- **Changes:** Author a new agent file sharing the `code-writer-tdd` scaffolding verbatim (role frame, gather-context, run-the-gates, commit-and-report, most guidelines), collapsed to four steps — **Gather context / Implement the planned e2e flows / Run the gates / Commit and report** — with these specifics:
  - Frontmatter: `name: code-writer-e2e`; description: implements the planner's e2e test specs from `code-plan.md`.
  - Gather context: the assigned task block (which names the flow(s) it implements); the E2E test plan section AND the Required test commands section of `code-plan.md`; guardrails naming `code-writer-e2e` or no agents; any cited review issues scoped to the task.
  - Implement the planned e2e flows (replaces the TDD step): for each flow named in the task block, read its `### Flow N` spec (Steps/Expected/Traces to) from the E2E test plan section, write an automated e2e test realizing the Steps and asserting the Expected, and add it to the project's e2e suite per host testing convention. No RED/GREEN/REFACTOR — instead a light confirm: "author the test and confirm it genuinely exercises the flow and passes against the built behavior" (production behavior exists by the time e2e tasks run, per the planner's ordering; this also catches vacuously-passing tests). Per-task Acceptance (flows covered by passing e2e tests) is the contract. Do NOT carry the heavyweight public-symbol documentation block; replace it with a one-line guideline: "follow project conventions for test code, including any inline documentation the test convention expects."
  - Run the gates: identical to `code-writer-tdd`'s "Run the gates" step (guardrail selection AND required-test-commands floor; one two-question outcome model; no bypass; all pass before commit).
  - Commit and report: as in `code-writer-tdd`.
  - Guidelines: shared with `code-writer-tdd`, except the guardrail-read line names `code-writer-e2e`, and the self-containment guideline carve-out names both shared sections: "The task block, the E2E test plan section, and the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."
  - The file must not contain a "Behavior verification" step or a "Derive end-to-end tests" self-derivation step.
- **Depends on:** Task 3 (so the shared scaffolding is settled and copied verbatim)
- **Traces to:** Spec R5, R6 / Acceptance criterion 3 / Design §3
- **Acceptance:**
  - `agents/code-writer-e2e.md` exists with frontmatter `name: code-writer-e2e`.
  - It instructs implementing each named flow's Steps/Expected as an automated e2e test and confirming it genuinely exercises the flow and passes (no RED/GREEN/REFACTOR).
  - It does not carry the public-symbol documentation block; it has a one-line test-code-convention guideline instead.
  - It has no "Behavior verification" step and no "Derive end-to-end tests" self-derivation step.
  - It has a "Run the gates" step that runs both the guardrail selection and the required-test-commands floor before commit, under one two-question outcome model.
  - Its guardrail-read line names `code-writer-e2e`, it selects no-agent guardrails too, and its self-containment guideline names the task block, the E2E test plan section, and the Required test commands section as inputs.

### Task 5: Delete agents/code-writer.md

- **Type:** tdd
- **Goal:** Remove the obsolete single `code-writer` agent file now that the two replacements exist.
- **Files to change:** `agents/code-writer.md` (delete)
- **Changes:** Delete the file `agents/code-writer.md`.
- **Depends on:** Task 3, Task 4 (the replacements must exist first; Task 3/4 copied this file's scaffolding before it is removed)
- **Traces to:** Spec R5 / Acceptance criterion 3 / Design §3
- **Acceptance:**
  - `agents/code-writer.md` no longer exists in the worktree.

### Task 6: Add reviewer-side e2e re-drive while keeping verification + evidence byte-identical

- **Type:** tdd
- **Goal:** Make the code-reviewer additionally re-drive the planned e2e flows from `code-plan.md`, while keeping its free-form behavior-verification body and evidence sentence byte-identical and giving the test-quality check a light tie-to-plan rephrase, per design §4.
- **Files to change:** `agents/code-reviewer.md`
- **Changes:**
  - In step "### 3. Behavior verification" (the body is a single line — currently line 34; the design doc's "L35" is off by one, the content anchor governs), keep the existing free-form verification body and the evidence sentence ("A verification claim without evidence is not a verification — either produce the evidence or reject the batch.") byte-identical. Insert a new sentence before that evidence sentence: instruct the reviewer to additionally manually re-drive each flow in the plan's E2E test plan section of `code-plan.md` — perform the flow's Steps and confirm its Expected outcome, capturing evidence as above. The evidence requirement must close over both the free-form verification and the re-drive (i.e., the re-drive sentence precedes the evidence sentence within step 3).
  - Lightly rephrase the test-quality check (currently line 28 — `- **Test quality** — …`; the design doc's "L29" is off by one) so it ties to the plan: end-to-end tests are present for the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan), rather than "for any user-observable behavior the batch changed". Make no other wording changes to the check.
  - Leave the review template (currently the fenced block; "## Behavior verification" heading region) and the "Run the guardrails" guideline byte-identical.
- **Depends on:** none
- **Traces to:** Spec R7 / Acceptance criterion 4 / Design §4
- **Acceptance:**
  - `agents/code-reviewer.md` step 3 retains the original free-form verification body and the evidence sentence byte-identical.
  - Step 3 contains a new sentence instructing the reviewer to re-drive each flow in the plan's E2E test plan section (perform Steps, confirm Expected, capture evidence as above), positioned before the evidence sentence.
  - The test-quality check ties end-to-end test presence to the plan's E2E test plan (the batch's e2e tasks), not to derivation from behavior.
  - The review template's "## Behavior verification" section and the "Run the guardrails" guideline are unchanged.

### Task 7: Update the phase-4 reference, the setup.md enumeration, and the README roster (lockstep)

- **Type:** tdd
- **Goal:** Update the phase-4 reference to dispatch by `Type` with two writer rows; update the two gate-running-agents enumerations in `setup.md` to name the two new writers (the real R8/AC5 locations — see Overview divergence note); and update the README shipped-agent roster — per design §5, §6, §7 (with §6 corrected to the actual file locations). No migration text anywhere.
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`, `skills/radical-pipelines/reference/conventions/setup.md`, `README.md`
- **Changes:**
  - `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`:
    - Overview (currently line 3): say the orchestrator dispatches each code task to a fresh writer chosen by the task's `Type` — `code-writer-tdd` for tdd tasks, `code-writer-e2e` for e2e tasks.
    - Required-agents table (currently the single `code-writer` row at line 25): replace it with two writer rows — `code-writer-tdd` ("One fresh instance per task. Implements its assigned task with TDD, runs the gates, commits.") and `code-writer-e2e` ("One fresh instance per task. Implements the planned e2e flows, runs the gates, commits."). Neither row says "verifies behavior". Use "runs the gates", not "validates".
    - Step 1 (currently line 30): optionally append ", capturing each task's Type" (minimal; the dispatch decision is read from the block at launch).
    - Step 3.1 launch (currently line 33): make the launch type-conditional — a fresh writer chosen by the task's `Type` (`code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task) — still passing the verbatim task block, and add `Type` to the parenthetical field list so it stays in sync.
    - Leave the generic plural "code-writers" / "code-writer in the batch" sequencing prose (lines 34–35) and the mermaid "Code Writer" node unchanged. No required-agents row or step may still name a single bare `code-writer`.
  - `skills/radical-pipelines/reference/conventions/setup.md`:
    - Line 183 (the gate-running-agents enumeration `one or more of \`code-writer\`, \`code-reviewer\`, \`doc-writer\`, \`doc-reviewer\``): replace the bare `code-writer` with `code-writer-tdd`, `code-writer-e2e`, so the list reads `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`.
    - Line 185 (the per-task/per-pipeline reminder that names `code-writer`s and `doc-writer`s vs `code-reviewer`s and `doc-reviewer`s): reconcile its `code-writer` mentions with the two-writer reality so it agrees with line 183 (the two views name the same set). Keep its meaning — the writers run once per task, the reviewers once per pipeline run.
    - Do NOT edit `load.md` (it carries no gate-running enumeration). Add no migration or backward-compatibility text.
  - `README.md` line 112: in the shipped-agent roster, replace `code-writer` with `code-writer-tdd`, `code-writer-e2e`.
- **Depends on:** Task 3, Task 4 (the two writer names must be the agreed final names; the roster/enumeration/dispatch references must match)
- **Traces to:** Spec R8, R9, R10 (README portion) / Acceptance criteria 5, 6, 7 (README + enumeration) / Design §5, §6 (corrected), §7
- **Acceptance:**
  - `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` dispatches by `Type`: the overview and step 3.1 launch route `tdd`→`code-writer-tdd` and `e2e`→`code-writer-e2e`, `Type` appears in the launch field list, the Required-agents table has two writer rows, neither writer row attributes behavior verification to the writer, and no required-agents row or step names a single bare `code-writer`.
  - `skills/radical-pipelines/reference/conventions/setup.md` lines 183 and 185 both name `code-writer-tdd` and `code-writer-e2e` (alongside `code-reviewer`, `doc-writer`, `doc-reviewer`), no longer name a bare `code-writer`, and agree with each other on the set.
  - `load.md` is unchanged.
  - `README.md` line 112 names `code-writer-tdd` and `code-writer-e2e` and no longer names a bare `code-writer`.
  - No migration or backward-compatibility text is introduced in any of these files.

### Task 8: Update assisted phase-3 with the new sections, Type field, inverted rules, and self-checks

- **Type:** tdd
- **Goal:** Update `skills/radical-pipelines/reference/assisted-phases/3 - plan.md` to carry the two new planner sections, the `Type` field, the inverted test-planning rules, and the two new step-4 self-check items, mirroring the autonomous schema, per design §8 and spec R10.
- **Files to change:** `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- **Changes:**
  - In the `code-plan.md` skeleton (currently the fenced block at lines 126–146), add `## Required test commands` and `## E2E test plan` in the same order and shapes as the autonomous schema (§1 / Task 1), and add `- **Type:** tdd | e2e` after `- **Goal:**`.
  - Invert the L30 constraint ("You MUST NOT plan tests in the code plan…") and the L117 self-check item ("No test planning…") to the same boundary as Task 1: the planner owns the required-test-commands floor and the e2e flows; per-task unit-test selection stays the writer's TDD. Narrow L152's wording accordingly (the actor turning Acceptance into unit tests is the tdd writer in phase 4).
  - Add two items to the step-4 code-plan coverage self-check (currently lines 109–118):
    - **Required-test-commands validate** — execute each command in the Required test commands section and surface the result to the owner: did the command's runner resolve and terminate? The feature isn't implemented yet, so a runner reporting zero or missing tests is fine; a command that cannot run (runner missing, bad invocation, never returns) is a problem to fix with the owner before synthesis. Per-command and independent.
    - **E2E coverage** — placed next to the existing coverage self-check (line 109): do the planned e2e flows cover the spec's acceptance criteria and edge cases?
  - Do not rewrite the abstract singular `code-writer` role mentions (lines 25, 59, 96, 114) — they are abstract phase-4-role references true of both writers, not roster/dispatch claims.
  - Add no migration or backward-compatibility text.
- **Depends on:** none
- **Traces to:** Spec R10 / Acceptance criterion 7 / Design §8
- **Acceptance:**
  - `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`'s `code-plan.md` skeleton contains `## Required test commands`, `## E2E test plan`, and `- **Type:** tdd | e2e` after Goal, mirroring the autonomous schema.
  - Its L30 constraint and L117 self-check are inverted to the planner-owns-floor-and-e2e / unit-tests-stay-the-writer's boundary, and L152 attributes unit tests to the tdd writer in phase 4.
  - Its step-4 self-check contains a required-test-commands validation item (driver executes and surfaces to the owner; runner-resolves-and-terminates; zero/missing tests fine; unrunnable is a problem to fix with the owner; per-command and independent) and an e2e-coverage item.
  - It introduces no migration or backward-compatibility text.
