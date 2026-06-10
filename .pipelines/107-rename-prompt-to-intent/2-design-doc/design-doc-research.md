# Design research: rename phase-0 artifact "prompt" → "intent"

Running record of the design Q&A for issue #107. Driven by `design-doc-analyst`; the
`design-doc-researcher` was engaged across the topics below, and every load-bearing fact was
verified directly against the live tree (raw command output is reproduced inline). Input: the
approved spec at `.pipelines/107-rename-prompt-to-intent/1-spec/spec.md`.

This is a **pure mechanical rename, no behavior change.** The spec is exhaustive: it already
enumerates every occurrence with a FOLDER / FILE / LABEL / SOFT / KEEP class and three
acceptance greps. The design's job is therefore narrow — settle the **execution approach** and
lock down a small number of load-bearing facts that determine *how* the code phase runs. We
deliberately do **not** re-derive or restate the spec, and we invent no architecture.

The three spec grep baselines were confirmed against the live tree before any design decision:

| Grep | Spec expects | Tree returns |
|---|---|---|
| `git grep -nIE "0-prompt\|prompt\.md" -- ':!.pipelines'` | 42 | 42 ✓ |
| `git grep -nIE "0 [-–] Prompt\|Phase 0\. Prompt\|\(Prompt " -- ':!.pipelines' ':!.rp.md'` | 5 | 5 ✓ |
| `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` | 81 | 81 ✓ |

The spec is fully grounded in the real tree, so the design builds directly on it.

---

## Topic 1 — Folder rename mechanics: is `git mv` needed? (DECIDED)

**Question.** The launch brief mentioned renaming the `0-prompt/` folder "via `git mv` to
preserve history." Does the forward-looking skill actually ship a real `0-prompt/` directory or
a real `prompt.md` file on disk (which would need `git mv`), or does `0-prompt`/`prompt.md`
appear only as **text inside** `.md`/`.js`/`.html` files?

**Evidence.** Every tracked file PATH whose components contain `0-prompt` or `prompt.md`:

```
$ git ls-files | grep -E '0-prompt|prompt\.md'
.pipelines/107-rename-prompt-to-intent/0-prompt/prompt.md
.pipelines/68-recommend-standard-remote-names/0-prompt/prompt.md
.pipelines/70-restructure-repository-layout/0-prompt/prompt.md
.pipelines/8-research-how-to-package-agents-and-skills-in-pi/prompt.md
.pipelines/81-changelog-version-sync/0-prompt/prompt.md
.pipelines/83-automate-releases/0-prompt/prompt.md
.pipelines/9-create-setup-to-populate-project-conventions/prompt.md
.pipelines/90-per-agent-model-config/0-prompt/prompt.md

$ git ls-files | grep -E '0-prompt|prompt\.md' | grep -v '^\.pipelines/'
(none — all are under .pipelines/)

$ find . -type d -name '0-prompt' -not -path './.git/*'
./.pipelines/83-automate-releases/0-prompt
./.pipelines/81-changelog-version-sync/0-prompt
./.pipelines/107-rename-prompt-to-intent/0-prompt
./.pipelines/70-restructure-repository-layout/0-prompt
./.pipelines/68-recommend-standard-remote-names/0-prompt
./.pipelines/90-per-agent-model-config/0-prompt
```

**Decision.** **No `git mv`. No path moves. No history-preservation concern.** There is no
real `0-prompt/` directory and no `prompt.md` file anywhere in scope. Every directory named
`0-prompt` and every file named `prompt.md` on disk lives under `.pipelines/` — those are the
six foldered + two flat-layout historical run artifacts the spec lists as out-of-scope (item 3),
left byte-for-byte. The `0-prompt`/`prompt.md` tokens in the skill, agents, README, and website
exist **only as text inside files** (path-token *strings* in prose, tables, and JS string
literals). The entire change is therefore **pure in-file text/string edits plus one new
changeset file** — exactly what the spec's acceptance criterion 9 ("the diff contains only
text/string renames … no logic, control-flow, or file-read-order changes") asserts.

This is a real, evidence-grounded simplification: the code phase must **not** attempt to move a
folder, and the design doc must carry no phantom `git mv` step. (The brief's `git mv` mention was
a precautionary default; the tree shows it does not apply here.)

---

## Topic 2 — The one non-mechanical edit: `create-pipeline.md:25` clause rewrite (DECIDED)

**Question.** The spec's single non-mechanical edit. The current sentence reads:

