# Design Doc Review — APPROVED

Design doc: `2-design-doc/design-doc.md` (revision 3ea4b79)
Spec: `1-spec/spec.md`
Research: `2-design-doc/design-doc-research.md`
Prior rejection: `2-design-doc/design-doc-review-1-rejected.md`

## Verdict

Approved. The revision corrects every blocking finding from review 1. The §3 grounding is now accurate for all six files (verified against the live tree on `worktree-121-role-scoped-guardrails` via `git show HEAD:<file>` and `git diff --stat trunk...HEAD`), and design decisions D3, D4, and the §9 deliverable map are re-anchored to source text that actually exists. The design fully and correctly satisfies the spec's R1–R9 and AC1–AC13 within the six-file scope.

## Resolution of review-1 findings

- **B1 (§3.3 / D3) — resolved.** §3.3 now states correctly that the base run already level-keyed `code-writer.md`. Verified: `:13` = "Read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing."; `:44` = "### 5. Run the writer guardrail selection"; `:46`/`:48`/`:52`/`:53`/`:73` already use "writer guardrail selection" / "the writer's selection". D3 now re-keys the surviving `code-phase … leveled `writer` or unscoped` phrasing (at `:13` and inside step 5) to "name `code-writer` or name no agents" and explicitly states the step-5 title is untouched — no longer instructing a retitle of an already-titled step.

- **B2 (§3.4 / D4) — resolved.** §3.4 now describes the real, fully-restructured `code-reviewer.md`. Verified: dedicated step `:37` "### 4. Run the reviewer guardrail selection" with bridge ¶ (`:39`), run ¶ (`:41`, naming "the code-phase guardrails leveled `reviewer` or unscoped"), fail-fast/skipped ¶ (`:43`), approval/stateless ¶ (`:45`); Checks comment block + table at `:71-77`; Guidelines "Run the guardrails." at `:110`, outcome-model bullet at `:111-114`, blocker at `:115`; read item at `:18` ("leveled `reviewer` or unscoped"). The fabricated step-2-guardrail-bullet "Note" is gone. D4 is now a pure vocabulary re-key at `:18`/`:41`/`:110`, all of which match the file.

- **B3 — resolved.** D5 now frames the doc-reviewer restructure as "templated on the base run's already-restructured `code-reviewer.md` (§3.4)", resting on the corrected §3.4. The D5 6-step target, four-¶ step 4, cloned Checks block, retained accuracy spot-check, and three-bullet Guidelines reconciliation are correct and satisfy AC9/AC10.

- **N1 — resolved.** §3 now states the base run "touched five non-`.pipelines` files (`code-reviewer.md`, `code-writer.md`, `load.md`, `setup.md`, and `.rp.md`) plus the changeset," matching `git diff --stat trunk...HEAD` exactly, and correctly notes `.rp.md` is out of the six in-scope files and left untouched.

## Independent verification (this round)

- §3.1 `load.md` (`:22`, `:24-30`, `:26`, `:28`, `:30`, `:46`) — matches the live file.
- §3.2 `setup.md` (`:171-203`, `:181-184`, `:186-192`, `:194`, `:196-213`) — matches.
- §3.3 `code-writer.md` (`:13`, `:36`, `:44-55`, `:46`, `:48`, `:52`, `:53`, `:73`) — matches.
- §3.4 `code-reviewer.md` (`:8`, `:18`, `:33-35`, `:37-45`, `:39`, `:41`, `:43`, `:45`, `:71-77`, `:110`, `:111-114`, `:115`) — matches.
- §3.5 `doc-writer.md` (`:35`, `:38-48`, `:45`, `:67`) — matches (pre-base/phase-keyed, so D5's "from 'the docs-phase guardrails'" anchor is correct).
- §3.6 `doc-reviewer.md` (5-step, `:33` guardrail bullet, `:62-64` Checks, `:67-69` accuracy spot-check, `:98`/`:99` Guidelines, no fail-fast/skipped/stateless) — matches.
- D1/¶1–¶4, D2 (capture-bullet reshape, `Name | Command | Agents` table, untouched validation block) — accurately grounded and satisfy AC1–AC6 and AC11.
- §6 confinement, §7 AC mapping, §8 out-of-scope, §9 per-file deliverable map — internally consistent and within the six-file scope (AC13); the changeset reword is correctly held as a docs-phase obligation (AC12).

## Non-blocking observation (no rework required)

- **Off-by-one in §3.4's descriptive grounding.** §3.4 says step 2's last bullet is "`:32` '**Convention compliance** …'". On the live file that bullet is at **`:31`**; `:32` is the blank line following it. The substantive claim (step 2's last bullet is Convention compliance, with no guardrail bullet in step 2) is correct, and no edit-bearing citation depends on it — D4's actual targets are `:18`/`:41`/`:110`, all exact. This is a one-line precision nit, not a defect; the plan/code phases can safely proceed. Worth tightening to `:31` if the doc is touched again, but it does not warrant a rejection.
