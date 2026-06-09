# Add a Guardrails convention to formalize deterministic code-phase verification

## Goal

The code phase has a formally declared, deterministic, machine-checkable set of
**guardrails** (gates) it must pass before it can complete. Each gate is an exact
command that passes or fails by exit code and is mandatory. "Guardrails" exists as
a first-class project-level convention — a contract that is discoverable, captured
at setup time, declared in this project's own conventions, and referenced by name
by the code-phase agents — rather than the implicit "host project's verification
convention" the agents reach for today.

## Context

- The code-phase agents (`code-writer`, `code-reviewer`) already instruct
  themselves to read *the host project's verification convention* and treat its
  gates — lint, typecheck, unit tests, e2e, build, behavior verification — as
  mandatory, looping on them until they pass. But this convention isn't formally
  listed in `conventions/load.md`, isn't asked about during `conventions/setup.md`,
  and isn't declared in this repo's own `.claude/.rp.md` / `.pi/.rp.md`. The agents
  reach for something that, today, does not formally exist as a project-level
  contract.
- This is the Ralph Orchestrator *backpressure* model: keep agents in the loop
  until the deterministic checks all pass. The convention should make those gates
  explicit instead of implicit.
  Reference: https://mikeyobrien.github.io/ralph-orchestrator/concepts/backpressure/
- This work **supersedes #18** — Guardrails subsumes E2E along with lint,
  typecheck, build, behavior verification, and similar gates.

## Assumptions / directions to explore

The following is the owner's proposed direction. Treat it as the owner's best
current understanding — open to confirmation or revision by research in later
phases — not as fixed requirements. Each guardrail gate is envisioned as: an exact
command (not "run the tests"), pass/fail by exit code, and mandatory.

- Add a "Guardrails" row to `conventions/load.md` as a required convention.
- Add a Guardrails section to `conventions/setup.md` that captures the list of gate
  commands.
- Update `code-writer.md` and `code-reviewer.md` to read the **Guardrails**
  convention by name instead of *the host project's verification convention*.
- Populate Guardrails in this repo's `.claude/.rp.md` and `.pi/.rp.md` as the
  reference example.

Origin: "Perhaps not for today, but a future improvement would be to incorporate
in a very deterministic way the guardrails that have to pass in the code phase.
Something similar to this:
https://mikeyobrien.github.io/ralph-orchestrator/concepts/backpressure/"
