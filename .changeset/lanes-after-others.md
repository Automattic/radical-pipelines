---
"@automattic/radical-pipelines": minor
---

A design doc production lane may come after others, and a producer may carry a consolidation brief.

A `design-doc-producer` lane declares `after`, the lanes of its profile it comes after. Their candidates are its previous candidates: required inputs of its own candidate, so `rp` wakes the lane only once they are fresh, lists them in its assignment as **Previous candidates**, and makes its candidate stale when one changes. The lane designs from a different approach than each of them and states in its Overview each previous approach and what its own changes; when every other approach it examined fails a requirement, its candidate says only that. Lanes without `after` still run in parallel from the spec alone.

Consolidating the design doc, a candidate written after others counts as one lane with each of those it agrees with, the producer chooses among differing candidates by its decision rules, and decisions taken from different candidates must form one design. `consolidation-briefs` in `config.json`, by `spec-producer` or `design-doc-producer`, gives a producer a brief its assignment carries when it consolidates, directing the choices the consolidation rules leave open.
