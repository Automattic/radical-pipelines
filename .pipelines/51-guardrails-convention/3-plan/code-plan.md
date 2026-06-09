# Code plan: Guardrails convention

Issue #51. This plan turns the spec (`1-spec/spec.md`, R1–R17 / AC1–AC12) and the
design doc (`2-design-doc/design-doc.md`, D1–D9, Risks 1–5) into an ordered set of
standalone code-phase tasks. It is self-contained: each task names exact file
paths and line anchors, states its changes, and lists its acceptance.

This is a **self-referential** change — the edit targets live in this very
repository (the worktree at
`/Users/darerodz/Code/radical-pipelines/.claude/worktrees/51-guardrails-convention`).
There is **no new executable code** (design §2.1): every change is to documentation
markdown plus one declared example and one changeset file. The plan does not author
tests (there is no code to test) and does not write user-facing documentation
(README / website / per-tool human rule files are the **docs phase's** job — spec
Out-of-Scope, design §9).

All paths below are repo-relative to the worktree root above. Line numbers cite the
file state at planning time; treat them as anchors, not contracts — match on text.

## Overview

### What changes and why

Radical Pipelines code/docs agents already loop on a project's verification gates
until they pass, but the thing they reach for — *"the host project's verification
convention"* — is never declared anywhere. This work introduces **Guardrails**: a
named set of deterministic, exit-code-judged, mandatory verification commands a
project declares once, modeled as a **sibling** of conventions (not one of them,
because a command like `npm test` is identical regardless of the active tool).

The change is concentrated in eight files plus one new changeset:

1. Root `.rp.md` — restructure into `## Conventions` + `## Guardrails`; declare this
   repo's two real gates as the worked example (T2).
2. `conventions/load.md` — the canonical definition of a guardrail and how to load
   the guardrails applicable to a phase, including the committed-only rule (D5) (T3).
3. `conventions/setup.md` — a new optional capture step, with trailing steps
   renumbered (T4).
4. `conventions/pi.md` — renumber-proof its one external `setup.md` step reference
   (T5, depends on T4).
5–8. The four phase agents `code-writer.md`, `code-reviewer.md`, `doc-writer.md`,
   `doc-reviewer.md` — swap the command-gate "verification convention" references for
   Guardrails, make behavior/accuracy verification self-contained, and fix the
   blocker rule (T6–T9).
9. `.changeset/*.md` — this PR's own changeset (T10, **must not be dropped** — design
   Risk 1).

### Ordering rationale

- **T1 (terminology contract)** is read-only groundwork the writer agents reference;
  it produces no file change but pins the canonical phrasing so T2–T9 stay
  consistent and greppable. It is folded into T2 as the first task touching prose.
- **T2 and T3** are independent of each other but T3 holds the *definition of
  record*; if executed in parallel, both must use the canonical phrase from §5 of
  the design. Listed T2 then T3 for reading order; neither depends on the other.
- **T4 must precede T5** — T5 fixes a reference that only becomes stale once T4
  inserts the new step.
- **T6–T9** (the four agents) are mutually independent and independent of T2–T5.
- **T10 (changeset)** depends on nothing structurally but is logically last — it
  describes the whole PR's release impact. It is in the **code phase** because the
  `validate-changesets` guardrail this work declares applies to the code phase, and
  CI's presence check would otherwise block the PR (design Risk 1).

### Cross-cutting decisions baked into this plan

- **`.rp.md` H1 title decision (must-address #2).** The H1 `.rp.md:1`
  ("# Radical Pipelines project conventions") goes stale the moment the file also
  holds a `## Guardrails` sibling that is deliberately *not* a convention. Because
  the D2 intro rewrite on the very next line (`.rp.md:3`) will describe the file as
  holding this project's **conventions and guardrails**, an H1 naming only
  "conventions" would contradict its own intro within two lines. **Decision: broaden
  the H1** to name the file's content generically (e.g.
  `# Radical Pipelines project configuration`) so the title, intro, and the two
  sibling sections agree. This is a meaning-preserving fix to a now-stale title,
  inside R6/R7 and outside the out-of-scope per-tool redesign. Baked into T2's
  changes and acceptance.
- **D5 — committed-only / not locally overridable.** Carried explicitly by T3 (the
  loader edit): the `## Guardrails` section in `load.md` must state that guardrails
  are committed-only and the `.rp.local.md` override mechanism applies to
  *conventions* only.
- **Canonical selection phrase (design §5).** The phrase *"the guardrails applicable
  to the [code|docs] phase"* is used **verbatim** in T3 and in T6–T9 so AC9 maps 1:1
  and is greppable.
- **Terminology casing (design §5).** "Guardrails"/"Guardrail" (capital) for the
  concept and headings; "guardrail" (lowercase) for an individual entry and in
  running prose.

### Acceptance-criteria coverage map

