# Design Research: Agent-scoped guardrails

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### Current state of the six target files (researcher survey)

- `skills/radical-pipelines/reference/conventions/load.md` — line 26 defines the optional `level` (`writer`/`reviewer`, none = both roles) and states the only valid phase targets are `code` and `docs`; line 30 is the selection rule (phase filter first, then code-phase level filter; docs-phase never consults level). Both must be rewritten to the single agents dimension.
- `skills/radical-pipelines/reference/conventions/setup.md` — line 183 captures the phase(s); line 184 captures the optional `level` (asked only for code-phase gates); the illustrative table (lines 188–192) is `Name | Command | Phase | Level`. R8 reshapes this to `Name | Command | Agents`, with the agents question asked for every gate.
- `agents/code-writer.md` — "code-phase guardrails leveled `writer` or unscoped" (line 13); "writer guardrail selection" in steps 4–5 (lines 44–48).
- `agents/code-reviewer.md` — "leveled `reviewer` or unscoped" (line 18); already has a standalone step 4 "Run the reviewer guardrail selection" with fail-fast, skipped recording, the approving-iteration guarantee, and the stateless line (lines 37–46), plus the Checks-table absent/skipped/pass/fail vocabulary (lines 71–77). This is the structure R7 says doc-reviewer must mirror.
- `agents/doc-writer.md` — plain "docs-phase guardrails" in step 4 (lines 38–48); no level. Re-keys to agent-name selection.
- `agents/doc-reviewer.md` — guardrails are not yet a standalone step: a mid-review bullet in step 2 (line 33) and a guideline (line 98). No fail-fast / skipped / approving-iteration / stateless language. R7's restructure is net-new here, modeled on code-reviewer.

### Scope and migration confirmations

- The repo's own `.rp.md` has no Guardrails section (grep-confirmed) — deleting `phase`+`level` needs no `.rp.md` migration, matching the spec's Out of Scope.
- `.changeset/role-scoped-guardrails.md` exists and describes the `level` feature (minor bump for `@automattic/radical-pipelines`) — R9's in-place reword target.
- README guardrail prose (Configuration section, ~line 147) mentions guardrails only generically — no `level`/`phase` field names — a light docs-phase touchpoint, as the spec's Out of Scope says.

### Structural nuance in load.md

load.md states the phase concept in two coupled places — the per-gate definition (line 26) and the selection rule (line 30) — and phase threads into setup.md (capture question + example table column). Deleting phase collapses all four spots to the single agents dimension; there is no separate "phase target" sentence to preserve.

### Detailed current wiring (verbatim excerpts)

**`load.md` — definition and selection.** Per-gate fields today: name, command, phase, optional level. load.md prescribes **no serialization** for the `.rp.md` declaration — it describes field semantics only; the only concrete shape is setup.md's illustrative table.

- Definition (line 26): "A guardrail is an exact command, judged pass/fail solely by its exit code (0 = pass, any non-zero = fail), mandatory within the phase(s) it applies to. 'Run the tests' is not a guardrail; `npm test` is. The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both. A guardrail may also carry an optional level — `writer` or `reviewer` — naming which code-phase role runs it; a guardrail with no level applies to both roles."
- Empty/absent rule (line 28): "An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning."
- Selection rule (line 30): "To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase. Within the code phase, apply a second filter: the writer selects gates leveled `writer` or unscoped; the reviewer selects gates leveled `reviewer` or unscoped. The docs-phase selection never consults level; a both-phase gate carrying a level still runs for both doc agents. An empty selection after these filters means run none and proceed."
- Two more touchpoints: the Conventions table row (line 22) — "The deterministic verification gates — exact commands judged pass/fail by exit code — the **code/doc phases** must pass" (phase mention; needs rewording) — and the local-overrides rule (line 46): "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`." (preserved per R1).

**`setup.md` — capture (lines 171–204+).** The command-execution validation flow (lines 187–204: three-outcome validate-as-you-capture model, parity floor, two caveats) has no phase/level content — leaving it untouched is clean. Capture-per-gate list (lines 179–184): name; exact literal command; "the applicable **phase(s)** — `code`, `docs`, or both"; optional **level** — "ask this only for gates whose phase(s) include `code`; when unset, the gate applies to both roles. Leveling an expensive suite `reviewer` runs it on the reviewer's side instead of on every writer commit — the owner's decision criterion." Example table (lines 186–192), framed "illustrative, not a mandated block or parser input":

