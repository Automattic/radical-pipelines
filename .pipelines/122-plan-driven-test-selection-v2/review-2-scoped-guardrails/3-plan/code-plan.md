# Code Plan: Scoped guardrails

## Overview

This pipeline edits the Radical Pipelines skill itself — fourteen Markdown files: two new references plus twelve edited files — to replace review-1's `plan-completed-for` model with the fixed/scoped gate model. A guardrail gate is **fixed** (a literal command run as-is) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline by the planning phase whose agents run the gate); the placeholder's presence is the only thing that marks a gate as scoped. The unit of work is prose edits to reference and agent files, so there is no production code and no e2e surface; every task is a `tdd` task whose acceptance is the observable content of the edited file. Tasks land in dependency order so the skill stays self-consistent at every commit: first the two new references — `reference/guardrails.md` (the orchestrator-facing model: gate kinds, fill lifecycle, spawn fields) and `reference/conventions/passing.md` (the `## Conventions` spawn block) — which are the single homes every other file defers to; then the convention files (`setup.md`, `load.md`) that capture and represent gates; then the workflow and phase files (`autonomous-workflow.md`, `3 - plan.md`, `4 - code.md`, `5 - docs.md`) that pass and resolve scopes; then the four plan agents (`code-plan-writer`, `code-plan-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`) that author and validate `## Guardrail scopes`; then the assisted `3 - plan.md` parity file; then `SKILL.md`'s pointer; and finally a scope-discipline sweep confirming the old model is gone everywhere and the by-design-untouched files are clean. The five running agents (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`) run the resolved commands in their `Guardrails:` field exactly as today and are untouched.

## Guardrail scopes

<!-- One row per scoped gate this phase's agents run, gate → scope value, per the model in reference/guardrails.md. "None" when this phase runs no scoped gate. This project's own .rp.md defines no guardrails, so there are no scoped gates for this pipeline. -->

None

## E2E test plan

<!-- This pipeline edits skill Markdown only; there is no runnable feature surface and no e2e suite, so there are no e2e flows. Every task is a tdd task whose acceptance is the observable content of the edited file. -->

None

## Tasks

### Task 1: Write the guardrails model reference `reference/guardrails.md`

- **Goal:** Create the single orchestrator-facing reference that explains the guardrail model end-to-end — the two gate kinds, the per-pipeline fill lifecycle (setup → plan → resolve → run), and the spawn fields that carry guardrails to agents — so every other file defers to it instead of restating the model.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/guardrails.md` (new)
- **Changes:** Create a new reference following the `pipeline-versioning.md` single-cross-cutting-reference pattern. It must cover, each stated exactly once:
  - **Gate kinds.** A guardrail gate is **fixed** (a literal command run as-is) or **scoped** (a command containing a `{scope}` placeholder filled per pipeline). The presence of `{scope}` in the command is the only thing that marks a gate as scoped — there is no separate kind flag. Fixed and scoped gates are ordinary gates a project composes freely; neither requires the other, and a scoped gate may exist with no fixed full-scope companion.
  - **The `.rp.md` per-gate block** shape, as defined in the design's Interfaces section:
    ```markdown
    ### <name>
    - command: `<command, with {scope} if scoped>`
    - agents: <subset of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
    - fill-guidance: <optional; scoped gates only>
    ```
    Note `fill-guidance` is an optional owner-authored note telling the planning agent how to choose `{scope}`; absent, the planning agent chooses `{scope}` from the spec and design.
  - **The fill lifecycle.** A scoped gate's `{scope}` is chosen per pipeline by the planning agent of the phase whose agents run the gate — code-run gates by the code plan, doc-run gates by the doc plan. The filler is derived from who runs the gate, not configured. A scoped gate whose agents span both phases is filled by each phase's plan independently — each fills `{scope}` for its own agents — so the gate may carry a different scope value per phase. The plan records the chosen scope **value** (gate → scope value) in its `## Guardrail scopes` section; the `.rp.md` command template stays the command's single source of truth.
  - **Validation.** A fixed gate is validated at setup by running it (the "did it execute?" check). A scoped gate is validated twice: at setup its runner is probed with a realistic made-up scope to confirm it resolves, and at the plan phase its filled command is validated to execute (by the plan-reviewer).
  - **Resolve and run.** Before spawning each running agent, the orchestrator substitutes the chosen scope value into the gate's `.rp.md` command template; the resolved command rides in that agent's `Guardrails:` spawn field; the agent runs it through its existing, unchanged run protocol.
  - **Spawn fields**, naming the two and where each goes (full definitions live in `passing.md`, which this reference points to): `Guardrails:` carries the gates naming a running agent, each with the command it runs (resolved, for a scoped gate); `Guardrail scopes to fill:` carries to a plan pair the scoped gates whose `{scope}` that plan must supply, each with its command template and `fill-guidance`.
  - State that the full mechanism — capture, fill, validate, resolve, run — applies identically to the code and docs phases.
