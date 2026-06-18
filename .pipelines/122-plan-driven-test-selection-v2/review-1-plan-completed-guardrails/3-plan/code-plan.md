# Code Plan: Plan-completed guardrail commands

## Overview

This pipeline edits the Radical Pipelines skill itself — ten Markdown files plus
no eleventh — to unify the code-plan's separate `## Required test commands` "floor"
with the guardrails convention. The unit of work is prose edits to agent files and
reference files, so there is no production code and no e2e surface; every task is a
`tdd` task whose acceptance is the observable content of the edited file. The tasks
land in dependency order so the skill stays self-consistent at every commit: first
the contract home (`autonomous-workflow.md`) that defines the new `Guardrails to
complete:` spawn field and the `Guardrails:` resolution clause; then the two
autonomous phase files that defer to it; then the convention files (`setup.md`,
`load.md`) that capture and represent the mark; then the plan section's producer and
validator (`code-plan-writer.md`, `code-plan-reviewer.md`) that introduce and bind the
`## Plan-completed guardrails` section; then the two code-writers that stop reading the
old floor and converge onto the shared guardrails-step wording; and finally the
assisted `3 - plan.md` parity file. `code-reviewer.md`, `doc-writer.md`,
`doc-reviewer.md`, `README.md`, and the `## E2E test plan` section are untouched by
design.

## Plan-completed guardrails

<!-- One row per gate marked plan-completed in `.rp.md` — exactly that set, no more, no fewer. Gate must match the marked gate's exact `.rp.md` name (it binds by name). Command is the exact literal feature-scoped command the marked agents run for that gate this pipeline. Rationale is free prose naming the feature surface the command exercises, as a coverage-check aid. "None" when no gate is marked. -->

None

## E2E test plan

<!-- This pipeline edits skill Markdown only; there is no runnable feature surface and no e2e suite, so there are no e2e flows. Every task is a tdd task whose acceptance is the observable content of the edited file. -->

None

## Tasks

### Task 1: Define the spawn-field contract in `autonomous-workflow.md`

- **Goal:** Add the one-and-only definition of the `Guardrails to complete:` spawn field and extend the `Guardrails:` bullet with the marked-gate resolution clause, so every other file can defer the mechanic here.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-workflow.md`
- **Changes:** In the `## 5. Execute the planned phases` per-spawn `## Conventions` block (the bulleted list with **Artifact folder:**, **Commit format:**, **Guardrails:**):
  - Extend the existing **Guardrails:** bullet ("the gates that name this agent — one per line as a name and its exact command. Omit when no gate names it.") with a clause: for a gate marked plan-completed for this agent, the command on that line is the feature command resolved from `code-plan.md` before spawn, not the setup-fixed full command. This clause is the resolution algorithm itself — stated as the contract, so no separate code-phase algorithm text is needed.
  - Add a new **Guardrails to complete:** bullet immediately after **Guardrails:** (so the run-vs-complete pair sits together): the marked gates whose command the code-plan-writer supplies this pipeline, one per line as a name and its setup-fixed full command, passed only to the code-plan-writer and code-plan-reviewer in the plan phase (these agents *complete* these gates, they do not *run* them); the full command rides along as context so the writer authors a feature command of the right kind. Omit when no gate is marked.
- **Depends on:** none
- **Traces to:** Spec R7, R10 / Acceptance criteria 7, 10 / Design "The spawn-field contract", "`reference/autonomous-workflow.md` — the contract home"
- **Acceptance:**
  - The **Guardrails:** bullet states that for a gate marked plan-completed for the agent, that line's command is the feature command resolved from `code-plan.md` before spawn instead of the setup-fixed command.
  - A **Guardrails to complete:** bullet exists immediately after **Guardrails:**, defines it as the marked-gate set (name + setup-fixed full command) passed only to the code-plan-writer and code-plan-reviewer in the plan phase, glossed as gates these agents complete rather than run, and is marked omit-when-empty.
  - Both additions live only in `autonomous-workflow.md`'s spawn block; no resolution algorithm or new-field definition is duplicated into any phase file.

### Task 2: State *when* the orchestrator passes `Guardrails to complete:` in autonomous plan phase

