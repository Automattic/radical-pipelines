# Code Plan Review: APPROVED

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Plan:** [code-plan.md](./code-plan.md) (approved [design doc](../2-design-doc/design-doc.md) and [spec](../1-spec/spec.md))

**Reviewer:** code-plan-reviewer

**Date:** 2026-06-10

**Status:** ✅ APPROVED — Plan is comprehensive, correctly ordered, and fully implementable.

---

## Review Summary

The code plan comprehensively implements the approved design across **7 discrete, well-specified tasks** organized into **2 commits**. Every design edit (design §4, items 4.1–4.7) maps to exactly one task. Dependencies are explicit and acyclic. Acceptance criteria are concrete, machine-checkable, and traceable to design §6 verification assertions. The plan correctly identifies and guards all critical bindings and edge cases.

---

## Coverage Verification

### Design §4 Edits vs Tasks

All 7 edit regions from the design map to distinct tasks:

| Design Section | Edit Region | Task | Files | Coverage |
|---|---|---|---|---|
| §4.1 | `.rp.md` (L1, L3, L5) | Task 1 | `.rp.md` | Title, H2, intro prose rewrite with 3 binding constraints |
| §4.2 | `SKILL.md` (L42, L44, L46) | Task 2 | `SKILL.md` | H2 rename, prose update; path owned by Task 7 |
| §4.3 | `README.md` (L129, L145, L147, L149, L155, L159) | Task 3 | `README.md` | 6 umbrella changes + L159 structural reconciliation; guards L147 mix + L155 out-of-scope |
| §4.4 | `load.md` in place (L1, L3, L5) | Task 4 | `reference/conventions/load.md` | Title + intro; loader mechanics preserved (DO NOT touch) |
| §4.5 | `setup.md` in place (L1, L3 + scan) | Task 5 | `reference/conventions/setup.md` | Title + intro; scan for umbrella uses; optional clarifying note |
| §4.6 | Folder rename | Task 6 | `reference/conventions/` → `configuration/` | Pure `git mv`; no content edits; per-tool files guarded |
| §4.7 | Inbound refs (7 known) | Task 7 | SKILL.md, README.md ×2, work-on-an-issue.md, manage-issues.md, health-monitoring.md ×2 lines | Comprehensive 7-row table; path-only edits; prose left untouched in agent files |

**Finding:** All design edits covered, no orphaned or duplicated changes.

### Inbound References (7 Identified)

The plan correctly enumerates all 7 inbound path references (design §4.7, design §6.2 "Grep gap"):

1. `SKILL.md` L46: `reference/conventions/load.md` (prefixed form)
2. `README.md` L147: `./skills/radical-pipelines/reference/conventions/setup.md` (prefixed)
3. `README.md` L149: `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` (prefixed)
4. `work-on-an-issue.md` L7: `conventions/load.md` (bare form)
5. `manage-issues.md` L5: `conventions/load.md` (bare form)
6. `health-monitoring.md` L13: `conventions/claude-code.md` and `conventions/pi.md` (both bare)
7. `health-monitoring.md` L79: `conventions/claude-code.md` and `conventions/pi.md` (both bare)

**Critical guard:** Task 7 Acceptance #1 includes BOTH dual greps:
- `grep -rnE "conventions/(load|setup|claude-code|pi)\.md"` — catches bare forms
- `grep -rn "reference/conventions/"` — catches prefixed forms

This prevents the "real trap" (design §6.2) where a bare-form-only grep would falsely pass. The plan explicitly warns at lines 221–226.

### Task Ordering and Dependencies

```
Tasks 1–5 (independent) → Commit 1 (terminology edits)
                           ↓ (Tasks 4,5 must complete)
                        Task 6 (folder move)
                           ↓ (move before links)
                        Task 7 (inbound link fixes)
                           ↓
                        Commit 2 (folder rename + links)
```

**Finding:** Ordering is correct. Task 6 (the move) runs after in-place edits (Tasks 4–5) to keep the rename a pure move in review. Task 7 runs after Task 6 so links target the correct path. Design §4.6 rationale preserved. No circular dependencies.

---

## Acceptance Criteria Quality

Each task has a **Goal**, **Files**, **Changes**, **Depends on**, **Traces to**, and **Acceptance**. Acceptance criteria are **concrete and machine-checkable** (grep assertions, anchor checks, file existence, diff assertions, count checks). All map to design §6 verification steps:

