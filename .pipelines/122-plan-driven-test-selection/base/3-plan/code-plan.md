# Code Plan: Plan-driven test selection and reviewer-side behavior verification

## Overview

This change edits the Radical Pipelines skill (a prose/Markdown codebase) so that test selection becomes a phase-3 planning duty and behavior verification happens once at the reviewer. The work is sequenced by file independence: the planner-side agents first (`code-plan-writer.md`, `code-plan-reviewer.md`), then the writer split (delete `code-writer.md`, create `code-writer-tdd.md` and `code-writer-e2e.md`), then the reviewer (`code-reviewer.md`), then the orchestrator reference (phase-4 `4 - code.md`), then the lockstep convention pair (`load.md` ⇄ `setup.md`) plus the `README.md` roster, and finally the assisted phase-3 reference (`assisted-phases/3 - plan.md`). Each task is a self-contained set of prose edits to one file (except the lockstep pair, which must move together), anchored against the live HEAD text of the stacked-on-#121 branch. All edits are documentation; there is no executable code and no host-project test suite — acceptance is verified by reading the resulting Markdown.

## Required test commands

<!-- Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid. -->

| Name | Command | Covers |
| ---- | ------- | ------ |
| None | —       | This repository is a prose skill with no executable build, test, or lint suite. There is no command floor to run before commits; acceptance is verified by reading the resulting Markdown. |

## E2E test plan

<!-- The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive. -->

This repository ships no application and no end-to-end test harness — it is the Radical Pipelines skill, authored as Markdown. There is no runnable user-facing flow to automate or re-drive. The spec's acceptance criteria are verified by reading the edited skill files; the per-task **Acceptance** entries below are the concrete, re-readable checks that stand in for e2e flows. Accordingly there are no `### Flow N` blocks, and no task is typed `e2e`; every task is `tdd` (prose edit verified by reading the result).

## Tasks

### Task 1: Add the two planner sections and invert test-planning rules in `code-plan-writer.md`

- **Goal:** Make the autonomous planner produce a Required test commands section and an E2E test plan section in `code-plan.md`, add the per-task `Type` field, and invert the "Do NOT plan tests" prohibition to the planner-owned channels while preserving the unit-TDD boundary.
- **Type:** tdd
- **Files to change:** `agents/code-plan-writer.md`
- **Changes:**
  - In the `## Write the plan` structure block, insert `## Required test commands` and `## E2E test plan` between `## Overview` and `## Tasks`, so section order is `# Code Plan` → `## Overview` → `## Required test commands` → `## E2E test plan` → `## Tasks` (per design §1).
  - Use the design §1 `## Required test commands` shape: the HTML comment "`Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid.`" followed by a `| Name | Command | Covers |` table (no `Agents` column).
  - Use the design §1 `## E2E test plan` shape: the HTML comment "`The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive.`" followed by `### Flow N: <title>` blocks with `- **Steps:**`, `- **Expected:**`, `- **Traces to:** Acceptance criterion N / Edge case <desc>`.
  - Add `- **Type:** tdd | e2e` to the task block immediately after `- **Goal:**`.
  - Invert the live "**Do NOT plan tests.**" guideline (currently: "The code-writer writes tests using test-driven development — unit tests during red/green/refactor, and end-to-end tests derived from browser verification plus edge cases. Tasks describe what to build, not which tests to write.") to the design §1 replacement: "**Plan the test floor and e2e flows, not unit tests.** Choose the required-test-commands floor and transform the spec's acceptance criteria and edge cases into the e2e test plan (the two sections above). Per-task unit-test selection stays the writer's: task Acceptance describes *what must be true*, and the tdd writer turns it into unit tests in the RED phase. Do not prescribe which unit tests a task writes." This removes the now-false "derived from browser verification" phrase.
  - Narrow the **Per-task acceptance is required** guideline's actor: the clause currently reading "the code-writer turns them into tests in the RED phase of TDD" becomes "the **tdd writer** turns them into unit tests in the RED phase of TDD" (per design §1's narrowing of the now-falsely-universal actor).
