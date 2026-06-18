# Spec: Plan-completed guardrail commands

## Overview

Today the code-writers run **two command sets** before every commit: every gate in
the guardrails convention the orchestrator hands them, plus every command in a
separate `## Required test commands` "floor" that the code-plan-writer authors in
`code-plan.md`. These are framed as two different things — a floor stacked on top of
the project guardrails — but they are not. The plan's commands are the per-pipeline
completion of the guardrails for the specific feature or bug being worked on.

This change unifies them. A guardrail gate in `.rp.md` MAY be **marked at setup as
completed per pipeline** for some of its agents. For a marked gate the command those
agents run is not fully fixed at setup: the **code-plan-writer** authors a
feature-scoped command per pipeline, while the gate's other agents run the
setup-fixed full command. This serves large or slow projects — e.g. a full `tests`
gate that takes half an hour can run once on the code-reviewer while each writer runs
only the feature's tests on every commit — without making any project that does not
opt in change at all.

The mechanism reuses the existing per-agent guardrail machinery (#121 review-2): the
orchestrator already passes each agent only the gates that name it, each as a name
and its exact command, resolved before spawn so the agent runs one flat list and never
reads `.rp.md`. A mark adds an optional per-gate field naming which of the gate's
agents take a plan-supplied command; in the code phase the orchestrator substitutes
that command — read from `code-plan.md` and bound by gate name — into those agents'
resolved `Guardrails:` lines. The agent still receives one list and never learns
whether a command came from `.rp.md` or the plan. The "floor / on top of guardrails"
framing is removed everywhere: the plan no longer carries a separate command set, it
carries the commands that **complete** the declared guardrails for this pipeline.

This is a change to the Radical Pipelines skill itself, spanning ten skill files plus
the assisted-phase parity file.

## Requirements

### R1 — The plan-completed gate mark

A guardrail gate in `.rp.md` MAY carry an optional **plan-completed-for** field: a
non-empty subset of that gate's `agents` whose command for this gate is supplied per
pipeline by the code-plan-writer instead of the setup-fixed command. A gate is
**marked** iff this field is present and non-empty.

- A marked gate MUST still carry a setup-fixed full command — marking adds the field,
  it never removes the command. The full command is the gate's definitional anchor and
  the plan-writer's context for picking a feature command of the right kind.
- `plan-completed-for` MUST be a subset of the gate's `agents` and MAY equal it. When
  it equals `agents`, no agent runs the full command this pipeline (the full command is
  then context-only) — a coherent owner choice, not a defect.
- A gate with no `plan-completed-for` behaves exactly as today. The mark is opt-in per
  gate; a project that marks no gate is unchanged.
- The mark may name any of the gate's agents. The motivating case is slow code tests
  scoped to the writers, but the mechanism is generic: the owner may mark a gate
  plan-completed for the code-reviewer or for doc agents. No fixed
  reviewer-runs-full / writer-runs-scoped rule is imposed.

The exact `.rp.md` serialization of the field is a design decision (see Out of Scope).

### R2 — Setup captures the mark

`setup.md`'s Guardrails capture gains an optional per-gate **plan-completed-for** item,
after name/command/agents: which of the gate's agents run a per-pipeline command the
code-plan-writer supplies instead of the captured command (a non-empty subset of the
gate's agents, may equal it; absent leaves an ordinary gate). The existing
name/command/agents capture is otherwise unchanged.

- A marked gate's full command is validated at setup as today; its per-pipeline feature
  command does not exist yet and is validated later, at plan phase, by the
  code-plan-reviewer. The validation discipline is unchanged; only the feature command's
  timing and authority move to the plan phase.
- The existing reminder that scoping a slow command needs the writers to run something
  narrower (the one that gestured at this without a mechanism and wrongly implied the
  owner names the feature scope) is replaced by the real mechanism: mark the slow gate
  plan-completed for the chosen agents; the code-plan-writer supplies the feature command
  per pipeline while the unmarked agents run the full command. The mechanism is stated
  once, at the capture item; the reminder only says *when* to reach for it (slow gates in
  large projects).

### R3 — `load.md` represents the mark

The Guardrails convention model in `load.md` notes that a gate may be plan-completed for
some of its agents, whose command for that gate is supplied per-pipeline by the
code-plan-writer in `code-plan.md` and resolved by the orchestrator before spawn — so the
orchestrator's model knows a marked agent's command for that gate comes from
`code-plan.md`, not `.rp.md`. This references setup and resolution rather than restating
them, and adds no new convention or section. The committed-only rule is preserved exactly:
the mark and the full command are committed `.rp.md` data; the feature command is plan
data and does not live in `.rp.md`.

### R4 — The plan records the completions

`code-plan.md`'s `## Required test commands` floor section is replaced by a section named
to drop the "required test commands" and "floor" vocabulary and reuse the mark's
vocabulary — **`## Plan-completed guardrails`**. It is a table keyed by the exact `.rp.md`
gate name, with columns for the **gate**, the **command**, and a **rationale** (the prose
that states what feature surface the command exercises):

- **Gate** is load-bearing identity, not a free label: the value MUST match a gate the
  orchestrator names as marked. A typo or invented name fails to bind.
- **Command** is the exact literal feature-scoped command the code-plan-writer authors —
  its selection authority.
- **Rationale** is free prose, not binding; it states what the command exercises, as a
  judgment aid for the code-plan-reviewer's coverage check.

The plan supplies a command for **exactly** the marked-gate set — one row per marked gate,
no extras, no omissions. A row for an unmarked or nonexistent gate has nothing to bind to;
a missing row for a marked gate leaves that gate's marked agents with no command. The "floor
/ on top of project guardrails" framing is removed from the section and its surrounding
prose. Following the plan-template idiom (sections present-but-empty rather than omitted),
the header is always present; when the project marks no gate (as this repo), the section
reads "None."

### R5 — The code-plan-writer learns the marked set and authors the commands

The code-plan-writer is the authority over each feature **command** but not over the
**set** of gates to complete (that is owner/`.rp.md` data). Today it receives no guardrail
data at spawn — it does not read `.rp.md` and is not in the gate-running-agent enumeration.

- In autonomous mode the orchestrator passes the code-plan-writer the marked-gate set —
  each gate's **name and setup-fixed full command** — via a new spawn-time field,
  **Guardrails to complete**, distinct from the run-time `Guardrails` field (which names
  gates an agent *runs*; the plan-writer does not run these, it *completes* them). The full
  command is passed as context so the writer picks a feature command of the right kind (same
  runner, narrower scope). The writer fills `## Plan-completed guardrails` for exactly those
  gates.
- In assisted mode there is no spawn: the single driver authored `.rp.md` and knows the
  marks directly, so the driver fills the section directly without any `Guardrails to
  complete` field.

### R6 — The code-plan-reviewer validates and binds

The code-plan-reviewer performs three checks on `## Plan-completed guardrails`:

- **Execute each command** under the runner-resolves-and-terminates discipline (execute it;
  did the runner resolve and terminate?; zero or missing tests are legitimate at plan time;
  a command that cannot run is a rejection; per-command and independent; judge before any
  destructive command). This stays an *executing* validation — it is what makes R8's writer
  blocker rule sound.
- **Judge coverage**: each feature command credibly completes its marked gate for this
  feature, using the row's rationale. The "credible floor, not exhaustive" framing is dropped.
- **Bind each row**: each row's gate matches a gate passed as marked — exactly the marked
  set, with an unmarked or nonexistent gate row a rejection and a marked gate with no row a
  rejection.

In autonomous mode the reviewer receives the same **Guardrails to complete** set as the
plan-writer, to perform the binding (it has no other channel to `.rp.md`). The "No unit-test
planning" check's logic is unchanged; only its floor vocabulary retargets to the new section.

### R7 — The orchestrator resolves marked gates at the code phase

In the code phase, before spawning each writer or reviewer, the orchestrator resolves marked
gates: for any gate where the spawned agent is in `plan-completed-for`, it substitutes the
plan's feature command — read from `code-plan.md`'s `## Plan-completed guardrails`, bound by
gate name — into that agent's resolved `Guardrails` line, in place of the setup-fixed command.
An agent not in `plan-completed-for` gets the setup-fixed full command on that gate's line.
The resolved line is shape-identical to any gate (a name and an exact command); every consuming
agent receives one flat resolved list and never learns a command's source. Resolution is keyed
off `plan-completed-for` membership, not agent role, so it applies uniformly to whichever of the
gate-running agents the owner marked. (Assisted mode has no spawn and therefore no such
resolution step.)

### R8 — The code-writers run one unified gate set

Both code-writers' "Run the guardrails" step runs exactly the gates handed to it in
`Guardrails` — one set, no floor branch, no read of any command section from `code-plan.md`. It
converges onto the shared writer/doc guardrails-step wording (run every gate in the guardrails
convention, exactly as its command is written, with the standard three-bullet result sort), so all
four writer and doc files share one phrasing. Removed from the code-writers: the gather-context line
that reads the required-test-commands section, the "two command sets … AND the floor" language, the
floor-specific bullets, and the floor entry in the self-containment input list.

The standard "a declared gate that cannot execute → blocker" rule holds for a plan-resolved gate
command **because the code-plan-reviewer already executed and validated that command at plan time**
(R6) — so non-execution at writer time is genuine drift, not a plan defect. This dependency is
explicit; under unification the writer needs no special caveat, the reasoning lives in the
resolution and plan-review layers.

The e2e writer keeps its separate read of `code-plan.md` for the `## E2E test plan` / flow specs
(out of scope here); only its test-command read is removed.

### R9 — The code-reviewer is unchanged

`code-reviewer.md` already runs every gate in the guardrails convention exactly as handed to it,
with resolution upstream; it never ran a floor. Whether or not the reviewer is in
`plan-completed-for`, its `Guardrails` line is built by the orchestrator and it runs what it is
handed. Its behavior-verification / e2e re-drive step is untouched (e2e plan out of scope). No edit
is required; the unification vindicates the reviewer's existing "one set, the gates handed to me"
model that the writers now converge onto.

### R10 — Scope discipline and lockstep edits

- The change touches ten live skill files (R1–R9 above): `agents/code-plan-writer.md`,
  `agents/code-plan-reviewer.md`, `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`,
  `reference/conventions/setup.md`, `reference/conventions/load.md`,
  `reference/autonomous-workflow.md`, `reference/autonomous-phases/3 - plan.md`,
  `reference/autonomous-phases/4 - code.md`, plus `reference/assisted-phases/3 - plan.md` for parity.
- The generic spawn-field contract is stated **once** in `autonomous-workflow.md`: the `Guardrails`
  bullet notes that for a marked gate the orchestrator resolves the marked agents' command from
  `code-plan.md` before spawn, and a new `Guardrails to complete` field (the marked-gate set passed
  to the code-plan-writer and code-plan-reviewer in the plan phase) is defined there. The two
  phase files (`autonomous-phases/3 - plan.md`, `autonomous-phases/4 - code.md`) only say *when* the
  orchestrator acts — plan phase passes `Guardrails to complete`; code phase resolves marked gates —
  and defer the contract and mechanics to `autonomous-workflow.md`.
- `assisted-phases/3 - plan.md` mirrors the new section shape and self-checks (retargeting its
  floor references and its synthesized `code-plan.md` skeleton to `## Plan-completed guardrails`),
  without inventing a `Guardrails to complete` field for the single-driver path.
- Every "required test command" / "floor" / "two command set" reference in the live skill tree is
  retargeted; the unrelated validation-floor metaphor in `setup.md` (a different sense of the word)
  is left intact; the `## E2E test plan` section and the README roster are untouched; no migration
  or back-compat text is added.

## Out of Scope

- The exact `.rp.md` serialization of `plan-completed-for` and the exact column layout/markdown of
  `## Plan-completed guardrails` — design-phase decisions. This spec fixes the model, not its storage
  syntax.
- The `## E2E test plan` section of `code-plan.md` — a separate concern; the e2e writer keeps its
  E2E-test-plan read and only its test-command read is removed.
- The code-reviewer's behavior-verification / e2e re-drive step — untouched.
- `code-reviewer.md` and `README.md` — verified to need no change (the reviewer runs handed gates with
  resolution upstream and no floor reference; the README roster already lists the split writers and its
  guardrail prose is generic).
- Migration of existing `.rp.md` files and any back-compat text — this repo marks no gate, so the
  default path strands nothing.

## Acceptance Criteria

1. A `.rp.md` guardrail gate may carry an optional `plan-completed-for` field — a non-empty subset of
   the gate's agents; a gate is marked iff it is present and non-empty; a marked gate still carries a
   setup-fixed full command; `plan-completed-for` may equal `agents` (full command then context-only);
   a gate without the field is unchanged; the field may name any gate-running agent.
2. `setup.md` captures the optional per-gate `plan-completed-for` item after name/command/agents, states
   that the full command is validated at setup while the feature command is validated later at plan
   phase, and replaces the old "scope the writers' gates" reminder with the mark mechanism and the
   correct authority (code-plan-writer names the command), stating the mechanism once.
3. `load.md` notes that a gate may be plan-completed for some agents whose command comes per-pipeline
   from `code-plan.md` resolved before spawn, references rather than restates setup/resolution, adds no
   new section, and preserves the committed-only rule without implying the feature command lives in
   `.rp.md`.
4. `code-plan.md`'s `## Required test commands` section is replaced by `## Plan-completed guardrails`, a
   table keyed by the exact `.rp.md` gate name (gate / command / rationale); the gate value must bind to
   a marked gate; the section carries exactly the marked-gate set (no extras, no omissions); the floor
   framing is gone; the header is always present and reads "None" when no gate is marked.
5. In autonomous mode the orchestrator passes the code-plan-writer a `Guardrails to complete` spawn field
   (marked-gate name + full command); the writer fills `## Plan-completed guardrails` for exactly those
   gates, authoring each feature command of the right kind for the gate's full command; in assisted mode
   the driver fills the section directly with no spawn field.
6. The code-plan-reviewer (a) executes each `## Plan-completed guardrails` command under the
   runner-resolves-and-terminates discipline, (b) judges each feature command credibly completes its
   marked gate for this feature (no floor framing), and (c) binds each row to a passed marked gate name —
   exactly the marked set; in autonomous mode it receives the same `Guardrails to complete` set; the "No
   unit-test planning" check logic is unchanged.
7. In the code phase, before spawning each writer/reviewer, the orchestrator substitutes each marked
   agent's command from `## Plan-completed guardrails` (bound by gate name) into that agent's resolved
   `Guardrails` line; every consuming agent receives one flat list and never learns a command's source;
   resolution is keyed off `plan-completed-for` membership, not role; assisted mode has no such step.
8. Both code-writers' "Run the guardrails" step runs only the handed `Guardrails` set, converged onto the
   shared writer/doc step wording with the standard three-bullet sort; the `code-plan.md` test-command
   read, the floor framing, and the floor entry in the self-containment input list are removed; the e2e
   writer keeps its `## E2E test plan` read; the spec states that the "cannot execute → blocker" rule is
   sound because the plan-reviewer validated the feature commands (R6).
9. `code-reviewer.md` is unchanged and the README roster and `## E2E test plan` section are untouched.
10. The change spans the ten files of R10; the `Guardrails`/`Guardrails to complete` spawn-field contract
    is defined once in `autonomous-workflow.md` with the two phase files only stating when the orchestrator
    acts; `assisted-phases/3 - plan.md` mirrors the new section shape without a spawn field; every floor /
    required-test-command / two-command-set reference is retargeted; the unrelated `setup.md` validation-floor
    metaphor and back-compat-free posture are preserved.
