# Resources

Resources are what a project makes available to its agents — environments, services, accounts, data, tools — and how to use them. An agent draws on them within its Execution line; what it must satisfy is a guardrail.

## Format

Each resource is a block under `.rp.md`'s `Resources` section:

```markdown
### <name>

- resource: <what it is, how to reach it, what agents may do with it>
- agents: <one or more profile names>
```
