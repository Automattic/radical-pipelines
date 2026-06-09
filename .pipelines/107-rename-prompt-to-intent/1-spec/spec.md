# Spec: Rename the phase-0 artifact "prompt" → "intent"

## Overview

Radical Pipelines is an orchestrator skill that takes a software issue through six sequential phases. Phase 0 is currently called **"Prompt"**: its artifact is `prompt.md`, it lives in a `0-prompt/` folder, and the phase label is "Prompt". This name is misleading and overloaded — the artifact is really a structured statement of *intent* that seeds the pipeline, and the word "prompt" is also used everywhere for the unrelated LLM/agent sense (every phase agent receives a launch/spawn prompt).

This change renames the phase-0 artifact, folder, and phase label from "prompt" to "intent" across all **forward-looking definitions** of the skill, so that going forward the phase-0 artifact is `intent.md`, its folder is `0-intent/`, and the phase is called "Intent".

This is a **pure rename — no behavior changes.** No logic, control flow, file-reading order, or runtime behavior changes. The only edits are text/string substitutions (plus one small clause rewrite, called out below) and a changeset.

The skill must read **as if the phase was always called "intent"**: no "formerly prompt" notes, no backward-compatibility text, no dual-name handling, and no special-casing or migration instructions for legacy `0-prompt` pipelines anywhere in the skill. If the orchestrator later encounters a legacy pipeline whose first phase folder is `0-prompt`, it does what it can at runtime, but the skill documents nothing about it. No migration debt is left anywhere.

Two senses of "prompt" coexist in this codebase and must be kept distinct:

