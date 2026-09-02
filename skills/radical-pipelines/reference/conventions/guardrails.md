# Guardrails

## Format

Each rule is a block under `.rp.md`'s `Guardrails` section:

```markdown
### <name>

- rule: <rule>
- agents: <one or more profile names>
```

## Delivery

For each dispatch, filter the blocks to those whose `agents` include the profile. Put their names and rules in the prompt template's **Guardrails** slot.

Producers and workers satisfy every delivered rule before completing. Reviewers evaluate each delivered rule against the work and log its outcome and evidence in the review.
