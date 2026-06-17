# Guardrails

Guardrails are the deterministic verification gates a project's running agents must pass — exact commands judged pass/fail by exit code.

## Gate kinds

A guardrail gate is **fixed** or **scoped**:

- **Fixed** — a literal command run as-is.
- **Scoped** — a command containing a `{scope}` placeholder filled per pipeline.

## The `.rp.md` per-gate block

Each gate is captured at setup as a block in `.rp.md`:

```markdown
### <name>

- command: `<command, with {scope} if scoped>`
- agents: <one or more of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
- fill-guidance: <optional; scoped gates only>
```

`fill-guidance` is an optional owner-authored note telling the planning agent how to choose `{scope}`. Absent, the planning agent chooses `{scope}` from the spec and design.

## The fill lifecycle

A scoped gate's `{scope}` is chosen per pipeline by the planning agent of the phase whose agents run the gate — code-run gates by the code plan, doc-run gates by the doc plan.

A scoped gate whose agents span both phases is filled by each phase's plan independently — each fills `{scope}` for its own agents — so the gate may carry a different scope value per phase.

The plan records the chosen scope **value** (gate → scope value) in its `## Guardrail scopes` section of either `code-plan.md` and/or `docs-plan.md`.
