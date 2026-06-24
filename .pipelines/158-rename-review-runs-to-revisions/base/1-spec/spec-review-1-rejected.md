# Spec Review

## Verdict: rejected

## Summary

The spec is well-structured, scopes the three owner-confirmation decisions coherently, and keeps a clear WHAT-not-HOW altitude. Its global requirements (req 3) and global acceptance criteria are strong safety nets. However, it inherits two factual errors from the research that make its consistency-of-references requirement (req 8) and one acceptance criterion provably wrong: the renamed `**Reviewer base ref**` heading has four inbound references, not the two the spec names, so following the spec literally would leave two dangling references. A second, softer gap is an in-scope run-creation token (the `"review this pipeline"` direct-route phrase) that the spec's enumerated requirements never address, leaving its target wording unspecified. Both should be fixed before approval. Verifying every reference count the spec asserts against the codebase is the core correctness obligation of a rename spec, and here it does not hold.

## Issues

### Issue 1: The `Reviewer base ref` heading has four inbound references, but the spec claims only two

**What's wrong:** Requirement 8 renames the `### Reviewer base ref` heading to `### Revision base ref` and asserts that the references to it must update "in lockstep." The supporting research (Q3 section D) names exactly two inbound references: `review-pipeline.md:29` and `autonomous-workflow.md:39`. This is wrong. The heading is referenced by name in **four** places:

- `skills/radical-pipelines/reference/review-pipeline.md:29` — "per the **Reviewer base ref** rule"
- `skills/radical-pipelines/reference/autonomous-workflow.md:39` — "per the **Reviewer base ref** rule"
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md:37` — "see the **Reviewer base ref** rule in `pipeline-versioning.md`"
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:37` — "see the **Reviewer base ref** rule in `pipeline-versioning.md`"

The two phase-file references (`4 - code.md` and `5 - docs.md`) are absent from the spec's surface-area map and from the research's reference inventory. An implementer who trusts the stated count of two would rename the heading and leave the references in `4 - code.md:37` and `5 - docs.md:37` pointing at a heading that no longer exists.

**Where in spec:** Requirement 8 ("Consistency of references and conventions"); the matching acceptance criterion ("Given the base-ref convention … every reference that previously pointed to the old heading resolves to it"); and the "In scope" surface-area inventory of the linked spec-research (which lists only `autonomous-workflow.md:39` as the base-ref heading inbound reference besides `review-pipeline.md`).

**Suggestion:** Correct the spec (and the research inventory it cites) to reflect all four inbound references to the heading. Either enumerate all four, or — preferably for a WHAT-level spec — state the requirement purely as an invariant ("every reference to the renamed base-ref heading, wherever it occurs, resolves to it after the change") without asserting a specific count, so the requirement cannot be falsified by an undercount.

**Why it matters:** This is a concrete correctness defect, not a stylistic nit. The spec's stated count directly contradicts the codebase, and a faithful implementation of req 8 as written produces two broken cross-references. A rename spec's central job is to get the reference graph right.

### Issue 2: The `"review this pipeline"` direct-route phrase is an in-scope run-creation token with no specified target

**What's wrong:** `review-pipeline.md:9` names the direct invocation route to the run-creation command as `the direct "review this pipeline" route`. This is a run-creation concept named "review" — the named entry route to the command being renamed — and is therefore in scope under requirement 3 ("no run or run-creation concept is named 'review' anywhere in `skills/`"). The research's Q1 even cites this exact phrase as an in-scope token. Yet none of the spec's enumerated requirements (the title in req 6, the menu label/advisory in req 7, the heading/term in req 8, the intent type in req 4) addresses it, and the spec gives no target wording. It survives only by the catch-all global requirement/criterion, which tells the implementer *that* it must change but not *what to*.

**Where in spec:** Requirement 6 (the run-creation command document) addresses the title and filename but not the route phrase; requirements 3 and the global acceptance criterion ("every remaining occurrence refers to the phase-auditing reviewing activity") are the only things that reach it, and they specify no target.

**Why it matters:** The spec is otherwise meticulous about naming each concrete target token (title, label, advisory, heading, run term, intent type). Leaving this one to be inferred from the global rule is an inconsistency in coverage, and the absence of a target token ("revise this pipeline"?) means two implementers could rename it differently or one could miss it. For a vocabulary spec whose whole value is an unambiguous token map, this gap is worth closing explicitly.

### Issue 3: The "complete set" claim is not actually established, undermining the no-residue acceptance criterion's verifiability

**What's wrong:** The spec leans on a global acceptance criterion ("when the word 'review' is located, then every remaining occurrence refers to the phase-auditing reviewing activity") as its completeness guarantee. That criterion is sound, but the spec presents its requirements as if they already enumerate the full in-scope set, while in fact the set is under-counted (Issues 1 and 2). The result is a spec that asserts completeness it has not demonstrated: a reader cannot tell whether the enumerated requirements are exhaustive or merely illustrative, because two known in-scope occurrences fall outside them.

**Where in spec:** Interaction between the "Vocabulary of the run-creation activity" / "Consistency of references" requirements (which read as exhaustive) and the final global acceptance criterion (which reads as a backstop).

**Suggestion:** State explicitly which requirements are exhaustive token lists versus which are invariant-style backstops. If the per-token requirements are meant to be illustrative, say so and lean on the invariant; if they are meant to be exhaustive, they must actually be complete (fix Issues 1 and 2). Right now they are presented as exhaustive but are not, which is the root inconsistency behind both concrete misses.

**Why it matters:** Acceptance criteria must be specific enough to test from. A criterion that depends on an enumerated set being complete is only as trustworthy as that set; once the set is shown to be incomplete, downstream agents cannot rely on the per-token requirements alone and must independently re-derive the full occurrence list — which is exactly the work the spec was supposed to settle.
