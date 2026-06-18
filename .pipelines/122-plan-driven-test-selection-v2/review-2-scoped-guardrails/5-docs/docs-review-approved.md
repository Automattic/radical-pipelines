# Docs review — approved

**Batch:** docs-phase, 1 task (Task 1 of `3-plan/doc-plan.md`). **Base ref:** `433578b`. **Rejection iteration N:** 1.
**Reviewed commit:** `cf6c4e4` — "Rewrite changeset for scoped guardrails (doc-writer)".
**File:** `.changeset/plan-driven-test-selection.md`.

## Verdict

Approved. The rewritten changeset accurately describes the shipped fixed/scoped gate model, removes all review-1 framing, preserves the untouched portions in meaning, and stays behavior-only.

## Checks

- **Shipped model accurate.** "A guardrail gate is now either fixed or scoped: a fixed gate is a literal command run as-is, while a scoped gate carries a `{scope}` placeholder filled per pipeline by the plan of the phase whose agents run the gate — applying the same way to the code and docs phases." Matches `reference/guardrails.md`: fixed = literal command run as-is; scoped = `{scope}` placeholder filled per pipeline; filler = the planning agent of the phase whose agents run the gate; symmetry across code and docs phases. (spec req 2/4/8, design "Two references, not one"). Acceptance criterion 1 met.

- **No removed wording remains.** Grep for `plan-completed`, "completed per pipeline by the code plan", "feature-scoped command", "feature command", "feature-scoped" returns nothing in the file. Acceptance criterion 2 met (spec req 9 / acceptance criterion 7).

- **Unchanged portions preserved in meaning** (acceptance criterion 3):
  - Up-front test-suite decision — "the suite a change must pass is decided up front rather than per writer": preserved.
  - Spec-derived e2e test plan — "the plan turns the spec's acceptance criteria and edge cases into an explicit e2e test plan": preserved. Review-2 generalized "code plan / code-planning duty" to "the plan / a planning duty," consistent with the new model where planning applies to both phases; meaning intact, nothing dropped.
  - Behavior verification by the code-reviewer re-driving e2e flows: preserved verbatim.
  - `code-writer-tdd`/`code-writer-e2e` split dispatched by task `Type`: preserved verbatim.

- **Behavior-only, no internals** (acceptance criterion 4). Names no skill/agent file paths, no `## Guardrail scopes` heading, no `Guardrail scopes to fill:` spawn field. `{scope}` and the agent role names (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`) are user-facing release-note vocabulary, already public in the prior version. Frontmatter unchanged (`@automattic/radical-pipelines`, `minor`).

## Excluded surfaces spot-checked — all genuinely need no change

- `README.md` — Guardrails described as "deterministic verification gates (exact commands judged pass/fail by exit code)," still accurate; never referenced the prior model.
- `CHANGELOG.md` — only the already-shipped `#118` entry; no `plan-completed`/`{scope}` content; not hand-edited for unreleased work.
- `.changeset/agent-scoped-guardrails.md` — orthogonal (a gate naming the agents that run it); remains true under the fixed/scoped model.
- `website/`, `CONTRIBUTING.md`, `.changeset/README.md` — no guardrails/`{scope}` content.
