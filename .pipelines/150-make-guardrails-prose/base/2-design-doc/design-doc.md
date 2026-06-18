# Design Doc: Make guardrails prose

## Overview

In the Radical Pipelines skill a guardrail is currently defined as an exact command judged pass/fail
by exit code — a deterministic verification gate. That framing limits a guardrail to a runnable
command and forces every behavior that consumes one (writers gating their commits, reviewers
recording results, setup validating capture) to speak in exit-code terms. Some of the most useful
rules a project wants to enforce are not commands at all: style or content rules an agent satisfies
by its own assessment.

This change redefines a guardrail as a **prose rule an agent must satisfy** and removes the
exit-code machinery. Two kinds of guardrail coexist under one prose representation: a **command
guardrail**, whose prose tells the agent to run a command and confirm the check it describes is
satisfied, and a **judgment guardrail**, a prose rule the named agent satisfies by its own
assessment with no command to run. The binary approve/reject review outcome and the per-pipeline
command-scoping capability (the `{scope}` fill lifecycle) are preserved unchanged; only the
exit-code framing is stripped, and the command-presupposing shapes are broadened so judgment
guardrails fit.

The subject of this change is the skill and the agent profiles themselves — documentation the
orchestrator and the spawned agents read and reason over. There is no parser and no runtime that
interprets a "guardrail," so every decision is constrained by one question: can a human owner
author, and the orchestrator/agent LLM apply, this rule reliably from prose alone? This change does
not add any concrete guardrail to any project; it makes such authoring possible.

## Approach

Radical Pipelines is "documentation as code": the guardrails reference, the convention loader, the
setup flow, the spawn-time passing convention, and the agent profiles are Markdown. The
implementation is therefore a coordinated prose edit across a fixed set of files, governed by the
project's authoring rules (minimalist, generic, no duplication across reading paths, no needless
negative phrasing, "prose, not software").

The approach rests on four design moves:

1. **One concept, two kinds, one block.** Redefine the guardrail concept positively, introduce the
   two kinds as labelled bullets, and express both kinds with a single unified per-guardrail block.
   The block carries one kind-neutral prose body field instead of a `command:` field; a command
   guardrail's body embeds a command, a judgment guardrail's body is the rule itself. No new field
   is added.

2. **Reposition fixed/scoped as a command-only sub-distinction.** Fixed vs scoped is a property of
   command guardrails only — a judgment guardrail is neither. This fact is stated in exactly one
   place (the kinds definition), nested under the command-guardrail bullet.

3. **Broaden the consuming behaviors, asymmetrically.** Reviewers gate on **both** kinds — they
   *evaluate* each guardrail (running a command or assessing a rule) and record a per-guardrail
   result. Writers stay **command-focused** — they run command guardrails and gate their commit on
   them; judgment-result-recording belongs to reviewers. Setup validates a command guardrail by
   running it (accepting one that runs even when its check currently fails) and captures a judgment
   guardrail verbatim, the way the commit format is captured.

4. **Remove exit-code framing while preserving load-bearing meaning.** Strip every exit-code phrase
   ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code") from the nine in-scope
   files, preserving the meanings that matter — setup accepting a runnable-but-currently-failing
   command, and the writer/reviewer "the command ran but the check it describes isn't satisfied"
   outcome — through kind-neutral prose.

The `{scope}` fill lifecycle, the plan agents, and the assisted-mode plan-scope validation are
**not edited**. They operate only on scoped command guardrails, and a judgment guardrail is
structurally never scoped, so it never reaches that machinery. This is why the out-of-scope files
need no guard clause and no edit.

## Components

The change touches **nine in-scope files**. They divide into the model, the loader, the spawn-time
convention, setup capture, the writers, and the reviewers.

### The model — `skills/radical-pipelines/reference/guardrails.md`

The canonical source of the guardrail model. The other files point at it; the kinds and the block
are defined here once.

- **Definition.** A single positive sentence: a guardrail is a prose rule an agent must satisfy,
  with no exit-code framing.
- **Kinds.** An H2 introducing the two kinds as bolded-label + em-dash-gloss bullets — **command
  guardrail** (its body tells the agent to run a command and confirm the check it describes is
  satisfied) and **judgment guardrail** (a prose rule the named agent satisfies by its own
  assessment, no command). **Fixed** and **scoped** are demoted to nested sub-bullets under the
  command-guardrail bullet, stating that fixed/scoped is a property of command guardrails only and a
  judgment guardrail is neither.
