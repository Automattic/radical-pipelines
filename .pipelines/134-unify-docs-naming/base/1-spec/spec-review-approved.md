# Spec Review: Unify the documentation concept on plural "docs" — APPROVED

**Verdict:** Approved (iteration 5, terminator).
**Spec under review:** `1-spec/spec.md` (committed `e639a7e`).
**Reviewer:** fresh `spec-reviewer`, phase 1.

## Summary

The spec standardizes the documentation-phase concept on the plural `docs` across the
in-scope trees (`skills`, `agents`, `.rp.md`, `website`, `.changeset`), rewords four
generic single-document `doc` uses for clarity, and leaves the phase-2 `design-doc`
concept and the long word `documentation` untouched. The two defects from rejection 4 —
a fourth generic-`doc` occurrence and a false universal claim in AC#5, plus the missing
exhaustive bare-`doc` classification — are both resolved. Every load-bearing empirical
claim was independently re-verified against the worktree (the writer's numbers were not
taken on faith).

## Independent verification

All searches run against the live worktree; the reword-then-rename was simulated on a
scratch copy of the in-scope trees.

### AC#5 leading-noun pattern is sound and self-completing
- Before change: `grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' …` → **160** (matches spec).
- After rewording the three generic occurrences the pattern reads → **157** (matches spec).
- After the anchored leading-`doc`→`docs` rename → **0**. Self-completing: zero, no stragglers.
- `design-doc`/`Design Doc`: **239 → 240** (the single net addition is the
  `design-doc-reviewer.md:14` disambiguation) and stays **240** through the rename — no consumption, no corruption.
- `design-docs` corruption: **0**. `docss` over-pluralization: **0**.
- `document`/`documentation`: **118 → 118**, unchanged throughout.
- Already-plural `docs`/`Docs` left unmatched: plural count **87 → 244** (grew by exactly
  157, the renamed concept tokens — no double-pluralization); `docs-review-approved.md`/
  `docs-summary.md` in `website/demo.js` untouched.

### Bare-`doc` sweep is exhaustive and correctly classified
- `grep -roiP '\b[Dd]oc(?![Ss])(?!ument)\b(?![- ])' …` → **110**, of which exactly **1**
  survives the `(?<![Dd]esign[- ])` lookbehind: `agents/doc-writer.md:25` ("a reader-facing
  doc"), the fourth generic occurrence. The other 109 are `design-doc`/`Design Doc`
  substrings (out of scope). Matches the spec exactly.
- That fourth occurrence is end-of-token, so the leading pattern never matched it; rewording
  it leaves the 160→157 count unchanged and drops the non-design bare sweep 1 → **0**. The
  AC#5 prose states this precisely and asserts nothing false.

### Four generic occurrences are real, distinct, and reworded correctly (simulated)
- `agents/design-doc-reviewer.md:14` "the doc faithfully" → "the design doc faithfully" (a
  disambiguation that adds a "design doc" reference; this is the +1 in the 239→240 count).
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:175` "who the doc is for"
  → "who the surface is for".
- `agents/doc-writer.md:14` "a reference doc may" → "a reference page may".
- `agents/doc-writer.md:25` "a reader-facing doc" → "a reader-facing page".

### Every other leading match is the concept (safe to pluralize)
- Adversarial audit of all 160 leading matches: hyphenated set is entirely `doc-plan`,
  `doc-writer(s)`, `doc-reviewer`, `doc-phase` (no generic compound); spaced set is the
  docs-phase concept (`doc plan`, `doc task(s)`, `doc surfaces`, `doc tests`, `Doc Plan`,
  `Doc Writer`, `Doc Reviewer`, `commits doc updates`, etc.) except exactly the three
  generic occurrences above. No generic single-document `doc` is pluralized.

### Requirements / Out of Scope / AC mutual consistency
- Requirement 8 (four occurrences), Out of Scope ("four such occurrences"), and AC#5
  (3 leading-read + 1 bare-only) agree.
- Derived copies confirmed present and in scope: `.rp.md` Agent models table (4 agents),
  `website/demo.js` (4 agents + `doc-plan.md`/`doc-plan-review-approved.md`),
  `.changeset/agent-scoped-guardrails.md` (`doc-writer`, `doc-reviewer`, `doc-phase`). The
  rename simulation produced the correct plural forms in all three.
- Completion predicate (`pipeline-versioning.md:47` `3-plan/doc-plan-review-approved.md`)
  and phase-5 input list (`5 - docs.md` `doc-plan.md`) are in scope and driven to the
  plural form by the rename.
- The four singular agent files exist (`agents/doc-{plan-,plan-reviewer→}…`), so Requirement
  2's rename is real and necessary for discoverability.

## Conclusion

The spec is sound, complete, internally consistent, and self-completing. No blocking
issues. Approved.
