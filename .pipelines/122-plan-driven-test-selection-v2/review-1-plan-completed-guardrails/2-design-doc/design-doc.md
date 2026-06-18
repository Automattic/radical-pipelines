# Design doc: Plan-completed guardrail commands

## Overview

Today the code-writers run two command sets before every commit: every gate in
the guardrails convention the orchestrator hands them, plus every command in a
separate `## Required test commands` "floor" the code-plan-writer authors in
`code-plan.md`. The two are framed as different things — a floor stacked on the
project guardrails — but they are not: the plan's commands are the per-pipeline
completion of the guardrails for the feature or bug being worked on.

This change unifies them. A guardrail gate in `.rp.md` MAY be **marked** at setup
as plan-completed for some of its agents. For a marked gate, those agents do not
run the setup-fixed full command: the code-plan-writer authors a feature-scoped
command per pipeline, and the orchestrator substitutes it into the marked agents'
resolved guardrails line before spawning them in the code phase. The gate's other
agents run the full command. This serves large or slow projects — a `tests` gate
that takes half an hour can run once on the code-reviewer while each writer runs
only the feature's tests on every commit — and a project that marks no gate is
unchanged.

The mechanism reuses the existing per-agent guardrail machinery: the orchestrator
already passes each agent only the gates that name it, each as a name and its exact
command, resolved before spawn so the agent runs one flat list and never reads
`.rp.md`. A mark adds an optional per-gate field naming which of the gate's agents
take a plan-supplied command; the orchestrator substitutes that command — read from
`code-plan.md`, bound by gate name — into those agents' resolved guardrails lines.
The agent never learns whether a command came from `.rp.md` or the plan. The
"floor / on top of guardrails" framing is removed everywhere; the plan now carries
the commands that **complete** the declared guardrails for this pipeline.

This is a change to the Radical Pipelines skill itself. It spans ten live skill
files plus the assisted-phase parity file, and introduces no migration or
back-compat text — this repo marks no gate, so the default path strands nothing.

## Architecture

### The four data carriers and one resolution step

The design moves one piece of information — a marked gate's per-pipeline command —
through four artifacts, with a single resolution step that converges everything onto
the existing flat guardrails contract.

| Carrier | Holds | Authority |
| ------- | ----- | --------- |
| `.rp.md` Guardrails | each gate's name, full command, agents, and optional `plan-completed-for` | owner, at setup |
| `Guardrails to complete:` spawn field | the marked gates (name + full command) handed to the plan agents | orchestrator, at plan phase |
| `code-plan.md` `## Plan-completed guardrails` | the feature command per marked gate | code-plan-writer, at plan phase |
| `Guardrails:` spawn field | each gate-running agent's flat list of (name, exact command) | orchestrator, at code phase |

The full command is the gate's definitional anchor: it is captured and validated at
setup, and it travels to the plan agents as context so the writer picks a feature
command of the right kind (same runner, narrower scope). The feature command is plan
data — authored, validated, and committed in `code-plan.md`, never written back into
`.rp.md`. At the code phase the orchestrator resolves the two into the single
`Guardrails:` list each gate-running agent already consumes.

### Authority split: set vs command

A mark separates two authorities that the old floor conflated:

- The **set** of gates to complete is owner data, declared in `.rp.md` and carried to
  the plan agents by the orchestrator. The code-plan-writer cannot add or drop a gate.
- The **command** for each marked gate is the code-plan-writer's selection authority,
  authored per pipeline against the full command's kind.

The code-plan-reviewer validates both halves: it executes each command, judges that
each credibly completes its gate, and binds each row to a gate in the marked set.

### Resolution: the ⊆ invariant

`plan-completed-for` is constrained to a non-empty subset of the gate's `agents`
(R1). This single constraint makes resolution a pure command swap that can never
change which lines exist:

- A gate's `Guardrails:` line exists for an agent iff that agent is in the gate's
  `agents` — unchanged from today.
- Because `plan-completed-for ⊆ agents`, a substitution can only fire on a line that
  already exists. It can never manufacture a line for an agent that does not run the
  gate.

Resolution therefore touches only a line's **command**, keyed on `plan-completed-for`
membership — not on agent role. The same logic applies to whichever gate-running
agents the owner marked; no fixed reviewer-runs-full / writer-runs-scoped rule is
imposed.

Worked example — gate `tests`, `agents` {code-writer-tdd, code-writer-e2e,
code-reviewer}, `plan-completed-for` {code-writer-tdd, code-writer-e2e}, feature
command `npm test -- feature/`, full command `npm test`:

