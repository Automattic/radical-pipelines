# Doc Plan: Make guardrails prose

## Overview

This change redefines a guardrail in the Radical Pipelines skill from an exact command judged pass/fail by exit code to a prose rule an agent must satisfy, expressed as two kinds (a command guardrail and a judgment guardrail), and removes the exit-code framing across the nine in-scope skill and agent files. Those nine files are edited as *code* in `code-plan.md` and are not re-planned here. The only published documentation surface *about* the guardrail concept that lives outside that in-scope set, and that carries the old exit-code framing, is the `Configuration` section of the root `README.md`: one sentence characterizes the `Guardrails` convention as "deterministic verification gates (exact commands judged pass/fail by exit code)." A single doc task updates that characterization to match the redefined model and verifies the README's other, already-accurate guardrail mention stays correct. No other external surface (the marketing website, `CONTRIBUTING.md`, the changelog, the scratch PR-description file, `.rp.md`) describes guardrails in terms this change alters, so the plan is deliberately minimal.

## Guardrail scopes

This project defines no Guardrails convention, so no scoped guardrails are passed to the docs phase.

| Gate | Scope |
| ---- | ----- |
| None | —     |

## Tasks

### Task 1: Update the README's guardrail characterization in the Configuration section

- **Goal:** Bring the root `README.md` description of the `Guardrails` convention into line with the redefined guardrail model — a prose rule an agent must satisfy, expressible as a command guardrail or a judgment guardrail — and strip the exit-code framing the change removes, so a reader of the README is not told guardrails are exact commands judged by exit code.
- **Audience:** Project owners and contributors evaluating or configuring Radical Pipelines who read the top-level README to understand what conventions a project can declare.
- **Files to change:** `README.md`
- **Sections / scope:**
  - The `Configuration` section sentence that enumerates the shared conventions and characterizes the optional `Guardrails` convention (the "deterministic verification gates (exact commands judged pass/fail by exit code)" parenthetical). Reword the guardrail characterization to reflect the prose-rule definition and the two kinds, at the README's existing summary altitude, removing the exit-code framing while keeping the existing links to the convention loader and setup-conventions references and the surrounding enumeration of the other shared conventions intact.
  - Verify the later `Configuration` sentence that lists `guardrails` only as a named section of the committed `.rp.md` shared layout: confirm it remains accurate under the new model (it names the section, not the exit-code mechanism) and leave it unchanged unless the rewrite above makes its wording inconsistent.
- **Depends on:** none
- **Traces to:** Spec R1, R13; Spec acceptance criterion "describes a guardrail as a prose rule … contains no exit-code framing"; Code task 1 (the redefinition in `reference/guardrails.md` that this README sentence summarizes) and Code task 4 (the setup-conventions surface the sentence links to).
- **Acceptance:**
  - A reader of the README's `Configuration` section learns that the `Guardrails` convention declares prose rules a project's running agents must satisfy, expressible as a command guardrail or a judgment guardrail, and is no longer told guardrails are deterministic verification gates or exact commands judged pass/fail by exit code.
  - The reworded sentence contains no exit-code framing ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code") and no "deterministic verification gate" / "exact command" wording.
  - The existing links from this sentence to the convention loader and the setup conventions are preserved, and the enumeration of the other shared conventions in the same sentence is unchanged.
  - The README's later mention of `guardrails` as a named section of the `.rp.md` shared layout is confirmed accurate under the redefined model and left consistent with the rewritten characterization.
  - The README description stays at the model defined in `reference/guardrails.md` (read in phase 5) and introduces no detail — field names, block shape, or wording — beyond what that file defines.

## Surfaces deliberately excluded

These were swept and are intentionally not given tasks; recording them so the docs phase does not treat them as missed:

- **The nine in-scope skill and agent files** (`reference/guardrails.md`, `reference/conventions/load.md`, `reference/conventions/passing.md`, `reference/conventions/setup.md`, `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/doc-writer.md`, `agents/code-reviewer.md`, `agents/doc-reviewer.md`) are the *code* of this change and are fully covered by `code-plan.md`; documentation *about* them is not duplicated here.
- **`CHANGELOG.md`** — Historical released entries (e.g. #118, #124, #127) record past releases as they shipped and are an immutable record; they are not rewritten to reflect a later redefinition. The new change's own changeset is a contributor deliverable handled by the repository's changeset rule, not a documentation surface this plan owns.
- **The marketing website (`website/index.html`)** — Contains no guardrail or exit-code characterization (its only "non-deterministic" mention is unrelated copy about agent output), so there is nothing to update.
- **`CONTRIBUTING.md`** — Its "gate" references are all the CI "Changeset Gate" workflow, unrelated to guardrails.
- **`pr-description.md`** — A scratch working file for an earlier pipeline, not published documentation.
- **`.rp.md`** — Carries no guardrail characterization to update.
