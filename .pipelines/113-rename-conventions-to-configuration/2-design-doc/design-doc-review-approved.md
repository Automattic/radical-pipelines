# Design Doc Review: APPROVED

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Reviewed against:** Spec (approved) + Intent (approved)

**Status:** APPROVED ✓

---

## Review Summary

The design doc is **complete, sound, and ready for code phase**. It synthesizes the approved spec into a concrete, executable architecture with clear edit tables, binding constraints for discretionary wording, and a verification strategy that is both specific and complete. All critical FLAT `.rp.md` structure requirements, folder rename completeness, and no-breaking-change assertions are properly addressed.

---

## Key Strengths

### 1. Correct Distinction and Classification

The design's Section 2 correctly identifies and applies the one distinction that drives every edit: **umbrella usage (→ "configuration") vs. named-rule usage (→ keep "convention")** as a binding principle throughout. This classification framework is sound and applied consistently to all five files and 7 inbound path references.

### 2. Verified Inbound References (7, not 5)

The design correctly identified that the **spec missed 2 references in `health-monitoring.md`** (lines 13 and 79), bringing the total from 5 to 7. The verification strategy in §6.2 uses a comprehensive grep pattern that catches all four file basenames (`load.md`, `setup.md`, `claude-code.md`, `pi.md`) and the folder path (`reference/conventions/`), proving completeness. Testing against the live worktree confirms the pattern returns exactly 7 matches outside `.pipelines/`.

**Critical validation:** The binding acceptance criterion (AC13) is "zero `reference/conventions/` or `conventions/{load,setup,claude-code,pi}.md` references outside `.pipelines/**`". The design's 6.2 grep will definitively prove this post-implementation.

### 3. FLAT `.rp.md` Structure is Definitive

Section 3 (Architecture) and Section 4.1 clearly specify:
- Title: `# Radical Pipelines project configuration` (no ambiguity)
- H2: `## Conventions` (flat, no `## Shared configuration` wrapper)
- H3 rule headers: all 9 stay at H3 (no demotion)
- Sub-headers: preserved at current levels

The design explicitly rejects three shapes (no umbrella H2, no `### Conventions` wrapper, no H3→H4 demotion). Verification in 6.4 will definitively check this.

### 4. Reconciliation of Structural Contradictions is Binding

The design identifies two structural contradictions in the dogfood docs:
1. **`.rp.md` L3**: Claims per-tool H2 sections exist, but they don't (the file is Claude-Code-only; per-tool guidance lives in `claude-code.md` / `pi.md`).
2. **README L159**: Describes `.rp.md` as carrying "both the Claude Code and the Pi per-tool sections side-by-side" after flattening contradicts this.

Both are addressed with **binding constraints** that force the rewrite to align with the actual flat structure. The constraints are:
- For `.rp.md` L3: (a) "configuration" umbrella, (b) frame Conventions as one section with future Guardrails as sibling, (c) no claim of per-tool H2 sections in this file
- For README L159: (a) no claim of per-tool H2 sections, (b) note that reference files cover both tools, (c) "configuration" umbrella, (d) preserve shared-vs-per-tool reading instruction

These are not left as open design questions; they are resolved with binding, testable constraints.

### 5. No Breaking Change is Properly Argued

**Decision 5** correctly establishes that the loader parses by **rule names** (the first column of the table in `load.md`), not by the file's title or H2 headers. Testing the current `load.md` confirms the table uses a `Convention` column with entries like "Pipeline base slug", "Artifact folder", etc. — these are the keys the loader uses. Old-format `.rp.md` files with the old title and `## Shared conventions` H2 will parse fine because the loader ignores those.

**Verification in 6.9** is appropriate: "confirm no edit touches loader parsing logic, the setup flow logic, per-tool canonical blocks, or local-overrides resolution."

### 6. Verification Strategy is Concrete and Binding

Section 6 provides **eight specific checks** (6.1–6.8), each with:
- Exact bash commands or grep patterns
- Clear pass/fail criteria
- Coverage of all 20 acceptance criteria