> `create-pipeline.md:25` — "Adapt the issue content **as a prompt directed at the agents** that
> will run subsequent phases."

A blind token swap to "as an intent directed at the agents" reads wrong (the intent is the
owner's statement that seeds the pipeline, not a message aimed at agents — the per-agent spawn
message is assembled separately and later). The spec's two constraints: the reworded sentence
(a) must say "intent" and (b) must **not** assert "intent directed at the agents."

**Evidence — the full section context (lines 21–28):**

```
### 4. Generate the initial prompt                                                  (21)
Create the phase 0 subfolder (`0-prompt/`) inside the artifact folder.              (23)
Write the prompt to `<artifacts-folder>/0-prompt/prompt.md`.
- Adapt the issue content as a prompt directed at the agents that will run …        (25)  ← crux
- Do not add requirements, technical directions, or implementation details —        (26)
  agents do their own research in later phases.
- If the issue has screenshots or other assets, … place them in                     (27)
  `<artifacts-folder>/0-prompt/`. Reference them explicitly in `prompt.md` …
- The phase 0 subfolder must be self-contained …                                    (28)
```

Key finding: the "**add no requirements / technical-direction / implementation**" half of the
meaning lives in **line 26 — a separate bullet that contains no "prompt" token and stays
untouched.** So the crux rewrite of line 25 only needs to carry the "adapt the issue content
into the phase-0 artifact" half; line 26 continues to carry the rest verbatim.

**Decision.** Rewrite line 25 to the spec's recommended phrasing:

> **"Adapt the issue content into the intent that seeds the subsequent phases."**

This satisfies both constraints, parallels the spec's own Overview language ("a structured
statement of intent that seeds the pipeline"), and reads coherently immediately before the
untouched line 26. Exact wording is the code-phase implementer's call within the two constraints
(say "intent"; do not assert "intent directed at the agents"), per the spec.

The rest of section 4 renames mechanically: heading (21) "Generate the initial **intent**" (SOFT);
(23) "Create the phase 0 subfolder (`0-intent/`) … Write the **intent** to
`<artifacts-folder>/0-intent/intent.md`" (SOFT + FOLDER + FILE); (27) `0-intent/` and `intent.md`
(FOLDER + FILE). Note line 23's bare "Write **the prompt** to …" is a SOFT occurrence (names the
artifact) → "Write **the intent** to …", as the spec's R1 entry "Write the prompt to … —
SOFT + FOLDER + FILE" specifies.

---

## Topic 3 — Mixed-file KEEP boundaries (DECIDED)

**Question.** The four spec-phase agent profiles are *mixed* (rename-and-keep in the same file).
Two of them — `spec-writer.md`, `spec-consolidator.md` — additionally contain a generic
launch/spawn "prompt" line that must be KEPT. Confirm the per-occurrence boundary so the code
phase does not blanket-rename.

**Evidence — `agents/spec-writer.md`:**

```
6:  … synthesize the prompt and the spec research record into a standalone `spec.md`.   → SOFT (intent)
12: Read `<artifacts-folder>/0-prompt/prompt.md` — the original idea.                   → FOLDER + FILE
15: If the orchestrator's prompt cited a review file, read it and address every issue.  → KEEP (launch msg)
56: … from `spec.md` alone, without the research record or the prompt.                  → SOFT (intent)
61: … not been confirmed in `spec-research.md` or `prompt.md`, …                        → FILE
```

**Evidence — `agents/spec-consolidator.md`:**

```
8:  Your spawn prompt includes the **artifacts folder** path …                          → KEEP (launch msg)
14: Read `prompt.md` in the artifacts folder — the original idea.                        → FILE
61: … the reader should not need `spec-research.md`, the drafts, or `prompt.md`.         → FILE
80: … `spec-research.md` missing, `prompt.md` missing, … still follow the … protocol.   → FILE
```

**Decision.** Confirmed — matches the spec's R2 exactly. In `spec-writer.md`, line 15
("orchestrator's prompt cited a review file") is the only KEEP; lines 6, 12, 56, 61 rename. In
`spec-consolidator.md`, line 8 ("Your spawn prompt includes…") is the only KEEP; lines 14, 61, 80
rename. The other two spec-phase files are unambiguous: `spec-analyst.md` contains **no** generic
"prompt" (every occurrence renames); `spec-reviewer.md` has a single `0-prompt/prompt.md` path
token (FOLDER + FILE) and nothing else. The code phase must judge each occurrence individually in
the mixed files, not blanket-rename.

