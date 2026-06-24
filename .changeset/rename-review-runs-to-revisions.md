---
"@automattic/radical-pipelines": minor
---

Rename the runs that follow a pipeline's `base` run from `review-N` to `revision-N`, and the activity that creates them from "review"/"reviewing" to "revise"/"revising", so "review" denotes the phase-auditing activity only. `base` keeps its name, and the phase-audit "review" terms (reviewer agents, `*-review-approved.md`, `*-review-N-rejected.md`) are preserved. The command file `reference/review-pipeline.md` is renamed to `reference/revision-pipeline.md` and the `Reviewer base ref` heading to `Revision base ref`. This is a going-forward convention change — existing on-disk `review-N` run folders are not migrated.
