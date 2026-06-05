# Code plan review — APPROVED

**Pipeline:** 68-recommend-standard-remote-names
**Artifact reviewed:** `3-plan/code-plan.md`
**Reference inputs:** `2-design-doc/design-doc.md`, `1-spec/spec.md`
**Target deliverable:** `skills/radical-pipelines/reference/conventions/setup.md` (single-file documentation/instruction change)
**Iteration:** 1 (first review)
**Verdict:** APPROVED

## Summary

The plan is a faithful, well-fenced execution of the design doc against the real `setup.md`. Every cited line number and exact-wording anchor was verified against the on-disk file and matches. All acceptance criteria, all design decisions, and all edge cases are covered, each with observable per-task acceptance. Ordering and dependencies are correct, granularity is appropriate, and scope is tightly contained to the single file with explicit fences. No hidden design decisions, no test-planning, no separate-documentation tasks, no scope creep.

## Feasibility verification against the real `setup.md`

All anchors confirmed verbatim:

- Line 112 begins the `artifacts-in-fork` block (`**If no** ...`). Lines 112–123 fork-mode explanation block; line 121 = "Pushes the clean branch directly to `upstream`." — confirmed, role-based, must stay unedited per R5.
- Line 127 = `**Identify the remotes.** Run \`git remote -v\` ...`.
- Line 129 = the 2-remote bullet containing the exact sentence "By GitHub convention `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm." (Task 1 removal anchor).
- Lines 130–134 create-fork sub-path; line 134 = "Wait for confirmation, then re-run `git remote -v` and confirm the assignment."
- Line 135 = blank seam (Task 2 insertion point).
- Line 136 = `**Define the upstream PR transformation.**`; body through line 146.
- Lines 148–155 Capture block: `Capture:` (148), `mode` (150), fork-keyed bullets `upstream`/`fork`/branch/commit (151–155).
- `gh repo fork` at line 132 is illustrative (`e.g. via`), confirming the plan's altitude convention. `gh repo view` does not yet appear (introduced by Task 2).

Notable correctness: the spec/AC8/R9 quote the old hint as "By default `origin` is usually...", but the file actually reads "By GitHub convention `origin` is usually...". The plan uses the real on-disk wording for the Task 1 removal anchor and has Task 4 check for BOTH phrasings. This correctly handles a spec-vs-file drift that would otherwise cause a failed exact-string edit.

## Coverage

- **Acceptance criteria:** AC1–AC3, AC5–AC7 → Task 2; AC4 → Task 3; AC8 → Tasks 1 & 4; AC9 → Task 4. All covered with observable per-task acceptance.
- **Design decisions:** D-INSERT, D-FLOW, D-WORDING, D-AUTO, D-RENAME, D-E7 → Task 2; D-THIN → Task 1; D-CAPTURE → Task 3; D-SCOPE → Tasks 0–4 fences. All covered.
- **Edge cases:** E1 (no-op State A), E2 (inverted State-B swap), E3 (both non-standard, general rule degenerates — no per-edge prose), E6 (auto-detect inconclusive), E7 (reactive refspec caveat) → Task 2; E4 (declined worked example) → Task 3; E5 (single remote/create-fork) → correctly handled by the untouched create-fork path falling through to the shared step, with no new task needed. All covered.

## Ordering and dependencies

Task 0 (read) precedes all edits. Task 2 inserts at line 135 and shifts later lines; Task 3 and Task 4 declare line numbers as pre-edit anchors and re-locate by quoted text, so the insertion does not invalidate later anchors. Task 4 verifies the aggregate state last. Ordering is sound.

## Granularity and scope

Task 2's nine ordered items are content requirements for a single contiguous insertion at one location, not separable edits — splitting would fragment one block. No hidden design decisions: the wording contract, no-op-over-roles, the six fallback cases, the State-B literal instance, and the E7 reactive framing are all pre-settled in the design doc and merely restated. No task touches line 121, lines 112–123, 130–134, 136–146, `artifacts-in-repo`, `.rp.md`, agent definitions, `CONTRIBUTING.md`, `pi.md`, or `pipeline-versioning.md`. The fork-push consumer in Task 3 is described generically with no `.rp.md` cross-reference. Containment matches O1/O3/O4 and D-SCOPE.

## Minor notes (non-blocking)

- Task 3 delegates the exact placement of the authority statement relative to the Capture bullets to the writer (format-light prose). This latitude is inherited from the design doc ("adjacent authority statement", format-light) and is not a smuggled design decision; the acceptance criteria check the statement's content and presence, which remain observable.
- The plan and design use "lines 148–155" for the Capture block content (line 156 is blank); the spec's "148–156" includes the trailing blank line. Cosmetic; the plan's content anchors are accurate.

The plan is ready for implementation.