- **The per-guardrail block.** The `command:` field is renamed to a kind-neutral prose body field
  (recommended label `rule:`; the label is a non-load-bearing wording call). `agents:` is unchanged;
  `fill-guidance:` stays, tagged optional and scoped-command-only. A judgment guardrail's block is
  name + body + `agents:`, omitting the `{scope}` placeholder (which lives only inside a command)
  and `fill-guidance`, the way a fixed command guardrail already omits `fill-guidance`. The block H2
  is renamed "per-guardrail block".
- **The fill lifecycle.** Behavior unchanged; terminology only ("scoped gate" → "scoped command
  guardrail", "gate → scope value" → "guardrail → scope value").

### The loader cell — `skills/radical-pipelines/reference/conventions/load.md`

A one-line "What it covers" gloss in the convention table, read by the orchestrator. It loses the
exit-code framing and becomes a terse non-exit-code phrase covering both kinds. The local-override
policy line (guardrails are shared/committed-only) is unchanged.

### The spawn-time block — `skills/radical-pipelines/reference/conventions/passing.md`

Carries the spawn-time `## Conventions` block. The **Guardrails** field tells the orchestrator to
place the guardrails naming an agent, resolving a scoped guardrail's `{scope}` from the plan. It is
rewritten to substitute the scope value into the guardrail's **body** and place the resolved body;
any other guardrail's body passes literally. The "Guardrail scopes to fill" plumbing that targets
the plan agents is cosmetic terminology only ("gate" → "guardrail") — its scoped-command semantics
are out of scope and are never broadened for judgment guardrails.

### Setup capture — `skills/radical-pipelines/reference/conventions/setup.md`

The Guardrails capture section, the heaviest remaining exit-code vocabulary. It is rewritten to:

- scope the run-time validation to **command guardrails** and route **judgment guardrails** to
  verbatim capture (the commit-format analogy);
- replace "did the command execute?" with "did the command run?" and the two outcomes with
  exit-code-free prose — **runs ⇒ write it** (the bar is that it runs, not that its check currently
  passes) and **does not run ⇒ do not write it** (surface the error to the owner);
- add a **generic** judgment-guardrail prompt to "kinds to consider";
- apply terminology-only edits elsewhere in the section (gate → guardrail / command guardrail).

### The writers — `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/doc-writer.md`

Each profile's "Run the guardrails" step. Writers stay command-focused: they run every command
guardrail exactly as its command is written, gate their commit on every guardrail's check being
satisfied, and sort each into a three-way outcome — no guardrails ⇒ proceed (not a blocker, no
warning); a command guardrail that cannot run at all ⇒ blocker; a command guardrail that runs but
whose check is not satisfied ⇒ work, not a blocker. The two code writers' guardrail sections are
byte-identical and must receive the identical rewrite to stay identical. doc-writer keeps its own
no-convention fallback ("the step-3 accuracy verification is your only validation") and its
step-3 "gate" → "guardrail" sweep item.

### The reviewers — `agents/code-reviewer.md`, `agents/doc-reviewer.md`

Each profile's "Run the guardrails" step, its Checks table, and its blocker guideline. Reviewers
evaluate **both** kinds: they run a command guardrail's command and check whether its check is
satisfied, or assess whether a judgment guardrail's rule is satisfied, recording a per-guardrail
result. The Checks table's middle column generalizes to a kind-neutral `Guardrail` column and its
Result values become satisfied / unsatisfied / skipped. The two reviewers mirror each other with
two pre-existing intentional differences preserved ("finally approve" vs "approve"; "step-2/3
judgment" vs "accuracy spot-check").

### Deliberately not changed

The four plan agents (`code-plan-writer.md`, `code-plan-reviewer.md`, `doc-plan-writer.md`,
`doc-plan-reviewer.md`) and `reference/assisted-phases/3 - plan.md` carry the `{scope}` fill and
validation lifecycle, including the "did the command's runner resolve and terminate?" execution
check. They are not in the in-scope set and are not edited; they retain "gate"/"Gate" terminology.

## Interfaces and Data Flow

The guardrail flows through the pipeline as prose, keyed by guardrail name. No machine-readable kind
flag exists or is introduced; every consumer reads the body or keys on the name.

1. **Authoring (setup).** The owner authors a per-guardrail block in `.rp.md`: a name, a prose body,
   the applicable `agents:`, and (for a scoped command guardrail) optional `fill-guidance`. For a
   command guardrail, setup runs the command to confirm it runs (accepting it even if its check
   currently fails). For a judgment guardrail, there is no command, so this validation does not
   apply and the rule is captured verbatim.

2. **Loading.** The orchestrator loads guardrails from the committed convention file (never from a
   local override) per the loader's convention table.

3. **Scope resolution (scoped command guardrails only).** For a scoped command guardrail, the
   planning agent of the phase whose agents run it chooses the `{scope}` value and records it in the
   plan's `## Guardrail scopes` section (guardrail → value). This is keyed by guardrail **name**, not
   by any body field. A judgment guardrail is neither fixed nor scoped, so it never receives a
   `## Guardrail scopes` row.

4. **Spawn-time placement.** The orchestrator places each guardrail naming the spawned agent into
   that agent's prompt. For a scoped command guardrail it substitutes the resolved scope value into
   the body and places the resolved body; any other guardrail's body passes literally. Because
   `agents:` controls placement, a judgment guardrail confined to reviewers never appears in a
   writer's prompt.

5. **Consumption.**
   - A **writer** runs each command guardrail it received and confirms its check is satisfied before
     committing, sorting failures into the three-way outcome. A judgment guardrail received by a
     writer (if an owner named the writer in its `agents:`) is simply convention prose the writer
     follows as guidance — it is neither "a command guardrail you cannot run" nor "a command
     guardrail that runs but isn't satisfied," so it raises no spurious blocker; the reviewer remains
     the agent that formally gates on it.
   - A **reviewer** evaluates each guardrail it received and records a per-guardrail result in the
     Checks table. An unsatisfied guardrail of either kind is a rejection finding that drives the
     verdict to reject through the existing must-fix machinery, preserving the binary approve/reject
     outcome.

The discriminator between the two kinds is the **presence or absence of a command in the body**, not
a structural flag. Setup's run-time validation applies only when the body names a command; the
reviewer's Checks table holds the body whether or not it names a command; the writer relies on
`agents:` plus the "a command guardrail …" naming of its sort entries to ignore commandless bodies.

## Key Decisions

Each decision traces to a spec requirement (R#) or acceptance criterion.

1. **Redefine the guardrail as a prose rule, positively phrased, with no exit-code framing.**
   *Traces to:* R1, R13; AC "describes a guardrail as a prose rule … contains no exit-code framing."
   The existing definition is positive, so the redefinition stays positive and adds no "don't"
   clauses.

2. **Introduce the two kinds as labelled bullets and demote fixed/scoped to nested sub-bullets under
   the command-guardrail bullet.** *Traces to:* R2, R6; AC "the same unified block expresses it …
   it is neither fixed nor scoped." Reuses the skill's own "concept → kinds → block → lifecycle"
   skeleton and the nested-sub-case precedent, so it reads like the surrounding model files and adds
   no new structure. This is the single place the fixed/scoped-is-command-only fact is stated.

3. **Express both kinds with one block by renaming `command:` to a single kind-neutral prose body
   field (recommended `rule:`); add no second body field and no kind flag.** *Traces to:* R3, R4,
   R5, R14; ACs "accepted as a judgment guardrail without requiring a command," "carrying a name,
   the rule prose, and the applicable agents, while omitting the `{scope}` and fill-guidance fields,"
   "introduces no new block structure beyond the unified block and the existing `agents:` field." The
   block already contains both a backticked-token field and a free-prose field; a prose body that may
   embed a backticked command is fully idiomatic. No consumer needs a structural kind flag — setup
   keys on the presence of a command in the body, the reviewer's table holds the body, the writer
   keys on `agents:`, and the orchestrator keys on the guardrail name — so a second field (option B)
   and a distinguishing convention (option C) are both rejected on minimalism grounds.

4. **`{scope}` resolution and the fixed/scoped lifecycle are untouched; the body-field rename does
   not break them.** *Traces to:* R6; spec Out of Scope; AC "the planning agent chooses the
   `{scope}` value and records it … the orchestrator resolves it … with no exit-code framing." `{scope}`
   resolution is keyed by guardrail **name** and performed by textual token substitution, indifferent
   to whether `{scope}` sits in a dedicated field or inside a command embedded in the prose body. The
   plan agents and assisted-mode validation operate only on scoped command guardrails, which a
   judgment guardrail can never be, so they need no edit and no guard clause.

5. **Reviewers evaluate both kinds and record a per-guardrail result; the Checks table generalizes
   to `| Check | Guardrail | Result |` with Result ∈ satisfied | unsatisfied | skipped.** *Traces
   to:* R7, R8, R9, R14; ACs "records a per-guardrail result obtained by running the command,"
   "records a per-guardrail result obtained by its own assessment … a guardrail with no command
   still produces a valid result," "that finding is must-fix and drives the verdict to reject." The
   umbrella verb "evaluate" generalizes "run a command" and "assess a rule"; "satisfied/unsatisfied"
   reuses the spec's own result words and fits both kinds. The middle column holds the body (command
   or rule) so a commandless row is valid — one header relabel and a value swap, no new column. The
   blocker case stays command-guardrail-only (a judgment guardrail can always be assessed, so it has
   no "cannot run" analog); the normal-finding case broadens to both kinds.

6. **Writers stay command-focused; writer-side judgment gating is intentionally out of scope.**
   *Traces to:* R10, R11; ACs "when the command cannot run at all … the writer treats it as a
   blocker; and when the command runs but the check it describes is not satisfied … work to fix."
   The spec's writer ACs are entirely command-specific and there is no "given a writer that received
   a judgment guardrail" AC, while the reviewer has both — a deliberate asymmetry. Adding writer-side
   judgment gating would be speculative scope the authoring rules forbid. Naming the three-way-sort
   entries "a command guardrail …" closes the received-but-commandless case without new prose.

7. **Preserve the cannot-run-vs-not-satisfied distinction by meaning, stated without "exits
   non-zero".** *Traces to:* R10, R13; AC "both expressed without exit-code vocabulary." "Cannot run
   at all" (missing tool, renamed script) is a blocker; "runs but whose check is not satisfied" is
   work to fix. "Failing tests or broken builds are not blockers" already covers the
   runs-but-not-satisfied case in the blocker guideline.

8. **Setup validates a command guardrail by running it (accept if it runs even when its check fails;
   reject if it cannot run) and captures a judgment guardrail verbatim via the commit-format
   analogy.** *Traces to:* R12; ACs "a command that runs is accepted even if its check currently
   fails, and a command that cannot run is rejected — described without 'exit 0' or 'exit code'
   vocabulary," "the run-time validation does not apply and the rule is captured verbatim." The
   commit-format precedent ("ask the owner for the format and capture at least one concrete example,"
   no validation) is the exact analogy the spec draws. Dropping "and exit code" from the failure
   surface loses nothing load-bearing — the error (command-not-found, not-executable, hang) is what
   the owner acts on.

9. **Add a generic judgment-guardrail prompt to setup's "kinds to consider".** *Traces to:* R1, R12;
   AC "captured verbatim." The ACs mandate only that setup *accept* a judgment guardrail, but the
   "kinds to consider" prompt is setup's prompting surface; leaving it command-only would make the
   motivating use case practically unreachable. The recommended fuller prompt better serves the
   redefinition's purpose. (The prompt-vs-only-accept depth is an open question — see Risks.) The
   example must be described generically and must never name a project-specific convention file.

10. **Remove all exit-code framing from the nine in-scope files and standardize terminology; edit
    the writer/reviewer guardrail sections in place rather than factoring a shared reference file.**
    *Traces to:* R13, R14; ACs "no exit-code framing … remains, while every load-bearing meaning …
    is preserved," "states shared instructions once rather than duplicating them across reading
    paths, and adds no structural tests." Agent profiles are self-contained by design (zero
    `reference/` references, heavy pre-existing verbatim duplication that is never factored out); a
    new shared reference file would be the new structure the constraint forbids. The duplication
    pre-dates this change, so "states shared instructions once" is read as "adds no new cross-path
    duplication." Terminology standardizes on guardrail / command guardrail / judgment guardrail,
    satisfied / unsatisfied for results, and run / cannot run for command execution.

## Dependencies

- **The spec (`1-spec/spec.md`)** fixes the vocabulary — guardrail, command guardrail, judgment
  guardrail, fixed/scoped, the five guardrail-running agents — which the design reuses verbatim per
  the project rule "reuse the terms the skill already defines."
- **The existing skill idioms** the change relies on: the "concept → kinds → block → lifecycle"
  model-file skeleton; the nested-sub-case bullet pattern; the `_(optional)_` model-file tag; the
  commit-format verbatim-capture precedent in setup; and the convention table's terse "What it
  covers" gloss style.
- **The preserved `{scope}` lifecycle** (the plan agents, the `## Guardrail scopes` plan sections,
  and the assisted-mode plan-scope validation) is a dependency the change must leave intact: the
  body-field rename must not break name-keyed, textual `{scope}` resolution.
- **The must-fix review machinery and the binary approve/reject verdict** are depended upon
  unchanged; only the per-guardrail fail *source* broadens (a judgment guardrail can fail by
  assessment).

## Failure Modes and Observability

There is no runtime; "failure" here means an owner or agent cannot apply the prose reliably, or the
edit drifts. The relevant modes:

- **A judgment guardrail reaching the `{scope}` machinery.** Prevented structurally: a judgment
  guardrail is neither fixed nor scoped, has no command, and is never passed in "Guardrail scopes to
  fill," so it never gets a `## Guardrail scopes` row and is never substituted or validated. No guard
  clause is needed.
- **A writer raising a spurious blocker on a received judgment guardrail.** Prevented by naming the
  three-way-sort entries "a command guardrail …": a judgment-guardrail body matches neither failure
  entry, so the writer follows it as guidance and the reviewer remains the gating agent.
- **A reviewer unable to record a result for a commandless guardrail.** Prevented by generalizing the
  Checks table's middle column to hold the body and the Result values to satisfied / unsatisfied /
  skipped — a no-command row is valid.
- **Setup wrongly rejecting a command guardrail whose check currently fails.** Prevented by stating
  the acceptance bar as "the command runs," not "its check currently passes" — a red-test or
  mid-development state is acceptable.
- **The no-guardrails path mistaken for an error.** With no guardrails declared, a writer or reviewer
  proceeds on its other validation; this is not a blocker and warrants no warning. Preserved
  unchanged.
- **Partial terminology application leaving "gate"/"pass/fail"/"execute" stragglers, or the two code
  writers drifting apart.** Observable by reading: the acceptance criterion requires zero exit-code
  framing across all in-scope files, and the two code writers must remain identical. Verification is
  by reading, not by a structural test.

## Risks and Open Questions

- **Judgment-guardrail examples must be generic.** The spec motivates this feature with a project's
  own reviewer rules, but the skill must stay generic — no tool-, tracker-, or project-specific
  mentions. Any judgment-guardrail example added to the skill (in `guardrails.md` or `setup.md`) must
  be described generically (e.g. "a style or content rule an agent satisfies by its own assessment"),
  and must **never name the project's own `AGENTS.md` file or this project**. That reference belongs
  only in the spec and this design doc as motivation. The design-doc-writer and the code-writers must
  hold this line.

- **Open question — prompt for judgment guardrails, or only accept one? (`setup.md:175`).** The
  acceptance criteria mandate only that setup *accept* a judgment guardrail. Whether "kinds to
  consider" is broadened into a full prompt (recommended — the motivating use case depends on the
  owner being asked) or limited to a brief "a guardrail may also be a judgment rule" note is a
  minimalism call left to the plan phase. Both satisfy the ACs. Not a blocker — a wording-scope
  choice.

