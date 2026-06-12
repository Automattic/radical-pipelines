# Design Doc Research

Running record of the design-phase Q&A for "Role-scoped guardrails with reviewer fail-fast" (#121). Spec: `../1-spec/spec.md`. Each topic: question to the researcher, evidence-backed answer, analyst decision.

## Design topics

The spec fixes the behavior (level vocabulary, role-filtered selection, fail-fast, approving-iteration guarantee, absent-means-both). Design must decide:

1. The `.rp.md` representation of the level and how much syntax the skill prescribes.
2. `load.md` — placement and wording of the level definition and role-filtered selection rule.
3. `code-reviewer.md` — structure for fail-fast ordering, the skipped state in the Checks table, and the approval guarantee.
4. `code-writer.md` and `setup.md` — minimal edits for role selection and level capture.

## Q&A

### Q1: How is the `level` represented in `.rp.md`, and how much syntax does the skill prescribe?

**A:** Prescribe one illustrative example, not a strict syntax.

**(a) How other conventions prescribe their `.rp.md` shape.** Only one convention prescribes explicit syntax: Agent models (`setup.md:91-94` — reserved `**Default:**` bullet, per-agent `**<agent-name>:**` bullets). Its stated reason is exact-name keying: values are looked up by the precise agent name the spawn mechanism uses. That pressure does not transfer to `level`, whose vocabulary is a closed set of two literals — structurally like `phase`, which is unprescribed. Every other convention (commit format, worktrees, branch names, health monitoring, and Guardrails itself) describes fields in prose with no literal `.rp.md` block. Notably, the real `.rp.md` ships Agent models as a table despite the prescribed bullets — even the one mandated syntax drifted in practice, evidence that mandates don't bind authors.

**(b) Real Guardrails sections in the wild — none exist.** This repo's `.rp.md` (worktree and trunk) has no Guardrails section. The #51 design planned a dogfood section but it never shipped. The governing precedent is #51's design ruling (its design-doc D3/Shape): author guardrails as "prose the agents read"; a `Name | Command | Phase` table is **recommended** but not mandated — "either is 'prose the agents read.'"

**(c) The failure mode that matters.** Unlike name/command/phase — where a missing field is visible incompleteness — a missing level is semantically meaningful (it means both roles), so an author who omitted deliberately and one who forgot are indistinguishable by design. That makes a shared illustrative shape worth more here than for the other fields, but still not a parser or mandated block.

**Sources:** `skills/radical-pipelines/reference/conventions/setup.md`, `skills/radical-pipelines/reference/conventions/load.md`, `.rp.md` (worktree + trunk), #51 design doc, `1-spec/spec-research.md`.

**Analyst decision (D1):** `level` is a fourth optional per-gate field captured in prose, with one illustrative example and no mandated syntax or parser.

- `setup.md` "Capture per gate" gains a fourth bullet: an optional **level** — `writer` or `reviewer`; absent means both roles.
- `setup.md` shows one small illustrative shape (e.g. a `Name | Command | Phase | Level` table with one leveled gate and one blank Level cell) so authors and load-time readers share an anchor for "unscoped looks like absence". This follows the #51 "recommended, not mandated" stance.
- The authoritative "a gate with no level applies to both roles" rule lives in `load.md` as prose, decoupled from serialization — so "no Guardrails section", "no Level column", and "blank Level cell" all resolve to both roles uniformly (spec R8).

### Q2: What does `load.md` state, and where does the role-filtered selection rule live?

**A:** Agents read the guardrails themselves from the committed `.rp.md` — the orchestrator does not pass them in launch prompts. So `load.md` owns the full rule, and each code agent file names only its own selection.

**(a) The reading path.** The orchestrator reads `load.md` (SKILL.md:46, work-on-an-issue.md:7), but what it passes down to spawned agents is a closed list — only Artifact folder and Commit format (`autonomous-workflow.md:63-65`); guardrails are not in any launch payload (`4 - code.md` steps 3-4 confirm). Each code agent's Gather-context step has it read the guardrails itself: `code-writer.md:13` and `code-reviewer.md:18` ("Read the guardrails applicable to the code phase"). Crucially, the agents do not restate the selection mechanism — `load.md:30` owns it ("select the guardrails whose phase(s) include the current phase") and the agent files just say "applicable to the code phase". The role filter is the same kind of rule and belongs in the same place, plus a one-phrase naming of each role's own selection in the two agent files so each agent knows which side it is on.

**(b) Division of labor — not duplication.** `load.md` states the whole rule: level vocabulary, absent=both, code-phase role filter (writer: writer+unscoped; reviewer: reviewer+unscoped), docs-phase selection purely phase-based. Each agent file states only the single fact that agent needs — its own selection phrase — and never the other role's side or the docs rule. Different reading paths, so this passes the CLAUDE.md "no duplicate information in the current reading path" test, and it mirrors exactly how the phase filter is split today.

**(c) Minimal `load.md` edit.** The Guardrails section is three paragraphs (definition :26, absent-is-valid :28, selection rule :30). Append one definition sentence to ¶1 (level is optional, `writer`/`reviewer`, names which code-phase role runs it, no level = both roles) and extend ¶3 (within the code phase, apply the level after the phase filter — writer runs `writer`-leveled or unscoped gates, reviewer runs `reviewer`-leveled or unscoped; the docs-phase selection never consults level, a both-phase gate carrying a level still runs for both doc agents). Malformed level gets no text: confirmed `load.md` is silent today on unrecognized phase targets (it only enumerates the valid set), and the membership-test wording already produces the same silent no-match for an out-of-vocabulary level (spec R9).

**(d) Committed-only line — no change.** `load.md:46` ("Guardrails is shared and committed-only; it is never taken from `.rp.local.md`") scopes the whole declaration, so the level inherits it for free. Spec R1/AC1 satisfied with zero edits.

**Sources:** `skills/radical-pipelines/SKILL.md`, `reference/autonomous-workflow.md`, `reference/autonomous-phases/4 - code.md`, `reference/conventions/load.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`.

**Analyst decision (D2):** `load.md` owns the complete level rule; agent files carry only their own selection phrase.

- ¶1 (definition) gains one sentence: a guardrail may carry an optional **level**, `writer` or `reviewer`, naming which code-phase role runs it; a guardrail with no level applies to both roles.
- ¶3 (selection rule) gains the role filter applied after the phase filter, both roles' selections, and the docs-phase never-consults-level sentence (including the both-phase-gate case).
- No text for malformed levels (mirrors the phase enumeration's silence); the membership wording yields the silent no-match by itself.
- The committed-only line is untouched.
- `code-writer.md` and `code-reviewer.md` each name their own selection in one phrase ("the code-phase guardrails leveled `writer`/`reviewer` or unscoped") — exact wording decided in Q3/Q4.

### Q3: How is `code-reviewer.md` restructured for fail-fast, the skipped state, and the approval guarantee?

**A:** Promote the guardrail run to its own numbered step, placed after behavior verification.

**(a) Structure.** Today's ordering is presentational only — there is no fail-fast or early-exit semantics to extend (spec-research.md:146-148), so the ordering must become load-bearing. Proposed sequence: step 2 "Review the changes" keeps the seven judgment checks and loses the guardrail bullet (:32); step 3 "Behavior verification" is unchanged in body; a new step 4 "Run the reviewer's guardrail selection" carries the moved guardrail obligations plus fail-fast, skipped-recording, and the approval guarantee; the old write/commit steps shift to 5/6. Guardrails go after behavior verification because behavior verification is itself expensive, judgment-based, and a rejection source ("either produce the evidence or reject the batch", :36) — if guardrails ran first, a behavior-verification rejection could not save the guardrail cost.

**(b) "Judgment-based checks" includes behavior verification.** Spec R5 partitions the review into judgment-based checks vs. the guardrail selection — a binary split; behavior verification is explicitly "not a guardrail" (:36), so it falls in the judgment bucket. Minor tension flagged: R5's single phrase spans two file steps (2 and 3); one bridging sentence in the new guardrail step ("run these only after the step-2 checks and step-3 behavior verification") removes the ambiguity.

**(c) Checks-table contract.** Nothing parses review file contents (spec-research.md:241-245), so the format is free to optimize for human reading. Contract: the Checks table holds a row for every gate of the reviewer's role selection; Result is `pass`, `fail`, or `skipped`. A forgotten gate would be an absent row; a deliberately skipped gate is a present row with Result `skipped` — the three-way distinction AC6 demands. The Command column shows the gate's literal command even when skipped (uniform column meaning; makes the skipped row self-explanatory), but the command is not run. One short template comment documents the Result vocabulary and every-gate-gets-a-row rule; the behavioral rule itself lives in the step prose.

**(d) Fail-fast permission and approval guarantee.** Both stated once, together, in the new guardrail step — they are the two halves of one rule: once at least one rejection finding exists the reviewer **may** skip any not-yet-run gate of its selection (recording each as skipped); it may approve **only** when every gate of its selection has run and passed in this same iteration. "May", never "must" — fail-fast is a permission; the reviewer can still run gates while rejecting. The fail-fast scope is the uniform rule over the whole selection (reviewer-leveled + unscoped), matching spec R5/R6's "its role selection" and the spec research's adopted decision. No ordering recommendation within the selection (cheap-first): the spec is silent and minimalism rules it out.

**(e) Collateral edits inventory (all of `code-reviewer.md`):**
1. Step 1.5 (:18) gains the role phrase: read the reviewer selection — code-phase guardrails leveled `reviewer` or unscoped.
2. Step 2 loses the guardrail bullet (:32); seven judgment checks remain.
3. New step 4 created from the moved bullet content + fail-fast + skipped recording + approval guarantee; "exactly as each command is written" survives, scoped to the selection.
4. The `## Checks` template (:60-64) gains the one-line Result-semantics comment.
5. Guidelines "Run the guardrails" bullet (:97) reconciled: names the reviewer selection, back-references the step's fail-fast rule instead of restating it, keeps the empty-selection rule.
6. Guidelines outcome-model bullet (:98-101): substance unchanged; only the empty-selection sub-case rewords "code-phase guardrails" to the role-filtered selection. Drift-guard and exit-nonzero sub-cases unchanged.
7. Drift-guard blocker: no text change beyond the selection phrase upstream — it triggers only on an attempted gate, and a skipped gate is never attempted, so fail-fast cannot manufacture a false drift blocker.

**Sources:** `agents/code-reviewer.md`, `1-spec/spec.md` (R5, R6, AC5-7), `1-spec/spec-research.md`.

**Analyst decision (D3):** Adopt the researcher's restructure in full.

- New step order: gather context → review the changes (seven judgment checks) → behavior verification → **run the reviewer's guardrail selection** (new step) → write the review → commit and report.
- The new step carries, stated once: the selection obligation ("exactly as written"), the bridging sentence that it runs after the step-2 checks and step-3 behavior verification, the fail-fast permission ("may", uniform over the whole selection, each skipped gate recorded as skipped), and the approval guarantee (approve only with every selection gate run and passed this iteration).
- Checks-table contract: a row per selection gate, Result ∈ {pass, fail, skipped}, skipped rows show the command unrun; one-line template comment for format, rule in prose.
- Guidelines bullets become back-references, never restatements; drift-guard prose stands; no within-selection ordering text.

### Q4: What changes in `code-writer.md` and `setup.md`, and is the design complete against the spec?

**A:** Five guardrail-bearing locations in `code-writer.md` (four change), three `setup.md` edits, and all 11 acceptance criteria map to a decision with the edit set confined to the four files.

**(a) `code-writer.md` inventory (verified by grep — guardrail mentions at :13, :36, :44-55, :73; :36 is the "not a guardrail" disclaimer, unchanged):**
1. Step 1.2 (:13) gains the writer selection phrase: read the writer guardrail selection — the code-phase guardrails leveled `writer` or unscoped (mirror of the reviewer's Q3 edit).
2. Step 5 heading (:44) and body (:46, :48-49): obligations unchanged in form per spec R4 — "run **every** gate, exactly as its command is written, all must pass before you commit, no bypass" — with the set they range over narrowed from "code-phase" to "your selection".
3. Step 5 outcome-model sub-bullets: the empty-selection sub-case (:52) rewords to the role selection; drift-guard (:53) and exit-nonzero (:54) substantively unchanged.
4. Guidelines blocker bullet (:73): substance identical either way — a reviewer-leveled gate is never in the writer's selection, so the writer never attempts it and the drift guard can only fire on a selection gate. Optional precision tweak "code-phase guardrail" → "gate of your selection".

**(b) `setup.md` edits.**
- (i) Fourth "Capture per gate" bullet (after :183): an optional **level** — `writer` or `reviewer` — naming which code-phase role runs the gate; asked only for gates whose phase(s) include `code` (spec R7); default when unset is unscoped (both roles).
- (ii) The illustrative example slots immediately after the capture bullet list — the reader has just learned the four fields and sees them assembled. A small generic `Name | Command | Phase | Level` table whose blank-Level row doubles as the "unscoped looks like absence" anchor and shows a both-phase gate unscoped. Generic placeholder commands only (CLAUDE.md generic rule).
- (iii) Validation text (:187-204): zero changes — it is command-execution-only and level-agnostic; no other setup.md text enumerates guardrail fields. A one-clause motivation for leveling fits the register: the Guardrails capture step is the one step that already motivates ("Why they matter", "What kinds to consider"), so a single clause giving the owner the decision criterion (expensive suites go reviewer-side) earns its place.

**(c) Completeness sweep — all 11 ACs covered, no gaps.** AC1 (D2 ¶1 + untouched committed-only line), AC2 (D2 ¶3 + per-agent selection phrases), AC3 (D2 docs sentence), AC4 (writer step 5 scoped, form preserved), AC5 (D3 ordered step + fail-fast), AC6 (D3 Checks contract), AC7 (D3 approval guarantee), AC8 (setup bullet + existing `.rp.md` write path), AC9 (D2 absent=both load rule, serialization-independent), AC10 (D2 silence on malformed values), AC11 (confinement below).

**Four-file confinement confirmed:** `doc-writer.md`/`doc-reviewer.md` zero edits (docs selection stays purely phase-based, their wording stays literally true); phase runbooks and `autonomous-workflow.md` zero edits (guardrails are never in launch payloads; agents self-read `.rp.md`); completion predicate unaffected (checks existence, never content); README explicitly deferred to the docs phase; the illustrative example uses placeholders so the real `.rp.md` is untouched (and migration is out of scope).

**Sources:** `agents/code-writer.md`, `skills/radical-pipelines/reference/conventions/setup.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`, `reference/autonomous-workflow.md`, `reference/autonomous-phases/4 - code.md`, `1-spec/spec.md`, `1-spec/spec-research.md`.

**Analyst decision (D4):** Adopt the inventory and setup edits, ruling on the open points:

- Step headings reuse the defined term on both sides: writer step 5 becomes "Run the writer guardrail selection"; the reviewer's new step is "Run the reviewer guardrail selection" — symmetric, and the selection term replaces "code-phase guardrails" wherever the agent's own gates are meant.
- The drift-guard precision tweak is adopted in both agent files ("a gate of your selection cannot execute"): once the files speak in selections, keeping "declared code-phase guardrail" would leave a stale broader term against the CLAUDE.md term-reuse rule. Substance unchanged.
- The setup level bullet is two sentences (optional field + vocabulary + code-applicable-only; default unscoped). The researcher's third sentence ("level is meaningless for a docs-only gate") is dropped — the asked-only-for-code clause already covers it.
- The one-clause motivation is adopted, attached to the level bullet (e.g. "level an expensive suite `reviewer` so it runs on the reviewer's side instead of on every writer commit") — in-register with the capture step's existing motivational prose.
- The illustrative table is adopted as proposed: generic commands, one `writer` gate, one `reviewer` gate, one blank-level both-phase gate.

## Design summary

The design is complete. Decisions D1-D4 cover the spec's 11 acceptance criteria with edits confined to the four files named in AC11:

1. **`load.md`** owns the level rule: a definition sentence in the Guardrails ¶1 (optional `level`, `writer`/`reviewer`, no level = both roles) and the role filter appended to the selection-rule ¶3 (applied after the phase filter; writer = writer+unscoped, reviewer = reviewer+unscoped; docs-phase selection never consults level, including both-phase gates). No malformed-level text; committed-only line untouched.
2. **`setup.md`** captures level as a fourth optional per-gate bullet (asked only for code-applicable gates, default unscoped, one motivating clause) plus one generic illustrative `Name | Command | Phase | Level` table after the capture list. Validation text unchanged.
3. **`code-writer.md`** narrows to the writer guardrail selection (step 1.2 phrase, step 5 retitled "Run the writer guardrail selection") with all R4 obligations unchanged in form; empty-selection and drift-guard wording scoped to the selection.
4. **`code-reviewer.md`** is restructured: the guardrail run leaves step 2's checklist and becomes its own step after behavior verification ("Run the reviewer guardrail selection"), carrying — stated once — the selection obligation, the runs-after bridge, the fail-fast permission ("may" skip any not-yet-run selection gate once a rejection finding exists, each recorded as skipped), and the approval guarantee (approve only with every selection gate run and passed this iteration). Checks table: a row per selection gate, Result ∈ {pass, fail, skipped}, skipped rows show the command unrun, one-line template comment. Guidelines bullets become back-references.

No other file changes: doc agents, runbooks, workflow files, and the completion predicate are untouched by construction.
