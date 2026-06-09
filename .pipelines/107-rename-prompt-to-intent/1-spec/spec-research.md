# Spec Research: Rename phase-0 artifact "prompt" → "intent"

<!-- The original idea from prompt.md -->

> Source: GitHub issue [#107](https://github.com/Automattic/radical-pipelines/issues/107) — "Rename the phase-0 prompt to `intent`".

## Goal (from prompt.md)

Rename the pipeline's phase-0 artifact from "prompt" to "intent" — because the artifact is really a structured statement of *intent*, and "prompt" is overloaded (every phase agent also receives a prompt). After this change the phase-0 artifact is `intent.md`, its folder is `0-intent/`, and the phase is called "Intent", consistently across the project. This is a pure rename — no behavior changes.

## Constraints (from prompt.md)

- Rename `prompt.md` → `intent.md`, `0-prompt/` → `0-intent/`, phase name "Prompt" → "Intent", across all forward-looking definitions: the skill (`skills/radical-pipelines/`), agent profiles (`agents/`), README, and website.
- **No trace of the old name in the skill.** After the rename, the skill reads as if the phase was always "intent": no "formerly prompt" notes, no backward-compat text, no dual-name handling — tooling (`pipeline-versioning.md`, `fork-pipeline.md`) references only `0-intent`. If the orchestrator later meets a legacy `0-prompt` pipeline, it does what it can at runtime, but the skill carries no special-casing or migration instructions. No migration debt anywhere in the skill.
- Leave historical `.pipelines/*/0-prompt/` run artifacts untouched — records of past runs (data, not the skill).

## Context

Change to the Radical Pipelines orchestrator skill itself. "Prompt" as the phase-0 name predates this issue; the rename aligns the name with what the artifact actually is.

## Initial occurrence survey (validated against repo)

Forward-looking files containing the phase-0 artifact name (to rename). Searched `.md`, `.ts/.tsx/.js/.mjs/.cjs`, `.json`, `.astro`, `.html`, `.css` across `skills/`, `agents/`, `README.md`, `website/`, `scripts/`, `.changeset/`, `.claude-plugin/`.

### A. The phase-0 artifact references — MUST rename

**Skill (`skills/radical-pipelines/`):**
- `SKILL.md:3` — description: phase sequence "(Prompt → Spec → …)"
- `SKILL.md:35` — phases table row: `| 0 | Prompt | `0-prompt` | The raw request … |`
- `reference/pipeline-versioning.md:27` — table `| 0 – Prompt | `0-prompt/prompt.md` |`
- `reference/pipeline-versioning.md:61,66,70,75,89,90` — `0-prompt` as the shared-root phase folder in the versioning trie/ASCII tree
- `reference/fork-pipeline.md:14,38,42` — `0-prompt` as the lowest inheritable phase folder
- `reference/autonomous-workflow.md:39` — table `| 0 - Prompt | `0-prompt` | Already in place |`
- `reference/assisted-workflow.md:17` — table `| 0 - Prompt | `0-prompt` | Already in place |`
- `reference/create-pipeline.md:3,23,27` — writes `prompt.md`, creates `0-prompt/`, places assets in `0-prompt/`
- `reference/manage-issues.md:14` — "the phase-0 prompt — create-pipeline.md turns the issue into `0-prompt/prompt.md`"
- `reference/autonomous-phases/1 - spec.md:7` — reads `<artifacts-folder>/0-prompt/prompt.md`
- `reference/assisted-phases/1 - spec.md:3,7,36,110` — phase 0 (`prompt.md`); reads `0-prompt/prompt.md`; "<contents of `prompt.md`…>"; "should not need … `prompt.md`"
- `reference/assisted-phases/2 - design-doc.md:106,135` — standalone-without `prompt.md`
- `reference/assisted-phases/3 - plan.md:124` — standalone-without `prompt.md`
- `reference/conventions/setup.md:48,113` — artifact-folder contents list includes `prompt.md`

**Agent profiles (`agents/`):**
- `spec-analyst.md:18,24,25,94` — reads `0-prompt/prompt.md`; blocker target `0-prompt/prompt.md`; "contents of `prompt.md`"; comment `<!-- The original idea from prompt.md -->`
- `spec-writer.md:12,61` — reads `0-prompt/prompt.md`; blocker "not confirmed in `spec-research.md` or `prompt.md`"
- `spec-reviewer.md:14` — reads `0-prompt/prompt.md`
- `spec-consolidator.md:14,61,80` — reads `prompt.md`; standalone-without `prompt.md`; "`prompt.md` missing"

**README.md:**
- `README.md:27` — "**Phase 0. Prompt.** The initial idea or request."

**Project conventions file (`.rp.md`) — NOT in the prompt's explicit file list, but forward-looking; scope decision needed (see Q3):**
- `.rp.md:35` — Linear issue-status label `0 - Prompt` (orchestrator sets this status when phase 0 finishes). Renaming the reference implies the Linear project status itself must also be renamed to `0 - Intent` — an external-system data change, behavior-adjacent.
- `.rp.md:54` — commit-format example `Add prompt (orchestrator)` (the phase-0 create-pipeline commit). Generic-noun-vs-artifact judgment.
- `.rp.md:76` — `/loop 15m <prompt>` — GENERIC loop prompt; keep.

**Website (`website/`):**
- `demo.js:12,23,140` — `'prompt.md'` in phase `reads` arrays and the `pendingTree` array. **Consistency note:** demo.js renders the file tree by matching `reads`/`writes` strings against `pendingTree` by string equality; `'prompt.md'` MUST be renamed in all three spots together or the tree-commit animation breaks. This is a string-consistency requirement, not a logic change — there is no JS logic keyed on the literal string "prompt" (verified).
- `demo.js:276` — log line "Captured issue #1234 → prompt.md (phase 0 · input)"
- `demo.js:281` — comment "Phase 0 is the raw prompt — an input…" (SOFT)
- `index.html:119` — `<span class="file done">prompt.md</span>` in the terminal `ls` listing
- (`index.html:120` is `requirements.md` — an UNRELATED artifact name; do NOT touch.)

### A2. SOFT references — the word "prompt" NAMES the phase-0 artifact in prose (not a literal `prompt.md`/`0-prompt` path token) — IN SCOPE per "no trace of the old name in the skill"

The researcher surfaced these. They are the heart of the "no trace" constraint: after the rename the skill must read as if the phase was always "intent", so prose that names the artifact "prompt" must become "intent" — even where it isn't a filename/folder token. Decision: **IN SCOPE** (rename to "intent"), confirmed by the strict no-trace constraint.

- `agents/spec-analyst.md:16` — "**Treat the prompt as a hypothesis.**" → "the intent"
- `agents/spec-analyst.md:18` — "a premise the prompt depends on" → "the intent"
- `agents/spec-analyst.md:22` — heading "### 1. Understand the prompt" → "Understand the intent"
- `agents/spec-writer.md:6` — "synthesize the prompt and the spec research record" → "the intent"
- `agents/spec-writer.md:56` — "from `spec.md` alone, without the research record or the prompt" → "the intent"
- `reference/create-pipeline.md:21` — heading "### 4. Generate the initial prompt" → "Generate the initial intent"
- `reference/create-pipeline.md:23` — "Write the prompt to …" → "Write the intent to …" (path token also renames)
- `reference/create-pipeline.md:25` — "Adapt the issue content as a prompt directed at the agents that will run subsequent phases." → **CAREFUL REWORD.** This is the single dual-meaning spot: the artifact IS the phase-0 thing, but the phrasing leans on the generic "prompt directed at agents." Must be reworded so it reads naturally as the intent without reintroducing the overloaded sense (e.g., "Adapt the issue content into the intent that seeds the agents running subsequent phases."). Writer's exact wording, but it must (a) say "intent" and (b) not awkwardly assert "intent directed at the agents."
- `reference/manage-issues.md:14` — "the phase-0 prompt … the prompt format" → "the phase-0 intent … the intent format" (path token also renames)
- `reference/fork-pipeline.md:14` — "only the prompt is inherited" → "only the intent is inherited"
- `reference/conventions/setup.md:64` — "Each pipeline pulls its initial prompt from an issue" → leans soft (the phase-0 artifact's source). Recommendation: rename to "intent". (Researcher flagged as soft, not clean-generic.)
- `website/demo.js:281` — comment "// Phase 0 is the raw prompt — an input…" → "the raw intent"
- `README.md:112` — "(phase 0 is the raw prompt, an input rather than an agent-produced artifact…)" → "the raw intent"
- `README.md:56` — "Percentage of tasks that make it from prompt to finished implementation" → "from intent to finished implementation"

**Structural fact (researcher):** Only FOUR files ever read the phase-0 artifact as an input — `spec-analyst`, `spec-writer`, `spec-reviewer`, `spec-consolidator` — because each downstream phase reads only its immediate upstream artifact. So in `code-*`/`doc-*`/`design-*` agent profiles, "prompt" can ONLY be the generic launch/spawn message — never the phase-0 artifact. This is why those are safe to leave unchanged.

### B. Generic "prompt" — MUST NOT rename (the overloaded sense the issue calls out)

- `agents/code-writer.md:12,62`, `code-reviewer.md:14,42`, `doc-reviewer.md:14,43`, `doc-writer.md:12`, `doc-plan-writer.md:18`, `design-doc-writer.md:15`, `design-doc-researcher.md:8`, `code-plan-writer.md:15`, `spec-researcher.md:8` — "launch prompt", "spawn prompt", "the orchestrator's prompt" (the message sent TO an agent)
- `reference/health-monitoring.md:52,54,70` — "Loop prompt template", the monitor's loop prompt
- `reference/conventions/pi.md:36`, `conventions/claude-code.md:37` — `/loop 5m <prompt>` (the loop command prompt)
- `website/demo.js:271` — CSS class `cc-prompt` + literal command `> work on issue #1234`
- `website/styles.css:795` — `.term-body .cc-prompt` CSS selector
- `website/index.html:12` — meta keywords "prompt engineering" (generic SEO term)
- `website/index.html:153` — "Same prompt, different run, different result" (generic re-run copy) — JUDGMENT NEEDED

### C. Historical run artifacts — MUST NOT touch (data)

Six git-tracked phase-0 run artifacts (verified on `trunk`), all to be left exactly as-is:
- `.pipelines/68-recommend-standard-remote-names/0-prompt/prompt.md`
- `.pipelines/70-restructure-repository-layout/0-prompt/prompt.md`
- `.pipelines/81-changelog-version-sync/0-prompt/prompt.md`
- `.pipelines/83-automate-releases/0-prompt/prompt.md`
- `.pipelines/90-per-agent-model-config/0-prompt/prompt.md`
- `.pipelines/107-rename-prompt-to-intent/0-prompt/prompt.md` — **this very run's own phase-0 folder.** Run #107 was created under the OLD convention (the rename hasn't shipped yet), so its own `0-prompt/prompt.md` is historical data and stays. This is consistent, not contradictory: future runs created after the rename ships will use `0-intent/intent.md`.

Plus TWO OLDER flat-layout artifacts (no `0-prompt/` folder — `prompt.md` sits at the pipeline root), also git-tracked, also untouched:
- `.pipelines/8-research-how-to-package-agents-and-skills-in-pi/prompt.md`
- `.pipelines/9-create-setup-to-populate-project-conventions/prompt.md`

`.pipelines/` is git-tracked (only `node_modules/`, `.env`, `.env.local` are gitignored). All 8 historical phase-0 artifacts (6 foldered + 2 flat) are run records and stay exactly as-is.

### Changeset (required)

- `.changeset/config.json` `changedFilePatterns = ["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`. The rename touches `skills/`, `agents/`, and `README.md`, so a changeset is **mandatory** — CI "Changeset Gate" runs `changeset status` and fails without one.
- `website/**` is NOT in `changedFilePatterns`: website edits alone wouldn't require a changeset, but the skill/agent/README edits do, so one changeset covers the whole change.
- Existing changesets use frontmatter `"@automattic/radical-pipelines": minor` (or `patch`). Recommend `minor`; final bump is the writer's/owner's call.

### D. Not the phase-0 artifact (no change needed)

- `scripts/test/*.test.mjs`, `index.html:120` (`requirements.md`) — unrelated names.

## Q&A

### Q1 — Confirm the artifact-vs-generic "prompt" boundary

**Asked (analyst → researcher):** The rename targets only the phase-0 artifact (`prompt.md` / `0-prompt/` / phase label "Prompt"). The issue's rationale ("prompt is overloaded — every phase agent also receives a prompt") means generic "prompt" usages must stay. Confirm the GENERIC classification of: agent "launch/spawn/orchestrator's prompt" refs; health-monitoring loop-prompt refs; `/loop 5m <prompt>` in pi.md/claude-code.md; website CSS class `cc-prompt` + selector + meta keyword "prompt engineering". Flag any case where a generic-looking "prompt" is actually the phase-0 artifact, or vice-versa.

**Answer (researcher):** CONFIRMED for the truly-generic set: agent "launch/spawn/orchestrator's prompt" (code-plan-writer, code-reviewer, code-writer, design-doc-researcher, design-doc-writer, doc-plan-writer, doc-reviewer, doc-writer, spec-researcher, spec-consolidator L8); `health-monitoring.md` loop-prompt refs; `pi.md`/`claude-code.md` `/loop 5m <prompt>`; website `cc-prompt` CSS class + selector + "prompt engineering" SEO keyword + "Same prompt, different run" copy; `.rp.md` L54 commit example and L76 loop prompt; `autonomous-workflow.md` L59 ("agent's initial prompt"). No truly-generic case is secretly the phase-0 artifact.

**CORRECTION / reclassification (researcher Nuance 1):** Several spec-* prose mentions I initially eyed as generic are actually SOFT references that NAME the phase-0 artifact and ARE in scope → "intent": spec-analyst.md L16 ("Treat the prompt as a hypothesis"), L18 ("a premise the prompt depends on"), L22 (heading "Understand the prompt"); spec-writer.md L6 ("synthesize the prompt"), L56 ("without the research record or the prompt"). And `conventions/setup.md` L64 ("pulls its initial prompt from an issue") leans soft → "intent". All moved to section A2.

Two nuances the researcher added: (1) **Inverse direction** — there are ~14 SOFT references where "prompt" NAMES the phase-0 artifact in prose (not a path token); per "no trace in the skill" these ARE in scope and become "intent". Captured in section A2 above. (2) `code-writer.md:62` ("should not need to read the prompt, spec, design doc…") was scrutinized: still GENERIC — the code-writer never reads the phase-0 artifact (structural fact below), so "the prompt" there is the launch message; keep as-is.

**Structural fact:** only FOUR files read the phase-0 artifact as input (`spec-analyst`, `spec-writer`, `spec-reviewer`, `spec-consolidator`); downstream phases read only their immediate upstream. So "prompt" in `code-*`/`doc-*`/`design-*` profiles is provably the generic message.

### Q2 — Per-line verdicts on generic-noun "prompt" inside phase-0 files

**Asked (analyst → researcher):** For create-pipeline.md L3/L21/L23/L25/L27 and manage-issues.md L14, classify each "prompt" as phase-0 artifact/phase (→ "intent") vs. generic agent-prompt (→ stays "prompt"). Special focus on create-pipeline.md L25.

**Answer (researcher):** All ARTIFACT — rename every one. create-pipeline.md L3/L21/L23(×2)/L27 are clear (filenames + the "Generate the initial intent" section that produces the artifact). manage-issues.md L14 has THREE "prompt"s, all ARTIFACT: "the phase-0 intent", `0-intent/intent.md`, "the intent format" — confirmed by section title "## The issue format" enumerating the structured Title/Goal/Constraints/Context/Assumptions shape, which IS "a structured statement of intent" (the issue's rationale).

**create-pipeline.md L25 — THE CRUX (clause rewrite, not token swap):** Current: "Adapt the issue content as a prompt directed at the agents that will run subsequent phases." Referent is the phase-0 artifact (ARTIFACT), so leaving "prompt" violates "no trace." But a blind swap → "as an intent directed at the agents" reads off (intent is the owner's, not aimed at agents). The per-agent spawn message is assembled separately, later (autonomous-workflow.md:59) — never "the issue content adapted." **Requirement: rename AND lightly rephrase.** Recommended: "Adapt the issue content into the intent that seeds the subsequent phases." This is the ONE spot where "rename" = "rewrite the clause," and the spec must call it out so the writer doesn't do a mechanical 1:1 substitution.

### Q4 — Borderline narrative/prose occurrences

**Asked (analyst → researcher):** Adjudicate fork-pipeline.md L14 ("only the prompt is inherited"), README.md L112 ("phase 0 is the raw prompt, an input…"), autonomous-phases/1-spec.md L3 ("from phase 0 (prompt) to phase 1"), README.md L56 ("from prompt to finished implementation"), README.md L13 ("The same prompt, the same context…").

**Answer (researcher verdicts, analyst-confirmed):**
- fork-pipeline.md L14 "only the prompt is inherited" → ARTIFACT (soft) → "only the intent is inherited". Forking at phase 0 copies just that one folder; "the prompt" = the inherited phase-0 artifact. (Same line's `0-prompt` folder token also renames.)
- README.md L112 "phase 0 is the raw prompt, an input rather than an agent-produced artifact…" → PHASE/ARTIFACT → "the raw intent". Explicitly DEFINES what phase 0 is — clearest possible old-name trace if left. README is in the issue's explicit scope.
- autonomous-phases/1 - spec.md L3 "from phase 0 (prompt) to phase 1" → PHASE/ARTIFACT → "(intent)". Parenthetical phase name; mirrors sibling assisted-phases/1-spec.md:3 ("phase 0 (`prompt.md`)" → "(`intent.md`)"). Keep the two siblings parallel.
- README.md L56 "from prompt to finished implementation" → PHASE → "from intent to finished implementation" (rename, recommended). Lowest-confidence of the four (metaphorical start-to-end), but names the pipeline's first phase as the start point; renaming keeps the README consistent and avoids a lingering "prompt"-as-phase-name. Analyst concurs.
- README.md L13 "The same prompt, the same context, can produce a different result every time" → **GENERIC** (LLM non-determinism; sits in "## The problem" before phases are introduced). KEEP.

### Q3 — `.rp.md` scope + the Linear status implication (PIVOTAL)

**Asked (analyst → researcher):** (a) Is `.rp.md` shippable skill or project overlay? (b) Does "no trace in the skill" bind it? (c) Does renaming the `0 - Prompt` Linear-status reference force an external Linear workflow-state rename (behavior change)?

**Answer (researcher, live-verified):**
- **(a) Project-specific overlay — NOT shippable skill.** `.rp.md` is at the repo ROOT, not under `skills/radical-pipelines/`. It holds THIS repo's concrete conventions (GitHub URL, Linear project id `15a89be6fe3c`, etc.). The skill is generic and reads `.rp.md` as external input: `conventions/load.md:3-5` ("This skill is generic… Project-specific conventions are stored in the `.rp.md` file"); `SKILL.md:42-46` ("each project supplies its own conventions"). Every consuming project writes its own `.rp.md`.
- **(b) "No trace in the skill" does NOT bind `.rp.md`** (it's outside `skills/radical-pipelines/`). The issue's Constraints enumerate scope as exactly "the skill, the agent profiles, the README, and the website" — `.rp.md` is in none. But the Goal says "consistently across the project," so it sits in a scope gap.
- **(c) YES — `0 - Prompt` is a REAL pre-existing Linear workflow state, not free text.** Live `list_issue_statuses` on team "Billow" (project "Billow Pipelines", id `15a89be6fe3c`) returned seven states mirroring the phases: **"0 - Prompt"** (id `6a5b291f-2df2-41ac-8c32-a21be017c9ec`, type started), "1 - Spec", "2 - Design Doc", "3 - Plan", "4 - Code", "5 - Docs", plus PR opened/Triage/etc. `.rp.md:35` says "set the Linear issue status to **match** the phase" → the orchestrator sets the issue to the workflow state whose NAME equals that string. So renaming `.rp.md:35` → "0 - Intent" WITHOUT renaming the Linear state would break the phase-0 status-set at runtime (no "0 - Intent" state exists). Keeping behavior intact requires ALSO renaming the Linear state — an external-workspace change, contradicting "pure rename — no behavior changes."

The two `.rp.md` hits differ sharply:
- `.rp.md:54` "Add prompt (orchestrator)" — illustrative COMMIT-FORMAT example. Renaming → "Add intent (orchestrator)" is harmless pure text, zero runtime impact.
- `.rp.md:35` "0 - Prompt" — behavior-adjacent (ties to a live external Linear state).

**Analyst decision → ESCALATE to team-lead as a scope clarification** (see Blocker/Scope note below). Default recommendation if no owner input: EXCLUDE `.rp.md` from the rename scope (matches the issue's literal Constraints list and the "no behavior change" line), recording it as an explicit out-of-scope decision; optionally rename only the harmless `.rp.md:54` commit example for project-consistency.