- code-writer-tdd `tests` line → `npm test -- feature/` (in `agents` ∩ `plan-completed-for`).
- code-writer-e2e `tests` line → `npm test -- feature/`.
- code-reviewer `tests` line → `npm test` (in `agents`, not marked → full command).
- If the reviewer were not in `agents` at all, it would have no `tests` line this
  pipeline — full or scoped — straight from the ⊆ invariant.

### Why no desync defense

The mark is committed `.rp.md`; the row is committed `code-plan.md`, bound by the
code-plan-reviewer (every marked gate has exactly one row, every row binds). Both are
frozen on the pipeline branch before the code phase, with no editing or regeneration
step between plan-review approval and code-phase resolution. Resolution reads a row
the reviewer already proved exists. The only way to desync is out-of-band hand-editing
of a committed artifact mid-pipeline — which the skill does not defend against for any
committed artifact (spec, design, plan tasks). A code-phase re-validation would
duplicate the reviewer's binding guarantee and add an unnecessary negative, so the
resolution step stays silent on the missing-row case.

### Assisted mode

Assisted mode stops at phase 3: there is no assisted code phase and no spawn. The
single driver authored `.rp.md` and so knows the marks directly; the driver fills
`## Plan-completed guardrails` from its own marks, with no `Guardrails to complete:`
field and no code-phase resolution. Only the assisted plan file participates in this
change, mirroring the new section shape and self-checks.

## Format design

### The `plan-completed-for` field in `.rp.md`

The spec defers the exact `.rp.md` serialization to this phase. Two facts fix it:

- `setup.md` captures a gate as **prose** — "a name, the exact literal command, the
  agents that run the gate." An earlier illustrative gate **table** was deliberately
  removed (commit `cac2d25`, "Refactor guardrail references… for clarity"), leaving
  prose-only capture as an intentional simplification.
- The orchestrator reads `.rp.md` as an LLM reads prose, not via a parser. "Robust"
  means an LLM reads it unambiguously and an owner hand-edits it cleanly — not that a
  regex matches it.

So `plan-completed-for` is **one more optional labeled per-gate field, captured after
name/command/agents**, described in prose exactly as the existing fields are — not a
new column, block, or schema. Re-introducing a mandated table would reverse `cac2d25`
and fight the skill's current design. On an unmarked gate the field is simply an absent
line: there is no empty cell to interpret.

When the design or skill needs an *illustrative* example (illustrative only, never a
mandated block), the per-gate labeled-line shape maps 1:1 onto the prose capture and
renders the optional field as a simply-absent line:

```markdown
#### tests

- Command: `npm test`
- Agents: code-writer-tdd, code-writer-e2e, code-reviewer
- Plan-completed-for: code-writer-tdd, code-writer-e2e

#### lint

- Command: `npm run lint`
- Agents: code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer
```

This shape carries a label for everything that belongs in `.rp.md` — name, full
command, agents, mark — and **none for the feature command**, so it does not tempt an
owner to store the feature command here. The committed-only rule is preserved by
construction: the mark and the full command are committed `.rp.md`; the feature command
lives in `code-plan.md`.

### The `## Plan-completed guardrails` section in `code-plan.md`

The old `## Required test commands` floor section is replaced by `## Plan-completed
guardrails`: a table keyed by the exact `.rp.md` gate name.

```markdown
## Plan-completed guardrails

<!-- One row per gate marked plan-completed in `.rp.md` — exactly that set, no more, no fewer. Gate must match the marked gate's exact `.rp.md` name (it binds by name). Command is the exact literal feature-scoped command the marked agents run for that gate this pipeline. Rationale is free prose naming the feature surface the command exercises, as a coverage-check aid. "None" when no gate is marked. -->

| Gate | Command | Rationale |
| ---- | ------- | --------- |
```

Column choices, each load-bearing:

- **Gate** (not `Name`): binding identity that must match the `.rp.md` gate name. A
  typo or invented name fails to bind. The `Name`→`Gate` switch itself signals the
  column carries identity, not a free label.
- **Command**: the exact literal feature-scoped command — the code-plan-writer's
  selection authority.
- **Rationale** (not `Covers`): R4's word, for free prose naming what surface the
  command exercises, as a judgment aid for the reviewer's coverage check. It is
  explicitly non-binding. `Covers` carried the floor's coverage-of-a-set sense;
  dropping it removes the last lexical trace of the floor.

