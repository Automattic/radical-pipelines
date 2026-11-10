**Configuration to confirm** (confirm it, or tell me what to change)

The run goes through review: spec, design doc, implementation, and every review lane must approve the change.

- **spec-producer**: model `opus`, subagents `sonnet`. Production lanes:
  - `demands` (model `opus`): reads the intent for what it demands.
  - `omits` (model `sonnet`): reads the intent for what it leaves out.
  - Guardrails: none. Resources: test suite and scripts.
- **design-doc-producer**: model `opus`, subagents `sonnet`. No lanes.
  - Guardrails: none. Resources: test suite and scripts.
- **implementer**: model `fable`, as you asked for this run (the project default is `opus`), subagents `sonnet`.
  - Guardrails: tests, documentation. Resources: test suite and scripts.
- **reviewer**: review lanes, and every one must approve:
  - `default` (model `opus`, subagents `sonnet`).
  - `astra` (model `astra`, subagents `luna`).
  - Guardrails: tests, documentation. Resources: test suite and scripts.

Your direction for the run, recorded as you gave it: "Keep the pipeline branch local: do not push it."
