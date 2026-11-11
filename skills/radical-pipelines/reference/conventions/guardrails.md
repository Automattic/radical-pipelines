# Guardrails

Guardrails are the rules a project's roles must satisfy — prose a profile follows, or a check it runs.

## Format

Each rule is an entry of the Guardrails section (`load.md` § Conventions): a heading naming it, its `profiles` field listing the profiles it binds, and its rule as its text.

```markdown
### Guardrails

#### tests

- profiles: implementer, reviewer

Run `npm test` and confirm it passes.
```

## Obligation

The producers and the implementer satisfy every delivered rule before ending their turn; an unsatisfied rule is work to do, never a reason to skip its check or to commit while it still fails. The reviewer evaluates each delivered rule against the change and records its outcome and evidence; an unsatisfied rule is a finding.
