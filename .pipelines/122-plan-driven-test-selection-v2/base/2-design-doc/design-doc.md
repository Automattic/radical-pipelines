# Design Doc — Plan-driven test selection and reviewer-side behavior verification

## Overview

This change modifies this repository's own Radical Pipelines skill. It moves two responsibilities so every pipeline run verifies the same way regardless of which writer ran which task:

1. **Test selection becomes a phase-3 planning duty.** The code-plan-writer chooses a floor of required test commands and transforms the spec's acceptance criteria and edge cases into an explicit e2e test plan, both recorded in `code-plan.md`. The code-plan-reviewer validates both.
2. **Behavior verification happens once, at the integrated-feature level, in the code-reviewer.** The writer-side per-task behavior-verification step is removed; the reviewer keeps its existing free-form verification and evidence requirement and adds re-driving the planned e2e flows.

To make these duties coherent, the single `code-writer` agent is split into `code-writer-tdd` (unit tests via TDD) and `code-writer-e2e` (implements the planner's e2e specs), and the orchestrator dispatches the correct writer by a plan-declared task type.

The branch is stacked on issue #121's branch, so the skill files already carry #121's agent-scoped-guardrails changes; this design is grounded against that current state (the gate-running enumeration in `load.md` and the Agents field in `setup.md` currently name the singular `code-writer`).

Fixed constraints, unchanged by this work: unit-test TDD stays with the writers; plan-specified test commands are a floor, not the full set; the behavior-verification evidence requirement is relocated, not weakened; the CI matrix stays at PR time, outside Radical Pipelines.

## Architecture

The design has four moving parts that compose into one dispatch flow:

**1. The plan carries the test contract.** `code-plan.md` gains two new data sections — `## Required test commands` (the floor every writer runs before every commit) and `## E2E test plan` (the spec's acceptance criteria and edge cases as concrete, re-drivable flows). Both are pure data; the run-before-every-commit / two-question discipline stays at the consumers that already state it, keeping the artifact standalone (it never points at convention files).

**2. Tasks declare a type, and the orchestrator dispatches on it.** Each task block gains `- **Type:** tdd | e2e`. The lowercase enum values match the agent-name suffixes so type→agent is a literal mapping. The orchestrator's authoritative dispatch point is the launch step: it launches `code-writer-tdd` for a `tdd` task and `code-writer-e2e` for an `e2e` task, still passing the verbatim task block — it now reads one field to choose the agent, with no new block-slicing capability.

**3. The single writer splits into two near-twin agents.** `code-writer-tdd` writes unit tests via TDD; `code-writer-e2e` implements the planner's e2e specs. Both are writer-type gate-running agents: each runs its guardrail selection AND the required-test-commands floor before every commit, under one shared two-question outcome model. The two files share their scaffolding verbatim (role frame, gather-context, run-the-gates, commit-and-report, most guidelines); only the authoring core diverges — mirroring the existing `code-writer`/`doc-writer` relationship, where cross-agent-file duplication is the norm because agent files are independent dispatch targets that never read each other.

**4. Behavior verification relocates from writer to reviewer.** The writer-side behavior-verification step and the writer-side e2e self-derivation step are removed. The code-reviewer keeps its free-form integrated verification and its evidence requirement byte-identical, and additionally re-drives the planned e2e flows from `code-plan.md`.

A matched pair of checks holds the floor's drift rule well-founded: the **plan-reviewer** executes each required-test-command at plan time to confirm its runner resolves and terminates, which is exactly what makes the **writer-time** rule "an unrunnable floor command is a blocker (drift)" sound — if the plan-reviewer validated it runs, an unrunnable one at writer time can only mean drift.

## §1 — `agents/code-plan-writer.md`

Plan structure (currently L23-47): insert `## Required test commands` and `## E2E test plan` between `## Overview` and `## Tasks`, and add `- **Type:** tdd | e2e` to the task block directly after `- **Goal:**`. Section order becomes `# Code Plan` → `## Overview` → `## Required test commands` → `## E2E test plan` → `## Tasks`. This matches the house pattern (granular individually-traced blocks stay terminal, so the phase-4 task enumeration is unaffected) and puts the floor and flows ahead of the tasks that reference them.

**`## Required test commands` shape** — pure data, no discipline text:

```markdown
## Required test commands

<!-- Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid. -->

| Name | Command | Covers |
| ---- | ------- | ------ |
| ...  | ...     | ...    |
```

The `Agents` column from the guardrails capture shape is dropped (the floor is uniform — both writers run all rows); `Covers` is a one-line "what it exercises" note that directly supports the plan-reviewer's selection-coverage judgment and mirrors the spirit of `Traces to`. The "none is valid" note mirrors setup.md's "'None' is a complete, valid answer."

**`## E2E test plan` shape** — a numbered list of `### Flow N` blocks mirroring `### Task N`:

```markdown
## E2E test plan

<!-- The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive. -->

### Flow 1: <title>

- **Steps:** ...
- **Expected:** ...
- **Traces to:** Acceptance criterion N / Edge case <desc>
```

`Steps` are concrete ordered drive steps; `Expected` is the observable outcome to assert; `Traces to` reuses the established identifier (no new notation) so the reviewer cross-checks flows against the spec AC list exactly as it does for tasks. Granularity is set so the steps are both human-re-drivable (reviewer) and automatable (e2e writer).

**Flow→task linkage uses existing task fields, no new schema field.** An e2e task's `Goal`/`Changes` names the flow(s) it implements; its `Acceptance` asserts those flows are covered by passing e2e tests. Task ordering for floor satisfiability rides the existing `Depends on` field.

**Test-planning rules inverted:** invert the "Do NOT plan tests" prohibition (L64) to: "**Plan the test floor and e2e flows, not unit tests.** Choose the required-test-commands floor and transform the spec's acceptance criteria and edge cases into the e2e test plan (the two sections above). Per-task unit-test selection stays the writer's: task Acceptance describes *what must be true*, and the tdd writer turns it into unit tests in the RED phase. Do not prescribe which unit tests a task writes." This inverts the prohibition for the two planner-owned channels, preserves the unit-TDD boundary, and removes the now-false "derived from browser verification" phrase. Narrow L60's actor to "the **tdd writer** turns them into unit tests in the RED phase" (not falsely universal now that e2e tasks exist).

## §2 — `agents/code-plan-reviewer.md`

The three new validation duties slot in as a hybrid of one new execution step plus two judgment checklist items, and the existing "No test planning" check is reworked.

**New step 2 — Validate the required-test-commands** (an execution action, a different mode from the read-only checklist; the reviewer runs no commands today). Inserted as step 2, pushing the review step to step 3. The reviewer already runs inside the pipeline worktree (it explores the codebase to verify file paths), which is better parity than setup.md's pre-worktree main checkout, so no environment hedging is carried over. Restated inline — no reference to setup.md — matching the standalone-agent pattern:

> Execute each command in the plan's Required test commands section, exactly as written. The one question is **did the command's runner resolve and terminate?** — not whether tests exist or pass. The feature is not implemented yet, so a runner that runs but reports zero or missing tests is legitimate and is NOT a rejection. A command that cannot run — runner missing, bad invocation, never returns — IS a rejection. Validation is per-command and independent. A command that writes, deploys, or destroys takes effect against the worktree — judge before running it.

The plan-time twist (zero/missing tests is legitimate) is the load-bearing addition that distinguishes this from setup.md's discipline.

**Two new judgment checklist items** added next to the existing Coverage / Feasibility items:

- **Required-test-commands coverage** — does the floor plausibly cover the feature? A credible floor, not exhaustive (writers add their own tests).
- **E2E coverage** — do the planned e2e flows cover the spec's acceptance criteria and edge cases? Flag any criterion or material edge case with no covering flow.

**Reworked check** — invert the "No test planning" check (L28) to a scoped "**No unit-test planning**": does the plan refrain from prescribing which *unit* tests a task writes? Unit-test selection stays the writer's (TDD from per-task Acceptance). Flag any task that prescribes specific unit tests. (The required-test-commands floor and the e2e test plan are now planner-owned and are validated above — they are not a violation.) Removes the false "derived from browser verification" phrase.

## §3 — `agents/code-writer-tdd.md` (new) and `agents/code-writer-e2e.md` (new); `agents/code-writer.md` deleted

`agents/code-writer.md` is deleted and replaced by two near-twin files. Both collapse from 6 steps to 4 — **Gather context / Implement / Run the gates / Commit and report** — as the removed behavior-verification and derive-e2e steps collapse and run-gates absorbs the floor. Both share scaffolding verbatim; only the Implement step (and a few per-writer lines) diverge.

**Shared "Run the gates" step (both files):** rename step 5 "Run the writer guardrail selection" to "Run the gates," stating the writer runs two command sets — (i) its guardrail selection and (ii) the required-test-commands floor — both subject to the SAME already-stated two-question outcome model and the same no-bypass / all-pass-before-commit rules. The outcome model and drift/failing-outcome bullets are stated ONCE and apply to both sets (no duplication): an unrunnable declared gate is a blocker (drift — the plan-reviewer already validated the floor runs, per §2's matched pair); a gate that runs and exits non-zero is work to do, not a blocker. The back-reference to the removed verification step (L46) is dropped.

**`code-writer-tdd.md`:**
- `name: code-writer-tdd`; description "unit tests via TDD."
- Implement step keeps RED/GREEN/REFACTOR and the public-symbol documentation block. Drop the "e2e not in RED, added in step 4…" line and replace with a one-line positive statement "this writer writes unit tests only" (no step-4 back-reference).
- The **UI-conventions duty moves here only** — the tdd writer implements the production code where UI surfaces are written; the e2e writer only drives already-built UI, so UI conventions have no production-code target there. Phrase it conditionally ("if your task involves UI, follow the host project's UI conventions").
- Guardrail-read line names `code-writer-tdd`.
- Self-containment guideline (L65): "The task block plus the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."

**`code-writer-e2e.md`:**
- `name: code-writer-e2e`; description "implements the planner's e2e test specs from `code-plan.md`."
- Implement step replaces TDD: for each flow named in the task block, read its `### Flow N` spec (Steps/Expected/Traces to) from the E2E test plan section, write an automated e2e test realizing the Steps and asserting the Expected, and add it to the project's e2e suite per host testing convention. **No RED/GREEN/REFACTOR** — instead a light confirm: "author the test and confirm it genuinely exercises the flow and passes against the built behavior" (the production behavior exists by the time e2e tasks run, per the planner's ordering obligation; this also catches vacuously-passing tests). Per-task Acceptance (flows covered by passing e2e tests) is the contract.
- **Drop the heavyweight public-symbol documentation block** (e2e tests rarely add documented public API); replace with a one-line guideline "follow project conventions for test code, including any inline documentation the test convention expects."
- Guardrail-read line names `code-writer-e2e`.
- Self-containment guideline (L65) carve-out names both shared sections: "The task block, the E2E test plan section, and the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."

**Self-containment carve-out rationale:** the self-containment prohibition was always scoped to "other **tasks** in the code plan" (sibling task-blocks); reading a named non-task shared section is not forbidden by it. The e2e writer's narrow carve-out (read the E2E test plan section) is consistent with that scoping and with the reviewer already reading the same section directly. The E2E test plan must be a standalone `code-plan.md` section anyway, because its other consumer (the reviewer, §4) reads `code-plan.md` directly — a per-task-only e2e shape is ruled out.

**Recommended skeletons:**

```markdown
# code-writer-tdd
1. Gather context — task block; Required test commands section; guardrails naming code-writer-tdd or no agents; cited review issues.
2. Implement with TDD — RED/GREEN/REFACTOR for unit tests (unit tests only); document public symbols; follow host UI conventions if the task involves UI.
3. Run the gates — guardrail selection AND required-test-commands floor; all pass before commit.
4. Commit and report.

# code-writer-e2e
1. Gather context — task block (names the flows); E2E test plan section + Required test commands section; guardrails naming code-writer-e2e or no agents; cited review issues.
2. Implement the planned e2e flows — realize each named flow's Steps/Expected as an automated e2e test; run each and confirm it genuinely exercises the flow and passes against the built behavior.
3. Run the gates — guardrail selection AND required-test-commands floor; all pass before commit.
4. Commit and report.
```

## §4 — `agents/code-reviewer.md`

Keep the "### 3. Behavior verification" heading and the free-form body + evidence sentence (L35) **byte-identical**. Insert a new sentence at the end of L34's paragraph, BEFORE the L35 evidence sentence, so the evidence requirement closes over both the free-form verification and the re-drive:

> Additionally, manually re-drive each flow in the plan's E2E test plan section of `code-plan.md`: perform the flow's Steps and confirm its Expected outcome, capturing evidence as above.

The reviewer already reads `code-plan.md` directly, so the E2E test plan section is reachable. After this change the behavior-verification evidence requirement lives only at the reviewer (relocation, not rewording). The template (L81) and guideline (L110) stay byte-identical — re-driven flows are changed behavior exercised end-to-end, already covered by them.

**L29 test-quality check** takes a light tie-to-plan rephrase — "end-to-end tests are present for the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan)" — since e2e is now planned, not derived. This keeps the check coherent with the new model; it is in scope (the byte-identical constraint covers only L35/L81/L110).

## §5 — `reference/autonomous-phases/4 - code.md`

The phase-4 reference is updated so the orchestrator dispatches by task type:

- **Overview (L3):** "dispatching each code task to a fresh writer chosen by the task's Type — `code-writer-tdd` for tdd tasks, `code-writer-e2e` for e2e tasks."
- **Required-agents table (L23-26):** replace the single `code-writer` row with two writer rows — `code-writer-tdd` ("Implements its assigned task with TDD, runs the gates, commits") and `code-writer-e2e` ("Implements the planned e2e flows, runs the gates, commits"). Neither says "verifies behavior" (it has moved to the reviewer). "validates" → "runs the gates" to match the §3 renamed step.
- **Step 1 (L30):** optionally append ", capturing each task's Type" (minimal, not load-bearing — dispatch reads Type from the block at launch, the single source of the routing decision).
- **Step 3.1 launch (L33):** type-conditional launch — "a fresh writer chosen by the task's Type — `code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task" — with the verbatim block, and add `Type` to the parenthetical field list so it stays in sync.
- **Unchanged:** the generic plural "code-writers" / "code-writer in the batch" at L34/L35 stays (these describe shared-worktree sequencing, not a single dispatch-target row/step); an optional touch is "every writer in the batch" at L35. The mermaid "Code Writer" node stays unchanged — one writer per task chosen by type is not a fork, and splitting the node would misrepresent it.

## §6 — `reference/conventions/load.md` and `reference/conventions/setup.md` (lockstep)

These two files must agree — the same five-agent set, two views.

- **load.md (L30):** gate-running enumeration becomes `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer` (rest of the sentence unchanged).
- **setup.md (L183):** Agents-field option list becomes the same five names; the prose tail ("Naming only `code-reviewer`…") reads fine and needs no change.
- **setup.md (L189):** illustrative example row → `code-writer-tdd` (a fast gate on the unit/code writer is the best illustration and it demonstrates the field accepts a split name).

No migration or backward-compatibility text is added — the steady-state inert-guardrail rule already covers a guardrail naming a now-gone agent.

## §7 — `README.md`

Roster (L112): replace `code-writer` with `code-writer-tdd`, `code-writer-e2e` in the shipped-agent roster. This is the only README hit and it is a current-agent roster claim, so it must change.

## §8 — `reference/assisted-phases/3 - plan.md`

Because the assisted reviewer is the owner and the flow is owner-driven Q&A (assisted spawns no agents, so there is no autonomous plan-reviewer to fall back on), the command-execution validation maps to the driver-executes / surface-to-owner pattern that setup.md's owner-driven guardrail capture already uses.

- **code-plan.md skeleton (L126-146):** gains `## Required test commands` + `## E2E test plan` (same order and shapes as §1) and `- **Type:** tdd | e2e` after Goal — structurally identical to the autonomous schema.
- **Test-planning rules:** invert the L30 constraint and L117 self-check, and narrow L152, with the same boundary as §1 (planner owns the floor + e2e flows; per-task unit-test selection stays the writer's TDD).
- **Step-4 self-check gains two items:**
  - **Required-test-commands validate** — "execute each command in the Required test commands section and surface the result to the owner: did the command's runner resolve and terminate? The feature isn't implemented yet, so a runner reporting zero or missing tests is fine; a command that cannot run (runner missing, bad invocation, never returns) is a problem to fix with the owner before synthesis. Per-command and independent." (Driver executes and surfaces to the owner — mirroring setup.md's owner-driven validate-by-executing pattern; an owner-assertion-only approach is weaker, and dropping it entirely would leave unvalidated commands shipping.)
  - **E2E coverage** — placed next to the existing coverage self-check (L109): do the planned e2e flows cover the spec's acceptance criteria and edge cases?
- **Assisted naming (minimal touch):** invert only the test-planning-semantics lines (L30/L152, above); leave the abstract singular `code-writer` role mentions (assisted 3 L25, L59, L96, L114; assisted 2 L48, L81, L100). These are abstract phase-4-role references true of both new writers, not roster/dispatch claims, so they are not violations; rewriting to "the tdd or e2e writer" is churn that reads worse, and L25's bundling with the unchanged "doc-writer (phase 5)" would make the asymmetry worse.

## Untouched (confirmed)

- `SKILL.md:39` — "behavior verification" stays a phase-4 output (now produced at the reviewer).
- `agents/doc-writer.md:64` — incidental example, not a `code-writer` dispatch/roster claim.
- `reference/autonomous-phases/3 - plan.md` — orchestrates the planner/reviewer pair only, no test-planning content.
- `agents/code-writer.md:20` "unit tests derived from the task's Acceptance criteria" — a different, still-true usage of "derived" (moves into `code-writer-tdd.md` with the rest of the TDD core); not the "derived from browser verification" phrase being removed.
- The steady-state inert-guardrail rule — no migration text (AC8).

## Trade-offs and rejected alternatives

- **E2E writer self-containment seam.** Chosen: a narrow carve-out letting `code-writer-e2e` read the standalone E2E test plan section. Rejected: (a) the orchestrator slices the e2e section per task — adds a new orchestrator capability and an unmodeled task→flow mapping; (b) per-task-only e2e specs — denies the reviewer a coherent section to re-drive and contradicts the shared-artifact requirement. The carve-out keeps the orchestrator's dispatch dumb (verbatim block + one Type field) and serves both consumers from one section.
- **New sections as pure data vs. embedding discipline.** Chosen: pure data; the two-question / run-before-every-commit discipline stays at the consumers that already state it. Embedding it in the artifact would both break standalone-ness (the artifact would point at conventions) and duplicate the discipline. The spec's "reuse the two-question model" is satisfied by the consumers applying their existing model to these commands.
- **Command-execution validation as its own step vs. a checklist item.** Chosen: its own new step in the plan-reviewer, because executing commands is a different mode from the read-only checklist. The two coverage judgments stay as checklist items next to the existing ones.
- **Restating the execution discipline inline vs. referencing setup.md.** Chosen: restate inline (matching the standalone-agent pattern — no agent file references convention files by name). The plan-reviewer reuses setup.md's *discipline* without a path link, and drops setup.md's parity-floor / no-worktree-yet caveat because it has better parity (it runs in the writers' actual worktree).
- **Two near-twin writer files vs. one parameterized file.** Chosen: two files sharing scaffolding verbatim, consistent with the existing `code-writer`/`doc-writer` relationship; CLAUDE.md's no-duplication rule governs the skill's reading paths, not independent agent dispatch targets.
- **Coupling flagged (planner obligation, not part of this design's seam):** because both writers run the floor before every commit and the floor may include an e2e command, the planner must order e2e tasks (via `Depends on`) so the e2e tests exist by the time a commit must satisfy the floor.

## Out of scope

- **Editing this repository's own `.rp.md`** (adding `code-writer-tdd` / `code-writer-e2e` model rows and dropping the `code-writer` row). This is project config, not a skill change, so it is not a skill acceptance criterion. It is a required operational follow-up: without it, the next real run on this repo cannot dispatch the new writers or resolve their models.
- **Backward-compatibility / migration handling** for other projects' `.rp.md` guardrails that name a now-gone agent — the steady-state inert-guardrail rule already covers this.
- **The CI matrix**, which stays at PR time, outside Radical Pipelines.
- **Per-task unit-test selection**, which stays with the writers (TDD).

## Acceptance-criteria coverage

| AC | Where satisfied |
| -- | --------------- |
| AC1 — required-test-commands + e2e sections; code-plan-writer produces both; phrases removed | §1, §2 |
| AC2 — code-plan-reviewer executes commands, judges coverage, checks e2e; "No test planning" reworked | §2 |
| AC3 — `code-writer.md` gone; tdd + e2e writers exist with correct frontmatter; no verification/self-derivation step; both run guardrails + floor | §3 |
| AC4 — code-reviewer step 3 keeps free-form + evidence verbatim, adds re-drive | §4 |
| AC5 — load.md + setup.md name the two writers, agree with each other | §6 |
| AC6 — phase-4 dispatches by Type (two rows, type-conditional launch); no single `code-writer`; no writer behavior-verification | §5 |
| AC7 — assisted phase-3 sections + inverted rules; README roster updated; no contradicting `code-writer` in live files | §1–§2 (mirrored in §8), §7, §8 |
| AC8 — no migration / backward-compatibility text introduced | §6, Untouched |
