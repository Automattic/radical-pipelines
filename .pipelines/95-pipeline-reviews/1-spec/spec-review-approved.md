# Spec Review

## Verdict: approved

## Summary

This revised spec resolves all five issues from `spec-review-1-rejected.md`
cleanly and introduces no regressions. The 29 requirements (R1–R29) map 1:1 onto
the 29 consolidated requirements in `spec-research.md`, the 17 acceptance
criteria are in proper Given-When-Then form, the WHAT-not-HOW discipline is
respected, and every load-bearing codebase claim the spec depends on is verified
true against the live skill (the diff-base ref is already a `code-reviewer`
launch parameter; the prompt-format prose is inline in `manage-issues.md`; the
dangling Review hook is at `work-on-an-issue.md:34`; the assisted phase-4/5 limit
is real in `assisted-workflow.md:21-22`; the version-label trigger list, the
per-phase completion predicate, the lineage/listing/reconstruction model, and the
three merged-branch states are all as the spec describes). The revision diff is
surgical — 78 insertions / 49 deletions confined to R5, R9, R13, R20, R29 and
their acceptance criteria — so the strong remainder of the originally-praised spec
is untouched. No `[design]`-tagged decision is promoted into a requirement; in
particular the revised R28 correctly omits the `.rp.md`-edit HOW that research
flagged as design. The spec is ready for the design phase.

## Verification of the five prior issues

Each prior issue was checked against the actual revised text and the commit diff,
not merely trusted as fixed:

1. **R9 merged states (was the main rejection).** R9 now enumerates all three
   states explicitly: unmerged + branch/worktree live (canonical), merged +
   branch deleted (no review → fork from main), and **merged but branch still
   live** (MAY be reviewed, the same-branch precondition satisfiable, owner
   advised it is unusual, with the exact advisory wording left to design). AC5 is
   rewritten to cover both the deleted and the still-live sub-cases. The
   previously-silent reachable state now has defined observable behavior.
   **Resolved.**

2. **R13 "exactly ONE place".** R13 now states the de-duplication *outcome* —
   "each element of the schema, rendering rules, and authoring discipline lives in
   exactly one location … No two sites restate the same format prose" — and
   explicitly defers the one-file-vs-split granularity to the design phase ("the
   requirement is the no-duplication outcome, not a file count"). AC13 is restated
   to match ("whether that definition lives in one file or is split is not
   constrained"). The over-constraining file count is gone. **Resolved.**

3. **R29 internal step sequence.** R29 now states only the observable end states
   (the Review line is wired to a real target; selecting it produces an authored
   review prompt, a new run folder, a prior-run-tip diff base, and a run in the
   chosen mode; the procedure is distributed, not monolithic; Merge/Close remain
   present and unbroken) and explicitly defers decomposition ("How the procedure
   is decomposed across files and references is left to the design phase"). The
   ordered "authors prompt → creates folder → wires diff base → dispatches" recipe
   is removed. AC16 is trimmed to match. **Resolved.**

4. **Abandoned/empty review run.** R20 now adds the WHAT-level sentence that a
   review run folder created with only its `0-prompt/prompt.md` is the latest run
   and the pipeline's active phase is that review's phase 1 (its prompt is the
   input to phase 1, just as the base prompt is for the base run), with the
   resume-vs-delete recovery mechanism deferred to design (R21). A new AC10
   exercises exactly this state. **Resolved.**

5. **R5 wording.** R5 now phrases the requirement purely as the outcome ("listed,
   tree-reconstructed, and reviewable without being migrated or rewritten; a first
   review … is added as a `review-1-<short-description>` sibling while its existing
   flat artifacts stay in place") and moves the dual-shape-reading-vs-grandfathering
   choice into a parenthetical explicitly left to design. AC17 is rewritten to drop
   the "read as an implicit single base run" phrasing in favor of "listed and
   tree-reconstructed without error." **Resolved.**

## No regressions introduced

- The diff touches only the five targeted requirements, their acceptance
  criteria, and the consequent AC renumbering (old AC10–16 → 11–17, with the new
  AC10 inserted). The Overview, R1–R4, R6–R8, R10–R12, R14–R28, and the Out of
  Scope section are byte-unchanged from the originally-strong spec.
- No `[design]`-deferred item is promoted into a requirement. All eleven `[design]`
  tags in research remain deferred in the spec: R5 dual-shape reading, R9
  merged-but-live advisory wording, R12 origin-section name/placement, R13 file
  count, R15 cue conveyance, R16 tip-capture mechanism, R21 abandoned-run
  recovery, R22 run-metadata rendering, R25 decision-rule wording/placement, R28
  `.rp.md` trigger edit, and R29 procedure decomposition. R28 in particular states
  only the observable ("the `v<N>` version label is untouched … re-asserts … the
  same way creating, resuming, or forking asserts it") and correctly omits the
  research's design-level note about editing the `.rp.md` enumeration.
- Internal consistency holds. The new R20 prompt-only-run statement does not
  contradict R7 (completeness gate) or R18 (strict sequencing): a just-created
  review is the in-flight latest run during exactly the window R20 already names
  as where overall state and per-run completion diverge, so a second review is
  correctly blocked until it completes. The "active phase is phase 1" framing is
  the prior reviewer's own suggested wording and is anchored to the base-run
  analogy, so its intent is unambiguous for an implementer.

## Notes (non-blocking, not grounds for rejection)

- Five requirements (R3 agents run-agnostic, R4 run-is-not-a-branch/naming, R6
  single entry point, R17 both workflow modes, R25 RESUME/REVIEW/FORK rule) are
  not cited by a dedicated acceptance criterion. R4's "not a branch" half is
  exercised by AC2 ("no new branch created") and its naming pattern recurs across
  AC2/AC3/AC17; R3 is implicitly exercised by artifacts landing under the run
  folder (AC2, AC7); R6's menu surface is exercised by AC16. The remaining gaps
  (notably R17's "an assisted-only review cannot satisfy R7 for the next review
  until finished autonomously" and R25's "the decision rule is presented") are a
  representative-not-exhaustive AC suite, a characteristic that was present in the
  prior-round spec and already accepted; the requirements themselves are clearly
  and feasibly stated (R17's consequence is verified against the real assisted
  phase-4/5 limit). This is offered as a strengthening opportunity for design, not
  a defect in the spec's WHAT.