### Task 1 (.rp.md) — 6 Acceptance Criteria
- ✅ Exact title string check
- ✅ H2 count (exactly 1 `## Conventions`, zero `## Shared *` variants)
- ✅ 9 rule H3 headers present, none demoted to H4
- ✅ Sub-headers at current levels (no demotion)
- ✅ `git diff` confined to L1, L3, L5 (byte-for-byte rule bodies, design AC6)
- ✅ L3 rewrite contains "configuration", references Guardrails, points to reference files, zero "per-tool section" mentions (design §6.8)

**Traces to:** spec R1 AC1–7, design §3 §4.1 §6.4 §6.5 §6.8

### Task 2 (SKILL.md) — 3 Acceptance Criteria
- ✅ H2 changed to `## Project configuration`, old H2 gone
- ✅ Prose line changed to "configuration", old version gone
- ✅ No named-rule lines altered (git diff shows only 2 wording lines, or 3 if path edited here)

**Traces to:** spec R4 AC15, design §4.2

### Task 3 (README.md) — 6 Acceptance Criteria
- ✅ Zero umbrella "conventions" matches (filtered for host-project scope)
- ✅ 2 named-rule `Agent models` mentions survive verbatim
- ✅ 1 out-of-scope `host-project conventions` match (L155) survives
- ✅ Zero "per-tool section" mentions (reconciliation complete)
- ✅ Manual read of L147 (mixed line) and L159 region (reconciliation)
- ✅ Path strings still present (Task 7 ownership, or explicitly updated once if done early)

**Traces to:** spec R4 AC16, design §4.3 §6.8

### Task 4 (load.md in place) — 4 Acceptance Criteria
- ✅ Title changed to `# Load Configuration`
- ✅ "each project has its own configuration" present, old version gone
- ✅ Loader mechanics intact: `## Conventions`, `## Missing conventions`, `## Local overrides`, `Convention` column header all present and unchanged
- ✅ `git diff` limited to L1, L3, L5 (no table/section header edits)

**Traces to:** spec R5 AC17, design §4.4 Decision 4 §6.6

### Task 5 (setup.md in place) — 4 Acceptance Criteria
- ✅ Title changed to `# Setup Configuration`
- ✅ "required configuration is missing" present, old version gone
- ✅ Remaining "conventions" in file are named-rule or section-header uses (manual classification)
- ✅ Setup-flow mechanics unchanged (git diff shows only wording changes)

**Traces to:** spec R5 AC17, design §4.5

### Task 6 (git mv) — 4 Acceptance Criteria
- ✅ New folder `configuration/` has exactly 4 files
- ✅ Old folder `conventions/` gone
- ✅ `git status` shows `renamed:`, not delete+add; `git log --follow` preserves history
- ✅ Guard: no umbrella edits in `claude-code.md` / `pi.md`

**Traces to:** spec R3 AC10–11, design §4.6 §6.1

### Task 7 (inbound links) — 5 Acceptance Criteria (+ Final Verification)
- ✅ **Dual grep both return zero** (binding completeness check, design §6.2)
  - `grep -rnE "conventions/(load|setup|claude-code|pi)\.md"` = 0
  - `grep -rn "reference/conventions/"` = 0
- ✅ `configuration/...` refs count ≥ 8 (SKILL ×1, README ×2, work-on-an-issue ×1, manage-issues ×1, health-monitoring ×2 lines with ×2 file refs each = 4)
- ✅ Anchor `## Local overrides` exists in `configuration/load.md`
- ✅ Target files exist
- ✅ Named rule `the **Issues** convention` in manage-issues.md survives verbatim

**Final Verification (cross-task):**
- ✅ Named-rule count = 34 (anti-overreach, design §6.6)
- ✅ Zero stale folder refs outside `.pipelines/` (binding, design §6.2)
- ✅ `.rp.md` structure exact (design §6.4)
- ✅ Rule bodies byte-for-byte (design §6.5)
- ✅ Loader mechanics intact (design §6.6)
- ✅ Reconciliation done (design §6.8)
- ✅ No behavioral change (design §6.9)

**Traces to:** spec R3 AC12–14, design §4.7 §6.2 §6.3

---

## Critical Bindings and Edge Cases

### Binding #1: L3 Intro Prose Rewrite (Task 1)
Design §4.1 specifies **3 non-negotiable constraints** for the L3 rewrite:
- (a) umbrella term reads "configuration"
- (b) frames Conventions as one section with future Guardrails as a peer sibling
- (c) **no claim that per-tool H2 sections exist in `.rp.md`** — they don't; per-tool guidance lives in reference files

