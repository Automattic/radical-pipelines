---
"@automattic/radical-pipelines": minor
---

Give the multilane consolidator the lead pattern. The `spec-consolidator` and `design-doc-consolidator` are now persistent through the consolidation review loop: they answer for the consolidated artifacts, back every judgment of their own with a check, adjudicate the final review's findings (adopt, refute with evidence, or propose as residual), and can request a researcher scoped to verification and adjudication — a decision no lane made stays a blocker. Consolidators also read the lanes' review files as merge signal and record per-decision lane provenance in the consolidated record. The final reviewer reuses lane verification for what the consolidated record inherits unchanged, concentrating fresh checks on what the consolidation introduces.
