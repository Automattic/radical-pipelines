# Doc Plan Review: Scoped guardrails — APPROVED

## Verdict

Approved. The doc plan's single task — rewriting the unreleased changeset `.changeset/plan-driven-test-selection.md` to the fixed/scoped framing — fully covers the only external surface that still describes the removed `plan-completed`/feature-command model, and every excluded surface is genuinely accurate-as-is.

## Coverage verification

A tree-wide grep of every external/user-facing surface — `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, all of `.changeset/`, and `website/` — for the renamed concepts (`plan-completed`, `Plan-completed guardrails`, `Guardrails to complete`, `feature command`, `feature-scoped`, `Required test commands`) returns **exactly one match**: `.changeset/plan-driven-test-selection.md:5`. That is precisely the file Task 1 targets. No external surface carrying old-model wording is missed.

The current changeset text confirms the framing the plan describes — it says a project can "mark a guardrail as completed per pipeline by the code plan, which then supplies the feature-scoped command that completes that gate" — the exact `plan-completed`/feature-scoped-command model review-2 removes. Task 1's acceptance criteria correctly require this wording gone, the fixed/scoped model (`{scope}`, per-pipeline fill by the planning phase, identical code/docs application) in, the frontmatter (`@automattic/radical-pipelines`, `minor`) unchanged, behavior-only language (no skill/agent paths, section headings, or spawn-field names), and the review-2-untouched portions preserved (up-front suite decision, spec-derived e2e plan, code-reviewer re-driving the e2e flows, the `code-writer-tdd`/`code-writer-e2e` split).

## Exclusion verification

Each excluded surface was checked against the live tree, not taken on the plan's word:

- **`README.md` (line 147)** — describes Guardrails as "deterministic verification gates (exact commands judged pass/fail by exit code)" and defers authoring to `load.md`/`setup.md`. Verified verbatim: it never referenced `plan-completed-for`, and gates remain exact commands judged by exit code under the fixed/scoped model. The fixed/scoped distinction is an internal authoring/lifecycle detail the README intentionally defers; spec/design do not ask to surface it. Line 159's `.rp.md`-organization mention of "guardrails" is likewise model-agnostic. Accurate-as-is.
- **`CHANGELOG.md`** — the `#118` Guardrails entry is a generated record of an already-shipped version describing what shipped then; it is not hand-edited for unreleased work and is regenerated at release from the changeset. Not a surface.
- **`.changeset/agent-scoped-guardrails.md`** — an orthogonal, separately-tracked agent-scoping feature (a gate naming the agents that run it), which stays true under the fixed/scoped model. Its naming of `code-writer` (singular) is a **pre-existing review-1 writer-split artifact**, not a review-2 concern: the `code-writer` → `code-writer-tdd`/`code-writer-e2e` split landed in review-1 (the live tree already carries `code-writer-tdd.md`/`code-writer-e2e.md` and no `code-writer.md`), and review-2's spec/design treat the writer set as unchanged ("as today"). Review-2 does not touch agent-naming-on-gates. Correctly excluded.
- **`website/`** — verified clean of guardrail/`{scope}`/old-model content; the only relevant hit is a demo timeline (`demo.js`) using the correct post-split `code-writer-tdd` name. Not a surface.
- **`CONTRIBUTING.md`, `.changeset/README.md`, `.changeset/config.json`** — verified clean: every "gate" hit is the changeset/CI gate, not a guardrail gate; no guardrails content. Not surfaces.
- **Skill and agent files** — correctly the code plan's domain (Tasks 1–15), not the doc plan's.

## Conclusion

Coverage is complete (the one stale external surface is targeted), the task's acceptance is well-formed and traces to spec requirement 9 / acceptance criterion 7, and every exclusion is verified accurate-as-is. Approved.
