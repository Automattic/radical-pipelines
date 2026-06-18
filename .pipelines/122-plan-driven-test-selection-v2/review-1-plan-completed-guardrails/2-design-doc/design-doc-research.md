# Design research: Plan-completed guardrail commands

Running record of the design Q&A between the `design-doc-analyst` and the
`design-doc-researcher`. Input: the approved spec at `1-spec/spec.md` (R1–R10).

This change unifies the code-plan's separate "Required test commands" floor with
the guardrails convention. A `.rp.md` gate MAY be marked (optional
`plan-completed-for:` subset of its agents) so the code-plan-writer supplies that
gate's feature-scoped command per pipeline; the orchestrator substitutes it into
the marked agents' resolved `Guardrails:` spawn line before spawning them in the
code phase. The `## Required test commands` section becomes `## Plan-completed
guardrails`. Default (no mark) is unchanged.

The change spans ten live skill files plus the assisted parity file:

- `agents/code-plan-writer.md`, `agents/code-plan-reviewer.md`
- `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`
- `reference/conventions/setup.md`, `reference/conventions/load.md`
- `reference/autonomous-workflow.md`
- `reference/autonomous-phases/3 - plan.md`, `reference/autonomous-phases/4 - code.md`
- `reference/assisted-phases/3 - plan.md`

## Codebase grounding (analyst, before Q&A)

- The skill lives in two places in this repo: agent files in `agents/`, and the
  conventions/workflow/phase files in `skills/radical-pipelines/reference/`.
- This repo's `.rp.md` has **no Guardrails section** — it marks no gate. So there
  is no committed gate example to match; the `.rp.md` serialization must be
  derived from `setup.md`'s prose model (a gate = name + exact command + agents).
- The shared writer/doc guardrails-step wording R8 targets is the doc-writer's
  step 4 (`agents/doc-writer.md` L40–48): "Run every gate in the guardrails
  convention, exactly as its command is written. Each is mandatory." + the
  three-bullet result sort (no-convention / cannot-execute → blocker / runs
  non-zero → work). The doc-writer's no-convention bullet currently references
  its own step-3 accuracy verification — a doc-specific clause, not shared.
- The `Guardrails:` spawn-field contract lives once in `autonomous-workflow.md`
  L63–66 (the `## Conventions` block bullets). `Guardrails:` = "the gates that
  name this agent — one per line as a name and its exact command. Omit when no
  gate names it."
- The flawed `setup.md` reminder is L185: tells the owner to "scope the writers'
  gates to the feature or bug" — gestures at the mechanism without one and wrongly
  implies the owner names the feature scope.

## Topics

<!-- One entry per resolved topic, appended in real time. -->

### Topic 1 — `.rp.md` serialization of a gate and the `plan-completed-for` field

**Spec link:** R1, R2, R3 (the spec defers the exact serialization to design — Out of Scope §1).

**Evidence (researcher + analyst-verified git history):**

- House idiom for "many records each with several fields, keyed by a name": this
  repo's `.rp.md` uses a **markdown table** for Agent models (the only such list),
  and **labeled lines** for multi-field single records (Worktrees:
  `Folder:` / `Enter worktree:` …).
- **Load-bearing history:** `setup.md` once carried an *illustrative* gate table
  (`| Name | Command | Agents |`) explicitly tagged "illustrative, not a mandated
  block or parser input." Commit `cac2d25` ("Refactor guardrail references… for
  clarity") **deliberately removed** that table, leaving **prose-only** capture:
  "Capture per gate: a **name**, the **exact literal command**, the **agents** that
  run the gate." This was an intentional simplification — analyst verified the diff.
- Consequence: the orchestrator reads `.rp.md` as an LLM reading prose
  (`setup.md` §5: "Write human-readable Markdown"), not via a parser. "Robust"
  means *an LLM reads it unambiguously and an owner hand-edits it cleanly*, not
  *a regex matches it*.
- This repo's `.rp.md` has no Guardrails section at all (marks no gate), so there
  is no committed gate example to match — the form is chosen, not inherited.

**Decision:**

- **Do not re-introduce a mandated table or block schema.** Re-adding a rigid gate
  block would reverse `cac2d25`'s intentional move to prose capture and violate the
  CLAUDE.md rule against fighting the skill's current design. Capture stays prose.
