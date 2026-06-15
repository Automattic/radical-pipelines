# Code Plan — Agent-scoped guardrails

_Pipeline: `121-role-scoped-guardrails`, review run `review-1-agent-scoped-guardrails`. Inputs: the approved `1-spec/spec.md` and `2-design-doc/design-doc.md` (its §9 deliverable map and decisions D1–D5 are the primary source). This is a **review run**: a prose-only change to this repo's own skill, replacing the guardrail `phase`+`level` dimensions with a single agent-name dimension across exactly six files._

## Scope and conventions

- **Prose-only.** Every "code" task here is a prose edit to a Markdown file in the skill. There is no executable code, module, or parser. Acceptance is verified by reading the resulting text, not by running a test suite.
- **Exactly six files** (spec AC13), nothing else: `skills/radical-pipelines/reference/conventions/load.md`, `skills/radical-pipelines/reference/conventions/setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`. Note the layout split: conventions live under `skills/radical-pipelines/reference/conventions/`, the agent files at the repo root under `agents/`.
- **Out of scope** (do not touch): `.rp.md`, `.changeset/role-scoped-guardrails.md` (docs-phase deliverable), `README.md`, `CHANGELOG.md`, the phase runbooks, and the `.rp.md` serialization syntax. See design §6, §8.
- **The canonical selection phrase** the agent files must use is: **"the guardrails that name `<agent>` or name no agents"** (writer/reviewer adapt the verb — "run before completing" / "run during review"). Reuse this exact construction; do not introduce a new notation for it.
- **Line anchors** in each task are against the verified live tree (branch `worktree-121-role-scoped-guardrails`, which carries the base-run state). They orient the writer; the writer matches on the quoted text, since edits in an earlier task can shift later line numbers within the same file (only T1 and T2 touch the same file as another task — they don't; each file is owned by exactly one task).

## Task ordering and independence

Each of the six files is owned by exactly one task, so all six tasks are independent and touch disjoint files. T1 (`load.md`) defines the vocabulary the other five reference, so it is listed first and should land first to anchor the shared terms, but no task reads another's output (each agent file names only its own selection and archetype — the cross-file contract is the shared *wording convention* above, not a runtime dependency). Tasks may be executed in parallel.

---

## T1 — Rewrite `load.md` Guardrails section to the agents dimension

**Goal.** Make `load.md` the single home of the agents-field definition, the name-membership selection rule, and the two behavior archetypes, with `phase` and `level` deleted. (Design D1; satisfies AC1–AC6.)

**Files.**
- `skills/radical-pipelines/reference/conventions/load.md`

**Changes.**

1. **Loader-table row** (`:22`). Re-word the "What it covers" cell to drop the phase phrasing. Current: `The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass`. Replace the trailing `— the code/doc phases must pass` so the cell ends at the generic description (e.g. `The deterministic verification gates — exact commands judged pass/fail by exit code`). Keep the row otherwise intact, including the `No` Required cell.

2. **¶1 Definition** (`:26`). Rewrite. Keep the exact-command / exit-code definition sentence verbatim through the `npm test` example (`A guardrail is an exact command, judged pass/fail solely by its exit code (0 = pass, any non-zero = fail) … "Run the tests" is not a guardrail; `npm test` is.` — drop the clause `mandatory within the phase(s) it applies to,` since phase is gone, rephrasing to keep the mandatory sense without naming phase). **Delete** the two sentences that follow: the phase-target sentence (`The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both.`) and the level sentence (`A guardrail may also carry an optional level — `writer` or `reviewer` … applies to both roles.`). **Add** the agents-field definition: a guardrail may name the agents that run it (one or more exact gate-running-agent names); **a guardrail that names no agents runs for every gate-running agent.** State this as a definition/load fact, decoupled from `.rp.md` serialization, so "no Agents column" and "blank Agents cell" both resolve to all-agents (AC4). Do not mandate a serialization syntax.

3. **¶2 Absent-is-valid** (`:28`). **Unchanged.** Leave verbatim: `An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning.` It is scoped distinctly from ¶1 by the noun "declaration" (no gates declared at all) vs ¶1's "a guardrail that names no agents" (a field within a declared gate). Add no disambiguating sentence.

4. **¶3 Selection rule** (`:30`). Replace the entire phase-then-level paragraph. The new ¶3 must: (a) **enumerate** the gate-running agents — `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` — stating the enumeration is load-bearing (adding a future gate-running agent updates it) (AC2); (b) state the **selection rule**: each agent selects the guardrails that name it plus the guardrails that name no agents (AC3); (c) state that **phase plays no part**; (d) keep the **empty-selection** rule: an empty selection means run none and proceed; (e) state the **inert forward declaration**: a guardrail naming only agents outside this set is selected by no current agent and is inert until such an agent exists, with no error, blocker, or warning (AC5).

5. **¶4 Behavior archetypes** (NEW paragraph, after ¶3). State the two archetypes and the mapping rule (design §4.4): a **writer-type** agent produces commits — it runs every gate in its selection, exactly as each command is written, all passing before each commit; a **reviewer-type** agent issues verdicts — it runs its judgment-based checks first, may fail-fast (reject without running not-yet-run gates of its selection, recording each as skipped), and approves only when every gate in its selection has run and passed in that same iteration, each instance fresh and stateless. An agent is writer-type if it commits work and reviewer-type if it reviews it. **¶4 carries the rule only** — not the Checks-table vocabulary, the absent-vs-skipped distinction, or step-ordering mechanics (those are the agent files' job), and **no forward pointer** to the agent files (the archetype label is the reference contract).

6. **Committed-only line** (`:46`, in `## Local overrides`). **Unchanged** — it scopes the whole declaration, so the agents field inherits committed-only for free (AC1).

**Depends on.** None.

**Traces to.** Design D1, §4.1–§4.4, §9 item 1; spec R1–R6, AC1–AC6.

**Acceptance.**
- The Guardrails section is four paragraphs (¶1 definition, ¶2 absent-is-valid, ¶3 selection, ¶4 archetypes).
- No occurrence of `phase`, `level`, `writer`/`reviewer` *as a level value*, or "code/doc phases" remains in the Guardrails section or its loader-table row. (The words `code-writer`/`code-reviewer`/`doc-writer`/`doc-reviewer` as agent names are expected; the word "writer-type"/"reviewer-type" as archetype labels in ¶4 is expected.)
- ¶1 defines the optional agents field and states "a guardrail that names no agents runs for every gate-running agent," decoupled from serialization.
- ¶2 is byte-identical to the current `:28` line.
- ¶3 enumerates exactly the four gate-running agents, states the name-membership selection (gates naming the agent + gates naming none), states phase plays no part, keeps the empty-selection rule, and states the inert forward-declaration case with no error/blocker/warning.
- ¶4 states both archetypes and the commits-vs-reviews mapping rule, carries no Checks-table vocabulary or step mechanics, and contains no forward pointer to the agent files.
- The committed-only line at `:46` is unchanged.

---

## T2 — Reshape `setup.md` guardrail capture to the agents field

**Goal.** Capture the optional agents field per gate (asked for every gate), surface the unset-default consequence, and reshape the example table to `Name | Command | Agents`, leaving the command-execution validation flow untouched. (Design D2; satisfies AC11.)

**Files.**
- `skills/radical-pipelines/reference/conventions/setup.md`

**Changes.**

1. **Section intro** (`:173`). Re-word `The deterministic verification gates the code and docs phases must pass — …` to drop the phase phrasing, matching T1's loader-table re-word (e.g. `The deterministic verification gates — exact commands, judged pass/fail by exit code.`). The **Why they matter** and **What kinds to consider** bullets (`:175`, `:177`) are unchanged.

2. **"Capture per gate" list** (`:179-184`). Collapse the **phase** bullet (`:183`) and the **level** bullet (`:184`) into a single optional-**agents** bullet (list goes 4 → 3 bullets):
   - **name** bullet (`:181`) — unchanged.
   - **exact literal command** bullet (`:182`) — unchanged.
   - NEW **agents** bullet: the optional **agents** that run the gate — one or more gate-running-agent names (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`), asked for **every** gate. Carry the **surfaced default** ("when unset, the gate runs for every gate-running agent, doc agents included — so name the agents of any code-specific or expensive gate deliberately") and the **re-anchored decision criterion** ("naming only `code-reviewer`, for example, runs an expensive suite on the reviewer's side instead of on every writer commit"). The base run's "ask this only for gates whose phase(s) include `code`" conditional is **dropped outright** (phase is gone; nothing to hang it on).

3. **Example table** (`:186-192`). Reshape from `Name | Command | Phase | Level` (4 columns) to `Name | Command | Agents` (3 columns), keeping the "illustrative, not a mandated block or parser input" framing sentence (`:186`). Three rows:

   | Name      | Command       | Agents          |
   | --------- | ------------- | --------------- |
   | typecheck | `check-types` | `code-writer`   |
   | tests     | `run-tests`   | `code-reviewer` |
   | lint      | `run-lint`    |                 |

   (typecheck → single writer agent; tests → single reviewer agent demonstrating the decision criterion; lint → blank = the all-agents default anchor.)

4. **Untouched.** The "**None** is a complete, valid answer" line (`:194`); the entire **Validate each command** block and its three-outcome model (`:196-213`); the parity-floor and two-caveats prose. R8 leaves the command-execution validation flow unchanged.

**Depends on.** None. (Shares the T1 wording convention for agent names and the unset-default phrasing, but reads no T1 output.)

**Traces to.** Design D2, §4.6, §9 item 2; spec R8, AC11.

**Acceptance.**
- The "Capture per gate" list has exactly three bullets: name, exact command, optional agents.
- The agents bullet states it is asked for every gate, names the four gate-running agents, surfaces the "unset = every gate-running agent, doc agents included" default, and carries the "name only `code-reviewer`" decision criterion. No "ask this only for gates whose phase(s) include `code`" conditional remains.
- No occurrence of `phase` or `level` (as a guardrail dimension) remains anywhere in the `### Guardrails` section, including the section intro and the table.
- The example table has exactly three columns `Name | Command | Agents` with the three rows above (typecheck→`code-writer`, tests→`code-reviewer`, lint→blank), under the unchanged illustrative-not-mandated framing.
- The "None is valid" line and the entire validation block (`:196-213`) are unchanged.

---

## T3 — Re-key `code-writer.md` selection to agent name

**Goal.** Re-key the writer's selection-defining clause from level to agent name; preserve the writer obligations and step structure in form. (Design D3; satisfies AC7.)

**Files.**
- `agents/code-writer.md`

**Changes.**

1. **Step 1.2 read** (`:13`). Replace `Read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing.` with `Read the guardrails that name `code-writer` or name no agents — the gates you must run before completing.`

2. **Step 5** (`:44-55`). The title `### 5. Run the writer guardrail selection` (`:44`) and the "writer guardrail selection" / "writer's selection" wording (`:46`, `:48`, `:52`, `:53`) **already hold and are unchanged**. The obligations survive verbatim in form ("run **every** gate … exactly as its command is written … must pass before you commit, no bypass"), now understood as the writer archetype. Edit only where the selection is still phrased by level/phase: if any `code-phase … leveled `writer` or unscoped` phrasing appears inside the step, re-key it to "the guardrails that name `code-writer` or name no agents." Per the verified state, the level phrasing survives at `:13` (step 1.2) only; step 5's body already uses the agent-agnostic "writer guardrail selection" wording, so confirm no level/phase phrasing remains and leave the obligations, the empty-selection sub-case (`:52`), the drift-guard sub-case (`:53`), and the exit-non-zero sub-case (`:54`) substantively unchanged.

3. **Guidelines blocker bullet** (`:73`). Re-word the parenthetical example `a gate in the writer's selection cannot execute` to keep the agent-name framing consistent — `a gate of your selection that cannot execute` (substance identical: a gate naming only other agents is never in the selection, so the drift guard only fires on a selection gate).

**Depends on.** None.

**Traces to.** Design D3, §9 item 3; spec R6 (writer archetype), AC7.

**Acceptance.**
- Step 1.2 reads "the guardrails that name `code-writer` or name no agents — the gates you must run before completing."
- No `code-phase`, `leveled`, `level`, or `or unscoped` phrasing remains anywhere in the file.
- Step 5's title, the run-every / all-pass-before-commit / no-bypass obligations, and the two-question outcome model (empty / declared-but-unrunnable / runs-and-exits-non-zero) are unchanged in form.
- The Guidelines blocker bullet's parenthetical names "a gate of your selection that cannot execute."

---

## T4 — Re-key `code-reviewer.md` selection to agent name

**Goal.** Vocabulary re-key only: re-key the three occurrences of the level phrasing that name the selection to agent name; the full reviewer structure (dedicated step 4, Checks template, fail-fast/skipped/approving-iteration/stateless, drift-guard) stands. (Design D4; satisfies AC8.)

**Files.**
- `agents/code-reviewer.md`

**Changes.**

1. **Step 1 read** (`:18`). Replace `Read the code-phase guardrails leveled `reviewer` or unscoped — the gates you must run during review.` with `Read the guardrails that name `code-reviewer` or name no agents — the gates you must run during review.`

2. **Step 4 run ¶** (`:41`). Re-key the parenthetical selection name: `Run every gate of the reviewer's selection (the code-phase guardrails leveled `reviewer` or unscoped), exactly as each command is written.` → name the selection `(the guardrails that name `code-reviewer` or name no agents)`. The bridge ¶ (`:39`), fail-fast/skipped ¶ (`:43`), and approval/stateless ¶ (`:45`) carry no level phrasing and **stand as written**.

3. **Guidelines "Run the guardrails." bullet** (`:110`). Re-word the parenthetical `(the code-phase guardrails leveled `reviewer` or unscoped)` to `(the guardrails that name `code-reviewer` or name no agents)`. The two-question outcome-model bullet (`:111-114`) and the blocker bullet (`:115`) speak of "the reviewer's selection" already and **stand as written**.

4. **Untouched.** The dedicated step-4 structure (`:37-45`), the `Check | Command | Result` template and its comment block (`:71-77`, Result ∈ {pass, fail, skipped}, absent-vs-skipped), and the drift-guard blocker semantics. No structural change.

**Depends on.** None.

**Traces to.** Design D4, §3.4, §9 item 4; spec R6 (reviewer archetype), AC8.

**Acceptance.**
- The three selection-naming occurrences (`:18`, step-4 run ¶, Guidelines "Run the guardrails." bullet) read "the guardrails that name `code-reviewer` or name no agents" (the read item adapts the trailing clause "— the gates you must run during review").
- No `code-phase`, `leveled`, `level`, or `or unscoped` phrasing remains anywhere in the file.
- The dedicated step 4 (bridge / run / fail-fast-skipped / approval-stateless paragraphs), the Checks template with its absent-vs-skipped comment block, and the Guidelines two-question + drift-guard bullets are unchanged in form.

---

## T5 — Re-key `doc-writer.md` selection to agent name

**Goal.** Re-key the doc-writer's selection from "the docs-phase guardrails" to agent name, retitle step 4 to the writer-selection form, preserve the writer obligations and the doc-specific empty-selection note. (Design D5; satisfies AC9.)

**Files.**
- `agents/doc-writer.md`

**Changes.**

1. **Step 3 accuracy verification** (`:35`). Re-word the clause `If a docs-phase guardrail covers doc tests, exercise them; otherwise trace by hand.` to `If a guardrail in your selection covers doc tests, exercise them; otherwise trace by hand.`

2. **Step 4** (`:38-48`). Retitle `### 4. Run the docs-phase guardrails` → `### 4. Run the writer guardrail selection` (mirroring `code-writer.md` step 5 / D3). Re-key the body:
   - The intro sentence (`:40`, "The guardrails applicable to the docs phase are the ones tagged for documentation — for example link checking, markdown linting, render check, doc tests, spelling. Many projects rely on human review and tag none.") re-keys to the agent-name selection — name it "the guardrails that name `doc-writer` or name no agents," keeping the illustrative list of doc-gate kinds and the "many projects tag none" note adapted to "name none."
   - The obligation bullet (`:42`) re-keys "every docs-phase guardrail" → "every gate in your selection," obligations otherwise verbatim ("exactly as its command is written … must pass before you commit").
   - The no-bypass bullet (`:43`) unchanged.
   - The two-question outcome model (`:44-47`): re-key the empty-selection sub-case (`:45`) wording from "No docs-phase guardrails apply" to the agent-name selection being empty, **keeping the doc-specific note** "the step-3 accuracy verification is your only validation; proceed." The declared-but-unrunnable sub-case (`:46`) and the exit-non-zero sub-case (`:47`) re-key "docs-phase guardrail" → "a gate of your selection" / "a gate", substance unchanged.
   - The Acceptance-coverage line (`:48`) unchanged.

3. **Guidelines blocker bullet** (`:67`). Re-word `a declared docs-phase guardrail's command cannot execute` to `a gate of your selection's command cannot execute` (or the natural equivalent "a declared gate of your selection cannot execute"), mirroring D3. Substance identical.

**Depends on.** None.

**Traces to.** Design D5 (doc-writer half), §3.5, §9 item 5; spec R7 (doc-writer keeps writer behavior, re-keyed), AC9.

**Acceptance.**
- Step 4 is titled "Run the writer guardrail selection."
- Every "docs-phase guardrail(s)" / "tagged for documentation" / "applicable to the docs phase" selection phrasing is re-keyed to "the guardrails that name `doc-writer` or name no agents" (or "a gate of your selection" in the sub-cases and blocker bullet).
- No `docs-phase` / `phase` guardrail-selection phrasing remains in the file.
- The writer obligations (run every gate, exactly as written, all pass before commit, no bypass), the two-question outcome model, and the doc-specific empty-selection note ("the step-3 accuracy verification is your only validation; proceed") are preserved.

---

## T6 — Freshly restructure `doc-reviewer.md` to the reviewer archetype

**Goal.** Restructure `doc-reviewer.md` from its pre-base 5-step shape to the 6-step reviewer archetype, templated on the base-run `code-reviewer.md`, adapted for docs vocabulary: promote guardrails out of the mid-review judgment bullet into a dedicated step after the judgment checks, with fail-fast permission, skipped recording, the approving-iteration guarantee, a stateless line, and the `pass`/`fail`/`skipped` Checks vocabulary including the absent-vs-skipped distinction. (Design D5; satisfies AC10.)

**Files.**
- `agents/doc-reviewer.md`

**Changes.** Restructure to a **6-step** sequence (from the current 5). Template the new shape on `code-reviewer.md` (§3.4 of the design), substituting docs vocabulary. The two structural deviations from the code-reviewer template are explicitly: (a) the bridge ¶ names **both** judgment checks (the step-2 review pass **and** the step-3 accuracy spot-check), and (b) the retained Accuracy spot-check is doc-reviewer's analogue of code-reviewer's Behavior-verification section.

1. **Step 1 — Gather context** (`:12-21`). Add a guardrail-read item (parallel to `code-reviewer.md:18`), slotted after reading the host documentation convention (`:19`) and before inspecting the diff (`:20`): `Read the guardrails that name `doc-reviewer` or name no agents — the gates you must run during review.` The existing six read items otherwise stay.

2. **Step 2 — Review the changes** (`:22-33`). **Remove** the guardrail bullet (`:33`, "**Docs-phase guardrails** — run every guardrail applicable to the docs phase …"). The other seven judgment bullets (`:26-32`) stay verbatim.

3. **Step 3 — Accuracy spot-check** (`:35-37`). **Unchanged in content.** Keep its number as step 3.

4. **Step 4 — Run the reviewer guardrail selection** (NEW). Placed after both judgment checks (step 2 review pass, step 3 accuracy spot-check). Four paragraphs mirroring `code-reviewer.md:39-45`, adapted:
   - **Bridge ¶**: "This step runs only after the step-2 review checks and the step-3 accuracy spot-check, so judgment-based checks always precede the guardrail selection." (Names **both** judgment checks — the doc-specific deviation.)
   - **Run ¶**: run every gate of the selection — "the guardrails that name `doc-reviewer` or name no agents" — exactly as each command is written; record each in the Checks table; no bypass (no `--no-verify`, no `skip`, no commented-out checks).
   - **Fail-fast ¶**: once at least one rejection finding exists, may reject without running not-yet-run gates of the selection, recording each deliberately skipped gate as **skipped** in the Checks table; may also run gates while rejecting.
   - **Approval/stateless ¶**: approve only when every gate in the selection has run and passed this iteration; no gate unrun or skipped on an approving iteration; each instance fresh and stateless, no cross-iteration caching.

5. **Step 5 — Write the review** (was step 4, `:39-81`). Renumber to step 5. Update the internal step-number reference in the commit/report step that points at the written file (see item 6). The verdict/filename logic, the review-template structure, and the **Accuracy spot-check** review-template section (`:67-69`) are unchanged. **Checks-table contract:** the bare `Check | Command | Result` template (`:62-65`) gains a comment block (cloned and adapted from `code-reviewer.md:71-74`) documenting: one row per selection gate; Result ∈ {`pass`, `fail`, `skipped`}; a skipped row shows the gate's literal command unrun; a forgotten gate is an **absent** row, a deliberately skipped gate is a **present** `skipped` row, a run gate is a present `pass`/`fail` row.

6. **Step 6 — Commit and report** (was step 5, `:83-87`). Renumber to step 6. Update the reference "Commit the file you wrote in step 4" → "step 5."

7. **Guidelines** (`:89-99`). Reconcile to the three-bullet shape mirroring base `code-reviewer.md` (`:110`, `:111-114`, `:115`):
   - **Rewrite the "Run the docs-phase guardrails if any exist" bullet** (`:98`) to the back-reference form: run every gate in the selection per step 4, including its fail-fast permission and approval guarantee; **keep doc-reviewer's distinctive empty-selection note** — "if your selection is empty, the accuracy spot-check is your only evidence — produce it; that is not a blocker and warrants no warning." Name the selection "the guardrails that name `doc-reviewer` or name no agents."
   - **Add a standalone two-question outcome-model bullet** (mirroring `code-reviewer.md:111-114`) with three sub-bullets re-keyed to the reviewer's selection: empty selection → the accuracy spot-check carries the review, not a blocker, no warning; a declared selection gate that cannot execute → blocker (drift guard, fires only on an attempted gate, so fail-fast cannot manufacture a false drift blocker); a gate that runs and exits non-zero → normal rejection finding.
   - **Rewrite the blocker bullet** (`:99`) so normal findings (incl. a selection gate that runs and exits non-zero) go in a rejection verdict and blockers are reserved for broken inputs (incl. a declared selection gate that cannot execute; `doc-plan.md`/`spec.md`/`design-doc.md`/shipped code missing or unreadable; batch metadata missing), dropping the now-redundant inline two-question text moved to the new bullet.

   The other Guidelines bullets (`:91-97`) stay. The selection phrase is always agent-name ("name `doc-reviewer` or name no agents"), never "leveled" — doc-reviewer has no level.

**Depends on.** None. (Templated on `code-reviewer.md`'s already-restructured shape, which is the verified base-run state in the live tree, not T4's output — T4 only re-keys vocabulary and changes no structure.)

**Traces to.** Design D5 (doc-reviewer half), §3.4 (template), §3.6 (starting state), §9 item 6; spec R7 (doc-reviewer gains reviewer archetype), AC10.

**Acceptance.**
- The workflow is a 6-step sequence: 1 Gather context → 2 Review the changes → 3 Accuracy spot-check → 4 Run the reviewer guardrail selection → 5 Write the review → 6 Commit and report.
- Step 1 includes the guardrail-read item naming "the guardrails that name `doc-reviewer` or name no agents."
- Step 2 no longer contains a guardrails bullet; its remaining seven judgment bullets are intact.
- Step 4 is a dedicated guardrail step with all four paragraphs (bridge naming **both** the step-2 review and the step-3 accuracy spot-check; run; fail-fast/skipped; approval/stateless).
- The Checks template carries a comment block specifying one row per selection gate, Result ∈ {pass, fail, skipped}, and the absent-vs-skipped distinction (forgotten = absent row, deliberately skipped = present skipped row, run = present pass/fail row).
- The Accuracy spot-check review-template section is retained.
- The Guidelines carry the back-reference guardrail bullet (with the kept doc-specific empty-selection note), a standalone two-question outcome-model bullet with the three re-keyed sub-cases, and the rewritten blocker bullet.
- No `docs-phase guardrail`, `level`, or `leveled` selection phrasing remains; the selection is always named by agent. Internal step references (commit/report) point at the renumbered steps.

---

## Acceptance-criteria coverage

| AC | Task |
| -- | ---- |
| AC1 (single agents field, phase/level removed, committed-only) | T1 |
| AC2 (gate-running agent set enumerated) | T1 |
| AC3 (name-membership selection, empty-selection preserved) | T1 |
| AC4 (unnamed gate runs for every agent, docs included) | T1 |
| AC5 (out-of-set names inert, no error/blocker/warning) | T1 |
| AC6 (two archetypes stated once + mapping rule) | T1 |
| AC7 (`code-writer` agent-name selection, writer obligations) | T3 |
| AC8 (`code-reviewer` judgment-then-selection, fail-fast/skipped/approving) | T4 |
| AC9 (`doc-writer` agent-name selection, writer obligations) | T5 |
| AC10 (`doc-reviewer` reviewer archetype: own step, fail-fast, skipped, approval, stateless, vocab) | T6 |
| AC11 (setup captures agents per gate, asked every gate, default surfaced, `Name \| Command \| Agents` table, validation unchanged) | T2 |
| AC12 (changeset reworded in place — **docs phase**, no code task) | — (docs phase) |
| AC13 (exactly six files) | T1–T6 (one file each; release artifacts excluded) |
