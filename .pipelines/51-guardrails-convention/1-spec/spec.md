# Spec: Guardrails convention

## Overview

Radical Pipelines runs a project's work through phases; in the **code** and **docs**
phases, agents must pass the project's verification gates (lint, typecheck, unit
tests, end-to-end tests, build, etc.) before their work is considered complete.
Today the agents reach for *"the host project's verification convention"* — a thing
that is never formally declared anywhere: it is not listed in the conventions
loader, not captured at setup, and not present in this project's own `.rp.md`.

This feature makes those gates explicit and first-class by introducing
**Guardrails**: a named set of deterministic verification gates a project declares
once and the relevant agents then run. A guardrail is an **exact command** judged
**by exit code** (0 = pass), and it is **mandatory** within the phase(s) it applies
to. This is the "backpressure" model — agents stay in the loop until the
deterministic checks pass — but the loop behavior already exists; this work supplies
the missing formal contract the agents were already assuming.

Guardrails are deliberately **not** a convention. A convention describes *how this
project runs the pipeline* (slugs, worktrees, commit format); a guardrail is a
*project verification command*. Because a verification command such as `npm test`
is identical no matter which agentic coding tool drives the pipeline, guardrails are
**tool-agnostic** and live in a single shared section of the project config.

The project config file `.rp.md` is restructured to hold both concepts in separate
top-level sections — `## Conventions` (everything it holds today) and `## Guardrails`
(new). This project's own `.rp.md` is updated as the reference example.

This work supersedes the narrower request to formalize E2E verification: Guardrails
subsumes the command-checkable gates (lint, typecheck, unit, e2e, build, …).
**Behavior verification** — exercising user-observable behavior and capturing
evidence (screenshots, transcripts, output samples) — is *not* a guardrail; it
remains a separate, evidence-based agent responsibility.

## Requirements

### The Guardrails concept

1. A **guardrail** is a mandatory verification gate defined as an exact command
   whose pass/fail is determined solely by its exit code (exit 0 = pass, non-zero =
   fail). "Run the tests" is not a guardrail; `npm test` is.
2. Each guardrail declares three things: a human-readable **name/label**, the
   **exact command** to run, and the **phase(s)** it applies to.
3. The only valid phase targets are the **code** phase and the **docs** phase. A
   guardrail may apply to one or both.
4. Guardrails are **tool-agnostic**: the same guardrails apply regardless of the
   active agentic coding tool (Claude Code, Pi, …). There are no per-tool guardrail
   variants.
5. Guardrails are **optional**. A project may declare none. An absent or empty
   Guardrails section means "this project has no command gates" and is a valid,
   complete state — never a blocker.

### Project config (`.rp.md`)

6. `.rp.md` is restructured into two top-level sections: a `## Conventions` section
   and a `## Guardrails` section. Guardrails are presented as a sibling of
   conventions, not as one of them.
7. All convention content that `.rp.md` holds today is preserved and relocated under
   the `## Conventions` section, with no change to its meaning.
8. The `## Guardrails` section lists the project's guardrails, each carrying the
   name, command, and applicable phase(s) from Requirement 2. The section may be
   empty/absent for a project with no command gates.

### Conventions loader and setup

9. `skills/radical-pipelines/reference/conventions/load.md` documents that `.rp.md`
   contains conventions **and** guardrails, and how an orchestrator/agent loads the
   guardrails applicable to a phase.
10. Guardrails are **not** added as a row to the conventions table in `load.md`, and
    are **not** part of the required-conventions completeness check (a project with
    no guardrails still passes that check).
11. `skills/radical-pipelines/reference/conventions/setup.md` includes a step that
    captures the project's guardrails during setup, presented as a distinct
    (optional) concept from the conventions — consistent with the existing pattern of
    one capture step per item.

### Agent behavior (code and docs phases)

12. The code-phase agents `agents/code-writer.md` and `agents/code-reviewer.md`, and
    the docs-phase agents `agents/doc-writer.md` and `agents/doc-reviewer.md`, refer
    to the project's **Guardrails** (the guardrails applicable to their phase) by
    name where they currently refer to "the host project's verification convention"
    for the command-gate role. After this change, no agent refers to a
    "verification convention" for that role.
13. Each such agent runs every guardrail applicable to its phase, treats each as
    mandatory, and (as today) does not complete its work until all of them pass. A
    guardrail that fails is work to fix, not a blocker, and must not be bypassed
    (no `--no-verify`, skips, or commented-out checks).
14. The agents' blocker rule is updated so that **having no applicable guardrails is
    not a blocker**. The current rule that treats a missing verification convention
    as a blocker is removed.
