---
"@automattic/radical-pipelines": minor
---

BREAKING: producers use Converge and Consolidate. The phase walk selects `converge <artifact>` for missing or stale artifacts, pending challenges, and rejected closed waves. Artifact reports expose Input changes, Review lanes, Corrections, and Task reports as convergence materials. Pending claims on the intent select owner escalation; other challenges follow phase order without a separate priority or claim-suspension rule. Task selection uses completion and dependencies; fresh unadjudicated failures are handled by plan convergence.
