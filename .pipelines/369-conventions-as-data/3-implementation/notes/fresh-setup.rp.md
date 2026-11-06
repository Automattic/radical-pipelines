---
{
  "conventions": 8,
  "commit-format": "Imperative subject line, with the profile in parentheses, for example `Add spec (spec-producer)`.",
  "guardrails": {
    "lint": {
      "rule": "Run `npm run lint` and fix every error.",
      "profiles": ["implementer", "reviewer"]
    }
  },
  "resources": {
    "database": {
      "resource": "A Postgres database per agent, named `db_{agent}`; connect with `psql db_{agent}`.",
      "profiles": ["implementer", "reviewer"]
    }
  },
  "agents": {
    "implementer": { "model": "opus", "subagents": "sonnet" },
    "reviewer": {
      "lanes": {
        "default": { "model": "opus" },
        "second": { "model": "astra", "subagents": "luna" }
      }
    }
  },
  "variables": {
    "agent": "{pipeline-slug}-{role}"
  }
}
---

## Issues

Issues live on GitHub at example/app.
