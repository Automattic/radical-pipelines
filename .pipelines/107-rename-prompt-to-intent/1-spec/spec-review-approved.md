# Spec Review — APPROVED

**Subject:** `1-spec/spec.md` — Rename the phase-0 artifact "prompt" → "intent"
**Verdict:** APPROVED (iteration N=1)
**Reviewer:** spec-reviewer

## Summary

The spec is complete, testable, internally consistent, self-contained, and faithful to the
requirements record (`spec-research.md`, section G is the canonical partition). It correctly
treats this as a pure rename with no behavior change, keeps the two senses of "prompt" distinct,
and enumerates the change per-occurrence rather than as a blanket find-replace. All grep-based
acceptance criteria were re-run against the live tree and hold. Approving.

## Verification performed (all run against the current working tree)

1. **Path-token count.** `git grep -nIE "0-prompt|prompt\.md" -- ':!.pipelines'` → **42**, matching
   acceptance criterion #1. No generic-keep line contains a path token (confirmed), so a clean
   post-rename zero is achievable with no carve-outs.

2. **Full residual count.** `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` → **81**, matching
   criterion #3 (56 RENAME + 25 KEEP).

3. **Partition is mathematically tight.** Built the 25 KEEP set (R3 / section G) and the actual
   81-line residual as `file:line` sets; the complement (81 − 25) is **exactly 56** lines, and that
   56-line complement is **identical** to the spec's section-G RENAME enumeration — `comm` shows
   zero invented lines and zero missed lines in both directions. Every RENAME occurrence maps to a
   file named in R1/R2/R4/R5; all 19 affected files are covered.

4. **Catch-all label grep present and correct (the item flagged for scrutiny).** Criterion #2's
   `git grep -nIE "0 [-–] Prompt|Phase 0\. Prompt|\(Prompt " -- ':!.pipelines' ':!.rp.md'` returns
   the **5** label-form lines (`README.md:27`, `SKILL.md:3`, `assisted-workflow.md:17`,
   `autonomous-workflow.md:39`, `pipeline-versioning.md:27`). This is the necessary complement to
   the path-token grep, which (being case-sensitive on lowercase `prompt`) does not match
   `0 - Prompt` / `0 – Prompt` / `Phase 0. Prompt` / `(Prompt →`. Together, criteria #1 + #2 + #3
   prove "no trace of the old name in the skill." Verified the en-dash in `pipeline-versioning.md:27`
   is U+2013 (`e2 80 93`) — correctly covered by the `[-–]` character class.

5. **KEEP set is genuinely generic.** Printed all 25 KEEP lines: every one is a launch/spawn/
   orchestrator/loop prompt, the `cc-prompt` CSS class, the `.term-body .cc-prompt` selector, the
   "prompt engineering" SEO keyword, or the "same prompt / different run" non-determinism copy.
   None is the phase-0 artifact. The structural argument (only `spec-analyst`/`spec-writer`/
   `spec-reviewer`/`spec-consolidator` read the phase-0 artifact) holds.

6. **Mixed-file handling is correct.** `spec-writer.md` L15 ("the orchestrator's prompt cited a
   review file") and `spec-consolidator.md` L8 ("Your spawn prompt includes…") are correctly
   marked KEEP while the artifact-naming occurrences in the same files are marked SOFT/FILE. The
   spec explicitly forbids a blanket rename of these files and instructs per-occurrence judgment.

7. **`create-pipeline.md` clause rewrite is not a blind swap.** Current L25 text confirmed verbatim
   ("Adapt the issue content as a prompt directed at the agents that will run subsequent phases.").
   R1 and criterion #6 require (a) "intent" and (b) not asserting "intent directed at the agents,"
   with a recommended phrasing and explicit latitude on exact wording. Correctly handled.

8. **Out-of-scope items faithful.** `.rp.md` has 3 "prompt" lines (L35 label `0 - Prompt`, L54
   commit example, L76 loop prompt), **none** a path token — confirming the spec's claim that
   criterion #1 needs no `.rp.md` exclusion and that the full residual including `.rp.md` is 28.
   The Linear-workflow-state rationale (renaming `.rp.md:35` would break the phase-0 status-set at
   runtime / require an external workspace change) is sound and correctly keeps `.rp.md`, the Linear
   state rename, and historical `.pipelines/` (including run #107's own `0-prompt/prompt.md`) all
   out of scope. No backward-compat / dual-name / migration text is requested anywhere.

9. **Changeset facts verified.** `.changeset/config.json` `changedFilePatterns` matches the spec's
   quote exactly; all 5 existing changesets use `"@automattic/radical-pipelines": minor`, matching
   the recommended bump and frontmatter form.

10. **No missed spelling/case variants.** `git grep -nIE "Prompt\.md|0_prompt|0-Prompt|0_Prompt"`
    and a `scripts/` "prompt" grep both return nothing — no variant escapes the partition greps.

## Non-blocking observation (no change required)

- `spec-research.md` section G labels `fork-pipeline.md:42` as "FOLDER ×2", but that line contains
  `0-prompt` only **once** (it is `fork-pipeline.md:14` that has it twice). This is in the research
  record, not in `spec.md`. The spec's R1 says only "multiple lines, some with the token twice …
  rename every instance," which is accurate at the file level and robust regardless of per-line
  counts. No impact on correctness or coverage; noted for the record only.
