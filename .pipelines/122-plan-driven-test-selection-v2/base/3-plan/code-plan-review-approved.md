# Code Plan Review

## Verdict: approved

## Summary

The revised plan resolves both issues from `code-plan-review-1-rejected.md` and holds up under a fresh adversarial pass against the real worktree. Critically, the new Overview **Divergence B** note now accounts for commit `a0e3fd9` ("Gate reviewer guardrails on judgment; drop selection vocabulary," verified an ancestor of HEAD): I read the actual `agents/code-writer.md` and confirmed its current shape exactly matches the note — Gather context has no self-naming guardrail-read line, the step is named "Run the guardrails," it uses a plain three-bullet sort, and there is no "two-question outcome model" or "guardrail selection" vocabulary; the writer learns its gates from the orchestrator-passed `## Conventions` `Guardrails:` field (autonomous-workflow.md L66, "the gates that name this agent"). Tasks 3/4 and Flow 3 are now re-anchored on that real shape and assert (via greps) that the removed vocabulary stays absent, so a code-writer executing them faces no contradicting instructions. Every other anchor in the plan was checked against the real files and is accurate. The `npm test` floor runs and stays green (22 pass), `.rp.md` defines no Guardrails convention (so the floor rationale holds), and the spec's R1 "two-question model" requirement is satisfied in substance by the current three-bullet exit-code discipline even though the literal phrase is gone. The decision to treat the e2e plan as reviewer-re-driven inspection with no e2e task remains defensible for a prose-only feature. One minor internal imprecision in Flow 7's re-drive grep is noted below; it does not affect any task's executability and is not rejection-worthy.

## Resolution of the prior rejection

- **Issue 1 (guardrail vocabulary from `a0e3fd9`):** Resolved. Divergence B records the staleness of design §3's "guardrail selection / two-question / guardrail-read line" references and names the real current shapes; Tasks 3, 4, and Flow 3 are rewritten to model the new writers on the actual "Run the guardrails" three-bullet sort, extended to also run the required-test-commands floor, with no self-naming guardrail-read line and explicit no-removed-vocabulary acceptance/grep checks. Verified accurate line-by-line against `agents/code-writer.md`.
- **Issue 2 (Type field placement):** Resolved. Flow 1 step 3, Task 1 Changes, and Task 1 Acceptance now state `Type` sits "between `Goal` and `Files`" (immediately after `- **Goal:**` and before `- **Files to change:**`).

## Verified anchors

All checked against the worktree on branch `worktree-122-plan-driven-test-selection-v2`:

- `agents/code-reviewer.md`: behavior-verification body at L34, test-quality check at L28 — the plan's "design L35/L29 off-by-one, content anchor governs" note is correct.
- `reference/autonomous-phases/4 - code.md`: overview L3, single `code-writer` row at L25 ("verifies behavior, validates"), step 1 L30, step 3.1 launch L33, mermaid node — all as the plan describes.
- `reference/conventions/setup.md`: gate-running enumeration at L183 and per-task/per-pipeline reminder at L185; L189 is the validation-outcomes sort, **not** an illustrative example row — Divergence A is correct.
- `reference/conventions/load.md`: carries no gate-running enumeration — Divergence A's "no edit needed" is correct.
- `README.md` L112: bare `code-writer` in the shipped-agent roster — correct.
- `reference/assisted-phases/3 - plan.md`: L30 constraint, L117 self-check, L152 wording, skeleton L126-146, step-4 self-check L109-118, abstract mentions L25/L59/L96/L114 — all accurate.
- `.rp.md` defines no Guardrails convention; `npm test` resolves and terminates green (22 pass) — floor satisfiability holds trivially for this prose-only change.

## Note (non-blocking)

Flow 7 step 4's re-drive command greps the backtick-quoted token `` `code-writer` ``, but the files it lists as acceptable surviving hits (assisted phase-2/3, `agents/doc-writer.md`, `website/demo.js`) all use the **unquoted** `code-writer` form, so that exact grep would not surface them — its Expected reasoning references hits its own command cannot match. The flow's intent (no live skill file presents `code-writer` as a current shipped/dispatched agent) is sound, achievable, and correctly excludes the abstract phase-4-role and plural mentions that legitimately remain (consistent with design §8 and not an AC7 violation). Since Flow 7 is a reviewer-re-driven inspection — not a writer task — this imprecision forces no contradicting instruction and blocks no task. The code-reviewer re-driving it should sweep both quoted and unquoted forms and apply the stated intent rather than the literal token.
