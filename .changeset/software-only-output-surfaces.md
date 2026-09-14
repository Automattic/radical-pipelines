---
"@automattic/radical-pipelines": patch
---

Scope the software-only rule to everything a task changes outside the pipelines folder and the commits recording it, in the workers and reviewers, with the pipeline and its artifacts as the forbidden referents; have reviewers judge what text refers to rather than match words; require code to describe the software as it is, never its prior state or the change from it; make committed work that breaks a rule under **Rules** a must-fix. Workers were citing the plan and narrating the diff in comments, and reviews were checking commit subjects only, then approving.
