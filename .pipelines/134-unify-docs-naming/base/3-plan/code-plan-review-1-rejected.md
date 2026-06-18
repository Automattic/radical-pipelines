# Code Plan Review (rejected, iteration 1)

**Verdict:** Rejected — one blocking defect. The plan's three-step procedure is sound and I verified it end-to-end on a scratch copy (164 → 0, four renames with matching `name:`, no corruption, idempotent, all derived copies correct). The sole reason for rejection is a wrong number in a hard acceptance gate that a correct execution would fail.

## Blocking finding

### B1 — Task 1 acceptance criterion asserts the wrong intermediate oracle count (157 instead of 161)

`3-plan/code-plan.md` line 35 (Task 1 acceptance) states:

> The leading-noun oracle (...) reads **157** — the three reworded leading-token occurrences are removed; the fourth ("a reader-facing doc") was a bare end-of-token `doc` the oracle never matched, so it does not change the count.

The number is wrong. The baseline is 164; Task 1 removes exactly **three** leading-token matches (the rationale in the same sentence says so), so the post-Task-1 oracle is **164 − 3 = 161**, not 157. 157 would require seven matches removed.

This is not a cosmetic nit — it is a stated pass/fail gate for Task 1. A code-writer that executes Task 1 exactly as written will observe 161, compare against the demanded 157, and conclude the task failed. The likely failure modes are (a) the task is reported failed despite being correct, or (b) the writer "hunts" for four nonexistent stragglers and over-edits to force the count down. Either way the gate is actively misleading.

**Evidence.**
- Dry-run on a scratch copy: applying the four Task 1 reword commands verbatim yields oracle **161** (verified). Per-file diff of the three reworded files: `agents/design-doc-reviewer.md` 1→0, `skills/.../assisted-phases/3 - plan.md` 38→37, `agents/doc-writer.md` 11→10 — exactly three removed.
- The **spec is correct and contradicts the plan**: `1-spec/spec.md` line 60 states "164 matches before ... **161 after the three reworded occurrences** ... 0 after the anchored rename." The plan's 157 disagrees with its own approved spec.
- The error originates in the design doc (`2-design-doc/design-doc.md` line 69, "After step 1 the oracle reads 157"), which the plan faithfully copied. The design's number is the typo; the spec independently got it right.

**Required fix.** In Task 1's acceptance criterion (line 35), change **157 → 161**. No other change to Task 1 is needed; the four reword commands themselves are correct and produce the right result.

(For the pipeline's benefit this typo also lives in the design doc at line 69. The plan only needs to correct its own copy to be approvable, but flagging the upstream source so it can be fixed there too.)

## What I verified as correct (non-blocking — no action required)

I ran the complete four-task procedure on a scratch copy of the in-scope trees (`skills agents .rp.md website .changeset README.md`) in a throwaway git repo, leaving the real worktree pristine (confirmed clean). Results:

- **Baseline oracle = 164** (matches the plan/spec). Seventeen distinct in-scope files carry the leading-noun token — exactly the set the design enumerates, including `agents/design-doc-reviewer.md` (its baseline "the doc faithfully reflects" match, removed by Task 1) and the dual-token files `setup.md`/`doc-reviewer.md` that justify per-match counting.
- **Task 2 substitution → oracle 0.** All four concept agents' `name:` flipped to plural while still at old filenames; cross-references in `code-plan-writer.md`/`code-plan-reviewer.md` updated to `docs-plan.md`; completion predicate in `pipeline-versioning.md` reads `3-plan/docs-plan-review-approved.md`; Mermaid nodes `B[Docs Writer]`/`D[Docs Reviewer]` and edge `commits docs updates`; `website/demo.js` `document.*` DOM calls survived intact while agent/artifact names pluralized; `.changeset` reads `docs-writer`/`docs-reviewer`/`docs-phase`; `README.md:112` and `.rp.md` table carry the four plural names.
- **Task 3 `git mv` → four files staged as renames**, old names gone, history preserved. (Git reported them as `R` after `git add -A`, not `RM`; the plan's "R/RM" wording covers this, so no issue.)
- **Task 4 acceptance suite:** oracle 0; all four positive-existence checks `OK`; all four old names `removed`; `docss` 0; `design-docs` 0.
- **Non-corruption counts:** `design-doc`/`Design Doc` 245 → 246 (+1 net from the single `design-doc-reviewer.md` disambiguation, none consumed); `document`/`documentation` 124 → 124 (unchanged) — matching the spec's with-README figures. The design's 239/118 figures are the without-README counts; both are internally consistent.
- **Idempotency:** re-running the substitution is a no-op (oracle stays 0, `docss` stays 0), confirming the `(?![Ss])` guard.
- **Ordering and rationale** (rewords → substitution → renames) are correct and necessary as the plan states.

Once B1 is fixed (157 → 161 at line 35), the plan is approvable.
