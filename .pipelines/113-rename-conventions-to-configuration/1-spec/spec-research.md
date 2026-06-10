# Specification Research: Rename "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Goal:** Present **configuration** as the umbrella concept for everything declared in `.rp.md` and the skill, with **conventions** as one subsection inside it — sibling to future subsections such as guardrails — rather than "conventions" being the top-level concept today.

---

## Q&A Summary

### Question 1: Scope of Convention References

**Finding:** Two distinct uses of "convention" exist in the codebase:
1. **Umbrella usage** (the rename target): "conventions" as the top-level concept in `.rp.md` title, loader, setup, and skill documentation.
2. **Named-rule usage** (NOT renamed): "the **X** convention" naming individual rules (36 occurrences across 13 skill reference files). These refer to entries within the configuration subsystem, not the umbrella concept.

**Scope of umbrella references identified:**
- `.rp.md` file (title, prose, section headers)
- `skills/radical-pipelines/SKILL.md` (L42, L44, L46)
- `skills/radical-pipelines/reference/conventions/` folder (4 files: load.md, setup.md, claude-code.md, pi.md)
- `skills/radical-pipelines/reference/work-on-an-issue.md` (L7)
- `skills/radical-pipelines/reference/manage-issues.md` (L5)
- `README.md` (multiple lines referencing project conventions, shared conventions, convention loader, local overrides)

### Question 2: Named-Rule Terminology and `.rp.md` Structure

**Named-rule usage — exact count and list:**
36 occurrences of "the **X** convention" phrasing across 13 reference files, naming the following 10 distinct rules:
- 7× **Worktrees** convention
- 7× **Commit format** convention
- 6× **Issues** convention
- 3× **Team spawning** convention
- 3× **Pipeline base slug** convention
- 3× **Branch names** convention
- 3× **Artifact folder** convention
- 2× **Artifact storage** convention
- 1× **Health monitoring** convention
- 1× **Agent models** convention

Files carrying these: `create-pipeline.md`, `fork-pipeline.md`, `resume-pipeline.md`, `pipeline-versioning.md`, `manage-issues.md`, `work-on-an-issue.md`, `autonomous-workflow.md`, `assisted-workflow.md`, `autonomous-phases/1-spec.md`, `autonomous-phases/2-design-doc.md`, `assisted-phases/1-spec.md`, `assisted-phases/2-design-doc.md`, `assisted-phases/3-plan.md`.

**Semantic note:** These "the **X** convention" references name INDIVIDUAL RULES (entries in the loader table), not the umbrella concept. After the rename, they become the items living under the "## Conventions" subsection of the new "configuration" umbrella. This distinction supports keeping the phrasing as-is (see Decision 1 below).

**Backward compatibility:**
- Existing `.rp.md` files have no machine-enforced schema; the loader consumes them by rule NAME, not by umbrella header wording.
- No version field exists in `.rp.md` today; no dual-format support is needed.
- **No breaking change:** existing project `.rp.md` files remain valid with zero modification. The rename is a terminology/structure refactor in the skill's own documentation and the dogfood `.rp.md` only.
- Recommendation: optional one-line note in setup.md/README explaining that "configuration" is the new umbrella term; no migration guide required.

### Question 3: Folder Rename, Named-Rule Phrasing, and `.rp.md` Subsection Structure

**Current `.rp.md` structure (live file):**
- Title: `# Radical Pipelines project conventions`
- H2: `## Shared conventions` (the umbrella, containing all rules)
- H3: named rules directly beneath (`### Managing tasks`, `### Pipeline slugs`, `### Artifact folders`, `### Commit format`, `### Worktrees`, `### Branch names`, `### Team spawning`, `### Agent models`, `### Health monitoring`)
- Note: no per-tool H2 sections in the dogfood file (Claude Code only); the "shared + per-tool" framing exists in prose and canonical blocks for multi-tool projects.

---

## Decisions Converged

### Decision 1: Named-Rule Phrasing

**DECISION:** Keep "the **X** convention" phrasing across all 36 instances. Do NOT rename to "the **X** configuration".

**Rationale:**
- **Coherence:** After the rename, "configuration" is the umbrella and "conventions" is the subsection holding the per-project rules. Each rule IS a convention (one entry in the Conventions subsection). The phrasing "the **Worktrees** convention" then means "the Worktrees entry in the project's conventions" — semantically correct.
- **Intent sanction:** Issue intent L24 explicitly permits this: "Where 'convention' names a specific rule, it may remain."
- **Cost/benefit:** Renaming to "configuration" would require 36 edits across 13 files with no semantic gain and would blur the umbrella/member distinction the issue is sharpening. Minimal churn, minimal review surface.

**Acceptance criterion:** No changes to the 36 "the **X** convention" occurrences; no changes to the loader table column header (stays "Convention") or loader section headers (stays "## Conventions").

### Decision 2: `.rp.md` Structure — Flat Subsections at H2 Level

