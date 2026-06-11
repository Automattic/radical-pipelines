# Doc Plan: Generic per-run pipeline summary artifact

## Overview

This change adds one `run-summary.md` per run, produced at the end of phase 5 and gating run completion; review runs receive all prior runs' summaries as input; and the skill ships a default summary format a project can override through a new optional convention. The change is documentation-and-orchestration only — it edits the skill's own procedure/reference files (handled by the code plan) and adds a project-side agent. The only **external** documentation surface that makes factual claims this change invalidates is the repository `README.md`: its "Configuration" section currently describes what each run produces and enumerates the project's optional conventions, neither of which yet mentions the run summary or the new override convention. These tasks bring that prose back in sync. No other surface is affected: the website (`website/index.html`) describes the pipeline at marketing altitude (six phases, an artifact per phase) and makes no per-run-output or convention-list claim, and `CONTRIBUTING.md` / `AGENTS.md` cover release mechanics and skill-authoring rules that this change does not alter.

## Tasks

### Task 1: Update the README run model to include the per-run summary

- **Goal:** Bring the README's run-model description in sync with the new artifact: every run now produces a single run summary at completion, and a review run receives all prior runs' summaries as input.
- **Audience:** Engineers and reviewers reading the README to understand how a pipeline's runs are structured and what each run leaves behind — people who inspect the artifact folder and reason about what a run produced, not end users of a CLI.
- **Files to change:** `README.md` (the "Configuration" section's run-model paragraph — the one describing the `base/` run, the `review-N-<short-description>/` runs, and the per-run review artifacts).
- **Sections / scope:** The paragraph that explains the run model and what reviewer agents write per run. Extend it (or add an adjacent sentence) to state that each run also produces one run-level summary at completion, that it gates the run's completion, and that a review run is given the prior runs' summaries as input. Keep the README's existing voice and altitude; do not restate the skill's internal mechanics (predicate wording, the writer agent's source list, fork behavior) — those live in the skill reference files. Match the existing cross-reference style if pointing at `reference/pipeline-versioning.md`.
- **Depends on:** none
- **Traces to:** Spec requirements 1, 2, 3, 5; Acceptance criteria 1, 4; Design C2, C5, C7; Code tasks 3, 4, 5, 7.
- **Acceptance:**
  - A reader of the README's run-model description learns that each run produces exactly one run-level summary, that it is produced at run completion (final phase), and that it gates the run from counting as complete.
  - A reader learns that when a review run starts it receives the prior runs' summaries (in run order) as input.
  - The description stays at the README's altitude: it does not embed the completion-predicate string, the summary filename's internal placement rules beyond naming it a run-level artifact, the writer agent's source list, or the fork edge case.
  - The artifact is described as a generic per-run summary, not a PR description or anything coupled to a tracker, git, or a specific tool.

### Task 2: Update the README conventions list to include the new optional override convention

- **Goal:** Reflect that the skill now ships a default run-summary format and that a project can override it through a new **optional** convention, alongside the existing optional `Agent models` convention the README already lists.
- **Audience:** Project maintainers configuring a Radical Pipelines consumer — readers deciding which conventions to set in `.rp.md` and which have skill-provided defaults.
- **Files to change:** `README.md` (the "Configuration" section's conventions paragraph that enumerates shared and per-tool conventions and notes which are optional).
- **Sections / scope:** The sentence(s) listing the conventions and calling out the optional ones. Add the new optional run-summary-format convention so the enumeration is complete and note that a skill-provided default applies when a project does not set it. Keep it to the same density as the existing convention enumeration; point to the setup conventions reference the way the existing `Agent models` mention does, rather than describing the format's structure inline.
- **Depends on:** none (independent README region from Task 1; may land in either order)
- **Traces to:** Spec requirements 4, 7; Acceptance criterion 6; Design C4, D4; Code tasks 1, 2.
- **Acceptance:**
  - The README's conventions enumeration names the new optional run-summary-format convention and states that the skill provides a default used when the project is silent.
  - The new convention is presented as optional and project-overridable, consistent with how the README already frames the optional `Agent models` convention.
  - The README does not embed the default format's section structure; it references the conventions/setup reference for detail, matching the existing pattern.
  - No git-, tracker-, or tool-specific concept is introduced into the description of the format or its override.
