# Spec Review

## Verdict: approved

## Summary

The revised spec resolves all three issues from `spec-review-1-rejected.md` and introduces no new defects. The previously-defective base-ref-heading requirement is now a count-free invariant ("every reference to the renamed base-ref heading, wherever it occurs, resolves to the heading after the change ... rather than rely on any stated count"), which correctly catches all four real inbound references (`autonomous-workflow.md:39`, `review-pipeline.md:29`, `autonomous-phases/4 - code.md:37`, `autonomous-phases/5 - docs.md:37`) without asserting any falsifiable number. The `"review this pipeline"` direct-route phrase is now an explicit named-token requirement (req 7) with the target `"revise this pipeline"` and a matching acceptance criterion. The new "How to read these requirements" section cleanly separates exhaustive invariants (reqs 3, 11, 12 plus the global acceptance criteria) from illustrative named-token targets (reqs 1, 2, 4-10), settling the classification ambiguity that drove the prior Issue 3. Every factual claim in the spec was verified against the codebase and holds. The spec stays at WHAT altitude — it names target tokens and scope boundaries but deliberately avoids pinning implementation-level filenames, line numbers, or occurrence counts. The three owner-confirmation decisions (activity-and-command rename, no-migration/no-dual-recognition with the stated miscount consequence, and "revision run" disambiguation over bare "revision") are each coherent and unambiguous.

## Issues

None.
