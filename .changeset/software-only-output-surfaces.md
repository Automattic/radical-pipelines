---
"@automattic/radical-pipelines": patch
---

Define host-project output — everything a task leaves outside the pipelines folder — as the scope of the software-only rule in the workers and reviewers, with the pipeline and its artifacts as the forbidden referents; have reviewers judge what text refers to rather than match words; require code to describe the software as it is, never its prior state or the change from it; make a breach of any reviewer rule a must-fix. Workers were citing the plan and narrating the diff in comments, and reviews were checking commit subjects only, then approving.
