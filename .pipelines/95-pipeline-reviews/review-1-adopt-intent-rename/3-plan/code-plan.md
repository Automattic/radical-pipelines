# Code Plan: Adopt the prompt → intent rename in the reviews feature

## Overview

This plan renames the **phase-0 sense** of "prompt" to "intent" across the reviews-feature branch's shipped files, bringing every phase-0 occurrence in line with trunk's post-#109 wording so the eventual human PR-merge re-introduces no divergence. It is a documentation/static-asset change only — no code, no runtime behavior, no new dependencies.

The transformation is governed by two rules fixed in the spec and design doc:

- **Per-occurrence, not per-file.** For any single phase-0 "prompt" occurrence: if #106 did **not** touch that line (it is byte-identical to its pre-rename form), bring it to **trunk's actual post-#109 text** (a clean token swap *except* the four non-mechanical edits); if #106 **added or rewrote** that line, apply #109's rename *boundary* to #106's content, preserving #106's structure (the `base/` run-folder model, the extracted shared format file).
- **Phase-0 sense only.** Only the input artifact a run starts from is renamed (the phase label "Prompt", the `0-prompt` folder token, the `prompt.md` file token, and prose naming the phase-0 input). The **generic sense** of "prompt" that #109 deliberately preserved — LLM/launch/spawn/loop prompts, the `cc-prompt` CSS class, the "prompt engineering" SEO keyword, the "Same prompt, different run" copy, and the live `.rp.md` Linear state — is left **verbatim**.

The two wording calls the spec deferred to phase 2 are now **resolved** (design doc, Key Decisions) and the resolutions are baked into Tasks 9 and 11 below:

- `create-pipeline.md`'s "adapt the issue content" bullet takes trunk's verb phrasing **with #106's `intent-format.md` pointer retained**, and does **not** add trunk's separate "Do not add requirements…" bullet (the discipline is already centralized in `intent-format.md`).
- `manage-issues.md:14` **adopts** trunk's reworded agent clause ("when the pipeline is created, the orchestrator turns the issue into …") while keeping #106's extracted-file pointer and `base/0-intent/intent.md` path; it does **not** re-inline the schema.

### Execution conventions for the implementer

- **Working directory:** `/Users/santosguillamot/Desktop/Code/radical-pipelines/.claude/worktrees/95-pipeline-reviews` (a git worktree of radical-pipelines). Run everything from here; never `cd` to the original repo root.
- **Commit:** a single commit on the current branch (`worktree-95-pipeline-reviews`). Never create a new branch. Commit message: imperative, sentence case, no trailing period, agent name in parentheses — e.g. `Adopt prompt to intent rename in reviews feature (code-writer)`.
- **No `git merge trunk` / no rebase.** The rename is applied directly to this branch's files (spec req 2; out-of-scope list). Trunk-verbatim targets in this plan were captured from `git show trunk:<path>` and `diff <(git show trunk:<path>) <path>` and are quoted exactly; the implementer copies them in, never invents a substitution.
- **`<artifacts-folder>`** below = `/Users/santosguillamot/Desktop/Code/radical-pipelines/.claude/worktrees/95-pipeline-reviews/.pipelines/95-pipeline-reviews/review-1-adopt-intent-rename/`.

### Scope guardrails (do NOT touch)

These contain only **generic** "prompt" or no phase-0 token and are explicitly out of scope (spec Out of Scope; acceptance criterion 8). Verified-present occurrences that MUST remain unchanged:

- `agents/code-writer.md:62` — "should not need to read the prompt, spec, design doc…" (generic; the one bare "the prompt" trunk left as "prompt").
- `skills/radical-pipelines/reference/autonomous-workflow.md:61` — "include the following project conventions in its initial prompt" (generic launch/spawn prompt; trunk kept it).
- `skills/radical-pipelines/reference/health-monitoring.md:70` — "The prompt references this file…" (generic loop prompt).
- `website/index.html:12` — `prompt engineering` SEO keyword; `website/index.html:153` — "Same prompt, different run" copy; `website/demo.js:271` — `cc-prompt` CSS class.
- `.rp.md:35` — both `0 - Prompt` references (live Linear state) and "on a review's prompt"; `.rp.md:54` — `Add prompt (orchestrator)`.
- `.gitignore`, `conventions/load.md`, `conventions/claude-code.md`, `conventions/pi.md`, the 6 reviewer agents, `autonomous-phases/4 - code.md`, `5 - docs.md`, `resume-pipeline.md`, `work-on-an-issue.md`, `.changeset/pipeline-reviews.md`.
- **All frozen `base/` and `.pipelines/` artifact content** (historical record).
- **`spec-reviewer.md:34`** — "only one ever exists **in this artifact folder**" is a #106 wording change (trunk reads "per pipeline"); it carries **no** phase-0 token. Per the per-occurrence rule, leave it exactly as #106 wrote it. Only line 14 of that file is renamed (Task 4).
- **`assisted-phases/2 - design-doc.md:66`** — "the authoritative statement of **intent** for this phase" is already generic "intent" on both branch and trunk; do not touch it. Only lines 106 and 135 of that file are renamed (Task 6).

---

## Tasks

> Tasks 1–12 are independent edits and may be done in any order, but the file **rename** in Task 1 must use `git mv` (preserve history) and Tasks 9 and 11 repoint references to the renamed file. Do all edits, then run the Task 13 verification before committing. Commit once (Task 14).

