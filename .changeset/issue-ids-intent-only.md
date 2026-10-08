---
"@automattic/radical-pipelines": patch
---

Declare intent item ids only in `intent.md`. The schema line that assigns them had lost its scope, so issues written through it carried ids, although synthesis adds the ids when it copies an issue into `intent.md`.