15. **Behavior verification is preserved** as a separate, evidence-based step in the
    code and docs agents. It is not reclassified as a guardrail, and it no longer
    depends on a named "verification convention"; the agent exercises the changed
    behavior and captures the required evidence as a self-contained step.
16. References in these agents to other "host project's X convention" items —
    inline API documentation, testing, UI, coding style, commit format, and
    documentation conventions — are **not** changed by this work.

### Reference example (this repository)

17. This repository's own root `.rp.md` is updated to the new structure
    (`## Conventions` + `## Guardrails`) and declares this repository's real command
    gates as the worked example, drawn from what the project actually runs (e.g.
    `npm test` and `node scripts/validate-changesets.mjs`). No new gate tooling is
    invented for this purpose.

## Out of Scope

- **Per-tool guardrail variants / a `.claude/.rp.md` + `.pi/.rp.md` split.**
  Guardrails are tool-agnostic and live in one shared section of the single root
  `.rp.md`. (The two-file layout named in the originating issue reflects an older
  repository structure.)
- **Reorganizing the conventions themselves into shared-vs-per-tool sections.** The
  restructure only relocates existing convention content under `## Conventions`; it
  does not redesign how conventions are split per tool.
- **A parser/validator for the Guardrails section.** Guardrails are prose the agents
  read, like every other entry in `.rp.md`; no new executable code or schema is
  added.
- **Redesigning the code-phase loop / backpressure mechanics.** Agents already loop
  on gates until they pass; this work formalizes the contract and changes only the
  "no guardrails" rule.
- **Changing the behavior-verification mechanism.** It is preserved as-is, separate
  from guardrails.
- **Inventing new gate tooling for this repository.** Only the project's existing
  real gates are declared.
- **Guardrails for phases other than code and docs.**
- **User-facing documentation** (README, website, and the per-tool rule files
  `conventions/claude-code.md` / `conventions/pi.md`). Documenting the new structure
  for human readers is the responsibility of this pipeline's docs phase, not this
  spec.
- **Tracker actions for the superseded issue #18.**

## Acceptance Criteria

### Guardrail definition and structure

1. **Given** the restructured `.rp.md`, **when** a reader inspects it, **then** it
   contains a top-level `## Conventions` section and a top-level `## Guardrails`
   section, with all of the file's prior convention content present under
   `## Conventions` and unchanged in meaning.
2. **Given** the `## Guardrails` section with at least one guardrail, **when** a
   reader inspects any guardrail entry, **then** it states a name/label, an exact
   command, and the phase(s) it applies to, where each declared phase is `code`
   and/or `docs`.
3. **Given** a guardrail entry, **when** a reader looks for tool-specific variants,
   **then** there are none — the guardrail is stated once and is tool-agnostic.

### Optionality

4. **Given** a project whose `.rp.md` has no `## Guardrails` section or an empty one,
   **when** the conventions loader runs its required-conventions completeness check,
   **then** the check passes (guardrails are not required).
5. **Given** a code- or docs-phase agent and a project with no applicable
   guardrails, **when** the agent reaches the point where it would run guardrails,
   **then** it runs none, does not report a blocker, and proceeds.

### Loader and setup

6. **Given** `conventions/load.md`, **when** a reader inspects it, **then** it
   explains that `.rp.md` holds both conventions and guardrails and how the
   guardrails for a phase are loaded, and it does **not** list Guardrails as a row in
   the conventions table.
7. **Given** `conventions/setup.md`, **when** a reader inspects it, **then** it
   includes a step that captures the project's guardrails, marked optional and
   distinct from the conventions.

### Agent behavior

8. **Given** `code-writer.md`, `code-reviewer.md`, `doc-writer.md`, and
   `doc-reviewer.md`, **when** they are searched for the phrase "verification
   convention", **then** no occurrence remains that names it as the source of the
   command gates; each instead refers to the project's Guardrails for its phase.
9. **Given** a code- or docs-phase agent and a project that declares guardrails for
   that phase, **when** the agent performs its verification step, **then** it runs
   every guardrail applicable to that phase, treats each as mandatory, and does not
   complete while any of them fail.
10. **Given** a guardrail command that fails, **when** the agent encounters it,
    **then** the agent treats it as work to fix (not a blocker) and does not bypass
    it.
11. **Given** the same four agents, **when** their behavior-verification and other
    "host project's X convention" references are inspected, **then** behavior
    verification is still present as a separate evidence-based step and the other
    convention references (inline docs, testing, UI, coding, commit, documentation)
    are unchanged.

### Reference example

12. **Given** this repository's root `.rp.md` after the change, **when** a reader
    inspects it, **then** it uses the `## Conventions` + `## Guardrails` structure
    and its `## Guardrails` section declares this repository's real command gates
    (e.g. `npm test`), each with a name and an applicable phase.