### Task 1: Rename `prompt-format.md` → `intent-format.md` and rewrite its three phase-0 prose lines

- **Goal:** The shared format file is renamed on disk and retitled, and its three phase-0 "prompt" prose occurrences become "intent"; the other three authoring-discipline bullets are untouched.
- **Files to change:** `skills/radical-pipelines/reference/prompt-format.md` → `skills/radical-pipelines/reference/intent-format.md`.
- **Changes:**
  1. `git mv skills/radical-pipelines/reference/prompt-format.md skills/radical-pipelines/reference/intent-format.md` (preserves history).
  2. Line 1 title: `# The Prompt Format` → `# The Intent Format`.
  3. Line 3: `This describes a prompt — whether a tracker issue body, a base prompt, or a review prompt. The prompt is the input to phase 1.` → `This describes an intent — whether a tracker issue body, a base intent, or a review intent. The intent is the input to phase 1.`
  4. Line 15: `A vague idea yields just a Title and a Goal. That is a complete, valid prompt.` → `…That is a complete, valid intent.`
  5. Line 21 (the "No requirements, design, or implementation." bullet): `Putting them in the prompt pre-empts the phase that exists to produce them.` → `Putting them in **the intent** pre-empts the phase that exists to produce them.` (Match the bullet's existing bolding of the artifact noun, mirroring trunk's parallel inlined rename at `manage-issues.md:30` "Putting them in **the issue** pre-empts…".)
  - **Leave unchanged:** lines 19 ("Capture, don't converge."), 20 ("Lead with the goal, then invite…"), 22 ("Reflect hypotheses back as open.") — no phase-0 token. Lines 5–13 schema bullets — no phase-0 "prompt" token.
- **Depends on:** none.
- **Traces to:** Spec req 10; design doc Components ("renamed by hand"). Spec acceptance criteria 4.
- **Acceptance:**
  - `skills/radical-pipelines/reference/prompt-format.md` no longer exists; `skills/radical-pipelines/reference/intent-format.md` exists.
  - `grep -nE 'prompt' skills/radical-pipelines/reference/intent-format.md` returns **zero** matches.
  - The file's title reads "# The Intent Format" and the three discipline bullets at lines 19, 20, 22 are byte-identical to the pre-rename file.

### Task 2: `SKILL.md` — description tag and phase-0 table row (non-mechanical edit #1)

- **Goal:** The skill description's phase enumeration and the phase-0 table row match trunk verbatim.
- **Files to change:** `skills/radical-pipelines/SKILL.md`.
- **Changes:**
  1. Line 3 description: `(Prompt → Spec → Design doc → Plan → Code → Docs)` → `(Intent → Spec → Design doc → Plan → Code → Docs)`.
  2. Replace the phase table header + phase-0 row + all data rows with trunk's re-aligned table (column widths change). The trunk table is:
     ```
     | #   | Phase      | Subfolder      | Produces                                                       |
     | --- | ---------- | -------------- | -------------------------------------------------------------- |
     | 0   | Intent     | `0-intent`     | The input                                                      |
     | 1   | Spec       | `1-spec`       | Requirements, acceptance criteria, out-of-scope                |
     | 2   | Design doc | `2-design-doc` | Architecture, API design, technical decisions, trade-offs      |
     | 3   | Plan       | `3-plan`       | Code plan and doc plan                                         |
     | 4   | Code       | `4-code`       | Code changes, unit and end-to-end tests, behavior verification |
     | 5   | Docs       | `5-docs`       | Documentation (both internal and external)                     |
     ```
     The key phase-0 change is `| 0 | Prompt | 0-prompt | The raw request (input, not something to create) |` → `| 0 | Intent | 0-intent | The input |` (description rewritten — **not** a token swap). Copy the whole table from trunk so the re-aligned column widths match.