Testing the proposed greps against the live worktree:
- 6.2 grep pattern returns exactly 7 inbound references ✓
- 6.6 named-rule count returns 34 (matches design's finding) ✓
- 6.4 structure check has a clear baseline (current `.rp.md` shows `# Radical Pipelines project conventions` + `## Shared conventions`) ✓

The verification is binding: it doesn't rely on the code agent's self-assessment; it uses grep assertions that either pass or fail.

### 7. Complete Edit Tables

The exact-edit-plan tables in 4.1–4.5 specify:
- Current wording (exact quotes from live files)
- Target wording (either exact or binding-constrained)
- Line numbers (approximate, with note to grep)
- For load.md and setup.md: explicit list of what to keep unchanged (table, column headers, section headers, mechanics)

This is sufficient for a code agent to execute without guessing.

### 8. Clear Two-Commit Structure

The design specifies:
- **Commit 1**: All terminology/prose/title/header edits (files stay in current locations)
- **Commit 2**: `git mv` folder + all inbound path updates

Rationale: Terminology edits in Commit 1 are easier to review separately; Commit 2 is a pure move plus link fixes, which preserves `git mv` rename history in review. The design notes either order is acceptable (rename-first is also OK), which gives the code agent flexibility.

---

## Minor Observations (Not Rejection-Level)

### Observation 1: "Claude Code conventions add" Wording

Section 4.3, item 3 characterizes "Claude Code conventions add..." and "Pi conventions add..." as "umbrella → configuration" uses, which is correct. However, the design doesn't prescribe the exact target wording (e.g., should it be "Claude Code configuration adds" or "configuration for Claude Code includes"?). 

**Assessment:** This is fine. The design provides a binding constraint ("umbrella uses change to configuration terminology") and allows the code agent to choose exact wording. The design's §4.3 note says "Treat the bare/plural umbrella references as configuration", which gives clear direction even without prescribing exact words.

### Observation 2: "Shared project configuration (the Conventions section)"

The design's §4.3, item 2 recommends updating "A project's shared conventions live in a committed `.rp.md` file..." to "A project's shared configuration (the Conventions section) lives...". This parenthetical clarification is helpful for readers but is not binding — the design says "Binding constraints: ... This is binding..." only for the structural-description reconciliations. 

**Assessment:** This is appropriate. The recommended wording is good guidance, and the binding constraint is that it reads "configuration" as umbrella, which the recommendation satisfies.

### Observation 3: Load.md and Setup.md Titles (Decision 4)

The spec does not prescribe titles for these files. The design adopts "Load Configuration" and "Setup Configuration" because the files describe loading/setting up the **configuration** umbrella. The design notes this is a trade-off (readers might expect the inner table to be relabeled too; prose clarifies it's not).

**Assessment:** This is a sound design decision. The titles align with the files' umbrella scope (loading/setting up configuration) while the unchanged table + section headers preserve the named-rule mechanics. The interior prose will clarify the distinction.

---

## Completeness Verification

✓ **R1 (`.rp.md` structure)**: Fully specified in Design §3 and §4.1. AC1–7 covered.

✓ **R2 (named-rule "the X convention" references)**: Fully specified. Design counts 34 occurrences, all preserved. AC8–9 covered.

✓ **R3 (folder rename + inbound links)**: Fully specified. Design found all 7 references (spec missed 2 in health-monitoring.md). AC10–14 covered.

✓ **R4 (umbrella terminology in SKILL.md and README.md)**: Fully specified in Design §4.2 and §4.3 with detailed tables and binding constraints. AC15–16 covered.

✓ **R5 (umbrella terminology in load.md and setup.md)**: Fully specified in Design §4.4 and §4.5. AC17 covered.

✓ **R6 (no breaking change)**: Properly argued in Decision 5. AC18 covered. Verification in §6.9.

✓ **R7 (no behavioral change)**: Properly argued in Decision 5. AC19–20 covered. Verification in §6.9.

✓ **Out of scope**: Correctly identified (`.pipelines/**`, 34 named-rule references, generic-English uses, no guardrails, no loader changes).

---

## Final Assessment

The design doc **exceeds the spec's requirements** by:
1. Discovering the 2 missing inbound references in `health-monitoring.md` (the spec listed 5; design found 7)
2. Providing a complete, testable verification strategy with binding assertions
3. Resolving the structural contradictions in `.rp.md` L3 and README L159 with binding constraints
4. Creating exact-edit tables with current and target wording
5. Explaining all technical decisions with clear trade-offs

The design is **complete and ready for code phase**. A code agent can execute this design unambiguously using the exact edit tables, binding constraints, and verification assertions.

---

**Approved by:** design-doc-reviewer  
**Date:** 2026-06-10  
**Next phase:** Plan or Code
