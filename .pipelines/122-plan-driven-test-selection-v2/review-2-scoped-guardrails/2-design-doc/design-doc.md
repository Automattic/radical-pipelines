# Design Doc: Scoped guardrails

## Overview

Restructure the guardrails feature so its knowledge lives in one place and per-pipeline command scoping is expressed as self-contained gates. A guardrail gate is **fixed** (a literal command) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline by the planning phase). The mechanism — capture, fill, validate, resolve, run — applies identically to the code and docs phases. This replaces review-1's `plan-completed-for` model.

## Approach

- A gate is **fixed** or **scoped**. The presence of a `{scope}` placeholder in the command is what makes a gate scoped; nothing else marks it.
- A fixed gate runs its command literally. A scoped gate's `{scope}` is chosen per pipeline by the planning agent of the phase whose agents run the gate — code-run gates by the code plan, doc-run gates by the doc plan. The filler is derived from who runs the gate, not configured.
- The orchestrator substitutes the chosen scope into the gate's `.rp.md` command template before spawning each running agent; the agent runs the resolved command through its existing, unchanged run protocol.
- Guardrail knowledge is documented in one orchestrator-facing reference; the spawn-time conventions an agent receives are documented separately.

## Components

**New**

- `reference/guardrails.md` — orchestrator-facing model: gate kinds, the fill lifecycle, the spawn fields. Other files defer to it.
- `reference/conventions/passing.md` — the `## Conventions` spawn block and which conventions reach which agents.

**Modified**

- `reference/conventions/setup.md` — capture a gate as a per-gate block (name, command, agents, optional `fill-guidance`); probe scoped gates with a realistic made-up scope.
- `reference/conventions/load.md` — catalog entry defers to `guardrails.md`.
- `reference/autonomous-workflow.md` — the spawn block defers to `passing.md`.
- `reference/autonomous-phases/3 - plan.md` — pass `Guardrail scopes to fill:` to both the code-plan and doc-plan pairs.
- `reference/autonomous-phases/4 - code.md` and `5 - docs.md` — resolve each running agent's scoped gates before spawn.
- `agents/code-plan-writer.md`, `code-plan-reviewer.md`, `doc-plan-writer.md`, `doc-plan-reviewer.md` — author and validate the plan's `## Guardrail scopes`.
- `SKILL.md` — point "passing conventions to agents" at `passing.md`.

**Unchanged**

- The running agents' "Run the guardrails" step (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`) — they run the resolved commands in their `Guardrails:` field as today.

**Removed**

- The `plan-completed-for` mark, the per-agent subset, and the `## Plan-completed guardrails` plan section, everywhere they appear.

## Interfaces and Data Flow

**`.rp.md` gate** (per-gate block):

```markdown
### <name>
- command: `<command, with {scope} if scoped>`
- agents: <subset of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
- fill-guidance: <optional; scoped gates only>
```

**Spawn fields:**

- `Guardrails:` → running agents: the gates naming this agent, each with the command it runs (for a scoped gate, the resolved command after substitution).
- `Guardrail scopes to fill:` → the code-plan and doc-plan pairs: the scoped gates whose `{scope}` that plan must supply, each with its command template and `fill-guidance`.

**Plan output** — `## Guardrail scopes` in `code-plan.md` / `doc-plan.md`: one row per scoped gate the phase runs, `gate → scope value`.

**Flow:** setup captures and probes gates → phase 3 passes `Guardrail scopes to fill:` to each plan pair → the plan writes `## Guardrail scopes` and the plan-reviewer validates each filled command runs → in phase 4/5 the orchestrator substitutes each value into the `.rp.md` template → the resolved command rides in the running agent's `Guardrails:` field → the agent runs it.

## Key Decisions

### Decision: Two references, not one

- **Choice:** `guardrails.md` (model) + `conventions/passing.md` (spawn block).
- **Alternatives:** one combined reference; or guardrails-only with the block left inline in the workflow.
- **Trade-offs:** separation matches `pipeline-versioning.md` and keeps the generic spawn block (artifact folder, commit format, model) apart from the guardrail concept; cost is two files.
- **Traces to:** Requirement 1.

### Decision: Placeholder marks scoped; per-gate block in `.rp.md`

- **Choice:** a gate is scoped iff its command contains `{scope}`; gates are written as per-gate blocks.
- **Alternatives:** an explicit `kind` field; a single table.
- **Trade-offs:** the placeholder is self-documenting and can't disagree with a separate flag; blocks tolerate pipes/quotes/`{scope}` that would break a table.
- **Traces to:** Requirements 2, 7.

### Decision: The plan records the scope value, not the command

- **Choice:** `## Guardrail scopes` holds `gate → scope value`; the `.rp.md` template stays the command's single source of truth.
- **Alternatives:** the plan records the whole filled command (review-1 style).
- **Trade-offs:** value-only keeps one source of truth and a minimal plan; reading the plan alone does not show the full command.
- **Traces to:** Requirements 4, 6.

### Decision: Setup probes scoped gates with a realistic made-up scope

- **Choice:** setup substitutes a realistic, made-up `{scope}` and applies the "did it execute?" bar; the side-effects rule covers a value that runs real work.
- **Alternatives:** empty substitution; a no-match sentinel.
- **Trade-offs:** a realistic value is the strongest smoke test; it may run a bounded real test, which setup's interactive, one-time, side-effects-guarded nature accommodates.
- **Traces to:** Requirement 6.

### Decision: Scope-centered names

- **Choice:** input field `Guardrail scopes to fill:`; output section `## Guardrail scopes`; the running field stays `Guardrails:`.
- **Alternatives:** `Guardrails to fill:` / `Scoped guardrails:`.
- **Trade-offs:** the plan supplies each guardrail's scope, not the guardrail; scope-first naming reflects that.
- **Traces to:** Requirements 4, 8.

### Decision: Symmetric code/docs wiring

- **Choice:** the docs phase mirrors the code phase — `Guardrail scopes to fill:` to the doc-plan pair, `## Guardrail scopes` in `doc-plan.md`, resolve-before-spawn in phase 5.
- **Alternatives:** none — review-1 wired only the code phase, which was the defect.
- **Trade-offs:** —
- **Traces to:** Requirement 8.

Independence (Requirement 3) and per-phase filling for spanning gates (Requirement 5) follow from the model: a gate's kind and agents are independent of any other gate, and `Guardrail scopes to fill:` is computed per phase from the gates that phase's agents run.

## Dependencies

- Internal: the `pipeline-versioning.md` pattern (a single cross-cutting reference); the `AGENTS.md` rule that agent definition files are self-contained, so `guardrails.md` is orchestrator-facing and the running agents are documented in place.
- External: none.

## Failure Modes and Observability

- A gate command cannot run at setup → surfaced to the owner to fix, drop, or escape-hatch, as today.
- A scoped gate's filled command cannot run at the plan phase → the plan-reviewer rejects, returning the plan for revision.
- A spanning scoped gate whose phase plan omits its scope → the gate appears in that phase's `Guardrail scopes to fill:`, so the plan-writer must fill it and the plan-reviewer checks the set against it.
- A wrong-but-runnable scope → caught by plan-review judgment against `fill-guidance` and the spec, plus the running agent's actual gate result.

## Risks and Open Questions

- **Risk:** a realistic setup probe may execute real tests. Mitigated: the scope bounds it, setup is one-time and interactive, and the side-effects rule requires confirmation for destructive commands.
- **Risk:** reading a plan's `## Guardrail scopes` alone does not reveal the full command. Mitigated: the command template lives in `.rp.md`, the single source of truth.
- No open questions block implementation.
