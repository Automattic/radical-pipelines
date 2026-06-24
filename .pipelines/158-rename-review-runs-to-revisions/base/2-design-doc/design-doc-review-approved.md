# Design Doc Review

## Verdict: approved

## Summary

The design is a scoped, mechanical rename of the run-creation "review" vocabulary to
"revision"/"revise", executed as a closed, grep-verified token map. The two prior rejection
concerns are genuinely resolved, and independent live verification against the tree confirms every
load-bearing claim. The bucket partition now truly partitions the corpus: 252 `review` lines =
39 bucket-A + 213 bucket-B, with bucket A correctly framed as 39 line-edits across 8 files (36
prose-rename across the 5 run-creation files + 3 base-ref inbound substrings in 3 further files),
and 32 `revis` lines all bucket-D. The base-ref heading has exactly 1 definition + 4 inbound
references; `autonomous-workflow.md:39` carries only the base-ref token (whole-line rename) while
`:55` is a separate phase-audit keep; the two per-phase lines (`4 - code.md:37`, `5 - docs.md:37`)
correctly keep their phase-audit tokens within-line; and `review-pipeline.md:39` correctly keeps
"a PR review" within-line. The Failure-Modes verification now names all three outside-the-5
base-ref files and is self-consistent with Failure Mode 3. Every spec requirement (1-12) maps to a
component or decision with explicit "Traces to:" lines, the keep/rename classifications are correct
at the line level, the closure-proof regex returns zero run-creation tokens outside the 5 files,
and the single in-scope filename reference and single route phrase both match the tree. The design
stays at the architecture/decision level appropriate for a mechanical-rename task and is
unambiguous enough that two implementers would produce the same edits.

## Verification performed

- **Headline totals:** `grep -rni 'review'` = 252; `grep -rni 'revis'` = 32; `agents/` = 105 (all
  phase-audit). Match the design.
- **Per-file review-line counts:** pipeline-versioning.md 15, review-pipeline.md 20,
  work-on-an-issue.md 2, intent-format.md 2, .rp.md 10, autonomous-workflow.md 2, 4 - code.md 11,
  5 - docs.md 11. Bucket A = 9+20+2+2+3+1+1+1 = 39; bucket B = 252 - 39 = 213. Internally
  consistent.
- **Base-ref heading:** 1 definition (`pipeline-versioning.md:21`) + 4 inbound
  (`autonomous-workflow.md:39`, `review-pipeline.md:29`, `4 - code.md:37`, `5 - docs.md:37`).
  Confirmed.
- **Classification of `autonomous-workflow.md`:** `:39` carries only `**Reviewer base ref**`
  (whole-line rename, no phase-audit keep); `:55` is a separate keep ("rejected review iterations").
  Correct.
- **Per-phase within-line keeps:** `4 - code.md:37` and `5 - docs.md:37` carry `code-reviewer`/
  `docs-reviewer`, `*-review-N-rejected.md`, `*-review-approved.md` alongside the base-ref token —
  substring-only rename. Confirmed. The other 10 review-lines in each file are all phase-audit.
- **`review-pipeline.md:39`:** carries run-creation tokens ("MANDATORY for reviews", "this review
  intent") plus the "a PR review" keep. Within-line precision is correct.
- **Closure proof:** the prose run-creation regex returns zero hits outside the 5 prose-rename
  files. Filename inbound reference = exactly 1 (`work-on-an-issue.md:36`); route phrase at
  `review-pipeline.md:9`. SKILL.md hits (`:15`, `:29`) are generic owner-review (keep);
  `resume-pipeline.md`, `fork-pipeline.md`, `manage-issues.md` carry no `review` token.
- **Generic-revis preservation:** the only `revis` line in a bucket-A file at risk is
  `pipeline-versioning.md:112` (generic "revised the spec/intent"), correctly called out as keep;
  the disambiguation rule (always "revision run"/`revision-N`, never bare "revision") guards the
  reverse collision.
- **Prior issues resolved:** the "exactly 5 files / 36 lines closed set" framing is gone, replaced
  by "39 line-edits across 8 files" consistently (lines 27, 44, 54, 151); Failure Mode 1 no longer
  says "two phase files" and now lists all three outside-the-5 base-ref files, self-consistent with
  Failure Mode 3 (1 def + 4 inbound) and the additional-verification bullet. The bucket-B count is
  213 throughout with no stray 216.
