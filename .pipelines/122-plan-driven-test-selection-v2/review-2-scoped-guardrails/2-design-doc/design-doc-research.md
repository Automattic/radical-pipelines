# Design Research: Scoped guardrails

## Research

Current guardrail wiring (the `plan-completed-for` model from review-1), to be replaced:

- Capture: `skills/radical-pipelines/reference/conventions/setup.md` §Guardrails.
- Load/catalog: `reference/conventions/load.md` (conventions table; `.rp.local.md` exclusion text).
- Spawn block + two guardrail fields (`Guardrails:`, `Guardrails to complete:`): `reference/autonomous-workflow.md` §5.
- Plan phase passes `Guardrails to complete:` to the code-plan pair only: `reference/autonomous-phases/3 - plan.md`.
- Resolve marked gates before spawn (code only): `reference/autonomous-phases/4 - code.md`.
- Plan authoring/validation of `## Plan-completed guardrails`: `agents/code-plan-writer.md`, `agents/code-plan-reviewer.md`.
- Gate-running agents (each self-contained "Run the guardrails" step — unchanged by this work): `agents/code-writer-tdd.md`, `code-writer-e2e.md`, `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`.
- Docs phase has no scoped wiring (the symmetry gap to fill): `reference/autonomous-phases/5 - docs.md`, `agents/doc-plan-writer.md`, `doc-plan-reviewer.md`.

Reference patterns:

- `reference/pipeline-versioning.md` is the model for a single centralized cross-cutting reference (lives at the reference root).
- `AGENTS.md` rule: agent definition files are self-contained (a spawned agent works only from the orchestrator's prompt), so cross-file dedup does not apply to them — the centralized guardrails reference is orchestrator-facing only.

## Topics

### Topic: Documentation structure

- **Spec link:** Requirement 1 (centralized documentation)
- **Options:**
  1. Two references — `reference/guardrails.md` (model: gate kinds, fill lifecycle, spawn fields) + `reference/conventions/passing.md` (spawn-time `## Conventions` block); others defer.
  2. One combined `guardrails.md` covering both.
  3. `guardrails.md` only; conventions block stays inline in `autonomous-workflow.md`.
- **Trade-offs:** (1) separates two distinct concerns, mirrors `pipeline-versioning.md`; two files. (2) one place but bundles the non-guardrail spawn fields (artifact folder, commit format, model). (3) smallest change but leaves the block embedded and `SKILL.md`'s passing pointer mislocated.
- **Decision:** Option 1.
- **Rationale:** The spawn block is generic; guardrails is a distinct cross-cutting concept. Separation matches the existing reference pattern and fixes the mislocated pointer.

### Topic: `.rp.md` gate representation

- **Spec link:** Requirement 2 (fixed/scoped gates), Requirement 7 (optional fill-guidance)
- **Options:**
  1. Per-gate block (name heading; command/agents/fill-guidance as fielded values).
  2. Single table (gate | command | agents | fill-guidance).
  3. Prose per gate.
- **Trade-offs:** (1) readable, extensible; commands with pipes/`{scope}` sit cleanly. (2) compact but a pipe in a command breaks the table and guidance prose bloats cells. (3) loosest, hardest to parse.
- **Decision:** Option 1 (per-gate block).
- **Rationale:** Matches multi-field convention capture; robust to special characters in commands.

### Topic: Plan record for scoped gates

- **Spec link:** Requirement 4 (derived filler), Requirement 6 (plan-phase validation)
- **Options:**
  1. Value only — plan records the `{scope}` value per gate; orchestrator substitutes into the `.rp.md` template before spawn.
  2. Full filled command — plan records the whole resolved command; orchestrator passes as-is (review-1 style).
- **Trade-offs:** (1) `.rp.md` template stays the single source of truth, minimal plan; reading the plan alone doesn't show the full command. (2) self-contained in the plan but duplicates the template and reopens author-a-command freedom.
- **Decision:** Option 1. Section is `## Guardrail scopes` (renamed in Topic 5; one row per scoped gate the phase runs, gate → scope value); no rationale column.
- **Rationale:** Matches the "fill a value, not author a command" model; keeps the command shape authoritative in `.rp.md`.

### Topic: Setup probe for scoped gates

- **Spec link:** Requirement 6 (scoped gate runner probed at setup)
- **Options:**
  1. Empty substitution (`--grep `) — may error or match everything (runs the whole suite).
  2. No-match sentinel (`--grep __rp-probe__`) — runner resolves, matches nothing.
  3. Realistic made-up scope — orchestrator crafts a plausible value fit to the gate.
- **Trade-offs:** (1) no magic value but unsafe/ambiguous semantics. (2) safe and simple but artificial; may mask invocation issues a real value would catch. (3) exercises the command like a real run, strongest signal; needs a crafted value (no feature exists at setup) and may run a bounded real test.
- **Decision:** Option 3. The orchestrator substitutes a realistic, made-up `{scope}` (fit to the gate, informed by fill-guidance or the project's tests, optionally confirmed with the owner) and applies the usual "did it execute?" bar; the existing side-effects rule (confirm before running a command that writes/deploys/destroys) bounds a value that runs real work.
- **Rationale:** A realistic value is the strongest smoke test; setup is one-time and interactive, and the side-effects rule already limits the risk.

### Topic: Spawn fields for scoped gates

- **Spec link:** Requirement 4 (derived filler), Requirement 8 (symmetry)
- **Options (name of the input field to planning agents):**
  1. `Guardrail scopes to fill:` — scope-centered.
  2. `Guardrails to fill:` / `Scoped guardrails:` — guardrail-centered (rejected: it is the scope that is filled, not the guardrail).
- **Decision:** `Guardrail scopes to fill:` — input to the code-plan and doc-plan pairs; each entry = guardrail name + command template + `fill-guidance`. The running agents' field stays `Guardrails:` (resolved commands). The plan's output section is realigned to `## Guardrail scopes` (gate → scope value) for the same scope-centered framing.
- **Rationale:** The plan supplies each guardrail's scope, not the guardrail; input field and output section share the framing.
- **Data flow:** orchestrator passes `Guardrail scopes to fill:` → plan writes `## Guardrail scopes` → orchestrator substitutes each value into the `.rp.md` template → resolved command in the running agent's `Guardrails:`.

### Topic: Docs-phase symmetry

- **Spec link:** Requirement 8 (symmetry)
- **Decision:** Mirror the code-phase wiring onto docs, no new choices: phase 3 passes `Guardrail scopes to fill:` to the doc-plan pair for doc-agent gates; `doc-plan-writer` authors `## Guardrail scopes` in `doc-plan.md`; `doc-plan-reviewer` validates; phase 5 resolves doc agents' scoped gates before spawn exactly as phase 4.
- **Rationale:** Closes review-1's asymmetry; the mechanism is shared, so docs and code behave identically.

## Open Questions

None blocking implementation.

## Risks

## Risks
