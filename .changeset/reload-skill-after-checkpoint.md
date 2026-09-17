---
"@automattic/radical-pipelines": minor
---

Get the skill back after opencode's context compaction. The plugin records, from each model request, the skill activation and the skill and convention files a session read; a request that no longer carries the activation is continuing from a checkpoint, and the session is told to load the skill again, read those files again, and recompute state before anything else. The checkpoint summary request is asked for a `## Pipeline run` section. `rp_status` lists the sessions under `skillReloads`.
