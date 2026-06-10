# Code Plan: Rename the "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Inputs:** approved [spec](../1-spec/spec.md) and [design doc](../2-design-doc/design-doc.md) (both authoritative).

---

## Nature of this change

This is a **docs/terminology refactor of this repo (the skill itself)**. The "code" is Markdown. There is **no executable code and no unit tests**. Every Acceptance below is a **grep assertion, a Markdown-link/anchor-resolution check, or a structural header-level check** — all machine-checkable from the worktree root. The binding completeness signal for the folder rename is the §6.2 dual grep returning **zero** matches outside `.pipelines/**`; the binding anti-overreach signal is the §6.6 named-rule count staying at **34**.

All paths below are repo-relative to the worktree root `/Users/luisherranz/Code/radical-pipelines/.claude/worktrees/113-rename-conventions-to-configuration`. The base ref for all `git diff <base>..HEAD` assertions is the merge-base with `trunk`: **`38a1589`** (use `git merge-base HEAD trunk` if it has moved).

## The one distinction every task must apply (design §2)

- **Umbrella usage → rename to "configuration":** the `.rp.md` title, the `reference/conventions/` folder name, and umbrella prose in README/SKILL/load/setup that frames the *whole* per-project rule system.
- **Named-rule usage → keep "convention" verbatim:** "the **X** convention" (e.g. "the **Worktrees** convention"), the loader table's `Convention` column header, and the `## Conventions` / `## Missing conventions` / `## Local overrides` section headers in `load.md`.
- **Out of scope — do not touch:** generic-English "convention(s)" referring to a *host project being worked on* in agent/phase files; the 34 named-rule occurrences; everything under `.pipelines/**`.

## Commit shape (design §4)

Two commits, mapped to task groups:

- **Commit 1 — terminology** (tasks 1–5): all prose/title/header wording edits, performed on files **in their current locations** (the four `reference/conventions/*.md` files are edited in place here, before the move).
- **Commit 2 — folder rename + inbound links** (tasks 6–7): `git mv` the folder, then update every inbound path reference.

Ordering rationale (design §4, §4.6): editing the `reference/conventions/*.md` files **before** the move (tasks 4–5 → task 6) keeps the rename a pure `git mv` plus link fixes, so `git mv` rename detection stays clean in review. Task 6 (the move) must run **after** tasks 4–5 (in-place edits) and **before** task 7 (inbound link fixes that point at the new path). Make these dependencies explicit; do not reorder them.

Commit messages (project format — imperative, sentence case, no trailing period, agent in parens), e.g.:
- Commit 1: `Rename conventions umbrella to configuration in prose and titles (code-writer)`
- Commit 2: `Rename reference/conventions folder to configuration and fix inbound links (code-writer)`

---

## Task 1 — Restructure `.rp.md` (title, intro prose, single H2)

**Goal:** Make "configuration" the umbrella via the title only; flatten `## Shared conventions` to a flat `## Conventions` H2; rewrite the L3 intro so the umbrella reads "configuration" and the per-tool reading instruction no longer claims per-tool H2 sections exist in this file. No rule header is demoted; all rule bodies stay byte-for-byte identical.

**Files:** `.rp.md` (repo root).

**Changes** (design §4.1; only L1, L3, L5 change — verified current content matches):
- **L1 title:** `# Radical Pipelines project conventions` → `# Radical Pipelines project configuration`.
- **L5 H2:** `## Shared conventions` → `## Conventions`.
- **L3 intro prose:** rewrite. Current text: *"This file holds the conventions for this project. The shared section applies to every agentic coding tool used here; the per-tool sections add conventions specific to Claude Code and Pi. Read the shared section plus the section for the active tool at the start of any workflow."* Three **binding** constraints for the rewrite (exact wording is a recommendation, design §4.1 reconciliation note): (a) the umbrella term reads "configuration"; (b) it frames Conventions as one section of the configuration with Guardrails as a future sibling section; (c) it preserves the shared-vs-per-tool reading instruction **without** implying per-tool H2 sections exist in this file — tool-specific guidance lives in the reference files (`claude-code.md`, `pi.md`). Recommended wording (design §4.1): *"This file holds the configuration for this project. The Conventions section (and a future Guardrails section) apply to every agentic coding tool used here; tool-specific guidance is documented in the reference files (`claude-code.md`, `pi.md`). Read the Conventions section plus the reference file for the active tool at the start of any workflow."*
- **Do NOT touch** anything from `### Managing tasks` onward: all rule H3 headers, the `#### Creating an issue` / `#### Modifying an issue` / `#### Orchestrator updates during a run` sub-headers, and every table/list/example/command/URL stay byte-for-byte identical. Do not touch named-rule "convention" mentions inside rule bodies.

