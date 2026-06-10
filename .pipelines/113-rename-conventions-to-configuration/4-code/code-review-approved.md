# Code Review: Approved

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Base ref:** `38a1589` (verified against trunk merge-base)

**Reviewer:** code-reviewer

**Date:** 2026-06-10

---

## Summary

All 7 code tasks (terminology edits + folder rename + inbound link updates) have been completed correctly. The full batch of changes has been adversarially reviewed against the spec, design doc, and code plan. All binding acceptance criteria pass.

---

## Binding Assertions (all pass)

### 1. Anti-overreach: Named-rule count unchanged (design §6.6)
```bash
grep -rEn "the \*\*[A-Za-z ]+\*\* convention" --include="*.md" . | grep -v "\.pipelines/" | wc -l
# Output: 34 (identical to base)
```
**Pass:** All 34 named-rule "the **X** convention" occurrences preserved verbatim.

### 2. Completeness: Dual grep both return zero (design §6.2, binding)
```bash
# Bare form:
grep -rnE "conventions/(load|setup|claude-code|pi)\.md" --include="*.md" . | grep -v "\.pipelines/"
# Output: (empty — 0 matches)

# Prefixed form:
grep -rn "reference/conventions/" --include="*.md" . | grep -v "\.pipelines/"
# Output: (empty — 0 matches)
```
**Pass:** No stale folder references remain outside `.pipelines/**`. All inbound links updated.

### 3. .rp.md structure exact (design §6.4)
- Title: `# Radical Pipelines project configuration` ✓
- Exactly one `## Conventions` (no `## Shared conventions` or `## Shared configuration`) ✓
- Nine H3 rule headers at correct level (Managing tasks, Pipeline slugs, Artifact folders, Commit format, Worktrees, Branch names, Team spawning, Agent models, Health monitoring) ✓
- Sub-headers (e.g., `#### Creating an issue`) at current `####` level ✓

### 4. Rule bodies byte-for-byte unchanged (design §6.5)
```bash
git diff 38a1589..HEAD -- .rp.md
# Output: edits confined to L1 (title), L3 (intro prose), L5 (H2)
# All tables, lists, examples, commands, URLs byte-identical
```
**Pass:** Content integrity preserved.

### 5. Loader mechanics intact (design §6.6)
```bash
grep -nE "^## Conventions$|^## Missing conventions$|^## Local overrides$|^\| Convention " \
  skills/radical-pipelines/reference/configuration/load.md
# Output: L9, L11, L23, L31 (all present, unchanged from base)
```
**Pass:** Parser table, section headers, and mechanics functionally identical. Existing `.rp.md` files load without modification.

### 6. Folder rename via clean `git mv` (design §6.1)
- New folder exists: `skills/radical-pipelines/reference/configuration/` with `load.md`, `setup.md`, `claude-code.md`, `pi.md` ✓
- Old folder gone: `skills/radical-pipelines/reference/conventions/` ✓
- Rename history preserved: `git log --follow` shows continuous history through the move ✓
- Per-tool canonical blocks untouched: `claude-code.md` and `pi.md` show 0 content changes ✓

### 7. All 7 inbound path references updated (design §6.3)
1. **SKILL.md L46:** `reference/conventions/load.md` → `reference/configuration/load.md` ✓
2. **README.md L147:** `./skills/radical-pipelines/reference/conventions/setup.md` → `./skills/radical-pipelines/reference/configuration/setup.md` ✓
3. **README.md L149:** `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` → `./skills/radical-pipelines/reference/configuration/load.md#local-overrides` ✓
4. **work-on-an-issue.md L7:** `conventions/load.md` → `configuration/load.md` ✓
5. **manage-issues.md L5:** `conventions/load.md` → `configuration/load.md` ✓
6. **health-monitoring.md L13:** `conventions/claude-code.md` and `conventions/pi.md` → `configuration/claude-code.md` and `configuration/pi.md` ✓
7. **health-monitoring.md L79:** same (both path strings updated) ✓

### 8. Anchor resolution (design §6.3)
- `configuration/load.md#local-overrides` resolves to `## Local overrides` at L31 ✓
- `configuration/setup.md` file exists ✓
- `configuration/load.md` file exists ✓

### 9. Umbrella terminology converted consistently (design §6.7)
- `.rp.md` L1: "configuration" umbrella title ✓
- `.rp.md` L3: intro prose frames "Conventions section (and future Guardrails section) apply to every agentic coding tool"; points tool-specific guidance to reference files ✓
- `SKILL.md` L42: "## Project configuration" ✓
- `SKILL.md` L44: "supplies its own configuration" ✓
- `README.md` L129: "following the project configuration" ✓
- `README.md` L145: "required configuration is missing" ✓
- `README.md` L147: "Shared project configuration includes...", "Claude Code configuration adds...", "Pi configuration adds..." (umbrella); two `Agent models` convention (named-rule) mentions preserved ✓
- `README.md` L149: "restricted subset of configuration" and "configuration loader" ✓
- `load.md` L1: "# Load Configuration" ✓
- `load.md` L3: "each project has its own configuration" ✓
- `setup.md` L1: "# Setup Configuration" ✓

