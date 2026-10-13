---
"@automattic/radical-pipelines": patch
---

Treat a failure that passes when rerun on unchanged work as intermittent: workers record it under `## Checks` instead of working on it, and reviewers make it a must-fix only when the work under review changes what it exercises.