Title-case headers follow house table casing universally. There is no collision with the
adjacent untouched `## E2E test plan` (which uses `Traces to:`).

The plan supplies a command for **exactly** the marked-gate set: one row per marked
gate, no extras, no omissions. A row for an unmarked or nonexistent gate has nothing to
bind to; a missing row for a marked gate leaves that gate's marked agents with no
command.

### The `None` rendering

Following the plan-template idiom (sections present-but-empty rather than omitted), the
header is always present. When no gate is marked the body is a bare `None` line, table
omitted:

```markdown
## Plan-completed guardrails

None
```

A bare `None` is an affirmative "zero marked gates," whereas an empty table (header +
separator, zero rows) reads identically to a table the writer started and forgot to
fill. No existing section renders emptiness as an empty table, so `None` breaks no
pattern. Both consumers read it unambiguously: the writer emits it deterministically as
the no-marked-gates default; the reviewer sees zero rows to bind and zero marked gates
demanding a row — both bind-check halves vacuously satisfied — and `None` is not a row,
so it cannot be mis-read as an unbindable gate named "None."

This identical block (template + comment + `None` rule) appears in three lockstep
locations: the code-plan-writer's structure block, the code-plan-writer guideline that
references it, and the assisted plan file's synthesis skeleton.

## The spawn-field contract

The generic spawn-field contract is defined **once**, in `autonomous-workflow.md`'s
`## Conventions` spawn block — the single home for what each spawn field means. The two
phase files only say *when* the orchestrator acts and defer the mechanics here.

### `Guardrails:` — resolution note

The existing `Guardrails:` bullet ("the gates that name this agent — one per line as a
name and its exact command. Omit when no gate names it.") gains a clause covering marked
gates: for a gate marked plan-completed for this agent, the command on that line is the
feature command resolved from `code-plan.md` before spawn, not the setup-fixed full
command. This clause **is** the resolution algorithm — the substitution described under
Architecture lives here as the contract, so the code phase needs no separate algorithm
text.

### `Guardrails to complete:` — the new field

A new field, placed immediately after `Guardrails:` so the run-vs-complete pair sits
together: the marked gates whose command the code-plan-writer supplies this pipeline,
one per line as a name and its setup-fixed full command. It is passed only to the
code-plan-writer and code-plan-reviewer in the plan phase; the full command rides along
as context so the writer authors a feature command of the right kind. The field is
**distinct** from `Guardrails:` — these agents *complete* these gates, they do not *run*
them — and is omitted when no gate is marked.

The two fields are structurally disjoint by recipient. The gate `agents` enumeration is
drawn from {code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer};
`code-plan-writer` and `code-plan-reviewer` are not in it, so a gate can never name a
plan agent and the orchestrator never builds a `Guardrails:` line for one. A plan agent
receives `Guardrails to complete:` and never `Guardrails:`; a gate-running agent
receives `Guardrails:` and never `Guardrails to complete:`. They never collide, and the
complete-vs-run gloss makes the name unambiguous on first read.

### Omit-when-empty

`Guardrails to complete:` is omitted when the marked set is empty, matching the existing
omit-when-empty fields (`Guardrails:` "omit when no gate names it"; `Commit format:`
"omit when the project defines none"). Absence unambiguously means the empty marked set;
no consumer needs a present-but-empty signal:

- The code-plan-writer reads absence as zero marked gates and renders `None`. Absence and
  an explicit empty field would resolve to the identical action.
- The code-plan-reviewer binds rows against the passed set; an empty set makes any row
  unbindable and demands no row, so `None` satisfies it.
- The `None` body in the plan is the template's present-but-empty default, not triggered
  by an explicit empty field — so omitting the spawn field stays consistent.

A present-but-empty `Guardrails to complete:` would be the only spawn field rendering as
a bare labeled header, a novel shape the block otherwise avoids. The corresponding
constraint on the writer's instruction is that it must frame `None` as the **default when
it receives no marked-gate set** (field absent), not as something written only on an
explicit empty signal.

## Per-file design

The change touches ten live skill files plus the assisted parity file. A tree-wide sweep
for every floor-family token finds floor references in exactly six files, all six within
the ten; no eleventh file needs editing.

### `reference/autonomous-workflow.md` — the contract home

Defines the spawn-field contract above: the `Guardrails:` resolution clause and the new
`Guardrails to complete:` field, both omit-when-empty. This is the only place the
resolution mechanic and the new field are defined.

### `reference/autonomous-phases/3 - plan.md` and `4 - code.md` — when only

These two phase files state *when* the orchestrator acts and defer the mechanic to
`autonomous-workflow.md`:

- Plan phase: before spawning the code-plan-writer and code-plan-reviewer, the
  orchestrator passes `Guardrails to complete:` (the marked-gate set).
- Code phase: a single *when* clause in the existing per-spawn step — before spawning
  each writer or reviewer, the orchestrator resolves marked gates, substituting each
  marked agent's feature command from `## Plan-completed guardrails`. No binding text, no
  missing-row text, no assisted parenthetical (assisted mode structurally cannot reach
  this file, so a negative about it would be an unnecessary negative).

### `reference/conventions/setup.md` — captures the mark

Three parts, with the mechanism stated once at the capture item:

1. **New capture item (prose, after name/command/agents).** A gate may optionally carry
   its `plan-completed-for` agents — a non-empty subset of the gate's agents (may equal
   it) whose command for this gate is not the captured full command but a feature-scoped
   one the code-plan-writer supplies per pipeline. Absent leaves an ordinary gate. This
   is the single statement of the mechanism: what the mark does and who supplies the
   command.
