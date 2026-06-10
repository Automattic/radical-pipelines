# Design Research: Rename "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Analyst:** design-doc-analyst  
**Researcher:** design-doc-researcher

---

## Research Questions and Findings

### Q1: Exact File List and Wording Changes for Umbrella References

**Status:** Completed (analyst derived from spec + file inspection)

**Answer:** Based on the approved spec and inspection of the worktree files, the umbrella-level "conventions" references are:

**File-by-file inventory:**

| File | Line(s) | Current Wording | Target Wording | Notes |
|------|---------|-----------------|-----------------|-------|
| `.rp.md` | 1 | `# Radical Pipelines project conventions` | `# Radical Pipelines project configuration` | Title only |
| `.rp.md` | 3 | "This file holds the conventions for this project. The shared section applies to every agentic coding tool..." | "This file holds the configuration for this project. The shared section (under Conventions) applies to every agentic coding tool..." | Intro prose: "conventions" → "configuration", add clarification that "shared section" refers to the Conventions subsection |
| `.rp.md` | 5 | `## Shared conventions` | `## Conventions` | H2 header: remove "Shared" (moves to prose) |
| `skills/radical-pipelines/SKILL.md` | 42 | `## Project conventions` | `## Project configuration` | Section title |
| `skills/radical-pipelines/SKILL.md` | 44 | "This skill is generic; each project supplies its own conventions that you must load and verify before doing any workflow." | "This skill is generic; each project supplies its own configuration that you must load and verify before doing any workflow." | Prose: "conventions" → "configuration" (umbrella) |
| `skills/radical-pipelines/SKILL.md` | 46 | `See \`reference/conventions/load.md\` for the full list...` | `See \`reference/configuration/load.md\` for the full list...` | Path reference (couples with folder rename) |
| `README.md` | 129 | "...it dogfoods both CLIs at once, so its \`.rp.md\` is hand-maintained to carry the shared section plus both the Claude Code and the Pi per-tool sections..." | "...it dogfoods both CLIs at once, so its \`.rp.md\` is hand-maintained to carry the shared configuration section..." | Prose: "shared section" → "shared configuration section" (or similar) to clarify it's part of configuration |
| `README.md` | 142–150 (entire section) | References to "conventions" as umbrella (project defines conventions, shared conventions live in .rp.md, .rp.local.md local overrides, setup writing project guidance, orchestrator loading/verifying conventions) | Reword all umbrella references to "configuration" while preserving named-rule "the X convention" references | See detailed edits below |
| `skills/radical-pipelines/reference/conventions/load.md` | 1 | `# Load Conventions` | `# Load project configuration` | Title (or "Load Configuration" — see edge case below) |
| `skills/radical-pipelines/reference/conventions/load.md` | 3 | "This skill is generic, but each project has its own conventions that you must follow." | "This skill is generic, but each project has its own configuration that you must follow." | Prose: "conventions" → "configuration" (umbrella) |
| `skills/radical-pipelines/reference/conventions/load.md` | 5 | "Project-specific conventions are stored in the \`.rp.md\` file." | "Project-specific configuration is stored in the \`.rp.md\` file (the Conventions are one section within it)." | Prose: "conventions" → "configuration"; add clarification |
| `skills/radical-pipelines/reference/conventions/load.md` | 9–22 | `## Conventions` header + table | Keep `## Conventions` header and table unchanged | Named-rule mechanics stay unchanged (R2); table column stays `Convention` |
| `skills/radical-pipelines/reference/conventions/load.md` | 23–29 | `## Missing conventions` section | Keep section header unchanged | Named-rule flow; stays `## Missing conventions` |
| `skills/radical-pipelines/reference/conventions/load.md` | 31–37 | `## Local overrides` section | Keep section header unchanged | Named-rule flow; stays `## Local overrides` |
| `skills/radical-pipelines/reference/conventions/setup.md` | 1 | `# Setup Conventions` | `# Setup Project Configuration` or similar | Title (edge case: match load.md title style) |
| `skills/radical-pipelines/reference/conventions/setup.md` | 3 | "Use this setup flow when required conventions are missing..." | "Use this setup flow when required configuration is missing..." | Prose: "conventions" → "configuration" (umbrella) |
| `README.md` (multiple lines) | 142, 143, 148, 149 | All umbrella-level references to "conventions" | → "configuration" | Details in consolidated README section below |

**Edge cases resolved:**

1. **load.md and setup.md titles**: The spec does not prescribe exact titles. Current titles are "Load Conventions" and "Setup Conventions". After rename, these could be:
   - **Option A:** "Load Configuration" and "Setup Configuration" (matches umbrella rename)
   - **Option B:** "Load Conventions" and "Setup Conventions" (emphasize the named-rule mechanics inside)
   - **DECISION:** Adopt Option A ("Load Configuration" / "Setup Configuration") — the files are about loading/setting up the project configuration umbrella, even though the table/mechanics inside stay at the Conventions level.

2. **`.rp.md` intro prose**: The current intro says "The shared section applies..." This needs clarification that the shared section IS the `## Conventions` subsection under the configuration umbrella. Wording: "This file holds the configuration for this project. The shared Conventions section (and future per-tool Conventions sections) apply to every agentic coding tool used here;..."

3. **Folder rename coupling**: The folder move from `reference/conventions/` to `reference/configuration/` is coupled to the path references (SKILL.md, README.md ×2, load.md in other reference files). These must be updated together.

**README.md detailed umbrella references (lines 142–150):**