| Name | Command | Phase | Level |
| --- | --- | --- | --- |
| typecheck | `check-types` | code | writer |
| tests | `run-tests` | code | reviewer |
| lint | `run-lint` | both | |

**`agents/code-writer.md`** — level in two spots: step 1 (line 13) "Read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing"; step 5 (lines 44–55) "Run the writer guardrail selection" with the three-outcome model (empty selection ⇒ run none and proceed; declared-can't-execute ⇒ blocker, the drift guard; runs-and-exits-nonzero ⇒ work, not blocker) and "Every applicable gate must pass before you commit."

**`agents/code-reviewer.md`** — the reviewer-archetype template:

- Step 1 (line 18): "Read the code-phase guardrails leveled `reviewer` or unscoped — the gates you must run during review."
- Step 4 standalone guardrail step (lines 37–46): judgment-first ("runs only after the step-2 review checks and the step-3 behavior verification, so judgment-based checks always precede the guardrail selection"); run every gate of the selection exactly as written, record each in the Checks table; fail-fast ("Once you have at least one rejection finding you may reject without running any not-yet-run gate of your selection; record each deliberately skipped gate as **skipped** in the Checks table. You may also choose to run gates while rejecting."); approving-iteration guarantee + stateless ("You approve only when every gate in your selection has run and passed in this iteration. No gate in your selection may be unrun or skipped on an approving iteration. Each reviewer instance is fresh and stateless — there is no cross-iteration caching of gate results.").
- Checks-table vocabulary (lines 71–77): "One row per gate in the reviewer's selection. Result: pass | fail | skipped. A skipped row shows the gate's literal command but the command was not run. A forgotten gate is an absent row; a deliberately skipped gate is a present skipped row; a run gate is a present pass/fail row."
- Guidelines (lines 110–114) restate the selection and the three-outcome model.

**`agents/doc-writer.md`** — step 3 (line 35) "If a docs-phase guardrail covers doc tests, exercise them…"; step 4 (lines 38–48) "Run the docs-phase guardrails" with writer obligations ("Every applicable guardrail must pass before you commit") and the same three-outcome model (lines 45–47).

**`agents/doc-reviewer.md`** — guardrails are not a standalone step today: a bullet in step 2 (line 33, "run every guardrail applicable to the docs phase exactly as its command is written, and record each in the Checks table. Many projects tag none; in that case, the accuracy spot-check in step 3 is the sole gate"); a bare `| Check | Command | Result |` table (lines 61–65) with no vocabulary comment; guideline line 98 ("Run the docs-phase guardrails if any exist… If none are tagged, the accuracy spot-check is your only evidence — produce it"); guideline line 99 carries the three-outcome model. Missing entirely: fail-fast, skipped recording, approving-iteration guarantee, stateless line, absent-vs-skipped vocabulary. Current step layout: 1 gather, 2 review, 3 accuracy spot-check, 4 write the review, 5 commit/report — a new guardrail step inserts after step 3 (becoming step 4), pushing write→5 and commit→6, mirroring code-reviewer's layout.

### Blast radius beyond the six files

Grep of the whole skill tree + agents confirms: "guardrail" appears in zero files outside the six; no phase/workflow file dispatches guardrails to agents (agents self-read `.rp.md`, confirming R3's no-new-plumbing claim); every other `level` hit is unrelated prose ("high-level", "session-level", …); SKILL.md, pi.md, claude-code.md have zero guardrail mentions. The six files of AC #13 are the complete convention+agent blast radius; the only extra touchpoints are the release artifacts the spec already names (`.changeset/role-scoped-guardrails.md`, generic README prose).

### Serialization precedent and agent canonical names (Topic 1 evidence)

- **No list-valued field exists anywhere in the skill or the live `.rp.md`** (grep-confirmed: no "comma-separated", "one or more", multi-value cell patterns beyond the spec's own wording). The old `Phase` column's `both` is an enum collapse (one token meaning "code+docs"), possible only because two phases have exactly one "both" value; it does not generalize to four agents. The agents field needs a genuinely new list syntax — no in-skill precedent forces the choice.
- **Closest structural precedents:** the live `.rp.md` Agent models section (lines 77–94) is a `| Agent | model |` table, one row per backticked agent name; setup.md's Agent models prose (lines 92–93) suggests `**<agent-name>:**` bullets "keyed by the exact agent name (e.g. `spec-writer`, `code-reviewer`)".
- **`.rp.md` shapes are non-normative by established convention, and the live file exercises that freedom:** setup.md suggests Agent-models bullets, but the project's own `.rp.md` uses a table instead — proving the shapes are scaffolding, not a parser contract. The guardrail table is itself framed "illustrative, not a mandated block or parser input" (setup.md line 186). Other sections use whatever shape fits (Worktrees: `key: value` lines; Commit format: prose + bullets). No file mandates a serialization an agent must parse; load.md defines semantics and the selection rule, and runtime agents read `.rp.md` with judgment, not a parser. The only constraints on the agents field are spec-imposed (one optional field, one-or-more exact names, absent = all).
- **Canonical names are the frontmatter `name:` of `agents/*.md`** (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`), restated in each agent body's first line ("You are the `code-writer` agent") and used backticked throughout the skill (5–6 occurrences each). The selection rule can be written against this existing notion without inventing a new identifier.
- **The four-agent gate-running set is enumerated nowhere today**; "gate-running agent" does not exist as a term in the skill. R2's enumeration is net-new prose, confirming the spec's "no existing roster abstraction" claim.

### load.md structure, readership, and altitude (Topic 2 evidence)

- **Structure:** five sections, no subsections: `# Load Conventions` preamble; `## Conventions` (catalog table, lines 11–22, Guardrails last row at line 22); `## Guardrails` (lines 24–30 — a dedicated H2 with exactly three paragraphs: definition at 26, absent/empty rule at 28, selection rule at 30); `## Missing conventions`; `## Local overrides` (line 46 holds the committed-only rule). The `## Guardrails` block is the natural home for the R2 enumeration and R3 selection rule; an R6 archetype statement would land as a new paragraph after the selection rule.
- **Readership — the load-bearing finding:** the orchestrator reads load.md (SKILL.md line 46: "See `reference/conventions/load.md` for the full list and the rules for loading them and passing them to agents"; also `work-on-an-issue.md` line 7, `manage-issues.md` line 5). **No agent file references load.md or `.rp.md`** — agent files say "Read the code-phase guardrails leveled…" without naming a source. The mechanism (README line 155): the orchestrator loads and verifies conventions before launching phase agents and passes "the role-specific host-project conventions listed in the agent profile" in the launch prompt. load.md itself contains no passing rule (grep: no "pass"/"spawn"/"agent profile" in it) — it defines selection; the orchestrator does the passing.
- **Consequence for R6:** an archetype statement in load.md is orchestrator/reader-facing, not agent-runtime-facing. R6's last line ("Each gate-running agent file carries behavior consistent with its archetype") already accounts for this: load.md carries the canonical single statement of the model; each agent file carries the runtime instantiation. Different readers — not duplication to be deduped.
- **Altitude:** the existing selection rule (line 30) is already role-aware behavioral prose ("the writer selects gates leveled `writer` or unscoped…"), so archetypes are the same kind of content, one notch deeper (how a role runs its selection, not just which gates). R6's calibrated wording keeps it from drifting into agent-file procedural detail. load.md addresses the orchestrator throughout; the archetype paragraph keeps that descriptive voice.
- **Spec-premise nuance:** R3 says "Each gate-running agent self-reads `.rp.md`", but the README describes the orchestrator handing each agent its role-specific conventions at spawn. The design consequence R3 relies on — selection needs no new plumbing because the agent's canonical name is known on both sides of the spawn — holds under either mechanism; a wording nuance for the design doc, not a blocker.

### Convention-passing mechanism and the full re-keying surface (Topic 3 evidence)

- **There is no per-agent conventions list.** The four gate-running agent files carry only `name:` and `description:` frontmatter and no "Conventions" section. README's "agent profile" is its term for the agent's `.md` file itself (README lines 95, 112, 139); the "listed conventions" are whatever the agent's own prose tells it to use.
- **Guardrails are not in the spawn-time convention payload.** The orchestrator's spawn-time convention list (`reference/autonomous-workflow.md` lines 63–65) is exactly two items: Artifact folder and Commit format. autonomous-workflow.md and the phase files (`4 - code.md`, `5 - docs.md`) have zero guardrail/level/phase-selection hits. The agent's own step-1 line is the instruction; the agent resolves its selection itself — which matches spec R3's "each gate-running agent self-reads `.rp.md`" premise (resolving the Topic 2 nuance in the spec's favor for guardrails specifically). No seventh file needs editing; adding guardrails to autonomous-workflow.md's spawn list would be scope creep beyond the spec.
- **The re-keying surface is 4–5 spots per agent file, not just step 1:**
  - `code-writer.md`: level-bearing strings at lines 13 (step-1 read line), 44 (heading "Run the writer guardrail selection"), 46, 48 ("the writer guardrail selection"). Line 52's "your selection" is already agent-neutral.
  - `code-reviewer.md`: level-bearing strings at lines 18 (step-1 read line), 37 (heading "Run the reviewer guardrail selection"), 41 and 110 (parenthetical "(the code-phase guardrails leveled `reviewer` or unscoped)"). Lines 43, 45, 71, 111–113, 115 say "your selection"/"the reviewer's selection" without the level qualifier — their meaning shifts, their words may stay.
  - `doc-writer.md`: phase-keyed strings at lines 35, 38 (heading "Run the docs-phase guardrails"), 42, 45, 67 — all "docs-phase guardrail(s)" phrasings.
  - `doc-reviewer.md`: phase-keyed strings at lines 33 (the step-2 bullet R7 promotes), 98, 99 — plus the net-new reviewer-archetype step.

### setup.md self-containment and capture shape (Topic 5 evidence)

- **Cross-references are one-directional and not guardrail-related:** setup.md never references load.md; the only link is load.md line 36 → "Read `setup.md`, explain what is missing, and offer to run the setup flow" (the missing-conventions handoff). The established pattern is "each file restates what its reader needs": both files independently state the guardrail definition (load.md 26, setup.md 173) and the unset-means-both-roles default (load.md 26, setup.md 184). This is accepted duplication across different reading paths (orchestrator path vs owner-capture path) — neither reader traverses the other file.
- **The entire guardrail surface in setup.md is the single `### Guardrails` subsection, lines 171–212.** No earlier conventions summary table exists; the only pre-171 "phase" hit is unrelated fork-mode prose. Lead-in (line 173): "The deterministic verification gates the code and docs phases must pass — exact commands, judged pass/fail by exit code." The "Why they matter" and "What kinds to consider" paragraphs (175–177) are phase/level-free.
- **Conversation shape is "capture these facts" prose, not a scripted dialogue:** Step 2's global lead-in (line 28) sets "one convention at a time"; within Guardrails, the per-gate facts are a bulleted list introduced by "**Capture per gate:**" (lines 179–184). The level bullet's conditioning is baked into its own prose ("ask this only for gates whose phase(s) include `code`"). R8's "asked for every gate" is therefore a wording change on the new agents bullet, not a question-flow restructure.

### Final feasibility verification (researcher adversarial pass)

The complete decision set was verified against the spec's 13 acceptance criteria and the live worktree; verdict: holds up, no decision reopened.

- **AC coverage:** all 13 ACs map to a decision (AC1–2 → Topics 0/1/2; AC3–5 → Topics 2/7; AC6 → Topic 2; AC7–9 → Topic 3; AC10 → Topic 4; AC11 → Topic 5; AC12 → Topic 6; AC13 → Topic 0).
- **Six-file confinement re-verified directly:** both phase files (`4 - code.md`, `5 - docs.md`) have zero guardrail/level hits; the catalog-row reword (load.md line 22, verbatim-confirmed) and lead-in reword (setup.md line 173) live inside the six. The doc-reviewer renumber was checked against the real headings: inserting the guardrail step after step 3 yields exactly code-reviewer's layout; the "Issue 1" `###` inside the review template is a template sub-heading, not a workflow step, and does not renumber.
- **Changeset rename is safe:** `@changesets/cli` never consumes the filename (frontmatter + body only; default names are random), so the rename changes nothing the tool reads. Config (`privatePackages: {version: true, tag: true}`, `commit: false`, `changedFilePatterns` including `skills/**` and `agents/**`) confirms the minor bump stays correct and a changeset is genuinely warranted for this change.
- **Contradiction sweep:** none found — between decisions, against the spec, or against file contents (every cited line number matches the worktree); no over-serving into scope creep.

## Topics

<!-- One section per design topic: spec link, options, trade-offs, decision, rationale. -->

### Topic 0: Approach — the end-to-end mental model

- **Spec link:** Overview; all requirements.
- **Decision:** This is a documentation-system change with no runtime code: six skill/agent Markdown files re-key the guardrail convention from two scoping dimensions (`phase` + `level`) to one (**agents**, a list of exact canonical agent names; absent = every gate-running agent). The model has three layers, each with one owner:
  1. **load.md** owns the convention model: the guardrail definition with the agents field, the gate-running-agent enumeration, the name-membership selection rule, and the two behavior archetypes — each stated exactly once, for the orchestrator/reader.
  2. **setup.md** owns capture: what the owner is asked per gate and the surfaced absent-means-all default, self-contained per the file pair's established pattern.
  3. **The four agent files** own runtime behavior: each states its own name-membership selection once (step 1) and carries its archetype's obligations; doc-reviewer is restructured to the reviewer archetype, the other three are re-keyed in place.
  The implementer's mental model: delete every phase/level-bearing string inside the six files, anchor selection on agent names everywhere, and make the two reviewers structurally parallel.
- **Rationale:** Mirrors how the feature is actually wired (researcher-confirmed: guardrails appear in zero files outside the six; no spawn-time payload or profile list to migrate), so the spec's exact-six-files claim (AC #13) is achievable with no hidden touchpoints.

### Topic 1: `.rp.md` serialization of the agents field

- **Spec link:** R1, R8; Out of Scope explicitly defers the storage syntax to this phase; AC #1, #11.
- **Options:**
  1. **Comma-separated backticked agent names in a single per-gate field/cell** (e.g. `code-writer, code-reviewer`); an absent/empty field means every gate-running agent. The illustrative table column is `Agents`.
  2. One row (or sub-bullet) per gate-agent pair — splits a gate's identity across rows, duplicates name+command, and contradicts the one-row-per-gate shape both setup.md and R8's `Name | Command | Agents` table imply.
  3. An explicit `all` keyword for the every-agent case — compatibility-sugar-shaped; the spec already assigns that meaning to absence, and R1 forbids extra sugar.
- **Trade-offs:** Option 1 has no in-skill list precedent, but research shows no precedent exists for any list and the shapes are non-normative anyway; it keeps the gate-per-row identity and reads naturally. Options 2 and 3 each contradict either the table shape R8 fixes or R1's no-sugar rule.
- **Decision:** Option 1. load.md defines the field semantically ("an optional **agents** field — one or more exact agent names"); setup.md's example table gains an `Agents` column holding comma-separated backticked names, empty cell = every gate-running agent. The "illustrative, not a mandated block or parser input" framing is kept — the comma list is the recommended shape, not a parser contract.
- **Rationale:** The established convention pattern for this file pair is "describe field semantics, show an illustrative shape, mandate nothing" — proven by the live `.rp.md` diverging from setup.md's suggested Agent-models shape with no harm. A comma-separated cell is the minimal list syntax that fits the existing one-gate-per-row table and the `Name | Command | Agents` shape R8 already fixes. Names are the exact frontmatter canonical names, backticked, matching how the skill refers to agents everywhere.
- **Example-table mapping (recommended; exact rows are plan-phase latitude):** illustrate all three multiplicities — a multi-name row (e.g. typecheck → `code-writer, code-reviewer`), a single-name row matching R8's decision criterion (tests → `code-reviewer`), and a bare row meaning every agent (lint → empty Agents cell).

### Topic 2: Placement of the gate-running set, selection rule, and behavior archetypes

- **Spec link:** R2, R3, R6; AC #2, #3, #6, #13.
- **Options (for the R6 archetype statement; R2/R3 have no credible alternative to load.md's `## Guardrails` block):**
  1. **load.md, `## Guardrails` section** — a new paragraph (or two short ones) after the rewritten selection rule.
  2. setup.md — wrong audience (owner-facing capture procedure, not the convention model).
  3. The agent files — would state the model four times, violating R6's "in one place".
  4. A new reference file — violates AC #13's exact-six-files claim.
- **Decision:** Everything lands inside load.md's existing `## Guardrails` H2, which grows from three paragraphs to roughly four:
  1. *Definition paragraph (line 26) rewritten:* a guardrail remains an exact command judged pass/fail solely by exit code (kept verbatim where possible, including the "'Run the tests' is not a guardrail; `npm test` is" example); the phase-targets and level sentences are replaced by the optional **agents** field — one or more exact agent names — and the explicit gate-running-agent enumeration (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`), noting the enumeration is what a future gate-running agent extends (R2).
  2. *Absent/empty rule (line 28):* unchanged in substance.
  3. *Selection rule (line 30) rewritten to name-membership (R3):* an agent's selection is the gates that name it plus the gates that name no agents; a gate naming only agents outside the set is selected by no current agent (a forward declaration — no error, blocker, or warning, R5); an empty selection means run none and proceed (preserved closing sentence).
  4. *New archetype paragraph (R6):* writer-type agents produce commits — they run every gate in their selection exactly as written, and all must pass before each commit; reviewer-type agents issue verdicts — judgment checks first, fail-fast permitted with skipped recording, approval only when every selected gate has run and passed that iteration, each instance fresh and stateless. A future agent maps by whether it commits work or reviews it.
  - The `## Conventions` catalog row (line 22) is reworded to drop "the code/doc phases must pass" in favor of agent-keyed wording (e.g. "…the gate-running agents must pass"). The `## Local overrides` line 46 stays verbatim (R1).
- **Rationale:** AC #13 confines the change to six files, and load.md is the only one whose role is defining the convention model; the `## Guardrails` H2 is self-contained and already holds the definition + selection. The altitude check shows the selection rule is already role-aware behavioral prose, so a tightly-worded archetype paragraph extends the existing register rather than introducing a new kind of content. The readership finding resolves the apparent load.md-vs-agent-files duplication: load.md states the model once for the orchestrator/reader; each agent file carries only its own runtime behavior, per R6's closing line.

### Topic 3: Re-keying the three already-structured agent files (code-writer, code-reviewer, doc-writer)

- **Spec link:** R3, R7 (paragraphs 2–3); AC #7, #8, #9.
- **Decision:** Each agent file states its selection by name-membership exactly once — in its step-1 gather line — and every later occurrence uses an agent-neutral term. The formula:
  - Step-1 read line becomes the membership statement keyed to the agent's own canonical name, e.g. code-writer: "Read the guardrails that name `code-writer` and those that name no agents — the gates you must run before completing." Same shape for `code-reviewer` ("…the gates you must run during review") and `doc-writer`.
  - All later level/phase-bearing strings drop their qualifier: headings "Run the writer/reviewer guardrail selection" and "Run the docs-phase guardrails" become "Run your guardrail selection" (or equivalent agent-neutral phrasing); the parentheticals "(the code-phase guardrails leveled `reviewer` or unscoped)" become "(the gates that name `code-reviewer` or name no agents)" or are dropped where the established term suffices — exact wording is plan-phase latitude, the design fixes the principle: one membership statement per file, neutral references elsewhere.
  - Known touchpoints (from research): code-writer lines 13, 44, 46, 48; code-reviewer lines 18, 37, 41, 110; doc-writer lines 35, 38, 42, 45, 67 (line 35 becomes "If a guardrail in your selection covers doc tests…"; line 67's blocker guideline drops "docs-phase" but keeps the declared-can't-execute = blocker rule).
  - Everything else is preserved: writer obligations (run every gate exactly as written, all pass before each commit), the three-outcome model (empty ⇒ proceed; declared-can't-execute ⇒ blocker; runs-and-exits-nonzero ⇒ work/finding), code-reviewer's step-4 structure, fail-fast, skipped recording, approving-iteration guarantee, stateless line, and Checks vocabulary — all unchanged in substance.
- **Rationale:** The researcher's enumeration shows each file names its selection 4–5 times; restating membership at each spot would duplicate the rule inside one file, against the skill's minimalism rules. Anchoring the membership once in step 1 (where the current files anchor their level/phase qualifier) and using the already-precedented neutral phrasings ("your selection") elsewhere is the smallest diff that fully de-keys phase and level. Each agent keys to its own frontmatter `name`, the identifier the file already establishes ("You are the `code-writer` agent").

### Topic 4: doc-reviewer restructure to the reviewer archetype

- **Spec link:** R7 (paragraph 1); AC #10; mirrors R6's reviewer-type definition.
- **Decision:** Port code-reviewer's reviewer-archetype structure into doc-reviewer, adapted to its judgment checks:
  1. Delete the step-2 guardrails bullet (line 33). Its surviving idea — "many projects name none; then the accuracy spot-check is the sole gate" — moves, adapted to agent-name wording, into the new guardrail step (or its guideline), not duplicated in both.
  2. Insert a new step after step 3 (accuracy spot-check): "Run your guardrail selection" — becoming step 4, renumbering write-review→5 and commit/report→6, matching code-reviewer's gather/judge/judge/gates/write/commit layout. Its body mirrors code-reviewer's step 4: a judgment-first sentence referencing doc-reviewer's own judgment checks ("runs only after the step-2 review pass and the step-3 accuracy spot-check"); run every gate of the selection exactly as written, record each in the Checks table; the fail-fast permission with skipped recording (including "may also run gates while rejecting"); the approving-iteration guarantee; the stateless line.
  3. Step-1 gather gains the membership read line ("Read the guardrails that name `doc-reviewer` and those that name no agents — the gates you must run during review"), which doc-reviewer currently lacks entirely.
  4. The review template's Checks table gains the vocabulary comment mirroring code-reviewer lines 71–77: one row per gate in the selection; Result: pass | fail | skipped; a skipped row shows the literal command not run; forgotten = absent row, deliberately skipped = present skipped row, run = present pass/fail row.
  5. Guidelines: line 98 re-keys to the agent-name selection; line 99's three-outcome model is kept (it already matches code-reviewer's), reworded off "docs-phase".
- **Rationale:** R7 prescribes this restructure explicitly ("mirroring the base run's code-reviewer restructure"); code-reviewer is the proven in-repo template, so the design ports its structure rather than inventing a second reviewer shape — keeping the two reviewer files parallel, which is itself the strongest reading of R6's "each gate-running agent file carries behavior consistent with its archetype". The step insertion point (after the accuracy spot-check) follows both R7's wording ("after the judgment checks — the review pass and the accuracy spot-check") and code-reviewer's judgment-first layout.

### Topic 5: setup.md capture rewrite

- **Spec link:** R8; AC #11.
- **Decision:** All changes stay inside the `### Guardrails` subsection (lines 171–212), and within it only two blocks move:
  1. *Capture-per-gate bullets:* the name and command bullets are unchanged; the **phase(s)** bullet (183) and **level** bullet (184) are deleted and replaced by a single optional **agents** bullet: one or more exact agent names, captured for every gate (no conditional — there is no phase to condition on); when unset, the gate applies to every gate-running agent, doc agents included — the bullet surfaces this consequence so the owner scopes code-specific or expensive gates deliberately; the decision criterion re-anchors to names ("naming only `code-reviewer` runs an expensive suite on the reviewer's side instead of on every writer commit").
  2. *Example table:* reshaped to `Name | Command | Agents` per Topic 1's mapping (multi-name, single-name, and bare rows).
  3. *Untouched:* the validation flow (196–212, confirmed phase/level-free), the "Why they matter" and "What kinds to consider" paragraphs.
  4. *Lead-in (line 173) and load.md's catalog row (line 22):* both currently describe guardrails as gates "the code/docs phases must pass"; both are reworded to agent-keyed phrasing (e.g. "the gate-running agents must pass"). The phrase stays factually defensible today, but it implies a phase-boundedness the open agent model deletes (a future gate-running agent need not belong to either phase), so keeping it would re-introduce the deleted dimension in prose.
  5. *Valid-names enumeration:* the agents bullet names the four gate-running agents as the capture-time valid set — the owner reading setup.md needs the names there, and the file pair's pattern is deliberate self-containment per reading path (both files already restate the definition and the unset default). The "adding a future gate-running agent updates the enumeration" rule stays load.md's alone (R2); setup.md only lists the names.
- **Rationale:** The researcher confirmed the conversation shape is a declarative "Capture per gate:" bullet list, so R8 lands as bullet edits, not a flow restructure; the self-containment call follows the file pair's existing accepted cross-path duplication rather than inventing a cross-reference that exists nowhere else between these files.

### Topic 6: Changeset reconciliation

- **Spec link:** R9; AC #12.
- **Decision:** The docs phase rewrites `.changeset/role-scoped-guardrails.md` in place to describe the agents field (single agents dimension, absent-means-all, phase and level gone), renames the file to match the shipped feature (recommended slug: `agent-scoped-guardrails.md`), and keeps the existing minor bump for `@automattic/radical-pipelines`. No second changeset is stacked. The rename is a single-file move of the pending changeset (one file mutated and renamed, never add-new-plus-delete-old), keeping R9's "no second changeset" literally true on disk. The design names this as a docs-phase deliverable; the changeset prose itself is written then. (Researcher-verified: changeset filenames are arbitrary labels the tooling never reads, so the rename is safe.)
- **Rationale:** R9 fixes the obligation and the no-stacking rule; minor remains the right bump because the change is still an unreleased feature addition (the merged changelog should announce agent-scoped guardrails as one feature, never a `level` field that shipped in no release).

### Topic 7: Failure modes and observability

- **Spec link:** R3, R5; AC #3, #5; R6/R7 vocabulary clauses.
- **Decision:** No new failure paths are introduced; the design deliberately preserves the existing ones and adds one silent non-behavior:
  - *Per-gate outcomes (preserved verbatim in each agent file):* empty selection ⇒ run none and proceed (never a blocker or warning); a declared gate's command cannot execute ⇒ blocker (the drift guard); a gate runs and exits non-zero ⇒ work for writers, rejection finding for reviewers.
  - *Forward declarations (new, R5):* a gate naming only unknown agents simply matches no one — no validation, error, or warning anywhere; the silence falls out of the membership test, so no file needs a rule about it beyond the selection rule's wording.
  - *Observability (reviewers):* both reviewers record every selected gate in their Checks table with pass | fail | skipped, with the absent-vs-skipped distinction (forgotten = absent row; deliberate = skipped row) — net-new for doc-reviewer via Topic 4.
- **Rationale:** The spec's only new failure-surface requirement is the deliberate *absence* of one (R5); everything else carries over, so the design's job is to not lose the existing outcome model during re-keying.

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- Exact replacement wording for the agent-neutral selection references ("your guardrail selection" vs "the guardrail selection") and the new step headings — plan-phase latitude within Topic 3's principle (membership stated once per file, neutral elsewhere).
- Exact rows of the reshaped example table — Topic 1 recommends covering all three multiplicities (multi-name, single-name, bare), but the specific gate names/commands are illustrative and the plan may adjust them.
- Whether code-reviewer's already-agent-neutral phrasings ("the reviewer's selection" at lines 43, 45, 71, 111–115) keep their words or get lightly normalized — meaning is unchanged either way; flag for the code reviewer to check consistency, not correctness.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **Bare gates now run in the docs phase (R4 behavior change).** A level-less code gate in the old model was phase-bounded; in the new model a bare gate runs for doc agents too. Nothing in this repo declares guardrails, so nothing breaks today, but the setup guidance (Topic 5's surfaced default and the example table's explicitly-scoped code rows) is the only mitigation — the doc-plan should keep README prose consistent with it.
- **Cross-path duplication is deliberate, not accidental.** load.md and setup.md both state guardrail semantics (definition, absent-means-all, and now the four agent names) because their readers never traverse the other file; the agent files each carry their own archetype behavior for the same reason. A reviewer applying the skill's de-dup rule strictly could flag these — the design doc should state the reading-path rationale explicitly so downstream reviewers don't "fix" it.
- **The skill's no-negative-phrases rule vs R5 (and R4).** R5's "no validation, error, or warning path" is a statement about what *not* to build; the selection-rule wording should express it positively (a gate naming only absent agents is selected by no current agent) rather than as a prohibition. The same discipline applies to R4's bare-gate consequence and the setup default: state consequences ("when unset, the gate applies to every gate-running agent, doc agents included"), never prohibitions ("don't forget to scope…"), throughout the new prose.
- **Keep the canonical-name framing abstract.** Selection is keyed to "the agent's own canonical name" (the frontmatter `name:` the skill already uses) — never to any agentic tool's spawn identity or mechanism, per the skill's genericity rule. Agent names like `code-writer` are skill-generic role names, so no decision forces tool- or tracker-specific prose.
- **Spec premise nuance (R3 "self-reads `.rp.md`"):** resolved in the spec's favor — guardrails are not in the spawn-time convention payload (autonomous-workflow.md lists only Artifact folder + Commit format), so the agent's own file genuinely is the carrier of its selection instruction. No design consequence, but the design doc should not import README line 155's broader "orchestrator passes role-specific conventions" framing into the guardrail sections.