- **Depends on:** none
- **Traces to:** Spec R1, R2, R3; Acceptance criterion 1; Design §1
- **Acceptance:**
  - The `## Write the plan` structure block contains `## Required test commands` and `## E2E test plan`, in that order, between `## Overview` and `## Tasks`.
  - The Required test commands shape shows a `| Name | Command | Covers |` table with no `Agents` column and the "None is valid" comment.
  - The E2E test plan shape shows `### Flow N` blocks with Steps / Expected / Traces to.
  - The task block lists `- **Type:** tdd | e2e` directly after `- **Goal:**`.
  - The phrase "derived from browser verification" no longer appears anywhere in the file, and the "Do NOT plan tests" prohibition is replaced by the planner-owns-floor-and-e2e guideline that explicitly leaves per-task unit-test selection to the writer.
  - The per-task acceptance guideline attributes RED-phase unit tests to the "tdd writer," not a generic "code-writer."

### Task 2: Add the three validation duties and rework the test-planning check in `code-plan-reviewer.md`

- **Goal:** Give the autonomous plan-reviewer one new execution step (validate required-test-commands run) plus two new coverage checklist items (required-test-commands coverage, e2e coverage), and rework the "No test planning" check to a scoped "No unit-test planning," removing the false "derived from browser verification" phrase.
- **Type:** tdd
- **Files to change:** `agents/code-plan-reviewer.md`
- **Changes:**
  - Insert a new execution step as **step 2** (titled e.g. "Validate the required-test-commands"), pushing the current "### 2. Review the plan" to step 3 and renumbering the subsequent steps (3 → 4 write the review, 4 → 5 commit and report), updating any internal step cross-references accordingly. The new step's body is the design §2 inline text: "Execute each command in the plan's Required test commands section, exactly as written. The one question is **did the command's runner resolve and terminate?** — not whether tests exist or pass. The feature is not implemented yet, so a runner that runs but reports zero or missing tests is legitimate and is NOT a rejection. A command that cannot run — runner missing, bad invocation, never returns — IS a rejection. Validation is per-command and independent. A command that writes, deploys, or destroys takes effect against the worktree — judge before running it." (No reference to setup.md.)
  - In the (renumbered) review checklist, add two judgment items next to the existing Coverage / Feasibility items: "**Required-test-commands coverage** — does the floor plausibly cover the feature? A credible floor, not exhaustive (writers add their own tests)." and "**E2E coverage** — do the planned e2e flows cover the spec's acceptance criteria and edge cases? Flag any criterion or material edge case with no covering flow."
  - Rework the live "**No test planning**" checklist item (currently: "does the plan refrain from specifying which unit or end-to-end tests to write? Tests are the code-writer's responsibility (unit via TDD, end-to-end derived from browser verification). Flag any task that prescribes specific tests.") to the design §2 scoped item: "**No unit-test planning** — does the plan refrain from prescribing which *unit* tests a task writes? Unit-test selection stays the writer's (TDD from per-task Acceptance). Flag any task that prescribes specific unit tests. (The required-test-commands floor and the e2e test plan are now planner-owned and are validated above — they are not a violation.)" This removes the "derived from browser verification" phrase.
- **Depends on:** none
- **Traces to:** Spec R4; Acceptance criterion 2; Design §2
- **Acceptance:**
  - A new execution step at position 2 instructs executing each required-test-command and confirms it runs (not that tests pass or exist), states zero/missing tests is legitimate and not a rejection, and states an unrunnable command is a rejection; the remaining steps are renumbered consistently with no dangling cross-references.
  - The review checklist contains a "Required-test-commands coverage" item and an "E2E coverage" item.
  - The "No test planning" item is replaced by a "No unit-test planning" item scoped to unit tests only, explicitly noting the floor and e2e plan are planner-owned and not violations.
  - The phrase "derived from browser verification" no longer appears anywhere in the file.

### Task 3: Split `code-writer.md` into `code-writer-tdd.md` and `code-writer-e2e.md`

