---
{
  "conventions": 8,
  "commit-format": [
    "Imperative mood, sentence case. End with the profile name in parentheses.",
    "",
    "Example: `Add spec (spec-producer)`"
  ],
  "guardrails": {
    "tests": {
      "rule": "Run `npm test` and confirm it passes.",
      "profiles": ["implementer", "reviewer"]
    }
  },
  "resources": {
    "staging environment": {
      "resource": "Each agent has its own staging environment `{agent}`, at `https://{agent}.staging.example.com`. Start it with `npm run env:start {agent}` and reset it with `npm run env:reset {agent}`.",
      "profiles": ["implementer", "reviewer"]
    }
  },
  "agents": {
    "spec-producer": {
      "model": "opus",
      "subagents": "sonnet",
      "lanes": {
        "demands": {
          "brief": "Read the intent for what it demands.",
          "model": "opus"
        },
        "omits": {
          "brief": "Read the intent for what it leaves out.",
          "model": "sonnet"
        }
      }
    },
    "implementer": {
      "model": "opus",
      "subagents": "sonnet"
    },
    "reviewer": {
      "lanes": {
        "default": { "model": "opus", "subagents": "sonnet" },
        "second": { "model": "astra", "subagents": "luna" }
      }
    }
  },
  "variables": {
    "agent": "{pipeline-slug}-{role}"
  }
}
---

# Shop project conventions
