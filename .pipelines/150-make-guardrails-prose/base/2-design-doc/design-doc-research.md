# Design Research: Make guardrails prose

_Inputs: `1-spec/spec.md` (the approved spec — the WHAT). The subject of this change is this
repository's own Radical Pipelines skill: the guardrails reference, the convention loader, the
setup convention file, the passing convention file, the two code writers, the doc writer, and the
two reviewers._

## Purpose of this document

The spec settled the WHAT: a guardrail is redefined as a prose rule an agent must satisfy, two
kinds (command and judgment) coexist under one prose representation, the exit-code machinery is
stripped, the command-presupposing shapes broaden so judgment guardrails fit, and the binary
approve/reject outcome plus the `{scope}` fill lifecycle are preserved unchanged. This document
settles the HOW at full edit depth: the exact prose each in-scope file carries, the shape of the
one unified per-gate block, the vocabulary that names the two kinds, how the reviewer's Checks
table and the spawn-time Guardrails block broaden to a no-command guardrail, and where every load-
bearing meaning (setup accepting a runnable-but-currently-failing command; the writer/reviewer
"the command ran but its check isn't satisfied" outcome) survives the removal of the exit-code
words.

Radical Pipelines is "documentation as code": the guardrails reference, the loader, the setup
flow, the passing convention, and the agent profiles are Markdown the orchestrator and the spawned
agents read and reason over — there is no parser and no runtime that interprets a "guardrail."
Every decision below is therefore constrained by one question: **can a human owner author, and the
orchestrator/agent LLM apply, this rule reliably from prose alone?** That, plus the project's
authoring rules (minimalist, generic, no duplication across reading paths, no needless negative
phrasing, "prose, not software"), drives the choices — not code elegance.

## Implementation surface (established from the codebase before Q&A)

The eight in-scope files the spec enumerates (req 13), with the exact exit-code framing each
currently carries:

- **`reference/guardrails.md`** (33 lines) — the canonical model. Line 3 defines guardrails as
  "the deterministic verification gates a project's running agents must pass — exact commands
  judged pass/fail by exit code." `## Gate kinds` (5-11) defines **fixed** vs **scoped**. The
  `.rp.md` per-gate block (12-25) has fields `command:` / `agents:` / `fill-guidance:`. The fill
  lifecycle (27-33) is the `{scope}` machinery (preserved, out of scope to remove). This file is
  the single source the other files point at for "the model."
- **`reference/conventions/load.md`** (39 lines) — the loader's convention table. Row at line 22
  repeats verbatim: "The deterministic verification gates — exact commands judged pass/fail by exit
  code." Line 38 notes guardrails are shared/committed-only (never from `.rp.local.md`). The "What
  it covers" cell is a one-line gloss that must lose the exit-code framing.