**Depends on:** none.

**Traces to:** spec R1, AC1–7 (and AC5 for the intro reconciliation); design §3, §4.1.

**Acceptance** (run from worktree root; design §6.4, §6.5):
1. `head -1 .rp.md` is **exactly** `# Radical Pipelines project configuration`.
2. `grep -c "^## Conventions$" .rp.md` returns `1`; `grep -nE "^## Shared (conventions|configuration)$|^## Shared configuration$" .rp.md` returns **zero** matches (no `## Shared conventions` and no `## Shared configuration`).
3. `grep -nE "^### (Managing tasks|Pipeline slugs|Artifact folders|Commit format|Worktrees|Branch names|Team spawning|Agent models|Health monitoring)$" .rp.md` returns all nine headers, each at H3 — **none** demoted to `####`.
4. Sub-headers `#### Creating an issue`, `#### Modifying an issue`, `#### Orchestrator updates during a run` remain at their current `####` level (`grep -n "^#### " .rp.md` unchanged from base for these lines).
5. `git diff 38a1589..HEAD -- .rp.md` touches **only** L1, L3, and L5 — no table/list/example/command/URL line appears in the diff body (byte-for-byte rule bodies, AC6).
6. The rewritten L3 contains "configuration", references a future "Guardrails" sibling, points tool-specific guidance to `claude-code.md` / `pi.md` (reference files), and does **not** assert per-tool H2 sections exist: `grep -n "per-tool section" .rp.md` returns **zero** matches (design §6.8).

---

## Task 2 — Convert umbrella terminology in `SKILL.md`

**Goal:** Retitle the "Project conventions" section and reword its umbrella prose to "configuration". The loader-link path string (`reference/conventions/load.md` → `reference/configuration/load.md`) is owned by Task 7 (Commit 2); this task changes only wording, leaving the path edit to Task 7 to avoid a double-edit (design §4.2 path-string note).

**Files:** `skills/radical-pipelines/SKILL.md`.

**Changes** (design §4.2; verified current content at L42–46):
- **L42 H2:** `## Project conventions` → `## Project configuration`.
- **L44 prose:** `This skill is generic; each project supplies its own conventions that you must load and verify before doing any workflow.` → `...each project supplies its own configuration that you must load and verify before doing any workflow.`
- **L46 path line:** leave the `reference/conventions/load.md` path string **unchanged in this task** — Task 7 updates it. (If the implementer prefers, the path may be updated here instead; but it must be edited **exactly once** across tasks 2 and 7. Default: edit it in Task 7.)

**Depends on:** none.

**Traces to:** spec R4, AC15; design §4.2.

**Acceptance** (design §6.7):
1. `grep -n "^## Project configuration$" skills/radical-pipelines/SKILL.md` returns one match; `grep -n "^## Project conventions$" skills/radical-pipelines/SKILL.md` returns **zero**.
2. `grep -n "supplies its own configuration" skills/radical-pipelines/SKILL.md` returns one match; `grep -n "supplies its own conventions" skills/radical-pipelines/SKILL.md` returns **zero**.
3. No named-rule "the **X** convention" phrasing in `SKILL.md` was altered (none exists there; `git diff 38a1589..HEAD -- skills/radical-pipelines/SKILL.md` shows only the two wording lines, plus possibly the L46 path if the implementer chose to do it here).

---

## Task 3 — Convert umbrella terminology in `README.md` (prose only; folder-link paths deferred to Task 7)

**Goal:** Update umbrella uses of "conventions" to "configuration" in README prose while preserving named-rule uses (the two `Agent models` mentions) and out-of-scope host-project/generic uses. Reconcile the stale "per-tool sections side-by-side" structural description to match the flat `## Conventions` structure. The two folder-link path strings (`reference/conventions/setup.md`, `reference/conventions/load.md#local-overrides`) are owned by Task 7; this task changes only the surrounding prose words, not those path strings.

