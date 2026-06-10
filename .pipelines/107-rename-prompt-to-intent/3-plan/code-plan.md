# Code plan: rename the phase-0 artifact "prompt" → "intent"

## How to use this plan

This is an executable, standalone task breakdown for the code phase. Read it together with
`../1-spec/spec.md` (coverage / acceptance) and `../2-design-doc/design-doc.md` (approach). Where
this plan and those documents disagree, the spec/design win — but they should not disagree.

**This is a pure mechanical rename: "prompt" → "intent" for the phase-0 artifact / folder / phase
label only.** All edits are in-file text/string substitutions plus exactly one small clause rewrite
plus one new changeset file. There is:

- **No `git mv`, no folder move, no file rename on disk.** Every `0-prompt` and `prompt.md` token in
  scope is a *string inside a file* (prose, a Markdown table cell, an ASCII-tree code block, or a JS
  string literal). There is no real `0-prompt/` directory or `prompt.md` file anywhere in scope on
  disk — the only ones that exist live under `.pipelines/` and are out-of-scope historical run data.
- **No behavior change** — no logic, control-flow, or file-read-order edits. The skill must read as
  if the phase was *always* called "intent": no "formerly prompt" notes, no backward-compat / dual-
  name handling, no migration text for legacy `0-prompt` pipelines.