**DECISION:** Adopt the flat structure (validated by guardrails design in PR #112 and issue #51):
```
# Radical Pipelines project configuration
## Conventions
### Managing tasks
### Pipeline slugs
### Artifact folders
### Commit format
### Worktrees
### Branch names
### Team spawning
### Agent models
### Health monitoring
```

(Plus future `## Guardrails` as a flat sibling H2 subsection — NOT nested.)

**Rationale — grounded in guardrails evidence:**
- **Guardrails alignment:** Issue #51 ("Add a Guardrails convention…") explicitly frames guardrails as "a first-class **section within a project's configuration** (a sibling of conventions)." PR #112 (which first implemented this structure before being split into #113 and #51) confirms: `## Conventions` at H2 and `## Guardrails` at H2 as flat siblings under the "configuration" umbrella.
- **Flat structure:** The title "# Radical Pipelines project configuration" establishes "configuration" as the umbrella concept. `## Conventions` and (future) `## Guardrails` are both H2 sections — equal, flat siblings — under that umbrella. No nesting required.
- **No header churn:** Today's H3 rule headers (`### Worktrees`, `### Commit format`, etc.) remain at H3 — no demotion. This avoids unnecessary header-level changes.
- **Shared/per-tool axis:** The intro prose describes how per-tool rules live in their own reference files and are loaded conditionally. The word "Shared" is moved to the prose; the H2 header becomes simply `## Conventions`.

**Acceptance criteria:**
- `.rp.md` title updated to `# Radical Pipelines project configuration`.
- `## Shared conventions` header renamed to `## Conventions` (flat H2 level, "Shared" removed).
- Rule headers stay at H3 (no demotion): `### Managing tasks`, `### Pipeline slugs`, etc.
- Intro prose updated to describe "configuration" as the umbrella and how conventions (and future guardrails as a sibling section) live under it.
- No addition of `## Guardrails` in this issue (it lands in #51 with content and loader integration).

### Decision 3: Folder Rename and Link Updates

**DECISION:** Rename `reference/conventions/` → `reference/configuration/` in the same commit as terminology updates.

**Rationale:**
- **Semantic accuracy:** The folder holds load.md (the loader), setup.md (the collector), and per-tool canonical blocks. Collectively, these ARE the configuration subsystem, not "a convention." After the umbrella rename, "configuration" is the correct folder name.
- **Coupled changes:** The 5 inbound path references are tightly coupled to the folder move. Doing them together keeps every commit's links valid and the tree buildable:
  - `SKILL.md:46` (currently `reference/conventions/load.md`)
  - `README.md:147` (currently `./skills/radical-pipelines/reference/conventions/setup.md`)
  - `README.md:149` (currently `./skills/radical-pipelines/reference/conventions/load.md#local-overrides`)
  - `work-on-an-issue.md:7` (currently `conventions/load.md`)
  - `manage-issues.md:5` (currently `conventions/load.md`)
- **History preservation:** Use `git mv` to preserve rename history.
- **Internal cross-links survive:** The 4 files cross-reference each other by bare filename (e.g., load.md:27 "Read `setup.md`"), which survive the folder move untouched.

**Acceptance criteria:**
- Folder renamed from `skills/radical-pipelines/reference/conventions/` to `skills/radical-pipelines/reference/configuration/`.
- All 5 inbound path references updated.
- `git mv` used to preserve rename history.

---

## Scope Summary

**In scope for this issue:**
1. Terminology updates in skill documentation (SKILL.md, reference files, README.md) from "conventions" to "configuration" as the umbrella concept.
2. `.rp.md` title, structure, and prose reflecting the new umbrella and subsection model.
3. Folder rename `reference/conventions/` → `reference/configuration/` with inbound link updates.
4. No changes to the 36 "the **X** convention" named-rule references.
5. No behavioral changes to the loader, setup, or per-tool systems.

**Out of scope:**
- Historical `.pipelines/**` artifacts (frozen records of past runs — left untouched per intent).
- Generic English uses of "convention(s)" in agent files (referring to the host project being worked on, not RP's own config concept).
- Dual-format support for existing `.rp.md` files (not needed; no breaking change).
- **Guardrails implementation** (issue #51, PR #112 continuation): this issue establishes the structure and naming so guardrails can land as a sibling `## Guardrails` H2 section. #113 does NOT add guardrails content, loader integration, setup steps, or agent rewrites — those are #51's scope. #113 lands the rename first; #51 rebuilds on top.

**Expected side effect:**
- Backward compatibility is maintained: existing project `.rp.md` files require no changes. The rename is a skill-documentation and dogfood-file update only.

---

## Next Phase: Design & Plan

These requirements are ready for the design-doc and plan phases to specify:
- Exact file-by-file wording updates and line-number locations (title, section headers, prose, file paths).
- The order and grouping of commits (e.g., "rename folder + fix links" as one commit, "terminology wording" as a second, both in the same PR).
- Verification checklist for links, prose, and header levels (rule headers stay H3, no demotion needed).
- Confirm scope boundaries: guardrails are explicitly OUT of scope (#51's job); #113 sets up the structure only.

---

**Research completed:** 2026-06-10  
**Researcher:** spec-researcher  
**Analyst:** spec-analyst