- **Goal:** Delete `agents/code-writer.md` and create the two near-twin writer agents, each collapsing to four steps (Gather context / Implement / Run the gates / Commit and report), removing the behavior-verification and derive-e2e steps, folding the required-test-commands floor into the renamed "Run the gates" step under the shared two-question model, with correct `name:` frontmatter and the per-writer divergences from design §3.
- **Type:** tdd
- **Files to change:** delete `agents/code-writer.md`; create `agents/code-writer-tdd.md`; create `agents/code-writer-e2e.md`
- **Changes:**
  - **Delete** `agents/code-writer.md`.
  - **Create `agents/code-writer-tdd.md`** by adapting the deleted file's scaffolding:
    - Frontmatter `name: code-writer-tdd`; description "unit tests via TDD."
    - Four steps: 1. Gather context, 2. Implement with TDD, 3. Run the gates, 4. Commit and report. Remove the old step-3 "Behavior verification" and old step-4 "Derive end-to-end tests" entirely.
    - Step 1 guardrail-read line names `code-writer-tdd` (reads "the guardrails that name `code-writer-tdd` or name no agents") and adds the Required test commands section as an input.
    - Implement step keeps RED/GREEN/REFACTOR and the public-symbol documentation block; drop the "End-to-end tests are not written in the RED phase … added in step 4 …" line and replace with the positive one-liner "this writer writes unit tests only" (no step-4 back-reference).
    - Move the UI-conventions duty here, phrased conditionally: "if your task involves UI, follow the host project's UI conventions (components, design tokens, styling, i18n, accessibility, fonts, and any other UI conventions the host project documents)."
    - Step 3 "Run the gates" (renamed from "Run the writer guardrail selection"): the writer runs two command sets — (i) its guardrail selection and (ii) the required-test-commands floor — both under the SAME two-question outcome model and the same no-bypass / all-pass-before-commit rules, stated once. Keep the existing outcome bullets (empty selection; unrunnable declared gate is a blocker / drift; runs-and-exits-non-zero is work). Drop the back-reference to the removed behavior-verification step.
    - Update the self-containment guideline to: "The task block plus the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."
  - **Create `agents/code-writer-e2e.md`** sharing the same scaffolding verbatim, diverging per design §3:
    - Frontmatter `name: code-writer-e2e`; description "implements the planner's e2e test specs from `code-plan.md`."
    - Step 1 guardrail-read line names `code-writer-e2e`; inputs name both the E2E test plan section and the Required test commands section.
    - Implement step replaces TDD: for each flow named in the task block, read its `### Flow N` spec (Steps/Expected/Traces to) from the E2E test plan section, write an automated e2e test realizing the Steps and asserting the Expected, add it to the project's e2e suite per host testing convention; no RED/GREEN/REFACTOR — instead the light confirm "author the test and confirm it genuinely exercises the flow and passes against the built behavior."
    - Drop the heavyweight public-symbol documentation block; replace with the one-line guideline "follow project conventions for test code, including any inline documentation the test convention expects." (No UI-conventions duty here.)
    - Step 3 "Run the gates" identical to the tdd writer's (guardrail selection AND required-test-commands floor under the one shared two-question model).
    - Self-containment guideline carve-out names both shared sections: "The task block, the E2E test plan section, and the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."
- **Depends on:** none
- **Traces to:** Spec R5, R6; Acceptance criterion 3; Design §3
- **Acceptance:**
  - `agents/code-writer.md` no longer exists.
  - `agents/code-writer-tdd.md` exists with `name: code-writer-tdd`, has exactly four steps (Gather context / Implement with TDD / Run the gates / Commit and report), contains no behavior-verification step and no derive-e2e step, writes unit tests only, carries the conditional UI-conventions duty, names `code-writer-tdd` in its guardrail-read line, and its "Run the gates" step runs both the guardrail selection and the required-test-commands floor under one two-question outcome model.
  - `agents/code-writer-e2e.md` exists with `name: code-writer-e2e`, has the same four-step shape, contains no behavior-verification step and no derive-e2e step, implements the planner's e2e flows (read Flow spec → author automated test → light confirm, no RED/GREEN/REFACTOR), names `code-writer-e2e` in its guardrail-read line, carries the both-sections self-containment carve-out, and its "Run the gates" step matches the tdd writer's.
  - Neither file contains the "derived from browser verification" phrasing or a writer-side behavior-verification step.

### Task 4: Add planned-e2e re-drive to behavior verification in `code-reviewer.md`