- **Not a blanket find-replace.** Two senses of "prompt" coexist, sometimes in the same file. Only
  the phase-0-artifact sense is renamed; the generic LLM/agent sense (launch / spawn / loop prompts,
  the orchestrator's prompt, `cc-prompt` CSS, "prompt engineering" SEO) is **KEPT exactly**. Judge
  each occurrence by its token class, not by a global substitution.

**Token classes** (from the spec / design; per-occurrence class is authoritative, line numbers are
not — they shift as edits land):

- **FOLDER** — folder token `0-prompt` → `0-intent`.
- **FILE** — filename token `prompt.md` → `intent.md`.
- **LABEL** — phase name in prose / tables / sequences: `Prompt` / `0 - Prompt` / `0 – Prompt`
  (en-dash) / `Phase 0. Prompt` / `(Prompt → …)` → `Intent` / `0 - Intent` / `0 – Intent` /
  `Phase 0. Intent` / `(Intent → …)`.
- **SOFT** — prose where the bare word "prompt" *names* the phase-0 artifact → "intent".
- **KEEP** — the generic LLM/agent "prompt" sense; left exactly as-is.

## Scope at a glance

**19 files edited + 1 new changeset file = 20 touched.** The 19 edited files are the union of (files
carrying `0-prompt`/`prompt.md` path tokens) and (files carrying phase labels). 32 in-scope files
contain a "prompt" token, but the **13 pure-KEEP token-bearing files are deliberately left
untouched** — touching any of them would be an erroneous rename.

The 19 in-scope (edited) files:

```
README.md
agents/spec-analyst.md
agents/spec-consolidator.md
agents/spec-reviewer.md
agents/spec-writer.md
skills/radical-pipelines/SKILL.md
skills/radical-pipelines/reference/assisted-phases/1 - spec.md
skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md
skills/radical-pipelines/reference/assisted-phases/3 - plan.md
skills/radical-pipelines/reference/assisted-workflow.md
skills/radical-pipelines/reference/autonomous-phases/1 - spec.md
skills/radical-pipelines/reference/autonomous-workflow.md
skills/radical-pipelines/reference/conventions/setup.md
skills/radical-pipelines/reference/create-pipeline.md
skills/radical-pipelines/reference/fork-pipeline.md
skills/radical-pipelines/reference/manage-issues.md
skills/radical-pipelines/reference/pipeline-versioning.md
website/demo.js
website/index.html
```

The 13 pure-KEEP files — **DO NOT EDIT** (they contain only the generic "prompt" sense):

```
agents/code-plan-writer.md
agents/code-reviewer.md
agents/code-writer.md
agents/design-doc-researcher.md
agents/design-doc-writer.md
agents/doc-plan-writer.md
agents/doc-reviewer.md
agents/doc-writer.md
agents/spec-researcher.md
skills/radical-pipelines/reference/conventions/claude-code.md
skills/radical-pipelines/reference/conventions/pi.md
skills/radical-pipelines/reference/health-monitoring.md
website/styles.css
```

**Out of scope — never touch:**

- `.rp.md` (all three occurrences: `0 - Prompt` Linear-state label, the "Add prompt (orchestrator)"
  commit example, and `/loop 15m <prompt>`). It is the consuming project's overlay, not the skill,
  and its `0 - Prompt` mirrors a live Linear workflow state — renaming it without renaming the
  external state would break the phase-0 status-set (a behavior change). It carries no path token.
- This run's own `.pipelines/107-rename-prompt-to-intent/0-prompt/` folder and every other
  `.pipelines/` artifact — historical run data, byte-for-byte.
- The Linear workflow states `0 - Prompt` … `5 - Docs` — a separate optional operational change.
- `requirements.md` in the website terminal listing — an unrelated artifact name.

## Execution notes

- **Single code-writer, sequential, shared branch.** Tasks 1–5 are independent of each other (each
  touches a disjoint file set) and may be done in any order; Task 6 (verification) runs **last**, so
  its acceptance greps run against the finished tree.
- **Edit by occurrence, not by line number.** Line numbers below are convenience pointers from the
  current tree; they will drift as edits land. The token-class call per occurrence is authoritative.
- **Preserve byte structure.** These files include Markdown tables and an ASCII tree whose column
  alignment matters. `intent` is the same length as `prompt`-minus-one is not — `prompt` (6) vs
  `intent` (6) are the **same length**, and `0-prompt` (8) vs `0-intent` (8) are the **same length**,
  and `prompt.md` (9) vs `intent.md` (9) are the **same length**, so table-cell and tree alignment is
  preserved automatically by a same-length swap; do not add or remove padding. The one exception is
  the SOFT/LABEL prose rewrites where surrounding words change — those are prose, not aligned tables.

---

## Task 1 — Group A: Skill core + reference (12 files)

**Goal.** Rename every phase-0 artifact / folder / label token in the skill's forward-looking
definitions so the skill reads as if the phase was always "Intent". The "no trace of the old name in
the skill" constraint applies in full here.

**Files (12).**

```
skills/radical-pipelines/SKILL.md
skills/radical-pipelines/reference/pipeline-versioning.md
skills/radical-pipelines/reference/fork-pipeline.md
skills/radical-pipelines/reference/autonomous-workflow.md
skills/radical-pipelines/reference/assisted-workflow.md
skills/radical-pipelines/reference/create-pipeline.md
skills/radical-pipelines/reference/manage-issues.md
skills/radical-pipelines/reference/conventions/setup.md
skills/radical-pipelines/reference/autonomous-phases/1 - spec.md
skills/radical-pipelines/reference/assisted-phases/1 - spec.md
skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md
skills/radical-pipelines/reference/assisted-phases/3 - plan.md
```

**Changes (per file, per occurrence).**

- **`SKILL.md`**
  - Phase sequence `(Prompt → Spec → …)` in the description — **LABEL** → `(Intent → Spec → …)`.
  - Phases table row `| 0 | Prompt | `0-prompt` | … |` — **LABEL** (`Prompt`→`Intent`) **+ FOLDER**
    (`0-prompt`→`0-intent`).

- **`reference/pipeline-versioning.md`** — *see flag below.*
  - Table row `| 0 – Prompt | `0-prompt/prompt.md` |` — **LABEL en-dash** (`0 – Prompt`→`0 – Intent`,
    preserving the `–` en-dash) **+ FOLDER + FILE** (`0-prompt/prompt.md`→`0-intent/intent.md`),
    both renamed on the same line.
  - The `0-prompt` shared-root phase-folder occurrences in the versioning trie / ASCII-tree code
    block — **FOLDER**, multiple lines, **some lines carry the token twice — rename every instance.**

- **`reference/fork-pipeline.md`**
  - `0-prompt` as the lowest inheritable phase folder — **FOLDER**, multiple lines, some with the
    token twice; rename every instance.
  - "only the prompt is inherited" — **SOFT** → "only the intent is inherited".

- **`reference/autonomous-workflow.md`**
  - Table row `| 0 - Prompt | `0-prompt` | Already in place |` — **LABEL** (`0 - Prompt`→`0 - Intent`)
    **+ FOLDER** (`0-prompt`→`0-intent`).
  - **KEEP** the "agent's initial prompt" reference (generic launch message) — do **not** rename.

- **`reference/assisted-workflow.md`**
  - Table row `| 0 - Prompt | `0-prompt` | Already in place |` — **LABEL + FOLDER**.

- **`reference/create-pipeline.md`** — *contains the clause rewrite; see flag below.*
  - Command-summary line "…writes `prompt.md`, and commits." — **FILE** (`prompt.md`→`intent.md`).
  - Heading "### 4. Generate the initial prompt" — **SOFT** → "Generate the initial intent".
  - "Create the phase 0 subfolder (`0-prompt/`) … Write the prompt to
    `<artifacts-folder>/0-prompt/prompt.md`." — **FOLDER** (`0-prompt/`), **SOFT** ("Write the
    prompt"→"Write the intent"), **FOLDER + FILE** (`0-prompt/prompt.md`→`0-intent/intent.md`).
  - **CLAUSE REWRITE** — the bullet "Adapt the issue content **as a prompt directed at the agents**
    that will run subsequent phases." Reword to: **"Adapt the issue content into the intent that
    seeds the subsequent phases."** Constraints: (a) say "intent"; (b) do **not** assert "intent
    directed at the agents". Exact wording is your call within those two constraints.
  - **Leave the very next bullet verbatim:** "Do not add requirements, technical directions, or
    implementation details — agents do their own research in later phases." It carries no "prompt"
    token and stays byte-for-byte.
  - Screenshots/assets bullet "…place them in `<artifacts-folder>/0-prompt/`. Reference them
    explicitly in `prompt.md` …" — **FOLDER** (`0-prompt/`) **+ FILE** (`prompt.md`).

- **`reference/manage-issues.md`**
  - "the phase-0 prompt — create-pipeline.md turns the issue into `0-prompt/prompt.md` … the prompt
    format" — **SOFT ×2** (both bare-word "prompt" → "intent") **+ FOLDER + FILE**
    (`0-prompt/prompt.md`→`0-intent/intent.md`).

- **`reference/conventions/setup.md`**
  - The artifact-folder contents list includes `prompt.md` — **FILE ×2** (two occurrences).
  - "Each pipeline pulls its initial prompt from an issue" — **SOFT** → "initial intent".

- **`reference/autonomous-phases/1 - spec.md`**
  - "from phase 0 (prompt) to phase 1" — **SOFT** → "(intent)" (parenthetical phase name; keep
    parallel with the assisted sibling).
  - reads `<artifacts-folder>/0-prompt/prompt.md` — **FOLDER + FILE**.

- **`reference/assisted-phases/1 - spec.md`**
  - "phase 0 (`prompt.md`)" — **FILE** → "(`intent.md`)" (keep parallel with the autonomous sibling).
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "<contents of `prompt.md` …>" — **FILE**.
  - "should not need … `prompt.md`" — **FILE**.

- **`reference/assisted-phases/2 - design-doc.md`**
  - The two standalone-without-`prompt.md` references — **FILE ×2**.

- **`reference/assisted-phases/3 - plan.md`**
  - The standalone-without-`prompt.md` reference — **FILE**.

**Execution-risk flag (pipeline-versioning.md).** Line `| 0 – Prompt | `0-prompt/prompt.md` |` uses an
**en-dash** (`–`, U+2013), not a hyphen, in the label, AND carries the path token on the same line.
Rename the label to `0 – Intent` **preserving the en-dash** (keeps table-column alignment byte-
consistent) and rename `0-prompt/prompt.md` → `0-intent/intent.md` separately on that same line.
Elsewhere in this file the versioning trie / ASCII tree has lines carrying `0-prompt` **twice** —
rename every instance.

**Depends on.** None. Independent of Tasks 2–5.

**Traces to.** Spec R1 (all bullets); spec AC#1, AC#2, AC#4, AC#5, AC#6; design "Per-occurrence
specification → Skill", design "Two execution-risk flags" item 1, design "The one non-mechanical edit:
`create-pipeline.md:25` clause rewrite", design "Edit set" (Group A's 12 files).

**Acceptance.**
- In these 12 files: zero `0-prompt`, zero `prompt.md`, zero `0 - Prompt` / `0 – Prompt` /
  `(Prompt `; the en-dash row reads `| 0 – Intent | `0-intent/intent.md` |` (en-dash intact).
- The `create-pipeline.md` clause says "intent" and does **not** assert "intent directed at the
  agents"; the following "Do not add requirements…" bullet is unchanged.
- No "formerly prompt" / backward-compat / dual-name / migration text introduced anywhere.
- The `autonomous-workflow.md` "agent's initial prompt" line is unchanged (KEEP).

---

## Task 2 — Group B: Agent profiles (4 files, mixed rename + KEEP)

**Goal.** Rename the phase-0-artifact occurrences in the four spec-phase agent profiles that read the
phase-0 artifact, while leaving the generic launch/spawn "prompt" occurrences exactly as-is. These
files are **mixed** — judge each occurrence individually; do **not** blanket-rename bare "prompt".

**Files (4).**

```
agents/spec-analyst.md
agents/spec-writer.md
agents/spec-reviewer.md
agents/spec-consolidator.md
```

**Changes (per file, per occurrence).**

- **`agents/spec-analyst.md`** — **ALL-RENAME** (this file contains **no** generic "prompt").
  - "You turn a rough prompt into a clear, complete set of testable requirements" — **SOFT** →
    "a rough intent".
  - "**Treat the prompt as a hypothesis.**" — **SOFT** → "the intent".
  - "a premise the prompt depends on" — **SOFT** → "the intent". *Same line also carries the path
    token* `0-prompt/prompt.md` — **FOLDER + FILE**.
  - Heading "### 1. Understand the prompt" — **SOFT** → "Understand the intent".
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "contents of `prompt.md`" — **FILE**.
  - HTML comment `<!-- The original idea from prompt.md -->` — **FILE**.

- **`agents/spec-writer.md`** — **RENAME, with one explicit KEEP.**
  - "synthesize the prompt and the spec research record" — **SOFT** → "the intent".
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "from `spec.md` alone, without the research record or the prompt" — **SOFT** → "the intent".
  - blocker reference "not confirmed in `spec-research.md` or `prompt.md`" — **FILE**.
  - **KEEP (line ~15): "the orchestrator's prompt cited a review file"** — this is the launch
    message, not the phase-0 artifact. Do **NOT** rename.

- **`agents/spec-reviewer.md`** — **single RENAME.**
  - reads `0-prompt/prompt.md` — **FOLDER + FILE** (the only "prompt" occurrence in the file).

- **`agents/spec-consolidator.md`** — **RENAME, with one explicit KEEP.**
  - reads `prompt.md` — **FILE**.
  - the standalone-without-`prompt.md` reference — **FILE**.
  - "`prompt.md` missing" — **FILE**.
  - **KEEP (line ~8): "Your spawn prompt includes…"** — this is the launch message. Do **NOT** rename.

**Depends on.** None. Independent of Tasks 1, 3, 4, 5.

**Traces to.** Spec R2 (all four files), spec R3 (the two KEEP lines: spec-writer's "orchestrator's
prompt", spec-consolidator's "spawn prompt includes"); spec AC#1, AC#3, AC#4; design "Per-occurrence
specification → Agent profiles", design "Edit set" (Group B's 4 files).

**Acceptance.**
- `spec-analyst.md`: zero "prompt"/"Prompt" remaining (full rename, no generic sense in this file).
- `spec-writer.md`: zero path tokens; exactly **one** "prompt" remains — the orchestrator's-prompt
  KEEP line.
- `spec-reviewer.md`: zero "prompt" remaining (its single token was a path token).
- `spec-consolidator.md`: zero path tokens; exactly **one** "prompt" remains — the spawn-prompt
  KEEP line.

---

## Task 3 — Group C: README (1 file)

**Goal.** Rename the phase-0 label and the two artifact-naming SOFT occurrences in `README.md`, while
keeping the LLM-non-determinism "prompt" line untouched.

**Files (1).** `README.md`

**Changes.**
- "**Phase 0. Prompt.** The initial idea or request." — **LABEL** → "**Phase 0. Intent.**".
- "Percentage of tasks that make it from prompt to finished implementation" — **SOFT** → "from
  intent to finished implementation".
- "(phase 0 is the raw prompt, an input rather than an agent-produced artifact…)" — **SOFT** →
  "the raw intent" (this sentence explicitly defines phase 0 — the clearest old-name trace if left).
- **KEEP:** "The same prompt, the same context, can produce a different result every time" (LLM
  non-determinism copy in "## The problem", before phases are introduced). Do **NOT** rename.

**Depends on.** None.

**Traces to.** Spec R4 (LABEL + two SOFT), spec R3 (the one README KEEP line); spec AC#2, AC#4;
design "Per-occurrence specification → README".

**Acceptance.**
- Zero `Phase 0. Prompt`; reads `Phase 0. Intent`.
- Exactly **one** "prompt" remains in `README.md` — the "same prompt, the same context" KEEP line.

---

## Task 4 — Group D: Website (2 files, string-consistency critical)

**Goal.** Rename the phase-0 artifact file token across `website/demo.js` and `website/index.html`
while keeping the generic-sense occurrences (CSS class, SEO keyword, non-determinism copy) and the
unrelated `requirements.md` untouched.

**Files (2).** `website/demo.js`, `website/index.html`

**Changes.**

- **`website/demo.js`** — *see flag below.*
  - The **three** `'prompt.md'` string literals — line ~12 and line ~23 (in phase `reads` arrays) and
    line ~140 (in `pendingTree`) — **FILE**, **all three rename to `'intent.md'` together.**
  - Log line `'  ⎿  Captured issue #1234 → prompt.md (phase 0 · input)'` — **FILE** (`prompt.md`→
    `intent.md`).
  - Comment "// Phase 0 is the raw prompt — an input…" — **SOFT** → "the raw intent".
  - **KEEP:** `cc-prompt` CSS class and its literal `'> work on issue #1234'` (line ~271). Do **NOT**
    rename `cc-prompt`.

- **`website/index.html`**
  - `<span class="file done">prompt.md</span>` in the terminal `ls` listing (line ~119) — **FILE** →
    `intent.md`.
  - **KEEP:** the meta-keywords "prompt engineering" (SEO, line ~12) and "Same prompt, different run,
    different result" (non-determinism re-run copy, line ~153). Do **NOT** rename.
  - **Do NOT touch** the adjacent `requirements.md` span (line ~120) — unrelated artifact name.

**Execution-risk flag (demo.js string-consistency, not logic).** demo.js renders the file-tree commit
animation by matching the `reads`/`writes` strings against `pendingTree` by **string equality**.
Renaming only some of the three `'prompt.md'` literals breaks the animation. **Rename all three
together.** There is no JS logic keyed on the literal "prompt", so this is a string-consistency
requirement, not a behavior change.

**Depends on.** None.

**Traces to.** Spec R5 (demo.js three FILE literals + log line + SOFT comment; index.html FILE span),
spec R3 (`cc-prompt`, "prompt engineering", "Same prompt, different run"); spec AC#1, AC#7; design
"Per-occurrence specification → Website", design "Two execution-risk flags" item 2.

**Acceptance.**
- `demo.js`: zero `prompt.md`; all three literals read `'intent.md'`; `cc-prompt` and its
  `> work on issue #1234` literal unchanged; comment reads "the raw intent".
- `index.html`: the `ls`-listing span reads `intent.md`; `requirements.md` unchanged; "prompt
  engineering" and "Same prompt, different run" unchanged (these two are the only "prompt" left in
  this file).

---

## Task 5 — Group E: Changeset (1 new file)

**Goal.** Add the mandatory changeset so the CI Changeset Gate (`changeset status`) passes.

**Files (1, new).** `.changeset/rename-prompt-to-intent.md` (filename is the implementer's choice;
any non-colliding `.changeset/*.md` is fine).

**Changes.** Create the file with the existing frontmatter form (matching e.g.
`.changeset/per-agent-model-config.md`):

```
---
"@automattic/radical-pipelines": minor
---

Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent".
```

Bump = **`minor`** (consistent with existing changesets; final bump is the owner's call). Summary
describes the rename.

**Depends on.** None (independent file). Verification (Task 6) runs `changeset status` after this.

**Traces to.** Spec R6, spec AC#8; design "Changeset (mandatory)", design "Edit set" (Group E).

**Acceptance.**
- A new `.changeset/*.md` exists with `"@automattic/radical-pipelines": minor` frontmatter and a
  summary describing the rename.
- `changeset status` passes (verified in Task 6).

---

## Task 6 — Group F: Verification (runs LAST)

**Goal.** Prove the rename is complete and correct, and that nothing out of scope changed. Run against
the finished tree after Tasks 1–5 land.

**Files.** None edited. Read-only checks.

**Changes.** Run the three acceptance greps + `changeset status`; spot-check the behavioral criteria.
All three greps exclude `.pipelines/`; greps 2 and 3 also exclude `.rp.md`.

1. **Path tokens → 0.**
   ```
   git grep -nIE "0-prompt|prompt\.md" -- ':!.pipelines'
   ```
   Was 42; MUST now return **0**. (No KEEP line contains a path token, so a clean zero is the target —
   `.rp.md` need not be excluded here as it carries no path token.)

2. **Phase-label forms → 0.**
   ```
   git grep -nIE "0 [-–] Prompt|Phase 0\. Prompt|\(Prompt " -- ':!.pipelines' ':!.rp.md'
   ```
   Was 5 (`README.md`, `SKILL.md`, `assisted-workflow.md`, `autonomous-workflow.md`,
   `pipeline-versioning.md`); MUST now return **0**.

3. **Residual "prompt" = exactly the 25 KEEP lines.**
   ```
   git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'
   ```
   Was 81 (56 renames + 25 keeps); MUST now return **exactly the 25 KEEP occurrences** (modulo line
   shifts) — no more, no fewer. Breakdown: **agents 14 + skills 6 + website 4 + README 1.** Any
   "prompt"/"Prompt" outside the R3 set is a missed rename; any KEEP line that changed is an erroneous
   rename.

4. **Changeset gate.**
   ```
   npx changeset status
   ```
   MUST pass.

5. **Spot-checks (manual read):**
   - **No old-name trace in the skill** — `skills/radical-pipelines/` has no formerly-prompt /
     backward-compat / dual-name / migration text and no special-casing for legacy `0-prompt`.
   - **Crux sentence reworded** — `create-pipeline.md`'s adapted bullet says "intent" and does not
     assert "intent directed at the agents".
   - **demo animation intact** — all three `website/demo.js` `'prompt.md'` literals → `'intent.md'`
     together (the string-equality matching still resolves).
   - **No behavior change** — `git diff` is text/string renames + the one clause rewrite + the
     changeset only; no logic, control-flow, or file-read-order edits.
   - **Out-of-scope untouched** — `git diff --name-only` shows none of: `.rp.md`, anything under
     `.pipelines/`, the 13 pure-KEEP files, `website/styles.css`; and `requirements.md` in
     `index.html` is unchanged.

   `npm test` is unaffected by this change (no test files in scope); it need not be run for the
   rename, but if run it must remain green.

**Depends on.** Tasks 1, 2, 3, 4, 5 (all edits must be in place before verifying).

**Traces to.** Spec AC#1–AC#9; design "Verification".

**Acceptance.**
- Greps 1 and 2 return 0; grep 3 returns exactly the 25 R3 KEEP lines (14 agents + 6 skills + 4
  website + 1 README).
- `changeset status` passes.
- All five spot-checks hold; the diff is touch-limited to the 19 edited files + 1 new changeset file.