**Files:** `README.md`.

**Changes** (design §4.3; line numbers verified, grep to relocate before editing — classify each "convention" occurrence individually):
- **L129:** `...following the project conventions.` → `...following the project configuration.` (umbrella).
- **L145:** `If required conventions are missing when a workflow starts...` → `If required configuration is missing when a workflow starts...` (umbrella).
- **L147 (trickiest — classify each occurrence):**
  - `Shared project conventions include task tracking...` → `Shared project configuration includes task tracking...` (umbrella; note verb agreement "include" → "includes").
  - `Claude Code conventions add...` → `Claude Code configuration adds...` and `Pi conventions add...` → `Pi configuration adds...` (umbrella per-tool sets; note verb agreement).
  - **KEEP verbatim (named rules):** `an optional ``Agent models`` convention` and `the same optional ``Agent models`` convention` — do **not** change "convention" → "configuration" on these two.
  - The inline link path `./skills/radical-pipelines/reference/conventions/setup.md` — **leave the path string for Task 7**; the link text "[setup conventions]" may be left as-is (it is a link label to the setup file; not a named-rule, but changing it is optional). Recommended: leave link label unchanged, let Task 7 handle the path.
- **L149:** `...override a restricted subset of conventions...` → `...a restricted subset of configuration...`; `...the convention loader for details.` → `...the configuration loader for details.` (umbrella). Leave the `reference/conventions/load.md#local-overrides` path string for Task 7.
- **L155:** `The orchestrator loads and verifies conventions before launching phase agents.` → `...loads and verifies configuration before...` (umbrella). **KEEP unchanged** later in the same paragraph: `the role-specific host-project conventions listed in the agent profile` — this is generic/host-project English, out of scope (design §4.3 item 5).
- **L159 (structural reconciliation — design §4.3 reconciliation note):** the current sentence describes `.rp.md` as "a shared section ... followed by a per-tool section" and "carry the shared section plus both the Claude Code and the Pi per-tool sections side-by-side". Reword to describe the **flat** structure. Binding constraints: (a) no claim that `.rp.md` contains per-tool H2 sections; (b) remain accurate that this repo is the multi-CLI dogfood case, stated as "the reference files cover both Claude Code and Pi" rather than "both per-tool sections live side-by-side in `.rp.md`"; (c) umbrella term reads "configuration"; (d) preserve the meaning that a normal consumer needs the shared rules plus the active tool's reference file. Grep README for `per-tool section` to find and reconcile **every** instance (design §6.8).

**Depends on:** none.

**Traces to:** spec R4, AC16; design §4.3, §6.8.

**Acceptance** (design §6.6, §6.7, §6.8):
1. `grep -n "project conventions\|shared project conventions\|Shared project conventions" README.md | grep -v "host-project conventions"` returns **zero** umbrella matches (the only surviving "conventions" should be the out-of-scope `host-project conventions` on L155 and named-rule contexts).
2. The two named-rule mentions survive verbatim: `grep -c "\`Agent models\` convention" README.md` returns the same count as base (2).
3. The out-of-scope host-project phrase survives: `grep -n "host-project conventions" README.md` still returns one match (L155).
4. `grep -n "per-tool section" README.md` returns **zero** matches (the side-by-side per-tool-H2 description is gone; design §6.8); any surviving "per-tool" mention refers to reference files / guidance, not H2 sections inside `.rp.md`.
5. Manual: re-read L147 and the L159 region — every `convention→configuration` change is an umbrella change; the two `Agent models` named rules and the `host-project conventions` phrase are untouched; the L159 region is internally consistent with the flat single-`## Conventions` structure.
6. The two folder-link path strings (`reference/conventions/setup.md`, `reference/conventions/load.md#local-overrides`) are **still present** after this task (they get updated in Task 7) — confirming Task 3 did not touch them; OR if the implementer chose to update them here, they appear exactly once. Default: untouched here.

---

## Task 4 — Convert umbrella terminology in `reference/conventions/load.md` (edit in place, pre-move)

**Goal:** Update the file title and umbrella-introducing prose to "configuration" while keeping all loader mechanics — the table, its `Convention` column header, and the `## Conventions` / `## Missing conventions` / `## Local overrides` section headers — functionally and structurally unchanged. Edited in its **current** location `reference/conventions/load.md`; the move happens in Task 6.

