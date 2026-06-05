# Spec Review

## Verdict: approved

## Summary

This is a strong, well-grounded spec. Every one of the eleven consolidated
requirements maps cleanly onto a numbered requirement (R1-R11) with a matching
Given-When-Then acceptance criterion (AC1-AC11), and the four out-of-scope items
(consolidated 12-15) are all captured explicitly. I spot-checked every load-bearing
claim against the actual codebase and found no inaccuracy: the dangling
`setup.md:122` reference, the phase-5 completion predicate table in
`pipeline-versioning.md`, the per-phase "Produces" table in `SKILL.md`, the Outputs
list in `autonomous-phases/5 - docs.md`, and the assisted-workflow phase cap
(`assisted-workflow.md` marks phases 4 and 5 "Can't be run in assisted workflow")
all exist and behave as the spec describes. The spec holds WHAT-not-HOW discipline:
it defers producing/reviewing agent mechanics and ordering to the design phase,
keeps the producer-runs-after-doc-writers ordering implicit (R6), and does not
name a producing agent, a second terminator, or any merge procedure. The risks the
research surfaced — the orphan `setup.md:122` reference (R10), the mode-asymmetry of
that reference, the two-file phase-5 predicate (R7), the summarize-the-docs-too
ordering (R6), and the assisted-mode gap (Out of Scope) — are each consciously
addressed. The internal consistency holds where it is most likely to fail: R3's
"self-contained" carve-out (meaning/usability, not "no links at all") is reconciled
with R4's permitted issue link, so the two do not contradict.

## Issues

None. The probes below are recorded so the design phase inherits the reasoning, not
because any is a defect.

- **Two-file phase-5 predicate (R7) is feasible with precedent, not a novel shape.**
  The research's design note frames "two required files in a phase predicate" as a
  deliberate deviation, but phase 3 already requires two
  (`code-plan-review-approved.md` and `doc-plan-review-approved.md` in the
  `pipeline-versioning.md` table). The spec itself does not overclaim novelty — R7
  only states the predicate "additionally requires the artifact" — so there is
  nothing to correct; the design phase simply has clean precedent to follow.

- **Production is mode-independent by construction.** The research (Q6) asked the
  spec to decide whether the artifact is produced uniformly across
  `artifacts-in-repo` and `artifacts-in-fork`. The spec answers this implicitly but
  unambiguously: R1 gates production on phase 5 completing ("After the Docs phase
  (phase 5) completes for a pipeline"), and phase 5 is the same phase in both
  storage modes, so the artifact is always produced regardless of mode. The Out of
  Scope section excludes only a new `artifacts-in-repo` PR-*opening* flow (the
  consumer), never the artifact's production. No clarification is required.

- **R5/AC4's drift-resistant contract is appropriately WHAT-level, not
  under-specified.** Declining to mandate fixed section names mirrors how the
  pipeline's doc/verification/commit conventions are already discovered from the
  host project at run time (confirmed in Q4 against `doc-writer`, `code-writer`,
  `doc-plan-writer`). It remains testable as an observable outcome (follows host
  template, else observed conventions, else generic body) without leaking HOW.

- **R3/AC2's "no fork-relative paths the published PR viewer cannot resolve" is a
  correctness property, not a HOW leak.** It is an observable attribute of the
  artifact mandated directly by the fork-mode constraint (`setup.md:119,123`: the
  upstream PR never sees the fork's artifacts), so it belongs in the spec.
