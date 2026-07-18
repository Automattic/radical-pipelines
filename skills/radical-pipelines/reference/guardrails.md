# Guardrails

Guardrails are the prose rules a project's agents must satisfy. A rule that rests on a command embeds it in the prose — e.g. "run `npm test` and confirm it passes."

## The `.rp.md` per-guardrail block

Each guardrail is captured at setup as a block in `.rp.md`:

```markdown
### <name>

- rule: <the prose rule, embedding any command it rests on>
- agents: <one or more agent names>
```
