# Design Doc — Agent-scoped guardrails

_Pipeline: `121-role-scoped-guardrails`, review run `review-1-agent-scoped-guardrails`. Inputs: the approved, binding `1-spec/spec.md` and the committed `2-design-doc/design-doc-research.md`. This is a **review run** reworking a completed base run; the base run's design at `../base/2-design-doc/design-doc.md` is a structural reference, not an input to honor. This document is the standalone design the plan and code phases build against._

## 1. Summary

The base run gave a guardrail two scoping dimensions: a **phase** (`code`/`docs`) and, within the code phase, an optional **level** (`writer`/`reviewer`). The two together decide which of the four gate-running agents — `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` — runs a gate. Phase splits code from docs; level splits the two code roles. The model is closed to exactly these four agents: it cannot express a gate scoped to, say, a future dedicated end-to-end-test agent, because there is no dimension that names an agent directly.

This change replaces **both** dimensions with a single **agents** dimension: a guardrail names the gate-running agents that run it. `phase` and `level` are deleted outright, with no compatibility sugar for either. Any gate-running agent — current or future, code or docs — gets its own gate selection by name. A gate naming no agents runs for every gate-running agent; a gate naming only agents not present in a run is inert until such an agent exists.

This is a **more flexible successor** to the phase+level model, not an additive field. Deleting phase has one real behavior consequence the base never had: a bare (unnamed) gate now also runs in the docs phase, because phase no longer bounds it to the code roles. That consequence is mitigated by setup guidance (name the agents of code-specific or expensive gates), not by a phase boundary.

The change is **prose and instruction text only** — no executable code, no module, no parser. Guardrails remain prose the agents read, exactly like every other `.rp.md` entry. The agents field is captured in prose with one illustrative example and no mandated syntax (matching how `name` and `command` are already handled). The "design" is the exact shape and wording of the prose to add or rewrite across **six** files — the two convention files and all four agent files, including both doc agents, which can no longer be identified by phase and must instead be named.

