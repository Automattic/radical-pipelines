# Spec Research: Plan-completed guardrail commands

Review-1 of pipeline 122 v2. Input: `0-intent/intent.md`. This is the running
Q&A record between `spec-analyst` and `spec-researcher`. Findings are recorded as
they settle; open questions are listed at the end.

## Baseline: how the system works today (the v2 `base` run, now on the branch)

The conflation the intent targets currently lives across these live files:

- **`code-plan.md` schema** (`agents/code-plan-writer.md`): a `## Required test
  commands` section — a `Name | Command | Covers` table, framed as *"Exact literal
  commands every writer runs and must pass before every commit, on top of project
  guardrails. A floor, not the full set. 'None' is valid."* Uniform across writers
  (no Agents column).
- **Writers** (`agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`): a "Run the
  guardrails" step that runs **two command sets** — "every gate in the guardrails
  convention the orchestrator passes, AND every command in the required-test-commands
  floor from `code-plan.md`." Each writer also has a Gather-context line "Read the
  Required test commands section of `code-plan.md` — the floor your work must keep
  green," and a self-containment guideline naming that section as an input.
- **`code-plan-reviewer.md`**: a "Validate the required-test-commands" step (execute
  each, runner-resolves-and-terminates), a "Required-test-commands coverage" judgment
  item ("credible floor, not exhaustive"), and a "No unit-test planning" check.
- **`code-reviewer.md`**: runs **only** the guardrails convention's gates — it does
  NOT run the required-test-commands floor. (Asymmetry: the floor is a writers-only
  concept today.)
- **`setup.md` Guardrails**: captures per gate a **name**, **exact literal command**,
  and **agents** (subset of `code-writer` / `code-reviewer` / `doc-writer` /
  `doc-reviewer`). Includes a reminder that writers run per-task while reviewers run
  once per pipeline, so "in large projects ... scope the code-writers' gates to the
  feature or bug, leaving the complete, slower commands for the code-reviewers" — a
  reminder with no mechanism, and it wrongly implies the owner names the feature scope.
- **`load.md`**: lists Guardrails as a convention; the orchestrator passes each agent
  its gates via the spawn `## Conventions` block's **Guardrails:** field (name + exact
  command), sourced from `.rp.md` (`reference/autonomous-workflow.md`).
- **Assisted parity**: `reference/assisted-phases/3 - plan.md` carries the same
  `## Required test commands` / `## E2E test plan` schema and the corresponding
  self-checks (base Task 7), so it moves in lockstep.

This repo's own `.rp.md` declares **no** guardrails — so the default path (no marked
gates, empty/absent plan section) must be exercisable here.

## What the intent asks for

Unify the two command sets. A guardrail gate may be **marked at setup as completed
per pipeline** ("plan-completed"). For a marked gate, the *command* is not fully fixed
at setup; the **code-plan-writer** supplies the feature-scoped command for the specific
feature/bug. The owner decides at setup **how a marked gate's ends run** — e.g. writers
run the plan-supplied feature command on each commit while the code-reviewer runs the
full command once. Opt-in; default unchanged. The "floor on top of guardrails" framing
is removed; writers run one unified set of gates resolved by the orchestrator before
spawn.

## Settled requirements

### R-model: the plan-completed gate model (Q1)

The per-agent partition machinery already exists: today the orchestrator passes each
agent only the gates whose `agents:` set includes it, each as name + exact command
(`autonomous-workflow.md` L66). An agent never sees the whole gate set. The mark builds
on this.