2. **Validation timing**, attached to the capture item (not the existing validation
   paragraph, which is about validating the captured full command and must stay
   single-timeline). The full command is validated at setup as any gate command is; the
   feature command does not exist yet and is validated later, at the plan phase, by the
   code-plan-reviewer.
3. **Reminder fix.** The existing reminder wrongly implied the *owner* names the feature
   scope. It is trimmed to *when* only — that the per-task agents (code-writer-tdd,
   code-writer-e2e, doc-writer) run once per task while the once-per-run agents
   (code-reviewer, doc-reviewer) run once per pipeline, so a slow gate in a large project
   is the case to reach for `plan-completed-for`. It points at the mark instead of
   restating the mechanism.

### `reference/conventions/load.md` — represents the mark

Extends the committed-only statement in `## Local overrides`; adds no new section and no
row to the terse convention index. The note's spine is the committed-vs-plan-data
distinction the committed-only line already governs. The extension states that a gate may
be plan-completed for some agents (captured at setup), those agents' command for that gate
is supplied per pipeline by the code-plan-writer in `code-plan.md` and resolved by the
orchestrator before spawn — so it is plan data. The mark and the full command are committed
`.rp.md`; the feature command lives in `code-plan.md`, never in `.rp.md`, and like the rest
of Guardrails is never taken from `.rp.local.md`. This references setup and resolution
rather than restating them, and preserves committed-only exactly while sharpening it.

### `agents/code-plan-writer.md` — authors the commands

- Gather-context gains an item: read `Guardrails to complete:` — the marked gates (name +
  full command) this writer authors feature commands for. Absent means no marked gates and
  the section reads `None` (the default, not an explicit empty signal).
- The structure block replaces `## Required test commands` with the `## Plan-completed
  guardrails` block (Gate / Command / Rationale, floor-free comment, bare-`None` rule).
  `## E2E test plan` and `## Tasks` are unchanged.
- The plan-the-floor guideline retargets: for each gate passed in `Guardrails to
  complete:`, author a feature-scoped command of the right kind (same runner, narrower
  scope) and record it in `## Plan-completed guardrails` — exactly those gates, `None` when
  none were passed. The writer owns each command but not the set. The e2e half and the
  "do not prescribe which unit tests" tail are kept.

### `agents/code-plan-reviewer.md` — validates and binds

Three checks on `## Plan-completed guardrails`:

- **Execute** each command under the runner-resolves-and-terminates discipline, kept
  verbatim (only the section name changes). This stays an *executing* validation — the
  dependency that makes the writers' "cannot-execute → blocker" rule sound.
- **Judge coverage**: each feature command credibly completes its marked gate for this
  feature, judged using the row's rationale. The "credible floor, not exhaustive" framing
  is dropped.
- **Bind** (new): every row's **Gate** matches a gate passed in `Guardrails to complete:`,
  every passed marked gate has exactly one row. An unmarked or nonexistent gate row is a
  rejection; a marked gate with no row is a rejection; a `None` body is the valid rendering
  when no gate was passed.

Gather-context gains a `Guardrails to complete:` note — its only channel to the marked set;
absent means the empty marked set. The "No unit-test planning" check's logic is unchanged;
only its floor token retargets to the new section.

### `agents/code-writer-tdd.md` and `agents/code-writer-e2e.md` — one unified gate set