---

## Topic 4 — Execution: edit set, task decomposition, changeset, verification (DECIDED)

### Edit set — exactly 19 files (+ 1 new changeset = 20 touched)

32 in-scope files contain a "prompt" token, but only files with at least one **RENAME**
occurrence get edited; the 13 pure-KEEP files must **not** be touched. The edit set is the
union of (files with path tokens) and (files with phase labels):

```
$ (git grep -lIE "0-prompt|prompt\.md" -- ':!.pipelines'; \
   git grep -lIE "0 [-–] Prompt|Phase 0\. Prompt|\(Prompt " -- ':!.pipelines' ':!.rp.md') \
  | sort -u | wc -l
19
```

The 19 files:

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

Every SOFT-only and LABEL occurrence in R1/R4 falls in a file already in this set; the only
label/SOFT file lacking a path token is `README.md`, which the union captures. The set is
complete. The **13 pure-KEEP files left untouched** are: `agents/code-plan-writer.md`,
`agents/code-reviewer.md`, `agents/code-writer.md`, `agents/design-doc-researcher.md`,
`agents/design-doc-writer.md`, `agents/doc-plan-writer.md`, `agents/doc-reviewer.md`,
`agents/doc-writer.md`, `agents/spec-researcher.md`,
`skills/radical-pipelines/reference/conventions/claude-code.md`,
`skills/radical-pipelines/reference/conventions/pi.md`,
`skills/radical-pipelines/reference/health-monitoring.md`, `website/styles.css`.

### Two execution-risk items the code phase must respect

1. **En-dash variant + same-line double rename in `pipeline-versioning.md:27`.** The line is
   `| 0 – Prompt | `0-prompt/prompt.md` |` — the label uses an **en-dash** (`–`, not `-`), and the
   same line carries the path token. The label edit must preserve the en-dash form
   ("0 – Intent") to keep the table column alignment byte-consistent, and the `0-prompt/prompt.md`
   path token renames separately. The spec's grep #2 explicitly matches the en-dash via
   `0 [-–] Prompt`. The versioning trie / ASCII tree elsewhere in this file has lines with the
   `0-prompt` token **twice** — rename every instance.

2. **`website/demo.js` string-consistency (not a logic change).** Three `'prompt.md'` string
   literals — line 12 and line 23 (in phase `reads` arrays) and line 140 (in `pendingTree`) —
   **must all rename to `'intent.md'` together.** demo.js renders the file-tree commit animation
   by matching `reads`/`writes` strings against `pendingTree` by string equality; renaming only
   some breaks the animation. There is no JS logic keyed on the literal "prompt". Separately,
   line 271 (`cc-prompt` CSS class with `> work on issue #1234`) is KEEP, and line 281
   ("// Phase 0 is the raw prompt — an input…") is SOFT → "the raw intent".

### Task decomposition for the code phase

A lean 5-group edit + 1 verification decomposition. Groups are independent and each is
self-verifiable; ordering puts verification last so the three greps run against the finished tree.

- **Task A — Skill core + reference (12 files).** `SKILL.md` (LABEL + FOLDER),
  `reference/pipeline-versioning.md` (LABEL en-dash + FOLDER + FILE + ASCII-tree FOLDER ×n),
  `reference/fork-pipeline.md` (FOLDER ×n + the "only the prompt is inherited" SOFT),
  `reference/autonomous-workflow.md` (LABEL + FOLDER; KEEP "agent's initial prompt"),
  `reference/assisted-workflow.md` (LABEL + FOLDER), `reference/create-pipeline.md` (FILE + SOFT +
  FOLDER **and the Topic-2 clause rewrite at line 25**), `reference/manage-issues.md`
  (SOFT ×2 + FOLDER + FILE), `reference/conventions/setup.md` (FILE ×2 + SOFT),
  `reference/autonomous-phases/1 - spec.md` (SOFT + FOLDER + FILE),
  `reference/assisted-phases/1 - spec.md` (FILE + FOLDER + FILE ×n),
  `reference/assisted-phases/2 - design-doc.md` (FILE ×2),
  `reference/assisted-phases/3 - plan.md` (FILE).
- **Task B — Agent profiles, mixed, per-occurrence (4 files).** `spec-analyst.md` (all rename,
  no generic prompt), `spec-writer.md` (rename 6/12/56/61, **KEEP line 15**),
  `spec-reviewer.md` (single FOLDER + FILE), `spec-consolidator.md` (rename 14/61/80,
  **KEEP line 8**). Per Topic 3 — judge each occurrence; do not blanket-rename.
