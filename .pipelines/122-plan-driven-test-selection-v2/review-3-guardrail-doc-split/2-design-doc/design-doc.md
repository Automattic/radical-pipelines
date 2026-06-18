# Design Doc: Guardrail documentation split

## Overview

This run re-baselines the guardrail documentation so each concern has one clear home, and brings the pipeline's design into agreement with the skill **as shipped**. It is a documentation-architecture change: **behavior is unchanged**, and the owner's shipped wording is the baseline — this run refines and documents it, never reverts it.

Review-2 shipped a "comprehensive single `guardrails.md`" that explained the model, validation, resolve-and-run, the spawn fields, and how guardrails reach agents. While reviewing that work, the owner refactored the documentation directly on the branch, splitting those concerns across the files that own them. The skill now reflects that split; review-2's design and several of its spec/AC statements still describe the old single-file shape and therefore contradict the shipped skill.

This design describes the shipped split, makes one documentation gap explicit (resolve), and supersedes the five out-of-sync review-2 statements via review-3 design decisions (it does not edit review-2's artifact files).

The shipped split:

- **`reference/guardrails.md`** — the guardrail **model** only: gate kinds (fixed/scoped), the per-gate `.rp.md` block, and the fill lifecycle.
- **`reference/conventions/passing.md`** — **how guardrails reach agents**: the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the definition of a scoped gate's resolved command. It references `guardrails.md` for the model.
- **Validation** is documented where it is performed: the capture-time probe in `setup.md` and the filled-command check in the plan-reviewers / phase 3.
- **`AGENTS.md`** carries the rule that agent profiles are self-contained.

## The guardrail model (background)

A **guardrail** is a deterministic verification gate a project's running agents must pass — an exact command judged pass/fail by exit code. A gate is one of two kinds:

- **Fixed** — a literal command run as-is.
- **Scoped** — a command containing a `{scope}` placeholder filled per pipeline.

Each gate is captured at setup as a block in the project's `.rp.md`:

```markdown
### <name>

- command: `<command, with {scope} if scoped>`
- agents: <one or more of code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer>
- fill-guidance: <optional; scoped gates only>
```

`fill-guidance` is an optional owner-authored note telling the planning agent how to choose `{scope}`; absent it, the planning agent chooses `{scope}` from the spec and design.

## The fill lifecycle (as shipped)

A scoped gate's `{scope}` is chosen per pipeline by the **planning agent of the phase whose agents run the gate** — code-run gates by the code plan, doc-run gates by the doc plan. A scoped gate whose agents span both phases is filled by each phase's plan **independently** (each fills `{scope}` for its own agents), so the gate may carry a different scope value per phase. The plan records the chosen scope **value** (`gate → scope value`) in its `## Guardrail scopes` section of `code-plan.md` and/or `doc-plan.md`.

This is the lifecycle the model documents: **who fills, per-phase filling for spanning gates, and the plan recording the chosen scope value.** It deliberately does not extend to validation or resolve — those are not the model's concern (see below). This replaces review-2's "setup → plan → resolve → run" framing, which conflated the model with validation and resolve.

## The end-to-end lifecycle (across all four homes)

The model above is one segment of the full path a scoped gate travels. Documented end-to-end, with each step's home, the lifecycle is:

1. **Capture** (`setup.md`) — the owner records the gate as a `.rp.md` block; setup validates it (the probe, below).
2. **Fill** (plan-writer profiles) — the phase's plan-writer chooses `{scope}` and records the value in the plan's `## Guardrail scopes` section.
3. **Record** (`## Guardrail scopes` in the plan) — the chosen value, `gate → scope value`.
4. **Resolve** (`passing.md`, performed by the orchestrator at spawn) — the orchestrator reads the plan's `## Guardrail scopes` value, substitutes it into the gate's `{scope}` command template, and places the resolved command in the running agent's `Guardrails:` field.
5. **Run** (running-agent profiles) — the running agent runs every gate in the guardrails convention it received, exactly as written.

Fill and run are already explicit instructions in the respective agent profiles; record is explicit in the plan output. **Resolve was the one step with no active instruction** — it existed only as a passive field-content description in `passing.md`. This run makes resolve explicit (see the Resolve decision below), closing the lifecycle with no silent gap.

## Components

All components are **already shipped** except the two noted edits.

### `guardrails.md` — the model only

The dedicated guardrails reference covers exactly the model: the gate kinds (fixed/scoped), the per-gate `.rp.md` block (`command` / `agents` / optional `fill-guidance`), and the fill lifecycle (who fills, per-phase filling for spanning gates, the plan recording the chosen scope value). Its opening sentence defines what a gate *is* (an exact command judged pass/fail by exit code) — a definition of the model, not run or validation semantics.

It carries no validation content, no resolve / `{scope}`-substitution content, and no spawn-field content. The plan-output section name `## Guardrail scopes` and the `gate → scope value` recording belong to the model and stay here; the spawn *fields* (`Guardrails:`, `Guardrail scopes to fill:`) do not.

**Edit:** fix the lone `docs-plan.md → doc-plan.md` typo (~line 32). `doc-plan.md` (singular) is the established convention everywhere else in the skill; this is the only plural outlier.

### `passing.md` — how guardrails reach agents

`passing.md` is the `## Conventions` spawn block the orchestrator includes at the top of each agent's initial prompt. It is the sole home for both guardrail spawn fields, each with its applicability and omit rules:

- **`Guardrails:`** — the gates naming this agent (for `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`); omitted when not defined or the agent has no gates. For a scoped gate, the field carries the **resolved command** (the command after `{scope}` substitution).
- **`Guardrail scopes to fill:`** — the scoped gates whose `{scope}` the plan must supply (for `code-plan-writer`/`code-plan-reviewer` for scoped code gates, `doc-plan-writer`/`doc-plan-reviewer` for scoped doc gates); omitted when not defined or there are no scoped gates to fill.

`passing.md` references `guardrails.md` for the model and restates none of it.

**Edit:** upgrade the `Guardrails:` bullet from a passive field-content *definition* into an **active resolve instruction** (see the Resolve decision). One bullet: an imperative that folds in the resolved-command definition, guarded to scoped gates only (fixed gates pass literally — no read/substitute), keeping the deference to `guardrails.md`.

### Validation homes — `setup.md` and the plan phase

Validation is documented at its two performance moments, neither in `guardrails.md`:

- **Setup (capture-time probe) — `setup.md`.** Validate a **fixed** gate by running its literal command; validate a **scoped** gate by substituting a realistic, made-up `{scope}` into its command and running that. Either way the only question is **"did the command execute?"** (not exit-0) — for a scoped gate this confirms the runner resolves. The side-effects rule covers a realistic scope that runs real work.
- **Plan phase (filled-command check) — the plan-reviewer profiles, mirrored by assisted phase 3.** The code-plan-reviewer and doc-plan-reviewer carry the identical "Validate the `## Guardrail scopes`" instruction: substitute the recorded scope value into the gate's command template and execute the filled command (a runner reporting zero/missing tests is legitimate; a runner that cannot run is a rejection), plus the binding/coverage checks. The assisted `3 - plan.md` self-checks perform the same substitute-and-execute check in single-agent, human-in-the-loop shape — the assisted-mode mirror, not a third independent touchpoint.

Validation is simply **not the model's concern**, so `guardrails.md` carries none of it — there is no validation reference-edge to draw. Document-only; no behavior change.

### `AGENTS.md` — agent self-containment

`AGENTS.md` carries the rule that **an agent reads only its own profile and its initial prompt** and references no skill file or `.rp.md`. This is the home that makes the running-agent profiles' lack of any skill reference legitimate. Each running agent runs every gate in the **guardrails convention it received** (the resolved commands handed in at spawn), exactly as written — the profiles name "the guardrails convention," never "the `Guardrails:` field" or any skill file. The orchestrator makes the link between `passing.md`'s `Guardrails:` field (orchestrator-facing label) and the agent's "guardrails convention" (agent-facing name for the same content) at spawn. This is exactly why self-containment holds, and why resolve must complete entirely on the orchestrator side before spawn. Document-only; no edit.

## Architecture invariants

- **Single reading path.** `guardrails.md` is a **sink**: it references nothing back (the only filenames it names are `.rp.md` and the plan artifacts, not reference edges). `passing.md` and the other defer-files (`setup.md`, assisted `3 - plan.md`) point **into** it; the invariant is that `guardrails.md` references nothing back, not that only `passing.md` may reference it.
- **No duplication on the path.** The model (gate-kind definitions, fill-lifecycle prose, the `.rp.md` block fields) appears **only** in `guardrails.md`. The spawn fields and the resolved-command definition appear **only** in `passing.md`. `setup.md` defers to the block rather than re-showing the `### <name>` template.
- **Not duplication (do not flag).** Reusing model vocabulary ("scoped/fixed gate") across `passing.md`, `setup.md`, and phase 3 is *use* of a defined term, which the project rules require — not duplication. The `load.md` conventions-catalog one-liner is a load-time index gloss outside the model reading path, not a copy of the model.
- **Resolve in exactly one home.** Resolve lives only on `passing.md`'s `Guardrails:` line and is inherited by phases 4 and 5 through the single `autonomous-workflow.md` conventions-block hook ("Each time you spawn an agent, include the `## Conventions` block at the top of its initial prompt per `reference/conventions/passing.md`"). There is **no** separate phase-4/5 resolve/substitution step; adding one would duplicate across path files and split resolve across homes.

## Key Decisions

### Decision: `guardrails.md` = the model; `passing.md` = how guardrails reach agents

- **Choice:** split the two concerns by file — `guardrails.md` holds the guardrail model (gate kinds, the per-gate `.rp.md` block, the fill lifecycle); `passing.md` holds how guardrails reach agents (the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the resolved-command definition), referencing `guardrails.md` for the model.
- **Alternatives:** one combined reference (review-2's "comprehensive single `guardrails.md`"); a generic spawn block sitting elsewhere with the model carrying the spawn fields.
- **Trade-offs:** the split gives each concern one home and a single reading direction (`passing.md → guardrails.md`); cost is two files. It is sharper than review-2's "model + generic spawn block": `passing.md` is specifically the home of the guardrail-passing fields and resolved-command definition. (The `pipeline-versioning.md` separation trade-off review-2 cited still holds.)
- **Supersedes:** review-2's "Two references, not one" decision and its `guardrails.md` component (which listed "the spawn fields" in scope).
- **Traces to:** spec Requirements 1, 2, 4, 7.

### Decision: Resolve as one active instruction on `passing.md`'s `Guardrails:` line

- **Choice:** make `passing.md`'s `Guardrails:` bullet an active imperative — for a scoped gate, the orchestrator reads the plan's `## Guardrail scopes` value, substitutes it into the gate's `{scope}` command template, and passes the resolved command — folding the resolved-command definition into that one sentence and guarding it to scoped gates. Keep the deference to `guardrails.md`. One bullet, one home.
- **Alternatives:** add resolve lines to `4 - code.md` / `5 - docs.md` (review-2's framing); keep resolve as a passive field-content description (the status quo, which leaves a silent gap).
- **Trade-offs:** one imperative on the inherited conventions block covers phases 4 and 5 uniformly with zero per-phase duplication. The alternative phase-located lines would duplicate across files and split resolve across homes.
- **Behavior-neutral, truthfully:** running agents receive no template and no scope value and act only on what they receive, so for any scoped gate to run at all the substitution **must already happen orchestrator-side before spawn, today**. This decision only writes that existing duty down as an imperative — implicit → explicit; no new artifact, field, or phase step, and no change to who resolves, when, or what the agent receives.
- **Supersedes:** review-2's Flow line, which placed `{scope}` substitution as a phase-4/5 step.
- **Traces to:** spec Requirements 6, 7.

### Decision: Validation documented at its performance moments, not in `guardrails.md`

- **Choice:** document validation in `setup.md` (the fixed/scoped capture-time probe) and at the plan phase (the autonomous plan-reviewers, mirrored by the assisted phase-3 self-checks); `guardrails.md` carries none.
- **Alternatives:** keep validation in the guardrails reference (review-2's single-file shape).
- **Trade-offs:** validation belongs with the step that performs it; the model stays purely descriptive. No behavior changes.
- **Traces to:** spec Requirements 3, 7.

### Decision: Agent self-containment via `AGENTS.md`

- **Choice:** keep the self-containment rule in `AGENTS.md`; running agents act on the guardrails convention they received at spawn, never on a skill file.
- **Alternatives:** point running-agent profiles at `guardrails.md` (would break self-containment).
- **Trade-offs:** the orchestrator owns the link between `passing.md`'s `Guardrails:` field and the agent's "guardrails convention"; the agent never needs to know `passing.md` exists. This is what lets resolve complete entirely orchestrator-side before spawn.
- **Traces to:** spec Requirement 5.

### Decision: Supersede review-2 via review-3 design decisions, not edits to review-2 artifact files

- **Choice:** correct the five out-of-sync review-2 statements through this run's artifacts — the review-3 spec already does the spec-side reframe (its Requirement 7 *is* the reframe), and this design carries the "Supersedes review-2" section below. Review-2's committed artifact files are left untouched.
- **Alternatives:** edit review-2's `spec.md` / `design-doc.md` in place.
- **Trade-offs:** editing a prior run's committed artifacts would rewrite history and conflicts with the project rule "describe the system as designed, not historical situations" and the spec's "never revert." Quoting each old statement with the corrected truth keeps the correction mechanically checkable.
- **Traces to:** spec Requirement 7.

### Decision: `doc-plan.md` artifact-name correctness

- **Choice:** correct the lone `docs-plan.md` typo in `guardrails.md` to `doc-plan.md` (singular), matching every other reference in the skill.
- **Trade-offs:** none — a single isolated one-word fix.
- **Traces to:** spec Requirement 8.

## Supersedes review-2

Each statement below is quoted from review-2's committed `1-spec/spec.md` or `2-design-doc/design-doc.md`. These review-2 files are **not edited**; the corrected truth is established here, in this run's design, per the supersede decision above. Each corrects a statement that now contradicts the shipped skill; each traces to review-3 spec Requirement 7.

**1. Review-2 spec Requirement 1, first sentence** (review-2 `spec.md:9`):

> "A single dedicated reference explains the guardrail model end-to-end: the gate kinds, the per-pipeline fill lifecycle, **and how guardrails reach agents.**"

**Corrected truth:** the guardrails reference covers the **model only** — gate kinds, the per-gate `.rp.md` block, and the fill lifecycle. "How guardrails reach agents" is not part of it; that concern lives in `passing.md`. (Review-2 Requirement 1's *second* sentence — convention-passing documented in its own reference, which became `passing.md` — stays intact.)

**2. Review-2 spec Acceptance Criterion 1** (review-2 `spec.md:37`):

> "…it explains the gate kinds, the fill lifecycle **(setup → plan → resolve → run)**, and how guardrails reach agents, **without their needing to read setup, the workflow, or the agent files.**"

**Corrected truth:** the guardrails reference is checked for the **model** — gate kinds + the fill lifecycle **as shipped** (who fills / per-phase spanning / the plan recording the scope value), **not** the "setup → plan → resolve → run" four-arrow chain, which conflated the model with validation and resolve. "How guardrails reach agents" is checked against `passing.md`; validation against `setup.md` and the plan-reviewers. The "without their needing to read setup, the workflow, or the agent files" claim is **removed** — the split deliberately distributes those concerns.

**3. Review-2 design `guardrails.md` component** (review-2 `design-doc.md:18`):

> "`reference/guardrails.md` — orchestrator-facing model: gate kinds, the fill lifecycle, **the spawn fields.** Other files defer to it."

**Corrected truth:** `guardrails.md` is the model — gate kinds, the per-gate `.rp.md` block, and the fill lifecycle. **"The spawn fields" is removed** from its scope; the spawn fields belong to `passing.md`.

**4. Review-2 design Decision "Two references, not one"** (review-2 `design-doc.md:61-66`):

> "**Choice:** `guardrails.md` (model) + `conventions/passing.md` (spawn block)."

**Corrected truth:** the split is `guardrails.md` = the guardrail **model**, and `passing.md` = **how guardrails reach agents** — the `Guardrails:` and `Guardrail scopes to fill:` spawn fields, the resolved-command definition, and the active resolve instruction. This is sharper than "model + generic spawn block": `passing.md` is specifically the home of the guardrail-passing fields and resolved-command definition, not a generic spawn block sitting elsewhere. (The `pipeline-versioning.md` separation trade-off still holds.)

**5. Review-2 design Flow line** (review-2 `design-doc.md:57`):

> "…→ **in phase 4/5 the orchestrator substitutes each value into the `.rp.md` template** → the resolved command rides in the running agent's `Guardrails:` field → the agent runs it."

**Corrected truth:** resolve's documentation lives on `passing.md`'s `Guardrails:` line as an active instruction the orchestrator follows at spawn, inherited by both phases through the `autonomous-workflow.md` conventions-block hook — **not** as a step located inside phases 4/5. Behavior is unchanged: fill → record → resolve (orchestrator, at spawn, per `passing.md`) → run.

## Out of Scope

- **Behavior.** The fixed/scoped gate mechanism and the agent-side run protocol stay exactly as shipped. Making resolve explicit changes no behavior.
- **Reverting the owner's edits.** The shipped wording is the baseline; this run refines and documents it, never rolls it back.
- **The fixed/scoped model itself** — capture, fill semantics, per-phase filling, and symmetry across phases — unchanged from review-2 and not reopened.
- **The `load.md` catalog gloss** — a load-time index entry, not the model; no edit, do not flag.
- **The `CLAUDE.md` vs `AGENTS.md` self-containment-bullet divergence** — this run scopes the self-containment rule to `AGENTS.md`; the divergence is consistent with the spec and out of scope to reconcile.
- **Structural tests over skill or agent prose** — the project rule forbids asserting the content, sections, wording, or ordering of skill/agent files.

## Dependencies

- Internal: the `pipeline-versioning.md` pattern (a single cross-cutting reference); the `autonomous-workflow.md` conventions-block hook through which `passing.md` reaches every spawned agent; the `AGENTS.md` self-containment rule, which keeps the running agents free of any skill reference.
- External: none.

## Risks and Open Questions

- **Risk:** an upgraded `Guardrails:` bullet could read as a new behavior. Mitigated: the imperative only names a duty the orchestrator already performs before spawn; the guard to scoped gates keeps fixed gates passing literally.
- **Risk:** a future reader treats the "Supersedes review-2" quotes as edits to review-2's files. Mitigated: the section states explicitly that review-2's files are untouched and the corrected truth is established here.
- No open questions block implementation.
