# Design doc: Guardrails convention

Issue #51. This document is the design of record for the Guardrails feature. It
is standalone — it does not require reading `design-doc-research.md`. It maps
every change back to the spec's requirements (R1–R17) and acceptance criteria
(AC1–AC12) in the final section.

## 1. Problem and approach

### What is broken today

In the **code** and **docs** phases, Radical Pipelines agents must pass the host
project's deterministic verification gates (lint, typecheck, unit tests,
end-to-end tests, build, changeset shape, …) before their work is complete. The
agents reach for *"the host project's verification convention"* to know which
commands to run — but that thing is never formally declared anywhere:

- It is not a row in the conventions loader (`load.md`).
- It is not captured by the setup flow (`setup.md`).
- It is not present in this project's own `.rp.md`.

So the agents depend on a contract that does not exist. Worse, the agents'
**blocker rule** treats a *missing* verification convention as a blocker — which
penalizes the (legitimate) case of a project that simply has no command gates.

### The mental model

This feature introduces **Guardrails**: a named set of deterministic
verification gates a project declares once, and the relevant agents then run.

A **guardrail** is:

- an **exact command** (`npm test`, not "run the tests"),
- judged **solely by exit code** (0 = pass, non-zero = fail),
- **mandatory** within the phase(s) it applies to,
- **tool-agnostic** (the command is identical no matter which agentic coding
  tool drives the pipeline).

The agent loop that keeps cycling until the gates pass already exists — this is
the "backpressure" model. **This work does not redesign that loop.** It supplies
the missing formal contract the loop was already assuming, and fixes the one
rule that was wrong (missing gates ≠ blocker).

### The key conceptual distinction: guardrail ≠ convention

A **convention** describes *how this project runs the pipeline* (slugs,
worktrees, commit format, team spawning). It can legitimately differ per agentic
coding tool.

A **guardrail** is a *project verification command*. Because `npm test` is
identical whichever tool runs it, guardrails are tool-agnostic and there are no
per-tool variants. They are therefore modeled as a **sibling** of conventions,
not as one of them. This distinction drives nearly every structural decision
below: separate `.rp.md` section, separate setup step, kept out of the
conventions table and out of the required-completeness check.

### What is explicitly *not* a guardrail

**Behavior verification** — exercising user-observable behavior and capturing
evidence (screenshots, transcripts, output samples, response diffs) — is *not* a
guardrail and is *not* reclassified as one. It remains a separate, evidence-based
agent responsibility. The docs-phase analog is **accuracy verification** (verify
symbols/paths/keys/cross-links against shipped code, trace runnable examples).
Both are preserved as self-contained steps that name their own evidence and no
longer depend on a named "verification convention" (R15).

## 2. Components

### 2.1 New

There is **no new executable code**. Guardrails are prose the agents read, like
every other entry in `.rp.md`. No parser, validator, or schema is added (this is
explicitly out of scope in the spec). The "new" artifacts are documentation
sections and one declared example:

| New artifact | Where | Purpose |
| --- | --- | --- |
| `## Guardrails` section | root `.rp.md` | Declares this repo's real gates (worked example) |
| `## Guardrails` section | `conventions/load.md` | Canonical definition + how to load/select per phase |
| `## 3. Capture guardrails (optional)` step | `conventions/setup.md` | Optional capture during setup, distinct from conventions |
| `.changeset/*.md` | `.changeset/` | This PR's own changeset (see §7, Risk 1) |

### 2.2 Modified

