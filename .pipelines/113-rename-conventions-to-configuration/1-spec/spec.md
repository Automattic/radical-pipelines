# Specification: Rename the "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

---

## Overview

Today, **conventions** is the umbrella concept for everything a project declares in its `.rp.md` file and in the Radical Pipelines skill documentation: `.rp.md` is titled "Radical Pipelines project conventions", the skill stores its loader and setup under `reference/conventions/`, and the README frames per-project rules as "conventions" throughout.

This change makes **configuration** the umbrella concept, expressed by the `.rp.md` **title only**, and recasts **conventions** as one flat section inside it. The per-project rules (worktrees, commit format, issues, etc.) remain grouped together under a `## Conventions` H2 section — a flat sibling of the future `## Guardrails` H2 section (issue #51) under the configuration umbrella, not nested under any `## Shared configuration` wrapper. The rule headers stay at H3 (no header-level demotion). This leaves room for sibling sections without overloading the word "conventions".

This is a **terminology and structure refactor only**. It changes wording, the title, and one folder name; it does not change pipeline behavior, the loader's parsing logic, the setup flow, or how agents consume project rules. Individual rules continue to be referred to as "the **X** convention" (e.g. "the **Worktrees** convention"), because each rule is genuinely one entry within the Conventions section.

### Key distinction driving every decision

There are two different uses of the word "convention" in the codebase, and they are treated differently:

1. **Umbrella usage (renamed to "configuration"):** "conventions" as the top-level concept — the `.rp.md` title, the umbrella prose in the README and SKILL.md, and the `reference/conventions/` folder name.
2. **Named-rule usage (kept as "convention"):** "the **X** convention" naming a single rule. These reference entries that live inside the `## Conventions` section, not the umbrella concept, so they stay unchanged.

---

## Requirements

### R1 — Restructure `.rp.md` so "configuration" is the umbrella and "conventions" is a flat H2 section

Update the dogfood `.rp.md` at the repository root to the following **flat** structure. The umbrella title establishes "configuration" as the top-level concept; `## Conventions` becomes one flat H2 section under it, sitting at the same level a future `## Guardrails` will occupy. The named-rule headers stay at **H3 — no demotion**.

Required header tree:

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

Specifically:

- **Title** (L1): `# Radical Pipelines project conventions` → `# Radical Pipelines project configuration`.
- **Intro prose** (L3): rewritten so the umbrella term is "configuration" while preserving its current meaning. It must describe that conventions are one section of the project's configuration (with future guardrails as a sibling section), and carry over the shared-vs-per-tool reading instruction — the word "Shared", removed from the H2 header, moves into this prose (the shared section applies to every agentic coding tool; per-tool sections add tool-specific entries; read the shared section plus the active tool's section at the start of any workflow).
- **Umbrella/section H2** (L5): `## Shared conventions` → `## Conventions` (flat H2, "Shared" dropped from the header and relocated to prose).
- **Rule headers stay at H3 — no demotion:** every current `### <Rule>` (Managing tasks, Pipeline slugs, Artifact folders, Commit format, Worktrees, Branch names, Team spawning, Agent models, Health monitoring) remains `### <Rule>`. Any sub-headers currently nested beneath them (e.g. `#### Creating an issue` / `#### Modifying an issue` / `#### Orchestrator updates during a run` under "Managing tasks") also stay at their current levels.
- All body content of every rule (tables, lists, examples, URLs, commands) is preserved verbatim — only the title and the one H2 header change.