**Plan coverage:** Task 1 AC #6 verifies all three. Recommended wording provided. **✅ APPROVED**

### Binding #2: Dual Grep for Inbound Refs (Task 7)
Design §6.2 explicitly calls out a "real trap": a grep for `reference/conventions/` alone will miss the bare form `conventions/load.md` in agent files (health-monitoring.md, work-on-an-issue.md, manage-issues.md).

**Plan coverage:** Task 7 AC #1 includes BOTH greps and labels the dual check as **binding**. Plan lines 221–226 explicitly warn of the "Grep gap to avoid". **✅ APPROVED**

### Binding #3: Named-Rule Count = 34 (Anti-Overreach)
An over-eager find-replace could wrongly alter the 34 "the **X** convention" named-rule references. The count must remain exactly 34.

**Plan coverage:** Final verification #1 asserts count must be 34 (identical to base `38a1589`). **✅ APPROVED**

### Binding #4: Loader Mechanics Unchanged (Structural + Functional)
No change to the `Convention` column header, section headers (`## Conventions`, `## Missing conventions`, `## Local overrides`), table rows, or parsing logic. The loader must parse old-format `.rp.md` files without modification.

**Plan coverage:** Task 4 AC #3 checks loader structure intact. Task 7 Final #5 re-verifies in the new location. Design §6.9 asserts no behavioral change. **✅ APPROVED**

### Binding #5: `.rp.md` Structure Exact (Flat, No Demotions)
- Title: exactly `# Radical Pipelines project configuration`
- Exactly one `## Conventions` (flat H2), zero `## Shared conventions`, zero `## Shared configuration`
- All 9 rule headers at H3 (none demoted to H4)
- Sub-headers at current levels

**Plan coverage:** Task 1 AC #2–4 verify each constraint. Design §3 architecture prescribes the flat shape. **✅ APPROVED**

### Edge Case #1: README L147 (Mixed Umbrella + Named Rules)
A single line that contains:
- "Shared project conventions" → umbrella (change to "configuration")
- "Claude Code conventions add" → umbrella (change to "configuration")
- "`Agent models` convention" (×2) → **named rules** (keep "convention" verbatim)

The plan at design §4.3 item 3 explicitly calls this "the trickiest line" and demands individual classification.

**Plan coverage:** Task 3 Changes item (line 93–96) classifies each mention. Task 3 AC #2 verifies the 2 named-rule mentions survive (count = 2). **✅ APPROVED**

### Edge Case #2: README L159 (Per-Tool Section Contradiction)
Current text describes `.rp.md` as having "per-tool H2 sections" and "both the Claude Code and the Pi per-tool sections side-by-side". After Task 1 flattens the file to a single `## Conventions` H2 with no per-tool siblings, this wording becomes **self-contradictory**.

Design §4.3 specifies 4 **binding constraints** for the reword:
- (a) no claim that `.rp.md` contains per-tool H2 sections
- (b) remain accurate that this repo is multi-CLI dogfood, but state as "reference files cover both CLIs"
- (c) umbrella term reads "configuration"
- (d) preserve that a normal consumer needs shared rules + active tool's reference file

**Plan coverage:** Task 3 Changes item (line 100) specifies all 4 constraints. Task 3 AC #4 checks "per-tool section" = 0 in README. Task 3 AC #5 requires manual read for consistency. **✅ APPROVED**

### Edge Case #3: health-monitoring.md (Two Lines, Each with BOTH claude-code.md + pi.md)
L13 and L79 each reference **both** `conventions/claude-code.md` **and** `conventions/pi.md` in the same sentence.

Design §4.7 items 6–7 carefully specify that each of these 2 lines needs **both** path strings updated. The spec initially listed only 5 inbound refs; a grep found 2 more here.

**Plan coverage:** Task 7 Changes table rows 6–7 both explicitly note "(same line)" and list both path updates. Task 7 AC #1 (dual grep) catches both bare forms. **✅ APPROVED**

### Edge Case #4: Path-String Ownership (Task 2 vs Task 7 vs Task 3)
The SKILL.md L46 path, README L147 path, and README L149 anchor could be edited in Commit 1 or Commit 2. Design §4.2 note: "does not matter whether the code agent edits the path string in Commit 1 or Commit 2".

