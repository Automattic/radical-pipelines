# Add a Guardrails convention to formalize deterministic code-phase verification

## Goal

The code phase has a formally declared, deterministic, machine-checkable set of **guardrails** it must pass before it can complete — each an exact command, judged pass/fail by exit code, and mandatory. Guardrails is added as **one more convention** (an **optional**, not required, one) alongside the existing project conventions: discoverable in the conventions loader, captured at setup, and referenced by name by the code-phase agents — instead of the implicit "host project's verification convention" the agents reach for today.

## Context

- The code-phase agents (`code-writer`, `code-reviewer`) already read *the host project's verification convention* and treat its gates — lint, typecheck, unit tests, e2e, build, behavior verification — as mandatory, looping until they pass. But that contract isn't formalized anywhere: not in the conventions loader, not captured at setup, not defined as a declarable convention. The agents reach for something that doesn't formally exist.
- This is the Ralph Orchestrator *backpressure* model — *"don't prescribe how; create gates that reject bad work."* Rather than scripting the agent's steps, guardrails define objective, verifiable success criteria up front: the agent figures out the path but cannot claim completion without concrete evidence (e.g. `tests: pass, lint: pass, typecheck: pass`) instead of "I think it works." This keeps agents iterating until every deterministic gate passes. Typical gates: tests, lint, typecheck, build, format, audit (and behavioral/AI-as-judge gates for subjective criteria). See https://mikeyobrien.github.io/ralph-orchestrator/concepts/backpressure/
- Supersedes #18 — guardrails subsumes E2E along with lint, typecheck, build, and behavior verification.
- First attempted in PR #112 (closed). This pipeline (v2) starts over from the intent; the previous pipeline's spec, design, and code are not inherited.

## Assumptions / directions to explore

Open directions, not requirements — research may confirm or revise them:

- Declare Guardrails as a new **optional** convention in the conventions loader (`reference/conventions/load.md` table) and the setup capture step.
- At **setup**, the orchestrator should:
  - Explain *why* guardrails matter (the backpressure rationale above) and *what kinds* to add (tests, lint, typecheck, build, format, audit, etc.), so the user can choose the right gates for their project.
  - **Validate each command before writing it** to the file — confirm it actually runs, is accessible/runnable by the agents in their environment, and exits cleanly — rather than recording commands blindly.
- Update `code-writer.md` and `code-reviewer.md` (and the doc-phase agents, if applicable) to read the **Guardrails** convention by name instead of the host project's verification convention.