- **Goal:** Keep the reviewer's step-3 free-form integrated verification and evidence sentence byte-identical, add a sentence directing the reviewer to manually re-drive each planned e2e flow before the evidence sentence, and lightly rephrase the step-2 test-quality check to tie e2e presence to the plan.
- **Type:** tdd
- **Files to change:** `agents/code-reviewer.md`
- **Changes:**
  - In "### 3. Behavior verification," insert a new sentence at the end of the free-form paragraph, immediately BEFORE the existing evidence sentence ("A verification claim without evidence is not a verification — either produce the evidence or reject the batch."): "Additionally, manually re-drive each flow in the plan's E2E test plan section of `code-plan.md`: perform the flow's Steps and confirm its Expected outcome, capturing evidence as above." The free-form body and the evidence sentence themselves stay byte-identical.
  - In "### 2. Review the changes," rephrase the live **Test quality** check (currently "unit tests trace to per-task Acceptance; end-to-end tests are present for any user-observable behavior the batch changed.") to the design §4 wording: "unit tests trace to per-task Acceptance; end-to-end tests are present for the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan)."
  - Leave the review-template Behavior verification block and the Guidelines verification text byte-identical (per design §4 — re-driven flows are already covered by them).
- **Depends on:** none
- **Traces to:** Spec R7; Acceptance criterion 4; Design §4
- **Acceptance:**
  - Step 3 retains its existing free-form verification text and its evidence sentence verbatim, and adds the re-drive sentence positioned before the evidence sentence.
  - The step-2 Test quality check ties e2e presence to "the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan)" rather than to derived/observable-behavior wording.
  - The review template's Behavior verification block and the Guidelines verification bullet are unchanged.

### Task 5: Dispatch by task type in the phase-4 reference `4 - code.md`

- **Goal:** Update the phase-4 orchestrator reference so it dispatches each task to the writer named by the task's Type — two writer rows in the required-agents table (neither attributing behavior verification to the writer), type-conditional launch, optional Type capture in the task-list step — with no required-agents row or step naming a single `code-writer`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
- **Changes:**
  - **Overview (L3):** change "dispatching the code tasks to a fresh `code-writer` per task" to dispatch "to a fresh writer chosen by the task's Type — `code-writer-tdd` for tdd tasks, `code-writer-e2e` for e2e tasks" (rest of the sentence intact).
  - **Required-agents table (L23-26):** replace the single `code-writer` row with two rows: `code-writer-tdd` — "One fresh instance per task. Implements its assigned task with TDD, runs the gates, commits." and `code-writer-e2e` — "One fresh instance per task. Implements the planned e2e flows, runs the gates, commits." Neither row says "verifies behavior" (moved to reviewer); use "runs the gates" (matching the §3 renamed step), not "validates."
  - **Step 1 (L30):** optionally append ", capturing each task's Type" (minimal, not load-bearing).
  - **Step 3.1 launch (L33):** make the launch type-conditional — "Launch a fresh writer chosen by the task's Type — `code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task — with the verbatim task block" and add `Type` to the parenthetical field list (so it reads Goal / Type / Files / Changes / Depends on / Traces to / Acceptance, matching the §1 block order).
  - **Leave unchanged:** the generic plural "code-writers" / "code-writer in the batch" at L34/L35 (shared-worktree sequencing, not a dispatch row), and the mermaid "Code Writer" node.
- **Depends on:** none
- **Traces to:** Spec R9; Acceptance criterion 6; Design §5
- **Acceptance:**
  - The overview describes type-based dispatch naming both `code-writer-tdd` and `code-writer-e2e`.
  - The required-agents table has two writer rows (tdd and e2e), neither attributing behavior verification to the writer, both using "runs the gates"; no required-agents row names a bare `code-writer`.
  - The launch step is type-conditional (tdd → `code-writer-tdd`, e2e → `code-writer-e2e`) and the parenthetical field list includes `Type`.
  - No step still dispatches to a single `code-writer`; the shared-worktree plural mentions and the mermaid node are intact.

### Task 6: Update the gate-running enumeration, Agents field, and README roster in lockstep

- **Goal:** Replace the singular `code-writer` with `code-writer-tdd` and `code-writer-e2e` in load.md's gate-running enumeration, setup.md's Agents-field option list and illustrative example row, and the README shipped-agent roster — keeping load.md and setup.md in agreement (same five-agent set, two views) and adding no migration text.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md`; `skills/radical-pipelines/reference/conventions/setup.md`; `README.md`
- **Changes:**
  - **load.md (L30):** change the enumeration "The gate-running agents are `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer`" to "`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, and `doc-reviewer`" (rest of the sentence unchanged).
  - **setup.md (L183):** change the option list "one or more of `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`" to "one or more of `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`"; the prose tail ("Naming only `code-reviewer`…") is unchanged.
  - **setup.md (L189):** change the illustrative example table's `typecheck` row Agents cell from `code-writer` to `code-writer-tdd`.
  - **README.md (L112):** in the shipped-agent roster, replace `code-writer` with `code-writer-tdd`, `code-writer-e2e` (keeping list order/punctuation consistent with the surrounding roster).
  - Add no migration or backward-compatibility text in any of the three files.