- **Depends on:** none
- **Traces to:** Spec requirements 1, 2, 3, 4, 5, 6, 7, 8 / Acceptance criteria 1, 2, 3, 4, 5, 6 / Design "Two references, not one", "Placeholder marks scoped; per-gate block in `.rp.md`", "The plan records the scope value, not the command", components `reference/guardrails.md`
- **Acceptance:**
  - The reference exists at `skills/radical-pipelines/reference/guardrails.md` and explains the two gate kinds, the fill lifecycle (setup → plan → resolve → run), and how guardrails reach agents, without requiring the reader to consult setup, the workflow, or the agent files.
  - It states that a gate is scoped iff its command contains `{scope}`, with no separate kind flag, and that a scoped gate may exist with no fixed companion.
  - It defines the `.rp.md` per-gate block (name, command, agents, optional `fill-guidance` for scoped gates only) and states that absent `fill-guidance` the planning agent chooses `{scope}` from the spec and design.
  - It states the filler is derived from who runs the gate (code-run → code plan, doc-run → doc plan), that a spanning gate is filled per phase independently and may carry a different scope value per phase, and that the plan records the scope value while `.rp.md` stays the command's single source of truth.
  - It states fixed-gate setup validation (did it execute?), scoped-gate two-point validation (setup probe with a realistic made-up scope; plan-phase filled-command execution), and the resolve-before-spawn substitution that feeds the agent's `Guardrails:` field.
  - It names the two spawn fields and points to `passing.md` for their full definitions, and states the mechanism applies identically to the code and docs phases.
  - No `plan-completed-for`, per-agent-subset, or `## Plan-completed guardrails` concept appears.

### Task 2: Write the conventions-passing reference `reference/conventions/passing.md`

