---
"@automattic/radical-pipelines": minor
---

BREAKING: name the pipeline's identifier the pipeline slug — `<pipeline slug>` throughout the skill — and derive the pipeline branch from it through the new optional `Pipeline branch format` convention (default the slug itself), with lane and merged-pipeline branches extending the pipeline branch; conventions format 3 renames `Branch naming` to `Pipeline slug`; `rp check` rejects a pipeline folder whose name is not a valid git ref