- **The mark sits on a specific agent-end of a gate, not on the whole gate.** A marked
  gate keeps **one gate name** but has two ends: a setup-fixed "full" command for some of
  its agents, and a **plan-filled slot** for the others. Modeling the feature command as
  a *separate* unmarked gate is rejected — that re-creates the two-things split the intent
  kills (intent L51-52: one unified set, "the plan does not carry a separate command
  set").
- **Per-agent split = the existing flat `agents:` set plus one optional subset.** A gate
  gains an optional **plan-completed-for:** field naming which of its `agents:` run the
  plan-supplied command. Agents in `agents:` but NOT in `plan-completed-for:` run the
  setup-fixed command. A gate with no `plan-completed-for:` is exactly today's gate
  (default unchanged). Generic: the owner may mark `plan-completed-for: [code-reviewer]`
  or `[code-writer-tdd, code-writer-e2e]` — no fixed reviewer-full / writer-scoped law
  (intent L46).
- **The marked unit is always a whole gate, by name.** The gate name is the **join key**:
  `code-plan.md` says "gate `<name>` -> `<feature command>`"; in the code phase the
  orchestrator substitutes that command into the resolved `Guardrails:` line, under the
  same gate name, for each agent in `plan-completed-for:`. The agent still receives one
  flat resolved list and never learns whether its command came from `.rp.md` or the plan
  (intent L54-55).

Canonical `tests` example (illustrative shape; exact notation is design's job):

```
### Guardrails
- **tests**
  - command: `npm test`        # full, setup-fixed
  - agents: code-writer-tdd, code-writer-e2e, code-reviewer
  - plan-completed-for: code-writer-tdd, code-writer-e2e
- **lint**                      # ordinary unmarked gate, unchanged
  - command: `npm run lint`
  - agents: code-writer-tdd, code-writer-e2e, code-reviewer
```

Resolution: `code-reviewer` gets `tests -> npm test`, `lint -> npm run lint`; the writers
get `tests -> <feature command from code-plan.md>`, `lint -> npm run lint`.

**Open sub-decision (carried to the queue):** whether a marked gate may leave the other
end with NO fixed command — i.e. `plan-completed-for:` equals the whole `agents:` set, so
the gate is entirely plan-supplied. The canonical example has both ends. The spec must
decide whether a setup-fixed full command is required when a gate is marked.

### R-plan: the `code-plan.md` plan-completed section (Q2)

Replaces the `## Required test commands` floor section.

- **Shape and name.** A section named to drop "required test commands" / "floor" and to
  reuse the Q1 mark vocabulary — recommend **`## Plan-completed guardrails`** (one term
  across `.rp.md`, `setup.md`, plan). A table keyed by the **exact `.rp.md` gate name**:
  columns **Gate | Command | (rationale/Covers)**.
  - **Gate** is now load-bearing identity (the join key), not a free label as before — the
    value MUST match a gate marked `plan-completed-for:` in `.rp.md`. A typo/invented name
    fails to bind.
  - **Command** is the exact literal feature-scoped command the code-plan-writer authors
    (its selection authority, intent L47-48).
  - **Rationale/Covers** retained but repurposed: it states what feature surface the
    command exercises, as a judgment aid for the code-plan-reviewer's "credible coverage"
    check. Free prose, not binding.

- **NEW FINDING — the plan-writer has no channel to the marked-gate set today; the
  orchestrator must supply it at spawn.** The code-plan-writer's inputs are spec +
  design-doc + codebase + optional review file; it does NOT read `.rp.md` (guardrails are
  committed-only, never read by agents — `load.md` L38) and it is NOT in the
  gate-running-agents enumeration (`setup.md` L183), so today it receives **no** guardrail
  data in its spawn `## Conventions` block. It therefore cannot learn *which* gates are
  marked. The plan-writer is authority over the **command** but must not invent the **set
  of gates** to complete (owner/`.rp.md` data). Resolution: the orchestrator passes the
  plan-writer the set of marked gates at spawn — **gate name + setup-fixed full command**
  for each — through a new spawn-time field (e.g. **Guardrails to complete:**), distinct
  from the run-time **Guardrails:** field (which names gates an agent *runs*; the
  plan-writer does not run these, it *completes* them). The full command is passed for
  context so the plan-writer picks a feature command of the right kind (same runner,
  narrower scope). The **code-plan-reviewer** needs the same marked-gate set passed to it
  to bind/validate. This is a genuinely new orchestrator->plan-writer (and
  ->plan-reviewer) channel, consistent with the intent's orchestrator-owns-resolution
  posture (L67-71) and the #121 precedent.

- **Exactly-the-marked-gates discipline.** The plan supplies a command for *exactly* the
  gates the orchestrator names as marked — no more, no less. Each row binds to a passed
  marked gate name; a row for an unmarked/nonexistent gate has nothing to bind to; a
  missing row for a marked gate leaves that gate's marked agents with no command (a
  resolution-time blocker). The code-plan-reviewer validates: every passed-to-complete
  gate has exactly one row, each row binds, each command is credible and runs.

- **Empty case = present-but-empty ("None"), header kept.** Plan-template sections use the
  present-but-empty idiom ("None is valid", `code-plan-writer.md` L32), unlike spawn
  `## Conventions` fields which are omitted when empty. The new section follows the
  plan-template idiom: header always present; "None" when the project marks no gates (this
  repo). Resolves the intent's "empty or absent" (L86-87) toward *empty*.

Sketches:

```markdown
## Plan-completed guardrails
| Gate  | Command                               | Covers |
| ----- | ------------------------------------- | ------ |
| tests | `npm test -- src/checkout/__tests__`  | The checkout flow's unit suite. |
```

No-marked-gates (this repo): header + `None — no guardrail is marked plan-completed`.

### R-resolve: writer-end resolution, the unified step, the one-ended edge (Q3)

- **Resolution is uniform across all consuming agents, keyed off `plan-completed-for:`
  membership (not agent role).** In the code phase, for any gate where the spawned agent
  is in `plan-completed-for:`, the orchestrator substitutes the plan's feature command
  (read from `## Plan-completed guardrails`, bound by gate name) into that agent's
  resolved `Guardrails:` line, in place of the setup-fixed command. The line is
  shape-identical to any gate (`tests: npm test -- src/checkout/__tests__`); the agent
  cannot tell the command was plan-sourced. An agent not in `plan-completed-for:` gets the
  setup-fixed full command on that same gate line.

- **A mark can affect ANY of the five gate-running agents** (code-writer-tdd,
  code-writer-e2e, code-reviewer, doc-writer, doc-reviewer) — whichever the owner places
  in `plan-completed-for:`. The model must NOT hard-restrict marks to code writers: the
  motivating case is slow code tests, but the mechanism is generic (a project could mark a
  slow gate plan-completed for the reviewer, or for doc agents). Restricting it would be a
  special-case carve-out the general rule doesn't need. If `plan-completed-for:` names the
  code-reviewer, the reviewer's resolved line gets the plan command.

- **The writers' "Run the guardrails" step becomes one set, no floor branch, no
  `code-plan.md` command read.** Removed: the Gather-context "Read the Required test
  commands section… the floor your work must keep green" line; the "two command sets… AND
  the floor" language; the floor-specific bullets ("The floor still runs"). The e2e writer
  STILL reads `code-plan.md` for its **E2E test plan / flow specs** (separate section,
  explicitly out of scope per intent L88-89) — only the *test-command* read is removed.
  The step re-converges onto the `doc-writer.md` template ("Run every gate in the
  guardrails convention, exactly as its command is written," + the standard three-bullet
  sort), so all four writer/doc files share one guardrails-step wording (removes the
  divergence the base run introduced).

- **CRITICAL COUPLING — the writer's clean blocker rule depends on the plan-reviewer
  validating the plan-completed feature commands.** The standard three-bullet sort ("a
  declared gate that cannot execute → blocker") holds for plan-resolved gate commands ONLY
  because the feature command was already executed/validated at plan time — so
  non-execution at writer time is genuine drift, not a plan defect. This requires the
  **code-plan-reviewer to execute each `## Plan-completed guardrails` command** (same
  discipline as today's required-test-commands validation: "did the runner resolve and
  terminate?"). If the spec did not make the plan-reviewer validate these commands, the
  "cannot execute → blocker" rule would be wrong (a plan defect would masquerade as drift
  at writer time). The spec MUST state this dependency. Bonus: under unification the
  writer needs no special caveat — the reasoning lives in the resolution + plan-review
  layer, cleaner than the floor-era parenthetical.

- **One-ended marked-gate edge — two separate axes, clean rules:**
  1. A marked gate MUST still carry a setup-fixed full command (marking adds the
     `plan-completed-for:` field, never removes the command). The full command is the
     gate's definitional anchor and the plan-writer's context for picking the right kind of
     feature command.
  2. `plan-completed-for:` MUST be a subset of `agents:`, and MAY equal `agents:` — a fully
     plan-supplied gate where no agent runs the full command (it is then context-only,
     never executed this pipeline). This is the owner's deliberate choice, coherent, not a
     defect. So `agents:` minus `plan-completed-for:` is NOT required to be non-empty.
  3. A gate is "marked" iff `plan-completed-for:` is present and non-empty; an empty
     `plan-completed-for:` is just an unmarked gate (the owner omits the field entirely).

### R-consumers: reviewer side + setup/load capture (Q4)

- **`code-reviewer.md`: NO change.** It already runs "every gate in the guardrails
  convention, exactly as written" with resolution upstream (`code-reviewer.md` L42); it
  never ran a floor. Whether or not the reviewer is in `plan-completed-for:`, its
  `Guardrails:` line is built by the orchestrator and it runs what it's handed. The
  unification *vindicates* the reviewer's existing "one set, the gates handed to me" model
  — the writers converge onto it. Its behavior-verification / e2e-re-drive step (step 3)
  is untouched (e2e plan out of scope, intent L88-89). The reviewer side is already correct.

- **`code-plan-reviewer.md`: 3 touches.**
  1. **Validate step retargets** from "required-test-commands" to the `## Plan-completed
     guardrails` commands. Same discipline verbatim (execute each; "did the runner resolve
     and terminate?"; zero/missing tests legitimate at plan time; unrunnable = rejection;
     per-command/independent; judge-before-destructive). Must stay an *executing*
     validation — this is what satisfies the R-resolve coupling.
  2. **Coverage judgment retargets** from "credible floor" to "each feature command
     credibly completes its marked gate for this feature" — drop floor/exhaustive framing;
     uses the row's rationale column.
  3. **NEW binding check:** each row's Gate matches a gate passed as marked — exactly the
     marked set, no extras (unmarked/nonexistent gate row = rejection), no omissions
     (marked gate with no row = rejection). Today's free "Name" column had nothing to bind.
  - The plan-reviewer needs the same `Guardrails to complete:` spawn field (from Q2) to
    perform the binding check (no other channel to `.rp.md`). So that field goes to BOTH
    plan-writer (what to fill) and plan-reviewer (verify exactly-that-set was filled).
  - The "No unit-test planning" check logic is **unchanged**; only its floor-vocabulary
    carve-out retargets to "plan-completed guardrails."

- **`setup.md`: additive + one fix.**
  - Add an optional per-gate **plan-completed-for** item after name/command/agents: which of
    the gate's `agents:` run a per-pipeline command the code-plan-writer supplies instead of
    the literal captured command (non-empty subset of `agents:`, may equal it; absent =
    ordinary gate). Existing name/command/agents capture otherwise unchanged.
  - **Validation note (one sentence):** a marked gate's full command is validated at setup
    as today; its per-pipeline feature command does not exist yet and is validated later by
    the code-plan-reviewer at plan time. Validation *discipline* unchanged; only the
    feature command's timing/owner moves to plan phase.
  - **Fix the L185 reminder:** replace the mechanism-less "scope the writers' gates… leave
    the slower commands for the code-reviewers" (which wrongly implies the owner names the
    feature scope) with the real mechanism: mark a slow gate `plan-completed-for:` the
    chosen agents; the **code-plan-writer** supplies the feature command per pipeline while
    unmarked agents run the full command. Per no-duplication: state the mechanism once (in
    the capture item) and let the reminder point at *when* to reach for it (slow gates in
    large projects), not restate how it works.

- **`load.md`: one phrase.** A gate may be marked plan-completed for some of its agents,
  meaning those agents' command for that gate is supplied per-pipeline by the
  code-plan-writer (in `code-plan.md`) and resolved by the orchestrator before spawn — so
  the orchestrator's model knows a marked gate's command for marked agents comes from
  `code-plan.md`, not `.rp.md`. No new convention/section; reference setup/resolution rather
  than restate. **Caveat:** the committed-only rule (L38) stays true — the *mark + full
  command* are committed `.rp.md` data; the *feature command* is plan data, not `.rp.md`.
  The note must not imply the feature command lives in `.rp.md`.

### R-orch: orchestrator-side doc locations (Q5 part 1)

The generic spawn-field contract is stated **once** in `autonomous-workflow.md`; the two
phase files only say *when* the orchestrator acts (no-duplication-across-reading-paths).

- **`reference/autonomous-workflow.md` (L63-67) — CHANGED.** (a) The `Guardrails:` bullet
  gains a note that for a marked gate the orchestrator resolves the marked agents' command
  from `code-plan.md`'s `## Plan-completed guardrails` (bound by gate name) before spawn —
  the resolved field still carries name + exact command, source invisible to the agent.
  (b) Add a new **`Guardrails to complete:`** field to the bullet list, scoped to the plan
  phase: the marked-gate set (name + full command) passed to the code-plan-writer and
  code-plan-reviewer. Defined once here.
- **`reference/autonomous-phases/3 - plan.md` — CHANGED (small).** Currently says nothing
  about Guardrails. Add: when launching the code-plan-writer and code-plan-reviewer, the
  orchestrator passes the `Guardrails to complete:` field. Names the field + recipients;
  defers contents/format to autonomous-workflow.md.
- **`reference/autonomous-phases/4 - code.md` — CHANGED (small).** Currently references
  `code-plan.md` only as a task source. Add: in the code phase, before spawning each
  writer/reviewer, the orchestrator resolves marked gates by substituting each marked
  agent's command from `code-plan.md`'s `## Plan-completed guardrails` into that agent's
  `Guardrails:` field. States that it happens here; mechanics live in autonomous-workflow.md.

### R-edits: the complete verified lockstep edit list (Q5 part 2)

**CHANGED (10 live files):**

1. `agents/code-plan-writer.md` — `## Required test commands` (L30-35) ->
   `## Plan-completed guardrails` (gate-keyed `Gate | Command | rationale`); add reading
   the `Guardrails to complete:` input in Gather context; retarget the "Plan the test
   floor and the e2e flows" guideline (L82, drop "floor", keep e2e half); drop floor
   vocabulary in the section comment.
2. `agents/code-plan-reviewer.md` — retarget validate step (L17-19) and coverage judgment
   (L27, drop "credible floor"); NEW binding check; read the `Guardrails to complete:`
   input; retarget the floor phrase inside the "No unit-test planning" carve-out (L34,
   logic unchanged).
3. `agents/code-writer-tdd.md` — drop the `code-plan.md` test-command read (L14); unify
   "Run the guardrails" (L36-46) to one set (doc-writer shape); remove floor
   branch/vocabulary; fix self-containment guideline input list (L56).
4. `agents/code-writer-e2e.md` — same as tdd (L16, L29-39, L43, L57); KEEP the E2E test
   plan read (L13); fix self-containment input list (L49, keep the E2E test plan section,
   drop the Required test commands section).
5. `reference/conventions/setup.md` — add the per-gate `plan-completed-for:` capture item
   (after L183); add the validation-timing note (feature command validated later at plan
   phase); fix the L185 reminder to the real mechanism + correct authority.
6. `reference/conventions/load.md` — one phrase on the mark; committed-only rule (L38)
   preserved.
7. `reference/autonomous-workflow.md` — per R-orch.
8. `reference/autonomous-phases/3 - plan.md` — per R-orch.
9. `reference/autonomous-phases/4 - code.md` — per R-orch.
10. `reference/assisted-phases/3 - plan.md` — three live floor-references: L30 constraint
    (retarget to plan-completed-guardrails + e2e), L118 self-check (validate the
    `## Plan-completed guardrails` commands), L132-137 the synthesized `code-plan.md`
    skeleton (mirror the new `## Plan-completed guardrails` shape).

**VERIFY-ONLY (unchanged):**

11. `agents/code-reviewer.md` — NO change (runs handed gates; resolution upstream; no floor
    ref; e2e/behavior-verification out of scope).
12. `README.md` — NO roster change (L112 already lists the split writers); guardrails prose
    (L147, L159) is generic and does not go stale. Leave untouched to keep scope tight.
13. `## E2E test plan` section anywhere — UNCHANGED (intent L88-89). e2e writer keeps its
    E2E-test-plan read; only the test-command read is removed.

**Sweep confirmed:** every live `required test command` / `floor` / `two command set` hit
in `skills/**`, `agents/**`, `README.md`, `.rp.md` is in the files above. This repo's
`.rp.md` has no Guardrails section (default-unchanged case verified end-to-end).
`.changeset/` hits are #121 history, out of scope.

### R-pitfalls: two false-positives / asymmetries the spec must call out

- **`setup.md` L197 "floor" is a DIFFERENT sense** — the validation-floor metaphor ("the
  floor still catches the realistic failures"), NOT the test-command floor. It MUST NOT be
  swept by a blanket "remove floor" edit. Flag as a known false-positive.
- **Assisted vs. autonomous asymmetry.** Assisted mode is single-driver (no agents
  spawned), so there is NO `Guardrails to complete:` spawn field and no code-phase
  resolution-into-`Guardrails:` step — the driver IS the owner, who authored `.rp.md` and
  already knows which gates are marked, so the driver fills `## Plan-completed guardrails`
  and validates it directly. Both paths produce the same section shape. The spec must state
  this so the assisted path isn't over-engineered with a nonexistent spawn field.

### Cross-cutting invariants for the spec

- **Validation-coupling chain:** code-plan-reviewer executes/validates the
  `## Plan-completed guardrails` commands -> therefore the writer's "a declared gate that
  cannot execute -> blocker" rule is sound (non-execution at writer time is genuine drift,
  not a plan defect). The spec MUST state this dependency so the plan phase keeps the
  plan-reviewer's execute step.
- **One resolved channel to the agent (intent L54-55):** every consuming agent receives a
  single flat `Guardrails:` list; resolution happens before spawn; the agent never merges
  `.rp.md` + `code-plan.md` and never learns a command's source.
- **Default unchanged (intent L42-44):** a project/gate with no `plan-completed-for:`
  behaves exactly as today; this repo (no marked gates) emits "None" in the plan section
  and is otherwise untouched.
- **No migration / back-compat text** anywhere (consistent with the base run's posture).

## Open questions (Q&A queue) — ALL RESOLVED

1. ~~The mark's setup representation and "how the ends run."~~ Settled (R-model).
2. ~~The plan-side `code-plan.md` shape.~~ Settled (R-plan).
3. ~~Writer-end resolution, unified step, one-ended edge.~~ Settled (R-resolve).
4. ~~Reviewer side + setup/load capture.~~ Settled (R-consumers).
5. ~~Orchestrator-side doc locations + the complete lockstep edit list + assisted parity.~~
   Settled (R-orch, R-edits, R-pitfalls).

Requirements are complete. See the synthesized requirement set below.

## Synthesized requirements (input to the spec-writer)

**R1 — The plan-completed gate mark.** A guardrail gate in `.rp.md` MAY carry an optional
`plan-completed-for:` field: a non-empty subset of that gate's `agents:` whose command is
supplied per pipeline by the code-plan-writer instead of the setup-fixed command. A gate is
"marked" iff this field is present and non-empty. A marked gate MUST still carry a
setup-fixed full command. `plan-completed-for:` MUST be a subset of `agents:` and MAY equal
it (a fully plan-supplied gate; the full command is then context-only). A gate with no
`plan-completed-for:` behaves exactly as today.

**R2 — Setup captures the mark.** `setup.md`'s Guardrails capture gains the optional
per-gate `plan-completed-for:` item (after name/command/agents). The full command is
validated at setup as today; the per-pipeline feature command does not exist at setup and
is validated later at plan phase. The flawed L185 "scope the writers' gates" reminder is
replaced by the real mechanism (mark the gate; the code-plan-writer supplies the feature
command), with the correct authority (plan-writer names the command, not the owner). The
mechanism is stated once (capture item); the reminder only says *when* to reach for it.

**R3 — load.md represents the mark.** The Guardrails convention model notes that a gate may
be plan-completed for some agents, whose command is supplied per-pipeline from `code-plan.md`
and resolved by the orchestrator before spawn. The committed-only rule is preserved: the
mark and full command are committed `.rp.md` data; the feature command is plan data.

**R4 — The plan records the completions.** `code-plan.md`'s `## Required test commands`
floor section is replaced by `## Plan-completed guardrails`: a table keyed by the exact
`.rp.md` gate name (`Gate | Command | rationale`) listing the feature command that completes
each marked gate. The "floor / on top of guardrails" framing is removed. When no gate is
marked, the section is present with "None." The plan supplies a command for exactly the
marked-gate set — no extras, no omissions.

**R5 — The code-plan-writer learns the marked set and authors the commands.** In autonomous
mode the orchestrator passes the code-plan-writer the marked-gate set (name + full command)
via a new `Guardrails to complete:` spawn field; the writer fills `## Plan-completed
guardrails` for exactly those gates, choosing each feature command (its selection authority)
of the right kind for the gate's full command. In assisted mode the single driver knows the
marks directly from `.rp.md` and fills the section directly (no spawn field).

**R6 — The code-plan-reviewer validates and binds.** The plan-reviewer (a) executes each
`## Plan-completed guardrails` command (runner-resolves-and-terminates discipline), (b)
judges each feature command credibly completes its marked gate for this feature (no "floor"
framing), and (c) binds each row to a passed marked gate name — exactly the marked set, no
extras/omissions. In autonomous mode it receives the same `Guardrails to complete:` set to
perform the binding. The "No unit-test planning" check's logic is unchanged.

**R7 — The orchestrator resolves marked gates at the code phase.** Before spawning each
writer/reviewer, the orchestrator substitutes each marked agent's command from
`code-plan.md`'s `## Plan-completed guardrails` (bound by gate name) into that agent's
resolved `Guardrails:` field. Every consuming agent receives one flat resolved list and
never learns a command's source. (Assisted mode has no spawn, so no such resolution step.)

**R8 — The writers run one unified gate set.** Both code-writers' "Run the guardrails" step
runs exactly the gates handed in `Guardrails:` — one set, converged onto the `doc-writer.md`
shape with the standard three-bullet sort. The `code-plan.md` test-command read and the
"two command sets / floor" framing are removed. (The e2e writer keeps its separate E2E test
plan read.) The "a declared gate that cannot execute -> blocker" rule holds because the
plan-reviewer already validated the feature commands run (R6) — this dependency is explicit.

**R9 — The code-reviewer is unchanged.** It already runs the gates the orchestrator hands
it; resolution is upstream; its behavior-verification / e2e re-drive is out of scope.

**R10 — Scope discipline.** Every floor reference across the live skill tree is retargeted
(per R-edits); `setup.md` L197's unrelated "floor" metaphor is left intact; the `## E2E test
plan` section and README roster are untouched; no migration or back-compat text is added.
Assisted-phase parity (`assisted-phases/3 - plan.md`) mirrors the new section shape and
self-checks, without inventing a spawn field for the single-driver path.
