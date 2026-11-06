# Guardrails

Guardrails are the rules a project's agents must satisfy — prose a profile follows, or a check it runs.

## Format

Each rule is an entry of `.rp.md`'s frontmatter `guardrails`, by name (`../../scripts/README.md` § Conventions data):

```json
"guardrails": {
  "<name>": { "rule": "<rule>", "profiles": ["<profile>", …] }
}
```

## Obligation

The producers and the implementer satisfy every delivered rule before ending their turn; an unsatisfied rule is work to do, never a reason to skip its check or to commit while it still fails. The reviewer evaluates each delivered rule against the change and records its outcome and evidence; an unsatisfied rule is a finding.
