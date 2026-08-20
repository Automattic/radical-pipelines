# Guardrails

Guardrails are the prose rules a project's agents must satisfy — e.g. "run `npm test` and confirm it passes."

## The `.rp.md` per-guardrail block

Each guardrail is captured at setup as a block in `.rp.md`:

```markdown
### <name>

- rule: <the prose rule>
- agents: <one or more agent names>
```
