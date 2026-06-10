# Intent

Source: [GitHub issue #113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

## Goal

Present **configuration** as the umbrella concept for everything declared in `.rp.md` and the skill, with **conventions** as one subsection inside it — alongside room for sibling subsections such as guardrails — rather than "conventions" being the top-level concept it is today.

## Context

- This surfaced while implementing guardrails (#51, PR #112): adding guardrails next to conventions needed a more generic umbrella term, and "configuration" fits. Making that rename implicitly inside the guardrails PR conflated two concerns and left it underspecified, so we're extracting it into its own issue, landing it first, and rebuilding guardrails on top.
- Today the umbrella is "conventions": `.rp.md` is titled "Radical Pipelines project conventions", and the skill keeps its loader and setup under `reference/conventions/`.
- Related: PR #112 (being closed), #51 (guardrails, re-scoped to depend on this).

## Assumptions / directions to explore

Open directions, not requirements — research may confirm or revise them:

- Likely touches every reference to "conventions" as the *umbrella* concept:
  - `.rp.md` title and top-level structure, plus the `.rp.local.md` local-overrides framing.
  - The skill's `reference/conventions/` folder and its files (`load.md`, `setup.md`, `pi.md`, `claude-code.md`) — folder and/or file renames if `reference/configuration/` reads better.
  - The loader table and prose in `load.md`, and references across `SKILL.md`, `work-on-an-issue.md`, `manage-issues.md`, `create-pipeline.md`, `fork-pipeline.md`, `pipeline-versioning.md`, and the workflow/phase files.
  - Agent files that read "the X convention".
- "Conventions" stays a meaningful subsection (the per-project rules); only the umbrella term changes. Where "convention" names a specific rule, it may remain.
- Terminology/structure refactor only — no behavioral change to the pipeline.