- `plan-completed-for` is **one more optional labeled per-gate field, captured after
  name/command/agents** — exactly as R2 frames it. It is described in `setup.md`'s
  prose as the existing fields are, not as a new column or block. On an unmarked gate
  the field is simply **absent** (R1's "field simply absent" lands literally as a
  missing line — no empty cell to interpret).
- When an **illustrative** example is shown (in the design doc, not mandated in the
  skill), use the **per-gate labeled-line shape** (researcher's Candidate B), because
  it maps 1:1 onto `setup.md`'s per-gate prose and shows the optional field as a
  simply-absent line:

  ```markdown
  #### tests

  - Command: `npm test`
  - Agents: code-writer-tdd, code-writer-e2e, code-reviewer
  - Plan-completed-for: code-writer-tdd, code-writer-e2e

  #### lint

  - Command: `npm run lint`
  - Agents: code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer
  ```

  A table (Candidate A) is rejected: it reverses `cac2d25`, and two list-valued
  columns (agents + plan-completed-for) read poorly with the split writer names.
  Inline single-line (Candidate C) is rejected: delimiter density makes hand-editing
  and unambiguous reading the weakest, and it invites pasting a scoped command inline.

- **Committed-only rule preserved:** the per-gate block holds only name + full command
  + agents + mark. There is **no slot for a feature command** — it lives in
  `code-plan.md`. The labeled-line shape has a label for everything that belongs in
  `.rp.md` and none for the feature command, so it does not tempt storing it here.

**Carried notes:**
- ~~Pre-existing un-split-agent mismatch in `setup.md`.~~ **RETRACTED (Topic 8,
  analyst-verified on disk):** `setup.md` L183/L185 ALREADY use the split names
  (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`).
  There is no mismatch. An early researcher read was stale; the analyst confirmed the
  current file. Examples throughout use the split set, and the `plan-completed-for` subset
  draws from `{code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}`.

### Topic 2 — the spawn-field contract in `autonomous-workflow.md`

**Spec link:** R5, R10 (contract stated once here); the spec-reviewer's non-blocking
"omitted-when-empty" note.

**Evidence (researcher, analyst-confirmed reasoning):**

- The gate `agents` enumeration (`setup.md` L183, analyst-verified — split names) is
  `code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer` —
  `code-plan-writer` / `code-plan-reviewer` are NOT in it. A plan agent can never be
  named by a gate, so the orchestrator never builds a `Guardrails:` line for it. Grep
  confirms the plan agents neither receive nor mention `Guardrails:` today.
- Therefore `Guardrails:` and `Guardrails to complete:` are **structurally disjoint by
  recipient**: a plan agent gets the latter and never the former; a gate-running agent
  gets the former and never the latter. No collision in practice; the "complete vs run"
  gloss makes the name unambiguous on first read.

**Decision:**

- The contract lives **once** in `autonomous-workflow.md`'s `## Conventions` spawn block
  (currently L63-66). Recommended wording (the design-doc-writer may polish prose;
  intent is fixed):
  - Revised **Guardrails:** bullet — adds the marked-gate resolution note as one clause:
    > the gates that name this agent — one per line as a name and its exact command.
    > For a gate marked plan-completed for this agent, the command is the feature command
    > resolved from `code-plan.md` before spawn, not the setup-fixed full command. Omit
    > when no gate names it.
  - New **Guardrails to complete:** bullet — placed immediately after `Guardrails:` so the
    run-vs-complete pair sits together:
    > the marked gates whose command the code-plan-writer supplies this pipeline — one per
    > line as a name and its setup-fixed full command. Passed only to the code-plan-writer
    > and code-plan-reviewer in the plan phase; the full command is context so the writer
    > authors a feature command of the right kind. Distinct from **Guardrails:** — these
    > agents complete these gates, they do not run them. Omit when no gate is marked.
- This is the **only** place the resolution mechanic and the new field are *defined*. The
  two phase files (`autonomous-phases/3 - plan.md`, `4 - code.md`) only say *when* the
  orchestrator acts and defer mechanics here (R10) — no restatement, satisfying
  no-duplication-across-reading-paths.
- **Omit-when-empty** for `Guardrails to complete:` (resolves the spec-reviewer's note).
  Absence unambiguously means the empty marked set; no consumer needs a present-but-empty
  signal. Trace:
  - code-plan-writer (R5): "fill the section for exactly the gates in `Guardrails to
    complete:`" → empty set → zero rows → "None". Absence and an explicit empty field
    resolve to the identical action.
  - code-plan-reviewer (R6): binds rows against the passed set; empty set → any row is
    unbindable (rejection) and no gate demands a row → "None" satisfies it.
  - R4 "None" rule: "None" is the template's present-but-empty-section default, NOT
    triggered by an explicit empty field — so omitting the spawn field is consistent.
  - Symmetry: `Guardrails:` ("Omit when no gate names it") and `Commit format:` ("Omit when
    the project defines none") already omit-when-empty. A present-but-empty
    `Guardrails to complete:` would be the only spawn field rendering as a bare labeled
    header — a novel shape the block otherwise avoids.
- **Constraint this places on the R5 edit (carried to Topic 6):** the code-plan-writer's
  instruction must frame "None" as *the default when it receives no marked-gate set* (field
  absent), not as something written only on an explicit empty signal. One-line constraint;
  keeps absence self-evidently "None".

### Topic 3 — code-phase resolution of marked gates (R7)

**Spec link:** R7 (and R10's "phase files only say when").

**Decision — the algorithm (lives in `autonomous-workflow.md`, as the Topic-2 bullet):**

- Per spawned gate-running agent, the orchestrator builds the `Guardrails:` list exactly
  as today (each gate naming this agent → name + command), with one added substitution:
  for each such gate that is **marked** AND whose `plan-completed-for` includes **this
  agent**, swap the command for the `code-plan.md` feature command bound by gate name;
  otherwise keep the setup-fixed full command.
- **Key invariant — substitution never changes line existence.** A gate's line exists iff
  this agent is in the gate's `agents` (unchanged from today). Since `plan-completed-for ⊆
  agents` (R1), substitution can only fire on a line that already exists; it can never
  manufacture a line for an agent that does not run the gate. Resolution touches only a
  line's *command*, keyed on `plan-completed-for` membership, not role.
- Worked example — gate `tests`, agents {tdd, e2e, reviewer}, plan-completed-for {tdd, e2e},
  feature `npm test -- feature/`, full `npm test`:
  - code-writer-tdd `tests` → `npm test -- feature/` (in agents ∩ plan-completed-for).
  - code-writer-e2e `tests` → `npm test -- feature/`.
  - code-reviewer `tests` → `npm test` (in agents, not in plan-completed-for → full).
  - Variant (reviewer NOT in `agents`): reviewer has **no `tests` line at all** — it does
    not run the gate this pipeline, full or scoped. Falls straight out of the ⊆ invariant.
- No additional algorithm text is needed beyond the Topic-2 `Guardrails:` bullet — the
  substitution *is* the contract.

**Decision — missing-row / desync edge: stay silent (no defensive sentence).**

- The mark is committed `.rp.md`; the row is committed `code-plan.md`, bound by R6 (every
  marked gate has a row, every row binds, exactly the marked set). Both are frozen on the
  pipeline branch by the code phase; no editing/regeneration step sits between R6 approval
  and R7 resolution. R7 just reads a row R6 already proved exists.
- The only desync path is out-of-band hand-editing of a committed artifact mid-pipeline —
  which the skill does not defend against for *any* committed artifact (spec, design, plan
  tasks). Defending this one would be inconsistent and re-introduce an unnecessary negative.
- A code-phase re-validation would also duplicate R6 and break R10's "phase files only say
  when". R6 is the single binding guarantee.

**Decision — assisted mode: nothing to do, and no parenthetical anywhere.**

- Empirical (researcher-verified): there is **no assisted code phase file** —
  `assisted-phases/` holds only `1 - spec`, `2 - design-doc`, `3 - plan`; and
  `assisted-workflow.md` states phase 4 "Can't be run in assisted workflow." Assisted mode
  stops at phase 3.
- So R10's file list is correct to include only `assisted-phases/3 - plan.md`. The spec's
  "(assisted has no such resolution step)" is a spec-level clarification only; it lands in
  no autonomous file. Putting "assisted has no resolution step" inside `4 - code.md` would
  be a negative about a mode that structurally cannot reach that file — an unnecessary
  negative.

**Net edit to `4 - code.md`:** a single *when* clause in the existing per-spawn step
(step 3 of the code-phase Steps): before spawning each writer/reviewer, the orchestrator
resolves marked gates (substituting each marked agent's feature command from
`## Plan-completed guardrails`), deferring the mechanic to `autonomous-workflow.md`. No
binding text, no missing-row text, no assisted parenthetical.

### Topic 4 — the `## Plan-completed guardrails` section shape in `code-plan.md` (R4)

**Spec link:** R4.

**Evidence (researcher-verified):**

- House table casing is **Title-case** universally (`| Agent | Role | Persistent? |`,
  `| Check | Command | Result |`, `| Convention | What it covers | Required? |`, old
  `| Name | Command | Covers |`). New headers follow: `Gate / Command / Rationale`.
- **No existing literal-`None` rendering** anywhere in any code-plan/doc-plan/phase
  template — the only precedent is the old comment "'None' is valid" above a zero-row
  table. So the "None" form is a fresh micro-decision; pick the clearest, no precedent to
  match.

**Decision — replacement template block (identical in all three lockstep locations):**

```markdown
## Plan-completed guardrails

<!-- One row per gate marked plan-completed in `.rp.md` — exactly that set, no more, no fewer. Gate must match the marked gate's exact `.rp.md` name (it binds by name). Command is the exact literal feature-scoped command the marked agents run for that gate this pipeline. Rationale is free prose naming the feature surface the command exercises, as a coverage-check aid. "None" when no gate is marked. -->

| Gate | Command | Rationale |
| ---- | ------- | --------- |
```

- The comment drops every floor / required-test-command / on-top-of-project-guardrails
  trace. It does NOT restate which agents run the command (that's `.rp.md`/orchestrator
  knowledge), carries the binds-by-name + exact-marked-set rules in one breath, explains
  each column in one clause, flags Rationale as non-binding ("free prose … as a
  coverage-check aid"), and states the "None" rule.

**Decision — "None" rendering: bare `None` line, table omitted.**

```markdown
## Plan-completed guardrails

None
```

- Not an empty table skeleton: an empty table (header + separator, zero rows) reads
  identically to a table the writer started and forgot to fill; a bare `None` is an
  affirmative "zero marked gates." No existing section renders emptiness as an empty table,
  so `None` breaks no pattern.
- Both consumers read `None` unambiguously: the writer (R5) outputs it deterministically as
  the no-marked-gates default (Topic-2 constraint); the reviewer (R6) sees zero rows to
  bind and zero marked gates demanding a row — both halves vacuously satisfied, and `None`
  is not a row so it can't be mis-read as an unbindable gate named "None."

**Decision — column tokens:**

- First column **`Gate`** (not `Name`): it is binding identity that must match the `.rp.md`
  gate name; `Name` was the floor table's free-label token. The `Name`→`Gate` switch itself
  signals the column is load-bearing, reinforcing R6's bind.
- Third column **`Rationale`** (not `Covers`): `Covers` carried the floor's coverage-of-a-set
  sense; `Rationale` is R4's word — free prose on what surface the command exercises,
  explicitly non-binding. Dropping `Covers` removes the last lexical trace of the floor.
- No collision with adjacent `## E2E test plan` (untouched; uses `Traces to:`, no
  Gate/Name/Covers token).

**Three-place lockstep:** the identical block appears in (1) `code-plan-writer.md`'s
structure block, (2) the `code-plan-writer.md` guidance that references it (Topic 6), and
(3) assisted `3 - plan.md`'s step-5 synthesis skeleton (Topic 7). All three carry the same
template + comment + `None` rule.

**Carried constraint to Topic 6 (R6 reviewer):** the reviewer's bind check must treat a
`None` body as the valid rendering of the empty marked set, so it does not flag a
`None`-bodied section as "missing the table." One clause, parallel to the writer's
`None`-default constraint. R6's bind prose should bind "each row's **Gate** to a passed
marked gate name" — reusing the exact column token keeps reviewer prose and header in one
vocabulary.

### Topic 5 — the writers' unified "Run the guardrails" step (R8)

**Spec link:** R8, R10.

**Evidence — per-file inventory of step 4 today (researcher-verified):** the doc-writer
block is **already the convergence target** for the lead + mandatory bullets +
cannot-execute bullet. The code-writers just delete their floor additions ("two command
sets", "the floor", "floor command", "The floor still runs", "or floor command's" in
cannot-execute) and land on the doc-writer's existing phrasing. Only two spots genuinely
diverge after that: the no-convention bullet tail and the final confirmation line.

**Decision — the shared block (identical lead + mandatory bullets + 3-bullet sort):**

```markdown
### Run the guardrails

Run every gate in the guardrails convention, exactly as its command is written. Each is mandatory.

- Every gate must pass before you commit.
- Do not bypass any gate (no `--no-verify`, no `skip`, no commented-out checks).
- Sort each gate result:
  - **No guardrails convention** — proceed. This is not a blocker, and it warrants no warning.
  - **A declared gate's command cannot execute** (it does not resolve or run — a missing binary, a renamed script) — that **is** a blocker: stop and report per the blocker protocol.
  - **A gate runs and exits non-zero** — the command executed but the gate did not pass. That is work, not a blocker: fix the underlying issue.
```

This is the doc-writer block verbatim **minus** its no-convention tail, with all floor
language removed. Carried identically by code-writer-tdd and code-writer-e2e.

**Decision — the R8/R10 tension (doc-writer is NOT in R10's ten files): resolved as the
researcher's Option 1.**

- The spec lists ten files (R10); `doc-writer.md` is **not** among them. R8 says "all four
  writer and doc files share one phrasing." These reconcile cleanly when "one phrasing" is
  read as the **guardrails-running instruction** (lead + mandatory bullets + 3-bullet sort)
  — which is exactly what *converges*. The doc-writer is the **model** the writers adopt,
  not a co-edit target; it stays untouched, honoring R10.
- **doc-writer keeps its no-convention tail** ("the step-3 accuracy verification is your
  only validation;"). The writers' no-convention bullet is the bare "proceed. This is not a
  blocker, and it warrants no warning." with **no tail** — because each agent's non-gate
  validation already lives in its own earlier step (writers: the test/flow contract in
  step 2 + the final confirmation line; doc: its step-3 accuracy verification, an
  unconditional numbered step). The writers need no pointer; doc-writer's pointer is an
  existing courtesy R8 does not require removing.
- This is internally consistent with how the **final confirmation line** already differs
  per file (below) without anyone reading that as breaking "one phrasing." The no-convention
  validation-pointer is the same kind of legitimate per-agent variance. Editing
  `doc-writer.md` to force byte-identity would add an 11th file and contradict R10; we do
  not.

**Decision — the final confirmation line is legitimately per-file (after the shared sort):**

- code-writer-tdd / code-writer-e2e: "Confirm every per-task Acceptance criterion is covered
  **by a passing test** before declaring the task done."
- doc-writer (unchanged): "…is **satisfied**…".
- This line restates each agent's own deliverable contract (test coverage vs documentation
  satisfaction), not the guardrails, so it varies by design and sits after the shared
  three-bullet sort. R8's "one phrasing" scopes to the guardrails-running instruction only.

**Net R8 edits:** substantive rewrite of `code-writer-tdd.md` and `code-writer-e2e.md` step 4
(drop the two-command-set framing, the floor bullets, the floor entry in the self-containment
input list, and the gather-context line that reads the required-test-commands section; land on
the shared block + keep their "passing test" final line). The e2e writer keeps its separate
`## E2E test plan` read; only its test-command read is removed. `doc-writer.md` is untouched.

### Topic 6 — the two plan-agent files (R5, R6) and the verified scope guarantee

**Spec link:** R5, R6, R10.

**Decision — `code-plan-writer.md` (R5) edits:**

- Step 1 "Gather context" gains an item: read the `Guardrails to complete:` field from the
  spawn prompt — the marked gates (name + setup-fixed full command) this writer authors
  feature commands for; **absent ⇒ no marked gates ⇒ the section reads "None"** (the Topic-2
  carried constraint lands here, framed as the default, not an explicit empty signal).
- Structure block: replace the `## Required test commands` block with the Topic-4
  `## Plan-completed guardrails` block (`| Gate | Command | Rationale |` + floor-free
  comment + bare-`None` rule). `## E2E test plan` and `## Tasks` unchanged.
- The "Plan the test floor and the e2e flows" guideline retargets — the writer owns each
  **command** but not the **set**: "for each gate passed in `Guardrails to complete:`,
  author a feature-scoped command of the right kind (same runner, narrower scope) and record
  it in `## Plan-completed guardrails` (exactly those gates; 'None' when none were passed)",
  keeping the e2e half and the unchanged "do not prescribe which unit tests" tail.
- No other floor trace in the file (verified).

**Decision — `code-plan-reviewer.md` (R6) edits:**

- Step 2 retargets to the `## Plan-completed guardrails` section, keeping the
  runner-resolves-and-terminates discipline **verbatim** (only the section name changes).
  This keeps R6(a) an *executing* validation — the dependency that makes R8's writer
  "cannot-execute → blocker" rule sound.
- Step 3 checks: the "Required-test-commands coverage — a credible floor, not exhaustive"
  bullet retargets to R6(b) coverage judgment without floor framing ("does each feature
  command credibly complete its marked gate for this feature? Judge using the row's
  rationale"); ADD an R6(c) **bind** bullet: every row's **Gate** matches a gate passed in
  `Guardrails to complete:`, every passed marked gate has exactly one row; unmarked/
  nonexistent gate row = rejection, marked gate with no row = rejection; **a `None` body is
  the valid rendering when no gate was passed** (Topic-4 carried constraint).
- The "No unit-test planning" bullet's trailing floor clause retargets its token to
  "`## Plan-completed guardrails` commands and the e2e test plan are planner-owned … not a
  violation" — logic unchanged.
- Gather-context gains a `Guardrails to complete:` note (its only channel to the marked set;
  absent ⇒ empty marked set).

**Decision — verified scope guarantee (no eleventh file):** an analyst-run sweep of the
`skills/` + `agents/` tree for every floor-family token finds floor references in exactly
**six** files, **all six within the ten** (`setup.md`, `code-writer-tdd`, `code-writer-e2e`,
`code-plan-writer`, `code-plan-reviewer`, `assisted-phases/3 - plan.md`). The ten R10 files =
**4 agent files** (`code-plan-writer`, `code-plan-reviewer`, `code-writer-tdd`,
`code-writer-e2e`) **+ 6 reference files** (`conventions/setup.md`, `conventions/load.md`,
`autonomous-workflow.md`, `autonomous-phases/3 - plan.md`, `autonomous-phases/4 - code.md`,
`assisted-phases/3 - plan.md`). `code-reviewer.md` (R9 unchanged), `doc-writer.md`/
`doc-reviewer.md` (Topic 5 model), and `README.md` are out and carry no floor token.

**CORRECTION to a researcher claim (analyst-verified on disk):** the researcher reported the
assisted `3 - plan.md` has "ZERO floor-family tokens" and a minimal "Overview → Tasks"
skeleton. **This is false.** Direct grep + read show the assisted file DOES carry floor
tokens at **L30** (constraint "MUST plan the required-test-commands floor and the e2e flows"),
**L118** (self-check "Required-test-commands validate"), and **L132-137** (a full
`## Required test commands` section in the step-5 skeleton — `| Name | Command | Covers |` +
floor comment), and its skeleton ALSO carries `## E2E test plan` (L139-147). The assisted
skeleton is a **full mirror** of the autonomous `code-plan-writer.md` structure, not a minimal
one. Consequence: the spec's "retargets its floor references and its synthesized `code-plan.md`
skeleton" is **accurate** — this is a straightforward **retarget**, not an addition. The
Reading-1-vs-Reading-2 dilemma the researcher raised was an artifact of the bad grep and does
not exist. (Topic 7 settles the assisted retargets concretely.) Researcher re-verified on the
exact path and confirmed; the tree-wide six-file scope sweep was unaffected by the corruption.

### Topic 7 — the assisted `3 - plan.md` retargets (R10 parity, no spawn field)

**Spec link:** R10, R5 (assisted single-driver path), R4.

**True file shape (analyst- and researcher-verified):** the assisted `3 - plan.md` is a full
mirror of the autonomous structure. Floor references live at exactly three locations: L30
constraint, L118 self-check, L132-137 skeleton section. No other floor trace; no
`Guardrails to complete:` field anywhere (and none is introduced).

**Decision — three retargets, parallel to the autonomous file, single-driver authority:**

1. **L30 constraint** — retarget the floor half, keep the e2e + unit-test tail. Authority is
   "for each gate **you** marked plan-completed in `.rp.md`" (the single driver is both
   `.rp.md` author and plan author — no spawn channel):
   > You MUST complete the marked guardrails and plan the e2e flows in the code plan: for each
   > gate you marked plan-completed in `.rp.md`, author a feature-scoped command of the right
   > kind — same runner as the gate's full command, narrower scope — and record it in
   > `## Plan-completed guardrails` ("None" when you marked no gate). Per-task unit-test
   > selection stays the code-writer's: a task's Acceptance describes *what must be true*, and
   > the code-writer-tdd turns it into unit tests in phase 4 (TDD).

   (Polish note for the writer: the researcher's draft left an unclosed paren before "None" —
   close it as shown.)

2. **L118 self-check** — ONE combined bullet: the runner-resolves-and-terminates discipline
   **verbatim** (only the section name renamed) plus a folded one-clause bind, proportional to
   single-driver assisted mode:
   > **Plan-completed guardrails validate** — execute each command in the
   > `## Plan-completed guardrails` section and surface the result to the owner: did the
   > command's runner resolve and terminate? The feature isn't implemented yet, so a runner
   > reporting zero or missing tests is fine; a command that cannot run (runner missing, bad
   > invocation, never returns) is a problem to fix with the owner before synthesis. Per-command
   > and independent. Confirm the section carries exactly the gates you marked plan-completed in
   > `.rp.md` — one row each, "None" if you marked none.

   No separate coverage-judgment bullet: in assisted mode the driver authoring the command and
   judging its coverage are the same act, so a "credibly completes the gate" self-check would be
   the driver grading its own just-made choice. The execute-and-show-the-owner step is the real
   check; the folded bind clause catches a typo/omission against the marks.

3. **L132-137 skeleton** — swap `## Required test commands` (`| Name | Command | Covers |` +
   floor comment) for the **identical Topic-4 block** (`| Gate | Command | Rationale |` +
   floor-free comment + bare-`None` rule). `## E2E test plan` and `## Tasks` unchanged.

**Confirmations:** no `Guardrails to complete:` field anywhere in the assisted file (honors
R5/R10's single-driver-invents-no-spawn-field); no floor trace beyond the three locations
above; these three edits are the complete set for this file.

### Topic 8 — the two convention files: `setup.md` (R2) and `load.md` (R3)

**Spec link:** R2, R3.

**Correction recorded (analyst-verified):** `setup.md` L183/L185 already use the split agent
names. The "un-split mismatch" flagged in Topics 1-2 is retracted (see Topic 1 carried notes).

**Decision — `setup.md` (R2), three parts:**

- **(a) New capture item — prose, after name/command/agents (Topic 1: no table).** Add a
  fourth "Capture per gate" bullet. The **mechanism is stated once, here**:
  > Optionally, the gate's **plan-completed-for** agents — a non-empty subset of the gate's
  > agents (may equal it) whose command for this gate is not the captured full command but a
  > feature-scoped one the code-plan-writer supplies per pipeline (see the plan phase). Absent
  > leaves an ordinary gate. Mark a slow gate this way so its marked agents run only the
  > feature's slice each commit while the unmarked agents run the full command.
- **(b) Validation timing — attach to (a), NOT to the L187 validation paragraph.** L187 is
  about the act of validating the captured (full) command, unchanged; injecting a second
  timeline there would muddy it. Append to (a):
  > The full command is validated here as any gate command is; the feature command does not
  > exist yet and is validated later, at the plan phase, by the code-plan-reviewer.
- **(c) Fix the flawed L185 reminder — trim to WHEN only; mechanism already in (a).** The flaw:
  L185 implies the *owner* scopes the feature command ("scope the writers' gates … leaving the
  complete commands for the code-reviewers"). Replacement keeps the once-per-task/once-per-run
  framing and the "when," but points at the mark instead of implying owner-scoping:
  > Remind the owner that `code-writer-tdd`s, `code-writer-e2e`s, and `doc-writer`s run once per
  > task while `code-reviewer`s and `doc-reviewer`s run once per pipeline run, so in large
  > projects a slow gate is the case to reach for plan-completed-for: mark it for the per-task
  > agents so they run a feature-scoped command each commit, leaving the full command to the
  > once-per-run reviewers.
- **No-duplication check:** the mechanism (what plan-completed-for does, who supplies the
  command) lives once in (a); (c) only NAMES it and says WHEN. Clean per R2.

**Decision — `load.md` (R3): extend the committed-only statement in `## Local overrides`
(L38); add nothing to the terse table row (L22) and no new section.**

- The note's spine IS the committed-vs-plan-data distinction, which is exactly what the
  committed-only line at L38 governs; the L22 convention table is a one-line-per-convention
  index and must not bloat, and R3 forbids a new section. Append to L38:
  > A gate may be plan-completed for some of its agents (captured at setup): those agents'
  > command for that gate is supplied per pipeline by the code-plan-writer in `code-plan.md`
  > and resolved by the orchestrator before spawn, so it is plan data, not `.rp.md` data. The
  > mark and the gate's full command are committed `.rp.md`; the per-pipeline feature command
  > lives in `code-plan.md`, never in `.rp.md` — and like the rest of Guardrails, none of it
  > is ever taken from `.rp.local.md`.
- This **references** setup ("captured at setup") and resolution ("resolved … before spawn")
  without restating either, adds no new convention/section, and preserves committed-only
  exactly while sharpening it (mark + full command = committed `.rp.md`; feature command =
  `code-plan.md`, not `.rp.md`). The orchestrator's model now knows a marked agent's command
  for that gate comes from `code-plan.md`.
- Keeping the whole note at L38 (rather than splitting the resolution half nearer the table)
  avoids duplicating one idea across two homes — the committed-only distinction is the spine;
  the resolution clause rides along as the reason the feature command isn't committed.

## Design complete — requirement coverage and cross-file map

**R9 (code-reviewer unchanged) — deliberate no-edit.** `code-reviewer.md` already runs every
gate exactly as handed (resolution upstream) and never ran a floor. Its `Guardrails:` line is
built by the orchestrator whether or not it is in `plan-completed-for` (Topic 3 substitution is
keyed on membership, role-agnostic). No edit; the unification vindicates its existing
"one set, the gates handed to me" model that the writers now converge onto.

**Per-requirement → topic map:**

| Req | Decision lives in |
| --- | ----------------- |
| R1 — the mark serialization | Topic 1 (prose per-gate field; no table; committed-only) |
| R2 — setup captures | Topic 8 (capture item (a), validation timing (b), reminder fix (c)) |
| R3 — load.md model | Topic 8 (extend committed-only at L38, reference setup+resolution) |
| R4 — plan section shape | Topic 4 (`## Plan-completed guardrails`, Gate/Command/Rationale, bare `None`) |
| R5 — writer learns marked set | Topic 2 (`Guardrails to complete:` contract) + Topic 6 (writer edits) |
| R6 — reviewer validates/binds | Topic 4 (`None` bind) + Topic 6 (execute/judge/bind edits) |
| R7 — orchestrator resolves | Topic 2 (contract) + Topic 3 (algorithm, ⊆ invariant, when-clause) |
| R8 — writers unified step | Topic 5 (shared block; R8/R10 tension resolved; per-file tails) |
| R9 — code-reviewer unchanged | above (deliberate no-edit) |
| R10 — scope & lockstep | Topic 6 (verified six-file scope, ten = 4 agent + 6 reference) + Topics 2/5/7 |

**Cross-file lockstep items the code-plan phase must keep in sync:**

1. The `## Plan-completed guardrails` block (Topic 4) appears **identically** in three places:
   `code-plan-writer.md` structure block, `assisted-phases/3 - plan.md` step-5 skeleton, and is
   referenced by the `code-plan-writer.md` guideline.
2. The shared "Run the guardrails" block (Topic 5) appears **identically** (lead + mandatory
   bullets + 3-bullet sort) in `code-writer-tdd.md` and `code-writer-e2e.md`; `doc-writer.md` is
   the untouched model (keeps its no-convention accuracy-verification tail).
3. The spawn-field contract (Topic 2) is defined **once** in `autonomous-workflow.md`; the two
   phase files (`autonomous-phases/3 - plan.md` passes `Guardrails to complete:`;
   `autonomous-phases/4 - code.md` resolves marked gates) only say *when* and defer the mechanic.
4. The `plan-completed-for` mechanism is stated **once** in `setup.md`'s capture item (Topic 8);
   `load.md` and the reminder only reference it.

**Scope guarantee:** exactly six files carry floor-family vocabulary, all within the ten R10
files; no eleventh file needs editing. `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`,
`README.md`, and the `## E2E test plan` section are out and carry no floor token.

The design is settled across R1–R10. Ready for the design-doc-writer.
