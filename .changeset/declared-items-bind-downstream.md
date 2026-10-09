---
"@automattic/radical-pipelines": minor
---

An artifact binds downstream through its declared items, which a challenge targets. The spec declares each exclusion as `spec-exclusion-<n>: <outcome the feature does not deliver>`; the spec and design doc reviewers' **Declarations** check reports an obligation stated outside a declared item. Specs were writing exclusions as preservation obligations, which a requirement already states, and the design doc rested decisions and proofs on them; an exclusion carried no id, so when a downstream phase could satisfy a project gate only by changing one, no `Contradicts-input` could name it and the conflict stayed unraised.