**Plan coverage:** Default ownership assigned to Task 7 (lines 211–212) to keep single-edit ownership. Tasks 2 and 3 allow optional earlier edits with explicit flexibility (lines 71, 97, 113). Plan enforces "each path string is edited exactly once across the plan" (line 266). **✅ APPROVED**

### Edge Case #5: Generic-English "Conventions" (Out of Scope)
The phrase "the role-specific host-project conventions listed in the agent profile" refers to the **host project being worked on** (the project Radical Pipelines is running a pipeline for), not RP's own configuration system. This is out of scope and must not be touched.

**Plan coverage:** Task 3 Changes item #5 (line 155) classifies this as "generic/host-project English". Task 3 AC #3 verifies it survives (1 match on L155). Final verification #7 confirms no breaking change. **✅ APPROVED**

---

## Discreteness and Ordering

### Task Independence (Commit 1: Tasks 1–5)
All 5 terminology-editing tasks operate on different files or non-overlapping regions:
- Task 1: `.rp.md`
- Task 2: `SKILL.md` (L42, L44)
- Task 3: `README.md` (multiple lines, non-overlapping)
- Task 4: `reference/conventions/load.md` in place
- Task 5: `reference/conventions/setup.md` in place

These can be implemented in **any order** within Commit 1. No cross-file or cross-region dependencies.

**Finding:** ✅ Tasks 1–5 are mutually independent.

### Task Sequencing (Commit 2: Tasks 6–7)

**Task 6 → Task 7 dependency:**
- Task 6 (git mv) must run first to move the folder to `configuration/`.
- Task 7 (link fixes) depends on the move being complete so inbound links target the correct path.

**Pre-move edits → Task 6:**
- Tasks 4 and 5 must complete before Task 6 so the in-place edits are in the tree when `git mv` executes. This keeps the move a pure rename, preserving `git log --follow` history and making the commit clean for review.

**Finding:** ✅ Ordering is correct and rationale is explicitly stated (plan lines 28–29, design §4.6).

---

## Design Traceability

Every task and acceptance criterion traces back to the spec and design:

| Spec | Design | Task(s) | Verification Method |
|---|---|---|---|
| R1 | §3, §4.1 | 1 | AC1–7, title/H2/structure/byte-for-byte checks |
| R2 | §2, Decision 2, §6.6 | 1–7, Final | Named-rule count = 34, no "the **X** convention" altered |
| R3 | §4.6, §4.7, §6.1, §6.2 | 6, 7 | Folder move preserved, dual grep = 0 |
| R4 | §4.2, §4.3 | 2, 3 | H2 renamed, umbrella prose changed, named rules preserved |
| R5 | §4.4, §4.5 | 4, 5 | load.md / setup.md titles changed, mechanics preserved |
| R6, R7 | Decision 5, §6.9 | Final | No parsing dependency, no version gate, old `.rp.md` still loads |
| AC1–20 | §6 | All tasks + Final | Specific acceptance checks per section |

**Finding:** ✅ Complete traceability. No spec requirement left uncovered.

---

## Summary Assessment

### Strengths
1. **Comprehensive coverage**: all 7 design edits mapped to distinct, well-scoped tasks.
2. **Correct ordering**: dependencies are explicit, acyclic, and justified.
3. **Concrete acceptance**: all criteria are machine-checkable (grep, diff, count, file existence) with no ambiguity.
4. **Critical guards**: the plan correctly identifies and secures all binding constraints (L3 rewrite, dual grep, named-rule count, loader mechanics, structure flatness, L147 mix, L159 reconciliation, health-monitoring double-line, path ownership, generic-English scope).
5. **Dual-grep trap explicitly called out**: plan warns of the "real trap" where a prefixed-only grep would miss bare `conventions/...` forms, preventing false-pass completeness claims.
6. **Traces to design verification**: final verification checklist (lines 231–246) mirrors design §6 assertions exactly, ensuring post-code review is formulaic.
7. **Commit separation clean**: Commit 1 edits before move, Commit 2 is pure move + links; review flow is clear.

### Risks (None found)
No substantive gaps or logical issues identified. The plan is ready for implementation.

---

## Conclusion

The code plan **fully and correctly implements the approved design**. Every design edit is covered, dependencies are sound, acceptance criteria are concrete and machine-checkable, and critical bindings and edge cases are explicitly guarded. The plan is **ready for code implementation**.

**APPROVAL VERDICT:** ✅ APPROVED

---

**Reviewer:** code-plan-reviewer  
**Date:** 2026-06-10  
**Commit:** (to be created by reviewer upon approval)