| File | Change | Spec |
| --- | --- | --- |
| `/.rp.md` | Rename `## Shared conventions` → `## Conventions`; reconcile the stale intro; add `## Guardrails` table | R6, R7, R17, AC1, AC12 |
| `skills/radical-pipelines/reference/conventions/load.md` | Broaden intro by one clause; add `## Guardrails` section after `## Missing conventions` | R9, R10, AC6 |
| `skills/radical-pipelines/reference/conventions/setup.md` | Insert `## 3. Capture guardrails (optional)`; renumber steps 3→4…7→8; touch the two write steps | R11, AC7 |
| `agents/code-writer.md` | Replace command-gate "verification convention" refs with Guardrails; drop "behavior verification" from gate list; update blocker rule | R12–R16, AC5, AC8–11 |
| `agents/code-reviewer.md` | Same role-A/B/C edits | R12–R16, AC8–11 |
| `agents/doc-writer.md` | Same; tighten the doc-gate hedge into the deterministic guardrails model | R12–R16, AC8–11 |
| `agents/doc-reviewer.md` | Same | R12–R16, AC8–11 |
| `skills/radical-pipelines/reference/conventions/pi.md` | One-line edit: make the `setup.md` step reference number-free (renumber-proofing) | consequence of R11 |

### 2.3 Untouched but relevant

- **The orchestrator and the rest of `skills/`** have **zero** references to a
  verification convention. The autonomous phase-reference files describe
  completion *predicates* (what must be committed), not a verification command.
  Loading/selecting guardrails is documented in `load.md`; *running* guardrails
  is the agents' job. No orchestrator change is needed, and the division of
  responsibility stays consistent. The spec correctly scoped the behavior change
  to the four code/docs agents only.
- **`conventions/claude-code.md`** has no `setup.md` step-number reference, so it
  is not affected by the renumber.
- **`scripts/validate-changesets.mjs`** is the validator behind one declared
  guardrail; it is *not* modified (we declare the existing gate; we do not invent
  tooling).
- **README / website / CI workflow names** are user-facing or CI surfaces. They
  are **out of scope** for this (code) pipeline. Stale README descriptions of
  `.rp.md` (see §8) and CI's "gate" naming are noted for the docs phase but not
  changed here.

## 3. The guardrail entry format

A guardrail entry is a **markdown table row** with three columns:

| Name | Command | Phases |
| --- | --- | --- |
| Unit tests | `npm test` | code |
| Changeset shape | `node scripts/validate-changesets.mjs` | code, docs |

- **Name** — human-readable label (R2).
- **Command** — the exact command, in backticks, copy-pasteable and judged by
  exit code (R1, R2).
- **Phases** — `code` and/or `docs`, the only valid targets (R2, R3).

**Why a table** rather than a bullet-list-per-guardrail:

- It matches the table register `load.md` already uses for the conventions
  catalog (consistent house style).
- Every row visibly carries all three required attributes (AC2).
- There is structurally **no place** for a per-tool variant, making
  tool-agnosticism self-evident — a reader who "looks for tool-specific variants
  finds none" (AC3, R4).
- "Run every row whose Phases includes my phase" is the most scannable shape for
  the consuming agents.
- A table is still prose read by eye; it needs no parser (honors the
  out-of-scope "no parser/validator/schema").

A bullet-list-per-guardrail is an acceptable fallback but is wordier and makes
tool-agnosticism less visually obvious.

### The empty state (must be documented)

A project may declare **no** guardrails. The design treats absent and empty
identically:

- An **absent** `## Guardrails` section, or a **present-but-empty** one (e.g.
  containing only "This project declares no guardrails."), both mean "this
  project has no command gates."
- This is a **valid, complete state — never a blocker** (R5, R8, AC4).

This must be shown explicitly in `load.md` and `setup.md` so no surface treats
absence as a gap (see §5).

## 4. The worked example (this repository's real gates)

Per R17, this repo's own `.rp.md` declares its **real** command gates — no new
tooling is invented. The repo has exactly two exit-code gates wired into CI
(`.github/workflows/changeset-gate.yml` runs both; `release.yml` runs
`npm test`). `package.json` declares only a `test` script;
`CONTRIBUTING.md` states there is no lint or typecheck step in this repo. So the
worked example is exactly:

| Name | Command | Phases |
| --- | --- | --- |
| Unit tests | `npm test` | code |
| Changeset shape | `node scripts/validate-changesets.mjs` | code, docs |

**Phase mapping rationale:**

- `npm test` runs `node --test 'scripts/test/**/*.test.mjs'` — it exercises
  `scripts/*.mjs` code with no doc-tests wired in → **`code` only**.
