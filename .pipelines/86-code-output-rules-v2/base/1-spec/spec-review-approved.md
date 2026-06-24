# Spec Review

## Verdict: approved

## Summary

The spec is complete, internally consistent, testable, and faithful to the intent and the consolidated requirements. It promotes the two output rules into always-on tool behavior, scopes them precisely to host-project product (vs. pipeline artifacts), and grounds enforcement in the existing reviewer gate. Every factual premise the spec rests on was verified against current trunk: the lone pre-existing narrow statement at `agents/code-writer-tdd.md:33`, the absence of any merged v1 `output-rules.md`, the three product-writing agents and two reviewers, the `.rp.md` commit-format tag applied to every commit, and the phase-completion predicates requiring `*-review-approved.md` plus `*-summary.md` (both written only by the reviewer on approval). The single reversible scope decision (commit-message coverage, Requirements 7–9, with its coupled provenance-tag reconciliation) is consciously included, justified, and cleanly carved out — surfaced as a decision rather than smuggled in as an assumption. Acceptance criteria are in Given-When-Then form and specific enough that two test authors would build the same tests. The spec holds altitude at WHAT, explicitly deferring the enforcement mechanism's internals to the design phase.

## Notes (non-blocking)

These are observations, not defects; no action is required.

- **Requirement 11 / its AC name "the code writer's profile."** Naming an existing implementation surface here is appropriate and necessary for testability — the requirement is that no overlapping version of Rule 2 survives, and pointing at the artifact that must not survive is the WHAT, not the HOW. The exact string and its single location (`agents/code-writer-tdd.md:33`) were verified on trunk, so a test author can resolve it unambiguously.
- **Requirement 7's "regardless of how the pipeline's artifacts are stored"** abstracts away the concrete `artifacts-in-repo` / `artifacts-in-fork` modes named in the consolidated requirement. The abstraction is faithful and keeps the spec format-agnostic; the matching AC ("regardless of the artifact storage mode") stays testable.
- **The product/artifact commit boundary (Requirement 8)** is defined purely by file path ("none of its changed paths are under the pipeline's artifacts folder"). This is mechanically checkable, and trunk confirms the boundary is clean in practice (producing-phase writers commit only product; artifact files are committed separately by other agents and by reviewer approval commits), so no mixed product+artifact commit arises to stress the rule.
- **The "this run" referent test** is consistent throughout and resolves the same way for base runs and review runs: a reference identifying any concrete RP pipeline instance/process/artifact that produced the product is a violation; mere vocabulary is not. No ambiguity for fixture authors.
