---
{
  "format": 6,
  "target-phase": 4,
  "base": "368-certification-out-of-files",
  "lanes": [
    {
      "profile": "spec-producer",
      "id": "demands",
      "brief": "Read the intent for what it demands: every outcome it asks for, and each input intended use produces that an outcome must handle."
    },
    {
      "profile": "spec-producer",
      "id": "omits",
      "brief": "Read the intent for what it leaves out: the cases, mechanisms, and guarantees it does not ask for and no intended use produces, and keep the spec to what remains."
    },
    {
      "profile": "reviewer",
      "id": "default"
    },
    {
      "profile": "reviewer",
      "id": "astra"
    }
  ]
}
---

# Run configuration

Target: run through review.

## Models

| Profile or lane | Model | Subagent model |
| --- | --- | --- |
| `spec-producer` | `claude-agent/opus#xhigh` | `claude-agent/sonnet#xhigh` |
| `spec-producer` lane `demands` | `claude-agent/opus#xhigh` | `claude-agent/sonnet#xhigh` |
| `spec-producer` lane `omits` | `claude-agent/sonnet#xhigh` | `claude-agent/sonnet#xhigh` |
| `design-doc-producer` | `claude-agent/opus#xhigh` | `claude-agent/sonnet#xhigh` |
| `implementer` | `claude-agent/opus#xhigh` | `claude-agent/sonnet#xhigh` |
| `reviewer` lane `default` | `claude-agent/opus#xhigh` | `claude-agent/sonnet#xhigh` |
| `reviewer` lane `astra` | `openai/gpt-6-astra#high` | `openai/gpt-6-luna#high` |

## Owner directions

Keep the pipeline branch local: push nothing. Open no pull request.

The base branch `368-certification-out-of-files` has no upstream: use it as it is locally, without fetching or fast-forwarding it.
