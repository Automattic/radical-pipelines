# Design Doc Review

## Verdict: rejected

## Summary

The prior rejection (off-by-one count inconsistency) is genuinely fixed: the headline totals
now verify against a live grep — 252 `review` lines, 32 `revis` lines, agents/ = 105, the five
named files carry exactly 15/20/2/2/10 review-lines, bucket A = 36 = 9+20+2+2+3, bucket B = 216,
and the two artifacts agree. The line identities, the four base-ref inbound sites, the single
in-scope filename reference, and the single route phrase all match the tree. The token map is
otherwise faithful and the keep/rename classifications are correct at the line level. However,
fixing the arithmetic surfaced a deeper structural inconsistency that the counts now make
provable: the design's central "closed set of 5 files / 36 lines" framing does not actually cover
the full bucket-A rename surface. Three required base-ref renames live in files outside the 5 and
on lines counted inside the "216 keep / unchanged" bucket, so the "binding completeness artifact"
(the 36-line map) and the bucket-B "Unchanged" claim contradict the design's own base-ref
decision. The Failure Modes verification is wired to the wrong count and would miss a dangling
reference that violates the req-9 invariant. Two implementers could diverge on whether
`autonomous-workflow.md:39` is in scope. This is the same class of defect as the prior rejection
(scope/count inconsistency on the completeness artifact), one level deeper.

## Issues

### Issue 1: The "5 files / 36 lines, everything else out of scope" framing excludes 3 required bucket-A base-ref renames

**What's wrong:** The design repeatedly frames bucket A as a closed set of exactly **5 files /
36 lines** and calls the 36-line map "the binding completeness artifact":

- Line 27: "Bucket A — rename: **36 lines across exactly 5 files**."
- Line 44: "the rename surface is a **closed set of 5 files / 36 lines; everything else is
  provably out of scope**."
- Line 197: "Edit the **closed 36-line / 5-file map** line by line."

But the design's own base-ref decision (lines 71-79, 127-133, 220-230) requires renaming the
`**Reviewer base ref**` substring in **three additional files** that are NOT among the 5 and whose
edits are NOT in the 36-line map:

- `skills/radical-pipelines/reference/autonomous-workflow.md:39`
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md:37`
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:37`

(The 4th inbound site, `review-pipeline.md:29`, is inside one of the 5 files and is covered by its
20 lines; only these 3 are extra.) These 3 lines are in `skills/`, counted in the global 252, not
in the 36-line map — so by the design's own arithmetic (bucket B = 252 - 36 = 216) they sit
**inside the 216 "keep / Unchanged" bucket** (line 30: "Bucket B — keep ... 216 lines ...
Unchanged"). Verified against the live tree: `autonomous-workflow.md:39` carries **only** the
`Reviewer base ref` token (no phase-audit keep token on the line), so it is a pure bucket-A
rename line that the buckets misclassify as keep. The true bucket-A modified surface is **8 files
and 39 line-edits** (36 + 3), not "5 files / 36 lines."

**Where in design doc:** Overview/Approach (lines 24-44), Components (lines 55-79), Key Decisions
"Per-file precision edits" (line 197), versus the base-ref Decision and data-flow table (lines
127-133, 220-230).

**Suggestion:** Make the bucket partition actually partition the corpus. Either (a) widen the
bucket-A definition to "39 line-edits across 8 files" (36 in the 5-file map + 3 base-ref
substrings in `autonomous-workflow.md`, `4 - code.md`, `5 - docs.md`) and stop calling the 5-file
set "everything else is provably out of scope," or (b) explicitly carve the 3 base-ref
substring-edits out as a named fourth bucket-A sub-group ("base-ref inbound renames") and state
that the 36-line/5-file map is the *prose-rename* surface while the base-ref renames are tracked
separately. Whichever you pick, reconcile the bucket-B count: the 3 lines cannot be both
"Unchanged" and renamed.

**Why it matters:** The 36-line map is declared the binding completeness artifact, and req 9 is an
invariant: *every* reference to the base-ref heading must resolve after the change, none dangling.
An implementer who trusts the "binding" 5-file/36-line map (reinforced by Failure Mode 1 — see
Issue 2) would edit the heading definition plus `review-pipeline.md:29`, `4 - code.md:37`, and
`5 - docs.md:37` but **miss `autonomous-workflow.md:39`**, leaving a dangling `Reviewer base ref`
reference — a direct req-9 violation. An implementer who trusts the base-ref Decision table would
catch all 4. The two implementations diverge, which is exactly what the design is supposed to
prevent.

### Issue 2: Failure Mode 1 verification omits `autonomous-workflow.md` — it would mask a dangling reference or flag a correct edit

**What's wrong:** Failure Mode 1 (lines 285-286) says: "diffing the KEEP files must show zero
change **except the single base-ref substring on the two phase files**." It names only "the two
phase files" (`4 - code.md`, `5 - docs.md`) and omits `autonomous-workflow.md:39`, which is the
third KEEP-bucket file that must change. Likewise the Failure Modes additional-verification (line
299-300) asserts the KEEP files diff to zero change, which is false for these base-ref lines. This
makes the verification self-contradictory with Failure Mode 3 (line 293), which correctly demands
`grep -rn 'Reviewer base ref'` → zero and `Revision base ref` → 1 definition + 4 inbound.

**Where in design doc:** Failure Modes and Observability, items 1 and 3 (lines 282-300).

**Suggestion:** Make the expected-diff exception list match the actual base-ref edit set: "zero
change except the single base-ref substring on `autonomous-workflow.md:39`, `4 - code.md:37`, and
`5 - docs.md:37`" (three files, not two). Align this with the corrected bucket definition from
Issue 1 so the re-grep / KEEP-diff verification is internally consistent.

**Why it matters:** The re-greps are the design's sole observability surface, declared to be "the
greps that establish completeness are the same greps that prove it." With the wrong exception
list, the verification either (a) passes while `autonomous-workflow.md:39` is left dangling
(req-9 violation goes undetected), or (b) flags the legitimate `autonomous-workflow.md:39` edit as
a collateral-rename failure. A verification step that can't distinguish the correct outcome from
the failure it's meant to catch defeats its own purpose.
