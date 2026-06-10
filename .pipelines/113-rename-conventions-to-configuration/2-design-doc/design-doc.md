# Design Doc: Rename the "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Status:** Ready for plan/code

This document is self-contained: a downstream plan or code agent can execute it without reading any other artifact. It synthesizes the approved spec into an architecture, an exact edit plan, the technical decisions and their trade-offs, and a verification strategy.

---

## 1. Problem and goal

Today **conventions** is the umbrella concept for everything a project declares to the Radical Pipelines skill. It shows up in three structural places and a lot of prose:

- the dogfood `.rp.md` is titled `# Radical Pipelines project conventions`, with a `## Shared conventions` H2;
- the skill stores its loader and setup docs under `reference/conventions/`;
- `README.md` and `SKILL.md` frame the whole per-project rule system as "conventions".

The goal is to make **configuration** the umbrella concept and recast **conventions** as one flat section inside it. After this change:

- `.rp.md` is titled `# Radical Pipelines project configuration`;
- its rule section is a flat `## Conventions` H2 (the word "Shared" moves into prose);
- the docs folder is `reference/configuration/`;
- umbrella prose in README/SKILL/load/setup reads "configuration".

This leaves a clean slot for a future `## Guardrails` H2 (issue #51) as a flat sibling of `## Conventions` under the configuration umbrella, without nesting either under a `## Shared configuration` wrapper.

**This is a docs/terminology + one folder rename only.** No pipeline behavior, loader parsing, setup logic, per-tool canonical blocks, or local-overrides resolution changes. Existing `.rp.md` files in other repositories must remain valid with zero modification.

---

## 2. The one distinction that drives every edit

The word "convention" is used two ways. They are treated **oppositely**, so every edit decision reduces to classifying which use you are looking at:

1. **Umbrella usage → rename to "configuration".** "conventions" as the top-level concept: the `.rp.md` title, the `reference/conventions/` folder name, and the umbrella prose in README/SKILL/load/setup that frames the *whole* per-project rule system.

2. **Named-rule usage → keep "convention" verbatim.** "the **X** convention" naming a single rule (e.g. "the **Worktrees** convention"). These name individual entries that live *inside* the `## Conventions` section, so the word stays correct. Also in this bucket: the loader table's `Convention` column header, and the `## Conventions` / `## Missing conventions` / `## Local overrides` section headers in `load.md`.

A third bucket is explicitly **out of scope**: generic-English uses of "convention(s)" that refer to a *host project being worked on* (in agent/phase files) rather than RP's own config concept. Do not touch these.

When in doubt during code, ask: *does this phrase name the whole per-project system (umbrella → configuration), or one specific rule / a loader mechanic (named-rule → leave alone)?*

---

## 3. Architecture: the target `.rp.md` structure

The decisive design choice is a **flat** header tree. Configuration is expressed by the **title only**; `## Conventions` is a flat H2, and rule headers stay at **H3 (no demotion)**.

```
# Radical Pipelines project configuration      <- umbrella (title only)
## Conventions                                  <- flat H2 (was "## Shared conventions")
### Managing tasks                              <- H3, unchanged
### Pipeline slugs
### Artifact folders
### Commit format
### Worktrees
### Branch names
### Team spawning
### Agent models
### Health monitoring
```

Sub-headers nested beneath rules (e.g. `#### Creating an issue` / `#### Modifying an issue` / `#### Orchestrator updates during a run` under "Managing tasks") also stay at their current levels.

Explicitly **rejected** shapes:

- No `## Shared configuration` umbrella H2.
- No `### Conventions` wrapper (no demotion of the H2 to H3).
- No demotion of any rule header from H3 to H4.

**Why flat:** a future `## Guardrails` H2 must be able to land as a peer of `## Conventions` directly under the configuration title. An umbrella H2 (`## Shared configuration`) or a nesting wrapper would force guardrails to nest as well, overloading the structure. The title-only umbrella keeps the tree shallow and the sibling slot obvious.

**Why "Shared" moves to prose, not the header:** the current `## Shared conventions` H2 carried two ideas — "this is the shared (cross-tool) section" and "these are the conventions". The rename keeps the section as the flat `## Conventions` H2 and relocates the "shared" reading instruction into the L3 intro prose, where it already partly lives. The intro must still tell the reader: the shared section applies to every agentic coding tool; per-tool sections add tool-specific entries; read the shared section plus the active tool's section at the start of any workflow.

---

## 4. Exact edit plan

The change is split into **two commits** so the folder rename stays a clean, reviewable `git mv`:

- **Commit 1 — terminology:** all prose/title/header wording edits, performed on files *in their current locations* (the four `reference/conventions/*.md` files are edited in place here).
- **Commit 2 — folder rename + inbound links:** `git mv` the folder and update every inbound path reference.

This ordering keeps the rename commit a pure move plus link fixes; doing wording edits inside the same commit as the move muddies `git mv`'s rename detection in review. (A code agent may also do rename-first; either order is acceptable as long as the final tree is correct. The two-commit split is the recommended default.)

> **Counts in this section are starting estimates, not contracts.** The authoritative requirement is *completeness*: every umbrella use becomes "configuration", every named-rule use is preserved, and the folder path resolves everywhere. The code agent **must** re-derive the actual set with the grep assertions in §6 rather than trusting any number below. The repo currently shows **34** bold "the **X** convention" named-rule occurrences and **7** inbound folder-path references (the spec listed 5; a grep found 2 more in `health-monitoring.md`). Verify both during code, and treat the binding rule as the acceptance-criterion grep — "zero `reference/conventions/` or `conventions/{load,setup,claude-code,pi}.md` references outside `.pipelines/**`" — not any hardcoded number.

### Commit 1 — terminology edits

#### 4.1 `.rp.md` (repo root)

| Line | Current | Target |
|------|---------|--------|
| 1 (title) | `# Radical Pipelines project conventions` | `# Radical Pipelines project configuration` |
| 3 (intro prose) | "This file holds the conventions for this project. The shared section applies to every agentic coding tool used here; **the per-tool sections add conventions specific to Claude Code and Pi.** Read the shared section plus the section for the active tool at the start of any workflow." | Rewrite so the umbrella term is "configuration" **and the per-tool-H2-sections claim is removed** (see reconciliation below). Suggested: "This file holds the configuration for this project. The Conventions section (and a future Guardrails section) apply to every agentic coding tool used here; tool-specific guidance is documented in the reference files (`claude-code.md`, `pi.md`). Read the Conventions section plus the reference file for the active tool at the start of any workflow." |
| 5 (H2) | `## Shared conventions` | `## Conventions` |

Everything from `### Managing tasks` onward (all rule headers, tables, lists, examples, commands, URLs) is **byte-for-byte unchanged**. The named-rule occurrences of "convention" inside the rule bodies are not touched.

> **Reconciliation (intro prose must not assert per-tool H2 sections).** The current L3 says "the per-tool sections add conventions specific to Claude Code and Pi", implying per-tool H2 sections exist *in this file*. They do not: the dogfood `.rp.md` is Claude-Code-only and, after flattening, has a single `## Conventions` H2 with no per-tool H2 siblings. Per-tool guidance lives in the reference files (`claude-code.md` / `pi.md`), not in `.rp.md` H2 sections. The rewritten intro must therefore point readers to those reference files for tool-specific guidance rather than to non-existent per-tool sections. Binding constraints for the rewrite: (a) umbrella term reads "configuration"; (b) it frames Conventions as one section of the configuration with Guardrails as a future sibling; (c) it preserves the shared-vs-per-tool reading instruction **without** implying per-tool H2 sections exist in this file — tool-specific guidance is in the reference files. The exact wording is a recommendation; these three constraints are binding.

#### 4.2 `skills/radical-pipelines/SKILL.md`

| Line (approx) | Current | Target |
|------|---------|--------|
| 42 (H2) | `## Project conventions` | `## Project configuration` |
| 44 (prose) | "This skill is generic; each project supplies its own conventions that you must load and verify before doing any workflow." | "This skill is generic; each project supplies its own configuration that you must load and verify before doing any workflow." |
| 46 (path) | "See `reference/conventions/load.md` for the full list and the rules for loading them..." | "See `reference/configuration/load.md` for the full list and the rules for loading them..." (the path half lands with Commit 2; the wording half is fine to do here — see note) |

> Path-string note: the line-46 path `reference/conventions/load.md` → `reference/configuration/load.md` is an **inbound folder reference** and is listed again in Commit 2 (§4.6). It does not matter whether the code agent edits the path string in Commit 1 or Commit 2, as long as the final SKILL.md points to `reference/configuration/load.md`. Do not double-edit.

#### 4.3 `README.md`

README already has a `## Configuration` H2 section header (do **not** rename anything to add a second one — the section heading stays). Inside it and elsewhere, update **umbrella** uses to "configuration" while preserving **named-rule** uses ("the `Agent models` convention", etc.).

Umbrella edits (line numbers approximate — grep to locate):

1. **L129** — "The orchestrator creates one `pi-teams` team per pipeline and spawns the phase agents at runtime, following the project conventions." → "...following the project configuration." (This is umbrella: it names the whole per-project system the orchestrator follows.)
2. **L145** — "each project defines its own conventions for things like the task source... A project's shared conventions live in a committed `.rp.md` file..." → "each project defines its own configuration for things like... A project's shared configuration (the Conventions section) lives in a committed `.rp.md` file..."
3. **L147** — two umbrella uses: "If required conventions are missing when a workflow starts..." → "If required configuration is missing..."; and "Shared project conventions include task tracking..." → "Shared project configuration includes task tracking...". **Preserve named-rule uses on this same line:** "Claude Code conventions add..." and "Pi conventions add..." describe the per-tool sets of project config (umbrella → "configuration"), **but** the two `Agent models` mentions ("an optional `Agent models` convention", "the same optional `Agent models` convention") are **named rules — keep "convention"**. Also update the inline link `./skills/radical-pipelines/reference/conventions/setup.md` per Commit 2.
4. **L149** — "A developer can override a restricted subset of conventions..." → "...a restricted subset of configuration..."; "...the convention loader for details." → "...the configuration loader for details." Update the inline link `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` per Commit 2.
5. **L155** — "The orchestrator loads and verifies conventions before launching phase agents." → "The orchestrator loads and verifies configuration before launching phase agents." (Umbrella: the per-project system the orchestrator loads.) **Preserve the named-rule list later in the same paragraph** — "the role-specific host-project conventions listed in the agent profile" refers to host-project conventions of the project being worked on, which is **generic/host-project English and out of scope** (do not change it). Classify the two occurrences on this paragraph individually.
6. **L159 (structural reconciliation — see below)** — the sentence describing `.rp.md` as "a shared section ... followed by a per-tool section" and the dogfood file carrying "both the Claude Code and the Pi per-tool sections side-by-side" contradicts the flat single-`## Conventions` structure. Reword per the reconciliation note below.

> README L147 is the trickiest line: it mixes umbrella uses ("Claude Code conventions add...", "Shared project conventions include...") with two named-rule uses ("`Agent models` convention"). Treat the bare/plural umbrella references as configuration; keep the two backtick-`Agent models`-named-rule references as "convention". When code rewrites this line, re-read the whole sentence and classify each occurrence individually.

The named-rule `Agent models` mentions are the canonical example of "preserve named-rule wording inside README" (spec R4 / AC16).

> **Reconciliation — README L159 structural contradiction.** The current L159 reads: *"A project's committed `.rp.md` is organized as a shared section (...) followed by a per-tool section covering only what depends on the active tool (...). A normal single-CLI consumer carries just the shared section plus the one tool block its CLI uses. This repository is the unusual case: ... so its `.rp.md` is hand-maintained to carry the shared section plus both the Claude Code and the Pi per-tool sections side-by-side."*
>
> This describes the **old** "shared H2 + per-tool H2 sections" split. After R1 flattens the dogfood `.rp.md` to a single `## Conventions` H2 with **no** per-tool H2 sections (per-tool guidance lives in the reference files `claude-code.md` / `pi.md`), this wording is self-contradictory against the file it documents. **Reword L159 to describe the flat structure:** `.rp.md` is organized under a `## Conventions` section (with a future `## Guardrails` section as a sibling under the configuration umbrella), and per-tool guidance is documented separately in the reference files (`claude-code.md`, `pi.md`) rather than in per-tool H2 sections of `.rp.md`. Binding constraints: (a) no claim that `.rp.md` contains per-tool H2 sections; (b) it must remain accurate that this repo is the multi-CLI dogfood case, but state that as "the reference files cover both Claude Code and Pi" rather than "both per-tool sections live side-by-side in `.rp.md`"; (c) umbrella term reads "configuration"; (d) preserve the meaning that a normal consumer needs the shared rules plus the active tool's reference file. (The earlier L129-region sentence — "its `.rp.md` is hand-maintained to carry the shared section plus both the Claude Code and the Pi per-tool sections" — is the same contradiction restated; reconcile both occurrences consistently. Grep README for "per-tool section" to find every instance.)

#### 4.4 `reference/conventions/load.md` (edited in place in Commit 1; moved in Commit 2)

| Line | Current | Target |
|------|---------|--------|
| 1 (title) | `# Load Conventions` | `# Load Configuration` |
| 3 (prose) | "This skill is generic, but each project has its own conventions that you must follow." | "This skill is generic, but each project has its own configuration that you must follow." |
| 5 (prose) | "Project-specific conventions are stored in the `.rp.md` file." | "Project-specific configuration is stored in the `.rp.md` file (the Conventions are one section within it)." |

**Keep unchanged** (named-rule mechanics): the `## Conventions` section header, the loader **table** including its **`Convention` column header** and every rule name/row, the `## Missing conventions` section and its flow, and the `## Local overrides` section and its mechanics. These parse existing `.rp.md` files and must not change structurally or functionally.

#### 4.5 `reference/conventions/setup.md` (edited in place in Commit 1; moved in Commit 2)

| Line | Current | Target |
|------|---------|--------|
| 1 (title) | `# Setup Conventions` | `# Setup Configuration` |
| 3 (prose) | "Use this setup flow when required conventions are missing before a workflow starts." | "Use this setup flow when required configuration is missing before a workflow starts." |

Then scan the rest of `setup.md` for any further **umbrella** uses of "conventions" and update them to "configuration"; keep any named-rule mentions and the setup mechanics unchanged. (Optional, recommended per spec R5: a one-line note that "configuration" is the umbrella term and "Conventions" is the section of per-project rules within it.)

`claude-code.md` and `pi.md` in the folder are per-tool canonical blocks; they move in Commit 2 but their content is not edited unless grep surfaces an umbrella use (none expected — verify).

### Commit 2 — folder rename + inbound link updates

#### 4.6 Rename the folder with `git mv`

```
git mv skills/radical-pipelines/reference/conventions skills/radical-pipelines/reference/configuration
```

This moves all four files (`load.md`, `setup.md`, `claude-code.md`, `pi.md`) and preserves rename history (`git log --follow`, `git status` shows renames not delete+add). Internal cross-links between the four moved files use **bare filenames** (e.g. `load.md` referencing `setup.md`), so they survive the move untouched — do not edit them.

#### 4.7 Update inbound path references (7 known; **grep to confirm the full set**)

| # | File | Current path fragment | Target |
|---|------|----------------------|--------|
| 1 | `skills/radical-pipelines/SKILL.md` | `reference/conventions/load.md` | `reference/configuration/load.md` |
| 2 | `README.md` | `./skills/radical-pipelines/reference/conventions/setup.md` | `./skills/radical-pipelines/reference/configuration/setup.md` |
| 3 | `README.md` | `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` | `./skills/radical-pipelines/reference/configuration/load.md#local-overrides` |
| 4 | `skills/radical-pipelines/reference/work-on-an-issue.md` | `conventions/load.md` | `configuration/load.md` |
| 5 | `skills/radical-pipelines/reference/manage-issues.md` | `conventions/load.md` | `configuration/load.md` |
| 6 | `skills/radical-pipelines/reference/health-monitoring.md` | `conventions/claude-code.md` **and** `conventions/pi.md` (one line) | `configuration/claude-code.md` **and** `configuration/pi.md` |
| 7 | `skills/radical-pipelines/reference/health-monitoring.md` | `conventions/claude-code.md` **and** `conventions/pi.md` (a second line) | `configuration/claude-code.md` **and** `configuration/pi.md` |

> **Inbound references are 7, not 5.** The spec enumerated 5; a grep found **2 more in `skills/radical-pipelines/reference/health-monitoring.md`** (around L13 and L79). Each of those two lines references **both** `conventions/claude-code.md` **and** `conventions/pi.md` in the same sentence ("see `conventions/claude-code.md` or `conventions/pi.md`"), so each line needs both path strings updated. These were omitted from the spec's list but are required to satisfy AC13 ("no reference to `reference/conventions/` ... remains outside `.pipelines/**`"). The surrounding prose on those lines ("The active tool's rules ...") is fine; **only the path strings change**.

The `work-on-an-issue.md`, `manage-issues.md`, and `health-monitoring.md` lines are **path-only** edits. Their surrounding prose ("make sure project conventions are loaded", "The active tool's rules ...") refers to the loaded per-project system; per the spec these are not in the umbrella-rename target list for those agent files — change **only the path strings** (`conventions/load.md` → `configuration/load.md`, `conventions/claude-code.md` → `configuration/claude-code.md`, `conventions/pi.md` → `configuration/pi.md`). Do not reword the prose in those files; that keeps the change minimal and avoids touching named-rule/generic-English uses. (The `manage-issues.md` line also contains "the **Issues** convention" — a named rule that must stay verbatim.)

The "7 known" figure is the starting set the code agent must **prove complete** via §6 grep, not assume — the binding requirement is the AC13 grep returning zero matches, whatever the count turns out to be.

---

## 5. Technical decisions and trade-offs

### Decision 1 — Flat structure, title-only umbrella (no `## Shared configuration`)
Configuration lives in the H1 title; `## Conventions` is a flat H2. **Trade-off:** the H1 is now the only place the umbrella appears structurally, which is intentional — it keeps the body shallow so `## Guardrails` is an obvious sibling. Rejected the umbrella-H2 alternative because it would force every future section to nest under it. **Spec:** R1, AC1–7.

### Decision 2 — Keep all named-rule "the **X** convention" references unchanged
Every "the **X** convention" phrase, the loader `Convention` column, and the `## Conventions` / `## Missing conventions` / `## Local overrides` headers stay verbatim. **Trade-off:** the codebase will contain both "configuration" (umbrella) and "convention" (named rule) — by design, because they mean different things. The risk is an over-eager find-replace; §6's verification exists specifically to catch that. **Spec:** R2, AC8–9.

### Decision 3 — Folder rename via `git mv` with coupled link updates
`reference/conventions/` → `reference/configuration/` as a single move; all inbound links updated in the same change so the tree stays buildable and every link resolves. **Trade-off:** any external bookmark to the old path breaks, which is acceptable for an internal skill docs folder with no stability contract. **Spec:** R3, AC10–14.

### Decision 4 — `load.md` / `setup.md` titles become "Load Configuration" / "Setup Configuration"
The spec does not prescribe these titles. We adopt the configuration-umbrella wording because the files describe loading/setting up the project **configuration**, even though the table mechanics inside operate at the Conventions level. **Trade-off:** a reader skimming titles might expect the inner table to be relabeled too; the opening prose clarifies that Conventions is one section within the configuration. **Spec:** R5 (titles left to implementer; this resolves the edge case).

### Decision 5 — No breaking change, no behavioral change
The loader consumes `.rp.md` by rule **name**, not by the title or the H2 wording; there is no version field or schema gate. The new title and umbrella renaming introduce **no** parsing dependency that would reject an old-format file (old title `# Radical Pipelines project conventions`, old `## Shared conventions` H2, H3 rule headers). No dual-format support or migration tooling is added. **Spec:** R6–R7, AC18–20.

---

## 6. Verification strategy

Run all of these from the worktree root after both commits. Every assertion must hold. `.pipelines/**` is frozen historical record and is excluded from every check.

### 6.1 Folder rename complete and history preserved
```bash
# New folder exists with all four files; old folder is gone.
ls skills/radical-pipelines/reference/configuration/        # load.md setup.md claude-code.md pi.md
test ! -d skills/radical-pipelines/reference/conventions/ && echo "old folder gone"

# Rename recorded as a move, not delete+add.
git log --follow --oneline -- skills/radical-pipelines/reference/configuration/load.md | head
git status                                                  # shows renamed:, not deleted/new
```
**Pass:** new folder has exactly the four files; old folder absent; history follows through the rename. (AC10–11)

### 6.2 No stale inbound path references remain — both prefixed AND bare forms
**Requirement:** every inbound link to the moved folder resolves; **no path component `conventions/` referencing the moved files (`load.md`, `setup.md`, `claude-code.md`, `pi.md`) remains** anywhere outside `.pipelines/**`. This is derived by grep, **not** a hardcoded count.

> **Grep gap to avoid (this is a real trap).** Inbound references appear in **two forms**:
> - **Prefixed:** `reference/conventions/load.md` (SKILL.md, README.md links).
> - **Bare** (no `reference/` prefix): `conventions/load.md` (work-on-an-issue.md, manage-issues.md) and `conventions/claude-code.md` / `conventions/pi.md` (health-monitoring.md L13, L79).
>
> A grep for `reference/conventions/` alone will **not** match the bare `conventions/claude-code.md` form, so it would **falsely pass** while leaving `health-monitoring.md` broken. The assertion must catch **both** forms.

Run both of these; **both** must return zero matches outside `.pipelines/`:
```bash
# (a) catches every reference to the four moved files by either prefixed or bare path:
grep -rnE "conventions/(load|setup|claude-code|pi)\.md" --include="*.md" . | grep -v "\.pipelines/"

# (b) belt-and-suspenders — catches the prefixed folder path in any other context:
grep -rn "reference/conventions/" --include="*.md" . | grep -v "\.pipelines/"
```
**Pass:** **both** greps return **zero** matches outside `.pipelines/`. This is the binding completeness check — it must hold regardless of how many inbound references existed (7 known: SKILL.md ×1, README.md ×2, work-on-an-issue.md ×1, manage-issues.md ×1, health-monitoring.md ×2). (AC12–13)

### 6.3 Every touched Markdown link resolves
Confirm each updated path points to a real file/anchor:
- `reference/configuration/load.md` and `reference/configuration/setup.md` exist (6.1).
- `configuration/load.md#local-overrides` still points to a `## Local overrides` heading in `load.md`:
```bash
grep -n "^## Local overrides" skills/radical-pipelines/reference/configuration/load.md
```
**Pass:** anchor target exists. (AC14)

### 6.4 `.rp.md` structure matches spec exactly
```bash
head -1 .rp.md                                   # exactly: # Radical Pipelines project configuration
grep -n "^# \|^## \|^### " .rp.md | head -40
```
**Pass:**
- Title line is exactly `# Radical Pipelines project configuration`.
- Exactly one `## Conventions`; **no** `## Shared conventions` and **no** `## Shared configuration`.
- These nine H3 headers appear directly under `## Conventions`: `### Managing tasks`, `### Pipeline slugs`, `### Artifact folders`, `### Commit format`, `### Worktrees`, `### Branch names`, `### Team spawning`, `### Agent models`, `### Health monitoring` — none demoted to H4.
- Sub-headers under rules (e.g. `#### Creating an issue`) remain at their current levels. (AC1–4, 7)

### 6.5 Rule bodies are byte-for-byte unchanged
```bash
# Diff only the .rp.md change; confirm edits are confined to L1, L3, L5.
git diff <base>..HEAD -- .rp.md
```
**Pass:** the `.rp.md` diff touches **only** the title (L1), the intro prose (L3), and the H2 header (L5). No table/list/example/command/URL line changes. (AC6)

### 6.6 Named-rule references preserved (the anti-overreach check)
```bash
# Snapshot the named-rule lines before and after; they must be identical.
git stash list  # n/a — instead diff against base:
git diff <base>..HEAD -- '*.md' ':(exclude).pipelines/**' | grep -E "^[-+].*convention"
```
Manually confirm every `-`/`+` pair that contains "convention" is an **umbrella → configuration** change, and that **no** line matching `the \*\*[A-Za-z ]+\*\* convention` was altered. Also assert the loader mechanics are intact:
```bash
grep -n "^## Conventions\|^## Missing conventions\|^## Local overrides\|| Convention " \
  skills/radical-pipelines/reference/configuration/load.md
```
**Pass:** all named-rule "the **X** convention" lines are byte-identical to base; the loader `Convention` column header and the three section headers are present and unchanged. The pre-change repo shows **34** bold named-rule occurrences — confirm the same count post-change:
```bash
grep -rEn "the \*\*[A-Za-z ]+\*\* convention" --include="*.md" . | grep -v "\.pipelines/" | wc -l
```
**Pass:** count is identical before and after (currently 34). (AC8–9)

### 6.7 Umbrella terminology converted in the four prose files
```bash
grep -n "configuration" .rp.md skills/radical-pipelines/SKILL.md \
  skills/radical-pipelines/reference/configuration/load.md \
  skills/radical-pipelines/reference/configuration/setup.md README.md
```
Spot-check that:
- `SKILL.md` section reads `## Project configuration` and the loader link targets `reference/configuration/load.md`. (AC15)
- README umbrella prose (shared per-project rules in `.rp.md`, `.rp.local.md` overrides framing, setup writing project guidance, orchestrator following the per-project system) reads "configuration", while the two `Agent models` named-rule mentions still read "convention". (AC16)
- `load.md` title is `# Load Configuration`, `setup.md` title is `# Setup Configuration`, and umbrella-introducing prose reads "configuration". (AC17)

### 6.8 Structural-description reconciliation (no stale per-tool-H2 claim)
The flattened `.rp.md` has a single `## Conventions` H2 with no per-tool H2 sections. Confirm no surviving prose still claims `.rp.md` is organized into per-tool H2 sections:
```bash
# README and .rp.md should no longer describe per-tool H2 SECTIONS living inside .rp.md.
grep -rn "per-tool section\|per-tool sections\|sections side-by-side" \
  README.md .rp.md
```
**Pass:** any remaining "per-tool" mentions describe *reference files* (`claude-code.md` / `pi.md`) or per-tool *guidance*, not H2 sections inside `.rp.md`. The README L159-region sentence and the `.rp.md` L3 intro both read consistently with the flat single-`## Conventions` structure (per-tool guidance documented in the reference files). Manually read both passages to confirm they are internally consistent with the actual file structure.

### 6.9 No breaking / no behavioral change
This is a review assertion, not a script: confirm the diff is confined to wording (title, umbrella prose, the single H2 rename, the structural-description reconciliation) plus the folder rename and its inbound links. Confirm **no** edit touches loader parsing logic, the setup flow logic, per-tool canonical blocks (`claude-code.md` / `pi.md` content), or local-overrides resolution. An unmodified old-format `.rp.md` (old title, `## Shared conventions` H2, H3 rules) would still load because the loader keys on rule **names**, with no version/schema gate introduced. (AC18–20)

---

## 7. Scope guardrails (do not touch)

- `.pipelines/**` — frozen historical artifacts; excluded from every grep and edit.
- The 34 named-rule "the **X** convention" references — preserved verbatim (Decision 2).
- Generic-English "convention(s)" referring to a *host project being worked on* in agent/phase files — out of scope.
- Loader parsing, setup logic, per-tool canonical blocks, local-overrides resolution, pipeline runtime — unchanged.
- No `## Guardrails` content, loader integration, or setup steps — that is issue #51, built on top of this rename.
