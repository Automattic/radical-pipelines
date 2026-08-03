---
"@automattic/radical-pipelines": minor
---

Migrate the opencode plugin to the current plugin API tool contract and advance the pinned build to `0.0.0-next-16573`. Tool descriptors now declare `input` rather than `jsonSchema` and an output schema, and results are returned as `{output, content}` with `output` round-tripped through JSON so a session record's absent fields cannot fail opencode's output validation. Owners must move to the newly pinned opencode build: the previous pin's contract and this one are mutually incompatible, so the plugin's tools return no result on builds older than the new pin.