The agents field is **optional by definition**: "names no agents = every gate-running agent" is a load rule, so every existing `.rp.md` keeps working with no migration (and this repo's own `.rp.md` declares no guardrails at all).

## 2. Scope surface

The design touches **exactly six files** (spec AC13), and nothing else. This deliberately reverses the base run's docs-agent confinement: the base touched four files and left the two doc agents untouched because docs selection stayed purely phase-based. With phase deleted, the doc agents can no longer be identified by phase and must name themselves, so they enter scope.

| # | File | What changes |
| - | ---- | ------------ |
| 1 | `skills/radical-pipelines/reference/conventions/load.md` | Guardrails section: ¶1 agents-field definition, ¶3 name-membership selection rule, new ¶4 behavior archetypes; loader-table row loses its phase phrasing |
| 2 | `skills/radical-pipelines/reference/conventions/setup.md` | "Capture per gate" level bullet → optional **agents** bullet (asked every gate); example table reshaped to `Name \| Command \| Agents` |
| 3 | `agents/code-writer.md` | Selection re-keyed from level to agent name; writer obligations unchanged in form |
| 4 | `agents/code-reviewer.md` | Selection re-keyed from level to agent name; reviewer structure unchanged in form |
| 5 | `agents/doc-writer.md` | Selection re-keyed from "the docs-phase guardrails" to agent name; writer obligations unchanged in form |
| 6 | `agents/doc-reviewer.md` | **Fresh restructure** to the reviewer archetype, templated on the base run's `code-reviewer.md` |

Out-of-scope touchpoints (deferred to the docs phase or excluded entirely) are enumerated in §8.

## 3. Grounded file state (verified against the live tree)

The design rests on the current shape of the six files in this worktree, on branch `worktree-121-role-scoped-guardrails`. That branch **carries the base-run changes** (the base run, PR #124, is open and unmerged; `trunk` does not contain it), so the worktree files are the base-run state — the correct baseline for this review. `git diff --stat trunk...HEAD` confirms the base run touched five non-`.pipelines` files (`code-reviewer.md`, `code-writer.md`, `load.md`, `setup.md`, and `.rp.md`) plus the changeset. Of those, `.rp.md` is out of the six in-scope files — it declares no guardrails and is left untouched (§6, Out-of-Scope #2); the base run reshaped it only as an example, and this review does not. Note the layout: conventions live under `skills/radical-pipelines/reference/conventions/`, but the agent files live at the repo root under `agents/`.

### 3.1 `load.md` — base-run state

`## Guardrails` (`load.md:24-30`) is three paragraphs, carrying the base run's level vocabulary:

- **¶1 definition** (`:26`): the exact-command / exit-code definition, then "The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both. A guardrail may also carry an optional level — `writer` or `reviewer` — naming which code-phase role runs it; a guardrail with no level applies to both roles."
- **¶2 absent-is-valid** (`:28`, unchanged by base): "An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning."
- **¶3 selection rule** (`:30`): "To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase. Within the code phase, apply a second filter: the writer selects gates leveled `writer` or unscoped; the reviewer selects gates leveled `reviewer` or unscoped. The docs-phase selection never consults level; a both-phase gate carrying a level still runs for both doc agents. An empty selection after these filters means run none and proceed."

The loader-table row (`:22`) describes guardrails generically but names phase: "… the code/doc phases must pass." The committed-only line is in `## Local overrides` (`:46`): "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."

### 3.2 `setup.md` — base-run state

`### Guardrails` (`setup.md:171-203`) motivates the gates, then captures per gate in a "Capture per gate" bullet list (`:181-184`): a **name**, the **exact literal command**, the applicable **phase(s)**, and the base run's optional **level** (`:184`, "ask this only for gates whose phase(s) include `code`; when unset, the gate applies to both roles. Leveling an expensive suite `reviewer` …"). An illustrative `Name | Command | Phase | Level` table follows (`:186-192`, framed "illustrative, not a mandated block or parser input") with three rows: `typecheck | check-types | code | writer`, `tests | run-tests | code | reviewer`, `lint | run-lint | both |` (blank level). "None" is a complete, valid answer (`:194`). The validation block (`:196-213`) is command-execution-only ("did the command execute?") and is level/phase/agent-agnostic.

### 3.3 `code-writer.md` — base-run state

The base run already keyed this file to **level**, not phase. Guardrail touchpoints (verified against `git show HEAD:agents/code-writer.md`): step 1.2 read (`:13`, "Read the code-phase guardrails **leveled `writer` or unscoped** — the gates you must run before completing."); the step-3 "not a guardrail" disclaimer (`:36`, "separate from running the guardrails in step 5"); step 5 already titled "Run the **writer guardrail selection**" (`:44-55`); the Guidelines blocker bullet (`:73`, "a gate in the writer's selection cannot execute"). Step 5 carries the writer obligations ("run **every** gate in the writer guardrail selection, exactly as its command is written … must pass before you commit, no bypass") plus the two-question outcome model (`:51-54`: empty ⇒ run none; declared-but-unrunnable ⇒ blocker; runs-and-exits-non-zero ⇒ work). The vocabulary already speaks of "the writer guardrail selection" / "the writer's selection" (`:46`, `:48`, `:52`, `:53`, `:73`); what survives from the phase era is only the **`code-phase … leveled `writer` or unscoped`** phrasing that names the selection at `:13` and inside step 5. That phrasing — not a non-existent "code-phase" tag — is what D3 re-keys to agent name.

### 3.4 `code-reviewer.md` — base-run state (the doc-reviewer template)

A fresh `code-reviewer` is spawned **once per batch** (`:8`); each instance is fresh and stateless. The base run **fully restructured** this file into the dedicated-step reviewer shape, verified against `git show HEAD:agents/code-reviewer.md`:

- Step 1 (gather context) carries a guardrail-read item (`:18`, "Read the code-phase guardrails **leveled `reviewer` or unscoped** — the gates you must run during review.").
- Step 2 (review the changes) is judgment bullets only — its last bullet is `:32` "**Convention compliance** — host project's coding, testing, build, and commit conventions." There is **no** guardrail bullet in step 2.
- Step 3 is behavior verification (`:33-35`).
- Step 4 is a **dedicated numbered step**, `### 4. Run the reviewer guardrail selection` (`:37-45`), with all four ¶: the bridge ¶ (`:39`, "after the step-2 review checks and the step-3 behavior verification"), the run ¶ (`:41`, naming "the code-phase guardrails leveled `reviewer` or unscoped"), the fail-fast/skipped ¶ (`:43`), and the approval/stateless ¶ (`:45`).
- The `## Checks` template is `Check | Command | Result` with its comment block — one row per selection gate, Result ∈ {`pass`, `fail`, `skipped`}, absent-vs-skipped distinction — at `:71-77`.
- The Guidelines carry the "Run the guardrails." bullet (`:110`, naming "the code-phase guardrails leveled `reviewer` or unscoped"), the two-question outcome-model bullet with its sub-bullets (`:111-114`), and the blocker bullet (`:115`).

This realized file **already matches** the R7 target reviewer structure (dedicated step after the judgment checks, fail-fast, skipped, approving-iteration, stateless, `pass`/`fail`/`skipped` vocab) — which is precisely why it is a clean template for the doc-reviewer restructure (§5, D5). What survives from the phase era is only the **`code-phase guardrails leveled `reviewer` or unscoped`** phrasing naming the selection at `:18`, `:41`, and `:110`; that phrasing — not a non-existent "code-phase tag" or step-2 bullet — is what D4 re-keys to agent name.

### 3.5 `doc-writer.md` — pre-base (trunk) state

Byte-identical to trunk. Guardrail touchpoints: step 3 accuracy verification mentions a docs-phase doc-test guardrail (`:35`); step 4 "Run the docs-phase guardrails" (`:38-48`) carries the writer obligations and the two-question outcome model, all keyed to **phase** ("docs-phase guardrails … tagged for documentation"); the Guidelines blocker bullet (`:67`) names "a declared docs-phase guardrail." The empty-selection sub-case (`:45`) is doc-specific: "the step-3 accuracy verification is your only validation; proceed."

### 3.6 `doc-reviewer.md` — pre-base (trunk) state

Byte-identical to trunk — never restructured by the base run. It is in its **original pre-base shape**, structurally unlike the restructured `code-reviewer.md`. A fresh `doc-reviewer` is spawned **once per batch** (`:8`). Its 5-step sequence: 1 gather context (`:12-21`, six read items, no guardrail-read item) → 2 review the changes (`:23-33`, eight judgment bullets, the last being the guardrail bullet `:33` "Docs-phase guardrails — run every guardrail applicable to the docs phase …") → 3 accuracy spot-check (`:35-37`) → 4 write the review (`:39-81`, with a `Check | Command | Result` Checks template `:62-64` and an Accuracy spot-check section `:67-69`) → 5 commit and report (`:83-87`). Guidelines (`:89-99`) carry "Run the docs-phase guardrails if any exist." (`:98`) and a blocker bullet (`:99`) with the two-question outcome model inline. There is **no** fail-fast, no skipped Result value, no approving-iteration guarantee, no stateless line — these are what the restructure introduces.

## 4. The model the prose must encode

Every wording decision serves one model. The six files must stay consistent because they share these definitions.

### 4.1 One dimension: the agents that run a gate

A guardrail carries one optional field: the **agents** that run it — one or more exact gate-running-agent names. `phase` and `level` no longer exist. The field is part of the committed guardrail declaration; it inherits the committed-only rule for free (never from `.rp.local.md`), so it is never overridable per-developer. The exact `.rp.md` serialization is illustrated, not mandated (§8).

### 4.2 The gate-running agent set is enumerated explicitly

The gate-running agents are `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`. No existing roster abstraction names exactly this set — the README's agent inventory lists all 17 agents in spawn order without grouping these four, and the phase runbooks name writer+reviewer only pairwise per phase. So `load.md` ¶3 **enumerates the set directly**. The enumeration is load-bearing: adding a future gate-running agent updates it.

### 4.3 Selection is agent-name membership — one filter, not two

An agent's guardrail selection is **the gates that name it, plus the gates that name no agents**. There is no phase filter and no level filter — one membership test replaces the base run's phase-then-level sequence.

- A gate **naming no agents** is selected by every gate-running agent — doc agents included. This is the base's behavior change: with phase gone, a bare gate that the base would have bounded to the code roles now also runs in docs. (Mitigation is setup guidance, §4.6, not a phase boundary.)
- A gate **naming only agents outside the gate-running set** (e.g. a not-yet-existing end-to-end-test agent) is selected by no current agent and is **inert** until such an agent exists. This is a legitimate forward declaration, not malformed input: the silent no-match falls out of the membership test alone, with no error, blocker, or warning.
- An **empty selection** after this filter means run none and proceed — the existing empty-selection rule, never a blocker, never a warning.

Each gate-running agent self-reads `.rp.md` and knows its own canonical name, so self-selection needs no new plumbing.

### 4.4 Two behavior archetypes, stated once

Gate-running agents fall into two run-behaviors, and a single rule maps any agent — current or future — to one of them by **whether it commits work or reviews it**.

- A **writer-type** agent produces commits: it runs every gate in its selection, exactly as each command is written, and all must pass before each commit. (`code-writer`, `doc-writer`.)
- A **reviewer-type** agent issues verdicts: it runs its judgment-based checks first, **may** fail-fast (reject without running the not-yet-run gates of its selection, recording each as **skipped**), and approves only when every gate in its selection has run and passed **in that same iteration**. Each reviewer instance is fresh and stateless — no cross-iteration caching or memory. (`code-reviewer`, `doc-reviewer`.)

This rule lives in **one place** — `load.md` ¶4 (D1). Each agent file carries the *concrete realization* of its archetype, now labeled by archetype rather than re-derived. ¶4 states the rule only; it does not carry the Checks-table vocabulary, the absent-vs-skipped distinction, or step-ordering mechanics — those are the agent files' job.

### 4.5 Fail-fast and the approval guarantee are two halves of one rule

A reviewer-type agent runs its judgment-based checks **before** its guardrail selection. Once it has at least one rejection finding, it **may** reject without running any not-yet-run gate of its selection — recording each deliberately skipped gate as **skipped**. "May," never "must": fail-fast is a permission; the reviewer can still run gates while rejecting. The other half: the reviewer **approves only** when every gate in its selection has run and passed in that same iteration. The guarantee is per-iteration; each reviewer instance is fresh and stateless, with no cross-iteration caching. Net effect when all goes well: the selection's expensive gates execute exactly once, on the approving iteration.

The fail-fast scope is uniform over the whole selection — the guarantee that nothing is approved without all selection gates passing is what matters, and a uniform rule avoids special-casing.

### 4.6 The deleted phase, the bare-gate leak, and the setup mitigation

Under the base model, a level-less code gate was bounded to the two code roles by its `phase: code` tag. With phase deleted, that same bare gate now runs for **every** gate-running agent, doc agents included. This is the one genuine behavior change of the review (R4). The mitigation is not a phase boundary but **setup guidance** (R8): a gate meant for the code roles only must name `code-writer` and `code-reviewer` explicitly, and setup surfaces the "unset = every gate-running agent, doc agents included" default so the owner names code-specific or expensive gates deliberately.

## 5. Design decisions

Five decisions (D1–D5), carried from the research record's analyst decisions and grounded against the verified file state in §3. Each cites the acceptance criteria it satisfies.

### D1 — `load.md` owns the complete agents rule and the archetype mapping

_Satisfies AC1, AC2, AC3, AC4, AC5, AC6._

`load.md` is the single place the agents vocabulary, the name-membership selection, and the two behavior archetypes are defined, so the agent files name only their own selection and archetype without re-deriving either. The Guardrails section reshapes from three ¶ to four.

**¶1 Definition** (rewrite of `:26`). Drop the phase-target sentence and the base run's level sentence. Keep the exact-command / exit-code definition (`npm test`, not "run the tests"). Add the agents field: a guardrail may name the agents that run it; **a guardrail that names no agents runs for every gate-running agent.** This is the authoritative absent-means-all rule, stated as a definition/load fact decoupled from serialization, so "no Guardrails section," "no Agents column," and "blank Agents cell" all resolve to all-agents uniformly (AC4).

**¶2 Absent-is-valid** (`:28`, unchanged). "An absent or empty Guardrails declaration means no command gates …". This is **distinct** from ¶1 and must not be conflated with it: ¶1 speaks of *a guardrail that names no agents* (a field within a declared gate → that gate runs for all agents); ¶2 speaks of *an absent or empty Guardrails declaration* (no gates declared at all → nothing runs). The nouns ("a guardrail" vs "a Guardrails declaration") carry the scope distinction; no extra disambiguating sentence is added. Both ¶ stay — they answer different questions.

**¶3 Selection rule** (rewrite of `:30`). Replace the phase-then-level filter entirely. Enumerate the gate-running agents — `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` (AC2, load-bearing: adding a future gate-running agent updates this list). Each agent selects the guardrails that name it plus the guardrails that name no agents (AC3); an empty selection means run none and proceed; a guardrail naming only agents outside this set is selected by none and is inert until such an agent exists (AC5, no error/blocker/warning). Phase plays no part.

**¶4 Behavior archetypes** (NEW — the R6 home). State the two archetypes and the mapping rule per §4.4: writer-type runs every selected gate, all passing before each commit; reviewer-type runs judgment checks first, may fail-fast with skipped recording, approves only with every selection gate passed that iteration, fresh and stateless; an agent is writer-type if it commits work and reviewer-type if it reviews it. ¶4 carries the rule only — not the Checks-table vocabulary, the absent-vs-skipped distinction, or step-ordering mechanics — and **no forward pointer** to the agent files (the archetype label is the reference contract; a cross-reference would be the kind the minimalism rule discourages).

**Loader-table row** (`:22`). Re-word to drop the "code/doc phases must pass" phrase that names phase, keeping the generic "deterministic verification gates" description.

**Committed-only line** (`:46`) untouched — it scopes the whole declaration, so the agents field inherits committed-only for free (AC1).

**Altitude note.** ¶4 raises `load.md`'s altitude a small step — from "what an agent loads" toward "what an agent does with what it loaded." This is defensible as the **selection-rule precedent extended**: ¶3 already tells an agent how to compute its own working set (one step past pure loading), and ¶4 adds only a one-sentence-per-archetype *classification + mapping* fact, not the full execution prose. The design names the tension rather than pretending `load.md` stays a pure loader; the alternative (keeping run-behavior distributed with no single mapping rule) fails R6's "one place" requirement, and no other file groups the four gate-running agents as a behavioral set.

### D2 — `setup.md` captures the agents field as one bullet plus the reshaped example

_Satisfies AC11._

**Capture-bullet reshape.** The base run's phase bullet (`:183`) and level bullet (`:184`) **both collapse into a single optional-agents bullet** (the "Capture per gate" list goes 4 → 3 bullets):

- A **name** (e.g. `tests`, `lint`) — unchanged.
- The **exact literal command** to run (e.g. `npm test`) — unchanged.
- The optional **agents** that run the gate — one or more gate-running-agent names (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`). When unset, the gate runs for **every** gate-running agent, doc agents included — so name the agents of any code-specific or expensive gate deliberately. Naming only `code-reviewer`, for example, runs an expensive suite on the reviewer's side instead of on every writer commit.

The agents question is asked for **every** gate. The base run's "asked only for gates whose phase(s) include `code`" conditional is **dropped outright** (not relocated): it conditioned on `phase includes code`, and phase is deleted, so there is nothing left to hang it on. This is the setup-side mirror of R4's bare-gate-runs-in-docs change. The bullet carries the **surfaced default** ("unset = every gate-running agent, doc agents included" — the load-bearing warning) and the **re-anchored decision criterion** ("name only `code-reviewer` … instead of on every writer commit"), the successor to the base run's "leveling an expensive suite `reviewer`" clause re-expressed in agent names.

**Example table** reshaped to `Name | Command | Agents` (net −1 column), keeping the "illustrative, not a mandated block or parser input" framing. Three rows:

| Name      | Command       | Agents          |
| --------- | ------------- | --------------- |
| typecheck | `check-types` | `code-writer`   |
| tests     | `run-tests`   | `code-reviewer` |
| lint      | `run-lint`    |                 |

- **typecheck → `code-writer`**: a single-agent, writer-only gate (successor to the old `level: writer` row). Demonstrates naming one agent.
- **tests → `code-reviewer`**: a single-agent, reviewer-only gate (successor to `level: reviewer`). Demonstrates the decision criterion in action.
- **lint → blank**: the all-agents-default anchor (successor to the old `phase: both`, blank-level row). Its meaning *changes* — blank now means **all four agents, doc agents included** — but lint over markdown/docs is a defensible all-agents example. Chosen over a multi-name variant (e.g. `lint | run-lint | code-writer, code-reviewer`): the "one or more names" bullet and the column header already establish multiplicity, and a blank-Agents anchor row is worth more than an explicit multi-name demo while keeping the table minimal.

**Untouched in setup.md:** the validation block (`:196-213`, the three-outcome "did it execute?" model — agent-agnostic, keyed only on command execution; R8 leaves the command-execution validation flow untouched); the "'None' is a complete, valid answer" line (`:194`, about the whole declaration being absent, orthogonal to the per-gate agents field); the illustrative-not-mandated framing.

### D3 — `code-writer.md` re-keys its selection to agent name (writer archetype)

_Satisfies AC7._

The writer's obligations and step structure are **unchanged in form**; the base run already titled step 5 "Run the writer guardrail selection" and already speaks of "the writer's selection." Only the **selection-defining clause** re-keys: from `code-phase guardrails leveled `writer` or unscoped` to "the gates that name `code-writer` or name no agents." The step title is untouched.

1. **Step 1.2 read (`:13`)** — replace `Read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing.` with "Read the guardrails that name `code-writer` or name no agents — the gates you must run before completing."
2. **Step 5 (`:44-55`)** — the title "Run the writer guardrail selection" (`:44`) and the "writer guardrail selection" / "writer's selection" wording (`:46`, `:48`, `:52`, `:53`) already hold and are **unchanged**. The obligations survive verbatim in form ("run **every** gate, exactly as its command is written, all must pass before you commit, no bypass"), now labeled the writer archetype. The only edits inside the step define the selection where it is still phrased by level: drop the `code-phase … leveled `writer` or unscoped` phrasing in favor of "the gates that name `code-writer` or name no agents." The empty-selection (`:52`), drift-guard (`:53`), and exit-non-zero (`:54`) sub-cases are substantively unchanged.
3. **Guidelines blocker bullet (`:73`)** — re-word "a gate in the writer's selection cannot execute" to keep the agent-name framing consistent ("a gate of your selection that cannot execute"); substance identical (a gate naming only other agents is never in the writer's selection, so the drift guard can only fire on a selection gate).

### D4 — `code-reviewer.md` re-keys its selection to agent name (reviewer archetype)

_Satisfies AC8._

The reviewer's behavior and structure are **unchanged in form**. The base run already gave this file the full reviewer shape (guardrail-read in step 1, the dedicated step 4 after the judgment checks, fail-fast permission, skipped recording, approving-iteration guarantee, stateless line, the `pass`/`fail`/`skipped` Checks vocabulary with absent-vs-skipped — §3.4). This review is a **vocabulary re-key only**: every occurrence of the `code-phase guardrails leveled `reviewer` or unscoped` phrasing that names the selection re-keys to "the gates that name `code-reviewer` or name no agents," labeled the reviewer archetype. The three occurrences:

1. **Step 1 read (`:18`)**: "Read the code-phase guardrails leveled `reviewer` or unscoped — the gates you must run during review." → "Read the guardrails that name `code-reviewer` or name no agents — the gates you must run during review."
2. **Step 4 run ¶ (`:41`)**: "Run every gate of the reviewer's selection (the code-phase guardrails leveled `reviewer` or unscoped) …" → name the selection "(the gates that name `code-reviewer` or name no agents)." The bridge ¶ (`:39`), fail-fast/skipped ¶ (`:43`), and approval/stateless ¶ (`:45`) carry no level phrasing and stand as written.
3. **Guidelines "Run the guardrails." bullet (`:110`)**: re-word the parenthetical "(the code-phase guardrails leveled `reviewer` or unscoped)" to "(the gates that name `code-reviewer` or name no agents)." The two-question outcome-model bullet (`:111-114`) and blocker bullet (`:115`) speak of "the reviewer's selection" already and stand as written.

No structural change — the dedicated step 4, Checks template, and Guidelines shape are the base run's, preserved in form.

### D5 — `doc-writer.md` re-keys, and `doc-reviewer.md` is freshly restructured

_Satisfies AC9, AC10._

**`doc-writer.md` (re-key, writer archetype).** Mirror D3, adapted for docs. The selection re-keys from "the docs-phase guardrails … tagged for documentation" to "the gates that name `doc-writer` or name no agents," labeled the writer archetype, with the all-pass-before-commit obligations preserved in form:

1. **Step 3 accuracy verification (`:35`)**: the "If a docs-phase guardrail covers doc tests" clause re-words to "If a guardrail in your selection covers doc tests."
2. **Step 4 (`:38-48`)** retitled "Run the writer guardrail selection"; the obligations and two-question outcome model re-word "docs-phase guardrail(s)" to the agent-name selection. The doc-specific empty-selection sub-case (`:45`, "the step-3 accuracy verification is your only validation; proceed") is kept, re-keyed to the selection.
3. **Guidelines blocker bullet (`:67`)**: "a declared docs-phase guardrail" → "a gate of your selection," mirroring D3.

**`doc-reviewer.md` (fresh restructure, reviewer archetype, R7).** This file is in its pre-base 5-step shape and must be **freshly restructured** to the reviewer archetype, templated on the base run's already-restructured `code-reviewer.md` (§3.4) and adapted for the docs vocabulary. The restructure brings doc-reviewer to the same shape code-reviewer already has: promote guardrails out of the mid-review judgment bullet (`:33`) into their own dedicated step after the judgment checks — the exact parallel of code-reviewer's step 4 (`:37-45`) — with fail-fast permission, skipped recording, the approving-iteration guarantee, a stateless line, and the `pass`/`fail`/`skipped` Checks vocabulary including the absent-vs-skipped distinction.

**New 6-step sequence** (from the current 5):

1. **Gather context** — gains a guardrail-read item (parallel to `code-reviewer.md:18`): "Read the guardrails that name `doc-reviewer` or name no agents — the gates you must run during review," slotted after reading the doc convention and before inspecting the diff.
2. **Review the changes** — the guardrail bullet (`:33`) is **removed**; the other seven judgment bullets stay.
3. **Accuracy spot-check** — unchanged in content.
4. **Run the reviewer guardrail selection** (NEW) — placed after **both** judgment checks (the step-2 review pass and the step-3 accuracy spot-check), the exact parallel to code-reviewer placing guardrails after behavior verification.
5. **Write the review** (was 4) — internal references update (the step-number reference in commit/report points at step 5).
6. **Commit and report** (was 5) — "Commit the file you wrote in step 5."

**New step 4 content** (stated once, four ¶ mirroring `code-reviewer`'s reviewer realization):

- **Bridge ¶**: "This step runs only after the step-2 review checks and the step-3 accuracy spot-check, so judgment-based checks always precede the guardrail selection." This pins "which judgment checks" = **both** the review pass and the accuracy spot-check (the one doc-specific deviation from the code-reviewer template, which names behavior verification).
- **Run ¶**: run every gate of the selection (the guardrails that name `doc-reviewer` or name no agents), exactly as each command is written; record each in the Checks table; no bypass.
- **Fail-fast ¶**: once at least one rejection finding exists, may reject without running not-yet-run gates, recording each as **skipped**; may also run gates while rejecting.
- **Approval/stateless ¶**: approve only when every gate in the selection has run and passed this iteration; no unrun/skipped gate on an approving iteration; fresh and stateless, no cross-iteration caching.

**Checks-table contract.** The bare `Check | Command | Result` template gains a comment block documenting: one row per selection gate; Result ∈ {`pass`, `fail`, `skipped`}; a skipped row shows the literal command unrun; a forgotten gate is an **absent** row, a deliberately skipped gate is a **present** `skipped` row, a run gate is a present `pass`/`fail` row (the absent-vs-skipped distinction AC10 demands). The **Accuracy spot-check** review-template section stays — it is doc-reviewer's analogue of code-reviewer's Behavior-verification section and is unaffected (R7 promotes guardrails out; it does not touch the spot-check).

**Guidelines reconciliation** (three-bullet shape mirroring the base `code-reviewer`):

- Rewrite the "Run the docs-phase guardrails if any exist" bullet (`:98`) to the back-reference form: run every gate in the selection per step 4, including its fail-fast permission and approval guarantee; **keep doc-reviewer's distinctive empty-selection note** — "if your selection is empty, the accuracy spot-check is your only evidence — produce it; that is not a blocker and warrants no warning."
- Add a standalone two-question outcome-model bullet with three sub-bullets re-keyed to the reviewer's selection: empty selection → accuracy spot-check carries it, not a blocker; a declared selection gate that cannot execute → blocker (drift guard, fires only on an attempted gate, so fail-fast cannot manufacture a false drift blocker); a gate that runs and exits non-zero → normal rejection finding.
- Rewrite the blocker bullet (`:99`) so normal findings (incl. a selection gate that runs and exits non-zero) go in a rejection verdict and blockers are reserved for broken inputs (incl. a declared selection gate that cannot execute), dropping the now-redundant inline two-question text moved to the new bullet.

The selection phrase is always agent-name ("name `doc-reviewer` or name no agents"), never "leveled reviewer" — doc-reviewer has no level.

## 6. Confinement to six files (the AC13 guarantee)

Each non-edit is justified, not merely asserted. The six edited files are in §2; everything below stays untouched.

| Untouched | Why it stays correct |
| --------- | -------------------- |
| `reference/autonomous-phases/4 - code.md`, `5 - docs.md`, `autonomous-workflow.md` | Guardrails are never in a launch payload — each gate-running agent self-reads `.rp.md`. The orchestrator passes a closed list (artifact folder, commit format); the loop is unaffected. The phase runbooks name writer+reviewer pairwise per phase, never as a behavioral set, so they need no archetype prose. |
| Per-phase completion predicate | Checks file existence + committed, never content; a `skipped` Result or an absent row breaks no consumer. The verdict is communicated out-of-band via the reviewer's message. |
| `load.md:46` committed-only line | Scopes the whole declaration; the agents field inherits it for free (AC1). |
| README (`README.md:147`, phase-altitude guardrail wording; agent inventory at `README.md:112`) | A docs-phase touchpoint named for the doc-plan, not a spec requirement (§8). The inventory lists agents in spawn order without grouping the four gate-running agents, so it is no "one place" candidate for the archetypes. |
| Real `.rp.md` | This repo's `.rp.md` declares no guardrails; the setup example uses placeholders; migration is out of scope. |
| `.changeset/role-scoped-guardrails.md` | Reworded in place in the docs phase (R9), not a design-phase deliverable (§8). |

Assisted mode has no surface here: it carries no guardrail surface and its runs end at phase 3, so agent scoping has no assisted-mode footprint.

## 7. Acceptance-criteria mapping

| AC | Criterion | Decision |
| -- | --------- | -------- |
| 1 | Single optional **agents** field; `phase`/`level` removed, no compat sugar; committed-only preserved | D1 |
| 2 | Gate-running agent set named explicitly (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`) | D1 |
| 3 | Selection = gates naming the agent + gates naming none; phase plays no part; empty-selection rule preserved | D1 |
| 4 | A gate naming no agents is selected by every gate-running agent, doc agents included | D1 (§4.3, §4.6) |
| 5 | A gate naming only out-of-set agents is selected by none, no error/blocker/warning | D1 (§4.3) |
| 6 | Two archetypes stated once + the commits-vs-reviews mapping rule | D1 (¶4, §4.4) |
| 7 | `code-writer` runs its agent-name selection with the run-every / all-pass-before-commit obligations | D3 |
| 8 | `code-reviewer` runs judgment checks before its agent-name selection; fail-fast, skipped, approving-iteration | D4 |
| 9 | `doc-writer` runs its agent-name selection with writer obligations, re-keyed from "the docs-phase guardrails" | D5 |
| 10 | `doc-reviewer` carries the reviewer archetype: own step after judgment checks, fail-fast, skipped, approval, stateless, `pass`/`fail`/`skipped` vocab with absent-vs-skipped | D5 |
| 11 | Setup captures the optional agents field per gate, asked every gate, default surfaced; `Name \| Command \| Agents` table; validation flow unchanged | D2 |
| 12 | Obligation to reword the changeset in place in the docs phase, no second changeset stacked | §8 (docs-phase obligation) |
| 13 | Edits span exactly the six named files, reversing the base's docs-agent confinement | §2, §6 |

## 8. Out of scope (do not touch)

Carried from the spec's Out of Scope, restated as a guard against scope creep:

1. The exact `.rp.md` serialization of the agents field — illustrated, not mandated (as with the existing per-gate fields). No new validation path, parser, or schema for the field.
2. Migration or rewriting of existing `.rp.md` files — none declare guardrails (this repo's own `.rp.md` has no Guardrails section), so deleting `phase` and `level` needs no migration.
3. Cross-iteration gate-result caching — each reviewer-type instance stays fresh and stateless.
4. Assisted mode — no guardrail surface; its runs end at phase 3.
5. README prose (`README.md:147`, phase-altitude wording) — a docs-phase touchpoint named for the doc-plan, not a spec requirement.
6. `CHANGELOG.md` history — an immutable released entry, not edited.
7. `.changeset/role-scoped-guardrails.md` — the spec names the obligation (R9) to reword it in place in the **docs phase** (renaming the slug as appropriate) to describe agent scoping, with no second changeset stacked so the merged changelog never announces a `level` field that shipped in no release. The changeset text is the docs phase's deliverable, not a design- or code-phase edit.

## 9. Deliverable map (per file, for the plan and code phases)

1. **`skills/radical-pipelines/reference/conventions/load.md`** (D1):
   - ¶1: drop the phase-target and level sentences; define the agents field + "a guardrail that names no agents runs for every gate-running agent."
   - ¶2: unchanged (scoped distinctly from ¶1 by the noun "declaration").
   - ¶3: replace phase-then-level with the four-agent enumeration + name-membership selection + empty-selection rule + inert forward declaration; phase plays no part.
   - ¶4 (NEW): the two archetypes + the commits-vs-reviews mapping rule; rule only, no forward pointer.
   - Loader-table row (`:22`): drop the phase phrasing. Committed-only line (`:46`) untouched.

2. **`skills/radical-pipelines/reference/conventions/setup.md`** (D2):
   - "Capture per gate" 4 → 3 bullets: name, exact command, optional agents (asked every gate; surfaced "unset = every gate-running agent, doc agents included" default; "name only `code-reviewer`" criterion).
   - Example table reshaped to `Name | Command | Agents` with rows typecheck→`code-writer`, tests→`code-reviewer`, lint→blank. Validation block, "None is valid" line, illustrative-not-mandated framing untouched.

3. **`agents/code-writer.md`** (D3):
   - Selection-defining clause re-keyed from `code-phase guardrails leveled `writer` or unscoped` to "name `code-writer` or name no agents" at step 1.2 read (`:13`) and inside step 5 (`:44-55`); the step-5 title and writer-selection wording already hold and are untouched; obligations unchanged in form; blocker bullet (`:73`) re-worded to "a gate of your selection." Labeled the writer archetype.

4. **`agents/code-reviewer.md`** (D4):
   - Vocabulary re-key only: the `code-phase guardrails leveled `reviewer` or unscoped` phrasing re-keyed to "name `code-reviewer` or name no agents" at step 1 read (`:18`), the step-4 run ¶ (`:41`), and the Guidelines "Run the guardrails." bullet (`:110`). The dedicated step 4 (`:37-45`), Checks template (`:71-77`), fail-fast/skipped/approving-iteration/stateless prose, and drift-guard blocker (`:115`) all stand; labeled the reviewer archetype.

5. **`agents/doc-writer.md`** (D5):
   - Step 3 (`:35`), step 4 (retitled "Run the writer guardrail selection"), and blocker bullet (`:67`) re-keyed from "the docs-phase guardrails" to "name `doc-writer` or name no agents," labeled the writer archetype; doc-specific empty-selection note kept; obligations unchanged in form.

6. **`agents/doc-reviewer.md`** (D5):
   - Fresh restructure to the 6-step sequence (gather → review → accuracy spot-check → NEW guardrail step 4 → write review 5 → commit/report 6); the four-¶ guardrail step (bridge naming both judgment checks, run, fail-fast/skipped, approval/stateless); the cloned Checks comment block (Result ∈ {pass, fail, skipped}, absent-vs-skipped); retained Accuracy spot-check section; three-bullet Guidelines reconciliation keeping the doc-specific "accuracy spot-check is your only evidence" empty-selection note. Selection phrase always agent-name, never "leveled."
