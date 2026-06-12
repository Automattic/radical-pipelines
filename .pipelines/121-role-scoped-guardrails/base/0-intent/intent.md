# Role-scoped guardrails with reviewer fail-fast

> Source: GitHub issue [Automattic/radical-pipelines#121](https://github.com/Automattic/radical-pipelines/issues/121).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Guardrails can express which role runs them within the code phase, so writers run cheap gates (lints, typechecks) on every commit while expensive suites run once per pipeline — on the code-reviewer's approving iteration — instead of every code-phase guardrail being mandatory for both roles on every writer commit and every review iteration.

## Constraints

- Guardrails without a level keep today's behavior (both roles run them) — existing `.rp.md` files must keep working unchanged.
- Docs-phase guardrails are untouched.

## Context

Today guardrails have exactly one scoping dimension: phase (`code`/`docs`). `load.md` makes them "mandatory within the phase(s)", `setup.md` captures only name/command/phase per gate, and both `code-writer.md` (step 5) and `code-reviewer.md` (step 2) must run every code-phase guardrail. An expensive suite declared as a `code` guardrail therefore runs on every task commit and every review iteration; the only alternative today is not declaring it at all, which makes it no gate for anyone.

Independent of the "Plan-driven test selection and reviewer-side behavior verification" work ([#122](https://github.com/Automattic/radical-pipelines/issues/122)), though both edit the writer/reviewer agent files, so the two should not be worked on in parallel.

## Assumptions / directions to explore

- Add a level dimension (writer/reviewer) to the guardrail definition and selection rule; unscoped means both.
- The reviewer may reject early on cheaper findings without running the reviewer-scoped suites; all reviewer gates must pass on the approving iteration — that's what makes "the full run happens once per pipeline when all goes well" literally true.
- Likely touches: `reference/conventions/load.md` (definition + selection rule), `reference/conventions/setup.md` (capture asks the level per gate), `agents/code-writer.md`, `agents/code-reviewer.md`.