- **Depends on:** none
- **Traces to:** Spec R8, R10 (README roster), R5; Acceptance criteria 5, 7, 8; Design §6, §7
- **Acceptance:**
  - load.md's enumeration and setup.md's Agents-field option list both name exactly `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer` and agree with each other; neither names a bare `code-writer`.
  - setup.md's illustrative example row uses `code-writer-tdd`.
  - README.md's shipped-agent roster lists `code-writer-tdd` and `code-writer-e2e` and no longer lists `code-writer`.
  - None of the three files introduce migration or backward-compatibility text.

### Task 7: Add the two planner sections, inverted rules, and validation self-checks to assisted `3 - plan.md`

- **Goal:** Bring the assisted phase-3 reference to parity with the autonomous schema — add `## Required test commands`, `## E2E test plan`, and the `- **Type:** tdd | e2e` field to the code-plan skeleton; invert the assisted test-planning rules with the §1 boundary; and add the two owner-driven self-check items (required-test-commands validate-by-executing, e2e coverage).
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- **Changes:**
  - **code-plan.md skeleton (step 5, L126-146):** insert `## Required test commands` and `## E2E test plan` between `## Overview` and `## Tasks`, using the same shapes (comments, table, Flow blocks) as Task 1 / design §1; add `- **Type:** tdd | e2e` after `- **Goal:**` in the Task block.
  - **Constraint L30:** invert "You MUST NOT plan tests in the code plan — that is the code-writer's responsibility in phase 4 (TDD)." to a planner-owns-floor-and-e2e rule with the §1 boundary: the planner chooses the required-test-commands floor and transforms the spec's acceptance criteria and edge cases into the e2e test plan, while per-task unit-test selection stays the writer's TDD (do not prescribe which unit tests a task writes).
  - **Synthesis guideline L152:** narrow "**Per-task acceptance is required** — describe *what must be true*, not *which test to write*. Tests are the code-writer's job in phase 4 (TDD)." so it refers to unit tests / the tdd writer and no longer reads as forbidding the now-planner-owned floor and e2e plan (same boundary as L30).
  - **Step-4 self-check L117:** rework the "**No test planning**" item to "**No unit-test planning**" scoped to unit tests only (mirroring design §2/§8), and add two items: "**Required-test-commands validate** — execute each command in the Required test commands section and surface the result to the owner: did the command's runner resolve and terminate? The feature isn't implemented yet, so a runner reporting zero or missing tests is fine; a command that cannot run (runner missing, bad invocation, never returns) is a problem to fix with the owner before synthesis. Per-command and independent." and (placed next to the existing coverage self-check at L109) "**E2E coverage** — do the planned e2e flows cover the spec's acceptance criteria and edge cases?"
  - **Leave unchanged:** the abstract singular `code-writer` role mentions at L25, L59, L96, L114 (abstract phase-4-role references true of both writers, per design §8) — only the test-planning-semantics lines (L30/L152) and the self-check (L117) change.
- **Depends on:** none
- **Traces to:** Spec R10; Acceptance criterion 7; Design §8
- **Acceptance:**
  - The assisted code-plan.md skeleton contains `## Required test commands` and `## E2E test plan` (same order and shapes as the autonomous schema) and `- **Type:** tdd | e2e` after Goal.
  - Constraint L30 and synthesis guideline L152 reflect the inverted boundary (planner owns the floor + e2e flows; per-task unit-test selection stays the writer's TDD).
  - The step-4 self-check contains a scoped "No unit-test planning" item, a "Required-test-commands validate" item (driver executes and surfaces to the owner, with the plan-time zero/missing-tests-is-fine twist), and an "E2E coverage" item.
  - The abstract singular `code-writer` role mentions at L25, L59, L96, L114 are untouched; no migration text is added.
