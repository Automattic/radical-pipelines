# Design doc: rename the phase-0 artifact "prompt" → "intent"

## Summary

Radical Pipelines is an orchestrator skill that takes a software issue through six sequential
phases. Phase 0 is currently called **"Prompt"**: its artifact file is `prompt.md`, it lives in a
`0-prompt/` folder, and the phase label is "Prompt". That name is misleading and overloaded — the
artifact is really a structured statement of *intent* that seeds the pipeline, and the word
"prompt" is used everywhere else for the unrelated LLM/agent sense (every phase agent receives a
launch/spawn prompt). This change renames the phase-0 **artifact, folder, and phase label** from
"prompt" to "intent" across the skill's forward-looking definitions, so going forward the artifact
is `intent.md`, its folder is `0-intent/`, and the phase is called "Intent".

This is a **pure mechanical rename — no behavior change.** The diff is text/string substitutions
plus exactly one small clause rewrite, plus a changeset. There is **no logic, control-flow,
file-read-order, or runtime-behavior change.** The skill must read as if the phase was always
called "intent": no "formerly prompt" notes, no backward-compat or dual-name handling, no migration
instructions for legacy `0-prompt` pipelines.

The generic LLM/agent sense of "prompt" is deliberately preserved and must **not** change: launch
prompts, spawn prompts, the orchestrator's prompt, the loop prompt (`/loop 5m <prompt>`), the
LLM-prompt sense in non-determinism copy, the `cc-prompt` CSS class/selector, and the "prompt
engineering" SEO keyword. Because both senses appear — sometimes in the same file — this is **not a
blanket find-replace**; each occurrence is judged individually.

## Approach

### In-file text edits only — no `git mv`