**Files:** `skills/radical-pipelines/reference/conventions/load.md`.

**Changes** (design §4.4; verified current content at L1, L3, L5):
- **L1 title:** `# Load Conventions` → `# Load Configuration`.
- **L3 prose:** `This skill is generic, but each project has its own conventions that you must follow.` → `...each project has its own configuration that you must follow.`
- **L5 prose:** `Project-specific conventions are stored in the \`.rp.md\` file. Read it at the start of any workflow.` → `Project-specific configuration is stored in the \`.rp.md\` file (the Conventions are one section within it). Read it at the start of any workflow.`
- **Do NOT change** (named-rule mechanics): the `## Conventions` (L9), `## Missing conventions` (L23), `## Local overrides` (L31) section headers; the loader table including its `Convention` column header (L11) and every rule name/row; the `## Missing conventions` flow; the `## Local overrides` mechanics.

**Depends on:** none (must complete before Task 6 moves the file).

**Traces to:** spec R5, AC17; design §4.4, Decision 4.

**Acceptance** (design §6.6, §6.7):
1. `head -1 skills/radical-pipelines/reference/conventions/load.md` is `# Load Configuration`.
2. `grep -n "each project has its own configuration" skills/radical-pipelines/reference/conventions/load.md` returns one match; `grep -n "each project has its own conventions" ...load.md` returns **zero**.
3. Loader mechanics intact: `grep -nE "^## Conventions$|^## Missing conventions$|^## Local overrides$|^\| Convention " skills/radical-pipelines/reference/conventions/load.md` returns all four (the three section headers + the `Convention` column header), byte-identical to base.
4. `git diff 38a1589..HEAD -- skills/radical-pipelines/reference/conventions/load.md` shows changes confined to L1, L3, L5 (plus the rename diff once Task 6 runs); no table row, no `Convention` column, no `## Conventions`/`## Missing conventions`/`## Local overrides` header changed.

---

## Task 5 — Convert umbrella terminology in `reference/conventions/setup.md` (edit in place, pre-move)

**Goal:** Update the file title and umbrella prose to "configuration", scanning the whole file for any further umbrella uses, while keeping setup mechanics and any named-rule mentions unchanged. Edited in its **current** location; the move happens in Task 6.

**Files:** `skills/radical-pipelines/reference/conventions/setup.md`.

**Changes** (design §4.5; verified current content at L1, L3):
- **L1 title:** `# Setup Conventions` → `# Setup Configuration`.
- **L3 prose:** `Use this setup flow when required conventions are missing before a workflow starts.` → `Use this setup flow when required configuration is missing before a workflow starts.`
- **Scan the rest of the file:** grep `setup.md` for remaining **umbrella** uses of "conventions" and convert each to "configuration"; keep any named-rule mentions and the setup mechanics unchanged. Classify each occurrence per design §2.
- **Optional (recommended, spec R5):** add a one-line note that "configuration" is the umbrella term and "Conventions" is the section of per-project rules within it.

**Depends on:** none (must complete before Task 6 moves the file).

**Traces to:** spec R5, AC17; design §4.5.

**Acceptance** (design §6.7):
1. `head -1 skills/radical-pipelines/reference/conventions/setup.md` is `# Setup Configuration`.
2. `grep -n "required configuration is missing" skills/radical-pipelines/reference/conventions/setup.md` returns one match; `grep -n "required conventions are missing" ...setup.md` returns **zero**.
3. After this task, any remaining "conventions" in `setup.md` is a named-rule or section-header use, not an umbrella use (manual classification of each `grep -n "convention" setup.md` hit).
4. Setup-flow mechanics (steps, ordering, the `.rp.md` write step) are functionally unchanged — `git diff 38a1589..HEAD -- skills/radical-pipelines/reference/conventions/setup.md` shows only wording changes (plus the optional note and, once Task 6 runs, the rename), no logic/step restructuring.

---

## Task 6 — `git mv` the folder `reference/conventions/` → `reference/configuration/`

**Goal:** Move all four files with rename history preserved. This is a **pure move** — no content edits in this task. Internal cross-links between the four moved files use bare filenames (e.g. `load.md` referencing `setup.md`) and survive the move untouched; do not edit them.