| AC | Covered by task(s) |
| --- | --- |
| AC1 `## Conventions` + `## Guardrails`, prior content preserved | T2 |
| AC2 each entry states name, command, phase(s) | T2, T3 |
| AC3 no tool-specific variants | T2, T3 |
| AC4 no-guardrails passes completeness check | T3 |
| AC5 agent runs none, no blocker, proceeds | T6, T7 (code); T8, T9 (docs) |
| AC6 load.md explains both, how to load, not a table row | T3 |
| AC7 setup.md captures guardrails, optional, distinct | T4 |
| AC8 no "verification convention" naming the command gates | T6, T7, T8, T9 |
| AC9 runs every applicable guardrail, mandatory, completes only when all pass | T6, T7, T8, T9 |
| AC10 failing guardrail = work to fix, not bypassed | T6, T7, T8, T9 |
| AC11 behavior/accuracy verification + other conventions intact | T6, T7, T8, T9 |
| AC12 root `.rp.md` uses new structure, real gates declared | T2 |

Every spec acceptance criterion is covered. R-level coverage follows the design's
§11 mapping; the changeset obligation (design Risk 1 / §10) is covered by T10.

---

## Task 1 — Pin the terminology and selection-phrase contract (groundwork)

**Goal.** Establish the exact vocabulary and the one verbatim selection phrase that
every prose edit in this plan must reuse, so the result is internally consistent and
greppable. This task produces **no standalone file change**; it is a contract that
T2–T9 implement. It exists so no later task silently invents its own wording.

**Files to change.** None directly. (The contract is applied within T2, T3, T6–T9.)

**Changes.**