- **Goal:** Have `autonomous-phases/3 - plan.md` say only *when* the plan-phase spawns carry the marked-gate set, deferring the contract to `autonomous-workflow.md`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md`
- **Changes:** In the `## Steps` flow, add a *when* clause to the code-plan-writer/code-plan-reviewer launches (steps 1–3): before spawning the code-plan-writer and code-plan-reviewer, the orchestrator passes `Guardrails to complete:` — the marked-gate set. State only the timing; defer the field's meaning and shape to `autonomous-workflow.md`. Do not restate the contract, the full-command-as-context rationale, or the omit-when-empty rule.
- **Depends on:** Task 1
- **Traces to:** Spec R5, R10 / Acceptance criteria 5, 10 / Design "`reference/autonomous-phases/3 - plan.md` and `4 - code.md` — when only"
- **Acceptance:**
  - The plan-phase file states that before spawning the code-plan-writer and code-plan-reviewer the orchestrator passes the `Guardrails to complete:` marked-gate set.
  - The file references the field by name without restating its contract, its full-command rationale, or its omit-when-empty behavior.

### Task 3: State *when* the orchestrator resolves marked gates in autonomous code phase

- **Goal:** Have `autonomous-phases/4 - code.md` say only *when* the orchestrator resolves marked gates before each writer/reviewer spawn, deferring the mechanic to `autonomous-workflow.md`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
- **Changes:** In the per-task writer launch and the code-reviewer launch (the `## Steps` per-spawn steps), add a single *when* clause: before spawning each writer or reviewer, the orchestrator resolves marked gates, substituting each marked agent's feature command from `## Plan-completed guardrails` into that agent's resolved `Guardrails:` line. State only the timing. Add no binding text, no missing-row text, and no assisted parenthetical (assisted mode structurally cannot reach this file).
- **Depends on:** Task 1, Task 6 (names the `## Plan-completed guardrails` section this *when*-clause references; Task 6 introduces it in the producer)
- **Traces to:** Spec R7, R10 / Acceptance criteria 7, 10 / Design "`reference/autonomous-phases/3 - plan.md` and `4 - code.md` — when only"
- **Acceptance:**
  - The code-phase file states that before spawning each writer or reviewer the orchestrator resolves marked gates, substituting each marked agent's feature command from `## Plan-completed guardrails` into its `Guardrails:` line.
  - The file adds no binding, missing-row, or assisted-mode text, and does not restate the resolution algorithm defined in `autonomous-workflow.md`.

### Task 4: Capture the `plan-completed-for` mark in `setup.md`

- **Goal:** Add the mark's capture item, its validation timing, and fix the stale reminder, stating the mechanism once.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`
- **Changes:** In the `### Guardrails` capture section:
  - Add a new per-gate capture item (prose, after the name/command/agents bullets): a gate may optionally carry its `plan-completed-for` agents — a non-empty subset of the gate's agents (may equal it) whose command for this gate is not the captured full command but a feature-scoped one the code-plan-writer supplies per pipeline; absent leaves an ordinary gate. This is the single statement of what the mark does and who supplies the command.
  - Attach validation timing to that capture item (not to the existing "Validate each command as you capture it" paragraph, which must stay about the captured full command): the full command is validated at setup as any gate command is; the feature command does not exist yet and is validated later, at the plan phase, by the code-plan-reviewer.
  - Replace the existing reminder (line 185: "scope the writers' gates to the feature or bug, leaving the complete, slower commands for the `code-reviewer`s") so it no longer implies the owner names the feature scope. Trim it to *when* only — the per-task agents (code-writer-tdd, code-writer-e2e, doc-writer) run once per task while the once-per-run agents (code-reviewer, doc-reviewer) run once per pipeline, so a slow gate in a large project is the case to reach for `plan-completed-for` — and point at the mark instead of restating the mechanism.
  - Leave the unrelated validation-floor metaphor (line 197, "the floor still catches the realistic failures") intact.
- **Depends on:** none
- **Traces to:** Spec R1, R2 / Acceptance criteria 1, 2 / Design "`reference/conventions/setup.md` — captures the mark"
- **Acceptance:**
  - A new prose capture item describes the optional `plan-completed-for` field as a non-empty subset of the gate's agents (may equal it) whose command is supplied per pipeline by the code-plan-writer, with absence leaving an ordinary gate.
  - That item states the full command is validated at setup and the feature command is validated later at the plan phase by the code-plan-reviewer; the existing full-command validation paragraph is unchanged.
  - The old reminder is trimmed to *when* (per-task vs once-per-run cadence, slow gates in large projects) and points at the mark rather than restating the mechanism; it no longer implies the owner names the feature scope.
  - The validation-floor metaphor at line 197 is left intact.
  - The mechanism (what the mark does, who supplies the command) is stated exactly once, at the capture item.

