# Specification Review - APPROVED

**Issue:** #113 — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Reviewed by:** spec-reviewer  
**Date:** 2026-06-10

---

## Summary

The specification is **APPROVED with one factual correction needed**. The spec is comprehensive, well-structured, and faithful to the converged research decisions. It correctly encodes the flat structure mandate, preserves the 34 named-rule "the **X** convention" references (not 36 as stated), and specifies the folder rename with all inbound links. Acceptance criteria are concrete and testable.

---

## Detailed Findings

### Strengths

1. **Faithful to research decisions:** All three converged decisions (Decision 1: keep named-rule phrasing; Decision 2: flat H2 structure; Decision 3: folder rename) are correctly translated into requirements (R1–R7).

2. **Flat structure correctly specified (R1, AC 1–7):** The spec mandates the correct header tree with configuration as the umbrella title, `## Conventions` at H2 (no longer nested), and rule headers staying at H3 with no demotion. The prose requirement to frame conventions as one section (with future guardrails as a sibling) is clear.

3. **Named-rule preservation correctly specified (R2, AC 8–9):** The spec mandates keeping all "the **X** convention" references unchanged and preserves the loader table column header (`Convention`) and section header (`## Conventions`).

4. **Folder rename with link updates correctly specified (R3, AC 10–14):** The spec identifies all 5 inbound path references (SKILL.md ×1, README.md ×2, work-on-an-issue.md ×1, manage-issues.md ×1) and requires `git mv` to preserve rename history. The internal cross-link survival (bare filenames) is correctly noted.

5. **Umbrella terminology updates correctly specified (R4–R5, AC 15–17):** The spec distinguishes umbrella uses (update to "configuration") from named-rule uses (keep as "convention") and correctly prescribes updates to SKILL.md, README.md, load.md, and setup.md prose while keeping mechanics and table structure intact.

6. **No breaking change correctly preserved (R6, AC 18):** The spec correctly mandates that existing `.rp.md` files remain valid with zero modification — no version gate or schema dependency introduced.

7. **Acceptance criteria are concrete and testable:** All 20 numbered criteria are specific, measurable, and verifiable (e.g., "The folder `skills/radical-pipelines/reference/configuration/` exists", "All 5 inbound path references point to `reference/configuration/...`").

8. **Scope boundaries are clear:** Historical artifacts, generic English uses of "convention", dual-format support, and guardrails implementation are correctly marked out of scope.

### Factual Correction Required

**Finding:** The spec (R2, second sentence, and AC 8) states there are "36 such occurrences" of "the **X** convention" across the 13 reference files. Verification by repo-wide search shows **34 occurrences**, not 36.

**Impact:** Low — this is a minor factual discrepancy in a count statement. It does not affect the requirement itself (preserve all occurrences unchanged), nor does it affect the implementation path. The 10 distinct rules listed in the spec research are correct.

**Correction needed:**
- R2, second sentence: "36 such occurrences" → "34 such occurrences"
- AC 8: "All 36 'the **X** convention' occurrences" → "All 34 'the **X** convention' occurrences"

---

## Verification Checklist

### Intent alignment
- [x] Specification reflects the goal: "configuration" as umbrella, "conventions" as one subsection.
- [x] Flat structure (not nested `## Shared configuration`/`### Conventions`) is mandated.
- [x] Room for future `## Guardrails` H2 sibling is correctly left.
- [x] No behavioral change to the loader, setup, or per-tool systems is specified.

### Research decision encoding
- [x] Decision 1 (keep "the **X** convention" phrasing) is correctly captured in R2.
- [x] Decision 2 (flat subsections at H2 level) is correctly captured in R1.
- [x] Decision 3 (folder rename + link updates) is correctly captured in R3.

### Completeness
- [x] All 5 inbound path references identified.
- [x] All 4 files in the folder move (`load.md`, `setup.md`, `claude-code.md`, `pi.md`) specified.
- [x] Umbrella-level terminology updates (SKILL.md, README.md, load.md, setup.md) specified.
- [x] Named-rule preservation is enforced (loader table, section header, named-rule references).
- [x] Acceptance criteria cover: `.rp.md` structure (7), named-rule references (2), folder rename and links (5), terminology (3), no breaking change (2), overall (1).

### Testability
- [x] AC 1 ("title is exactly `# Radical Pipelines project configuration`") is testable by reading `.rp.md`.
- [x] AC 10 (folder existence and file count) is testable by `ls` and `find`.
- [x] AC 12 (inbound path references updated) is testable by `grep`.
- [x] AC 13 (no reference to old folder outside `.pipelines/**`) is testable by `grep` with exclusion.
- [x] AC 18 (old-format `.rp.md` still loads) is testable by running the loader on a mock old-format file.

---

## Minor Style Notes

- The key distinction driving decisions (umbrella vs. named-rule) is clearly explained in the Overview and repeated in context throughout — good for reviewers.
- The out-of-scope section explicitly calls out guardrails (#51), which is helpful for avoiding scope creep.
- The distinction between "shared conventions" (terminology to remove) and "the shared section" (concept to preserve in prose) is clear.

---

## Conclusion

The specification is **APPROVED** pending correction of the named-rule count from 36 to 34. The spec is thorough, faithful to the research, and sets the implementer up for success with concrete, testable acceptance criteria and clear scope boundaries.

**Recommendation:** Apply the count correction and proceed to design-doc phase.