**Files:** the folder `skills/radical-pipelines/reference/conventions/` (containing `load.md`, `setup.md`, `claude-code.md`, `pi.md`).

**Changes** (design §4.6):
```
git mv skills/radical-pipelines/reference/conventions skills/radical-pipelines/reference/configuration
```
- Do **not** edit `claude-code.md` or `pi.md` content (per-tool canonical blocks; design §4.5, §7) — but a grep for umbrella uses inside them is required as a guard (none expected).

**Depends on:** Task 4 and Task 5 (edit `load.md` / `setup.md` in place **before** the move so the move stays a clean rename in review; design §4 ordering). Task 6 must run **before** Task 7.

**Traces to:** spec R3, AC10–11; design §4.6, §6.1.

**Acceptance** (design §6.1):
1. `ls skills/radical-pipelines/reference/configuration/` lists exactly `claude-code.md`, `load.md`, `pi.md`, `setup.md`.
2. `test ! -d skills/radical-pipelines/reference/conventions/` succeeds (old folder gone).
3. `git status` shows the four entries as `renamed:`, not delete+add; `git log --follow --oneline -- skills/radical-pipelines/reference/configuration/load.md` follows through the rename.
4. Guard: `grep -niE "\bconfiguration\b|each project has its own conventions" skills/radical-pipelines/reference/configuration/claude-code.md skills/radical-pipelines/reference/configuration/pi.md` surfaces no umbrella edits introduced into the per-tool files (their content is unchanged from base).

---

## Task 7 — Update all inbound path references to the moved folder

**Goal:** Point every inbound reference at `configuration/` so the tree stays buildable and every link resolves. This covers **both** the prefixed form (`reference/conventions/...`) and the **bare** form (`conventions/...`). These are **path-only** edits in the agent files — do not reword surrounding prose, named-rule mentions, or generic-English uses.

**Files** (7 known references; **grep to prove the set complete**, design §4.7):
- `skills/radical-pipelines/SKILL.md`
- `README.md` (×2)
- `skills/radical-pipelines/reference/work-on-an-issue.md`
- `skills/radical-pipelines/reference/manage-issues.md`
- `skills/radical-pipelines/reference/health-monitoring.md` (×2 lines, each referencing **both** `claude-code.md` and `pi.md`)

**Changes** (design §4.7; line numbers verified):
| # | File | Current path fragment | Target |
|---|------|----------------------|--------|
| 1 | `skills/radical-pipelines/SKILL.md` (L46) | `reference/conventions/load.md` | `reference/configuration/load.md` |
| 2 | `README.md` (L147) | `./skills/radical-pipelines/reference/conventions/setup.md` | `./skills/radical-pipelines/reference/configuration/setup.md` |
| 3 | `README.md` (L149) | `./skills/radical-pipelines/reference/conventions/load.md#local-overrides` | `./skills/radical-pipelines/reference/configuration/load.md#local-overrides` |
| 4 | `work-on-an-issue.md` (L7) | `conventions/load.md` | `configuration/load.md` |
| 5 | `manage-issues.md` (L5) | `conventions/load.md` | `configuration/load.md` |
| 6 | `health-monitoring.md` (L13) | `conventions/claude-code.md` **and** `conventions/pi.md` (same line) | `configuration/claude-code.md` **and** `configuration/pi.md` |
| 7 | `health-monitoring.md` (L79) | `conventions/claude-code.md` **and** `conventions/pi.md` (same line) | `configuration/claude-code.md` **and** `configuration/pi.md` |