### Task 5: Represent the mark in `load.md`

- **Goal:** Extend the committed-only statement so the orchestrator's model knows a marked agent's command comes from `code-plan.md`, without adding a section or convention row.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md`
- **Changes:** In the `## Local overrides` section, extend the committed-only statement ("Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."): note that a gate may be plan-completed for some of its agents (captured at setup), those agents' command for that gate is supplied per pipeline by the code-plan-writer in `code-plan.md` and resolved by the orchestrator before spawn — so it is plan data; the mark and the full command are committed `.rp.md`, while the feature command lives in `code-plan.md`, never in `.rp.md`, and like the rest of Guardrails is never taken from `.rp.local.md`. Reference setup and resolution rather than restating them. Add no new section and no row to the convention index table.
- **Depends on:** none
- **Traces to:** Spec R3 / Acceptance criterion 3 / Design "`reference/conventions/load.md` — represents the mark"
- **Acceptance:**
  - The `## Local overrides` committed-only statement is extended to note that a gate may be plan-completed for some agents whose command comes per pipeline from `code-plan.md`, resolved by the orchestrator before spawn.
  - The extension preserves committed-only: the mark and full command are committed `.rp.md` while the feature command lives in `code-plan.md` (never in `.rp.md`, never from `.rp.local.md`), and it does not imply the feature command lives in `.rp.md`.
  - It references setup and resolution rather than restating them; no new section is added and no row is added to the convention index table.

### Task 6: Replace the floor section and retarget authoring in `code-plan-writer.md`

- **Goal:** Replace `## Required test commands` with the `## Plan-completed guardrails` block, retarget the authoring guideline to the marked-gate set, and read `Guardrails to complete:` in gather-context.
- **Type:** tdd
- **Files to change:** `agents/code-plan-writer.md`
- **Changes:**
  - In `### 1. Gather context`, add an item: read `Guardrails to complete:` — the marked gates (name + full command) this writer authors feature commands for; absent means no marked gates and the section reads `None` (the default when no marked-gate set is received, not an explicit empty signal).
  - In the `### 2. Write the plan` structure block, replace the `## Required test commands` section (its header, floor comment, and `Name | Command | Covers` table) with the `## Plan-completed guardrails` block: the `Gate | Command | Rationale` table, the floor-free comment, and the bare-`None` rule — exactly the block defined in the design's "The `## Plan-completed guardrails` section" and "The `None` rendering". Leave `## E2E test plan` and `## Tasks` unchanged.
  - Retarget the "Plan the test floor and the e2e flows" guideline (line 82): for each gate passed in `Guardrails to complete:`, author a feature-scoped command of the right kind (same runner, narrower scope) and record it in `## Plan-completed guardrails` — exactly those gates, `None` when none were passed; the writer owns each command but not the set. Keep the e2e half and the "do not prescribe which unit tests" tail.
- **Depends on:** Task 1 (the `Guardrails to complete:` field must be defined before this file reads it)
- **Traces to:** Spec R4, R5 / Acceptance criteria 4, 5 / Design "`agents/code-plan-writer.md` — authors the commands", "The `## Plan-completed guardrails` section in `code-plan.md`", "The `None` rendering"
- **Acceptance:**
  - Gather-context instructs the writer to read `Guardrails to complete:` (marked gates: name + full command), and frames `None` as the default when no marked-gate set is received.
  - The structure block contains `## Plan-completed guardrails` with a `Gate | Command | Rationale` table, a floor-free comment, and the bare-`None` rule; `## Required test commands`, its floor comment, and its `Covers` column are gone.
  - The authoring guideline directs the writer to author a feature-scoped command (same runner, narrower scope) for exactly the gates passed in `Guardrails to complete:`, record them in `## Plan-completed guardrails`, render `None` when none were passed, and notes the writer owns the command but not the set; the e2e half and the unit-test tail are kept.
  - `## E2E test plan` and `## Tasks` in the structure block are unchanged.

### Task 7: Retarget validation and add binding in `code-plan-reviewer.md`

