# Spec Review

## Verdict: approved

## Summary

The spec faithfully captures the intent: unifying the writers' two command sets into a
single per-pipeline completion of the project guardrails, opt-in per gate via a
`plan-completed-for` mark, with the code-plan-writer as the authority over the feature
command and the orchestrator resolving marked gates before spawn. It is complete, sound,
testable, and aligned with both the intent and the skill-authoring rules. I verified every
load-bearing factual claim against the actual repository and found no defects warranting
rejection.

## What I checked against the repository

- **Current-state claims are accurate.** The four agent files (`code-plan-writer.md`,
  `code-plan-reviewer.md`, `code-writer-tdd.md`, `code-writer-e2e.md`) carry the
  `## Required test commands` floor schema, the "two command sets … AND the floor"
  language, the floor-specific bullets, and the self-containment input entries exactly as
  the spec describes.
- **Setup/load claims hold.** `setup.md` captures name/command/agents per gate (L179-183),
  carries the mechanism-less "scope the writers' gates" reminder (L185), and has the
  unrelated validation-floor metaphor (L197) that the spec correctly flags as a
  false-positive to leave intact. `load.md`'s committed-only rule (L38) is real and the
  spec preserves it.
- **Orchestrator/phase claims hold.** `autonomous-workflow.md`'s `## Conventions` spawn
  block (L63-67) is where the `Guardrails`/`Guardrails to complete` contract belongs;
  `autonomous-phases/3 - plan.md` and `4 - code.md` are the right "when" sites; the
  assisted `3 - plan.md` carries the three live floor references (L30, L118, L132-134) the
  spec retargets without inventing a spawn field.
- **No-change verifications are correct.** `code-reviewer.md` already runs "every gate in
  the guardrails convention" with resolution upstream and no floor reference (R9). The
  README roster (L112) already lists the split writers and its guardrail prose (L159) is
  generic (out of scope).
- **Sweep is complete and exact.** Every live `required test command` / `floor` /
  `two command` hit across `agents/`, `reference/`, and `README.md` lands in exactly the
  ten files of R10 plus the one flagged `setup.md:197` false-positive. The README has zero
  relevant hits.
- **Default path exercisable here.** This repo's `.rp.md` declares no guardrails, so the
  no-marked-gates / "None" plan-section path is verifiable end-to-end in this repository,
  as the spec asserts.

## Soundness

- The validation-coupling chain is explicit and correct: R6 makes the code-plan-reviewer
  *execute* each `## Plan-completed guardrails` command, which is precisely what makes R8's
  "cannot execute → blocker" rule sound for plan-resolved commands (non-execution at writer
  time is genuine drift, not a plan defect).
- The one-resolved-channel invariant is preserved (the agent receives one flat list and
  never learns a command's source), consistent with the intent's resolution-before-spawn
  posture and the #121 precedent.
- The autonomous/assisted asymmetry is handled correctly: no `Guardrails to complete` spawn
  field and no code-phase resolution step in assisted mode, because the single driver
  authored `.rp.md` and knows the marks directly.
- The model edges are clean: a marked gate must still carry a setup-fixed full command;
  `plan-completed-for` is a non-empty subset of `agents` that may equal it (full command
  then context-only); a gate without the field is unchanged; exactly-the-marked-set binding
  with both extras and omissions as rejections.

## Testability

All ten acceptance criteria are concrete and checkable against named files and sections,
each maps cleanly to a requirement, and the marked/unmarked, subset/equal, exactly-the-set,
binding-failure, and empty-case behaviors are all stated as verifiable conditions.

## Skill-authoring rules

- **Generic.** The spec mentions only the skill's own agent identifiers; no coding-tool or
  issue-tracker references appear in it (the intent's GitHub-#122 note is explicitly a
  convenience reference and stays in the intent).
- **No duplication across reading paths.** R10 mandates the spawn-field contract be stated
  once in `autonomous-workflow.md`, with the phase files deferring — the rule applied
  correctly to the edits.
- **Describe as designed; minimal negatives.** The mandated edits remove the floor/negative
  framing and describe the unified system as designed.

## Minor note (non-blocking)

The spec does not explicitly state whether the new `Guardrails to complete` spawn field is
omitted-when-empty (the existing idiom for `## Conventions` fields) for a project with no
marked gates. This is a design-phase mechanics detail and does not affect the model: the
plan-writer's output is fully determined either way (the always-present section reads
"None"), and the spec already defers serialization and field mechanics to the design phase.
Recorded for the design phase, not a defect in the spec.