- **Goal:** Create the single reference that defines the spawn-time `## Conventions` block — the fields every spawned agent receives and which conventions reach which agents — so the workflow and other files defer to it instead of restating the block.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/passing.md` (new)
- **Changes:** Create a new reference under `reference/conventions/` defining the `## Conventions` block the orchestrator includes at the top of every spawned agent's initial prompt, each field labeled exactly as shown. Move the field definitions out of `autonomous-workflow.md` (Task 5 makes that file defer here). Define:
  - **Artifact folder:** the absolute path to the active run's folder.
  - **Commit format:** the commit message format the agent must use; omit when the project defines none.
  - **Agent models** handling: the orchestrator resolves each agent's model and settings via the **Agent models** convention and applies them as spawn parameters (note this is applied at spawn, not as a `## Conventions` field), as today.
  - **Guardrails:** → the running agents (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`): the gates naming this agent — one per line as a name and its exact command. For a scoped gate, that command is the resolved command after `{scope}` substitution (defer the substitution mechanic and the model to `guardrails.md`). Omit when no gate names it.
  - **Guardrail scopes to fill:** → the code-plan pair (`code-plan-writer`, `code-plan-reviewer`) and the doc-plan pair (`doc-plan-writer`, `doc-plan-reviewer`): the scoped gates whose `{scope}` that plan must supply — those whose agents run in that pair's phase — one per line as the gate's command template and its `fill-guidance`. Omit when that phase runs no scoped gate.
  - State that agents commit their own artifacts following the **Commit format** convention; the orchestrator does not commit on their behalf.
  - Point to `guardrails.md` for the guardrail model; do not restate gate kinds, the fill lifecycle, or the substitution algorithm here.
- **Depends on:** Task 1 (this file points at `guardrails.md` for the model)
- **Traces to:** Spec requirement 1 / Acceptance criterion 1 / Design "Two references, not one", components `reference/conventions/passing.md`, Interfaces "Spawn fields"
- **Acceptance:**
  - The reference exists at `skills/radical-pipelines/reference/conventions/passing.md` and defines the `## Conventions` spawn block with the exactly-labeled fields **Artifact folder:**, **Commit format:**, **Guardrails:**, and **Guardrail scopes to fill:**, plus the Agent-models-at-spawn and self-commit notes.
  - **Guardrails:** is defined as going to the five running agents with each gate's exact command (resolved after `{scope}` substitution for a scoped gate), omit-when-empty.
  - **Guardrail scopes to fill:** is defined as going to the code-plan and doc-plan pairs, carrying the scoped gates that phase runs with each command template and `fill-guidance`, omit-when-empty.
  - It points to `guardrails.md` for the model and does not restate gate kinds, the fill lifecycle, or the substitution algorithm.
  - No `plan-completed-for`, per-agent-subset, or `Guardrails to complete:` concept appears.

### Task 3: Capture gates as per-gate blocks in `setup.md`

- **Goal:** Rewrite the `### Guardrails` capture section so it captures each gate as a per-gate block (name, command, agents, optional `fill-guidance`), recognizes scoped gates by their `{scope}` placeholder, probes scoped gates with a realistic made-up scope, and defers the model to `guardrails.md` — removing the `plan-completed-for` capture item.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`
- **Changes:** In the `### Guardrails` capture section:
  - Keep the "Why they matter" and "What kinds to consider" framing.
  - Replace the per-gate capture list so each gate is captured as the per-gate block defined in `guardrails.md` (point to `guardrails.md` for the block shape and the model rather than redefining it): a **name**, the **command** (containing `{scope}` if the gate is scoped), the **agents** (one or more of `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`; every gate names at least one), and an optional **`fill-guidance`** note for scoped gates telling the planning agent how to choose `{scope}`.
  - State that a gate is scoped iff its command contains `{scope}`; capture `fill-guidance` only for scoped gates.
  - Remove the `plan-completed-for` capture item entirely and the stale "Remind the owner *when* to reach for this … so a slow gate … is the case for marking it `plan-completed-for`" reminder.
  - Update the validation paragraph ("Validate each command as you capture it") so it covers both kinds: a **fixed** gate is validated by running its literal command (the existing "did it execute?" bar, the two outcomes, per-command-and-independent, environment-match, and side-effects rules all stay); a **scoped** gate is validated by substituting a **realistic, made-up `{scope}`** into its command and applying the same "did it execute?" bar — confirming the runner resolves. Note the side-effects rule covers a realistic scope that runs real work, and that setup's interactive, one-time nature accommodates a bounded real run.
  - Keep all other capture sections (slug, artifact folder, commit format, issues, worktrees, etc.) and the surrounding setup steps unchanged.
- **Depends on:** Task 1 (the per-gate block shape and the model live in `guardrails.md`, which this section points to)
- **Traces to:** Spec requirements 2, 6, 7, 9 / Acceptance criteria 2, 7 / Design "Setup probes scoped gates with a realistic made-up scope", "Placeholder marks scoped; per-gate block in `.rp.md`", components `reference/conventions/setup.md`
- **Acceptance:**
  - The `### Guardrails` section captures each gate as a per-gate block (name, command, agents, optional `fill-guidance`) and points to `guardrails.md` for the block shape and the model rather than redefining them.
  - It states a gate is scoped iff its command contains `{scope}`, and captures `fill-guidance` only for scoped gates as the optional owner note guiding the `{scope}` choice.
  - The validation paragraph validates a fixed gate by running its literal command and a scoped gate by substituting a realistic made-up `{scope}` and applying the same "did it execute?" bar; the two-outcome sort, per-command independence, environment-match, and side-effects rules are preserved.
  - No `plan-completed-for` capture item or its "when to reach for this" reminder remains; a project defining a scoped gate with no fixed companion is accepted and probed.
  - All non-guardrail setup sections and steps are unchanged.

### Task 4: Defer the guardrail model to `guardrails.md` in `load.md`

- **Goal:** Replace `load.md`'s inline `plan-completed-for` / `code-plan.md` explanation in `## Local overrides` with a deferral to `guardrails.md`, keeping the committed-only rule and adding no new section or convention-index row.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md`
- **Changes:**
  - In `## Local overrides`, keep the committed-only statement ("Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.").
  - Replace the trailing sentences about a gate being `plan-completed-for` some of its agents, the `code-plan-writer` supplying the command in `code-plan.md`, the mark/full-command in `.rp.md`, and the feature command in `code-plan.md`. In their place, state — deferring the model to `guardrails.md` — that a scoped gate's `{scope}` value is plan data supplied per pipeline by the planning phase and resolved by the orchestrator before spawn; the gate's command template (with `{scope}`) lives in committed `.rp.md` and, like the rest of Guardrails, is never taken from `.rp.local.md`, while the chosen scope value lives in the plan, never in `.rp.md`.
  - Update the convention-index table row for **Guardrails** ("The deterministic verification gates — exact commands judged pass/fail by exit code") to point to `guardrails.md` for the model if a reference column or phrasing warrants it; do not add a new row or change the Required? value (No).
  - Add no new section.
- **Depends on:** Task 1 (defers to `guardrails.md`)
- **Traces to:** Spec requirements 1, 9 / Acceptance criterion 7 / Design components `reference/conventions/load.md`, "Two references, not one"
- **Acceptance:**
  - The `## Local overrides` committed-only statement is preserved, and the trailing explanation now describes a scoped gate's `{scope}` value as plan data supplied per pipeline and resolved before spawn, deferring the model to `guardrails.md`.
  - The committed-only invariant is preserved: the `{scope}`-bearing command template is committed `.rp.md` and never from `.rp.local.md`, while the scope value lives in the plan and never in `.rp.md`.
  - No `plan-completed-for` or per-agent-subset wording remains; no new section and no new convention-index row are added.

### Task 5: Defer the spawn block to `passing.md` in `autonomous-workflow.md`

- **Goal:** Replace the inline `## Conventions` spawn-field definitions in `autonomous-workflow.md` with a deferral to `passing.md`, removing the `Guardrails to complete:` and `plan-completed` wording.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-workflow.md`
- **Changes:** In `## 5. Execute the planned phases`, in the "Important:" bullet list:
  - Replace the bulleted `## Conventions`-block field definitions (the **Artifact folder:**, **Commit format:**, **Guardrails:**, **Guardrails to complete:** sub-bullets) with a single instruction: each time it spawns an agent, the orchestrator includes the `## Conventions` block defined in `reference/conventions/passing.md` at the top of the agent's initial prompt. Do not restate the individual field definitions here.
  - Keep the existing bullets that are not field definitions: the **Team spawning** convention bullet, the **Agent models** resolve-at-spawn bullet, and the "Agents commit their own artifacts" bullet — unless Task 2 moved them into `passing.md`, in which case have `autonomous-workflow.md` defer those too and remove them here, leaving no duplication across the two files.
  - Remove every `Guardrails to complete:`, `plan-completed`, and per-agent-subset reference from this file.
- **Depends on:** Task 2 (the spawn block lives in `passing.md`)
- **Traces to:** Spec requirements 1, 9 / Acceptance criterion 7 / Design components `reference/autonomous-workflow.md`, "Two references, not one"
- **Acceptance:**
  - `## 5. Execute the planned phases` instructs the orchestrator to include the `## Conventions` block defined in `passing.md` and no longer inlines the field definitions.
  - No field definition is duplicated across `autonomous-workflow.md` and `passing.md`.
  - No `Guardrails to complete:`, `plan-completed`, or per-agent-subset wording remains in the file.

### Task 6: Pass `Guardrail scopes to fill:` to both plan pairs in autonomous `3 - plan.md`

- **Goal:** State in the autonomous plan phase that the orchestrator passes `Guardrail scopes to fill:` to the code-plan pair and to the doc-plan pair, each scoped to the gates that pair's phase runs — replacing the old `Guardrails to complete:` step that wired only the code-plan pair.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md`
- **Changes:** In `## Steps`:
  - Replace the pre-step note ("Before spawning the `code-plan-writer` and `code-plan-reviewer`, the orchestrator passes them `Guardrails to complete:` — the marked-gate set (see `autonomous-workflow.md`).") with two *when* clauses, deferring the field's meaning to `passing.md`/`guardrails.md`: before spawning the code-plan-writer and code-plan-reviewer, the orchestrator passes `Guardrail scopes to fill:` — the scoped gates whose agents run in the code phase; before spawning the doc-plan-writer and doc-plan-reviewer (step 4 onward), it passes `Guardrail scopes to fill:` — the scoped gates whose agents run in the docs phase. State only the timing and the per-phase scoping; do not restate the field's shape.
  - Leave the rest of the steps, the agents table, and the mermaid diagram unchanged.
- **Depends on:** Task 2 (`Guardrail scopes to fill:` is defined in `passing.md`)
- **Traces to:** Spec requirements 4, 5, 8 / Acceptance criteria 3, 4, 6 / Design "Symmetric code/docs wiring", "Scope-centered names", components `reference/autonomous-phases/3 - plan.md`
- **Acceptance:**
  - The plan phase states that the orchestrator passes `Guardrail scopes to fill:` to the code-plan pair (gates whose agents run in the code phase) and, separately, to the doc-plan pair (gates whose agents run in the docs phase).
  - It references the field by name without restating its shape, deferring to `passing.md`/`guardrails.md`.
  - No `Guardrails to complete:` or `plan-completed` wording remains; the rest of the file (steps, agents table, diagram) is unchanged.

### Task 7: Author and validate `## Guardrail scopes` in `code-plan-writer.md`

- **Goal:** Replace the code-plan-writer's `Guardrails to complete:` read and its `## Plan-completed guardrails` output section with the scoped model: read `Guardrail scopes to fill:`, produce a `## Guardrail scopes` section recording gate → scope value, and choose each `{scope}` from `fill-guidance` or the spec and design.
- **Type:** tdd
- **Files to change:** `agents/code-plan-writer.md`
- **Changes:**
  - In `### 1. Gather context`, replace the `Guardrails to complete:` read (current item 3) with: read `Guardrail scopes to fill:` — the scoped gates whose `{scope}` this plan must supply (those whose agents run in the code phase), each with its command template and `fill-guidance`. Absent means no scoped gates this phase runs and `## Guardrail scopes` reads `None` (the default when no set is received, not an explicit empty signal).
  - In the `### 2. Write the plan` structure block, replace the `## Plan-completed guardrails` section (header, comment, `Gate | Command | Rationale` table) with `## Guardrail scopes`: a `Gate | Scope` table (one row per scoped gate the code phase runs), a comment stating the section records the chosen `{scope}` value per gate (not the command — the `.rp.md` template stays the source of truth) per `guardrails.md`, and the bare-`None` rule. Leave `## E2E test plan` and `## Tasks` unchanged.
  - Retarget the guideline that currently says "Plan the guardrail commands and the e2e flows": for each gate passed in `Guardrail scopes to fill:`, choose a `{scope}` value — from the gate's `fill-guidance` when present, otherwise derived from the spec and design — and record it in `## Guardrail scopes` (gate → value), exactly those gates, `None` when none were passed; the writer owns each scope value but not the set. Keep the e2e half (transform the spec's acceptance criteria and edge cases into the e2e test plan) and the unit-test tail (per-task unit-test selection stays the code-writer's).
- **Depends on:** Task 1 (the model and the section's value-not-command rule live in `guardrails.md`), Task 2 (`Guardrail scopes to fill:` is defined in `passing.md`)
- **Traces to:** Spec requirements 4, 5, 7 / Acceptance criteria 3, 5 / Design "The plan records the scope value, not the command", "Scope-centered names", components `agents/code-plan-writer.md`, Interfaces "Plan output"
- **Acceptance:**
  - Gather-context instructs the writer to read `Guardrail scopes to fill:` (scoped gates whose `{scope}` the code phase must supply, with command template and `fill-guidance`) and frames `None` as the default when no set is received.
  - The structure block contains `## Guardrail scopes` with a `Gate | Scope` table recording the chosen scope value per gate (not the command), a comment deferring the value-not-command rule to `guardrails.md`, and the bare-`None` rule; `## Plan-completed guardrails` and its `Command`/`Rationale` columns are gone.
  - The authoring guideline directs the writer to choose `{scope}` from `fill-guidance` when present, otherwise from the spec and design, record exactly the passed gates as gate → value, render `None` when none, and notes the writer owns the value but not the set; the e2e and unit-test halves are kept.
  - `## E2E test plan` and `## Tasks` in the structure block are unchanged; no `plan-completed` wording remains.

### Task 8: Resolve scoped gates before spawn in autonomous `4 - code.md`

- **Goal:** Retarget the code phase's resolve-before-spawn steps from the `plan-completed` model to the scoped model — substitute each scoped gate's scope value from `## Guardrail scopes` into the running agent's `Guardrails:` line before spawn — deferring the mechanic to `guardrails.md`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
- **Changes:** In `## Steps`:
  - In the per-task writer launch (step 3.1), replace "Before spawning, resolve marked gates: substitute each marked agent's feature command from the plan's `## Plan-completed guardrails` into that agent's `Guardrails:` line." with: before spawning, resolve this agent's scoped gates — substitute each scoped gate's scope value from the code plan's `## Guardrail scopes` into the gate's `.rp.md` command template and place the resolved command on the agent's `Guardrails:` line (defer the substitution mechanic to `guardrails.md`).
  - In the code-reviewer launch (step 4), retarget the same way: resolve the reviewer's scoped gates by substituting from `## Guardrail scopes` before spawn.
  - State only the timing and the source section; defer the model and the substitution algorithm to `guardrails.md`. Leave the batch logic, the reviewer base-ref reference, the rejection/approval flow, and the mermaid diagram unchanged.
- **Depends on:** Task 1 (substitution mechanic lives in `guardrails.md`), Task 7 (names `## Guardrail scopes`, introduced in the code-plan-writer)
- **Traces to:** Spec requirements 4, 8 / Acceptance criteria 3, 6 / Design "Symmetric code/docs wiring", components `reference/autonomous-phases/4 - code.md`, Interfaces "Flow"
- **Acceptance:**
  - The per-task writer launch states that before spawning, the orchestrator resolves the agent's scoped gates by substituting each scope value from `## Guardrail scopes` into the gate's command template and placing the resolved command on the `Guardrails:` line.
  - The code-reviewer launch resolves its scoped gates the same way before spawn.
  - The file defers the model and substitution algorithm to `guardrails.md` and restates neither; no `plan-completed` or feature-command wording remains; the batch logic, base-ref reference, flow, and diagram are unchanged.

### Task 9: Validate `## Guardrail scopes` and bind in `code-plan-reviewer.md`

- **Goal:** Retarget the code-plan-reviewer's checks from the `plan-completed` model to the scoped model: read `Guardrail scopes to fill:`, validate that each gate's filled command executes, and bind the section to the passed scoped-gate set.
- **Type:** tdd
- **Files to change:** `agents/code-plan-reviewer.md`
- **Changes:**
  - In `### 1. Gather context`, replace the `Guardrails to complete:` read with: read `Guardrail scopes to fill:` — the reviewer's only channel to the scoped-gate set the code phase runs; absent means the empty set.
  - In `### 2`, retarget the validation step to `## Guardrail scopes`: for each row, substitute the recorded scope value into the gate's `.rp.md` command template and execute the **filled command**, exactly as it would run; keep the runner-resolves-and-terminates discipline verbatim (the feature is not implemented yet, so a runner reporting zero or missing tests is not a rejection; a command that cannot run is a rejection; per-command and independent; side-effects judged before running). Update the heading and in-body references from the old section name to `## Guardrail scopes`.
  - In `### 3. Review the plan`, retarget the coverage check: judge that each chosen `{scope}` is appropriate for its gate — consistent with the gate's `fill-guidance` and the spec/design — replacing the old "credibly completes its marked gate" framing.
  - Retarget the **bind** check: every row's **Gate** matches a gate passed in `Guardrail scopes to fill:`, every passed scoped gate has exactly one row; a row for an unpassed or nonexistent gate is a rejection, a passed gate with no row is a rejection, and a `None` body is the valid rendering when no scoped gate was passed.
  - Retarget the "No unit-test planning" check's reference to the old section name so it points at `## Guardrail scopes`; its logic is unchanged.
- **Depends on:** Task 1 (the substitution/model lives in `guardrails.md`), Task 2 (`Guardrail scopes to fill:`), Task 7 (validates the `## Guardrail scopes` section the writer produces)
- **Traces to:** Spec requirements 4, 6 / Acceptance criteria 3, 5 / Design "The plan records the scope value, not the command", components `agents/code-plan-reviewer.md`, Failure modes "filled command cannot run … the plan-reviewer rejects"
- **Acceptance:**
  - Gather-context instructs the reviewer to read `Guardrail scopes to fill:` as its only channel to the scoped-gate set, with absence meaning the empty set.
  - The execute check targets `## Guardrail scopes`, substitutes each row's scope value into the gate's command template, executes the filled command, and keeps the runner-resolves-and-terminates discipline verbatim as an executing validation.
  - The coverage check judges each chosen `{scope}` against the gate's `fill-guidance` and the spec/design; the old "credibly completes its marked gate" framing is gone.
  - A bind check requires every row's Gate to match a gate in `Guardrail scopes to fill:` and every passed scoped gate to have exactly one row; unpassed/nonexistent rows and rowless passed gates are rejections; a `None` body is valid when none was passed.
  - The "No unit-test planning" check references `## Guardrail scopes` and is otherwise logically unchanged; no `plan-completed` wording remains.

### Task 10: Author `## Guardrail scopes` in `doc-plan-writer.md`

- **Goal:** Add the docs-phase symmetry to the doc-plan-writer — read `Guardrail scopes to fill:`, choose each doc-run gate's `{scope}`, and produce a `## Guardrail scopes` section — mirroring the code-plan-writer.
- **Type:** tdd
- **Files to change:** `agents/doc-plan-writer.md`
- **Changes:**
  - In `### 1. Gather context`, add an item: read `Guardrail scopes to fill:` — the scoped gates whose `{scope}` this plan must supply (those whose agents run in the docs phase), each with its command template and `fill-guidance`. Absent means no scoped gates this phase runs and `## Guardrail scopes` reads `None`.
  - In the `### 2. Write the plan` structure block, add a `## Guardrail scopes` section (between `## Overview` and `## Tasks`) identical in shape to the code-plan-writer's: a `Gate | Scope` table recording the chosen `{scope}` value per gate the docs phase runs, a comment deferring the value-not-command rule to `guardrails.md`, and the bare-`None` rule.
  - Add an authoring guideline mirroring the code-plan-writer's: for each gate passed in `Guardrail scopes to fill:`, choose a `{scope}` value — from `fill-guidance` when present, otherwise from the spec and design — and record it (gate → value), exactly those gates, `None` when none; the writer owns each value but not the set. Keep all existing doc-plan guidance (drift-resistance, surface coverage, no code tasks) intact.
- **Depends on:** Task 1 (model), Task 2 (`Guardrail scopes to fill:`), Task 7 (the `## Guardrail scopes` shape is authored there; reuse identical shape)
- **Traces to:** Spec requirements 4, 5, 8 / Acceptance criteria 4, 5, 6 / Design "Symmetric code/docs wiring", "The plan records the scope value, not the command", components `agents/doc-plan-writer.md`
- **Acceptance:**
  - Gather-context instructs the doc-plan-writer to read `Guardrail scopes to fill:` (scoped gates whose `{scope}` the docs phase must supply, with command template and `fill-guidance`) with `None` as the default when no set is received.
  - The structure block contains a `## Guardrail scopes` section between `## Overview` and `## Tasks` with a `Gate | Scope` table, a value-not-command comment deferring to `guardrails.md`, and the bare-`None` rule — identical in shape to the code-plan-writer's.
  - An authoring guideline directs the writer to choose `{scope}` from `fill-guidance` or the spec/design, record exactly the passed gates as gate → value, render `None` when none, owning the value not the set.
  - All existing doc-plan guidance (drift-resistance, surface coverage, no code tasks) is intact.

### Task 11: Validate `## Guardrail scopes` and bind in `doc-plan-reviewer.md`

- **Goal:** Add the docs-phase symmetry to the doc-plan-reviewer — read `Guardrail scopes to fill:`, validate each filled command executes, and bind the section — mirroring the code-plan-reviewer.
- **Type:** tdd
- **Files to change:** `agents/doc-plan-reviewer.md`
- **Changes:**
  - In `### 1. Gather context`, add an item: read `Guardrail scopes to fill:` — the reviewer's only channel to the scoped-gate set the docs phase runs; absent means the empty set.
  - Add a validation step (mirroring the code-plan-reviewer's executing validation): for each row in the doc plan's `## Guardrail scopes`, substitute the scope value into the gate's `.rp.md` command template and execute the filled command, applying the runner-resolves-and-terminates discipline (cannot-run is a rejection; zero/missing tests is not; per-command and independent; side-effects judged before running). Place it as its own numbered step before the review checks, consistent with how `code-plan-reviewer.md` orders its validate-then-review steps.
  - In `### 2. Review the plan`, add checks mirroring the code-plan-reviewer: a coverage check judging each chosen `{scope}` against the gate's `fill-guidance` and the spec/design, and a **bind** check requiring every row's Gate to match a gate passed in `Guardrail scopes to fill:`, every passed scoped gate to have exactly one row, with unpassed/nonexistent rows and rowless passed gates as rejections and a `None` body valid when none was passed.
  - Keep all existing doc-plan-review checks (surfaces, drift-resistance, traceability, etc.) intact.
- **Depends on:** Task 1 (model), Task 2 (`Guardrail scopes to fill:`), Task 9 (mirror the validate/bind wording authored there), Task 10 (validates the section the doc-plan-writer produces)
- **Traces to:** Spec requirements 4, 6, 8 / Acceptance criteria 4, 6 / Design "Symmetric code/docs wiring", components `agents/doc-plan-reviewer.md`, Failure modes "filled command cannot run … the plan-reviewer rejects"
- **Acceptance:**
  - Gather-context instructs the doc-plan-reviewer to read `Guardrail scopes to fill:` as its only channel to the scoped-gate set, with absence meaning the empty set.
  - A validation step substitutes each `## Guardrail scopes` row's value into the gate's command template, executes the filled command, and applies the runner-resolves-and-terminates discipline as an executing validation, ordered consistently with `code-plan-reviewer.md`.
  - The review checks include a coverage check (each `{scope}` judged against `fill-guidance` and the spec/design) and a bind check (every row binds to a passed gate, every passed gate has exactly one row, unpassed/rowless are rejections, `None` valid when none passed).
  - All existing doc-plan-review checks are intact; the validate/bind wording mirrors the code-plan-reviewer's.

### Task 12: Resolve scoped gates before spawn in autonomous `5 - docs.md`

- **Goal:** Add the docs-phase resolve-before-spawn step that `5 - docs.md` lacks today — substitute each running agent's scoped gates from the doc plan's `## Guardrail scopes` into its `Guardrails:` line before spawn — mirroring `4 - code.md`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Changes:** In `## Steps`:
  - In the per-task doc-writer launch (step 3.1), add a resolve-before-spawn clause mirroring `4 - code.md`: before spawning, resolve the doc-writer's scoped gates — substitute each scope value from the doc plan's `## Guardrail scopes` into the gate's `.rp.md` command template and place the resolved command on the agent's `Guardrails:` line (defer the substitution mechanic to `guardrails.md`).
  - In the doc-reviewer launch (step 4), add the same resolve-before-spawn clause.
  - State only the timing and source section; defer the model to `guardrails.md`. Leave the batch logic, base-ref reference, rejection/approval flow, inputs, and mermaid diagram unchanged.
- **Depends on:** Task 1 (substitution mechanic), Task 8 (mirror the wording authored in `4 - code.md`), Task 10 (names the doc plan's `## Guardrail scopes`)
- **Traces to:** Spec requirement 8 / Acceptance criterion 6 / Design "Symmetric code/docs wiring", components `reference/autonomous-phases/5 - docs.md`, Interfaces "Flow"
- **Acceptance:**
  - The per-task doc-writer launch states that before spawning, the orchestrator resolves the agent's scoped gates by substituting each scope value from the doc plan's `## Guardrail scopes` into the gate's command template and placing the resolved command on the `Guardrails:` line.
  - The doc-reviewer launch resolves its scoped gates the same way before spawn.
  - The file defers the model to `guardrails.md` and restates no substitution algorithm; the batch logic, base-ref reference, inputs, flow, and diagram are unchanged.
  - A docs-phase scoped gate is filled by the doc plan and resolved/run exactly as a code-phase scoped gate.

### Task 13: Adopt the fixed/scoped model in assisted `3 - plan.md`

- **Goal:** Remove the `plan-completed-for` / `## Plan-completed guardrails` model from the assisted plan phase and replace it with the fixed/scoped model so the shipped skill carries only the new model in its assisted path too — single-driver, no spawn field.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- **Changes:** This file is the assisted-mode analog of the four plan agents and carries the old model in three places; the design's "Removed: everywhere they appear" clause and spec R9/AC7 ("nothing remains") require converting it.
  - **Constraint** (current line 30): retarget to the scoped model — for each scoped gate the driver defined in `.rp.md` whose agents run in a phase, choose a `{scope}` value (from the gate's `fill-guidance` when present, otherwise from the spec and design) and record it in that plan's `## Guardrail scopes` (gate → value), `None` when the plan runs no scoped gate; authority is the single driver (both `.rp.md` author and plan author, so no spawn channel). Note the code plan fills its code-run scoped gates and the doc plan fills its doc-run ones. Keep the e2e and unit-test tail. Defer the model to `guardrails.md`.
  - **Code-plan synthesis skeleton** (current lines 132–137): replace the `## Plan-completed guardrails` block (header, comment, `Gate | Command | Rationale` table) with the `## Guardrail scopes` block (Gate / Scope table, value-not-command comment deferring to `guardrails.md`, bare-`None` rule) identical to Task 8's code-plan-writer block. Leave `## E2E test plan` and `## Tasks` unchanged.
  - **Code-plan coverage self-check** (current line 118): replace the "Plan-completed guardrails validate" bullet with a combined `## Guardrail scopes` bullet — substitute each row's value into the gate's command template and execute the filled command (runner-resolves-and-terminates discipline, verbatim, retargeted to the filled command), plus a folded bind clause confirming the section carries exactly the scoped gates the code phase runs, one row each, `None` if none.
  - **Doc-plan synthesis skeleton** (current `## Tasks`-only doc-plan structure, step 9): add a `## Guardrail scopes` section (between `## Overview` and `## Tasks`) for the doc plan, identical in shape, recording the doc-run scoped gates' scope values, `None` when none — mirroring Task 10.
  - **Doc-plan coverage self-check** (step 8): add a `## Guardrail scopes` validate+bind bullet for the doc plan mirroring the code-plan one above.
  - Invent no `Guardrail scopes to fill:` spawn field (assisted mode has a single driver, no spawn channel); reference `guardrails.md` for the model rather than restating it.
- **Depends on:** Task 1 (model), Task 7 (the code-plan `## Guardrail scopes` block shape), Task 10 (the doc-plan `## Guardrail scopes` block shape)
- **Traces to:** Spec requirements 4, 5, 8, 9 / Acceptance criteria 3, 4, 5, 6, 7 / Design "Removed … everywhere they appear", "Symmetric code/docs wiring", "The plan records the scope value, not the command"
- **Acceptance:**
  - The constraint directs the single driver to choose `{scope}` (from `fill-guidance` or the spec/design) for each scoped gate the plan's phase runs and record it in that plan's `## Guardrail scopes` (gate → value, `None` when none), with no spawn field; the e2e and unit-test tail is kept.
  - The code-plan synthesis skeleton contains the `## Guardrail scopes` block (Gate / Scope, value-not-command comment, bare-`None`) identical to the code-plan-writer's; the doc-plan synthesis skeleton contains the matching `## Guardrail scopes` block; `## E2E test plan` and `## Tasks` are unchanged.
  - The code-plan and doc-plan coverage self-checks each carry a `## Guardrail scopes` bullet that executes the filled command (runner-resolves-and-terminates discipline) and folds in a bind clause confirming exactly the phase's scoped gates, one row each, `None` if none.
  - No `plan-completed-for`, per-agent-subset, `## Plan-completed guardrails`, or `Guardrails to complete:` wording remains; the file invents no `Guardrail scopes to fill:` field and defers the model to `guardrails.md`.

### Task 14: Point "passing conventions to agents" at `passing.md` in `SKILL.md`

- **Goal:** Update SKILL.md's project-conventions pointer so "passing them to agents" points at `passing.md` rather than only `load.md`.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/SKILL.md`
- **Changes:** In `## Project conventions`, update the sentence "See `reference/conventions/load.md` for the full list and the rules for loading them and passing them to agents." so that loading defers to `load.md` and passing them to agents defers to `reference/conventions/passing.md`. Keep the rest of SKILL.md unchanged.
- **Depends on:** Task 2 (`passing.md` exists)
- **Traces to:** Spec requirement 1 / Acceptance criterion 1 / Design components `SKILL.md`, "Two references, not one"
- **Acceptance:**
  - The `## Project conventions` section points loading at `load.md` and passing-to-agents at `reference/conventions/passing.md`.
  - The rest of SKILL.md is unchanged.

### Task 15: Verify scope discipline across the tree

- **Goal:** Confirm the change is exactly the fourteen files (two new, twelve edited), that no remnant of the old model survives anywhere in the shipped skill, and that the by-design-untouched files carry no stray edits.
- **Type:** tdd
- **Files to change:** none (verification task; edit only to fix a missed remnant inside one of the fourteen files of Tasks 1–14)
- **Changes:** Sweep the live skill tree (`agents/`, `skills/radical-pipelines/`) for every old-model token — `plan-completed-for`, `plan-completed`, `Plan-completed guardrails`, `Guardrails to complete`, `Required test commands`, and "feature command"/"feature-scoped command" in the guardrail sense — and confirm zero matches remain. Confirm the five running agents (`code-writer-tdd.md`, `code-writer-e2e.md`, `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`) are unchanged by this pipeline (their generic "the guardrails convention" / `Guardrails:` wording is correct as-is). Confirm only the fixed/scoped model is documented, that `{scope}` and the per-gate block appear in `guardrails.md` and `setup.md`, and that no migration or back-compat text was added. If the sweep finds a missed token inside one of the fourteen files, fix it in that file (this task adds no fifteenth file).
- **Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10, Task 11, Task 12, Task 13, Task 14
- **Traces to:** Spec requirement 9 / Acceptance criterion 7 / Design "Removed … everywhere they appear"
- **Acceptance:**
  - A tree-wide sweep of `agents/` and `skills/radical-pipelines/` for `plan-completed-for`, `Plan-completed guardrails`, and `Guardrails to complete` finds zero matches; only the fixed/scoped model is documented.
  - The five running agents are unchanged by this pipeline.
  - No migration or back-compat text was introduced anywhere.