- Adopt the casing rule (design §5 "Terminology"):
  - **"Guardrails"** (capital G) — the named concept and section headings
    (`## Guardrails`, "the project's Guardrails for this phase").
  - **"guardrail"** (lowercase) — an individual entry/row and in running prose
    ("each guardrail", "run every guardrail applicable to…", "a guardrail that
    fails").
- Adopt the **canonical selection phrase**, used verbatim wherever an agent or the
  loader selects which guardrails to run:
  > the guardrails applicable to the [code|docs] phase
  where `[code|docs]` is replaced by the concrete phase of the consuming agent
  (`code` for T6/T7, `docs` for T8/T9). The phrase is a filter over a set — *the rows
  of `## Guardrails` whose Phases column includes this phase* — and must not branch on
  *why* the set is empty (so absent-section and no-matching-rows collapse to "run
  none, proceed").
- Adopt the **guardrail entry format** (design §3): a markdown table with columns
  **Name | Command | Phases**, command in backticks, Phases values drawn from
  `code` and/or `docs`.

**Depends on.** Nothing.

**Traces to.** R1–R4 (definition), design §3, §5.

**Acceptance.**
- The casing rule, the verbatim selection phrase, and the table format are applied
  consistently across the files produced by T2, T3, T6–T9 (verified within each of
  those tasks' acceptance).

---

## Task 2 — Restructure root `.rp.md` and declare the worked example

**Goal.** Restructure this repository's own root `.rp.md` into the two-section shape
(`## Conventions` + `## Guardrails`), reconcile the stale title and intro, and
declare this repo's two **real** command gates as the worked example.

**Files to change.**
- `.rp.md`

**Changes.**

1. **Broaden the H1 title** (`.rp.md:1`, must-address #2). Change
   `# Radical Pipelines project conventions` to a title that names the file's content
   generically now that it holds both conventions and guardrails — e.g.
   `# Radical Pipelines project configuration`. (Wording at the writer's discretion so
   long as it no longer implies the file holds *only* conventions and agrees with the
   rewritten intro.)
2. **Reconcile the stale intro** (`.rp.md:3`, design D2). The current sentence claims
   "the per-tool sections add conventions specific to Claude Code and Pi" — but **no
   per-tool sections exist in this file** (per-tool rules live in
   `conventions/claude-code.md` / `conventions/pi.md`, loaded conditionally). Rewrite
   the intro to describe the file as holding this project's **conventions** and its
   **guardrails**, dropping the false per-tool claim. It may optionally point readers
   to the per-tool reference files. Meaning-preserving fix to an already-wrong
   sentence (R6/R7); do **not** redesign the per-tool layout.
3. **Rename `## Shared conventions` → `## Conventions`** (`.rp.md:5`, design D1).
   **All `###` children move with it, copied verbatim** — "Managing tasks", "Pipeline
   slugs", "Artifact folders", "Commit format", "Worktrees", "Branch names", "Team
   spawning", "Health monitoring" and all their sub-content (`.rp.md:7`–`81`) are
   unchanged in wording and meaning (R7). Do **not** wrap the content in a
   `## Conventions` > `## Shared conventions` nesting; the rename is flat.
4. **Add a new sibling `## Guardrails` section** after the `## Conventions` section
   (i.e. after the current end of file, `.rp.md:81`). It contains:
   - A one-line echo of what a guardrail is (the full definition lives in `load.md`
     per design D3): an exact command judged by exit code, mandatory within the
     phase(s) it applies to, tool-agnostic.
   - The worked-example table (design §4), declaring this repo's **real** gates with
     no new tooling invented:

     | Name | Command | Phases |
     | --- | --- | --- |
     | Unit tests | `npm test` | code |
     | Changeset shape | `node scripts/validate-changesets.mjs` | code, docs |

   - Phase mapping is fixed by design §4: `npm test` exercises `scripts/*.mjs` with no
     doc-tests → **code** only; `node scripts/validate-changesets.mjs` checks
     `.changeset/*.md` shape, and both the code phase (edits `skills/**`, `agents/**`,
     `.claude-plugin/**`) and the docs phase (edits `README.md`) touch
     release-relevant paths → **code, docs**.
   - Do **not** add CI's third check `npx changeset status --since=origin/<base>` — it
     is PR-base-relative, has no fixed exact command, and does not fit the guardrail
     shape (design §4 "Deliberately excluded").

**Depends on.** T1 (terminology + table format).

**Traces to.** R6, R7, R17, AC1, AC2, AC3, AC12; design D1, D2, §3, §4.

**Acceptance.**
- The file has exactly two top-level sections: `## Conventions` and `## Guardrails`,
  in that order, as siblings (AC1).
- Every `###` child and all content previously under `## Shared conventions` is
  present under `## Conventions`, unchanged in wording and meaning (AC1, R7).
- The H1 title no longer states the file holds only conventions, and the intro
  sentence no longer claims per-tool sections exist in the file; the intro names both
  conventions and guardrails (D2, must-address #2).
- The `## Guardrails` section contains exactly the two-row table above, each row
  stating a Name, an exact Command in backticks, and Phases drawn from `code`/`docs`
  (AC2, AC12).
- There is no per-tool column or per-tool variant anywhere in the section (AC3).
- No new gate tooling is referenced; only `npm test` and
  `node scripts/validate-changesets.mjs` appear (R17, AC12).

---

## Task 3 — Add the canonical Guardrails definition to `load.md`

**Goal.** Make `conventions/load.md` — the file every workflow reads at start — the
single definition of record for guardrails: what a guardrail is, how to load the
guardrails applicable to a phase, that absent/empty is valid and never a blocker, and
that guardrails are committed-only (D5). Keep guardrails out of the conventions table
and the completeness check.

**Files to change.**
- `skills/radical-pipelines/reference/conventions/load.md`

**Changes.**

1. **Broaden the intro by one clause** (`load.md:5`). The current line says
   "Project-specific conventions are stored in the `.rp.md` file." Extend it to state
   that `.rp.md` holds the project's **conventions and guardrails** (R9), without
   otherwise changing the surrounding load-at-start instruction.
2. **Add a new `## Guardrails` section** placed **after `## Missing conventions`**
   (currently ends at `load.md:29`) and **before `## Local overrides`** (currently
   `load.md:31`). Reading order becomes: load conventions → check completeness →
   understand guardrails → apply local overrides (design D4). The section states:
   - **What a guardrail is** — a mandatory verification gate defined as an exact
     command judged solely by exit code (0 = pass, non-zero = fail); "run the tests"
     is not a guardrail, `npm test` is (R1).
   - **Where they live** — in `.rp.md`'s `## Guardrails` section, a sibling of
     `## Conventions`, as a table with columns **Name | Command | Phases**; the only
     valid Phases values are `code` and/or `docs` (R2, R3).
   - **Tool-agnostic** — the same guardrails apply regardless of the active agentic
     coding tool; there are no per-tool guardrail variants (R4).
   - **How to load/select for a phase** — read `.rp.md`'s `## Guardrails` table and
     select **the guardrails applicable to the [code|docs] phase**: the rows whose
     Phases column includes the current phase. Use the verbatim canonical phrase from
     T1 (R9, AC6).
   - **Optionality / empty state** — an **absent** `## Guardrails` section, or a
     present-but-empty one, both mean "this project has no command gates." This is a
     **valid, complete state — never a blocker**; selecting the guardrails for a phase
     when none apply yields the empty set, and the agent runs none and proceeds (R5,
     AC4; collapses to the same behavior whether absent or no-matching-rows).
   - **Committed-only (D5)** — state in one sentence that **guardrails are
     committed-only and not locally overridable**: the `.rp.local.md` local-override
     mechanism (the `## Local overrides` section) applies to *conventions* only, so a
     developer cannot weaken or null out a mandatory gate in their working copy. (This
     sentence may instead/also be placed as a half-sentence in `## Local overrides`,
     but it **must** appear; do not omit it.)
3. **Do NOT add a Guardrails row to the conventions table** (`load.md:11`–`21`) and
   **do NOT change `## Missing conventions`** (`load.md:23`–`29`). The completeness
   check operates only on rows carrying a `Required?` value; a guardrail has no such
   row, so a project with no guardrails passes the check **by construction** (design
   D4, AC4, R10). Leaving that check untouched is the proportionate choice.

**Depends on.** T1 (definition phrasing, selection phrase). Independent of T2.

**Traces to.** R1–R5, R9, R10, AC4, AC6; design D3, D4, D5.

**Acceptance.**
- `load.md`'s intro states `.rp.md` holds both conventions and guardrails (R9).
- A new `## Guardrails` section exists, positioned after `## Missing conventions` and
  before `## Local overrides` (D4).
- The section defines a guardrail (exact command, exit-code pass/fail), states the
  Name/Command/Phases shape with `code`/`docs` as the only phase targets, states
  tool-agnosticism, and explains how to select **the guardrails applicable to the
  [code|docs] phase** using that verbatim phrase (R1–R4, R9, AC6).
- The section explicitly states that absent/empty Guardrails is a valid, complete
  state and never a blocker (R5, AC4).
- The section (or `## Local overrides`) states that guardrails are committed-only and
  not locally overridable (D5).
- Guardrails are **not** a row in the conventions table and `## Missing conventions`
  is unchanged; a project with no guardrails still passes the completeness check
  (R10, AC4, AC6).

---

## Task 4 — Add an optional guardrails-capture step to `setup.md`

**Goal.** Add a setup step that captures the project's guardrails during setup,
presented as a distinct, optional concept from conventions (one capture step per
item, matching the house pattern), and renumber the trailing steps.

**Files to change.**
- `skills/radical-pipelines/reference/conventions/setup.md`

**Changes.**

1. **Insert a new top-level step `## 3. Capture guardrails (optional)`** as a sibling
   of step 2 "Collect required conventions", i.e. immediately after the current step 2
   (which ends at `setup.md:170`, before the current `## 3. Apply agentic coding tool
   setup actions` at `setup.md:171`). It is a top-level `##` step — **not** a `###`
   sub-block inside step 2 — because step 2 is titled "Collect required
   **conventions**" and a guardrail is not a convention; a sibling step makes the
   "distinct concept" status structural (design D6, AC7). `(optional)` in the heading
   satisfies "marked optional" at a glance (AC7).
2. **Step content** mirrors the house pattern (design D6 "Capture-step content"):
   - A short prose intro: guardrails are the project's mandatory verification gates;
     this step is optional and "none" is a complete, valid answer (the project may
     have no command gates).
   - One self-contained sentence on what a guardrail is — an exact command, pass/fail
     by exit code, applies to the `code` and/or `docs` phase. (Self-contained because
     setup may run before `load.md`'s model is established — design D3.)
   - An elicitation paragraph asking the owner, **per gate**, for a **name**, the
     **exact command**, and the applicable **phase(s)** (`code`/`docs`); prompt them
     to consider lint / typecheck / unit / e2e / build and project-specific
     validators, but capture **only** gates that actually exist (no invention).
   - A one-clause note on **tool-agnosticism** — the same command regardless of active
     tool, captured once, no per-tool variant (worth stating because several
     *conventions* in this same file *are* per-tool).
   - A reworked `Suggested default:` line, e.g.: "none — guardrails are
     project-specific; capture each gate's name, exact command, and applicable
     phase(s), or record that the project has no command gates."
3. **Renumber the trailing steps** (design D6): `## 3. Apply agentic coding tool setup
   actions` → `## 4.`; `## 4. Confirm writes before changing files` → `## 5.`;
   `## 5. Write human-readable Markdown` → `## 6.`; `## 6. Set up git ignore` →
   `## 7.`; `## 7. Finish safely` → `## 8.` (current `setup.md:171`, `179`, `188`,
   `195`, `203`).
4. **Touch the two write steps** so the written/confirmed `.rp.md` includes the
   captured guardrails alongside the conventions: in the renumbered "Confirm writes"
   step (was `## 4.`, `setup.md:179`–`186`) and "Write human-readable Markdown" step
   (was `## 5.`, `setup.md:188`–`193`), ensure the proposed-content summary and the
   written file cover the `## Guardrails` section when guardrails were captured. Keep
   these edits minimal — only enough that a captured guardrail is actually written
   into `.rp.md` and shown in the pre-write summary.
5. Do **not** make guardrails a *required* convention and do **not** add them to the
   required-conventions list or the missing-conventions stop logic — capture is
   optional (R5, R11).

**Depends on.** T1 (definition phrasing). Independent of T2, T3. **Must precede T5**
(which fixes a reference rendered stale by the renumber).

**Traces to.** R11, AC7; design D6.

**Acceptance.**
- `setup.md` contains a top-level step `## 3. Capture guardrails (optional)`,
  positioned as a sibling immediately after step 2 and before the former step 3 (now
  renumbered) (AC7, D6).
- The step is marked optional (heading and prose state "none" is valid) and presents
  guardrails as distinct from conventions (AC7).
- The step elicits, per gate, a name, exact command, and applicable phase(s), prompts
  for the usual gate categories without inventing gates, and notes tool-agnosticism
  (R11, D6).
- The former steps 3–7 are renumbered to 4–8 with no other content change to those
  steps beyond the two write-step touches in change 4.
- The write/confirm steps cause a captured `## Guardrails` section to be summarized
  before writing and written into `.rp.md`.
- Guardrails are not added to any required-conventions or missing-conventions logic
  (R5, R11).

---

## Task 5 — Renumber-proof the one external `setup.md` step reference in `pi.md`

**Goal.** Fix the single external reference to a `setup.md` step number so the
guardrails-step insertion (T4) does not leave it stale, making it durable against
future insertions.

**Files to change.**
- `skills/radical-pipelines/reference/conventions/pi.md`

**Changes.**

1. At `pi.md:45`, the sentence "Step 3 of `setup.md` installs them after conventions
   have been collected." points at the step that T4 renumbers from `## 3` to `## 4`.
   **Make the reference number-free** rather than bumping the number: replace
   "Step 3 of `setup.md`" with a wording that names the step by its title, e.g.
   "the **Apply agentic coding tool setup actions** step of `setup.md`". This is more
   durable (future insertions never break it again) and is the design's chosen fix
   (D7). Do not otherwise change `pi.md`.
2. This is confirmed to be the **only** external reference to a `setup.md` step number
   (verified at planning time: `claude-code.md` has none; the README links to the
   whole file anchorlessly; all other "step N" hits are file-local or in artifacts).
   No other file needs this edit.

**Depends on.** T4 (the renumber is what makes the old reference stale).

**Traces to.** Consequence of R11; design D7.

**Acceptance.**
- `pi.md:45` no longer references a `setup.md` step by number; it names the step by
  its title ("Apply agentic coding tool setup actions") and still correctly points at
  the agent-install step (D7).
- No `setup.md` step-number reference remains anywhere outside `setup.md` itself and
  the pipeline artifacts.

---

## Task 6 — Update `code-writer.md` to use Guardrails

**Goal.** Replace the command-gate "verification convention" references in
`agents/code-writer.md` with the project's Guardrails, drop "behavior verification"
from the gate enumeration, make behavior verification a self-contained evidence-based
step, and fix the blocker rule so "no applicable guardrails" is not a blocker — while
leaving every R16-protected other-convention reference untouched.

**Files to change.**
- `agents/code-writer.md`

**Changes.** Apply the design's role classification (D8: A = command-gate role,
B = behavior-verification dependency, C = blocker rule, R16-leave = untouched). The
specific edit surface (the full set, not a literal grep — design Risk 4):

1. **(A) `code-writer.md:13`** — "Read the host project's verification convention."
   Replace with reading **the guardrails applicable to the code phase** (per
   `load.md`), i.e. the project's Guardrails for this phase.
2. **(B) `code-writer.md:36`** (Behavior verification step) — the user-observable
   behavior is "exercised end-to-end using the host project's verification
   convention." Make this **self-contained and evidence-based**: the agent exercises
   the changed behavior and captures the required evidence (screenshots, transcripts,
   output samples, response diffs) as a self-contained step, **without** depending on
   a named verification convention. Keep the inline evidence list (R15). This step
   remains a separate step — it is **not** reclassified as a guardrail.
3. **(A + Risk 3) `code-writer.md:44`–`46`** (step 5 "Validate against the project's
   gates") — currently "The host project's verification convention defines a set of
   gates — unit tests, end-to-end tests, type checks, lints, build, **behavior
   verification**, anything else the project requires." This line must do **two**
   things (design Risk 3, the single easiest-to-miss R15 edit): (a) convert it to the
   guardrails model — the agent runs **every guardrail applicable to the code phase**,
   treating each as mandatory; **and** (b) **remove "behavior verification" from the
   enumeration**, since behavior verification is not a guardrail (R15). Consider
   renaming the step heading "Validate against the project's gates" →
   "Validate against the project's guardrails" for vocabulary consistency (design §10
   open question; recommended, "gates" tolerable).
4. **(A) `code-writer.md:48`** — "Run every gate documented in the convention, exactly
   as documented." Re-anchor to the guardrails: run every guardrail applicable to the
   code phase, exactly as written; do not invent commands; do not omit guardrails.
   (This is a Risk-4 back-reference — it says "the convention" without the literal
   "verification convention" — and **must** be edited.)
5. **(A) `code-writer.md:50`** — preserve the no-bypass language **verbatim except
   gate→guardrail** (R13/AC10): a failing guardrail is work to fix, not a blocker; do
   not bypass it (no `--no-verify`, no `skip`, no commented-out checks).
6. **(C) `code-writer.md:51`** — delete the standalone blocker line "If the
   verification convention itself is missing or unrunnable, that **is** a blocker…"
   and **replace it with a positive optionality sentence** (design D9): *"If no
   guardrails apply to this phase, run none and proceed — that is not a blocker."* Do
   **not** reintroduce an "unrunnable = blocker" rule: a command that cannot run exits
   non-zero → it is a **FAIL** → work to fix, not a blocker (design D9 edge case).
7. **(C) `code-writer.md:70`** (Guidelines "Stop and report blockers") — strike the
   in-list clause "or the verification convention is missing" from the parenthetical
   examples, leaving the surrounding genuine broken-input blockers (task block
   references a nonexistent component, mutually contradictory Acceptance, etc.) intact
   (R14, Risk 4).

**R16-leave — do NOT change** (R16, design Risk 5 mis-sweep traps):
- `code-writer.md:29` "inline API-documentation convention".
- `code-writer.md:38` "host project's UI conventions".
- `code-writer.md:42` "host project's testing convention" (sits next to the e2e/
  behavior material — keep it separate; do not sweep it).
- `code-writer.md:56` commit-format reference ("host project's commit format").
- `code-writer.md:68` "Follow project conventions."

**Depends on.** T1 (selection phrase, casing). Independent of T2–T5, T7–T9.

**Traces to.** R12, R13, R14, R15, R16; AC5, AC8, AC9, AC10, AC11; design D8, D9,
Risk 3, Risk 4, Risk 5.

**Acceptance.**
- A search of `code-writer.md` for "verification convention" returns **no** occurrence
  that names it as the source of the command gates; the command-gate references
  instead select the project's Guardrails for the code phase (AC8, R12). The Risk-4
  back-reference at `:48` is among those re-anchored.
- The gate enumeration no longer lists "behavior verification"; behavior verification
  survives as a separate, self-contained, evidence-based step naming its own evidence
  (R15, AC11, Risk 3).
- The agent runs **every guardrail applicable to the code phase**, treats each as
  mandatory, and does not complete while any fails; the no-bypass language is
  preserved (gate→guardrail) (R13, AC9, AC10).
- The missing-convention blocker is gone; in its place a sentence states that no
  applicable guardrails is not a blocker — run none and proceed (R14, AC5); no
  "unrunnable = blocker" rule is introduced (AC10).
- All five R16-leave references above are unchanged (R16, AC11).

---

## Task 7 — Update `code-reviewer.md` to use Guardrails

**Goal.** Apply the same role-A/B/C edits to `agents/code-reviewer.md`: command-gate
references become the project's Guardrails for the code phase; behavior verification
stays a separate evidence-based step; the missing-convention blocker is removed;
R16-protected references stay untouched.

**Files to change.**
- `agents/code-reviewer.md`

**Changes.**

1. **(A) `code-reviewer.md:18`** — "Read the host project's verification convention."
   Replace with reading **the guardrails applicable to the code phase**.
2. **(A) `code-reviewer.md:32`** ("No regressions / verification gates pass" check) —
   "run the host project's verification convention exactly as documented; record each
   gate's command and result." Re-anchor: run **every guardrail applicable to the code
   phase** exactly as written, recording each guardrail's command and result. (This is
   also a Risk-4 surface — "verification gates" carries the role.)
3. **(B) `code-reviewer.md:36`** (Behavior verification step) — make self-contained and
   evidence-based: if any task changes user-observable behavior, exercise it
   end-to-end and capture the required evidence; "a verification claim without
   evidence is not a verification — either produce the evidence or reject the batch."
   Drop the named-convention dependency, keep the evidence requirement (R15).
4. **(B) `code-reviewer.md:68`** (review-template comment) — "Evidence as required by
   the host project's verification convention." Make it name evidence self-containedly
   (e.g. "Evidence for the behavior verification") without the named-convention
   dependency (R15).
5. **(C) `code-reviewer.md:98`** (Guidelines "Stop and report blockers") — strike the
   in-list clause "the verification convention is undefined" from the broken-input
   examples, leaving the genuine broken-input blockers (`code-plan.md`/`spec.md`/
   `design-doc.md` missing or unreadable, batch metadata missing) intact (R14,
   Risk 4). `code-reviewer` has no standalone "no guardrails is not a blocker"
   sentence to add — per design D9 the positive optionality sentence is added to the
   two code/doc **writer**-style agents that carried the standalone blocker line; the
   reviewer's blocker list simply loses the missing-convention clause. (If, on reading,
   the reviewer still implies missing gates block, add the positive optionality
   sentence here too so AC5 holds for the code phase reviewer.)

**R16-leave — do NOT change** (R16, Risk 5):
- `code-reviewer.md:30` "inline API-documentation convention".
- `code-reviewer.md:31` "coding, testing, build, and commit conventions" (sits
  directly above the verification-gates check at `:32` — classic mis-sweep adjacency;
  keep it separate).
- `code-reviewer.md:84` commit-format reference.

**Depends on.** T1. Independent of T2–T6, T8, T9.

**Traces to.** R12, R13, R14, R15, R16; AC5, AC8, AC9, AC10, AC11; design D8, D9,
Risk 4, Risk 5.

**Acceptance.**
- No "verification convention" occurrence in `code-reviewer.md` names the command-gate
  source; the command-gate references (including the `:32` "verification gates"
  back-reference) select the project's Guardrails for the code phase (AC8, R12).
- The reviewer runs every guardrail applicable to the code phase, records each
  command and result, treats each as mandatory (R13, AC9); failing-guardrail no-bypass
  intent is preserved (AC10).
- Behavior verification remains a separate evidence-based step (no named convention)
  with the "no evidence = reject" rule intact (R15, AC11).
- The missing-convention clause is removed from the blocker list; a project with no
  applicable guardrails is not reported as a blocker (R14, AC5).
- The R16-leave references above are unchanged, including the adjacency at `:31`/`:32`
  (R16, AC11).

---

## Task 8 — Update `doc-writer.md` to use Guardrails

**Goal.** Apply the role-A/B/C edits to `agents/doc-writer.md` for the **docs** phase:
the doc-gate references become the guardrails applicable to the docs phase; accuracy
verification stays a separate self-contained step; the missing-convention blocker is
removed; tighten the doc-gate hedge into the deterministic guardrails model;
R16-protected references stay untouched.

**Files to change.**
- `agents/doc-writer.md`

**Changes.**

1. **(B) `doc-writer.md:35`** (Accuracy verification, "Runnable examples actually
   run") — "If the host project's verification convention supports doc tests, exercise
   them; otherwise trace by hand." Re-anchor to guardrails: if a guardrail applicable
   to the docs phase exercises doc tests / runnable examples, run it; otherwise trace
   by hand. Keep accuracy verification a **self-contained step** that names its own
   evidence (symbols/paths/keys/cross-links against shipped code, runnable examples) —
   it is the docs-phase analog of behavior verification and is **not** a guardrail
   (R15, design §1).
2. **(A) `doc-writer.md:39`–`44`** (step 4 "Validate against the project's
   documentation gates") — currently hedged around "The host project's verification
   convention may enumerate gates relevant to documentation…". Tighten into the
   deterministic guardrails model (design §2.2 "tighten the doc-gate hedge"): the
   agent runs **every guardrail applicable to the docs phase**, treating each as
   mandatory; many projects declare none, in which case the accuracy verification in
   step 3 is the only validation and that is acceptable (preserves the legitimate
   empty case — R5/AC5). Edit the back-reference lines `:42` ("If the convention
   enumerates doc gates…") and `:44` ("If the convention enumerates no doc gates…")
   to speak of guardrails applicable to the docs phase (Risk 4 — these lack the literal
   "verification convention" but carry the role). Consider renaming the heading
   "…documentation gates" → "…guardrails" for consistency (recommended; tolerable to
   keep).
3. **(A) `doc-writer.md:43`** — preserve the no-bypass language verbatim except
   gate→guardrail: a failing guardrail is work to fix, not a blocker; no `--no-verify`/
   `skip`/commented-out checks (R13, AC10).
4. **(C) `doc-writer.md:45`** — delete the standalone blocker line "If the verification
   convention itself is missing or unrunnable, that **is** a blocker…". Per design D9
   the doc agents "already carry an equivalent" optionality via the "enumerates none →
   accuracy verification is your only validation" path; ensure that path explicitly
   reads as *not a blocker* (the docs phase with no applicable guardrails runs none and
   proceeds). Do not reintroduce "unrunnable = blocker" (D9 edge case: unrunnable →
   FAIL → work to fix).
5. **(C) `doc-writer.md:65`** (Guidelines "Stop and report blockers") — strike the
   in-list clause "or the verification convention is missing" from the parenthetical
   examples, leaving the genuine broken-input blockers (task Files reference
   nonexistent paths, doc-plan named a surface no shipped code populates, design↔code
   drift) intact (R14, Risk 4).

**R16-leave — do NOT change** (R16, Risk 5):
- `doc-writer.md:17` "host project's documentation convention" (this is the
  documentation convention — an R16-protected item, not the command-gate verification
  convention).
- `doc-writer.md:27` "host project's documentation conventions".
- `doc-writer.md:63` "Follow project conventions."
- `doc-writer.md:60` (the Phase-4-ownership guideline) — unchanged.

**Depends on.** T1. Independent of T2–T7, T9.

**Traces to.** R12, R13, R14, R15, R16; AC5, AC8, AC9, AC10, AC11; design D8, D9,
Risk 4, Risk 5.

**Acceptance.**
- No "verification convention" occurrence in `doc-writer.md` names the command-gate
  source; the doc-gate references (including the `:42`/`:44` back-references) select
  the guardrails applicable to the docs phase (AC8, R12).
- Accuracy verification remains a separate, self-contained, evidence-naming step (its
  own symbols/paths/examples checks), not reclassified as a guardrail (R15, AC11).
- The agent runs every guardrail applicable to the docs phase, treats each as
  mandatory, preserves no-bypass language; when none apply, accuracy verification is
  the sole validation and that is explicitly not a blocker (R13, AC9, AC10, AC5).
- The missing-convention blocker is removed (R14, AC5).
- The documentation-convention and other R16-leave references are unchanged — in
  particular the documentation convention at `:17`/`:27` is **not** swept (R16, AC11).

---

## Task 9 — Update `doc-reviewer.md` to use Guardrails

**Goal.** Apply the same docs-phase role edits to `agents/doc-reviewer.md`: doc-gate
references become the guardrails applicable to the docs phase; the accuracy spot-check
stays a separate self-contained step; the missing-convention blocker is removed;
R16-protected references stay untouched.

**Files to change.**
- `agents/doc-reviewer.md`

**Changes.**

1. **(A) `doc-reviewer.md:33`** ("Doc gates" check) — "if the host project's
   verification convention enumerates documentation gates, run every one exactly as
   documented and record each in the Checks table. Many projects enumerate none; in
   that case, the accuracy spot-check in step 3 is the sole gate." Re-anchor to
   guardrails: run **every guardrail applicable to the docs phase** exactly as written,
   recording each in the Checks table; if none apply, the accuracy spot-check is the
   sole validation (R5/AC5 empty case preserved).
2. **(A) `doc-reviewer.md:98`** (Guidelines "Run the gates if any exist") — "If the
   host project's verification convention enumerates doc gates, a review without their
   evidence is not a review. If it enumerates none, the accuracy spot-check is your
   only evidence." Re-anchor to the guardrails applicable to the docs phase; keep the
   "no guardrails apply → accuracy spot-check is your only evidence" path (Risk 4
   back-reference).
3. **(C) `doc-reviewer.md:99`** (Guidelines "Stop and report blockers") — strike the
   in-list clause "the verification convention is undefined" from the broken-input
   examples, leaving the genuine broken-input blockers (`doc-plan.md`/`spec.md`/
   `design-doc.md`/shipped code missing or unreadable, batch metadata missing) intact
   (R14, Risk 4). Ensure a docs phase with no applicable guardrails is not treated as a
   blocker (AC5).

**R16-leave — do NOT change** (R16, Risk 5):
- `doc-reviewer.md:6` "convention violations" / "convention compliance" framing.
- `doc-reviewer.md:19` "host project's documentation convention".
- `doc-reviewer.md:32` "host project's documentation conventions".

**Depends on.** T1. Independent of T2–T8.

**Traces to.** R12, R13, R14, R15, R16; AC5, AC8, AC9, AC10, AC11; design D8, D9,
Risk 4, Risk 5.

**Acceptance.**
- No "verification convention" occurrence in `doc-reviewer.md` names the command-gate
  source; the doc-gate references (including the `:98` back-reference) select the
  guardrails applicable to the docs phase (AC8, R12).
- The reviewer runs every guardrail applicable to the docs phase and records each in
  the Checks table; when none apply, the accuracy spot-check is the sole evidence and
  that is not a blocker (R13, AC9, AC5).
- The accuracy spot-check remains a separate self-contained evidence step (R15, AC11).
- The missing-convention clause is removed from the blocker list (R14, AC5).
- The documentation-convention and other R16-leave references are unchanged (R16,
  AC11).

---

## Task 10 — Author this PR's changeset (must not be dropped — design Risk 1)

**Goal.** Add the `.changeset/*.md` file this PR requires. #51 edits release-relevant
paths (`agents/**`, `skills/**` in the code phase; `README.md` in the docs phase) that
are all in `.changeset/config.json` `changedFilePatterns`, so CI's presence check
(`npx changeset status`) fails without a changeset. This is currently **no agent's
documented job** (a repo-wide grep finds no "changeset" in `agents/` or `skills/`), so
it must be an explicit task here. It belongs to the **code phase** because the
`validate-changesets` guardrail this work declares (T2) applies to the code phase, and
the PR is blocked without it (design Risk 1 / §10 — the one actionable follow-through).

**Files to change.**
- `.changeset/<descriptive-slug>.md` (new file; choose a slug such as
  `guardrails-convention.md`, consistent with existing
  `.changeset/local-convention-overrides.md`, `.changeset/per-agent-model-config.md`).

**Changes.**

1. Create a new changeset file with the canonical front matter and a `minor` bump,
   matching the form of prior feature changesets in this repo:

   ```markdown
   ---
   "@automattic/radical-pipelines": minor
   ---

   <summary>
   ```

   - Package name is `@automattic/radical-pipelines` (verified against existing
     changesets and `package.json`).
   - Bump is `minor` — this adds a feature (the Guardrails concept) without breaking
     existing behavior, matching prior feature changesets (`local-convention-overrides`,
     `per-agent-model-config`). Per CONTRIBUTING.md the validator hard-rejects `major`
     pre-1.0; `minor` is the breaking/feature ceiling. This is **not** a breaking
     change, so no `BREAKING:` prefix.
   - Summary in imperative mood (CONTRIBUTING.md "Changeset summaries"), describing the
     user-facing change: introduce Guardrails — a project's named, exact-command,
     exit-code-judged verification gates declared once in `.rp.md`'s new `## Guardrails`
     section (sibling of `## Conventions`), loaded per code/docs phase, run by the
     code/docs agents as mandatory checks; note the loader/setup documentation and this
     repo's dogfooded gates (`npm test`, `node scripts/validate-changesets.mjs`).
2. The file must satisfy `node scripts/validate-changesets.mjs` (the shape guardrail) —
   well-formed front matter, known bump type, non-empty summary. The writer agent
   should run that guardrail (declared in T2) against the new changeset as part of its
   verification.

**Depends on.** Logically last (describes the whole PR's release impact). No structural
dependency on T2–T9, but should reflect the change they make. Can be authored in
parallel; placed last so its summary reflects the final scope.

**Traces to.** Design Risk 1, §7, §10; CONTRIBUTING.md "When a changeset is required".

**Acceptance.**
- A new `.changeset/*.md` file exists with `"@automattic/radical-pipelines": minor`
  front matter and a non-empty imperative-mood summary describing the Guardrails
  feature.
- `node scripts/validate-changesets.mjs` passes on the new file (the shape guardrail
  declared in T2).
- The summary is `minor` (not `major`, no `BREAKING:` prefix) and matches the register
  of the existing feature changesets in `.changeset/`.

---

## Notes for the code phase (not tasks)

- **Out of scope here (docs phase owns it).** Do **not** edit `README.md` (lines 143,
  145, 159 still describe `.rp.md` with a stale "shared section / per-tool section"
  framing — same staleness D2 fixes in `.rp.md`, but README is user-facing and is the
  **docs phase's** responsibility), the website, or the per-tool human rule files
  (`conventions/claude-code.md` / `conventions/pi.md`) **for human documentation**.
  T5's `pi.md` edit is a narrow renumber-proofing fix, not user-facing documentation.
  Do **not** rename CI workflow names or CI's "gate" naming (spec Out-of-Scope, design
  §9).
- **No tooling invented.** `scripts/validate-changesets.mjs` and `package.json` are
  **not** modified — T2 declares the existing gates; it does not create them.
- **No tests authored.** There is no executable code in this change; guardrails are
  prose the agents read (design §2.1). The declared guardrails (`npm test`,
  `node scripts/validate-changesets.mjs`) are this PR's own verification and must pass.
- **Post-edit acceptance sweep** (design Observability) — after T6–T9, confirm:
  (1) `grep "verification convention"` across the four agents returns zero hits naming
  the command-gate source; (2) behavior/accuracy verification remains a separate
  evidence-based step in each; (3) every command-gate reference selects the agent's
  phase guardrails; (4) no-bypass language preserved (gate→guardrail); (5) the
  no-guardrails-is-not-a-blocker behavior holds; (6) all R16-protected references are
  untouched.
