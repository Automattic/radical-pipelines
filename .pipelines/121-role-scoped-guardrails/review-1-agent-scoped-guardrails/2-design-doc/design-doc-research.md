# Design doc research: Agent-scoped guardrails

Running record of the design-phase Q&A between the design-doc-analyst and design-doc-researcher. The change replaces the base run's two guardrail scoping dimensions (`phase` + `level`) with a single agent-name dimension, and deletes `phase` and `level` outright.

The spec (`1-spec/spec.md`) and its research (`1-spec/spec-research.md` "Resolved requirements") already lock the semantics. The design phase is scoped to the exact prose shape across the six touched files: `reference/conventions/load.md`, `reference/conventions/setup.md`, and the four `agents/*.md` (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`). No executable code, module, or parser — guardrails remain prose the agents read.

## Grounding

### Branch and base-run state (verified)

The base run (PR #124, the run under review) is **open and unmerged**; `trunk` does not contain it. This worktree is checked out on `worktree-121-role-scoped-guardrails`, which carries the base-run changes, so the worktree files **are** the base-run state — the correct baseline to author the review against.

`git diff --stat trunk...HEAD` confirms the base run touched exactly four non-`.pipelines` files: `agents/code-reviewer.md`, `agents/code-writer.md`, `reference/conventions/load.md`, `reference/conventions/setup.md`. **`agents/doc-writer.md` and `agents/doc-reviewer.md` are absent from the diff — byte-identical to trunk, in their original pre-base shape.** Consequences:

- doc-reviewer's R7 restructure is a **fresh** restructure (not a tweak of base-run work), using the base run's **already-restructured** `code-reviewer.md` as the template.
- doc-writer currently runs "the docs-phase guardrails" by phase; the review re-keys it to agent-name selection.
- This validates the spec's six-file confinement (AC13), which deliberately reverses the base spec's four-file / docs-agent-confinement claim (base AC11).

### Open design decisions (the analyst's list)

The spec leaves four design-level decisions open. Each is resolved below.

1. **Archetype placement** — where the writer-type / reviewer-type run-behavior + mapping rule lives (spec R6 mandates "one place"), and its exact prose shape.
2. **load.md rewording** — the definition (agents field + absent-means-all), the explicit gate-running agent enumeration (R2), and the membership selection rule (R3/R4/R5).
3. **doc-reviewer restructure** (R7) — exact step sequence and content, given doc-reviewer's pre-base structure differs from code-reviewer's.
4. **setup capture + example table** (R8) — the capture-bullet reshape and the `Name | Command | Agents` example rows.

## Q&A rounds

### Round 1 — Archetype placement (decision 1 + most of decision 2)

**Question.** Spec R6 requires the skill to state, in one place, the two run-behaviors and the rule mapping any gate-running agent to one of them. The base run's design D1 kept *selection* centralized in load.md but left *run-behavior* distributed across the agent files, never abstracted. Two options: (a) keep run-behavior per-agent (lowest churn, but no single mapping rule — which the intent explicitly asked for); (b) state the two archetypes once in load.md (mirrors the selection-centralization precedent; raises load.md's altitude from "what to load" to "what an agent does with its selection"). Which, and in what exact prose?

**Researcher findings.**

- **Altitude survey of load.md.** load.md is a loader file. Surveying every section: the conventions table frames each row as "what it covers"; the **Agent models** convention is pure "what to load"; the **Health monitoring** table row only *names* the convention (mechanics live elsewhere — not counter-evidence); **Local overrides** describes a load-time *procedure* (resolve main root, merge in memory) — still loader altitude. The **Guardrails selection rule** (`load.md:30`) is already the highest-altitude thing in the file: it tells an agent how to compute its own working set — already one step past "what to load." Adding the archetype/mapping rule is a *further step in the same direction the selection rule already took*, and it imports only a one-sentence-per-archetype *classification + mapping* fact — **not** the full execution prose (fail-fast mechanics, skipped recording, Checks-table vocabulary stay in the agent files). So (b) is a real but *small* altitude step, continuous with the selection rule.
- **No alternative "one place" anchor for (a).** Grep for files naming both `code-writer` and `code-reviewer`: the only hit is `README.md:112`, an *inventory* of all 17 agents in spawn order — it does not group the four gate-running agents as a behavioral set, and README guardrail prose stays at phase altitude (out of scope). The phase runbooks' Required-agents tables name writer+reviewer only **pairwise per phase**, never as a unified four-agent set, never with behavior (verified independently by the analyst: `4 - code.md:23-26`, `5 - docs.md:24-27`). So under (a) there is no existing convergence file; satisfying R6 would mean *creating* a new home or making one agent file canonical and having the other three reference it (an asymmetry with no precedent, worse than (b)). load.md is genuinely the only natural convergence point — this kills (a) on the merits.

**Decision (accepted).** Option **(b)**: load.md's Guardrails section gains a new ¶4 holding the two archetypes + the mapping rule. The agent files carry the *concrete realization* of their archetype, now labeled by archetype name rather than re-derived. The design doc must name the altitude tension and justify it as the selection-rule precedent extended — not pretend load.md stays a pure loader. ¶4 stays free of any forward pointer ("see the reviewer agent file") — the archetype label is the reference contract; a cross-reference would be the kind the minimalism rule discourages.

### Confirm — the two absent-rules in load.md do not collide

**Question.** ¶1's new "a guardrail that names no agents runs for every gate-running agent" and ¶2's "an absent or empty Guardrails *declaration* means no command gates" are different rules (field-level absence vs declaration-level absence). Is there a reading where a reader conflates a blank Agents cell (= all agents) with an absent declaration (= no gates)? Can a one-word tightening keep them unambiguous without a disambiguating sentence?

**Decision.** The two rules operate at different scopes and the wording keeps them distinct: ¶1 speaks of a *guardrail that names no agents* (a field within a declared gate → that gate runs for all gate-running agents); ¶2 speaks of an *absent or empty Guardrails declaration* (no gates declared at all → nothing runs). The nouns ("a guardrail" vs "a Guardrails declaration") carry the scope distinction; no extra disambiguating sentence is added. Keep both ¶ — they answer different questions (one gate's agents field vs the whole section's presence).

### Round 2 — load.md exact rewording (decision 2)

The Guardrails section reshapes from three ¶ to four:

- **¶1 Definition** (rewrite of base `load.md:26`): drop the phase-target and level sentences. Define the guardrail (exact command, pass/fail by exit code, `npm test` not "run the tests") and the **agents** field: a guardrail may name the agents that run it; a guardrail that names no agents runs for every gate-running agent. This is the authoritative absent-means-all rule, decoupled from serialization, so "no Guardrails section," "no Agents column," and "blank Agents cell" all resolve to all-agents uniformly.
- **¶2 Absent-is-valid** (base `:28`, unchanged): an absent or empty Guardrails *declaration* means no command gates — valid, complete, never a blocker, never a warning. (Distinct from ¶1, per the confirm above.)
- **¶3 Selection rule** (rewrite of base `:30`): enumerate the **gate-running agents** — `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` (R2, load-bearing: adding a future gate-running agent updates this list). Each selects the guardrails that name it plus the guardrails that name no agents; an empty selection means run none and proceed (R3). A guardrail naming only agents outside this set is selected by none and is inert until such an agent exists (R5 — a legitimate forward declaration, no error/blocker/warning; the silent no-match falls out of the membership test alone). Phase plays no part.
- **¶4 Behavior archetypes** (NEW — the R6 home): gate-running agents fall into two behavior types. A **writer-type** agent produces commits: it runs every gate in its selection, exactly as each command is written, and all must pass before each commit. A **reviewer-type** agent issues verdicts: it runs its judgment-based checks first, may fail-fast (reject without running the not-yet-run gates of its selection, recording each as skipped), and approves only when every gate in its selection has run and passed in that same iteration; each reviewer instance is fresh and stateless. A gate-running agent is writer-type if it commits work and reviewer-type if it reviews it. ¶4 states the *rule* once; it does not carry the Checks-table vocabulary, the absent-vs-skipped distinction, or step-ordering mechanics — those are the archetype's concrete realization in the agent files.

The committed-only line (`load.md:46`, `## Local overrides`) is untouched — it scopes the whole declaration, so the agents field inherits committed-only for free (never from `.rp.local.md`). The loader-table row (`:22`) describes guardrails generically; it loses the "the code/doc phases must pass" phrasing that names phase — re-worded to drop the phase reference while keeping the generic "deterministic verification gates" description.

### Round 3 — doc-reviewer restructure (decision 3, R7)

Template = the base run's **code-reviewer.md** (worktree state): step 4 "Run the reviewer guardrail selection" after behavior verification; fail-fast; skipped; approval guarantee; stateless line; the Checks comment block; reconciled three-bullet Guidelines. doc-reviewer mirrors it, adapted for the docs vocabulary.

**Step sequence.** Today: 1 gather → 2 review changes (8 bullets, the last `:33` is the guardrail bullet) → 3 accuracy spot-check → 4 write review → 5 commit/report. New sequence:

1. Gather context — gains a guardrail-read item (parallel to `code-reviewer.md:18`): "Read the guardrails that name `doc-reviewer` or name no agents — the gates you must run during review," slotted after reading the doc convention and before inspecting the diff (matching code-reviewer's ordering).
2. Review the changes — the guardrail bullet (`:33`) is **removed**; the other 7 judgment bullets stay.
3. Accuracy spot-check — unchanged in content.
4. **Run the reviewer guardrail selection** (NEW).
5. Write the review (was 4) — internal references update (step-5 filename selection).
6. Commit and report (was 5) — "Commit the file you wrote in step 5."

**Guardrails land after BOTH judgment checks** — the step-2 review pass and the step-3 accuracy spot-check — the exact parallel to code-reviewer placing guardrails (step 4) after behavior verification (step 3).

**New step 4 content** (stated once, four ¶ mirroring `code-reviewer.md:37-45`):

- **Bridge ¶** (mirrors `:39`): "This step runs only after the step-2 review checks and the step-3 accuracy spot-check, so judgment-based checks always precede the guardrail selection." This pins "which judgment checks" = **both** the review pass and the accuracy spot-check. (This is the one doc-specific deviation from the code-reviewer template, which names "step-3 behavior verification.")
- **Run ¶** (mirrors `:41`): run every gate of the selection (the guardrails that name `doc-reviewer` or name no agents), exactly as each command is written; record each in the Checks table; no bypass.
- **Fail-fast ¶** (mirrors `:43`): once at least one rejection finding exists, may reject without running not-yet-run gates, recording each as **skipped**; may also run gates while rejecting.
- **Approval/stateless ¶** (mirrors `:45`): approve only when every gate in the selection has run and passed this iteration; no unrun/skipped gate on an approving iteration; fresh and stateless, no cross-iteration caching.

Selection phrase is agent-name ("name `doc-reviewer` or name no agents"), never "leveled reviewer" — doc-reviewer has no level.

**Checks-table contract.** The bare Checks template gains the same comment block as `code-reviewer.md:71-77`, unchanged (it is generic over "the reviewer's selection"): one row per selection gate; Result ∈ {pass, fail, skipped}; a skipped row shows the literal command unrun; a forgotten gate is an absent row, a deliberately skipped gate is a present skipped row, a run gate is a present pass/fail row (the absent-vs-skipped distinction R7/R10 demand). The **Accuracy spot-check** review-template section stays — it is doc-reviewer's analogue of code-reviewer's Behavior-verification section and is unaffected (R7 promotes guardrails out, it does not touch the spot-check).

**Guidelines reconciliation** — mirror the three-bullet code-reviewer shape (`:110` / `:111-114` / `:115`):

- Rewrite the "Run the docs-phase guardrails" bullet (`:98`) to the back-reference form: run every gate in the selection per step 4, including its fail-fast permission and approval guarantee; **keep doc-reviewer's distinctive empty-selection note** — "if your selection is empty, the accuracy spot-check is your only evidence — produce it; that is not a blocker and warrants no warning" (the docs analogue of code-reviewer's bare "run none and proceed").
- Add a standalone two-question outcome-model bullet (mirrors `:111-114`) with the three sub-bullets re-keyed to "the reviewer's selection": empty selection → accuracy spot-check carries it, not a blocker; a declared selection gate that cannot execute → blocker (drift guard; fires only on an attempted gate, so fail-fast cannot manufacture a false drift blocker); a gate that runs and exits non-zero → normal rejection finding.
- Rewrite the blocker bullet (`:99`) to mirror `:115`: normal findings (incl. a selection gate that runs and exits non-zero) go in a rejection verdict; reserve blockers for broken inputs, incl. a declared selection gate that cannot execute. Drop the now-redundant inline two-question text (moved to the new bullet).

**doc-writer** keeps writer behavior; its selection re-keys from "the docs-phase guardrails" (`doc-writer.md:38-48`) to the agent-name selection ("name `doc-writer` or name no agents"), labeled the writer archetype, with the all-pass-before-commit obligations preserved in form.

### Round 3 — setup capture + example table (decision 4, R8)

Base-run setup.md: "Capture per gate" has four bullets (`:181-184`): name, command, phase(s) `:183`, optional level asked-only-for-code `:184`. Example table `:188-192` is `Name | Command | Phase | Level` with three rows.

**Capture-bullet reshape.** The phase bullet (`:183`) and level bullet (`:184`) **both collapse into a single optional-agents bullet** (4 → 3 bullets):

- A **name** (e.g. `tests`, `lint`).
- The **exact literal command** to run (e.g. `npm test`).
- The optional **agents** that run the gate — one or more gate-running agent names (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`). When unset, the gate runs for **every** gate-running agent, doc agents included — so name the agents of any code-specific or expensive gate deliberately. Naming only `code-reviewer`, for example, runs an expensive suite on the reviewer's side instead of on every writer commit.

Notes:
- The agents question is asked for **every** gate. The base run's "asked only for gates whose phase(s) include `code`" conditional is **dropped outright**, not relocated — it conditioned on `phase includes code`, and phase is deleted, so there is nothing left to hang it on. The design doc should state this as a deliberate drop (the setup-side mirror of R4's "a bare gate now also runs in docs").
- The bullet carries the **surfaced default** ("unset = every gate-running agent, doc agents included") — R8's new owner-facing guidance. The old `phase: code` tag gave code-only scoping for free; with phase gone, a bare gate leaks into the doc agents, so setup steers the owner to name agents on code-specific gates. The "doc agents included" clause is the load-bearing warning.
- The bullet carries the **re-anchored decision criterion** ("name only `code-reviewer` … instead of on every writer commit") — the successor to the base run's "leveling an expensive suite `reviewer`" clause, re-expressed in agent names.

**Example table** reshapes to `Name | Command | Agents` (net −1 column). Three rows:

| Name      | Command       | Agents          |
| --------- | ------------- | --------------- |
| typecheck | `check-types` | `code-writer`   |
| tests     | `run-tests`   | `code-reviewer` |
| lint      | `run-lint`    |                 |

- **typecheck → `code-writer`**: a single-agent, writer-only gate (successor to the old `level: writer` row). Demonstrates naming one agent.
- **tests → `code-reviewer`**: a single-agent, reviewer-only gate (successor to `level: reviewer` — expensive suite on the reviewer's side). Demonstrates the decision criterion in action.
- **lint → blank Agents**: the all-agents-default anchor (successor to the old `phase: both`, blank-level row). Its meaning genuinely *changes* — blank now means **all four agents, doc agents included** — but lint over markdown/docs is a defensible all-agents example, so it anchors "blank = all gate-running agents" without feeling wrong.

**Decision on the table tradeoff.** Taking the three-row shape above, **not** a multi-name variant (e.g. `lint | run-lint | code-writer, code-reviewer`). The "one or more names" bullet plus the column header already establish multiplicity; a blank-Agents anchor row is worth more than an explicit multi-name demo, and three rows keep the example minimal (matching the base table's two-named-plus-one-blank structure). The table is illustrative, not a mandated block or parser input — that framing line is preserved.

**Unchanged in setup.md** (confirmed): the validation block (`:196-213`, the three-outcome "did it execute?" model — agent/level/phase-agnostic, keyed only on command execution; R8 says the command-execution validation flow is untouched); the "'None' is a complete, valid answer" line (`:194` — about the whole declaration being absent, orthogonal to the per-gate agents field); the "recommended shape, illustrative not mandated" framing of the table (`:186`).

## Resolved decisions (analyst's decisions)

Research is complete. The decisions below resolve the four open design questions; the design-doc-writer should synthesize design-doc.md from them, against the base-run worktree state.

1. **Archetype placement (R6).** load.md's Guardrails section gains a new **¶4** stating the two run-behavior archetypes (writer-type: every selected gate passes before each commit; reviewer-type: judgment checks first, fail-fast with skipped recording, approving-iteration guarantee, stateless) and the mapping rule (commits work ⇒ writer-type; reviews it ⇒ reviewer-type). Chosen over keeping run-behavior distributed because no other file names the four gate-running agents as a behavioral set, so R6's "one place" has no other home. The agent files carry the concrete realization labeled by archetype. ¶4 carries the rule only, not the execution mechanics, and no forward pointer. The design doc must defend the small altitude rise as the selection-rule precedent extended.

2. **load.md rewording (R1/R2/R3/R4/R5).** Four ¶: ¶1 definition (agents field + a guardrail naming no agents runs for every gate-running agent); ¶2 absent-declaration-is-valid (unchanged, scoped distinctly from ¶1 by the noun "declaration"); ¶3 selection rule (explicit four-agent enumeration, name-membership selection, empty-selection rule, inert forward declaration for out-of-set names); ¶4 archetypes (decision 1). Phase/level vocabulary deleted throughout, including the loader-table row's phase phrasing. Committed-only line untouched.

3. **doc-reviewer restructure (R7) + doc-writer re-key.** doc-reviewer is freshly restructured to a 6-step sequence (gather → review → accuracy spot-check → NEW guardrail step 4 → write review 5 → commit/report 6), templated on the base run's code-reviewer.md, with guardrails after both judgment checks, the four-¶ guardrail step, the cloned Checks comment block, the retained accuracy spot-check section, and the three-bullet Guidelines reconciliation (keeping the doc-specific "accuracy spot-check is your only evidence" empty-selection note). doc-writer keeps writer behavior with its selection re-keyed from "the docs-phase guardrails" to agent-name selection, labeled the writer archetype. code-writer and code-reviewer keep their behavior with selections re-keyed from level to agent name.

4. **setup capture + example table (R8).** "Capture per gate" goes from four bullets to three: name, exact command, optional agents. The agents bullet is asked for every gate (the "code-applicable only" conditional dropped outright as a deliberate consequence of deleting phase), carries the surfaced "unset = every gate-running agent, doc agents included" default, and the re-anchored "name only `code-reviewer`" criterion. The example table reshapes to `Name | Command | Agents` with three rows: typecheck→`code-writer`, tests→`code-reviewer`, lint→blank (the all-agents anchor); the three-row shape is chosen over a multi-name variant. Validation block, the "None is valid" line, and the illustrative-not-mandated framing are untouched.

5. **Out of scope (carried from spec).** The exact `.rp.md` serialization of the agents field (illustrated, not mandated). Migration of existing `.rp.md` files (none declare guardrails). Cross-iteration gate-result caching. Assisted mode (no guardrail surface; assisted runs end at phase 3). README prose (`README.md:147`, phase-altitude — a docs-phase touchpoint named for the doc-plan). `CHANGELOG.md` history (immutable). The `.changeset/role-scoped-guardrails.md` reword is a docs-phase obligation (R9) named by the spec, not a design-phase deliverable.
