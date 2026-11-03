---
"@automattic/radical-pipelines": minor
---

Record a failure observed outside the run — a command the owner ran, CI, a bug — as later input of its own kind, `0-intent/failure-<n>.md`, instead of forcing it into a constraint or a proposal. A reported failure carries no ruling, so the orchestrator records it as given, with its evidence saved beside it, and asks the owner nothing about it. Like a failed task report, it is a failure: while it is unresolved on an artifact, or in the `origin` chain of a challenge on it, `rp check` puts that artifact under experiment. The producer then attempts to reproduce it and compares the candidate causes before adopting or refuting it, and its reviewers check that the disposition rests on what was observed. A reported failure never answers an owner claim, and no claim can target it. `rp metrics` counts it as later input.
