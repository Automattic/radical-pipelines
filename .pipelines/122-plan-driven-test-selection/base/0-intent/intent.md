# Plan-driven test selection and reviewer-side behavior verification

> Source: GitHub issue #122 — https://github.com/Automattic/radical-pipelines/issues/122.
> This file is self-contained; agents do not need to open the source issue.

## Goal

Test selection is owned by phase-3 planning instead of each code-writer's judgment, and behavior verification happens once, at the integrated-feature level, by the code-reviewer — so every pipeline verifies the same way regardless of which writer ran which task.

## Constraints

- Unit-test TDD stays with the writers as-is.
- Plan-specified test commands are a floor, not the full set — writers still run their own judgment-chosen tests on top.
- The evidence requirement for behavior verification stays intact.
- The CI matrix stays at PR time, outside Radical Pipelines.

## Context

Today `agents/code-plan-writer.md` explicitly forbids planning tests ("Do NOT plan tests … Tasks describe what to build, not which tests to write"), so each writer selects tests by judgment alone. E2E tests are derived by each writer from its own per-task behavior verification (writer steps 3–4), which is mandatory with evidence and then duplicated at batch level by the reviewer. Writers run on limited models, and mid-plan features are often incomplete and unverifiable anyway.

This change is independent of the agent-scoped-guardrails change (issue #121), but both edit the same writer/reviewer agent files, so their pipelines run sequentially — this pipeline's branch is stacked on top of #121's branch.

## Assumptions / directions to explore

Open directions from the issue; later phases may confirm or revise them:

- Add a "Required test commands" section to `code-plan.md`: exact commands (exit-code semantics, the same two-question model as `.rp.md` guardrails), chosen by the planner from spec + design; every writer runs them before every commit.
- The code-plan-writer (a smart model) transforms the spec's acceptance criteria and edge cases into an explicit e2e test plan inside `code-plan.md`; writers implement those planned specs; "derive e2e from behavior verification" is removed.
- The code-plan-reviewer validates both sections: commands execute, the selection plausibly covers the feature (the same validation discipline `setup.md` applies at capture time), and e2e coverage matches the spec.
- Remove the writer-side behavior-verification step; the reviewer verifies the integrated feature: free-form plus manually re-driving the planned e2e flows.
- Split `code-writer` into `code-writer-tdd` and `code-writer-e2e`, with the orchestrator dispatching by task type — a writer defined around TDD shouldn't also be the e2e implementer. The per-agent Agent-models convention already lets each run a different model, so no convention change is expected.
- Likely touches: `agents/code-plan-writer.md`, `agents/code-plan-reviewer.md`, `agents/code-writer.md` (split into two), `agents/code-reviewer.md`, `reference/autonomous-phases/3 - plan.md` and `4 - code.md`.