- **Depends on:** none.
- **Traces to:** Spec req 4, 9 (non-mechanical edit #1); design doc Group C. Spec acceptance criteria 6.
- **Acceptance:**
  - `git show trunk:skills/radical-pipelines/SKILL.md | diff - skills/radical-pipelines/SKILL.md` shows **no** differences in the description line or the phases table (the file is a pure Group C take-trunk for these regions).
  - `grep -nE '0-prompt|Prompt →|\| 0 +\| Prompt' skills/radical-pipelines/SKILL.md` returns zero matches.

### Task 3: Four `spec-*` agent profiles — phase-0 terminology to trunk verbatim

- **Goal:** Every phase-0 "prompt" occurrence in the four `spec-*` agents matches trunk; the one #106 non-phase-0 divergence in `spec-reviewer.md` is left intact.
- **Files to change:** `agents/spec-analyst.md`, `agents/spec-consolidator.md`, `agents/spec-reviewer.md`, `agents/spec-writer.md`.
- **Changes** (exact per-line targets confirmed by `diff <(git show trunk:<f>) <f>`):
  - **`agents/spec-analyst.md`:**
    - L6: `turn a rough prompt into` → `turn a rough intent into`.
    - L16: `**Treat the prompt as a hypothesis.**` → `**Treat the intent as a hypothesis.**`.
    - L18: `a premise the prompt depends on` → `a premise the intent depends on`; and `(here, \`0-prompt/prompt.md\`)` → `(here, \`0-intent/intent.md\`)`.
    - L22: `### 1. Understand the prompt` → `### 1. Understand the intent`.
    - L24: `Read \`<artifacts-folder>/0-prompt/prompt.md\`` → `…/0-intent/intent.md`.
    - L25: `(the contents of \`prompt.md\`)` → `(the contents of \`intent.md\`)`.
    - L94: `<!-- The original idea from prompt.md -->` → `<!-- The original idea from intent.md -->`.
  - **`agents/spec-consolidator.md`:**
    - L14: `Read \`prompt.md\` in the artifacts folder` → `Read \`intent.md\` in the artifacts folder`.
    - L61: `the drafts, or \`prompt.md\`.` → `the drafts, or \`intent.md\`.`.
    - L80: `\`spec-research.md\` missing, \`prompt.md\` missing,` → `…, \`intent.md\` missing,`.
  - **`agents/spec-reviewer.md`:**
    - L14: `Read \`<artifacts-folder>/0-prompt/prompt.md\`` → `…/0-intent/intent.md`.
    - **Do NOT touch L34** ("only one ever exists in this artifact folder") — #106 wording, no phase-0 token; leaving it diverges from trunk intentionally per the per-occurrence rule.
  - **`agents/spec-writer.md`:**
    - L6: `synthesize the prompt and the spec research record` → `synthesize the intent and the spec research record`.
    - L12: `Read \`<artifacts-folder>/0-prompt/prompt.md\`` → `…/0-intent/intent.md`.
    - L56: `without the research record or the prompt.` → `…or the intent.`.
    - L61: `confirmed in \`spec-research.md\` or \`prompt.md\`,` → `…or \`intent.md\`,`.
- **Depends on:** none.
- **Traces to:** Spec req 4; design doc Group C. Spec acceptance criteria 6.
- **Acceptance:**
  - For `spec-analyst.md`, `spec-consolidator.md`, `spec-writer.md`: `diff <(git show trunk:agents/<f>) agents/<f>` is empty (pure take-trunk).
  - For `spec-reviewer.md`: `diff <(git show trunk:agents/spec-reviewer.md) agents/spec-reviewer.md` shows **only** the line-34 "in this artifact folder" / "per pipeline" difference — the line-14 phase-0 token matches trunk.
  - `grep -rnE '0-prompt|prompt\.md' agents/spec-analyst.md agents/spec-consolidator.md agents/spec-reviewer.md agents/spec-writer.md` returns zero matches.

### Task 4: `manage-issues.md` — line 14 and the line-18 discipline reference (non-mechanical edit #4 / deferred decision #2)

- **Goal:** Line 14 takes #109's *naming* and reworded agent clause onto #106's *extracted-file* structure and `base/` path (NOT trunk's inlined schema or flat path); line 18's discipline reference repoints to `intent-format.md`.
- **Files to change:** `skills/radical-pipelines/reference/manage-issues.md`.
- **Changes:**
  - **L14** — replace:
    `The issue body _is_ the phase-0 prompt — \`create-pipeline.md\` turns the issue into \`base/0-prompt/prompt.md\`. Author the issue using the shared schema, rendering rules, and authoring discipline in \`prompt-format.md\`.`
    with the design-doc-decided target (Key Decision #2):
    `The issue body _is_ the phase-0 intent — when the pipeline is created, the orchestrator turns the issue into \`base/0-intent/intent.md\`. Author the issue using the shared schema, rendering rules, and authoring discipline in \`intent-format.md\`.`
    - Adopts #109's reworded agent clause ("when the pipeline is created, the orchestrator turns the issue into …") in place of #106's "`create-pipeline.md` turns the issue into …".
    - Keeps #106's `base/0-intent/intent.md` path (trunk's flat `0-intent/intent.md` lacks the `base/` prefix — #106's path wins).
    - Keeps #106's extracted-file pointer; does **NOT** append trunk's "So this is both the issue template and the intent format. Render these sections…" inlined continuation.
    - **Note on capitalization:** the design doc's target sentence is lowercase "when" mid-sentence (after the em-dash); use the design-doc wording exactly (`— when the pipeline is created`). Trunk happens to render "— When"; the design doc's lowercase form is the authoritative target for this branch.
  - **L18** — `The authoring discipline in \`prompt-format.md\` applies across all steps below.` → `The authoring discipline in \`intent-format.md\` applies across all steps below.`
- **Depends on:** Task 1 (the renamed file must exist for the reference to resolve).
- **Traces to:** Spec req 8, 9 (non-mechanical edit #4); design doc Key Decision #2. Spec acceptance criteria 5, 6, 7.
- **Acceptance:**
  - `grep -nE '0-prompt|prompt\.md|prompt-format' skills/radical-pipelines/reference/manage-issues.md` returns zero matches.
  - Line 14 contains `base/0-intent/intent.md` (not flat `0-intent/intent.md`) and references `intent-format.md`; it does **not** contain "So this is both the issue template and the intent format" (schema not re-inlined).
  - Line 18 references `intent-format.md`.

### Task 5: `pipeline-versioning.md` — every phase-0 token, preserving #106's `base/` model

- **Goal:** Phase-folder table row, ASCII-tree roots, tree-compute tokens, and review-run prose all become intent; #106's `base/` run-folder phrasing is preserved.
- **Files to change:** `skills/radical-pipelines/reference/pipeline-versioning.md`.
- **Changes** (all occurrences are phase-0 sense; generic "prompt" does not appear in this file):
  - **L25:** `before the review's prompt is committed` → `before the review's intent is committed`; and `which is the prompt commit.` → `which is the intent commit.`
  - **L44** (completion table row): `| 0 – Prompt     | \`0-prompt/prompt.md\` |` → `| 0 – Intent     | \`0-intent/intent.md\` |`. (Note: the row uses an en-dash `–`, matching the existing table; re-pad the cell so the table stays aligned.)
  - **L55:** `When a review run has only its \`0-prompt/prompt.md\` committed` → `…its \`0-intent/intent.md\` committed`; `its prompt is the input to phase 1, just as the base prompt is for \`base\`` → `its intent is the input to phase 1, just as the base intent is for \`base\``; `resume starts phase 1 from the committed prompt` → `…from the committed intent`.
  - **L82:** `(\`base/0-prompt\`, \`base/1-spec\`, …)` → `(\`base/0-intent\`, \`base/1-spec\`, …)`.
  - **L87:** `\`base/0-prompt\` is identical across every pipeline` → `\`base/0-intent\` is identical across every pipeline`.
  - **L91:** `The root \`0-prompt\` carries no label` → `The root \`0-intent\` carries no label`.
  - **L96** (ASCII tree, inside the fenced code block): the root line `0-prompt` → `0-intent`.
  - **L110:** `branching straight off \`0-prompt\`` → `…off \`0-intent\``.
  - **L111:** both `0-prompt` tokens (`\`v1: 1-spec\` and \`0-prompt\``; `v4 shares only \`0-prompt\``) → `0-intent`.
  - **Preserve:** all `base/…` run-folder phrasing (the `base/` prefix is #106's model and must stay); the review-run linear-chain prose at L115 (no phase-0 token).
- **Depends on:** none.
- **Traces to:** Spec req 7; design doc Group D ("retain the `base/` run-folder model with intent naming"). Spec acceptance criteria 1, 2, 7.
- **Acceptance:**
  - `grep -nE '0-prompt|prompt\.md' skills/radical-pipelines/reference/pipeline-versioning.md` returns zero matches.
  - `grep -nE 'base prompt|review.s prompt|prompt commit|Prompt' skills/radical-pipelines/reference/pipeline-versioning.md` returns zero matches.
  - `grep -nE 'base/0-intent|base/1-spec' skills/radical-pipelines/reference/pipeline-versioning.md` confirms the `base/` model is retained.

### Task 6: Assisted/autonomous phase docs — `prompt.md` and "phase 0 (prompt)" to trunk verbatim

- **Goal:** The phase-0 input-path / standalone-reader references in the four phase docs match trunk.
- **Files to change:** `assisted-phases/1 - spec.md`, `assisted-phases/2 - design-doc.md`, `assisted-phases/3 - plan.md`, `autonomous-phases/1 - spec.md` (all under `skills/radical-pipelines/reference/`).
- **Changes:**
  - **`assisted-phases/1 - spec.md`:**
    - L3: `from phase 0 (\`prompt.md\`) to phase 1 (\`spec.md\`)` → `from phase 0 (\`intent.md\`) to phase 1 (\`spec.md\`)`.
    - L7: `- \`<artifacts-folder>/0-prompt/prompt.md\`` → `- \`<artifacts-folder>/0-intent/intent.md\``.
    - L36 (inside the fenced code block): `<contents of \`prompt.md\`, copied verbatim>` → `<contents of \`intent.md\`, copied verbatim>`.
    - L110: `the reader should not need \`spec-research.md\` or \`prompt.md\`.` → `…or \`intent.md\`.`.
  - **`assisted-phases/2 - design-doc.md`:**
    - L106: `without reading \`design-doc-research.md\`, \`spec.md\`, or \`prompt.md\`.` → `…or \`intent.md\`.`.
    - L135: `the reader should not need \`design-doc-research.md\`, \`spec.md\`, or \`prompt.md\`.` → `…or \`intent.md\`.`.
    - **Do NOT touch L66** ("authoritative statement of intent") — already generic intent, unchanged on trunk.
  - **`assisted-phases/3 - plan.md`:**
    - L124: `without reading \`plan-notes.md\`, \`design-doc.md\`, \`spec.md\`, or \`prompt.md\`.` → `…or \`intent.md\`.`.
  - **`autonomous-phases/1 - spec.md`:**
    - L3: `Advances the pipeline from phase 0 (prompt) to phase 1` → `…from phase 0 (intent) to phase 1`.
    - L7: `- \`<artifacts-folder>/0-prompt/prompt.md\`` → `- \`<artifacts-folder>/0-intent/intent.md\``.
- **Depends on:** none.
- **Traces to:** Spec req 4; design doc Group C. Spec acceptance criteria 1, 2.
- **Acceptance:**
  - `grep -rnE '0-prompt|prompt\.md|phase 0 \(prompt\)' "skills/radical-pipelines/reference/assisted-phases/" "skills/radical-pipelines/reference/autonomous-phases/1 - spec.md"` returns zero matches.
  - `diff <(git show "trunk:skills/radical-pipelines/reference/assisted-phases/3 - plan.md") "skills/radical-pipelines/reference/assisted-phases/3 - plan.md"` shows only #106-introduced (non-phase-0) differences, if any, with the line-124 token now matching trunk.

### Task 7: Workflow docs — phase-0 table rows to trunk verbatim; keep the generic spawn-prompt line

- **Goal:** The "0 - Prompt / `0-prompt`" table rows become "0 - Intent / `0-intent`"; the generic "initial prompt" spawn line in autonomous-workflow.md stays.
- **Files to change:** `skills/radical-pipelines/reference/assisted-workflow.md`, `skills/radical-pipelines/reference/autonomous-workflow.md`.
- **Changes:**
  - **`assisted-workflow.md` L17:** `| 0 - Prompt     | \`0-prompt\`     | Already in place                    |` → `| 0 - Intent     | \`0-intent\`     | Already in place                    |` (re-pad cells to keep the table aligned; trunk's row is `| 0 - Intent     | \`0-intent\`     | Already in place                    |`).
  - **`autonomous-workflow.md` L41:** `| 0 - Prompt     | \`0-prompt\`     | Already in place                      |` → `| 0 - Intent     | \`0-intent\`     | Already in place                      |`.
  - **Do NOT touch `autonomous-workflow.md` L61** ("include the following project conventions in its initial prompt") — generic launch/spawn prompt; trunk kept it.
- **Depends on:** none.
- **Traces to:** Spec req 4 (workflow rows; "initial prompt" spawn line is generic — keep it); design doc Group C. Spec acceptance criteria 1, 2, 3.
- **Acceptance:**
  - `grep -nE '0-prompt|0 - Prompt' skills/radical-pipelines/reference/assisted-workflow.md skills/radical-pipelines/reference/autonomous-workflow.md` returns zero matches.
  - `grep -n 'initial prompt' skills/radical-pipelines/reference/autonomous-workflow.md` still returns the L61 occurrence (generic, preserved).

### Task 8: `conventions/setup.md` — `prompt.md` artifact-list entries and "initial prompt" phase-0 prose to trunk verbatim

- **Goal:** The two artifact-list `prompt.md` entries become `intent.md`, and the phase-0 "initial prompt" prose becomes "initial intent", matching trunk.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`.
- **Changes:**
  - **L48:** `Where each pipeline's artifacts (\`prompt.md\`, \`spec.md\`, …)` → `…(\`intent.md\`, \`spec.md\`, …)`.
  - **L64:** `Each pipeline pulls its initial prompt from an issue` → `Each pipeline pulls its initial intent from an issue`.
  - **L113:** `A per-pipeline artifact folder containing \`prompt.md\`, \`spec.md\`, …` → `…containing \`intent.md\`, \`spec.md\`, …`.
- **Depends on:** none. (Spec req 4 notes this file's overrides-related divergence from trunk is out of scope — touch only the three phase-0 lines above.)
- **Traces to:** Spec req 4; design doc Group C. Spec acceptance criteria 1, 2.
- **Acceptance:**
  - `grep -nE 'prompt\.md|initial prompt' skills/radical-pipelines/reference/conventions/setup.md` returns zero matches.
  - `diff <(git show trunk:skills/radical-pipelines/reference/conventions/setup.md) skills/radical-pipelines/reference/conventions/setup.md` shows only the out-of-scope overrides divergence (#91), not any remaining phase-0 token.

### Task 9: `create-pipeline.md` — rename all phase-0 tokens onto #106's structure; "adapt the issue content" bullet (non-mechanical edit #3 / deferred decision #1)

- **Goal:** Every phase-0 token renamed within #106's `base/`-path structure; the "adapt the issue content" bullet takes trunk's verb phrasing **with #106's `intent-format.md` pointer retained**; trunk's added "Do not add requirements…" bullet is NOT added.
- **Files to change:** `skills/radical-pipelines/reference/create-pipeline.md`.
- **Changes:**
  - **L3:** `sets up the worktree and artifacts folder, writes \`prompt.md\`, and commits.` → `…writes \`intent.md\`, and commits.` (matches trunk's L3 rename).
  - **L21 heading:** `### 4. Generate the initial prompt` → `### 4. Generate the initial intent` (this "initial prompt" is the phase-0 input being created — phase-0 sense, renamed; distinct from the generic spawn-prompt line in autonomous-workflow.md).
  - **L23:** `Create the \`base/\` run folder and the phase 0 subfolder under it (\`base/0-prompt/\`) inside the artifact folder. Write the prompt to \`<artifacts-folder>/base/0-prompt/prompt.md\`.` → `…the phase 0 subfolder under it (\`base/0-intent/\`) inside the artifact folder. Write the intent to \`<artifacts-folder>/base/0-intent/intent.md\`.` (Keep #106's `base/` run-folder sentence structure — do **not** collapse to trunk's flat `0-intent/` shape.)
  - **L25 (the "adapt" bullet)** — replace:
    `- Adapt the issue content into the phase-0 prompt directed at the agents that will run subsequent phases, following the schema and authoring discipline in \`prompt-format.md\`.`
    with the design-doc-decided target (Key Decision #1):
    `- Adapt the issue content into the intent that seeds the subsequent phases, following the schema and authoring discipline in \`intent-format.md\`.`
    - Takes trunk's verb phrasing ("into the intent that seeds the subsequent phases") **and** keeps #106's pointer clause to the renamed shared file.
    - **Do NOT add** trunk's separate second bullet "Do not add requirements, technical directions, or implementation details — agents do their own research in later phases." (decision #1: the discipline is centralized in `intent-format.md`; adding it would duplicate).
  - **L26:** `place them in \`<artifacts-folder>/base/0-prompt/\`. Reference them explicitly in \`prompt.md\`` → `place them in \`<artifacts-folder>/base/0-intent/\`. Reference them explicitly in \`intent.md\`` (keep #106's `base/` path).
- **Depends on:** Task 1 (renamed file must exist).
- **Traces to:** Spec req 5, 9 (non-mechanical edit #3); design doc Key Decision #1. Spec acceptance criteria 4, 5, 7.
- **Acceptance:**
  - `grep -nE '0-prompt|prompt\.md|prompt-format|initial prompt|phase-0 prompt' skills/radical-pipelines/reference/create-pipeline.md` returns zero matches.
  - The file retains the `base/0-intent/intent.md` path (grep finds `base/0-intent`), references `intent-format.md`, and contains **no** "Do not add requirements, technical directions, or implementation details" bullet.

### Task 10: `fork-pipeline.md` — every `0-prompt` token and "only the prompt is inherited"; keep `base/` model

- **Goal:** Phase-folder tokens and the phase-0 inheritance prose become intent; #106's `base/` phrasing stays.
- **Files to change:** `skills/radical-pipelines/reference/fork-pipeline.md`.
- **Changes:**
  - **L14:** `by folder name (\`0-prompt\`, \`1-spec\`, …)` → `(\`0-intent\`, \`1-spec\`, …)`; `Pick \`0-prompt\` to start the new pipeline over from scratch — only the prompt is inherited.` → `Pick \`0-intent\` to start the new pipeline over from scratch — only the intent is inherited.`
  - **L38:** `\`base/0-prompt\` up to and including the inherited phase` → `\`base/0-intent\` up to and including the inherited phase`.
  - **L42:** `for every phase folder \`0-prompt\`, \`1-spec\`, … in the parent's \`base/\` run` → `for every phase folder \`0-intent\`, \`1-spec\`, …`.
  - **Preserve:** all surrounding `base/` run-folder phrasing.
- **Depends on:** none.
- **Traces to:** Spec req 6; design doc Group D. Spec acceptance criteria 1, 2, 7.
- **Acceptance:**
  - `grep -nE '0-prompt|prompt\.md|only the prompt' skills/radical-pipelines/reference/fork-pipeline.md` returns zero matches.
  - `grep -n 'base/0-intent' skills/radical-pipelines/reference/fork-pipeline.md` confirms the `base/` model is retained.

### Task 11: `review-pipeline.md` — rename every phase-0 use; repoint the format reference; keep generic "orchestrator-authored"

- **Goal:** All phase-0 occurrences (heading, path, prose, format reference) become intent; the generic "orchestrator-authored" wording stays.
- **Files to change:** `skills/radical-pipelines/reference/review-pipeline.md`.
- **Changes:**
  - **L3:** `takes it through phases 1–5 with a fresh review prompt.` → `…with a fresh review intent.`
  - **L31:** `before the review prompt is committed` → `before the review intent is committed`.
  - **L37 heading:** `### 5. Author and commit the review prompt` → `### 5. Author and commit the review intent`.
  - **L39:** `Author the review prompt at \`review-N-<short-description>/0-prompt/prompt.md\` the same way the base prompt is orchestrator-authored (the \`create-pipeline.md\` step-4 pattern), following the schema and authoring discipline in \`prompt-format.md\`.` → `Author the review intent at \`review-N-<short-description>/0-intent/intent.md\` the same way the base intent is orchestrator-authored (the \`create-pipeline.md\` step-4 pattern), following the schema and authoring discipline in \`intent-format.md\`.` Then `a review prompt carries these review-only additions:` → `a review intent carries these review-only additions:`.
  - **L41:** `issue and base prompts have none.` → `issue and base intents have none.`; and `so a later phase reading only this review prompt understands what prompted it` → `…reading only this review intent understands what prompted it` (the trailing "what prompted it" is generic verb usage — leave it; only "this review prompt" → "this review intent").
  - **L42:** `placed in this review run's \`0-prompt/\` folder and referenced relatively, the same as issue and base prompts.` → `…this review run's \`0-intent/\` folder and referenced relatively, the same as issue and base intents.`
  - **L44:** `The original issue and \`base/0-prompt\` are never rewritten. Then commit the review prompt` → `The original issue and \`base/0-intent\` are never rewritten. Then commit the review intent`.
  - **L52:** `The review prompt is phase 0 and is mode-independent` → `The review intent is phase 0 and is mode-independent`.
  - **Preserve:** "orchestrator-authored" (generic) — only the artifact noun changes around it (done above via "base intent is orchestrator-authored").
- **Depends on:** Task 1 (renamed file must exist).
- **Traces to:** Spec req 11; design doc Components ("renamed by hand"). Spec acceptance criteria 1, 2, 3, 4.
- **Acceptance:**
  - `grep -nE '0-prompt|prompt\.md|prompt-format|review prompt|base prompt|base prompts' skills/radical-pipelines/reference/review-pipeline.md` returns zero matches.
  - `grep -n 'intent-format.md' skills/radical-pipelines/reference/review-pipeline.md` confirms the format reference repointed.
  - `grep -n 'orchestrator-authored' skills/radical-pipelines/reference/review-pipeline.md` still present (generic preserved).

### Task 12: `README.md` — three phase-0 lines (line 112 is non-mechanical edit #2); leave the run-folder paragraph

- **Goal:** README's three #106-untouched phase-0 lines match trunk; the #106-expanded run-folder paragraph is left exactly as #106 wrote it.
- **Files to change:** `README.md`.
- **Changes:**
  - **L27:** `- **Phase 0. Prompt.** The initial idea or request.` → `- **Phase 0. Intent.** The initial idea or request.`
  - **L56:** `Percentage of tasks that make it from prompt to finished implementation` → `…from intent to finished implementation`.
  - **L112 (non-mechanical edit #2):** `(phase 0 is the raw prompt, an input rather than an agent-produced artifact, so it has no agent profile)` → `(phase 0 is the intent, an input rather than an agent-produced artifact, so it has no agent profile)`. **Trunk DROPS the word "raw"** — the result is "the intent", **not** "the raw intent". A clean swap of "the raw prompt" would wrongly yield "the raw intent". Copy trunk's exact L112 text.
  - **Do NOT touch** the #106-expanded run-folder paragraph (~L155, "Each phase commits inspectable review artifacts… `base/` run… `review-N-<short-description>/` run…") — it carries no phase-0 token and is #106's own content (per-occurrence rule).
- **Depends on:** none.
- **Traces to:** Spec req 4, 9 (non-mechanical edit #2); design doc Group C. Spec acceptance criteria 6.
- **Acceptance:**
  - `git show trunk:README.md | sed -n '27p;56p;112p'` matches the branch's lines 27, 56, 112 exactly (the three are pure take-trunk).
  - `grep -nE 'Phase 0\. Prompt|from prompt to|raw prompt|raw intent' README.md` returns zero matches (in particular, "raw intent" must NOT appear).

### Task 13: `website/` — `index.html` file token and `demo.js` phase-0 occurrences; keep `cc-prompt`, "Same prompt", "prompt engineering"; line 281 KEEPS "raw"

- **Goal:** The website's phase-0 `prompt.md` tokens become `intent.md` and demo.js's phase-0 comment becomes "raw intent" (keeping "raw"); the generic occurrences stay.
- **Files to change:** `website/index.html`, `website/demo.js`.
- **Changes:**
  - **`website/index.html` L119:** `<span class="file done">prompt.md</span>` → `<span class="file done">intent.md</span>`.
    - **Do NOT touch** L12 (`prompt engineering` SEO keyword) or L153 ("Same prompt, different run" copy).
  - **`website/demo.js`:**
    - **L12:** `reads: ['prompt.md', 'spec-research.md'],` → `reads: ['intent.md', 'spec-research.md'],`.
    - **L23:** `reads: ['spec.md', 'prompt.md'],` → `reads: ['spec.md', 'intent.md'],`.
    - **L140:** the `pendingTree` entry `'prompt.md',` → `'intent.md',`.
    - **L276:** `'  ⎿  Captured issue #1234 → prompt.md (phase 0 · input)'` → `'  ⎿  Captured issue #1234 → intent.md (phase 0 · input)'`.
    - **L281 (comment):** `// Phase 0 is the raw prompt — an input, already in place, not produced by an agent.` → `// Phase 0 is the raw intent — an input, already in place, not produced by an agent.` **KEEP "raw"** here (contrast README L112, which drops it — the two files genuinely differ; follow each file's actual trunk text).
    - **Do NOT touch** L271 (`cc-prompt` CSS class).
- **Depends on:** none.
- **Traces to:** Spec req 4 (the README/demo.js "raw" contrast restated in req 9). Spec acceptance criteria 1, 2, 3.
- **Acceptance:**
  - `grep -rnE 'prompt\.md' website/` returns zero matches.
  - `grep -n 'raw intent' website/demo.js` returns the L281 occurrence ("raw" kept).
  - `grep -nE 'cc-prompt|prompt engineering|Same prompt' website/index.html website/demo.js` still returns the three generic occurrences (preserved).

### Task 14: Verify (grep acceptance suite) and commit

- **Goal:** Run the spec's grep-based acceptance suite, confirm zero stale phase-0 tokens and intact generic/out-of-scope occurrences, then commit all changes in a single commit.
- **Files to change:** none (verification); then `git add -A && git commit`.
- **Verification commands** (run from the working directory; expected results inline):
  1. **Acceptance criterion 1 — zero phase-0 path tokens in shipped files:**
     `grep -rnE '0-prompt|prompt\.md' skills/ agents/ README.md website/` → **zero matches**.
  2. **Acceptance criterion 2 — zero phase-0 label/prose forms in shipped files:**
     `grep -rniE 'Phase 0\. Prompt|\(Prompt →|\| 0 +\| Prompt|0 - Prompt|phase 0 \(prompt\)|base prompt|review prompt|review.s prompt|the raw prompt' skills/ agents/ README.md website/` → **zero matches**. Also confirm no bare phase-0 "in the prompt": `grep -rn 'in the prompt' skills/ agents/ README.md website/` → **zero matches** (the `intent-format.md:21` bullet now reads "in the intent").
  3. **Acceptance criterion 3 — only generic "prompt" remains:** inspect the full residual list — `grep -rniE 'prompt' skills/ agents/ README.md website/` — and confirm every hit is one of: `cc-prompt`, `/loop <prompt>` / loop / self-contained prompt (health-monitoring/conventions), launch / spawn / initial prompt (autonomous-workflow.md:61, the generic ones), "prompt engineering" (index.html:12), "Same prompt" (index.html:153), `code-writer.md:62` "read the prompt". No phase-0 hit remains.
  4. **Acceptance criterion 4 — format-file rename + repoints:**
     `ls skills/radical-pipelines/reference/prompt-format.md` → **no such file**; `ls skills/radical-pipelines/reference/intent-format.md` → **exists**; `grep -rln 'prompt-format' skills/ agents/ README.md website/` → **zero matches**; `grep -rln 'intent-format' skills/` → returns exactly `create-pipeline.md`, `manage-issues.md`, `review-pipeline.md`; `grep -nE 'prompt' skills/radical-pipelines/reference/intent-format.md` → **zero matches**.
  5. **Acceptance criterion 5 — extracted-file architecture preserved:** `grep -n 'intent-format.md' skills/radical-pipelines/reference/manage-issues.md` → present; and `grep -n 'So this is both the issue template' skills/radical-pipelines/reference/manage-issues.md` → **zero matches** (not re-inlined).
  6. **Acceptance criterion 6 — the four non-mechanical edits:**
     - `grep -n '| 0   | Intent     | \`0-intent\`     | The input' skills/radical-pipelines/SKILL.md` (or `git show trunk:skills/radical-pipelines/SKILL.md | diff - skills/radical-pipelines/SKILL.md` empty on the table) → SKILL row correct.
     - `grep -n 'phase 0 is the intent' README.md` → present; `grep -n 'raw intent' README.md` → **zero matches**; `grep -n 'Phase 0 is the raw intent' website/demo.js` → present.
     - `grep -n 'into the intent that seeds the subsequent phases' skills/radical-pipelines/reference/create-pipeline.md` → present.
     - `grep -n 'base/0-intent/intent.md' skills/radical-pipelines/reference/manage-issues.md` → present.
  7. **Acceptance criterion 7 — Group D `base/` model retained:** `grep -ln 'base/0-intent\|base/' skills/radical-pipelines/reference/create-pipeline.md skills/radical-pipelines/reference/fork-pipeline.md skills/radical-pipelines/reference/pipeline-versioning.md` → all three present.
  8. **Acceptance criterion 8 — out-of-scope files unchanged:** `git status --porcelain` lists **only** the files touched by Tasks 1–13 (the renamed format file plus the edited skill/agent/README/website files). Confirm `.rp.md`, `.gitignore`, `conventions/load.md`, `conventions/claude-code.md`, `conventions/pi.md`, `health-monitoring.md`, the 6 reviewer agents, `autonomous-phases/4 - code.md`, `5 - docs.md`, `resume-pipeline.md`, `work-on-an-issue.md`, `.changeset/pipeline-reviews.md`, and all `base/` / `.pipelines/` artifacts are **NOT** in the changed set.
- **Commit:** `git add -A` (captures the `git mv` rename + all edits), then commit with a message following the **Commit format** convention, e.g. `Adopt prompt to intent rename in reviews feature (code-writer)`.
- **Depends on:** Tasks 1–13.
- **Traces to:** Spec Acceptance Criteria 1–8; design doc Failure Modes and Observability (the grep suite is the verification procedure).
- **Acceptance:**
  - All eight verification checks above produce their expected results.
  - The working tree changes are committed in a single commit on the current branch; `git show --stat HEAD` lists exactly the renamed file and the Tasks 2–13 files, and no out-of-scope file.

---

## Coverage map (spec requirement → task)

| Spec req | Covered by |
| -------- | ---------- |
| 1, 2, 3 (rename boundary + preserve generic) | All edit tasks; guardrails in Overview; Task 14 checks 2, 3 |
| 4 (Group C take-trunk files) | Tasks 2 (SKILL), 3 (spec-* agents), 6 (phase docs), 7 (workflow docs), 8 (setup.md), 12 (README), 13 (website) |
| 5 (create-pipeline.md union) | Task 9 |
| 6 (fork-pipeline.md union) | Task 10 |
| 7 (pipeline-versioning.md union) | Task 5 |
| 8 (manage-issues.md conflict) | Task 4 |
| 9 (four non-mechanical edits) | #1 SKILL → Task 2; #2 README:112 → Task 12; #3 create-pipeline bullet → Task 9; #4 manage-issues:14 → Task 4 |
| 10 (prompt-format.md → intent-format.md rename + body) | Task 1 |
| 11 (review-pipeline.md) | Task 11 |
| Acceptance criteria 1–8 | Task 14 |

## Notes for the implementer

- **Two deferred decisions are settled** (design doc) and encoded in Tasks 9 and 11/4 — do not re-open them. Specifically: keep the `intent-format.md` pointer on create-pipeline.md's adapt bullet (don't add trunk's extra bullet), and adopt trunk's orchestrator clause on manage-issues.md:14 (don't re-inline the schema, don't drop the `base/` path).
- **The README/demo.js "raw" split is intentional:** README:112 drops "raw" (→ "the intent"); demo.js:281 keeps it (→ "the raw intent"). Follow each file's actual trunk text, not a uniform rule.
- **`spec-reviewer.md:34` and `assisted-phases/2:66` are deliberately left diverging from / matching trunk** per the per-occurrence rule — they carry no phase-0 token. Do not "fix" them.
- **Trunk-verbatim is the target for all Group C occurrences.** When in doubt, re-run `diff <(git show trunk:<path>) <path>` and confirm the only remaining differences are #106-introduced non-phase-0 content.
