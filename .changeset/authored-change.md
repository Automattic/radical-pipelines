---
"@automattic/radical-pipelines": minor
---

BREAKING: an authored change — what a commit introduces outside the pipelines folder, a merge only its conflict resolution — is identified by its patch id and covered by the phase review whose package names every authored change after the base; task reports record the patch ids of the commits they name. Merges from the base branch cover nothing, rebases and cherry-picks preserve identities, and a change made outside any task makes the phase review stale instead of blocking completion as an unclaimed commit. `head` remains only the diff base for re-synthesis and artifact delta reviews.
