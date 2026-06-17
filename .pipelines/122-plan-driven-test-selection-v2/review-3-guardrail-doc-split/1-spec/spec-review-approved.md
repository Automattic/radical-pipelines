# Spec Review: Guardrail documentation split (review-3)

## Verdict: approved

## Summary

The spec faithfully describes the documentation-architecture re-baseline the owner shipped on the branch. It is standalone, every acceptance criterion is observable and testable, scope is explicit (behavior unchanged, owner edits not reverted, the fixed/scoped model not reopened, no structural prose tests), and the requirements and acceptance criteria are internally consistent. The critical extra check — every claim the spec makes about the shipped state is true against the worktree — passes in full. Approved.

## Verification against the shipped worktree

Each shipped-state claim was checked against the actual files:

- **`guardrails.md` is the model only** (Req 1 / AC 1) — `skills/radical-pipelines/reference/guardrails.md` contains only gate kinds, the `.rp.md` per-gate block, and the fill lifecycle; no Validation, Resolve-and-run, or Spawn-fields sections. TRUE.
- **`passing.md` owns how guardrails reach agents** (Req 2 / AC 2) — `reference/conventions/passing.md:10,13` hold the `Guardrails:` and `Guardrail scopes to fill:` fields and the "resolved command after `{scope}` substitution" definition, both referencing `guardrails.md`. TRUE.
- **Spawn fields + resolved-command definition live only in `passing.md`** (Req 4 / AC 3) — grep across the skill returns those two lines in `passing.md` and nowhere else. TRUE.
- **Single reading path `passing.md → guardrails.md`, nothing back** (AC 3) — `passing.md:10,13` reference `guardrails.md`; `guardrails.md` references no convention file. TRUE.
- **Validation documented where performed** (Req 3 / AC 4) — `setup.md:179` (validate fixed literally; validate scoped with a realistic made-up `{scope}`); the autonomous plan-reviewers (`code-plan-reviewer.md:19`, `doc-plan-reviewer.md:20`, step 2) and assisted `3 - plan.md:118,211`. `guardrails.md` carries no validation. The "plan-reviewers / phase 3" phrasing correctly spans the autonomous reviewer agents and the assisted phase-3 reference. TRUE.
- **Agent self-containment** (Req 5 / AC 5) — grep for skill-file/`.rp.md` references across all 18 profiles in `agents/` is clean; `AGENTS.md:14` states the rule verbatim ("an agent reads only its own profile and its initial prompt"); `CLAUDE.md` is a symlink to `AGENTS.md` (single-sourced). The running agents' "Run the guardrails" step operates on the received `Guardrails:` field only. TRUE.
- **Resolve is a silent gap** (Req 6 / AC 6) — the only orchestrator-path mention of `{scope}` substitution is the field-content description at `passing.md:10`; `autonomous-phases/4 - code.md:34` spawns with the verbatim task block and is silent on guardrails, and `autonomous-workflow.md:63` defers the whole `## Conventions` block to `passing.md`. No line instructs the orchestrator to read `## Guardrail scopes`, substitute, and place the result. TRUE. The requirement correctly frames making the `Guardrails:` line an active instruction as documentation-only (the orchestrator already had to produce that resolved content), so no behavior change.
- **review-2 reframe targets** (Req 7 / AC 7) — every cited line matches: review-2 `spec.md:9` carries "and how guardrails reach agents"; `spec.md:37` carries "without their needing to read setup, the workflow, or the agent files"; `design-doc.md:18` carries "the spawn fields"; the Decision "Two references, not one" is at `design-doc.md:61-66`; the Flow line placing substitution in phase 4/5 is at `design-doc.md:57`. The two non-reframed items (R1's second sentence and the existence of `passing.md`) are correctly preserved. TRUE.
- **Artifact-name correctness** (Req 8 / AC 8) — `docs-plan.md` appears exactly once across the tree, at `guardrails.md:32`; `doc-plan.md` (singular) appears in 10 other files. The "lone typo" framing is precise, and the fix is correctly described as to-be-made (the shipped file still reads `docs-plan.md`). TRUE.

## Other checks

- **No contradiction with the shipped skill.** No acceptance criterion describes a state that is not real, and none contradicts what shipped.
- **No scope creep.** Out of Scope explicitly fences behavior, the owner's edits, and the fixed/scoped model; Requirement 6 is bounded to documentation. The project rule against structural prose tests is honored (AC are content/trace checks, not assertions over file structure).
- **Requirement ↔ acceptance-criterion coverage is 1:1** (Reqs 1–8 map cleanly to AC 1–8).
