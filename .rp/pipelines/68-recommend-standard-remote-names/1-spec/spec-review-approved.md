# Spec review — APPROVED

**Spec:** `1-spec/spec.md` — "Recommend standard remote names when setting up artifacts-in-fork mode"
**Reviewer:** spec-reviewer
**Iteration:** 1
**Verdict:** APPROVED

## Summary

The spec is complete, internally consistent, faithful to the consolidated research, feasible against the actual codebase, and correctly scoped as a documentation/instruction change to a single shipped reference file. It stays at the level of WHAT (observable behavior the produced `setup.md` must instruct) rather than HOW (the exact prose of the edit). Acceptance criteria are written as testable Given-When-Then assertions checkable against the produced document and diff, and each traces to a requirement. I recommend proceeding to the design phase.

## Verification performed

- **Target document confirmed.** Read `skills/radical-pipelines/reference/conventions/setup.md`. The spec's cited locations are accurate: the "Identify the remotes" block is at lines 127-134, the soft naming hint is at line 129, the create-fork sub-branch is at lines 130-134, and the "Capture" block is at lines 148-156. The capture fields key by role (`upstream`, `fork`) with "name and URL" each, exactly as the spec describes.
- **Role abstraction confirmed (R5/R9 premise).** `.rp.md:34` references "push the pipeline branch to the remote" (role-neutral); `setup.md:121` is the one operational push to `upstream` (role). This repo's own `.rp.md` is `artifacts-in-repo` (records no remotes), confirming the spec's claim that fork-mode logic lives only in the shipped reference and that no live worked example exists here. No hardcoded remote literals exist in the pipeline logic that would break on non-standard names — supporting Out-of-Scope O1.
- **Auto-detection feasibility confirmed (R6).** Ran `gh repo view Automattic/radical-pipelines --json isFork,parent,nameWithOwner` → exit 0 with `isFork:false`, `parent:null`, top-level `nameWithOwner`. This matches the research's field shapes; composing the parent identity from `parent.owner.login` + `parent.name` is consistent with `parent` being an object (or null) and `nameWithOwner` existing only at top level. The auto-detect-then-fallback design is technically feasible.
- **First-iteration confirmed.** No prior `spec-review-*-rejected.md` files exist.

## Dimension-by-dimension assessment

- **Completeness.** All nine consolidated research requirements are present (the spec reorders them — research's "name authoritative" R9 becomes spec R5, pulling it adjacent to R4's "record the names," which improves flow — with no requirement dropped or conflated). All seven edge cases (E1-E7) and all five out-of-scope items (O1-O5) carry over. The research's non-blocking "worked example" observation is correctly left out of mandatory scope.
- **Clarity.** Requirements are unambiguous and individually scoped. Terminology (ROLE vs. resolved `name`, fork vs. canonical/upstream) is used consistently throughout.
- **Feasibility.** Verified above: the target file and line ranges exist, the `gh` fields exist, and the role abstraction the spec leans on is real. The two-rename swap ordering (R7) reflects real git behavior (collision errors at exit 3).
- **Consistency.** No contradictions between requirements, edge cases, ACs, and Out of Scope. The retained create-fork branch (E5) lives inside `setup.md`, so it does not conflict with AC9's "only `setup.md` modified."
- **Acceptance criteria.** AC1-AC9 are Given-When-Then and checkable against the produced document/diff; each maps to one or more requirements. AC9 is a verifiable scope-containment check against the diff. The edge-case list (E1-E7) forms an additional acceptance surface the document "must account for."
- **Scope.** Explicit, well-bounded Out of Scope (O1-O5). The spec correctly distinguishes its in-scope edit from the pre-existing upstream-write-access gap (O2) and `CONTRIBUTING.md`'s maintainer literals (O3), and leaves `artifacts-in-repo` untouched (O4).

## Non-blocking notes for the design phase (not rejection reasons)

These are refinements the design phase may wish to resolve; none is a spec defect.

1. **Placement of the recommend step across both role-identification paths.** R1 attaches the recommendation "after identifying which configured remote plays which role," and E5 notes a manually-added fork "may land inverted and gets the recommendation." The design should make crisp that the recommend-and-(optionally-)rename flow runs after role identification in BOTH the existing 2-remote path (line 129) and the create-fork path (lines 130-134 converge at "confirm the assignment"), so a State-B result from a manual post-fork add is also caught. The spec's intent is clear; only the exact insertion point in the document is left to design.
2. **E7 has no dedicated AC.** The benign non-default-refspec warning (E7) is listed among edge cases the document "must account for" but is not pinned to a specific AC (AC6 covers only the collision-error ordering). It remains checkable via the edge-case list, but design may choose to surface it explicitly.
3. **R6 names a specific `gh` invocation and compose algorithm.** This reads as illustrative of the observable behavior (gh-based fork/parent detection with fallback) rather than a mandated implementation, and AC5 stays at the correct altitude. Flagged only so the design phase treats the exact command as guidance, not a literal contract.

## Conclusion

The spec is ready. It is approved for the design phase.
