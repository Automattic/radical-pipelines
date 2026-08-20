# Guardrails

Guardrails are the rules a project's agents must satisfy — e.g. "run `npm test` and confirm it passes."

## The `.rp.md` per-guardrail block

Each guardrail is captured at setup as a block in `.rp.md`:

```markdown
### <name>

- rule: <the rule>
- agents: <one or more agent names>
```
