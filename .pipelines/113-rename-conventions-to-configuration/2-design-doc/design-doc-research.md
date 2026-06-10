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

**DECISION:** Approved by spec (R3), **UPDATED by researcher findings**. Rename `reference/conventions/` → `reference/configuration/` using `git mv`.

**Path references to update (7 locations, NOT 5):**

The spec enumerated 5 path references, but researcher grep found **7**. Spec omitted 2 references in health-monitoring.md. All 7 must be updated to satisfy Acceptance Criterion #13 ("No reference to `reference/conventions/` ... remains anywhere outside .pipelines/**").

1. `skills/radical-pipelines/SKILL.md:46` — `reference/conventions/load.md` → `reference/configuration/load.md`
2. `README.md:147` — `./skills/radical-pipelines/reference/conventions/setup.md` → `./skills/radical-pipelines/reference/configuration/setup.md` (markdown link)
3. `README.md:149` — `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` → `./skills/radical-pipelines/reference/configuration/load.md#local-overrides` (markdown link)
4. `skills/radical-pipelines/reference/work-on-an-issue.md:7` — `conventions/load.md` → `configuration/load.md`
5. `skills/radical-pipelines/reference/manage-issues.md:5` — `conventions/load.md` → `configuration/load.md`
6. **[SPEC OMITTED]** `skills/radical-pipelines/reference/health-monitoring.md:13` — `conventions/claude-code.md` or `conventions/pi.md` → `configuration/claude-code.md` or `configuration/pi.md`
7. **[SPEC OMITTED]** `skills/radical-pipelines/reference/health-monitoring.md:79` — `conventions/claude-code.md` or `conventions/pi.md` → `configuration/claude-code.md` or `configuration/pi.md`

**Note:** Internal cross-links between the moved files (load.md, setup.md, claude-code.md, pi.md) use bare filenames and survive the folder move untouched — no internal edits needed.

---

## Implementation Plan

### Phase 1: Terminology Updates (Commit 1)
Update umbrella-level wording in:
- `.rp.md` (L1, L3, L5): title, H2 header, intro prose — **3 edits**
- `SKILL.md` (L42, L44, L46): section title, umbrella prose, path reference — **3 edits**
- `README.md`: umbrella references (L129, L143×2, L145, L147×2, L149×2, L155) + **RECONCILE L159** — **~10 edits + design decision**
- `reference/configuration/load.md` (post-move, L1, L3, L5): title, opening prose — **3 edits**
- `reference/configuration/setup.md` (post-move, L1, L3, L7, L26, L112, L186, L190, L208): title, setup prose — **~8 edits with writer discretion**

**Total edits:** ~27 file edits across 5 files.

### Phase 2: Folder Rename and All Inbound Link Updates (Commit 2)
Execute `git mv skills/radical-pipelines/reference/conventions/ skills/radical-pipelines/reference/configuration/` and update **all 7 inbound path references** (not 5 as spec listed):
1. SKILL.md:46
2. README.md:147
3. README.md:149
4. work-on-an-issue.md:7
5. manage-issues.md:5
6. health-monitoring.md:13 (spec-omitted)
7. health-monitoring.md:79 (spec-omitted)

Verify all paths resolve and no `reference/conventions/` or `conventions/` references remain outside `.pipelines/`.

### Phase 3: Critical Design Decisions (BLOCKERS — must resolve before code phase)

#### Design Question A: README.md L159 Structural Contradiction

**Current L159:**
```
A project's committed [`.rp.md`](./.rp.md) is organized as a shared section (issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior) followed by a per-tool section covering only what depends on the active tool (worktrees, branch names, team spawning, agent models, health monitoring).
```

**Tension:** This describes the OLD shared/per-tool split, but R1 flattens `.rp.md` to a single `## Conventions` H2 with no per-tool H2 sections. The dogfood `.rp.md` is Claude-Code-only and has no per-tool sections; the per-tool guidance lives in reference files (claude-code.md, pi.md).

