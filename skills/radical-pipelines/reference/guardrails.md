# Guardrails

A guardrail is a prose rule an agent must satisfy.

## Guardrail kinds

A guardrail is one of two kinds:

- **command guardrail** — its body tells the agent to run a command and confirm the check it describes is satisfied.
  - **Fixed** — the command is run as-is.
  - **Scoped** — the command contains a `{scope}` placeholder filled per pipeline.
  - Fixed/scoped is a property of command guardrails only; a judgment guardrail is neither.
- **judgment guardrail** — a prose rule the named agent satisfies by its own assessment, with no command to run.

## The `.rp.md` per-guardrail block

Each guardrail is captured at setup as a block in `.rp.md`:

```markdown
### <name>

- rule: <the rule; for a command guardrail, embeds the command, with {scope} if scoped>
- agents: <one or more of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
- fill-guidance: <optional; scoped command guardrails only>
```

`fill-guidance` is an optional owner-authored note telling the planning agent how to choose `{scope}`. Absent, the planning agent chooses `{scope}` from the spec and design.

A judgment guardrail's block is name + `rule` + `agents`, omitting the `{scope}` placeholder — which lives only inside a command — and `fill-guidance`, the way a fixed command guardrail already omits `fill-guidance`.

## The fill lifecycle

A scoped command guardrail's `{scope}` is chosen per pipeline by the planning agent of the phase whose agents run the guardrail — code-run guardrails by the code plan, doc-run guardrails by the doc plan.

A scoped command guardrail whose agents span both phases is filled by each phase's plan independently — each fills `{scope}` for its own agents — so the guardrail may carry a different scope value per phase.

The plan records the chosen scope **value** (guardrail → scope value) in its `## Guardrail scopes` section of either `code-plan.md` and/or `doc-plan.md`.
