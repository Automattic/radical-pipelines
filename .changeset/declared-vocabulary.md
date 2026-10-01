---
"@automattic/radical-pipelines": patch
---

Hold every id to its vocabulary. A declaration keyed `<prefix>-<word>-<n>` whose word its class does not originate is `INVALID IDS`, which its author fixes; `rp` ignored it, so an invented id kind was neither recorded nor rejected. The spec reviewer's **Declarations** check covers requirements and acceptance criteria, and the design doc reviewer's covers decisions, each judged in the body; the plan reviewers drop it, as their labeling and task-file checks already cover assumptions and tasks. The check demanded that every item an artifact states appear in its frontmatter `ids`, so an item outside the vocabulary, such as a spec's exclusion, drew a finding no producer could resolve, and the review loop recurred.