- **Scope-boundary terminology mismatch ("Gate" survives in out-of-scope plan files).** After this
  change the in-scope files say "guardrail" while the out-of-scope `{scope}` plan machinery (the four
  plan agents and `reference/assisted-phases/3 - plan.md`) still says "gate"/"scoped gate" and uses a
  `| Gate | Scope |` column header. This is a **deliberate scope boundary** — the spec preserves the
  `{scope}` lifecycle and lists only the nine in-scope files — **not** an inconsistency this change
  fixes. A downstream reviewer should not flag the surviving "Gate"/"scoped gate" terminology as a
  missed edit; aligning it is possible future work, out of scope here.

- **Vocabulary consistency across the nine files.** The change introduces one result word
  (satisfied/unsatisfied), one reviewer umbrella verb (evaluate), and consistent guardrail
  terminology. These must be applied uniformly or the prose drifts; a partial application leaving
  exit-code or "gate" stragglers would miss the acceptance criterion requiring zero exit-code framing
  across all in-scope files.

- **The two code writers must stay byte-identical.** Their guardrail sections are byte-identical
  today; the identical rewrite must land in both `code-writer-tdd.md` and `code-writer-e2e.md`. A
  divergence introduced by editing only one would be a new inconsistency.

- **"Prose, not software" — no structural tests.** The project rule forbids structural tests that
  assert the content, sections, wording, or ordering of skill or agent files. Because this whole
  change is prose, the code phase must verify it by reading, not by adding tests that restate the
  skill.
