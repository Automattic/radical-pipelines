# Spec — Plan-driven test selection and reviewer-side behavior verification

## Overview

Today the Radical Pipelines skill leaves test selection to each code-writer's judgment and runs behavior verification per task inside the writer, then again at the batch level in the reviewer. The code-plan-writer is explicitly forbidden from planning tests, and the single `code-writer` agent both writes unit tests via TDD and derives end-to-end (e2e) tests from its own per-task behavior verification.

This change moves two responsibilities so every pipeline verifies the same way regardless of which writer ran which task:

1. **Test selection becomes a phase-3 planning duty.** The code-plan-writer chooses a floor of required test commands and transforms the spec's acceptance criteria and edge cases into an explicit e2e test plan, both recorded in `code-plan.md`. The code-plan-reviewer validates both.
2. **Behavior verification happens once, at the integrated-feature level, in the code-reviewer.** The writer-side per-task behavior-verification step is removed; the reviewer keeps its existing free-form verification and evidence requirement and adds re-driving the planned e2e flows.

To make these duties coherent, the single `code-writer` agent is split into `code-writer-tdd` (unit tests via TDD) and `code-writer-e2e` (implements the planner's e2e specs), and the orchestrator dispatches the correct writer by a plan-declared task type.

This is a change to this repository's own Radical Pipelines skill. The branch is stacked on issue #121's branch, so the skill files already carry #121's agent-scoped-guardrails changes; this spec is written against that current state (the gate-running enumeration in `load.md` and the Agents field in `setup.md` currently name the singular `code-writer`).

The following constraints are fixed and are not changed by this work:

- Unit-test TDD stays with the writers as-is.
- Plan-specified test commands are a floor, not the full set — writers still run their own judgment-chosen tests on top.
- The evidence requirement for behavior verification stays intact (it is relocated, not weakened).
- The CI matrix stays at PR time, outside Radical Pipelines.

## Requirements

### R1 — Plan-owned required-test-commands section

The code-plan-writer adds a "Required test commands" section to `code-plan.md`: planner-chosen exact literal commands, sourced from the spec and design. These commands:

- Reuse the guardrails two-question exit-code model ("did the command execute?" / "did the gate pass?") and are a mandatory floor run by every writer before every commit.
- Are NOT `.rp.md` guardrails: they are per-pipeline and plan-sourced, coexisting with the unchanged project-wide guardrails channel, but they obey the same pass-before-every-commit discipline.
- Are a floor, not the full set — writers still run judgment-chosen tests on top.

The floor is feature-wide and uniform across both writer types. The planner is responsible for ordering tasks and the commands' applicability so each writer's commit can satisfy the floor given what exists at that point.

### R2 — Plan-owned e2e test plan section

The code-plan-writer transforms the spec's acceptance criteria and edge cases into an explicit e2e test plan section in `code-plan.md`. The previous "derive e2e from behavior verification" mechanism is removed. This section is a shared artifact with two consumers — the e2e writer (implements the tests) and the code-reviewer (re-drives the flows) — and must be concrete enough for both.

### R3 — Lift the "Do NOT plan tests" prohibition

The prohibition on planning tests must be inverted, in lockstep, in code-plan-writer.md, code-plan-reviewer.md, and assisted-phases/3 - plan.md. The phrase describing e2e tests as "derived from browser verification" is now false and must be removed wherever it appears. The inversion is scoped: per-task unit-test selection remains the writer's responsibility (TDD); only required-test-commands and e2e flows become the planner's duty. Unit-test planning must not be mandated.

### R4 — code-plan-reviewer validates the two new sections

The code-plan-reviewer gains three validation duties on the new `code-plan.md` sections:

1. **Execute each required-test-command and confirm the runner resolves and terminates** — not that the tests exist or pass. This transplants setup.md's "did it execute?" discipline into phase 3. Because the feature is not yet implemented at plan time, a command whose runner runs but reports zero or missing tests is legitimate and is NOT a rejection; an unrunnable command (runner missing, bad invocation, never-returns) is a rejection trigger. Validation is per-command and independent.
2. **Judge that the required-test-command selection plausibly covers the feature** — a credible floor, not exhaustive (writers add their own tests).
3. **Check that the planned e2e flows cover the spec's acceptance criteria and edge cases** — the existing coverage discipline extended to the e2e section.

The existing "No test planning" check is reworked accordingly, scoped to the same boundary as R3 (unit-test selection stays the writer's).

### R5 — Split code-writer into code-writer-tdd and code-writer-e2e

`agents/code-writer.md` is replaced by two agent files, `agents/code-writer-tdd.md` and `agents/code-writer-e2e.md`, each with correct `name:` frontmatter; the old file is deleted.

- **code-writer-tdd** writes unit tests via TDD only (RED/GREEN/REFACTOR).
- **code-writer-e2e** implements the planner's e2e test specs from `code-plan.md`.
- Both are writer-type agents: each runs its guardrail selection AND the required-test-commands floor before every commit. Each selects the guardrails that name it plus the guardrails that name no agents.

Tasks gain a plan-declared type (tdd or e2e, mutually exclusive); the planner partitions unit and e2e work into separate tasks and sets each task's type. The orchestrator dispatches the correct writer by task type.

At writer time, an unrunnable required-test-command is a blocker (the plan-reviewer already validated that the commands run, so an unrunnable one indicates drift); a command that runs and exits non-zero is work to do, not a blocker — the same discipline as guardrails.

### R6 — Remove writer-side behavior verification

The writer-side behavior-verification step and the writer-side e2e self-derivation step, together with their back-references, are removed from the writer agent(s). The independent UI-conventions duty that currently sits inside the removed step is preserved in the appropriate writer.

### R7 — Reviewer verifies the integrated feature once

The code-reviewer's step-3 free-form integrated behavior verification and its evidence requirement are kept unchanged, and the reviewer additionally manually re-drives the planned e2e flows from `code-plan.md`. After this change the behavior-verification evidence requirement lives only at the reviewer (relocation, not rewording).

### R8 — Update the gate-running enumeration and Agents field in lockstep

The gate-running-agents enumeration in load.md is updated to `{code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}`. The setup.md Agents-field option list offers both new writer names, and its illustrative example table is updated to a post-split writer name. These two files must agree with each other (same set, two views). No migration or backward-compatibility text is added; the steady-state inert-guardrail rule already covers a guardrail naming a now-gone agent.

### R9 — Update the phase-4 reference for type-based dispatch

The phase-4 reference (`autonomous-phases/4 - code.md`) is updated so the orchestrator dispatches by task type: the overview reflects the two writers, the required-agents table has two writer rows (and no longer attributes behavior verification to the writer), the task-list step may capture task type, and the launch step is type-conditional. No required-agents table row or step still names a single `code-writer`.

### R10 — Assisted phase-3 consistency

The assisted phase-3 reference (`assisted-phases/3 - plan.md`) gains the two new planner sections (required-test-commands and e2e test plan) plus the matching self-checks, and inverts its test-planning rules with the same boundary as R3. Because the assisted reviewer is the owner and the flow is owner-driven Q&A, the required-test-command execution validation maps to that owner-driven flow; the assisted path must carry an equivalent validation expectation (the exact mechanism is a design detail). Singular-`code-writer` mentions that read stale after the split are reconciled with the two-writer reality across the assisted phase-2 and phase-3 references and the repository's human-facing agent roster in `README.md`. The assisted code and docs phases do not exist and are untouched.

## Out of Scope

- **Editing this repository's own `.rp.md`.** Adding `code-writer-tdd` / `code-writer-e2e` model rows and dropping the `code-writer` row is project config, not a skill change, so it is not a skill acceptance criterion. It is a required operational follow-up: without it, the next real run on this repo cannot dispatch the new writers or resolve their models.
- **Backward-compatibility / migration handling** for other projects' `.rp.md` guardrails that name a now-gone agent. The steady-state inert-guardrail rule already covers this.
- **The CI matrix**, which stays at PR time, outside Radical Pipelines.
- **Per-task unit-test selection**, which stays with the writers (TDD).

## Acceptance Criteria

1. `code-plan.md` gains a required-test-commands section and an e2e test plan section; code-plan-writer.md instructs producing both; the "Do NOT plan tests" prohibition and the "derived from browser verification" phrase are gone from code-plan-writer.md and code-plan-reviewer.md.
2. code-plan-reviewer.md instructs executing required-test-commands to confirm they run (not that tests pass or exist), judging selection coverage, and checking e2e coverage against the spec; the "No test planning" check is reworked accordingly.
3. `agents/code-writer.md` no longer exists; `agents/code-writer-tdd.md` and `agents/code-writer-e2e.md` exist with correct `name:` frontmatter; the tdd writer writes unit tests only; the e2e writer implements planned e2e specs; neither contains a behavior-verification or e2e-self-derivation step; both run the guardrail selection AND the required-test-commands floor before commit.
4. code-reviewer.md step 3 retains its free-form verification and evidence text verbatim and adds re-driving the planned e2e flows.
5. The load.md gate-running enumeration and the setup.md Agents-field list both name the two new writers and not the old `code-writer`, and they agree with each other.
6. `4 - code.md` dispatches by task type (two writer rows; type-conditional launch); no required-agents table row or step still names a single `code-writer`; the table no longer attributes behavior verification to the writer.
7. `assisted-phases/3 - plan.md` carries the two new planner sections and inverted test-planning rules; no live skill file (excluding `.pipelines/` artifacts and the project `.rp.md`) still names `code-writer` in a way that contradicts the split — a roster or role mention that presents `code-writer` as a current agent (e.g., `README.md`'s shipped-agent roster) is a violation, while a purely illustrative example that does not present it as a current agent is not.
8. No migration or backward-compatibility text is introduced anywhere.