- **Goal:** Retarget the three checks on the plan section to `## Plan-completed guardrails`, drop floor framing, add the binding check, and read `Guardrails to complete:`.
- **Type:** tdd
- **Files to change:** `agents/code-plan-reviewer.md`
- **Changes:**
  - In `### 1. Gather context`, add a `Guardrails to complete:` note — the reviewer's only channel to the marked set; absent means the empty marked set.
  - In `### 2. Validate the required-test-commands`, retarget the section name to `## Plan-completed guardrails` (rename the heading and the in-body reference); keep the runner-resolves-and-terminates discipline verbatim so it stays an *executing* validation.
  - In `### 3. Review the plan`, retarget the coverage check (line 27): judge that each feature command credibly completes its marked gate for this feature, using the row's rationale; drop the "credible floor, not exhaustive" framing.
  - Add a **bind** check to `### 3`: every row's **Gate** matches a gate passed in `Guardrails to complete:`, every passed marked gate has exactly one row; an unmarked or nonexistent gate row is a rejection, a marked gate with no row is a rejection, and a `None` body is the valid rendering when no gate was passed.
  - Retarget the "No unit-test planning" check's floor token (line 34) to the new section; its logic is unchanged.
- **Depends on:** Task 1 (reads `Guardrails to complete:`), Task 6 (validates the `## Plan-completed guardrails` section the writer produces)
- **Traces to:** Spec R6 / Acceptance criterion 6 / Design "`agents/code-plan-reviewer.md` — validates and binds"
- **Acceptance:**
  - Gather-context instructs the reviewer to read `Guardrails to complete:` as its only channel to the marked set, with absence meaning the empty set.
  - The execute check targets `## Plan-completed guardrails`, keeps the runner-resolves-and-terminates discipline verbatim, and remains an executing validation.
  - The coverage check judges each feature command credibly completes its marked gate using the row's rationale, with no "credible floor, not exhaustive" framing.
  - A bind check requires every row's Gate to match a gate in `Guardrails to complete:` and every passed marked gate to have exactly one row; unmarked/nonexistent rows and marked-but-rowless gates are rejections; a `None` body is valid when no gate was passed.
  - The "No unit-test planning" check references the new section and is otherwise logically unchanged.

### Task 8: Unify the guardrails step in `code-writer-tdd.md`

- **Goal:** Run only the handed `Guardrails:` set, converge onto the shared writer/doc guardrails-step wording, and remove every floor reference.
- **Type:** tdd
- **Files to change:** `agents/code-writer-tdd.md`
- **Changes:**
  - Remove the gather-context item that reads the Required test commands section (line 14).
  - Rewrite `### 3. Run the guardrails` to the shared writer/doc wording quoted in the design ("Run every gate in the guardrails convention, exactly as its command is written…" with the standard three-bullet result sort — no-convention / cannot-execute-is-a-blocker / runs-non-zero-is-work). Remove the "two command sets … AND the floor" language, the floor-specific bullets, and the floor confirmation phrasing.
  - Remove the floor entry from the self-containment input list (line 56: "The task block plus the Required test commands section … are your inputs") so it lists only the task block.
  - Keep the writer's own final confirmation line ("…covered by a passing test…"), which restates its deliverable contract, not the guardrails.
- **Depends on:** Task 6 (the `## Required test commands` section the writer stops reading is renamed there; removing the read and renaming the producer should land coherently)
- **Traces to:** Spec R8 / Acceptance criterion 8 / Design "`agents/code-writer-tdd.md` and `agents/code-writer-e2e.md` — one unified gate set"
- **Acceptance:**
  - No gather-context item reads a Required test commands / floor section from `code-plan.md`.
  - `### 3. Run the guardrails` matches the shared writer/doc wording with the standard three-bullet sort and contains no floor branch, no "two command sets" language, and no read of a command section from `code-plan.md`.
  - The self-containment input list no longer names the Required test commands section.
  - The writer's own deliverable-confirmation line is retained.

### Task 9: Unify the guardrails step in `code-writer-e2e.md`

- **Goal:** Run only the handed `Guardrails:` set, converge onto the shared wording, and remove every floor reference while keeping the `## E2E test plan` read.
- **Type:** tdd
- **Files to change:** `agents/code-writer-e2e.md`
- **Changes:**
  - Remove the gather-context item that reads the Required test commands section (line 15); keep the gather-context item that reads the `## E2E test plan` section (line 14).
  - Rewrite `### 3. Run the guardrails` to the same shared writer/doc wording as Task 8 (identical guardrails-running instruction and three-bullet sort). Remove the "two command sets … AND the floor" language, the floor-specific bullets, and the floor confirmation phrasing.
  - Remove the floor entry from the self-containment input list (line 49), leaving the task block and the `## E2E test plan` section.
  - Keep the writer's own final confirmation line.