The structure must leave a clean slot for a future `## Guardrails` H2 section as a **flat sibling** of `## Conventions` under the configuration umbrella (no guardrails content, loader integration, or setup steps are added in this change — that is issue #51's scope).

### R2 — Keep all named-rule "the **X** convention" references unchanged

Do **not** rename any "the **X** convention" phrasing to "configuration". There are 36 such occurrences across 13 skill reference files, naming 10 distinct rules (Worktrees, Commit format, Issues, Team spawning, Pipeline base slug, Branch names, Artifact folder, Artifact storage, Health monitoring, Agent models).

These reference individual entries within the `## Conventions` section, so the phrasing stays semantically correct. The files involved include: `create-pipeline.md`, `fork-pipeline.md`, `resume-pipeline.md`, `pipeline-versioning.md`, `manage-issues.md`, `work-on-an-issue.md`, `autonomous-workflow.md`, `assisted-workflow.md`, and the autonomous/assisted phase files for spec, design-doc, and plan.

Also keep unchanged:

- The loader table column header in `reference/.../load.md` — stays `Convention`.
- The `## Conventions` section header in `reference/.../load.md` — stays `## Conventions`.
- The `## Missing conventions` and `## Local overrides` framing in `load.md` insofar as they refer to named rules (the items in the table) rather than the umbrella concept (see R4 for the umbrella-level wording in that file).

### R3 — Rename the `reference/conventions/` folder to `reference/configuration/` and fix all inbound links

Rename the folder and update every inbound path reference in the same change, so the tree stays buildable and every link resolves.

- **Folder:** `skills/radical-pipelines/reference/conventions/` → `skills/radical-pipelines/reference/configuration/`, moving all four files (`load.md`, `setup.md`, `claude-code.md`, `pi.md`). Use `git mv` to preserve rename history.
- **Inbound path references to update (5 known locations):**
  - `skills/radical-pipelines/SKILL.md` — `reference/conventions/load.md` → `reference/configuration/load.md`.
  - `README.md` — `./skills/radical-pipelines/reference/conventions/setup.md` → `./skills/radical-pipelines/reference/configuration/setup.md`.
  - `README.md` — `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` → `./skills/radical-pipelines/reference/configuration/load.md#local-overrides`.
  - `skills/radical-pipelines/reference/work-on-an-issue.md` — `conventions/load.md` → `configuration/load.md`.
  - `skills/radical-pipelines/reference/manage-issues.md` — `conventions/load.md` → `configuration/load.md`.
- Internal cross-links between the four moved files use bare filenames (e.g. load.md referencing `setup.md`) and survive the folder move untouched; they require no edits.
- The implementer must confirm no other inbound reference to the old folder path remains anywhere in the repository (outside frozen `.pipelines/**` history) after the move.

### R4 — Update umbrella-level terminology in SKILL.md and README.md

Update prose where "conventions" is used as the **umbrella** concept so it reads "configuration", while leaving named-rule and generic-English uses intact.

- **`skills/radical-pipelines/SKILL.md`** — the "Project conventions" section (currently around L42–L46): retitle and reword so the umbrella concept reads as "configuration" (e.g. heading and the sentence introducing that each project supplies and loads its own configuration), and update the `reference/conventions/load.md` link per R3.
- **`README.md`** — update the umbrella-level prose that frames the per-project system as "conventions" to "configuration", including the passages that currently describe "shared conventions" living in `.rp.md`, the `.rp.local.md` local-overrides framing, the setup flow writing project guidance, and the orchestrator loading/verifying the per-project rules. Update the two folder links per R3.
- Preserve named-rule wording inside these files (e.g. "the optional `Agent models` convention" and similar) — those are individual rules, not the umbrella.
- Distinguish umbrella uses from generic-English uses: README references to "the project conventions" the orchestrator follows when spawning teams describe the RP per-project system and are umbrella-level (update them); but any reference to conventions of a *host project being worked on* in agent files is generic English and is out of scope (see R5).

### R5 — Update the umbrella references in `load.md` / `setup.md` prose, keep the named-rule mechanics intact

Within the moved `reference/configuration/load.md` and `setup.md`:

- Where the prose introduces the **umbrella** concept (e.g. the file's framing that "each project has its own conventions" stored in `.rp.md`), update the umbrella wording to "configuration" consistently with R4, and ensure the file makes clear that `.rp.md` holds the project's **configuration**, of which the **Conventions** are one part.
- Keep the loader **table**, its `Convention` column header, the `## Conventions` section header, the per-rule names, the `## Missing conventions` flow, and the `## Local overrides` mechanics functionally and structurally unchanged — these operate on named rules and must continue to parse existing `.rp.md` files unchanged.
- Optionally (recommended, not required) add a brief one-line note in `setup.md` and/or `README.md` stating that "configuration" is the umbrella term and "conventions" is the section of per-project rules within it, to orient readers. No migration guide is produced.

### R6 — No breaking change to existing `.rp.md` files

Existing project `.rp.md` files (in other repositories using this skill) must remain valid with **zero modification** after this change.

- The loader consumes `.rp.md` by rule **name**, not by the umbrella header wording, and there is no version field or machine-enforced schema in `.rp.md`. The new header structure and umbrella renaming must not introduce any parsing dependency on the new title or the `## Conventions` header wording that would reject an old-format file.
- No dual-format support, no migration tooling, and no version gating are added.

### R7 — No behavioral change

The loader, setup flow, per-tool canonical blocks, local-overrides resolution, and agent context-passing behavior are unchanged. Only wording (the `.rp.md` title and umbrella prose, the one H2 header), and one folder name change; no rule header levels change.

---

## Out of Scope

- **Historical pipeline artifacts** under `.pipelines/**` — frozen records of past runs; left untouched.
- **The 36 named-rule "the X convention" references** — kept as-is by design (R2); not edited.
- **Generic English uses of "convention(s)"** that refer to a *host project being worked on* (in agent files) rather than RP's own per-project config concept — not changed.
- **Dual-format / migration support** for existing `.rp.md` files — not needed; there is no breaking change (R6).
- **Guardrails implementation** — no guardrails content, no `## Guardrails` H2 section, no loader integration, no setup steps, and no agent rewrites. This change only establishes the umbrella naming and flat structure so a sibling `## Guardrails` H2 can land later; guardrails are issue #51's scope, rebuilt on top of this rename.
- **Any change to loader parsing, setup logic, or pipeline runtime behavior** (R7).

---

## Acceptance Criteria

### `.rp.md` structure (R1)

1. The `.rp.md` title is exactly `# Radical Pipelines project configuration`.
2. `.rp.md` contains a flat `## Conventions` H2 and no `## Shared conventions` or `## Shared configuration` H2.
3. The named-rule headers stay at H3: `.rp.md` contains `### Managing tasks`, `### Pipeline slugs`, `### Artifact folders`, `### Commit format`, `### Worktrees`, `### Branch names`, `### Team spawning`, `### Agent models`, `### Health monitoring` directly under `## Conventions` — none demoted to H4.
4. Sub-headers nested beneath the rules (e.g. `#### Creating an issue` / `#### Modifying an issue` / `#### Orchestrator updates during a run` under "Managing tasks") remain at their current levels — no demotion anywhere.
5. The intro prose (L3) uses "configuration" as the umbrella term, frames conventions as one section of the configuration (with future guardrails as a sibling section), and preserves the shared-vs-per-tool reading instruction (the "Shared" qualifier now lives in this prose, not in the H2 header).
6. All rule body content (tables, lists, examples, commands, URLs) is byte-for-byte identical to before — only the title and the single H2 header change.
7. A future `## Guardrails` H2 could be added as a flat sibling of `## Conventions` under the configuration umbrella without further restructuring.

### Named-rule references preserved (R2)

8. All 36 "the **X** convention" occurrences across the 13 reference files are unchanged (verified by a repo-wide search for "convention" returning the same named-rule lines as before).
9. The loader table column header is still `Convention` and the loader section header is still `## Conventions`.

### Folder rename and links (R3)

10. The folder `skills/radical-pipelines/reference/configuration/` exists and contains `load.md`, `setup.md`, `claude-code.md`, `pi.md`; `skills/radical-pipelines/reference/conventions/` no longer exists.
11. The rename was performed with `git mv` (rename history preserved in `git log --follow` / `git status` showing renames, not delete+add).
12. All 5 inbound path references (SKILL.md ×1, README.md ×2, work-on-an-issue.md ×1, manage-issues.md ×1) point to `reference/configuration/...` / `configuration/load.md`.
13. No reference to `reference/conventions/` or `conventions/load.md` remains anywhere in the repository outside `.pipelines/**`.
14. Every Markdown link touched resolves to an existing file/anchor (e.g. `configuration/load.md#local-overrides` still points to the `## Local overrides` section).

### Umbrella terminology (R4, R5)

15. In `SKILL.md`, the section formerly titled "Project conventions" presents "configuration" as the umbrella concept, and its loader link targets `reference/configuration/load.md`.
16. In `README.md`, umbrella-level prose (shared per-project rules in `.rp.md`, `.rp.local.md` overrides framing, setup writing project guidance, orchestrator loading/verifying) reads "configuration" as the umbrella, while named-rule mentions (e.g. the `Agent models` convention) remain "convention".
17. In `configuration/load.md` and `setup.md`, umbrella-introducing prose reads "configuration", while the table, `Convention` column, `## Conventions`, `## Missing conventions`, and `## Local overrides` mechanics are functionally unchanged.

### No breaking change / no behavior change (R6, R7)

18. An unmodified pre-existing `.rp.md` (old title `# Radical Pipelines project conventions`, old `## Shared conventions` H2, H3 rule headers) would still be loaded and parsed by the updated loader without error — the rename introduces no schema or version gate.
19. No change is made to loader parsing logic, setup flow logic, per-tool canonical blocks, or local-overrides resolution behavior.

### Overall

20. The change is confined to terminology (the `.rp.md` title and umbrella prose, the single `## Conventions` H2 rename), and the one folder rename plus its inbound links; no rule header levels change, the repository builds/links cleanly, and a reviewer can confirm no behavioral diff.
