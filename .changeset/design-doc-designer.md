---
"@automattic/radical-pipelines": minor
---

BREAKING: Redesign the autonomous design-doc phase. A persistent `design-doc-designer` replaces the `design-doc-analyst` + `design-doc-writer` pair: it owns `design-doc-research.md` and `design-doc.md`, records how every load-bearing claim was checked, and adjudicates review findings itself (adopt, refute with evidence, or propose as residual). The review now gates the decision record — `design-doc.md` is checked for fidelity to it — and the `design-doc-reviewer` adjudicates the record's declared chains: a compliance audit, a check-adequacy audit, re-execution of declared checks, and a negative-space sweep, logging every check it performs in the review file so re-reviews confirm resolutions instead of re-verifying everything.