Current (excerpt):
```markdown
The skill is generic — each project defines its own conventions for things like the task source, existing work checks, pipeline slug format, worktree commands, branch naming, artifact folder location, and how teams of agents are spawned. A project's shared conventions live in a committed `.rp.md` file, populated by the interactive setup flow; an individual developer can optionally layer a restricted subset of local overrides on top of it (see below).

If required conventions are missing when a workflow starts, Radical Pipelines stops before running the pipeline and offers an interactive setup. Setup separates shared project guidance from guidance specific to the active agentic coding tool, and writes `.rp.md` only after the owner confirms the proposed content.

Shared project conventions include task tracking, pipeline slug format, artifact folder location, and commit rules. Claude Code conventions add...

A developer can override a restricted subset of conventions for their own working copy by placing a git-ignored `.rp.local.md` alongside the committed `.rp.md`: the local file wins per named unit, and the committed file is inherited wherever the local file is silent. Because `.rp.local.md` is git-ignored, it is never committed and never affects other contributors. See the [Local overrides](./skills/radical-pipelines/reference/conventions/load.md#local-overrides) section of the convention loader for details.
```

Target (umbrella references updated, named-rule references preserved):
```markdown
The skill is generic — each project defines its own configuration for things like the task source, existing work checks, pipeline slug format, worktree commands, branch naming, artifact folder location, and how teams of agents are spawned. A project's shared configuration (the Conventions section) lives in a committed `.rp.md` file, populated by the interactive setup flow; an individual developer can optionally layer a restricted subset of local overrides on top of it (see below).

If required configuration is missing when a workflow starts, Radical Pipelines stops before running the pipeline and offers an interactive setup. Setup separates shared project guidance from guidance specific to the active agentic coding tool, and writes `.rp.md` only after the owner confirms the proposed content.

Shared project configuration includes task tracking, pipeline slug format, artifact folder location, and commit rules. Claude Code configuration adds...

A developer can override a restricted subset of configuration for their own working copy by placing a git-ignored `.rp.local.md` alongside the committed `.rp.md`: the local file wins per named unit, and the committed file is inherited wherever the local file is silent. Because `.rp.local.md` is git-ignored, it is never committed and never affects other contributors. See the [Local overrides](./skills/radical-pipelines/reference/configuration/load.md#local-overrides) section of the configuration loader for details.
```

---

## Decisions Documented

### Decision 1: Keep all 36 "the X convention" named-rule references unchanged

**DECISION:** Approved by spec (R2). No changes to any phrasing like "the Worktrees convention", "the Commit format convention", etc. The loader table column stays `Convention`. Section headers `## Conventions`, `## Missing conventions`, `## Local overrides` stay unchanged.

**Files unmodified (named-rule references only):**
- `reference/work-on-an-issue.md` (L7: "conventions/load.md" → "configuration/load.md" path only; prose stays as-is if it says "the X convention")
- `reference/manage-issues.md` (L5: same)
- All phase reference files (create-pipeline.md, fork-pipeline.md, resume-pipeline.md, pipeline-versioning.md, autonomous-workflow.md, assisted-workflow.md, autonomous-phases/*.md, assisted-phases/*.md)

### Decision 2: Flat `.rp.md` structure with configuration umbrella

**DECISION:** Approved by spec (R1). `.rp.md` structure becomes:
```
# Radical Pipelines project configuration
## Conventions
### Managing tasks
### Pipeline slugs
...
```

- Title: `# Radical Pipelines project configuration` (was `# Radical Pipelines project conventions`)
- H2: `## Conventions` (was `## Shared conventions`; "Shared" moves to intro prose)
- H3 rule headers unchanged (no demotion)
- Intro prose updated to describe configuration as umbrella

### Decision 3: Folder rename with coupled path updates

**DECISION:** Approved by spec (R3). Rename `reference/conventions/` → `reference/configuration/` using `git mv`.

**Path references to update (5 locations):**
1. `SKILL.md:46` — `reference/conventions/load.md` → `reference/configuration/load.md`
2. `README.md:147` — `./skills/radical-pipelines/reference/conventions/setup.md` → `./skills/radical-pipelines/reference/configuration/setup.md`
3. `README.md:149` — `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` → `./skills/radical-pipelines/reference/configuration/load.md#local-overrides`
4. `work-on-an-issue.md:7` — `conventions/load.md` → `configuration/load.md`
5. `manage-issues.md:5` — `conventions/load.md` → `configuration/load.md`

---

## Implementation Plan

### Phase 1: Terminology Updates (Commit 1)
Update umbrella-level wording in:
- `.rp.md`: title, H2 header, intro prose
- `SKILL.md`: section title and umbrella prose + path reference (6 edits)
- `README.md`: all umbrella references (7–8 edits) + 2 path references
- `reference/configuration/load.md` (post-move): title, opening prose (3 edits)
- `reference/configuration/setup.md` (post-move): title, setup opening prose (2 edits)

**Total edits:** ~20 file edits across 5 files.

### Phase 2: Folder Rename and Inbound Link Updates (Commit 2)
Execute `git mv skills/radical-pipelines/reference/conventions/ skills/radical-pipelines/reference/configuration/` and verify all 5 path references resolve.

### Phase 3: Verification
- Grep for remaining "reference/conventions" (should be 0 outside .pipelines/)
- Grep for umbrella "conventions" as noun (should match named-rule "the X convention" only; umbrella should say "configuration")
- Check all Markdown links resolve
- Verify `.rp.md` structure matches spec (H1 title, H2 Conventions, H3 rules, no demotion)
- Confirm loader table and mechanics unchanged

---

**Design research completed:** 2026-06-10  
**Analyst:** design-doc-analyst

---

**Last updated:** 2026-06-10 (Research initiated)