### 10. Structural reconciliation: no stale per-tool-H2 claim (design §6.8)
```bash
grep -rn "per-tool section\|sections side-by-side" README.md .rp.md
# Output: (empty — 0 matches)
```
**Pass:**
- `.rp.md` L3 no longer claims per-tool H2 sections; instead points to reference files ✓
- `README.md` L159 reconciled: no longer describes "per-tool sections side-by-side in `.rp.md`"; instead says "the reference files cover both Claude Code and Pi" ✓
- All per-tool mentions refer to reference files (`claude-code.md`, `pi.md`) or per-tool guidance, not H2 sections ✓

### 11. No behavioral or breaking change (design §6.9, spec R6–R7)
- Diff confined to wording (titles, intro prose, single H2 rename, structural reconciliation) + folder rename + inbound paths ✓
- No changes to loader parsing logic, setup flow logic, per-tool canonical blocks, or local-overrides resolution ✓
- Backward compatibility: unmodified old-format `.rp.md` (old title `# Radical Pipelines project conventions`, old `## Shared conventions` H2, H3 rule headers) still loads because the loader keys on rule **names** with no version/schema gate introduced ✓
- Pipeline runtime behavior unchanged ✓

---

## Files changed

**Terminology edits (6 files):**
- `.rp.md` — title, intro prose, H2 header
- `skills/radical-pipelines/SKILL.md` — section title, prose
- `README.md` — umbrella-level prose (7 edits), structural reconciliation, no named-rule changes
- `skills/radical-pipelines/reference/conventions/load.md` — title, intro prose (moved post-edit)
- `skills/radical-pipelines/reference/conventions/setup.md` — title, prose (moved post-edit)

**Folder rename + inbound links (6 files):**
- `skills/radical-pipelines/reference/` — folder moved via `git mv conventions → configuration`
- `skills/radical-pipelines/SKILL.md` — path link updated
- `README.md` — path links updated (×2)
- `skills/radical-pipelines/reference/work-on-an-issue.md` — path link updated
- `skills/radical-pipelines/reference/manage-issues.md` — path link updated
- `skills/radical-pipelines/reference/health-monitoring.md` — path links updated (×2 lines, each with dual file references)

**Per-tool canonical blocks (2 files, 0 content changes):**
- `skills/radical-pipelines/reference/configuration/claude-code.md` — pure rename
- `skills/radical-pipelines/reference/configuration/pi.md` — pure rename

---

## Spot checks

### Spec Requirement R1 (`.rp.md` structure)
All 7 acceptance criteria met:
1. Title is exactly `# Radical Pipelines project configuration` ✓
2. Flat `## Conventions` H2, no `## Shared conventions` or `## Shared configuration` ✓
3. Nine H3 rule headers present at correct level ✓
4. Sub-headers remain at their current levels ✓
5. Intro prose frames configuration umbrella with future Guardrails sibling and points per-tool guidance to reference files ✓
6. Rule bodies byte-identical (diff confined to L1, L3, L5) ✓
7. Future `## Guardrails` H2 can land as flat sibling without restructuring ✓

### Spec Requirement R2 (named-rule preservation)
All 34 "the **X** convention" occurrences across 13 skill reference files preserved verbatim. The two `Agent models` named-rule mentions in README.md remain as "convention".

### Spec Requirement R3 (folder rename and links)
- Folder moved cleanly via `git mv` with rename history preserved ✓
- All 7 inbound path references updated and verified to resolve ✓
- No reference to `reference/conventions/` or `conventions/{load,setup,claude-code,pi}.md` remains outside `.pipelines/**` ✓

### Spec Requirement R4 (umbrella terminology in SKILL.md and README.md)
- SKILL.md section titled "## Project configuration" with umbrella prose ✓
- README.md: all umbrella references (7 locations) updated; named-rule mentions preserved; out-of-scope host-project phrase untouched ✓

### Spec Requirement R5 (umbrella references in load.md / setup.md)
- Umbrella prose updated to "configuration" ✓
- Loader table, `Convention` column, `## Conventions`, `## Missing conventions`, `## Local overrides` mechanics unchanged ✓
- Optional note added explaining configuration/Conventions distinction (recommended, spec R5) ✓

### Spec Requirement R6 (no breaking change to existing `.rp.md`)
Unmodified old-format `.rp.md` files remain valid because:
- Loader consumes by rule **name**, not title or H2 wording ✓
- No version field or schema gate introduced ✓
- No dual-format support or migration tooling needed ✓

### Spec Requirement R7 (no behavioral change)
- Loader, setup flow, per-tool canonical blocks, local-overrides resolution, agent context-passing behavior all unchanged ✓
- Only wording (title, umbrella prose, single H2), folder name, and inbound paths changed ✓
- Rule header levels unchanged ✓

---

## Assessment

**All binding assertions pass. All acceptance criteria met.** The change is confined to terminology (configuration umbrella, Conventions subsection) and the folder rename with its inbound links. No behavioral or backward-compatibility impact. The work is complete and correct.

The implementation was delivered in 7 individual commits (one per task) rather than the 2-commit grouping suggested in the design doc (Commit 1 for terminology, Commit 2 for folder+links), but the final tree is identical and the pure `git mv` rename is preserved with clean history.

---

Approved for merge.

**Co-Authored-By:** code-reviewer
