---
"@automattic/radical-pipelines": minor
---

BREAKING: conventions format 3 — the pipeline's identifier is the pipeline slug, defined once in the state model and named `<pipeline slug>` everywhere; the `Branch naming` convention becomes `Pipeline slug`, and the optional `Pipeline branch format` derives the pipeline branch from the slug (default the slug itself), so lane branches and merged-pipeline branches extend the pipeline branch rather than the slug.