- **Path strings only.** Do not reword the prose ("make sure project conventions are loaded", "The active tool's rules ..."). In `manage-issues.md` the line also contains "the **Issues** convention" — a named rule; leave it verbatim.
- If Task 2 / Task 3 left the SKILL.md (#1) and README.md (#2, #3) path strings unedited (the default), update them here. If those were updated earlier, ensure they are not double-edited — each path string is edited exactly once across the plan.

**Depends on:** Task 6 (folder must already be at `configuration/`). Soft-coupled with Tasks 2–3 on the SKILL.md/README.md path strings — ensure single-edit ownership (default: owned here).

**Traces to:** spec R3, AC12–14; design §4.7, §6.2, §6.3.

**Acceptance** (design §6.2, §6.3 — these are the **binding completeness** checks for the whole rename):
1. **Dual grep, both zero (binding):** run both from the worktree root; **both** must return **zero** matches:
   ```bash
   grep -rnE "conventions/(load|setup|claude-code|pi)\.md" --include="*.md" . | grep -v "\.pipelines/"
   grep -rn "reference/conventions/" --include="*.md" . | grep -v "\.pipelines/"
   ```
   The first catches both prefixed and bare forms (including the `conventions/claude-code.md` / `conventions/pi.md` form a `reference/conventions/`-only grep would miss); the second is belt-and-suspenders for any prefixed folder path.
2. All 7 targets now read `configuration/...`: `grep -rnE "configuration/(load|setup|claude-code|pi)\.md" --include="*.md" . | grep -v "\.pipelines/" | wc -l` is `≥ 8` (SKILL ×1, README ×2, work-on-an-issue ×1, manage-issues ×1, health-monitoring ×2 lines but ×4 file mentions since each of the two lines names both claude-code.md and pi.md) and includes every file listed above.
3. **Anchor resolves:** `grep -n "^## Local overrides" skills/radical-pipelines/reference/configuration/load.md` returns a match, so `configuration/load.md#local-overrides` resolves.
4. `reference/configuration/load.md` and `reference/configuration/setup.md` exist (from Task 6) so the SKILL.md and README links resolve to real files.
5. `manage-issues.md` still contains "the **Issues** convention" verbatim (named rule untouched): `grep -n "the \*\*Issues\*\* convention" skills/radical-pipelines/reference/manage-issues.md` returns one match.

---

## Final whole-change verification (run after Task 7; design §6)

These cross-task checks confirm completeness and anti-overreach for the **reviewer**:

1. **Anti-overreach — named-rule count unchanged (binding, design §6.6):**
   ```bash
   grep -rEn "the \*\*[A-Za-z ]+\*\* convention" --include="*.md" . | grep -v "\.pipelines/" | wc -l
   ```
   Must be **34** (identical to base `38a1589`). A different count means a named rule was wrongly altered (over-reach) or wrongly introduced.
2. **No stale folder reference anywhere (binding, design §6.2):** both dual greps in Task 7 Acceptance #1 return zero outside `.pipelines/`.
3. **`.rp.md` structure exact (design §6.4):** title is `# Radical Pipelines project configuration`; exactly one `## Conventions`; no `## Shared conventions` / `## Shared configuration`; nine rule headers at H3; sub-headers at their current levels.
4. **`.rp.md` rule bodies byte-for-byte (design §6.5):** `git diff 38a1589..HEAD -- .rp.md` touches only L1/L3/L5.
5. **Loader mechanics intact (design §6.6):** `grep -nE "^## Conventions$|^## Missing conventions$|^## Local overrides$|^\| Convention " skills/radical-pipelines/reference/configuration/load.md` returns all four, unchanged from base.
6. **Structural reconciliation (design §6.8):** `grep -rn "per-tool section\|sections side-by-side" README.md .rp.md` returns **zero**; any surviving "per-tool" mention refers to reference files / guidance.
7. **No behavioral/breaking change (review assertion, design §6.9):** the full diff is confined to wording (titles, umbrella prose, the single H2 rename, the structural reconciliation) plus the folder rename and its inbound links. No edit touches loader parsing logic, setup-flow logic, per-tool canonical blocks (`claude-code.md` / `pi.md` content), or local-overrides resolution. An unmodified old-format `.rp.md` (old title, `## Shared conventions` H2, H3 rules) would still load (loader keys on rule **names**; no version/schema gate introduced).

---

## Task dependency summary

```
Task 1 (.rp.md)            \
Task 2 (SKILL.md prose)     \
Task 3 (README.md prose)     >  Commit 1 (terminology)   — tasks 1–5 are mutually independent
Task 4 (load.md in place)   /
Task 5 (setup.md in place) /
        |
        v  (Tasks 4,5 before move)
Task 6 (git mv folder)      \
        |                     >  Commit 2 (rename + links)
        v  (move before links)
Task 7 (inbound path fixes) /
```

Tasks 1–5 can be implemented in any order (independent files / independent regions). Task 6 depends on Tasks 4 and 5. Task 7 depends on Task 6. SKILL.md (#1) and README.md (#2,#3) path strings are owned by Task 7 by default to keep single-edit ownership.
