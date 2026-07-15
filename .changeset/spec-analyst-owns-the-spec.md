---
"@automattic/radical-pipelines": minor
---

BREAKING: Redesign the autonomous spec phase. A persistent `spec-lead` replaces the `spec-analyst` + `spec-writer` pair: it owns `spec-research.md` and `spec.md`, grounds every consolidated requirement in the recorded Q&A and research, synthesizes the spec itself, and adjudicates review findings (adopt, refute with evidence, or propose as residual). The review now gates the requirements record — `spec.md` is checked for fidelity to it — and the `spec-reviewer` adjudicates the record's declared chains: a compliance audit with an altitude check (requirements, exclusions, and acceptance criteria state observable behavior, never code disposition), an adequacy audit, re-execution of declared checks, and a negative-space sweep, logging every check it performs in the review file so re-reviews confirm resolutions instead of re-verifying everything.
