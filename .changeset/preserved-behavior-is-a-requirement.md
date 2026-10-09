---
"@automattic/radical-pipelines": patch
---

Declare preserved behavior as a requirement: a behavior the feature keeps observably unchanged is a `spec-requirement-<n>`, and an exclusion names only an outcome the feature does not deliver. The spec reviewer's negative-space check asks for the requirement that names each behavior the feature must preserve. Exclusions were being written as preservation obligations that the design verified, yet an exclusion carries no id, so when a downstream phase could satisfy a project gate only by changing the preserved behavior, there was no clause to name in a `Contradicts-input` and the conflict stayed unraised.
