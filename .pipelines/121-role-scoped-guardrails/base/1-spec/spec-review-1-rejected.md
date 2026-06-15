# Spec Review — Iteration 1

## Verdict: rejected

## Summary

The spec is close: it captures the intent's goal and constraints, adopts the research record's corrections (per-iteration framing instead of the literal "once per pipeline", role selection as a partition, absent-level backward compatibility as a load rule), and its scope boundaries match the analyst decisions. It is rejected for two substantive defects — an internal contradiction in the core fail-fast requirement (R5 vs. its own first sentence and AC5), and an acceptance criterion (AC11) that is falsified by the repo's own release flow — plus one requirement/criterion misalignment (AC6 is weaker than R5).

## Issues

### Issue 1: R5 contradicts itself on whether guardrail-skipping is permitted or mandated

**Where:** spec.md, R5 (and AC5)

**What's wrong:** R5's first sentence is permissive: on an iteration with a rejection finding the reviewer "**may** reject without running any not-yet-run gate of its role selection." Its second sentence mandates the opposite of optional: "run-reviewer-guardrails-**only**-if-otherwise-approving" prohibits running guardrails at all when a rejection finding exists. These prescribe different behavior for the same situation — e.g., a reviewer that already has a judgment finding and wants to also run a cheap unscoped lint to hand the writers more findings is allowed under sentence 1 and forbidden under sentence 2. The design phase cannot tell which rule to encode in `code-reviewer.md`. AC5 compounds it by asserting the ordering mandate and the permissive skip side by side.

Additionally, "The ... ordering is load-bearing and explicit, not merely presentational" is meta-commentary about the research record, not a requirement. A spec states the rule; whether it is load-bearing follows from its being a requirement.

**Expected:** Pick one semantics and state it as a rule, aligned across R5 and AC5. Recommended (matches the intent's "may" and analyst decision 2): the reviewer performs the judgment-based checks before running its guardrail selection; once it has at least one rejection finding, it may skip any not-yet-run gate of its selection. Delete the "only-if-otherwise-approving" formulation and the "load-bearing ... not merely presentational" sentence.

### Issue 2: AC11's "the change touches only [four files]" is falsified by the release flow and by the spec's own deferrals

**Where:** spec.md, AC11

**What's wrong:** As a testable criterion, "the change touches only `reference/conventions/load.md`, `reference/conventions/setup.md`, `agents/code-writer.md`, and `agents/code-reviewer.md`" will be false at acceptance time. The research record (Q1 inventory) already notes a new changeset covers this work — this repo versions via changesets, so the pipeline adds a changeset file. The spec itself also defers a README edit to the docs phase, so "the change" is ambiguous between this spec's convention/agent edits and the pipeline's full output, which legitimately touches more files.

**Expected:** Scope the criterion to what it actually guards: the convention and agent edits are confined to the four named files, and the docs-phase files (`agents/doc-writer.md`, `agents/doc-reviewer.md`) are unchanged. Leave release artifacts (changeset) and docs-phase outputs outside the claim.

### Issue 3: AC6 tests representability; R5 mandates recording

**Where:** spec.md, AC6

**What's wrong:** R5 requires that each deliberately skipped gate **is recorded** as skipped in the Checks table. AC6 only requires that a skipped gate is "**representable** as skipped" — a criterion the deliverable could satisfy by defining a skipped value the reviewer is never obliged to use. The criterion under-tests its requirement.

**Expected:** AC6 asserts the obligation: on a rejecting iteration, the reviewer records each deliberately skipped gate of its selection as skipped in the Checks table, distinct from a pass/fail result and from absence.