- **`reference/conventions/setup.md`** (232 lines) — the Guardrails capture section (171-191).
  Carries the heaviest exit-code vocabulary: ":179" validation ("did the command execute?"), ":183"
  ("Any exit code counts… 'it executed,' not 'exit 0.'"), ":184" ("surface the failure… the error
  and exit code"). "Capture per gate" (177) points at `guardrails.md` for the block. The
  load-bearing meaning to preserve: a command that **runs** is accepted even if its check currently
  fails; one that **cannot run** is rejected.
- **`reference/conventions/passing.md`** (18 lines) — carries the spawn-time `## Conventions` block
  fields. The **Guardrails** field (line 10) tells the orchestrator to place the gates naming an
  agent, resolving a scoped gate's `{scope}` from the plan and placing the resolved command, "a
  fixed gate's command passes literally." No exit-code words, but it is command-presupposing
  ("substitute it into the gate's `{scope}` command, and place the resolved command") and must
  broaden so a judgment guardrail (no command) is placed as its rule prose.
- **`agents/code-writer-tdd.md`** (64 lines) — "### 3. Run the guardrails" (36-46). Line 44: "A
  gate runs and **exits non-zero** — the command executed but the gate did not pass." The three-way
  sort (no-convention / cannot-execute-blocker / runs-but-fails-work) is the load-bearing meaning.
- **`agents/code-writer-e2e.md`** (54 lines) — "### 3. Run the guardrails" (27-36), identical
  three-way sort; line 35 the same "exits non-zero" phrasing. The two code writers' guardrail
  sections are **verbatim-identical** — a duplication-across-reading-paths question (req 14).
- **`agents/doc-writer.md`** (68 lines) — "### 4. Run the guardrails" (38-48), the same three-way
  sort; line 47 "exits non-zero"; line 45's no-convention branch additionally names "the step-3
  accuracy verification is your only validation" (doc-writer-specific, not shared).
- **`agents/code-reviewer.md`** (115 lines) — "### 4. Run the guardrails" (37-46) + the Checks
  table comment (71-78) + the blockers guideline (114). Line 43: "A gate that **exits non-zero** is
  itself a rejection finding." The Checks table has columns **Check | Command | Result** with
  Result ∈ pass | fail | skipped; the comment (74) says "a run gate is a present pass/fail row" and
  "A skipped row shows the gate's literal command." Line 114 lists "a gate that runs and exits
  non-zero" as a normal finding, "a declared gate cannot execute" as a blocker.
- **`agents/doc-reviewer.md`** (116 lines) — "### 4. Run the guardrails" (39-47) + Checks table
  comment (73-79) + blockers guideline (115). Structurally identical to code-reviewer's guardrail
  machinery; line 45 "exits non-zero", line 115 the same blocker/finding split. The two reviewers'
  guardrail machinery is **near-identical** — another duplication question (req 14).

Out-of-scope machinery that must NOT change and that judgment guardrails must never reach (the
`{scope}` execution-check lifecycle, preserved per spec "Out of Scope"):

- **`agents/code-plan-writer.md`** / **`agents/doc-plan-writer.md`** — "Fill the guardrail scopes"
  + the `## Guardrail scopes` section. Operate only on **scoped gates** passed in `Guardrail scopes
  to fill:`.
- **`agents/code-plan-reviewer.md`** / **`agents/doc-plan-reviewer.md`** — "Validate the
  `## Guardrail scopes`": substitute the scope value, execute the filled command, "did the
  command's runner resolve and terminate?" This is an **execution check, not an exit-code check**
  (spec Out of Scope) — it stays.
- **`reference/assisted-phases/3 - plan.md`** — the assisted-mode equivalent of the plan-scope
  validation. Same "did the command's runner resolve and terminate?" execution check — stays.

Because all three of these touch only **scoped command gates**, and a judgment guardrail is neither
fixed nor scoped (req 6), a judgment guardrail never reaches the scope-fill or scope-validation
machinery. This is the structural reason the out-of-scope files need no edit.

## Terminology established by the spec (to reuse, not reinvent)

The spec fixes the vocabulary; per the project rule "reuse the terms the skill already defines," the
design adopts it verbatim:

- **guardrail** — a prose rule an agent must satisfy (the redefinition).
- **command guardrail** — its prose tells the agent to run a command and confirm the check it
  describes is satisfied.
- **judgment guardrail** — a prose rule the named agent satisfies by its own assessment, with no
  command to run.
- **fixed** / **scoped** — a property of **command guardrails only**; a `{scope}` placeholder makes
  a command guardrail scoped. A judgment guardrail is neither.
- The five guardrail-running agents: `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`,
  `doc-writer`, `doc-reviewer`.

## Topics to resolve (decided one at a time, on the researcher's evidence)

1. **Guardrail definition + the two kinds in `guardrails.md`** — the redefinition sentence, how the
   two kinds are introduced, and how the kind distinction relates to the existing fixed/scoped
   distinction (req 1-3, 6).
2. **The unified per-gate block shape** — the one block expressing both kinds; how a judgment
   guardrail omits the command-only fields; no new structure (req 4-5, 14).
3. **`{scope}` lifecycle preserved + judgment neither fixed nor scoped** — confirm no edit to the
   scope machinery; where to state the fixed/scoped-is-command-only fact (req 6).
4. **Reviewer behavior** — per-guardrail result for both kinds; the Checks table broadening for a
   no-command guardrail; skipped semantics; spawn-time block; the must-fix/reject mapping (req 7-9).
5. **Writer behavior + no-guardrails path** — running command guardrails; the cannot-run-vs-not-
   satisfied distinction without exit-code words; whether judgment guardrails reach writers; the
   no-guardrails path (req 10-11).
6. **Setup / capture of both kinds** — command guardrail validated by running (accept if it runs
   even when its check fails) without "exit 0"/"exit code"; judgment guardrail captured verbatim
   like commit format (req 12).
7. **Exit-code removal sweep + `load.md` table + `passing.md` + terminology + duplication** — the
   complete edit surface, the de-duplication of the writers' and reviewers' shared guardrail prose,
   and the consistent vocabulary across all eight files (req 13-14).

---

## Q&A

_(Questions routed to the `design-doc-researcher` one topic at a time. Each entry records the
question, the researcher's findings, and the design decision reached.)_

## Topics

### Topic: Redefinition and the two kinds in `guardrails.md`

- **Spec link:** Requirements 1, 2, 3; bears on 6.
- **Question to researcher:** the new shape of `guardrails.md` — the redefinition sentence, how
  the two kinds are introduced, how fixed/scoped is repositioned, and whether anything actively
  rejects a commandless block.
- **Findings (researcher):**
  - The skill's idiom for a multi-kind model is: one-sentence concept definition → an H2 naming the
    kinds as **bolded-label + em-dash-gloss** bullets → an H2 with the serialized block → lifecycle
    H2s. `guardrails.md` already follows this skeleton (`:9-10` fixed/scoped bullets).
  - The "one concept whose serialized form has a sub-distinction" precedent is
    `pipeline-versioning.md:7-11`: a sub-case is a **nested sub-bullet under its parent bullet**,
    not promoted to its own H2.
  - The model files mark not-always-present parts with an inline italic `_(optional)_` tag
    (`intent-format.md:11`, `summary-format.md:13`). The `(required)` parenthetical is a **setup.md**
    convention-header idiom (`setup.md:32,46,62,74`), not a model-file idiom — so use `_(optional)_`
    here.
  - The top-level partition "a guardrail gate is **fixed** or **scoped**" is declared in exactly
    **one** place: `guardrails.md:5-10` (the `## Gate kinds` H2). Every other fixed/scoped or
    `{scope}` mention merely *uses* the machinery. In-scope spots that presuppose a command:
    `passing.md:10`, `setup.md:179,190` (handled in later topics). Out-of-scope spots (the `{scope}`
    lifecycle, preserved): `assisted-phases/3 - plan.md` and the four plan agents — all touch only
    **scoped command gates**, so a judgment guardrail never reaches them.
  - Req 3 is pure prose-permission: **no parser, no required-field enumeration** anywhere (grep for
    "must have a command"/required-field patterns → zero hits across `skills/` and `agents/`). The
    only thing implying "always a command" is the block template's untagged `command:` field
    (`guardrails.md:19`), unlike `fill-guidance` which is already tagged optional (`:21`).
  - The clause "exact commands judged pass/fail by exit code" is duplicated **verbatim** in exactly
    two places: `guardrails.md:3` (canonical) and `load.md:22` (a table-cell gloss). Today's
    definition is positively phrased, so the redefinition stays positive — no new "don't" clauses.
- **Decision:**
  1. **Restate the definition** at `guardrails.md:3` in one positive sentence — a guardrail is a
     prose rule an agent must satisfy — with no exit-code framing (req 1).
  2. **Replace `## Gate kinds`** (which currently names fixed/scoped) with an H2 that introduces the
     **two kinds** as two bolded-label + em-dash-gloss bullets: **command guardrail** (its prose
     tells the agent to run a command and confirm the check it describes is satisfied) and
     **judgment guardrail** (a prose rule the named agent satisfies by its own assessment, with no
     command to run) — req 2.
  3. **Demote fixed/scoped** to nested sub-bullets **under the command-guardrail bullet** (the
     `pipeline-versioning.md` nested-case pattern), stating there that fixed vs scoped is a property
     of command guardrails only and that a judgment guardrail is neither (req 6). This is the only
     change to the fixed/scoped *definition* anywhere in the skill.
  4. **Keep** the block H2 and the fill-lifecycle H2 (their reshaping is Topics 2 and 3). The
     fill-lifecycle prose already speaks of "a scoped gate," which now reads correctly as "a scoped
     command guardrail" with only terminology consistency to apply (Topic 7).
  5. **No validation to relax** — req 3 is met by the block making command-only fields omittable
     (Topic 2) plus broadening the two command-presupposing prose spots (`passing.md`, `setup.md`).
- **Rationale:** reuses the skill's own "concept → kinds → block → lifecycle" skeleton and its
  nested-sub-case and `_(optional)_` idioms, so the change reads like the surrounding model files
  and introduces no new structure (req 14). Demoting the single partition declaration is the
  minimal, duplication-free way to make fixed/scoped a command-only sub-distinction.

### Topic: The unified per-gate block shape

- **Spec link:** Requirements 4, 5; constraint 14; bears on 3, 6.
- **Question to researcher:** which body-field shape (A rename `command:` to a kind-neutral prose
  field / B add a second body field / C single field + a distinguishing convention) keeps the block
  to "one unified block + the existing `agents:` field" with no new structure, and whether (A)
  breaks `{scope}` resolution or any consumer that would need a machine-distinguishable kind flag.
- **Findings (researcher):**
  - The block today has exactly four pieces and no more (`guardrails.md:16-22`): `### <name>`,
    `command:` (a backticked-token field), `agents:`, and `fill-guidance:` (a free-prose field
    tagged "optional; scoped gates only"). `{scope}` is **not** a field — it is a placeholder inside
    the command value (`:19` "with {scope} if scoped").
  - The block **already contains both idioms**: a backticked-token field (`command:`) and a
    free-prose field (`fill-guidance:`). "Prose that embeds a backticked command" also has precedent
    outside the block (`.rp.md:101` "**Start:** `/loop 15m <prompt>` where …"; `setup.md:60`). So a
    kind-neutral prose body that may embed a backticked command is fully idiomatic.
  - The spec's own phrasing makes the body the prose carrier: req 2's command example ("run this
    command and check that it doesn't fail: [command]") IS a prose body that embeds a command; req 7
    and req 10 treat "the check it describes" as the body's prose. This is exactly option (A).
  - **(A) does not break `{scope}` resolution.** Resolution keys on the **gate name** — the plan's
    `## Guardrail scopes` table is keyed by **Gate** (`guardrails.md:32`, `code-plan-writer.md:32`,
    `assisted-phases/3 - plan.md:134`), never by a `command:` field. Placement is **textual token
    substitution** (`passing.md:10` "substitute … place the resolved command") — indifferent to
    whether `{scope}` sits in a dedicated field or inside a backticked command embedded in prose.
  - **Pressure-test (does any consumer need a structural kind flag?): NO.** Setup's run-time
    validation applies only when the body names a command — its presence/absence in the prose is the
    discriminator (and req 12 wants exactly that). The reviewer's Checks table needs its `Command`
    column generalized so a commandless row is valid (Topic 4), not a kind flag. The writer relies
    on `agents:` to keep judgment guardrails away from it (req 5). The orchestrator is gate-name-
    keyed and kind-agnostic. So (C)'s distinguishing convention is unneeded structure; (B)'s second
    body field is literal new structure (violates req 14).
  - **`.rp.md` has no guardrails block today** (confirmed — this repo's `.rp.md` declares no
    guardrails), so `guardrails.md` is the sole source of the block template and there is nothing to
    migrate. This matches the spec's framing that the change *enables* the owner's motivating use
    case without authoring any guardrail.
- **Decision — option (A): a single kind-neutral prose body field replacing `command:`.**
  1. **Rename/repurpose `command:` to a kind-neutral body field whose value is prose.** Recommended
     label: **`rule:`** — it reads best against the spec's "a prose rule an agent must satisfy"
     (req 1) and the project's own `AGENTS.md` "rules." For a **command guardrail** the `rule:` prose
     tells the agent to run a command and confirm the check it describes is satisfied, embedding the
     command in backticks (with `{scope}` inside it if scoped); for a **judgment guardrail** the
     `rule:` prose is the rule itself, with no command. *(The exact label is a non-load-bearing
     wording call the design-doc-writer may finalize; `rule:` is the recommended default. Whatever
     label is chosen, the structure is identical.)*
  2. **`agents:` is unchanged** (req 5). An owner confines a judgment guardrail to reviewers by
     listing only `code-reviewer`/`doc-reviewer` there — no new mechanism.
  3. **`fill-guidance:` stays, tagged optional and scoped-command-only** — unchanged in role; a
     judgment guardrail omits it exactly as a fixed command guardrail already does (req 4).
  4. **A judgment guardrail's block is: name + `rule:` (the rule prose) + `agents:`** — omitting the
     `{scope}` placeholder (which only ever lives inside a command) and `fill-guidance`, the way a
     fixed command guardrail already omits `fill-guidance` (req 4). Mark the command-only nature with
     the model-file `_(optional)_` idiom on the relevant lines, phrased positively ("present for
     scoped command guardrails"), never as a "judgment guardrails must not …" negative.
  5. **No new structure** — the block is still name + one body field + `agents:` + optional
     `fill-guidance:`; (A) renames one field and adds none (req 14).
- **Rationale:** (A) is the only shape that adds zero fields while expressing both kinds; the two
  kinds differ solely in what the `rule:` prose says (one embeds a command, the other is the rule).
  Because every consumer reads the body or keys on the gate name, no machine-distinguishable flag is
  needed, so the distinguishing convention (C) and the second body field (B) are both rejected on
  minimalism grounds. `{scope}` resolution survives untouched because it is name-keyed and textual.

### Topic: `{scope}` lifecycle preserved; judgment guardrails neither fixed nor scoped

- **Spec link:** Requirement 6; spec "Out of Scope" (the `{scope}` fill lifecycle and
  `## Guardrail scopes` plan sections are preserved, not removed).
- **No fresh research round:** req 6 is settled by evidence already gathered under Topics 1 and 2;
  there is no open design question to put to the researcher. Recording the synthesis (mirrors how a
  preserved-behavior requirement is handled — decision from prior findings, not a manufactured
  question).
- **Decision — the scope machinery is untouched; judgment guardrails structurally never reach it:**
  1. **The fill lifecycle stays exactly as written.** A scoped command guardrail still carries a
     `{scope}` placeholder; the planning agent of the phase whose agents run it still chooses the
     value and records it in the plan's `## Guardrail scopes` section (gate → value); the
     orchestrator still resolves it before passing the guardrail. The two plan writers
     (`code-plan-writer.md`, `doc-plan-writer.md`), the two plan reviewers (`code-plan-reviewer.md`,
     `doc-plan-reviewer.md`), and `assisted-phases/3 - plan.md` are **not edited** — they are not in
     the spec's eight in-scope files, and their "did the command's runner resolve and terminate?"
     check is an **execution check, not an exit-code check** (spec Out of Scope).
  2. **Judgment guardrails never reach the scope machinery — structurally, not by a guard clause.**
     Every scope-fill and scope-validation step operates only on **scoped command guardrails** (a
     `{scope}` placeholder lives only inside a command). A judgment guardrail is neither fixed nor
     scoped (it has no command), so it is never passed in `Guardrail scopes to fill:`, never gets a
     `## Guardrail scopes` row, and is never substituted or validated. No negative phrasing is
     needed to keep it out — the existing "scoped command guardrails only" scoping already excludes
     it.
  3. **The one place to state "fixed/scoped is command-only" is `guardrails.md`** — the demoted,
     nested fixed/scoped sub-bullets under the command-guardrail bullet (Topic 1, decision 3),
     stating there that a judgment guardrail is neither. No other file restates it (avoids
     cross-path duplication, req 14); the plan files keep saying "scoped gate/command guardrail" and
     that now reads correctly.
  4. **`passing.md:10` is the only in-scope file touching this lifecycle**, and only its wording
     broadens (Topic 2, decision: substitute `{scope}` in the guardrail's **body**, place the
     resolved body; any other guardrail's body passes literally). The lookup-by-gate-name and
     textual-substitution mechanics are unchanged, so the lifecycle is preserved verbatim in
     behavior while shedding the command-presupposing phrasing.
- **Rationale:** the spec preserves the `{scope}` lifecycle and the execution checks; the cleanest
  realization is to leave every scope-machinery file untouched and rely on the fact that a judgment
  guardrail is structurally never scoped, so it never enters that machinery. Stating the
  command-only nature of fixed/scoped once, where the kinds are defined, keeps the fact in a single
  reading path.

### Topic: Reviewer behavior for both kinds

- **Spec link:** Requirements 7, 8, 9. Files: `code-reviewer.md` and `doc-reviewer.md` (mirrored
  guardrail machinery; the duplication question is Topic 7).
- **Question to researcher:** the Checks-table broadening (column + Result vocabulary), the gate-
  running step rewrite, skipped semantics, the no-guardrails branch, the blocker-vs-finding split,
  and any residual command-presupposition in the spawn-time block.
- **Findings (researcher):**
  - **Result vocabulary:** the spec condemns only the *qualified* phrase "pass/fail **by exit
    code**" (`spec.md:32`) / "judged pass/fail by exit code" (`:45,:75`), not the bare words. But
    the spec's own per-guardrail result vocabulary is **satisfied / unsatisfied / violated**
    (`:15,:30,:31,:70`). So changing the Result values is a *both-kinds-fit* choice (a judgment
    guardrail is assessed, not "run," so "is the rule satisfied?" reads correctly for both), not a
    response to a prohibition — and terminology reuse (a project authoring rule) favors "satisfied".
  - **Command column:** repurpose the middle column to a kind-neutral **`Guardrail`** column holding
    the body (the command for a command guardrail, the rule for a judgment guardrail). A permanently
    blank `Command` cell for a whole kind is worse minimalism and still reads as command framing
    (reject option ii).
  - **Umbrella verb:** "evaluate" cleanly covers "run a command" and "assess a rule"; it is the
    generalization of today's "run every gate exactly as each command is written."
  - **Skipped** already means "deliberately did not do the step because the verdict was already
    reject" (`code-reviewer.md:41`); re-gloss it from "command was not run" to "not evaluated this
    iteration" and it covers both kinds with no new word.
  - **No-guardrails branch** presupposes no *kind*; "no guardrails convention" already means neither
    kind. Only "gates to run" → "guardrails to evaluate" terminology. It is the reviewer counterpart
    of writer req 11 — and neither reviewer branch raises a blocker or warning, so req 11's intent
    already holds for reviewers.
  - **Blocker asymmetry confirmed:** a judgment guardrail has nothing that "fails to run," so there
    is no "cannot execute" blocker analog for it. The blocker case stays command-guardrail-only; the
    normal-finding case broadens to both kinds.
  - **passing.md residual:** none. Only `passing.md:10` is command-presupposing, and the Topic-2
    body rewrite fully covers req 9's spawn-block clause; reviewers are named in its Agents list
    (`passing.md:11`). `passing.md:13-17` ("Guardrail scopes to fill") targets the four plan agents,
    not reviewers, and is out of scope.
  - **Both reviewers mirror**, with two pre-existing intentional differences to preserve:
    code-reviewer says "finally approve" / doc-reviewer "approve" (`:43` vs `:45`); doc-reviewer's
    no-guardrails branch cites the "accuracy spot-check," code-reviewer's the "step-2/3 judgment."
- **Decision:**
  1. **Checks table → `| Check | Guardrail | Result |`**, Result ∈ **satisfied | unsatisfied |
     skipped**. The `Guardrail` column shows the body (command for a command guardrail, rule for a
     judgment guardrail). Re-gloss the table comment: a skipped row shows the guardrail but it was
     not evaluated this iteration; a forgotten guardrail is an absent row; a deliberately skipped one
     is a present skipped row; an evaluated one is a present satisfied/unsatisfied row. **State the
     rationale as both-kinds-fit + terminology reuse, not as a prohibition on "pass/fail"** — so a
     downstream reviewer doesn't think bare pass/fail was banned (reqs 7, 9).
  2. **Gate-running step (provisional-approve branch):** "evaluate every guardrail … recording each
     result in the Checks table. Evaluate a command guardrail by running the command its body names
     and checking whether the check it describes is satisfied; evaluate a judgment guardrail by
     assessing whether its rule is satisfied. To approve, every guardrail must be satisfied in this
     iteration. A guardrail you find unsatisfied is itself a rejection finding: your verdict becomes
     reject, and you may leave any remaining guardrails unevaluated (recorded as skipped). Never
     bypass a guardrail to force it (no `--no-verify`, no `skip`, no commented-out checks)." Keep
     code-reviewer's "finally approve" / doc-reviewer's "approve" distinction (reqs 7, 8, 9).
  3. **Reject branch + skipped:** keep "record each guardrail as skipped … so the skip reads as
     deliberate rather than forgotten," with "gates"→"guardrails" and the run framing softened to
     evaluation (req 9).
  4. **No-guardrails branch:** keep verbatim except "gates to run"→"guardrails to evaluate"; each
     reviewer keeps its own fallback evidence clause (req 11 intent for reviewers).
  5. **Blocker guideline:** normal-finding list broadens to "a command guardrail whose check is not
     satisfied, a judgment guardrail you assess as violated"; the blocker example becomes "a declared
     command guardrail cannot run" (judgment guardrails excluded by construction). Drops "exits
     non-zero" (reqs 8, 9). Also align the "Run the guardrails" guideline bullet
     (`code-reviewer.md:113` / `doc-reviewer.md:114`) to "evaluate every guardrail … approve only if
     all are satisfied."
  6. **Must-fix/reject preserved:** an unsatisfied guardrail of either kind is a rejection finding
     driving the verdict to reject through the existing must-fix machinery; binary approve/reject
     unchanged (req 8). No edit to the verdict machinery itself.
  7. **Spawn-time block:** no reviewer-specific edit beyond the Topic-2 `passing.md:10` body rewrite
     (req 9).
- **Rationale:** "evaluate" + "satisfied/unsatisfied" are the minimal kind-neutral generalizations
  of "run" + "pass/fail," and both reuse the spec's own words. The Checks table broadens by one
  header relabel and a Result-value swap — no new column, no kind flag (req 14). The blocker
  asymmetry falls out of the fact that a judgment guardrail can always be assessed.

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->
