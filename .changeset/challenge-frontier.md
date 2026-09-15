---
"@automattic/radical-pipelines": minor
---

BREAKING: producers have two modes, Converge and Consolidate — Converge takes whatever the artifact's package holds: input changes, the closed wave's reviews, pending challenges. A pending challenge no longer jumps the frontier: it makes its target unconverged, and the phase walk reaches the target in order, with its inputs approved. `rp check` reports `converge <artifact>` in place of synthesize, re-synthesize, adjudicate, and challenge lines.
