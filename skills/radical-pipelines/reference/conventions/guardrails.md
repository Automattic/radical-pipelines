# Guardrails

Guardrails are the rules a project's agents must satisfy — prose a profile follows, or a check it runs.

## Format

Each rule is a block under `.rp.md`'s `Guardrails` section:

```markdown
### <name>

- rule: <rule>
- agents: <one or more profile names>
```

## Obligation

Producers and workers satisfy every delivered rule before completing; an unsatisfied rule is work, never a reason to bypass its check or to commit around a failure. Reviewers evaluate each delivered rule against the work and log its outcome and evidence in the review; an unsatisfied rule is a finding.