- `node scripts/validate-changesets.mjs` checks the *shape* of `.changeset/*.md`.
  A changeset is required whenever a PR touches a release-relevant path
  (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`,
  `README.md`). The **code phase** edits `skills/**`, `agents/**`,
  `.claude-plugin/**`; the **docs phase** edits `README.md` — both are
  release-relevant → **`code, docs`**.

**Deliberately excluded:** CI's third changeset check,
`npx changeset status --since=origin/<base>`, is PR-base-relative — it has no
fixed exact command judged by its own exit code, so it does not fit the guardrail
shape and is correctly left out of the worked example. R17 names only the two
gates above.

## 5. Interfaces and data flow

There is no runtime API. The "interface" is the contract between four
documentation surfaces and the agents that read them. The single
definition-of-record lives in **`load.md`** (the file every workflow reads at
start), satisfying AGENTS.md's anti-duplication rule; the other surfaces carry
short one-line echoes.

```
                 ┌────────────────────────────────────────────────┐
   defines once  │ load.md  ## Guardrails                          │
   ───────────►  │  - what a guardrail is (exact cmd, exit code,   │
                 │    code/docs phase)                             │
                 │  - HOW to load: read .rp.md ## Guardrails,      │
                 │    select rows whose Phases include the phase   │
                 │  - optionality: absent/empty = valid, never     │
                 │    a blocker                                    │
                 │  - committed-only: NOT locally overridable      │
                 └───────────────┬────────────────────────────────┘
                                 │ references
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                          ▼
 ┌──────────────┐      ┌───────────────────┐      ┌──────────────────┐
 │ .rp.md       │      │ setup.md  step 3  │      │ 4 phase agents   │
 │ ## Guardrails│      │ (optional capture)│      │ code-writer,     │
 │ (the data:   │ ◄─── │ writes the table  │      │ code-reviewer,   │
 │  table rows) │ read │ into .rp.md       │      │ doc-writer,      │
 └──────┬───────┘      └───────────────────┘      │ doc-reviewer     │
        │  read at verification step              └────────┬─────────┘
        └─────────────────────────────────────────────────┘
                                 │
                                 ▼
              "run every guardrail applicable to the
               [code|docs] phase, exactly as written"
```

### The canonical selection phrase

One phrase is used **verbatim** in `load.md`, `setup.md`, and all four agents so
that AC9 maps 1:1 and is greppable:

> **the guardrails applicable to the [code|docs] phase**

This is a filter over a set: *the rows of `## Guardrails` whose Phases column
includes this phase*. The phrasing does **not** branch on *why* the set is empty,
so the absent-section case and the present-but-no-matching-rows case collapse to
the same behavior: **run none, proceed** (this unifies AC4 and AC5).

### Terminology (mandated, follows the spec's own casing)

- **"Guardrails"** (capital G) — the named concept and section headings (`##
  Guardrails`, "the project's Guardrails for this phase").
- **"guardrail"** (lowercase) — an individual entry/row and in running prose
  ("each guardrail", "run every guardrail applicable to…", "a guardrail that
  fails").

## 6. Key decisions

### D1 — Restructure `.rp.md` by renaming, not nesting

Rename the existing `## Shared conventions` heading to `## Conventions`; **all
`###` children move with it, copied verbatim** (R7: no change to meaning). Add a
new sibling `## Guardrails` section after it.

**Do not** wrap existing content in a `## Conventions` > `## Shared conventions`
nesting. Re-introducing a "shared vs per-tool" framing is what R6 wants to avoid
and edges toward the out-of-scope "redesign per-tool layout."

*Alternative considered:* keep `## Shared conventions` and add `## Guardrails`
alongside. Rejected — R6 says the file's two top-level sections are
`## Conventions` and `## Guardrails`; "Shared" is a stale label (see D2).

### D2 — Reconcile the stale `.rp.md` intro

The current intro (`.rp.md:3`) claims "the per-tool sections add conventions
specific to Claude Code and Pi" — but **no per-tool sections exist in the file**;
per-tool rules live in `conventions/claude-code.md` / `conventions/pi.md`, loaded
conditionally. That sentence is already incorrect. Rewrite it to describe the
file as holding this project's **conventions** and its **guardrails**, dropping
the false per-tool claim (optionally pointing readers to the per-tool reference
files).

This is a meaning-preserving fix to an already-wrong sentence — inside R6/R7,
outside the out-of-scope "redesign per-tool layout."

### D3 — Centralize the definition in `load.md`; echo elsewhere

The full canonical guardrail definition lives **once** in `load.md` (every
workflow reads it at start), honoring AGENTS.md's anti-duplication rule.
`.rp.md`'s `## Guardrails` section carries the table plus a one-line echo;
`setup.md` carries a one-line self-contained echo (setup may run before
`load.md`'s model is established); the four agents reference "the project's
Guardrails for this phase" without re-defining.

*Alternative considered:* make `.rp.md`/`setup.md` *point to* `load.md` instead
of echoing (a stricter AGENTS.md reading). Rejected for readability — a one-line
echo where a file may be read independently is the better trade-off. Recorded as
a minor choice.

### D4 — Keep guardrails out of the conventions table and the completeness check

The `## Guardrails` section in `load.md` is a **sibling** of `## Conventions`,
placed right after `## Missing conventions` (reading order: load conventions →
check completeness → understand guardrails → apply local overrides). Guardrails
are **never** a table row, so AC6 ("does not list Guardrails as a row") is
self-evident.

The `## Missing conventions` completeness check operates only on "required
conventions," defined solely by the table's `Required?` column. A guardrail has
no `Required?` cell, so it cannot count as a missing required convention →
**AC4 is satisfied by construction with no edit to `## Missing conventions`.**
Not touching that check is the proportionate choice; the optionality guarantee
lives in the new Guardrails section prose instead.

### D5 — Guardrails are committed-only / not locally overridable

**(Design-resolved ambiguity — the spec is silent on this.)**

`load.md`'s `## Local overrides` lets a developer's git-ignored `.rp.local.md`
override "a restricted subset of conventions," merged **per named unit** ("where
it names a convention its value wins"). Critically, that "restricted subset" is
**nowhere enumerated** in `skills/` or `agents/` — every description just asserts
"restricted subset" without listing it. Because the override mechanism reads the
same `.rp.md` and wins per named unit, a developer could drop a `## Guardrails`
section into `.rp.local.md` and **silently null out or weaken a mandatory gate**
in their working copy — defeating the entire backpressure purpose and
contradicting R13 ("mandatory, must not be bypassed").

**Decision:** state in one sentence (in `load.md`'s `## Guardrails` section, or
as a half-sentence in `## Local overrides`) that **guardrails are committed-only
and not locally overridable** — the local-override mechanism applies to
*conventions* only.

**Rationale:** a guardrail is a *project verification command*, not a convention
(spec Overview: guardrails are deliberately not a convention), and the override
mechanism is explicitly about conventions. This is scoped to guardrails only —
defining the full convention allowlist is out of scope; this is simply the first
pinned-down statement about what is *not* overridable. The design doc records
this explicitly as a deliberate resolution closing a real loophole the spec did
not address.

### D6 — Add an optional setup step as a sibling, not a sub-block

Insert `## 3. Capture guardrails (optional)` as a top-level step, **sibling to
step 2 "Collect required conventions."** Renumber the trailing steps (Apply tool
setup actions → 4, Confirm writes → 5, Write Markdown → 6, Set up git ignore → 7,
Finish safely → 8).

*Alternative considered:* a `###` sub-block inside step 2. Rejected — step 2's
heading literally says "Collect required **conventions**," and a guardrail is not
a convention; a sibling top-level step makes the "distinct concept" status
structural (AC7). `(optional)` in the heading satisfies AC7's "marked optional"
at a glance.

**Capture-step content** mirrors the house pattern: a short prose intro stating
guardrails are the project's mandatory verification gates and that this step is
optional ("none" is a complete, valid answer); one sentence on what a guardrail
is (exact command, pass/fail by exit code, applies to code and/or docs); an
elicitation paragraph asking the owner, per gate, for a **name**, **exact
command**, and **phase(s)**, prompting them to consider
lint/typecheck/unit/e2e/build and project-specific validators but capturing only
gates that actually exist (no invention); a one-clause note on tool-agnosticism
(the same command regardless of active tool, captured once, no per-tool variant —
worth stating because several *conventions* in this same file *are* per-tool); and
a reworked `Suggested default:` line ("none — guardrails are project-specific;
capture each gate's name, exact command, and applicable phase(s), or record that
the project has no command gates").

### D7 — Renumber-proof the one external `setup.md` step reference

`pi.md` references "Step 3 of `setup.md`" pointing at the current
`## 3. Apply agentic coding tool setup actions`. Inserting a new `## 3` for
guardrails makes that reference stale. A repo-wide check confirms this is the
**only** external reference to a `setup.md` step number (claude-code.md has none;
README links to the whole file anchorlessly; all other "step N" hits are
file-local).

**Decision:** fix it by making the reference **number-free** — "the **Apply
agentic coding tool setup actions** step of `setup.md`" — rather than bumping 3→4.
This is more durable (future insertions never break it again) and is a one-line
edit, in scope as a direct consequence of adding the guardrails step.

### D8 — The four-agent edits, classified by role

Each command-gate reference is classified into one of four roles:

- **(A) command-gate role** → replace with "the project's Guardrails for this
  phase" / "run every guardrail applicable to the [code|docs] phase".
- **(B) behavior/accuracy-verification dependency** → make self-contained and
  evidence-based; drop the named-convention dependency, keep the inline evidence
  list.
- **(C) blocker-rule statement** → "no applicable guardrails is not a blocker";
  remove the missing-convention blocker.
- **(R16-leave)** → other "host project's X convention" references (inline API
  docs, testing, UI, coding style, commit format, documentation conventions) are
  **left untouched**.

The full per-file, per-line edit list is the plan/code phase's job; the
**critical traps** the plan must respect are called out in §7.

### D9 — The blocker rule loses the missing-convention case (R14)

The old rule treated a *missing* verification convention as a blocker because a
missing convention meant the agent didn't know what to run — genuine
under-specification. **Post-guardrails, "no guardrails declared" is a
deliberate, valid state** (optionality), so that justification no longer applies.
Optionality does not weaken rigor.

- Standalone "missing/unrunnable = blocker" lines are **deleted** and the two
  code agents **gain** a positive optionality sentence in their place: *"If no
  guardrails apply to this phase, run none and proceed — that is not a blocker."*
  (The two doc agents already carry an equivalent.)
- In-list "or the verification convention is missing/undefined" clauses are
  **struck**, leaving the surrounding genuine broken-input blockers (missing
  plan/spec/design, nonexistent file paths, etc.) intact.

**"Can't even run" edge case** (decided): a command that cannot run exits
non-zero → it is a **FAIL**, and R13 says a failing guardrail is **work to fix**,
not a blocker. We deliberately do **not** reintroduce an "unrunnable = blocker"
rule — doing so would resurrect what R14 removes and hand agents a loophole to
dodge a red gate by calling it "unrunnable."

## 7. Failure modes, risks, and required follow-through

### Risk 1 (highest priority) — This pipeline must author its own changeset

**The plan phase must assign an explicit "author the changeset" task.** #51 edits
release-relevant paths: `agents/**` and `skills/**` (code phase) and `README.md`
(docs phase) are all in `.changeset/config.json` `changedFilePatterns`. Per
CONTRIBUTING.md, the #51 PR therefore **requires a `.changeset/*.md`** (likely a
`minor` bump, matching prior feature changesets) — CI's presence check
(`npx changeset status`) fails without one.

**Why this is a real gap:** a repo-wide grep finds **no mention of "changeset"
anywhere in `agents/` or `skills/`** — changeset authoring is currently **no
agent's documented job**. It will not happen automatically. The newly-declared
`validate-changesets` guardrail only checks changeset *shape*, not presence, and
passes vacuously when zero changeset files exist — so declaring the guardrail
does not, by itself, force a changeset to be written.

**No circularity / deadlock:** this pipeline's agents run *today's* definitions
to *produce* the new contract; the new `.rp.md`/agents are artifacts being
written, not instructions followed mid-run. The shape-only validator is satisfied
by a well-formed changeset. But the authoring **task must be assigned** in the
plan or the PR is blocked.

### Risk 2 — Local-override loophole (closed by D5)

Without D5, a developer could null out a mandatory gate via `.rp.local.md`.
Closed by the committed-only statement. Recorded here because the spec is silent
on it and the design resolves it deliberately.

### Risk 3 — `code-writer.md` lists "behavior verification" *as a gate*

The code-writer gate enumeration currently includes "behavior verification"
alongside unit tests, type checks, lints, build. Under R15, behavior
verification is **not** a guardrail. The edit on that line must do **two**
things: convert the line to guardrails **and** remove "behavior verification"
from the enumeration. **This is the single easiest-to-miss R15 edit** — flag it
prominently for the code phase.

### Risk 4 — Command-gate back-references lacking the literal string

Three command-gate references **do not contain** the literal "verification
convention" but carry the role via back-reference ("in the convention", "the
verification gates", "if the convention enumerates doc gates"). They **must** be
edited too, or a `grep "verification convention"` passes (AC8) while dangling
"the convention" references remain. **The plan/code phase must use the full edit
surface, not a literal grep.**

### Risk 5 — Mixed-role adjacency / mis-sweep traps

Some R16-leave lines sit directly beside role-A lines (a "coding/testing/build/
commit conventions" line directly above a "verification gates" line; a "testing
convention" line beside the e2e/behavior step). A careless sweep could alter the
protected line. Editors must keep them separate (R16).

### Observability

There is no telemetry to add. The verifiable signals are:

- **Post-edit invariants** (acceptance check, run after all four-agent edits):
  1. `grep "verification convention"` across the four agent files returns **zero**
     hits naming the command-gate source (AC8).
  2. Behavior/accuracy verification remains a separate evidence-based step naming
     its own evidence (R15/AC11).
  3. Every command-gate reference selects the agent's phase guardrails (R12/AC9).
  4. R13's fail-is-work / no-bypass language is preserved verbatim except
     gate→guardrail (AC10).
  5. The no-guardrails-is-not-a-blocker sentence replaces the old blocker
     (R14/AC5/AC10).
  6. All R16-protected other-convention references are untouched (R16/AC11).
- **The declared guardrails themselves** become the repo's own observability once
  dogfooded: `npm test` and `node scripts/validate-changesets.mjs` are the gates
  CI already runs.

## 8. Dependencies

- **No new runtime/library dependencies.** No code, no parser, no schema.
- **Pre-existing tooling depended upon (unchanged):** `npm test` (→ `node
  --test`), `scripts/validate-changesets.mjs`, and the `@changesets` tooling used
  to author the PR's changeset.
- **Cross-file dependency to respect:** `pi.md`'s reference to a `setup.md` step
  number (resolved by D7).
- **Anti-duplication dependency:** AGENTS.md's rule that an instruction repeated
  across files be centralized — satisfied by D3 (definition in `load.md`).

## 9. Out of scope (restated for the plan/code phase)

- Per-tool guardrail variants / a `.claude/.rp.md` + `.pi/.rp.md` split.
  Guardrails are tool-agnostic and live in one shared section of the single root
  `.rp.md`.
- Reorganizing the conventions themselves into shared-vs-per-tool sections.
- A parser/validator/schema for the Guardrails section.
- Redesigning the code-phase loop / backpressure mechanics.
- Changing the behavior-verification mechanism.
- Inventing new gate tooling for this repo.
- Guardrails for phases other than code and docs.
- **User-facing documentation** (README, website, per-tool rule files for human
  readers). This is the **docs phase's** responsibility. Specifically noted for
  the docs phase (not this code phase): `README.md` still describes `.rp.md` as
  having "a per-tool section" (stale, like the `.rp.md` intro fixed in D2); CI
  workflow names and user docs still say "gate" — do not rename.
- Tracker actions for the superseded issue #18.

## 10. Open questions

None are spec blockers. Two are recorded as minor design choices already
defaulted above:

- **Echo vs. point-to for the guardrail definition** in `.rp.md`/`setup.md` (D3).
  Defaulted to **one-line echoes** for readability; a stricter AGENTS.md reading
  would point to `load.md`.
- **Agent heading wording** "Validate against the project's gates" →
  "…guardrails" (recommended for vocabulary consistency; "gates" is tolerable).

The one **actionable** follow-through is Risk 1 (changeset authoring), which the
plan phase **must** assign.

## 11. Spec coverage

### Requirements

| Req | Where served | Decision/§ |
| --- | --- | --- |
| R1 guardrail = exact command, exit-code pass/fail | definition centralized in `load.md`; format in §3 | D3, §3 |
| R2 declares name, command, phase(s) | table columns Name/Command/Phases | §3 |
| R3 phase targets = code and/or docs only | Phases column values; selection phrase | §3, §5 |
| R4 tool-agnostic, no per-tool variants | no tool column (self-evident); setup one-clause note | §3 (D-format), D6 |
| R5 optional; absent/empty valid, never a blocker | empty-state across loader/setup/agents | §3, D4, D9 |
| R6 `.rp.md` two sections, guardrails a sibling | rename + sibling `## Guardrails` | D1 |
| R7 all convention content preserved, meaning unchanged | verbatim move of `###` children | D1 |
| R8 Guardrails section lists name/command/phases; may be empty | table + empty-state note | §3 |
| R9 load.md documents both; how to load per phase | new `## Guardrails` section in `load.md` | D3, D4 |
| R10 not a table row, not in completeness check | sibling section; check untouched | D4 |
| R11 setup.md captures guardrails, optional, distinct | new sibling step 3 (optional) | D6 |
| R12 agents refer to Guardrails by name; no "verification convention" for that role | role-A edits incl. back-references | D8, Risk 4 |
| R13 run all applicable, mandatory, fail=work, no bypass | preserved no-bypass language gate→guardrail | D8, D9 |
| R14 no-guardrails not a blocker; remove missing-convention blocker | role-C edits + positive optionality sentence | D9 |
| R15 behavior verification preserved, not a guardrail, self-contained | role-B edits + drop from gate list | D8, Risk 3 |
| R16 other "X convention" refs unchanged | R16-leave lists per file; mis-sweep traps | D8, Risk 5 |
| R17 this repo's real gates as worked example | the two-row example table | §4 |

### Acceptance criteria

| AC | Where served | §/Decision |
| --- | --- | --- |
| AC1 `## Conventions` + `## Guardrails`, prior content preserved | D1, D2 | §6 |
| AC2 each entry states name, command, phase(s) | table columns | §3 |
| AC3 no tool-specific variants | no tool column → none to find | §3 |
| AC4 no-guardrails passes completeness check | guardrails never a `Required?` row | D4 |
| AC5 agent runs none, no blocker, proceeds | positive optionality sentence in both code agents | D9, §5 |
| AC6 load.md explains both, how to load, not a table row | sibling `## Guardrails` section | D3, D4 |
| AC7 setup.md captures guardrails, optional, distinct | sibling step 3 (optional) | D6 |
| AC8 no "verification convention" naming the command gates | full edit surface incl. back-references | D8, Risk 4 |
| AC9 runs every applicable guardrail, mandatory, completes only when all pass | canonical selection phrase | §5, D8 |
| AC10 failing guardrail = work to fix, not bypassed | preserved no-bypass language; unrunnable=fail | D9 |
| AC11 behavior verification + other conventions intact | role-B self-contained + R16-leave | D8, Risk 3, Risk 5 |
| AC12 root `.rp.md` uses new structure, real gates declared | restructure + worked example | D1, §4 |