- **Depends on:** Task 6 (section rename), Task 8 (shares the identical guardrails-step wording — author it once and apply the same text here)
- **Traces to:** Spec R8 / Acceptance criterion 8 / Design "`agents/code-writer-tdd.md` and `agents/code-writer-e2e.md` — one unified gate set"
- **Acceptance:**
  - No gather-context item reads a Required test commands / floor section; the `## E2E test plan` gather-context read is retained.
  - `### 3. Run the guardrails` is byte-identical to the shared wording used in `code-writer-tdd.md` (same three-bullet sort, no floor branch, no command-section read).
  - The self-containment input list names the task block and the `## E2E test plan` section, not the Required test commands section.
  - The writer's own deliverable-confirmation line is retained.

### Task 10: Mirror the new section shape in assisted `3 - plan.md`

- **Goal:** Retarget the assisted plan file's floor references at its three locations to `## Plan-completed guardrails`, with single-driver authority and no `Guardrails to complete:` field.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- **Changes:**
  - **Constraint** (line 30): retarget the floor half — for each gate the driver marked plan-completed in `.rp.md`, author a feature-scoped command and record it in `## Plan-completed guardrails`, `None` when none were marked; authority is "for each gate **you** marked plan-completed in `.rp.md`" (the single driver is both `.rp.md` author and plan author, so no spawn channel). Keep the e2e + unit-test tail.
  - **Self-check** (line 118): replace the "Required-test-commands validate" bullet with one combined bullet — the runner-resolves-and-terminates discipline verbatim (section name renamed to `## Plan-completed guardrails`) plus a folded one-clause bind confirming the section carries exactly the marked gates, one row each, `None` if none. Add no separate coverage-judgment bullet (in assisted mode authoring the command and judging its coverage are the same act).
  - **Skeleton** (line 132): swap the `## Required test commands` block (header, floor comment, `Name | Command | Covers` table) for the identical `## Plan-completed guardrails` block (Gate / Command / Rationale, floor-free comment, bare-`None` rule) from Task 6. Leave `## E2E test plan` and `## Tasks` unchanged.
- **Depends on:** Task 6 (the synthesis skeleton and the section block must match the autonomous code-plan-writer's block)
- **Traces to:** Spec R4, R5, R6, R10 / Acceptance criteria 4, 5, 6, 10 / Design "`reference/assisted-phases/3 - plan.md` — parity, no spawn field"
- **Acceptance:**
  - The constraint directs the driver to author a feature-scoped command for each gate **they** marked plan-completed in `.rp.md`, record it in `## Plan-completed guardrails` (`None` when none), with no spawn field; the e2e and unit-test tail is kept.
  - The self-check is one combined bullet: the runner-resolves-and-terminates discipline (verbatim, section renamed) plus a folded bind confirming exactly the marked gates, one row each, `None` if none; there is no separate coverage-judgment bullet.
  - The synthesis skeleton contains the `## Plan-completed guardrails` block (Gate / Command / Rationale, floor-free comment, bare-`None` rule) identical to the code-plan-writer's, with `## Required test commands` gone; `## E2E test plan` and `## Tasks` are unchanged.
  - The file invents no `Guardrails to complete:` field.

### Task 11: Verify scope discipline across the tree

- **Goal:** Confirm the change is exactly the ten files, every floor-family token is retargeted, and the by-design-untouched files carry no stray edits.
- **Type:** tdd
- **Files to change:** none (verification task; no edit unless it surfaces a missed retarget within the ten files of Tasks 1–10)
- **Changes:** Sweep the live skill tree (`agents/`, `skills/radical-pipelines/reference/`) for every floor-family token — "required test command", "required-test-commands", "floor", "two command set" — and confirm the only remaining match is the unrelated validation-floor metaphor in `setup.md` (line ~197). Confirm `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`, `README.md`, and the `## E2E test plan` sections are unchanged by this pipeline. Confirm no migration or back-compat text was added. If the sweep finds a missed token inside one of the ten files, fix it in that file (this task adds no eleventh file).
- **Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10
- **Traces to:** Spec R9, R10 / Acceptance criteria 9, 10 / Design "Untouched by design", "Per-file design" (six-file floor-token sweep)
- **Acceptance:**
  - A tree-wide sweep for floor-family tokens finds matches only inside the ten changed files, and the sole surviving floor token is the unrelated validation-floor metaphor in `setup.md`.
  - `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`, `README.md`, and every `## E2E test plan` section are unchanged by this pipeline.
  - No migration or back-compat text was introduced anywhere.
