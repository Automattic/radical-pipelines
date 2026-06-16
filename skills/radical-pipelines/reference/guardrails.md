# Guardrails

Guardrails are the deterministic verification gates a project's running agents must pass — exact commands judged pass/fail by exit code. A project captures its gates at setup and the orchestrator delivers each gate to the agents that run it. The full mechanism — capture, fill, validate, resolve, run — applies identically to the code and docs phases.

## Gate kinds

A guardrail gate is **fixed** or **scoped**:

- **Fixed** — a literal command run as-is.
- **Scoped** — a command containing a `{scope}` placeholder filled per pipeline.

The presence of `{scope}` in the command is the only thing that marks a gate as scoped; there is no separate kind flag. Fixed and scoped gates are ordinary gates a project composes freely: neither requires the other, and a scoped gate may exist with no fixed full-scope companion.

## The `.rp.md` per-gate block

Each gate is captured at setup as a block in `.rp.md`:

```markdown
### <name>
- command: `<command, with {scope} if scoped>`
- agents: <subset of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
- fill-guidance: <optional; scoped gates only>
```

`fill-guidance` is an optional owner-authored note telling the planning agent how to choose `{scope}`. Absent, the planning agent chooses `{scope}` from the spec and design.

## The fill lifecycle

A scoped gate's `{scope}` is chosen per pipeline by the planning agent of the phase whose agents run the gate — code-run gates by the code plan, doc-run gates by the doc plan. The filler is derived from who runs the gate, not configured.

A scoped gate whose agents span both phases is filled by each phase's plan independently — each fills `{scope}` for its own agents — so the gate may carry a different scope value per phase.

The plan records the chosen scope **value** (gate → scope value) in its `## Guardrail scopes` section. The `.rp.md` command template stays the command's single source of truth.

## Validation

A fixed gate is validated at setup by running it (the "did it execute?" check).

A scoped gate is validated twice:

- At setup, its runner is probed with a realistic made-up scope to confirm it resolves.
- At the plan phase, its filled command is validated to execute, by the plan-reviewer.

## Resolve and run

Before spawning each running agent, the orchestrator substitutes the chosen scope value into the gate's `.rp.md` command template. The resolved command rides in that agent's `Guardrails:` spawn field; the agent runs it through its existing, unchanged run protocol.

## Spawn fields

Two spawn fields carry guardrails to agents (full definitions live in `conventions/passing.md`):

- **`Guardrails:`** — to a running agent: the gates naming it, each with the command it runs (resolved, for a scoped gate).
- **`Guardrail scopes to fill:`** — to a plan pair: the scoped gates whose `{scope}` that plan must supply, each with its command template and `fill-guidance`.
