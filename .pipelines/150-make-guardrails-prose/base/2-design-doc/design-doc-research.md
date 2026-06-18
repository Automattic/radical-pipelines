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

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->