- **The phase-0 artifact / folder / phase label** — this is what gets renamed to "intent". It appears both as path tokens (`prompt.md`, `0-prompt/`) and as prose that *names* the artifact (e.g. "treat the prompt as a hypothesis", "the raw prompt", "synthesize the prompt").
- **The generic LLM/agent "prompt"** — the message sent *to* an agent (launch prompt, spawn prompt, the orchestrator's prompt, the loop prompt `/loop 5m <prompt>`), the LLM-prompt sense in non-determinism copy, the `cc-prompt` CSS class, and the "prompt engineering" SEO keyword. This is the overloaded sense the issue deliberately preserves and must **not** change.

Because both senses appear — sometimes in the same file — this is **not a blanket find-replace**. The Requirements section below enumerates exactly which occurrences change and which stay.

## Requirements

All paths below are relative to the repository root. Line numbers reflect the current tree and may shift as edits land; the per-occurrence classification (FOLDER / FILE / LABEL / SOFT / KEEP) is authoritative, not the line numbers.

Token classes used below:
- **FOLDER** — the folder name token `0-prompt` → `0-intent`.
- **FILE** — the filename token `prompt.md` → `intent.md`.
- **LABEL** — the phase name in prose/tables/sequences: "Prompt" / "0 - Prompt" / "Phase 0. Prompt" / "(Prompt → …)" → "Intent" / "0 - Intent" / "Phase 0. Intent" / "(Intent → …)".
- **SOFT** — prose where the bare word "prompt" *names* the phase-0 artifact (not a path token) → "intent".

### R1. Skill — `skills/radical-pipelines/`

Rename the phase-0 artifact/folder/label in the following skill files. These define the pipeline forward-looking, so the "no trace of the old name in the skill" constraint applies in full.

- `SKILL.md`
  - description, phase sequence "(Prompt → Spec → …)" — **LABEL**.
  - phases table row `| 0 | Prompt | `0-prompt` | … |` — **LABEL + FOLDER**.
- `reference/pipeline-versioning.md`
  - table row `| 0 – Prompt | `0-prompt/prompt.md` |` — **LABEL + FOLDER + FILE**.
  - the `0-prompt` shared-root phase-folder occurrences in the versioning trie / ASCII tree (multiple lines, including literal text inside the ASCII-tree code block) — **FOLDER** (some lines contain the token twice; rename every instance).
- `reference/fork-pipeline.md`
  - `0-prompt` as the lowest inheritable phase folder (multiple lines, some with the token twice) — **FOLDER**.
  - "only the prompt is inherited" — **SOFT** → "only the intent is inherited" (forking at phase 0 copies just that one folder; "the prompt" is the inherited phase-0 artifact).
- `reference/autonomous-workflow.md`
  - table row `| 0 - Prompt | `0-prompt` | Already in place |` — **LABEL + FOLDER**.
  - **KEEP** the "agent's initial prompt" reference (generic launch message — see R3).
- `reference/assisted-workflow.md`
  - table row `| 0 - Prompt | `0-prompt` | Already in place |` — **LABEL + FOLDER**.
- `reference/create-pipeline.md`
  - writes `prompt.md` — **FILE**.
  - heading "### 4. Generate the initial prompt" — **SOFT** → "Generate the initial intent".
  - "Write the prompt to …" — **SOFT + FOLDER + FILE** (the prose word and the path token both rename).
  - **CLAUSE REWRITE (the one non-mechanical edit):** the sentence currently reading "Adapt the issue content as a prompt directed at the agents that will run subsequent phases." The referent is the phase-0 artifact, so "prompt" cannot stay; but a blind swap to "as an intent directed at the agents" reads wrong (the intent is the owner's statement, not a message aimed at agents — the per-agent spawn message is assembled separately and later). This sentence must be **reworded** so it (a) says "intent" and (b) does not awkwardly assert "intent directed at the agents." Recommended phrasing: *"Adapt the issue content into the intent that seeds the subsequent phases."* Exact wording is the implementer's call within those two constraints.
  - creates `0-prompt/` and places assets in it — **FOLDER + FILE**.
- `reference/manage-issues.md`
  - "the phase-0 prompt — create-pipeline.md turns the issue into `0-prompt/prompt.md` … the prompt format" — **SOFT ×2 + FOLDER + FILE** (both prose words → "intent", plus the path token). The section title "## The issue format" enumerates a structured Title/Goal/Constraints/Context/Assumptions shape, which is precisely "a structured statement of intent".
- `reference/autonomous-phases/1 - spec.md`
  - "from phase 0 (prompt) to phase 1" — **SOFT** → "(intent)" (parenthetical phase name; keep parallel with the assisted sibling below).
  - reads `<artifacts-folder>/0-prompt/prompt.md` — **FOLDER + FILE**.
- `reference/assisted-phases/1 - spec.md`
  - "phase 0 (`prompt.md`)" — **FILE** → "(`intent.md`)" (keep parallel with the autonomous sibling above).
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "<contents of `prompt.md` …>" — **FILE**.
  - "should not need … `prompt.md`" — **FILE**.
- `reference/assisted-phases/2 - design-doc.md`
  - the two standalone-without-`prompt.md` references — **FILE**.
- `reference/assisted-phases/3 - plan.md`
  - the standalone-without-`prompt.md` reference — **FILE**.
- `reference/conventions/setup.md`
  - the artifact-folder contents list includes `prompt.md` (two occurrences) — **FILE**.
  - "Each pipeline pulls its initial prompt from an issue" — **SOFT** → "initial intent".

### R2. Agent profiles — `agents/`

Only four agent profiles ever read the phase-0 artifact as input — `spec-analyst`, `spec-writer`, `spec-reviewer`, `spec-consolidator` — because each downstream phase reads only its immediate upstream artifact. Consequently, in every other (`code-*`, `doc-*`, `design-*`) profile, "prompt" can only be the generic launch/spawn message and is left unchanged (see R3).

The four spec-phase files are **mixed**: they contain both rename-and-keep occurrences. Do **not** blanket-rename bare "prompt" in them — judge each occurrence individually.

- `agents/spec-analyst.md`
  - "You turn a rough prompt into a clear, complete set of testable requirements" — **SOFT** → "a rough intent".
  - "**Treat the prompt as a hypothesis.**" — **SOFT** → "the intent".
  - "a premise the prompt depends on" — **SOFT** → "the intent". (Same line also contains the `0-prompt/prompt.md` path token — **FOLDER + FILE**.)
  - heading "### 1. Understand the prompt" — **SOFT** → "Understand the intent".
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "contents of `prompt.md`" — **FILE**.
  - the HTML comment `<!-- The original idea from prompt.md -->` — **FILE**.
  - (This file contains **no** generic "prompt".)
- `agents/spec-writer.md`
  - "synthesize the prompt and the spec research record" — **SOFT** → "the intent".
  - reads `0-prompt/prompt.md` — **FOLDER + FILE**.
  - "from `spec.md` alone, without the research record or the prompt" — **SOFT** → "the intent".
  - the blocker reference "not confirmed in `spec-research.md` or `prompt.md`" — **FILE**.
  - **KEEP:** the generic line "the orchestrator's prompt cited a review file" — this is the launch message, not the phase-0 artifact. Do **not** rename.
- `agents/spec-reviewer.md`
  - reads `0-prompt/prompt.md` — **FOLDER + FILE** (only occurrence).
- `agents/spec-consolidator.md`
  - reads `prompt.md` — **FILE**.
  - the standalone-without-`prompt.md` reference — **FILE**.
  - "`prompt.md` missing" — **FILE**.
  - **KEEP:** the generic line "Your spawn prompt includes…" — this is the launch message. Do **not** rename.

### R3. KEEP — generic "prompt" that must NOT change

The following 25 occurrences are the deliberately-preserved generic sense (the overloaded LLM/agent "prompt" the issue calls out). They must remain exactly as-is. After the rename they are the only "prompt"/"Prompt" occurrences expected to remain (outside `.pipelines/` and `.rp.md`):

- `README.md` — "The same prompt, the same context, can produce a different result every time" (LLM non-determinism copy, in "## The problem" before phases are introduced).
- `agents/code-plan-writer.md`, `agents/code-reviewer.md` (two lines), `agents/code-writer.md` (two lines), `agents/design-doc-researcher.md`, `agents/design-doc-writer.md`, `agents/doc-plan-writer.md`, `agents/doc-reviewer.md` (two lines), `agents/doc-writer.md`, `agents/spec-researcher.md` — "launch prompt" / "spawn prompt" / "the orchestrator's prompt" (the message sent *to* an agent). Note `code-writer.md`'s "should not need to read the prompt, spec, design doc…" is generic: the code-writer never reads the phase-0 artifact, so "the prompt" there is the launch message.
- `agents/spec-consolidator.md` — "Your spawn prompt includes…" (see R2).
- `agents/spec-writer.md` — "the orchestrator's prompt cited a review file" (see R2).
- `skills/radical-pipelines/reference/autonomous-workflow.md` — "agent's initial prompt".
- `skills/radical-pipelines/reference/conventions/claude-code.md` — `/loop 5m <prompt>`.
- `skills/radical-pipelines/reference/conventions/pi.md` — `/loop 5m <prompt>`.
- `skills/radical-pipelines/reference/health-monitoring.md` (three lines) — "Loop prompt template" and the monitor's loop prompt.
- `website/demo.js` — the CSS class `cc-prompt` (with its literal command `> work on issue #1234`).
- `website/index.html` — meta keywords "prompt engineering" (SEO); and "Same prompt, different run, different result" (non-determinism re-run copy).
- `website/styles.css` — the `.term-body .cc-prompt` CSS selector.

### R4. README — `README.md`

- "**Phase 0. Prompt.** The initial idea or request." — **LABEL** → "Phase 0. Intent."
- "Percentage of tasks that make it from prompt to finished implementation" — **SOFT** → "from intent to finished implementation" (names the pipeline's first phase as the start point).
- "(phase 0 is the raw prompt, an input rather than an agent-produced artifact…)" — **SOFT** → "the raw intent" (this sentence explicitly defines what phase 0 is — the clearest possible old-name trace if left).

(The "same prompt, the same context" line stays — see R3.)

### R5. Website — `website/`

- `website/demo.js`
  - `'prompt.md'` in the phase `reads` arrays and in the `pendingTree` array — **FILE**, three occurrences. **All three must change together.** demo.js renders the file tree by matching the `reads`/`writes` strings against `pendingTree` by string equality, so renaming only some of them breaks the tree-commit animation. This is a string-consistency requirement, not a logic change — there is no JS logic keyed on the literal string "prompt".
  - log line "Captured issue #1234 → prompt.md (phase 0 · input)" — **FILE**.
  - comment "// Phase 0 is the raw prompt — an input…" — **SOFT** → "the raw intent".
  - (Keep the `cc-prompt` CSS class — see R3.)
- `website/index.html`
  - `<span class="file done">prompt.md</span>` in the terminal `ls` listing — **FILE**.
  - (The adjacent `requirements.md` is an unrelated artifact name — do **not** touch. Keep "prompt engineering" and "Same prompt, different run" — see R3.)

### R6. Changeset (mandatory)

A changeset is **required**. CI runs a "Changeset Gate" (`changeset status`) that fails without one. `.changeset/config.json` declares `changedFilePatterns = ["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`; this change touches `skills/`, `agents/`, and `README.md`, so a changeset is mandatory. (`website/**` is not in `changedFilePatterns`, but the skill/agent/README edits trigger the gate, and one changeset covers the whole change.)

- Add one new changeset file under `.changeset/`.
- Use the existing frontmatter form `"@automattic/radical-pipelines": <bump>`. **Recommended bump: `minor`** (existing changesets use `minor` or `patch`); the final bump is the implementer's/owner's call.
- The changeset summary should describe the rename (phase-0 artifact "prompt" → "intent").

## Out of Scope

1. **`.rp.md` — left entirely untouched (both occurrences).** `.rp.md` lives at the repository root, **not** under `skills/radical-pipelines/`; it is the consuming project's own conventions overlay (this repo's concrete GitHub URL, Linear project id, etc.), which the generic skill reads as external input. It is therefore outside the "no trace of the old name in the skill" constraint and outside the issue's enumerated scope (skill / agents / README / website).
   - `.rp.md` "0 - Prompt" Linear-status instruction — untouched. `0 - Prompt` is a **real, pre-existing Linear workflow state** (live-verified on team "Billow", project id `15a89be6fe3c`; the state mirrors the phase name). The orchestrator sets the issue to the workflow state whose name equals that string. Renaming the `.rp.md` reference to "0 - Intent" without also renaming the live Linear state would break the phase-0 status-set at runtime — and renaming the external Linear state is a behavior-affecting change forbidden by "pure rename — no behavior changes."
   - `.rp.md` "Add prompt (orchestrator)" commit-format example — untouched (kept for consistency with the decision to leave `.rp.md` whole, even though renaming this one line would be harmless text).
2. **The Linear workflow states "0 - Prompt" … "5 - Docs"** are not renamed. Renaming "0 - Prompt" → "0 - Intent" in the Linear workspace to match is a separate, optional operational change, out of scope for this pipeline.
3. **Historical run artifacts under `.pipelines/`** stay byte-for-byte. These are records of past runs (data, not the skill): six foldered `0-prompt/prompt.md` artifacts and two older flat-layout `prompt.md` artifacts (no `0-prompt/` folder), all git-tracked. This explicitly **includes this run's own** `.pipelines/107-rename-prompt-to-intent/0-prompt/prompt.md` — run #107 was created under the old convention before the rename shipped, so its phase-0 folder is historical data and stays. (Future runs created after this change ships will use `0-intent/intent.md`. There is no contradiction.)
4. **The generic "prompt" concept is preserved exactly** — launch/spawn/loop prompts, the LLM-prompt-fed-to-an-agent sense, the `cc-prompt` CSS class and selector, the "prompt engineering" SEO keyword, and the "same prompt, different run" non-determinism copy. See R3 for the full list.
5. **No behavior changes, no migration debt.** The skill gains no backward-compatibility text, no dual-name handling, and no special-casing or migration instructions for legacy `0-prompt` pipelines. No logic, control flow, or runtime behavior changes.
6. **Unrelated names are not touched** — e.g. `requirements.md` in the website terminal listing, and the test files under `scripts/test/`.

## Acceptance Criteria

The change is correct and complete when **all** of the following hold. (Greps are scoped to exclude `.pipelines/` so historical artifacts do not count, and the second also excludes `.rp.md`, which is out of scope.)

1. **Path tokens go to zero.** Currently `git grep -nIE "0-prompt|prompt\.md" -- ':!.pipelines'` returns 42 hits. After the rename it MUST return **0**. (No generic-keep line contains the literal `0-prompt` or `prompt.md` — every keep is the bare word "prompt" — so a clean zero is achievable.)

2. **Only the generic keeps remain.** Currently `git grep -nIE "[Pp]rompt" -- ':!.pipelines' ':!.rp.md'` returns 81 hits (56 in-scope renames + 25 generic keeps). After the rename it MUST return **exactly the 25 KEEP occurrences listed in R3** (modulo line-number shifts) — no more, no fewer. Any "prompt"/"Prompt" outside that set is a missed rename; any KEEP line that changed is an erroneous rename.

3. **The folder is renamed in forward-looking definitions.** Every forward-looking reference to the phase-0 folder reads `0-intent` (never `0-prompt`); every forward-looking reference to the artifact file reads `intent.md` (never `prompt.md`); every forward-looking phase label reads "Intent" (never "Prompt").

4. **No old-name trace in the skill.** The skill (`skills/radical-pipelines/`) contains no "formerly prompt"/backward-compat/dual-name/migration text and no special-casing for legacy `0-prompt` pipelines.

5. **The `create-pipeline.md` crux sentence is reworded** (not a 1:1 token swap): it says "intent" and does not assert "intent directed at the agents".

6. **The website demo still animates.** All three `'prompt.md'` occurrences in `website/demo.js` (the `reads` arrays and the `pendingTree` array) are renamed together to `'intent.md'`, so the tree-commit animation's string-equality matching still resolves.

7. **A changeset exists.** A new file under `.changeset/` declares a bump for `@automattic/radical-pipelines` (recommended `minor`) and `changeset status` passes.

8. **No behavior change.** The diff contains only text/string renames (plus the one `create-pipeline.md` clause rewrite) and the changeset — no logic, control-flow, or file-read-order changes.