- **Task C — README (1 file).** `README.md`: LABEL "Phase 0. Prompt." → "Phase 0. Intent.";
  SOFT "from prompt to finished implementation" → "from intent to …"; SOFT "(phase 0 is the raw
  prompt …)" → "the raw intent". **KEEP** "The same prompt, the same context" (R3).
- **Task D — Website, string-consistency critical (2 files).** `website/demo.js`: all three
  `'prompt.md'` literals together (FILE), the log line "→ prompt.md" (FILE), the SOFT comment;
  **KEEP** `cc-prompt`. `website/index.html`: `<span class="file done">prompt.md</span>` (FILE);
  **KEEP** "prompt engineering" SEO keyword and "Same prompt, different run". Do **not** touch
  the adjacent `requirements.md`.
- **Task E — Changeset (1 new file).** See below.
- **Task F — Verification.** Run the three acceptance greps (target 0 / 0 / exactly the 25
  keeps) and `changeset status`; spot-check the four "no behavior change / no trace / crux
  reworded / demo animates" criteria.

### Changeset (mandatory)

CI's Changeset Gate (`changeset status`) fails without one, and `.changeset/config.json`'s
`changedFilePatterns = ["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`
matches this change (it touches `skills/`, `agents/`, `README.md`). One changeset covers the whole
change (the `website/**` edits are not gated but ride along). Existing changesets use the form
`"@automattic/radical-pipelines": minor` followed by a summary paragraph (verified against
`.changeset/recommend-standard-remote-names.md` and `.changeset/restructure-repository-layout.md`).

**Decision.** Add one new file, e.g. `.changeset/rename-prompt-to-intent.md`:

```
---
"@automattic/radical-pipelines": minor
---

Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent" …
```

**Recommended bump: `minor`** (consistent with existing changesets; final bump is the owner's
call per the spec). Summary describes the rename (phase-0 artifact "prompt" → "intent").

### Verification — the spec's three acceptance greps

| # | Command | Before | After (target) |
|---|---|---|---|
| 1 | `git grep -nIE "0-prompt\|prompt\.md" -- ':!.pipelines'` | 42 | **0** |
| 2 | `git grep -nIE "0 [-–] Prompt\|Phase 0\. Prompt\|\(Prompt " -- ':!.pipelines' ':!.rp.md'` | 5 | **0** |
| 3 | `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` | 81 | **exactly the 25 KEEP lines (R3)** |

Plus `changeset status` passes. The 56-RENAME / 25-KEEP partition (81 in-scope) is the diff
target: all 56 change, all 25 stay. The 25 keeps break down as **agents 14 + skills 6 +
website 4 + README 1**.

---

## Out of scope — confirmed against evidence

- **This run's own `0-prompt/` folder is historical data, left untouched.** Confirmed tracked on
  disk at `.pipelines/107-rename-prompt-to-intent/0-prompt/prompt.md` (Topic 1 evidence). Run #107
  was created under the old convention before the rename ships; its phase-0 folder is a record of
  a past run, not the skill. It is one of the eight `.pipelines/` artifacts (six foldered + two
  flat-layout) left byte-for-byte. Future runs created after this ships use `0-intent/intent.md`.
- **`.rp.md` — untouched (all three occurrences).** It lives at the repository **root**, not under
  `skills/radical-pipelines/`, so it is outside the "no trace in the skill" constraint. Evidence:
  `.rp.md:35` `0 - Prompt` is the **label form** of a **live Linear workflow state** the
  orchestrator sets at runtime — renaming it without renaming the external Linear state would break
  the phase-0 status-set, a behavior change forbidden by "pure rename"; `.rp.md:54`
  "Add prompt (orchestrator)" commit example kept for whole-file consistency; `.rp.md:76`
  `/loop 15m <prompt>` is a generic loop prompt (KEEP sense anyway). `.rp.md` contains **no path
  token**, so it does not affect acceptance grep #1; greps #2 and #3 exclude it via `':!.rp.md'`.
- **The Linear workflow states "0 - Prompt" … "5 - Docs" are not renamed.** A separate, optional
  operational change in the Linear workspace, out of scope for this pipeline.
- **No backward-compat / dual-name / migration text, no `git mv`, no logic/control-flow/read-order
  change.** The diff is text/string edits + the one clause rewrite + the changeset (criterion 9).