**Decision Options:**
- **Option A (Recommended):** Reword L159 to describe the flat structure: "...organized under a `## Conventions` section, with per-tool guidance documented separately in reference files (claude-code.md, pi.md)."
- **Option B:** Leave L159 as aspirational/historical (projects CAN add per-tool H2 sections if they use multiple tools).
- **Option C:** Delete or demote L159.

**Analyst recommendation:** Option A — avoids self-contradiction in the dogfood file's documentation and aligns with R1's flat structure.

#### Design Question B: `.rp.md` L3 Intro Prose — Per-Tool Section Framing

**Current L3:**
```
This file holds the conventions for this project. The shared section applies to every agentic coding tool used here; the per-tool sections add conventions specific to Claude Code and Pi. Read the shared section plus the section for the active tool at the start of any workflow.
```

**Tension:** Claims per-tool H2 sections exist but the dogfood file has none (it's Claude-Code-only).

**Rewritten L3 must:**
1. Establish "configuration" as umbrella.
2. Frame `## Conventions` as one section under the configuration umbrella (with future `## Guardrails` as sibling).
3. Preserve the shared-vs-per-tool reading instruction WITHOUT implying per-tool H2 sections exist in this file.

**Option A (Recommended):**
```
This file holds the configuration for this project. The Conventions section (and future Guardrails section) apply to every agentic coding tool used here; tool-specific guidance is documented in the reference files (claude-code.md, pi.md). Read the Conventions section plus the reference file for the active tool at the start of any workflow.
```

**Option B (If per-tool H2 sections may be added later):**
```
This file holds the configuration for this project. The Conventions section applies to every agentic coding tool used here; add tool-specific sections below it as needed. Read the Conventions section plus any tool-specific section for the active tool at the start of any workflow.
```

**Analyst recommendation:** Option A — clearer that per-tool guidance lives in separate reference files, aligns with how the dogfood `.rp.md` actually works.

### Phase 4: Verification (Post-Implementation)
- Grep for remaining `reference/conventions` outside `.pipelines/` (should be 0)
- Grep for remaining `conventions/` path references outside `.pipelines/` (should be 0)
- Grep for standalone umbrella "conventions" as noun (should match named-rule "the X convention" only; standalone should say "configuration")
- Check all 7 inbound Markdown links resolve
- Verify `.rp.md` structure matches spec: H1 title (configuration), H2 Conventions (flat), H3 rules, no demotion
- Confirm loader table (`Convention` column), section headers (`## Conventions`, `## Missing conventions`, `## Local overrides`), and mechanics unchanged
- Confirm agents/*.md files untouched (researcher verified zero umbrella references)
- Verify CONTRIBUTING.md unmodified

---

## Researcher Findings Summary

**Researcher completed:** 2026-06-10  
**Critical discoveries:**
1. **7 inbound links, not 5** — health-monitoring.md contains 2 additional `conventions/` path references (L13, L79) not enumerated in spec R3. Both must be updated to satisfy Acceptance Criterion #13.
2. **README L159 self-contradiction** — structural description assumes per-tool H2 sections, but the dogfood `.rp.md` flattens to `## Conventions` with no per-tool sections. Requires Design Question A.
3. **`.rp.md` L3 ambiguity** — claims per-tool H2 sections exist but they don't in the dogfood file. Requires Design Question B.
4. **Loader parsing safe** — no dependency on title or `## Shared conventions` wording; R6/R7 confirmed.
5. **Agent files clear** — zero umbrella-concept references; no edits needed.
6. **Internal cross-links survive** — bare-filename refs between moved files stay valid.

---

**Design research completed:** 2026-06-10  
**Analyst:** design-doc-analyst  
**Researcher:** design-doc-researcher  
**Status:** Awaiting design decisions on Questions A & B before plan phase