The change is **pure in-file text/string edits plus one new changeset file. No `git mv`, no path
moves, no history-preservation step.** There is no real `0-prompt/` directory or `prompt.md` file
anywhere in scope on disk: every directory named `0-prompt` and every file named `prompt.md` that
exists on disk lives under `.pipelines/` and is an out-of-scope historical run artifact (see
[Out of scope](#out-of-scope)). In the skill, agents, README, and website, the tokens `0-prompt`,
`prompt.md`, and the "Prompt" phase label appear **only as text inside files** — path-token
*strings* in prose, tables, and JS string literals, plus phase-label prose. The code phase must
therefore **not** attempt to move a folder or rename a file on disk.

### Token classes

The per-occurrence classification below uses these classes:

- **FOLDER** — the folder-name token `0-prompt` → `0-intent`.
- **FILE** — the filename token `prompt.md` → `intent.md`.
- **LABEL** — the phase name in prose/tables/sequences: `Prompt` / `0 - Prompt` / `0 – Prompt`
  (en-dash variant) / `Phase 0. Prompt` / `(Prompt → …)` → `Intent` / `0 - Intent` / `0 – Intent`
  / `Phase 0. Intent` / `(Intent → …)`.
- **SOFT** — prose where the bare word "prompt" *names* the phase-0 artifact (not a path token)
  → "intent".
- **KEEP** — the generic LLM/agent "prompt" sense; left exactly as-is.

Line numbers reflect the current tree and may shift as edits land; the per-occurrence class is
authoritative, not the line numbers.

### The one non-mechanical edit: `create-pipeline.md:25` clause rewrite

Every edit is a mechanical token swap except one. In `reference/create-pipeline.md`, the bullet at
line 25 currently reads:

> Adapt the issue content **as a prompt directed at the agents** that will run subsequent phases.

A blind token swap to "as an intent directed at the agents" reads wrong: the intent is the owner's
statement that *seeds* the pipeline, not a message aimed at agents (the per-agent spawn message is
assembled separately and later). Rewrite the bullet to:

> **Adapt the issue content into the intent that seeds the subsequent phases.**

This (a) says "intent" and (b) does not assert "intent directed at the agents", parallels the
skill's own "structured statement of intent that seeds the pipeline" language, and reads coherently
before the **separate, untouched** bullet at line 26 ("Do not add requirements, technical
directions, or implementation details — agents do their own research in later phases"). That line
26 bullet carries the "add no requirements / technical direction / implementation" half of the
meaning, contains no "prompt" token, and stays verbatim — so the line-25 rewrite carries only the
"adapt the issue content" half. Exact wording is the code-phase implementer's call within the two
constraints (say "intent"; do not assert "intent directed at the agents").

## Edit set

**Exactly 19 files are edited + 1 new changeset file = 20 touched.** 32 in-scope files contain a
"prompt" token, but only files with at least one RENAME occurrence are edited; the **13 pure-KEEP
files are deliberately left untouched** (touching them would be an erroneous rename). The 19 edited
files are the union of (files with `0-prompt`/`prompt.md` path tokens) and (files with phase
labels):

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

The **13 pure-KEEP files left untouched** (they contain only the generic "prompt" sense):

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

## Two execution-risk flags

The code phase must respect these two items; both are about preserving byte-exactness / string
consistency, not about logic.

1. **En-dash variant + same-line double rename in `pipeline-versioning.md:27`.** That line is
   `| 0 – Prompt | `0-prompt/prompt.md` |` — the label uses an **en-dash** (`–`, not a hyphen
   `-`), and the same line also carries the path token. Rename the label to **`0 – Intent`,
   preserving the en-dash** (keeps table-column alignment byte-consistent), and rename the
   `0-prompt/prompt.md` path token separately on the same line. Elsewhere in this file the
   versioning trie / ASCII tree has lines carrying the `0-prompt` token **twice** — rename every
   instance.

2. **`website/demo.js` string-consistency (not a logic change).** Three `'prompt.md'` string
   literals — line 12 and line 23 (in phase `reads` arrays) and line 140 (in `pendingTree`) —
   **must all rename to `'intent.md'` together.** demo.js renders the file-tree commit animation
   by matching `reads`/`writes` strings against `pendingTree` by string equality; renaming only
   some breaks the animation. There is no JS logic keyed on the literal "prompt". Separately on the
   same file: the log line "→ prompt.md" is FILE; the comment "// Phase 0 is the raw prompt — an
   input…" is SOFT → "the raw intent"; and `cc-prompt` (a CSS class, with its literal
   `> work on issue #1234`) is KEEP.

## Per-occurrence specification

### Skill — `skills/radical-pipelines/`

These define the pipeline forward-looking, so the "no trace of the old name in the skill"
constraint applies in full.

- **`SKILL.md`** — description and phase sequence "(Prompt → Spec → …)" (LABEL); phases table row
  `| 0 | Prompt | `0-prompt` | … |` (LABEL + FOLDER).
- **`reference/pipeline-versioning.md`** — table row `| 0 – Prompt | `0-prompt/prompt.md` |`
  (LABEL en-dash + FOLDER + FILE; see flag 1); the `0-prompt` shared-root phase-folder occurrences
  in the versioning trie / ASCII tree, multiple lines including literal text inside the ASCII-tree
  code block (FOLDER; some lines twice — rename every instance).
- **`reference/fork-pipeline.md`** — `0-prompt` as the lowest inheritable phase folder, multiple
  lines, some with the token twice (FOLDER); "only the prompt is inherited" (SOFT → "only the
  intent is inherited" — forking at phase 0 copies just that one phase-0 folder).
- **`reference/autonomous-workflow.md`** — table row `| 0 - Prompt | `0-prompt` | Already in
  place |` (LABEL + FOLDER). **KEEP** the "agent's initial prompt" reference (generic launch
  message).
- **`reference/assisted-workflow.md`** — table row `| 0 - Prompt | `0-prompt` | Already in
  place |` (LABEL + FOLDER).
- **`reference/create-pipeline.md`** — heading "### 4. Generate the initial prompt" (SOFT →
  "Generate the initial intent"); "Write the prompt to `<artifacts-folder>/0-prompt/prompt.md`"
  (SOFT + FOLDER + FILE — the prose word and both path tokens rename); **the line-25 clause
  rewrite** (see [The one non-mechanical edit](#the-one-non-mechanical-edit-create-pipelinemd25-clause-rewrite));
  creates `0-prompt/` and places assets in it (FOLDER + FILE).
- **`reference/manage-issues.md`** — "the phase-0 prompt — create-pipeline.md turns the issue into
  `0-prompt/prompt.md` … the prompt format" (SOFT ×2 + FOLDER + FILE — both prose words → "intent",
  plus the path token).
- **`reference/autonomous-phases/1 - spec.md`** — "from phase 0 (prompt) to phase 1" (SOFT →
  "(intent)", parenthetical phase name, parallel with the assisted sibling); reads
  `<artifacts-folder>/0-prompt/prompt.md` (FOLDER + FILE).
- **`reference/assisted-phases/1 - spec.md`** — "phase 0 (`prompt.md`)" (FILE → "(`intent.md`)",
  parallel with the autonomous sibling); reads `0-prompt/prompt.md` (FOLDER + FILE); "<contents of
  `prompt.md` …>" (FILE); "should not need … `prompt.md`" (FILE).
- **`reference/assisted-phases/2 - design-doc.md`** — the two standalone-without-`prompt.md`
  references (FILE ×2).
- **`reference/assisted-phases/3 - plan.md`** — the standalone-without-`prompt.md` reference
  (FILE).
- **`reference/conventions/setup.md`** — the artifact-folder contents list includes `prompt.md`,
  two occurrences (FILE ×2); "Each pipeline pulls its initial prompt from an issue" (SOFT →
  "initial intent").

### Agent profiles — `agents/`

Only four agent profiles ever read the phase-0 artifact as input — `spec-analyst`, `spec-writer`,
`spec-reviewer`, `spec-consolidator` — because each downstream phase reads only its immediate
upstream artifact. In every other (`code-*`, `doc-*`, `design-*`) profile, "prompt" can only be the
generic launch/spawn message; those are in the 13 untouched KEEP files. The four spec-phase files
are **mixed** (rename-and-keep in the same file): **judge each occurrence individually; do not
blanket-rename.**

- **`agents/spec-analyst.md`** — all-rename, contains **no** generic "prompt". "You turn a rough
  prompt into a clear, complete set of testable requirements" (SOFT → "a rough intent"); "**Treat
  the prompt as a hypothesis.**" (SOFT → "the intent"); "a premise the prompt depends on" (SOFT →
  "the intent"; same line also carries the `0-prompt/prompt.md` path token — FOLDER + FILE);
  heading "### 1. Understand the prompt" (SOFT → "Understand the intent"); reads `0-prompt/prompt.md`
  (FOLDER + FILE); "contents of `prompt.md`" (FILE); the HTML comment `<!-- The original idea from
  prompt.md -->` (FILE).
- **`agents/spec-writer.md`** — "synthesize the prompt and the spec research record" (SOFT → "the
  intent"); reads `0-prompt/prompt.md` (FOLDER + FILE); "from `spec.md` alone, without the research
  record or the prompt" (SOFT → "the intent"); the blocker reference "not confirmed in
  `spec-research.md` or `prompt.md`" (FILE). **KEEP line 15** — "the orchestrator's prompt cited a
  review file" is the launch message, not the phase-0 artifact; do **not** rename.
- **`agents/spec-reviewer.md`** — reads `0-prompt/prompt.md`, a single FOLDER + FILE path token
  (only occurrence in the file).
- **`agents/spec-consolidator.md`** — reads `prompt.md` (FILE); the standalone-without-`prompt.md`
  reference (FILE); "`prompt.md` missing" (FILE). **KEEP line 8** — "Your spawn prompt includes…"
  is the launch message; do **not** rename.

### README — `README.md`

- "**Phase 0. Prompt.** The initial idea or request." (LABEL → "Phase 0. Intent.").
- "Percentage of tasks that make it from prompt to finished implementation" (SOFT → "from intent
  to finished implementation").
- "(phase 0 is the raw prompt, an input rather than an agent-produced artifact…)" (SOFT → "the raw
  intent"; this sentence explicitly defines what phase 0 is — the clearest old-name trace if left).
- **KEEP** "The same prompt, the same context, can produce a different result every time" (LLM
  non-determinism copy in "## The problem", before phases are introduced).

### Website — `website/`

- **`website/demo.js`** — all three `'prompt.md'` literals together (FILE; see flag 2); the log
  line "Captured issue #1234 → prompt.md (phase 0 · input)" (FILE); the comment "// Phase 0 is the
  raw prompt — an input…" (SOFT → "the raw intent"). **KEEP** `cc-prompt` (CSS class with its
  literal `> work on issue #1234`).
- **`website/index.html`** — `<span class="file done">prompt.md</span>` in the terminal `ls`
  listing (FILE). **KEEP** "prompt engineering" (SEO meta keyword) and "Same prompt, different run,
  different result" (non-determinism re-run copy). Do **not** touch the adjacent `requirements.md`
  (an unrelated artifact name).

### Changeset (mandatory)

CI runs a Changeset Gate (`changeset status`) that fails without one. `.changeset/config.json`
declares `changedFilePatterns = ["skills/**","agents/**",".claude-plugin/**","package.json",
"README.md"]`; this change touches `skills/`, `agents/`, and `README.md`, so a changeset is
mandatory. One changeset covers the whole change (the `website/**` edits are not gated but ride
along). Add one new file under `.changeset/` (e.g. `.changeset/rename-prompt-to-intent.md`) using
the existing frontmatter form:

```
---
"@automattic/radical-pipelines": minor
---

Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent".
```

**Recommended bump: `minor`** (consistent with existing changesets); the final bump is the owner's
call. The summary describes the rename.

## Task decomposition for the code phase

A lean 5-group edit + 1 verification group. Groups are independent and each is self-verifiable;
verification runs last so the acceptance greps run against the finished tree.

- **Group A — Skill core + reference (12 files).** `SKILL.md`, `reference/pipeline-versioning.md`
  (respect flag 1), `reference/fork-pipeline.md`, `reference/autonomous-workflow.md`,
  `reference/assisted-workflow.md`, `reference/create-pipeline.md` (includes the clause rewrite),
  `reference/manage-issues.md`, `reference/conventions/setup.md`,
  `reference/autonomous-phases/1 - spec.md`, `reference/assisted-phases/1 - spec.md`,
  `reference/assisted-phases/2 - design-doc.md`, `reference/assisted-phases/3 - plan.md`. Apply the
  per-occurrence spec above.
- **Group B — Agent profiles, mixed, per-occurrence (4 files).** `spec-analyst.md` (all-rename),
  `spec-writer.md` (rename, **KEEP line 15**), `spec-reviewer.md` (single FOLDER + FILE),
  `spec-consolidator.md` (rename, **KEEP line 8**). Judge each occurrence; do not blanket-rename.
- **Group C — README (1 file).** `README.md`: LABEL + two SOFT, **KEEP** the "same prompt, the
  same context" line.
- **Group D — Website, string-consistency critical (2 files).** `website/demo.js` (respect
  flag 2; **KEEP** `cc-prompt`), `website/index.html` (**KEEP** "prompt engineering" and "Same
  prompt, different run"; do not touch `requirements.md`).
- **Group E — Changeset (1 new file).** Per [Changeset](#changeset-mandatory). Bump `minor`.
- **Group F — Verification.** Run the three acceptance greps and `changeset status`; spot-check the
  four behavioral criteria below.

## Verification

The change is correct and complete when all of the following hold. The three greps are the
verifiability backbone; all exclude `.pipelines/` so historical run artifacts do not count, and
greps 2 and 3 also exclude `.rp.md` (out of scope).

| # | Command | Before | After (target) |
|---|---|---|---|
| 1 | `git grep -nIE "0-prompt\|prompt\.md" -- ':!.pipelines'` | 42 | **0** |
| 2 | `git grep -nIE "0 [-–] Prompt\|Phase 0\. Prompt\|\(Prompt " -- ':!.pipelines' ':!.rp.md'` | 5 | **0** |
| 3 | `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` | 81 | **exactly the 25 KEEP lines** |

The 81 in-scope-plus-keep occurrences partition into **56 RENAME** (all change) and **25 KEEP**
(all stay). The 25 keeps break down as **agents 14 + skills 6 + website 4 + README 1**. Any
"prompt"/"Prompt" outside that set is a missed rename; any KEEP line that changed is an erroneous
rename.

Plus:

- `changeset status` passes.
- **No old-name trace in the skill** — `skills/radical-pipelines/` contains no
  formerly-prompt/backward-compat/dual-name/migration text and no special-casing for legacy
  `0-prompt` pipelines.
- **The crux sentence is reworded** (not a 1:1 swap): says "intent" and does not assert "intent
  directed at the agents".
- **The website demo still animates** — all three `website/demo.js` `'prompt.md'` literals renamed
  together so the string-equality matching still resolves.
- **No behavior change** — the diff is text/string renames + the one clause rewrite + the
  changeset; no logic, control-flow, or file-read-order changes.

## Out of scope

- **This run's own `.pipelines/107-rename-prompt-to-intent/0-prompt/` folder** is historical data,
  left byte-for-byte. Run #107 was created under the old convention before the rename ships; its
  phase-0 folder records a past run, not the skill. It is one of eight `.pipelines/` artifacts (six
  foldered `0-prompt/prompt.md` + two older flat-layout `prompt.md`), all left untouched. Future
  runs created after this ships use `0-intent/intent.md` — no contradiction.
- **`.rp.md` — untouched (all three occurrences).** It lives at the repository root, not under
  `skills/radical-pipelines/`, so it is outside the "no trace in the skill" constraint and outside
  the issue's scope. `.rp.md:35` `0 - Prompt` is the **label form of a live Linear workflow state**
  the orchestrator sets at runtime — renaming the reference without renaming the external Linear
  state would break the phase-0 status-set (a behavior change forbidden by "pure rename").
  `.rp.md:54` "Add prompt (orchestrator)" commit example and `.rp.md:76` `/loop 15m <prompt>` are
  kept for whole-file consistency / generic sense. `.rp.md` contains no path token (its
  `0 - Prompt` is the label form, not the folder), so it does not affect grep 1; greps 2 and 3
  exclude it.
- **The Linear workflow states "0 - Prompt" … "5 - Docs" are not renamed.** Renaming them in the
  Linear workspace to match is a separate, optional operational change.
- **No backward-compat / dual-name / migration text, no `git mv`, no logic/control-flow/read-order
  change.**
