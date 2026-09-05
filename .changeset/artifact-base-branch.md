---
"@automattic/radical-pipelines": minor
---

BREAKING: `rp check` takes `--base <ref>`, the artifact base branch, and computes a pipeline's own commits — those a task report must claim — from its merge-base with the inspected ref, the same with or without `--ref`; the branch the intent `starts-from` prevails when it declares one. No branch name is assumed: a base that does not resolve is an error, never completion. The `Artifact storage` convention returns (optional; `artifacts-in-repo` by default, `artifacts-in-fork` with its remotes and the upstream PR transformation) and now carries the artifact base branch — the repository's main branch, or the fork's base branch, declared.
