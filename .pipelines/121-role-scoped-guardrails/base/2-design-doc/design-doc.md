# Design Doc — Role-scoped guardrails with reviewer fail-fast

_Issue: [Automattic/radical-pipelines#121](https://github.com/Automattic/radical-pipelines/issues/121). Pipeline: `121-role-scoped-guardrails`. Inputs: the approved, binding `1-spec/spec.md` and the committed `2-design-doc/design-doc-research.md`. This document is the standalone design the plan and code phases build against._

## 1. Summary

Today guardrails carry one scoping dimension — **phase** (`code`/`docs`). Every code-phase guardrail is mandatory for both the `code-writer` (on every commit) and the `code-reviewer` (on every review iteration). An expensive suite declared as a `code` guardrail therefore runs on every task commit and every review iteration; the only alternative is not declaring it, which gates the work for no one.

This change adds a second, optional dimension — **level** — to the code-phase guardrail. A guardrail may name which code-phase role runs it (`writer` or `reviewer`); a guardrail with no level applies to both. Writers run cheap gates (lints, typechecks) on every commit; expensive suites are leveled `reviewer` so they run on the reviewer's side, where a new **fail-fast** rule lets the reviewer reject early on a cheaper finding without running the not-yet-run gates of its selection. When all goes well, the reviewer-leveled suites execute exactly once — on the approving iteration.

The change is **prose and instruction text only** — no executable code, no module, no parser. Guardrails remain prose the agents read, exactly like every other `.rp.md` entry. The level is a fourth optional per-gate field captured in prose with one illustrative example and no mandated syntax (matching how `phase`, `name`, and `command` are already handled). The "design" is the exact shape and wording of the prose to add or rewrite across the four convention/agent files.

The level is **optional by definition**: "absent level = both roles" is a load rule, so every existing `.rp.md` — whether its gates carry no level field or it has no Guardrails section at all — keeps today's behavior with no migration. Docs-phase guardrail semantics and the two doc agents are untouched.

## 2. Scope surface

The design touches **exactly four files** (spec AC11), and nothing else:

| # | File | What changes |
| - | ---- | ------------ |
| 1 | `skills/radical-pipelines/reference/conventions/load.md` | The level definition (Guardrails ¶1) + the role filter on the selection rule (¶3) |
| 2 | `skills/radical-pipelines/reference/conventions/setup.md` | A fourth optional `level` capture bullet (code-applicable gates only) + one illustrative example table |
| 3 | `agents/code-writer.md` | Narrow to the writer guardrail selection; obligations unchanged in form |
| 4 | `agents/code-reviewer.md` | Narrow to the reviewer selection; promote the guardrail run to its own step carrying fail-fast, the skipped state, and the approval guarantee |

Everything else is untouched **by construction**, justified in §6: `agents/doc-writer.md` / `agents/doc-reviewer.md` (docs selection stays purely phase-based, so their wording stays literally true); the phase runbooks and `autonomous-workflow.md` (guardrails are never in a launch payload — agents self-read `.rp.md`); the per-phase completion predicate (checks existence, never content); the committed-only line in `load.md`; the README (a candidate touchpoint deferred to the docs phase); and the real `.rp.md` (the illustrative example uses placeholders, and migration is out of scope).

## 3. Grounded file state (verified against the live tree)

The design rests on the current shape of the four touched files, re-verified in this worktree. Note the layout: the conventions live under `skills/radical-pipelines/reference/conventions/`, but the agent files live at the repo root under `agents/`.

### 3.1 `load.md` — the Guardrails section

`## Guardrails` (`load.md:24-30`) is three paragraphs:

- **¶1 definition** (`:26`): "A guardrail is an exact command, judged pass/fail solely by its exit code … mandatory within the phase(s) it applies to. … The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both."
- **¶2 absent-is-valid** (`:28`): "An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning."
- **¶3 selection rule** (`:30`): "To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed."

The committed-only line is in `## Local overrides` (`:46`): "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`." The loader table row (`:22`) already describes guardrails generically ("the code/doc phases must pass"). `load.md` is **silent** on a malformed phase target — it only enumerates the valid set, and an out-of-set value simply never matches the membership test.

### 3.2 `setup.md` — the Guardrails capture step

`### Guardrails` (`setup.md:171-203`) already motivates ("Why they matter", "What kinds to consider") and captures three per-gate fields in a "Capture per gate" bullet list (`:179-183`): a **name**, the **exact literal command**, and the applicable **phase(s)**. "None" is a complete, valid answer (`:185`). The validation block (`:187-203`) is command-execution-only ("did the command execute?") and level-agnostic. There is **no prescribed `.rp.md` table/syntax** for a guardrail entry — the fields are described in prose.

### 3.3 `code-writer.md` — the guardrail touchpoints

Guardrail mentions (verified): step 1.2 read (`:13`); the step-3 "not a guardrail" disclaimer (`:36`, unchanged); step 5 "Run the code-phase guardrails" (`:44-55`); and the blocker guideline (`:73`). Step 5's obligations (`:46-54`): "Run **every** code-phase guardrail, exactly as its command is written. … Every applicable guardrail must pass before you commit," plus the two-question outcome model (empty selection ⇒ run none; declared-but-unrunnable ⇒ blocker; runs-and-exits-non-zero ⇒ work).

### 3.4 `code-reviewer.md` — the guardrail touchpoints

A fresh `code-reviewer` is spawned **once per batch** (`:8`); each instance is fresh and stateless. Guardrail mentions (verified): step 1 read, item 5 (`:18`); the step-2 checklist bullet "No regressions / verification gates pass" (`:32`); the step-3 behavior-verification "not a guardrail" framing (`:36`); the `## Checks` review template (`:60-64`, columns `Check | Command | Result`); and two Guidelines bullets — "Run the guardrails." (`:97`) and the two-question outcome model (`:98-101`). Today the ordering of step-2's eight checks is **presentational only** — there is no fail-fast or early-exit semantics anywhere in the reviewer, and no defined "skipped" Result value. The Checks table is consumed by no parser: the only consumer of the review files is the completion predicate, which checks existence, never content.

## 4. The model the prose must encode

Every wording decision serves one model. The four files must stay consistent because they share these definitions.

### 4.1 Level is a fourth, optional, code-only dimension

A guardrail may carry an optional **level** with exactly two valid values, `writer` and `reviewer`, naming which code-phase role runs it. A guardrail with **no level applies to both roles** (unscoped). The level is part of the committed guardrail declaration; it inherits the committed-only rule for free (never from `.rp.local.md`), so it is never overridable per-developer.

### 4.2 The selection is two filters applied in sequence

Selection is **phase first, then level** — two orthogonal filters:

- **Docs phase** selects by phase only; level is never consulted. A both-phase gate carrying a level still runs for both doc agents. Level is inert within docs — it never removes a gate from docs selection.
- **Code phase** selects by phase, then by role-level: the `code-writer` selects the code-phase gates leveled `writer` or unscoped; the `code-reviewer` selects the code-phase gates leveled `reviewer` or unscoped.

Unscoped gates are the shared mandatory floor both code roles run. The three level states are a clean partition of the code-phase responsibility: `writer` = run per writer commit, not at review; `reviewer` = run at review, not per commit; unscoped = both.

### 4.3 Skipping writer-leveled gates at review is sound

The reviewer always diffs `base ref → current HEAD` after every writer in the batch has committed, so the review-time tree is exactly the tip of the last writer commit — a tree against which every writer-leveled gate already passed. The reviewer therefore need not re-run them. The adversarial philosophy is preserved where it matters: the reviewer still independently runs its own selection (reviewer + unscoped) and re-does behavior verification. (An owner who wants a gate double-checked at review leaves it unscoped; that is the per-gate choice the level encodes.)

### 4.4 Fail-fast and the approval guarantee are two halves of one rule

The reviewer runs the judgment-based checks (the step-2 checklist and step-3 behavior verification) **before** running its guardrail selection. Once it has at least one rejection finding, it **may** reject without running any not-yet-run gate of its selection — recording each deliberately skipped gate as **skipped**. "May", never "must": fail-fast is a permission, not an obligation; the reviewer can still run gates while rejecting. The other half: the reviewer **approves only** when every gate in its selection has run and passed **in that same iteration**. The guarantee is per-iteration — each reviewer instance is fresh and stateless, with no cross-iteration caching. Net effect when all goes well: the reviewer-leveled suites execute exactly once, on the approving iteration.

The fail-fast scope is uniform over the whole selection (reviewer-leveled + unscoped), not special-cased to reviewer-leveled gates. The guarantee that matters — nothing is approved without all selection gates passing — is identical either way, and a uniform rule avoids special-casing levels within the selection. Expensive suites are expected to be reviewer-leveled, so "reject early without running the reviewer-scoped suites" follows as a consequence.

### 4.5 A malformed level gets no new handler

A level value outside `{writer, reviewer}` matches no role filter, so the gate is selected for no code-phase role — exactly the implicit behavior of an unrecognized phase target today. No explicit error, blocker, or warning is introduced. The membership-test wording produces the silent no-match by itself, so no prose is added for this case.

## 5. Design decisions

Four decisions (D1–D4), carried from the research record's analyst decisions and grounded against the verified file state in §3. Each cites the acceptance criteria it satisfies.

### D1 — `load.md` owns the complete level rule

_Satisfies AC1, AC2, AC3, AC9, AC10._

`load.md` is the single place the level vocabulary and the role-filtered selection are defined, so the agent files can name only their own selection without re-deriving it — mirroring exactly how the phase filter is split today (¶3 owns "select the guardrails whose phase(s) include the current phase"; the agents just say "applicable to the code phase").

**Definition — extend ¶1.** Add one sentence: a guardrail may carry an optional **level**, `writer` or `reviewer`, naming which code-phase role runs it; a guardrail with no level applies to both roles. This is the authoritative "absent = both" rule, stated as a definition/load fact decoupled from serialization — so "no Guardrails section", "no Level column", and "blank Level cell" all resolve to both roles uniformly (AC9).

**Selection — extend ¶3.** Append the role filter applied **after** the phase filter: within the code phase, the writer runs `writer`-leveled or unscoped gates and the reviewer runs `reviewer`-leveled or unscoped gates; the docs-phase selection never consults level, and a both-phase gate carrying a level still runs for both doc agents (AC3).

**No malformed-level text** (§4.5) and the **committed-only line untouched** (`:46` already scopes the whole declaration, so the level inherits it — AC1 with zero edits).

### D2 — `setup.md` captures level as a fourth optional bullet plus one example

_Satisfies AC8._

**Capture bullet.** Add a fourth bullet to the "Capture per gate" list (`setup.md:183`): an optional **level** — `writer` or `reviewer` — naming which code-phase role runs the gate; asked **only for gates whose phase(s) include `code`**; default when unset is unscoped (both roles). Two sentences (optional field + vocabulary + code-applicable-only; default unscoped) — the asked-only-for-code clause already covers "level is meaningless for a docs-only gate", so no third sentence is needed.

**One motivating clause**, attached to the level bullet, in register with the step's existing motivational prose: level an expensive suite `reviewer` so it runs on the reviewer's side instead of on every writer commit — giving the owner the decision criterion.

**One illustrative example**, slotted immediately after the capture list (the reader has just learned the four fields and sees them assembled): a small generic `Name | Command | Phase | Level` table with one `writer` gate, one `reviewer` gate, and one both-phase gate whose **blank Level cell** doubles as the "unscoped looks like absence" anchor. Generic placeholder commands only (no tool- or platform-specific names). This is the #51 "recommended, not mandated" stance — an illustrative shape, not a parser or mandated block. A shared shape is worth more for `level` than for the other fields precisely because a missing level is semantically meaningful (it means both roles), so an author who omitted it deliberately and one who forgot are indistinguishable by design; the example gives both author and load-time reader a common anchor.

**Validation text unchanged** (`:187-203`): it is command-execution-only and level-agnostic. No other `setup.md` text enumerates guardrail fields.

### D3 — `code-writer.md` narrows to the writer guardrail selection

_Satisfies AC4._

The writer's obligations are **unchanged in form** (spec R4); only the set they range over narrows from "code-phase" to "the writer guardrail selection."

1. **Step 1.2 (`:13`)** gains the selection phrase: read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing.
2. **Step 5 (`:44-49`)** is retitled "Run the writer guardrail selection" and reuses the defined term; the R4 obligations survive verbatim in form ("run **every** gate, exactly as its command is written, all must pass before you commit, no bypass"), scoped to the selection.
3. **Step 5 outcome sub-bullets:** the empty-selection sub-case (`:52`) rewords to the role selection; the drift-guard (`:53`) and exit-non-zero (`:54`) sub-cases are substantively unchanged.
4. **Guidelines blocker bullet (`:73`):** the precision tweak "declared code-phase guardrail" → "a gate of your selection" — substance is identical (a reviewer-leveled gate is never in the writer's selection, so the writer never attempts it and the drift guard can only fire on a selection gate), but once the file speaks in selections, keeping the broader term would leave a stale phrase against the term-reuse rule.

### D4 — `code-reviewer.md` is restructured: guardrails become their own step

_Satisfies AC5, AC6, AC7._

**Promote the guardrail run to its own numbered step, after behavior verification.** Today's ordering is presentational; it must become load-bearing. New sequence: gather context → review the changes (the judgment checks) → behavior verification → **run the reviewer guardrail selection** (new step) → write the review → commit and report. Guardrails go **after** behavior verification because behavior verification is itself expensive, judgment-based, and a rejection source ("either produce the evidence or reject the batch") — if guardrails ran first, a behavior-verification rejection could not save the guardrail cost.

1. **Step 1 read (`:18`)** gains the reviewer selection phrase: read the code-phase guardrails leveled `reviewer` or unscoped.
2. **Step 2 (`:32`)** loses the guardrail bullet; the remaining judgment checks stay.
3. **New guardrail step**, created from the moved bullet's content, carries — **stated once** — four things: the selection obligation ("exactly as each command is written", scoped to the selection); the bridging sentence that it runs **only after** the step-2 checks and step-3 behavior verification (one sentence removes the ambiguity that spec R5's single "judgment-based checks" phrase spans two file steps); the **fail-fast permission** ("may" skip any not-yet-run selection gate once a rejection finding exists, each recorded as skipped); and the **approval guarantee** (approve only with every selection gate run and passed this iteration). Fail-fast and the guarantee are the two halves of one rule (§4.4) and are stated together.
4. **Checks-table contract.** Because nothing parses the table, the format optimizes for human reading. A row for **every** gate of the reviewer's selection; Result ∈ {`pass`, `fail`, `skipped`}. A forgotten gate is an absent row; a deliberately skipped gate is a present row with Result `skipped` — the three-way distinction AC6 demands. A skipped row still shows the gate's literal command (uniform column meaning, self-explanatory row) but the command is not run. One short template comment documents the Result vocabulary and the every-gate-gets-a-row rule (`:60-64`); the behavioral rule itself lives in the step prose.
5. **Guidelines reconciliation.** The "Run the guardrails" bullet (`:97`) names the reviewer selection, back-references the step's fail-fast rule instead of restating it, and keeps the empty-selection rule. The two-question outcome-model bullet (`:98-101`) is substantively unchanged; only its empty-selection sub-case rewords "code-phase guardrails" to the role-filtered selection. The drift-guard blocker needs no change beyond the upstream selection phrase: it triggers only on an **attempted** gate, and a skipped gate is never attempted, so fail-fast cannot manufacture a false drift blocker.

No within-selection ordering text (e.g. cheap-first): the spec is silent and minimalism rules it out.

## 6. Confinement to four files (the AC11 guarantee)

Each non-edit is justified, not merely asserted:

| Untouched | Why it stays correct |
| --------- | -------------------- |
| `agents/doc-writer.md`, `agents/doc-reviewer.md` | Docs selection is purely phase-based (D1 ¶3); their "guardrails applicable to the docs phase" wording stays literally true. Level is inert in docs. |
| `reference/autonomous-phases/4 - code.md`, `autonomous-workflow.md` | Guardrails are never in a launch payload — each code agent self-reads `.rp.md`. The orchestrator passes a closed list (artifact folder, commit format), so the loop is unaffected. |
| Per-phase completion predicate | Checks file existence + committed, never content; a `skipped` Result or absent row breaks no consumer. The verdict is communicated out-of-band via the reviewer's message. |
| `load.md:46` committed-only line | Scopes the whole declaration; the level inherits it for free (AC1). |
| README | A candidate touchpoint deferred to the docs phase; the README's altitude already omits the existing phase-granularity detail, so omitting role-granularity is consistent. |
| Real `.rp.md` | The setup example uses generic placeholders; migration is out of scope. |

Assisted mode has no surface here: the owner approves and there is no code-reviewer Checks table, so role scoping and fail-fast do not apply.

## 7. Acceptance criteria mapping

| AC | Criterion | Decision |
| -- | --------- | -------- |
| 1 | Optional `level` field documented (`writer`/`reviewer`, absent = both); committed-only preserved | D1 |
| 2 | Code-phase selection role-filtered (writer: writer+unscoped; reviewer: reviewer+unscoped) | D1 |
| 3 | Level filters code-phase only; docs selection purely phase-based, incl. both-phase gates | D1 |
| 4 | Writer runs its role selection with R4 obligations unchanged in form | D3 |
| 5 | Reviewer runs judgment checks before its selection; may reject early once a finding exists | D4 |
| 6 | Skipped gate recorded as skipped, distinct from pass/fail and from absent | D4 |
| 7 | On approval, every selection gate has run and passed; no approval with unrun/skipped | D4 |
| 8 | Setup asks level per code-applicable gate, optional, default unscoped, lands in `.rp.md` | D2 |
| 9 | Level-less `.rp.md` (or no Guardrails section) keeps today's behavior, no migration | D1 |
| 10 | Malformed level matches no role filter, no new error path | D1 (§4.5) |
| 11 | Edits confined to the four files; doc agents and docs path unchanged | §2, §6 |

## 8. Out of scope (do not touch)

Carried from spec Out of Scope, restated as a guard against scope creep:

1. Any change to docs-phase guardrail semantics or the two doc agents (`doc-writer`, `doc-reviewer`).
2. Cross-iteration state ("this suite already ran on iteration N−1") — each reviewer instance stays fresh and stateless.
3. Assisted mode (no reviewer Checks table exists there).
4. README prose update — a candidate touchpoint deferred to the docs phase.
5. Migration or rewriting of existing `.rp.md` files.
6. The "Plan-driven test selection and reviewer-side behavior verification" work (#122) — independent, but it edits the same writer/reviewer agent files and must not be worked on in parallel.
7. The exact `.rp.md` serialization of the level — illustrated, not mandated (as with the existing per-gate fields). A new validation path, parser, or schema for the level is also out of scope.

## 9. Deliverable map (per file, for the plan and code phases)

1. **`skills/radical-pipelines/reference/conventions/load.md`** (D1):
   - ¶1: one sentence defining the optional `level` (`writer`/`reviewer`, naming which code-phase role runs the gate; no level = both roles).
   - ¶3: the role filter applied after the phase filter (writer = writer+unscoped, reviewer = reviewer+unscoped; docs selection never consults level, both-phase gate with a level still runs for both doc agents).
   - No malformed-level text; committed-only line (`:46`) untouched.

2. **`skills/radical-pipelines/reference/conventions/setup.md`** (D2):
   - A fourth "Capture per gate" bullet: optional `level`, `writer`/`reviewer`, asked only for code-applicable gates, default unscoped, with the one-clause motivation.
   - One generic illustrative `Name | Command | Phase | Level` table after the capture list (one `writer` gate, one `reviewer` gate, one both-phase gate with a blank Level cell). Validation text unchanged.

3. **`agents/code-writer.md`** (D3):
   - Step 1.2 read gains the writer selection phrase; step 5 retitled "Run the writer guardrail selection" with R4 obligations unchanged in form; empty-selection and drift-guard wording scoped to the selection ("a gate of your selection").

4. **`agents/code-reviewer.md`** (D4):
   - Step 1 read gains the reviewer selection phrase; step 2 loses the guardrail bullet; a new step after behavior verification ("Run the reviewer guardrail selection") carries — stated once — the selection obligation, the runs-after bridge, the fail-fast permission, and the approval guarantee.
   - Checks table: a row per selection gate, Result ∈ {pass, fail, skipped}, skipped rows show the command unrun, one-line template comment. Guidelines bullets become back-references; drift-guard prose stands.
