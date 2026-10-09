---
"@automattic/radical-pipelines": minor
---

BREAKING: Bind downstream through declared items, which a challenge targets. Declare each spec exclusion as `spec-exclusion-<n>: <outcome the feature does not deliver>`, and have the spec and design doc reviewers report an obligation untraceable to a declared item. Exclusions were written as preservation obligations, which a requirement already states, and the design doc rested decisions and proofs on them; with no id, a downstream phase that could satisfy a project gate only by changing one had nothing to name in a `Contradicts-input`, and the conflict stayed unraised. A spec whose exclusions carry no id now draws a finding at its next review.