Both writers' "Run the guardrails" step is rewritten to run exactly the gates handed in
`Guardrails:` — one set, no floor branch, no read of any command section from
`code-plan.md`. They converge onto the shared writer/doc guardrails-step wording — the
doc-writer's existing block, which is already the convergence target:

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

Removed from the code-writers: the gather-context line that reads the required-test-commands
section, the "two command sets … AND the floor" language, the floor-specific bullets, and the
floor entry in the self-containment input list. The e2e writer keeps its separate read of
`code-plan.md` for `## E2E test plan`; only its test-command read is removed.

Each writer keeps its own final confirmation line ("…covered by a passing test…"), which
restates its deliverable contract, not the guardrails, and so legitimately varies after the
shared sort. "One phrasing" (R8) scopes to the guardrails-running instruction.

### `reference/assisted-phases/3 - plan.md` — parity, no spawn field

The assisted plan file is a full mirror of the autonomous structure and carries floor tokens
at three locations; it invents no `Guardrails to complete:` field. Three retargets, parallel
to the autonomous file but with single-driver authority:

1. **Constraint** — retarget the floor half, keep the e2e + unit-test tail. Authority is
   "for each gate **you** marked plan-completed in `.rp.md`" — the single driver is both the
   `.rp.md` author and the plan author, so there is no spawn channel. Record each in
   `## Plan-completed guardrails`, `None` when none were marked.
2. **Self-check** — one combined bullet: the runner-resolves-and-terminates discipline
   verbatim (section name renamed) plus a folded one-clause bind confirming the section
   carries exactly the marked gates, one row each, `None` if none. No separate
   coverage-judgment bullet: in assisted mode the driver authoring the command and judging
   its coverage are the same act, so a "credibly completes the gate" self-check would be the
   driver grading its own just-made choice. The execute-and-show-the-owner step is the real
   check; the folded bind clause catches a typo or omission against the marks.
3. **Skeleton** — swap `## Required test commands` for the identical `## Plan-completed
   guardrails` block. `## E2E test plan` and `## Tasks` are unchanged.

### Untouched by design

- `agents/code-reviewer.md` — already runs every gate exactly as handed, with resolution
  upstream, and never ran a floor. Its `Guardrails:` line is built by the orchestrator
  whether or not it is in `plan-completed-for` (resolution is keyed on membership, not role),
  so no edit is required. The unification vindicates the reviewer's existing "one set, the
  gates handed to me" model that the writers now converge onto.
- `agents/doc-writer.md` — the convergence **model**, not a co-edit target. It keeps its
  no-convention accuracy-verification tail; editing it for byte-identity would add an eleventh
  file. The writers' no-convention bullet has no tail, because each writer's non-gate
  validation already lives in its own earlier step.
- `agents/doc-reviewer.md`, `README.md`, and the `## E2E test plan` section carry no floor
  token and need no change.

## Technical decisions and trade-offs

### Prose capture over a table

Re-adding a mandated gate table or block would reverse the intentional `cac2d25`
simplification and fight the skill's prose-capture design. The trade-off is that an LLM (not a
parser) reads `.rp.md`, so the field is described in prose and the illustrative labeled-line
shape exists only to teach, never to mandate. The win is no parser surface, clean hand-editing,
and a form with no slot that could tempt storing the feature command in `.rp.md`.

### Contract defined once, phases say only when

Defining the spawn-field contract once in `autonomous-workflow.md` and reducing the two phase
files to *when* clauses keeps the resolution mechanic out of multiple reading paths. The
`Guardrails:` resolution clause is simultaneously the contract and the algorithm, so no separate
algorithm text is needed anywhere.

### Resolution keyed on membership, not role

Keying substitution on `plan-completed-for` membership rather than agent role keeps the mechanism
generic: the owner may mark a gate for the reviewer, for the writers, or for doc agents, and the
same code path serves all. No reviewer-runs-full / writer-runs-scoped rule is hard-coded, even
though that is the motivating case.

### No desync defense

Relying on the plan-reviewer's binding guarantee — rather than re-validating at the code phase —
avoids duplicating the guarantee and avoids an unnecessary negative about a desync path the skill
does not defend for any committed artifact. The trade-off is accepted because both carriers are
frozen on the branch before resolution and the only desync path is out-of-band hand-editing,
already out of scope skill-wide.

### `None` as a bare line

Rendering the empty section as a bare `None` rather than an empty table makes "zero marked gates"
affirmative and distinguishable from an unfilled table. It is a fresh micro-decision (no
literal-`None` precedent exists in any template), chosen for the clearest read by both the writer
and the reviewer.
