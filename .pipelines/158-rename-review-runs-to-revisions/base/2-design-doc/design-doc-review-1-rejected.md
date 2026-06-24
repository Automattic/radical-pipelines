# Design Doc Review

## Verdict: rejected

## Summary

This is a strong, well-scoped design for a mechanical rename. The token map is the
load-bearing artifact, and I independently grep-verified it against the live tree: the
per-file bucket-A line identities are all correct, the `Reviewer base ref` heading genuinely
has 1 definition + 4 inbound references, the within-line "a PR review" keep on
`review-pipeline.md:39` is real and correctly classified, the two run-folder globs
(`pipeline-versioning.md:17,53`) are the only run-folder readers (all other run-reasoning files
delegate abstractly), the closure-proof regex returns zero run-creation tokens outside the 5
rename files, and the keep set (agent profiles, `*-review-approved.md` /
`*-review-N-rejected.md`, generic owner-review, the 32 generic `revis` lines) is correctly held
out. Nothing in-scope was missed and no phase-audit "review" was wrongly swept in. The design is
rejected for a single, real defect: the map's own **headline and per-file occurrence counts are
internally inconsistent and off by one** from the lines the map actually enumerates. Because the
design elevates these counts to a "binding completeness artifact" and makes them the basis of its
verification re-greps, the contradiction is material — an implementer following the doc would have
its verification disagree with the doc. The fix is small (correct two numbers); the line
identities themselves need no change.

## Issues

### Issue 1: The authoritative map's bucket-A counts contradict the lines it enumerates (off by one)

**What's wrong:** The design states the rename surface as "**35** lines across exactly **5
files**" in the Overview, Approach, Components, and the Key Decisions mental model, and states
that `pipeline-versioning.md` has "**8** of its 15 review-lines" in bucket A. But the map's own
enumerated lines sum to **36**, and the `pipeline-versioning.md` portion enumerates **9** lines,
not 8:

- `pipeline-versioning.md` bucket-A lines listed in the map: `:15, :17, :19, :21, :25, :53, :55,
  :65, :117` = **9 lines**. Live grep confirms the file has exactly 15 review-lines, and the map's
  own keep set is `:28, :45, :46, :47, :48, :49` = 6 lines. 15 − 6 = **9** bucket-A, so the
  per-file prose "8 of its 15" is wrong; the 9 enumerated lines are correct.
- Summing the map's enumerated bucket-A lines: `pipeline-versioning.md` 9 + `review-pipeline.md`
  20 + `work-on-an-issue.md` 2 + `intent-format.md` 2 + `.rp.md` 3 = **36**, not the headline
  "35".

To be clear, the line *identities* are all correct and complete — I verified every one against
the live tree. The defect is purely the numeric labels: "35" should be "36" and "8 of its 15"
should be "9 of its 15" (or the two values must be reconciled in whichever direction the writer
confirms).

**Where in design doc:** "35 lines across exactly 5 files" appears in the Overview (line 27),
Approach (line 27 / line 43 mental model "5 files / 35 lines"), Components, and the closing mental
model. The "8 of its 15 review-lines are bucket A" claim is in Components (the
`pipeline-versioning.md` bullet, line 60). The Authoritative rename map header
(`pipeline-versioning.md (8 bucket-A lines)`, line 141) repeats the wrong per-file count above a
table that lists 9 rows.

**Suggestion:** Recount the map's enumerated bucket-A lines and make every count agree with the
enumeration: headline `35` → `36`; `pipeline-versioning.md` "8 bucket-A lines" → "9 bucket-A
lines" in both the Components bullet and the map-table header. Re-check the reconciliation
arithmetic in `design-doc-research.md` Topic 1 ("252 = 35 bucket-A + 217 bucket-B") so the
bucket-A / bucket-B split (it would become 36 + 216) stays consistent with whatever total is
adopted. Do not change any line identity — only the numbers.

**Why it matters:** The design explicitly names the map "the binding completeness artifact" and
repeats "5 files / 35 lines" as the mental model the implementer is meant to hold. The Failure
Modes / Observability section then makes verification a re-grep that asserts these counts held. A
completeness artifact that miscounts itself, and whose per-file count (8) contradicts the lines it
lists (9), will cause the implementer's verification pass to disagree with the doc: they are told
to expect 8 bucket-A lines in `pipeline-versioning.md` and 35 overall, but the map they execute
has 9 and 36. For a rename whose entire correctness claim rests on an exhaustive, self-consistent
occurrence set, the headline count and the enumeration must match exactly.
