---
{
  "format": 7,
  "target-phase": 1,
  "base": "v4",
  "agents": {
    "spec-producer": {
      "model": "opus",
      "subagents": "sonnet",
      "lanes": {
        "demands": {
          "brief": "Read the intent for what it demands: every outcome it asks for, and each input intended use produces that an outcome must handle.",
          "model": "opus"
        },
        "omits": {
          "brief": "Read the intent for what it leaves out: the cases, mechanisms, and guarantees it does not ask for and no intended use produces, and keep the spec to what remains.",
          "model": "sonnet"
        }
      }
    },
    "design-doc-producer": {
      "model": "opus",
      "subagents": "sonnet"
    },
    "implementer": {
      "model": "opus",
      "subagents": "sonnet"
    },
    "reviewer": {
      "lanes": {
        "default": {
          "model": "opus",
          "subagents": "sonnet"
        },
        "astra": {
          "model": "astra",
          "subagents": "luna"
        }
      }
    }
  }
}
---

# Run configuration

Target: the spec. The run stops after phase 1 (the spec) and waits for the owner's review.

Owner directions:

- `v4` stands in for the artifact base branch: the pipeline branch starts at the tip of `v4`.
- Keep the pipeline branch local: do not push it, and open no pull request.
