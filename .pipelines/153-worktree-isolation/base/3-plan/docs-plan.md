# Docs Plan: Keep agent edits and commits inside the pipeline worktree and branch

## Overview

The code phase makes the worktree/branch isolation of spawned agents explicit by adding two new fields to the spawn-time `## Conventions` block (an absolute worktree-root anchor for all agents, and the pipeline branch `worktree-<pipeline-slug>` for committing agents) plus the verify-before-acting behavior those fields carry. Those three skill files the code phase edits (`reference/conventions/passing.md`, `claude-code.md`, `pi.md`) are the canonical in-place documentation of the new behavior and are out of scope here. This docs plan covers the remaining surfaces that reference the same behavior and would otherwise drift: the README paragraph that enumerates what the orchestrator passes to a spawned agent at spawn time, and the changeset that this repository's changeset-gated release process requires for any change touching `skills/**`. A repository-wide sweep found no other prose surface (agent profiles, the other reference files, the website) that enumerates the `## Conventions`-block fields or restates the spawn payload, so no further tasks are warranted.

## Guardrail scopes

None — this project defines no guardrails.

| Gate | Scope |
| ---- | ----- |
| None | —     |

## Tasks

### Task 1: Reconcile the README "Configuration" spawn-payload summary with the new `## Conventions` fields

- **Goal:** Bring the README sentence that enumerates what the orchestrator passes to a spawned agent at spawn time back into sync with the two new always-/conditionally-passed `## Conventions`-block items the code phase added, so a reader of the README's Configuration section gets an accurate picture of the spawn payload.
- **Audience:** Skill users/consumers reading the README to understand how the pipeline isolates each spawned agent's work and what context an agent receives at spawn.
- **Files to change:** `README.md` (the "Configuration" section; the sentence beginning "The orchestrator loads and verifies conventions before launching phase agents. When it spawns a phase agent or team, it passes …" — the verbatim opening locates it uniquely, so use that as the anchor rather than a paragraph position).
- **Sections / scope:** Only the spawn-payload enumeration sentence and, if needed for accuracy, its immediate neighbors in the "Configuration" section. Do not restate the per-tool worktree/branch convention catalog already covered earlier in the same section, and do not duplicate the field-level prose that lives in the skill's `conventions/passing.md`.
- **Depends on:** none
- **Traces to:** Spec requirements 1, 2, 4, 5; design "Interfaces and Data Flow" (the new shape of the spawn-time `## Conventions` block); code-plan Task 1 (adds the worktree-root and branch fields to the block).
- **Acceptance:**
  - A reader of the README's Configuration section comes away understanding that the orchestrator now also passes, at spawn, the worktree-root anchor (to every spawned agent) and the pipeline branch (to committing agents) as part of the spawn-time conventions — to whatever depth of detail the docs-writer judges fits this summary-level paragraph after reading the landed skill prose.
  - The reconciled text stays consistent with, and does not contradict, the field-level definitions the code phase wrote into `conventions/passing.md` (worktree-root → all agents; branch → committing agents only).
  - The README does not duplicate the verify-before-acting instruction wording from the skill; it characterizes the spawn payload at the README's existing summary altitude.
  - If, on reading the landed prose, the docs-writer judges the existing sentence already conveys the new items accurately (e.g. as "role-specific host-project conventions"), the task is satisfied by confirming that and leaving the wording unchanged — the criterion is an accurate Configuration section, not a forced edit.

### Task 2: Add the required release changeset for this change

- **Goal:** Add the `.changeset/*.md` entry that this repository's changeset-gated release requires for any pull request touching a release-relevant path (`skills/**` here), describing the worktree/branch-isolation change at the right bump level so the changelog and the next release reflect it.
- **Audience:** Release / changelog consumers — the people who read `CHANGELOG.md` and the GitHub Release notes to learn what changed in a version.
- **Files to change:** a new file under `.changeset/` (one `.changeset/<name>.md` entry, in the repository's standard changeset front-matter format).
- **Sections / scope:** A single changeset entry for `@automattic/radical-pipelines` describing this change in imperative mood. Determine the bump type from the project's authoritative bump table and pre-1.0 policy in `CONTRIBUTING.md` ("Bump types" / "Pre-1.0 policy") against what actually landed — this is a behavioral improvement to the skill, not a bug fix and not a breaking change. Do not edit `CHANGELOG.md` directly (it is generated at release time).
- **Depends on:** none
- **Traces to:** Spec requirements 1–6 (the user-facing behavior the changeset describes); code-plan Tasks 1–3 (the `skills/**` edits that make a changeset mandatory under the changeset gate); the repository's changeset rule in `CONTRIBUTING.md` (`### When a changeset is required`, which lists `skills/**`), mirrored by `.changeset/config.json` (`changedFilePatterns`).
- **Acceptance:**
  - A committed `.changeset/*.md` entry exists for `@automattic/radical-pipelines`, in the standard changeset front-matter format, so the changeset gate's Presence check passes for a PR that touches `skills/**`.
  - The summary, in imperative mood, conveys that spawned agents' edits and commits are now kept inside the pipeline's worktree and on the pipeline branch via explicit spawn-time anchoring rather than implicit working-directory inheritance.
  - The bump type matches the project's bump table and pre-1.0 policy in `CONTRIBUTING.md` for a backwards-compatible behavioral change of this kind, with a `BREAKING:` prefix only if the landed change is actually breaking (it is not expected to be).
  - The entry is self-contained and does not duplicate skill-internal field wording; it reads as a release note for changelog consumers.

## Surfaces deliberately not given a task

The following were swept and found not to be drift surfaces for this change, recorded here so the sweep is auditable:

- **`reference/conventions/passing.md`, `claude-code.md`, `pi.md`** — the canonical in-place documentation of the new behavior; produced by the code phase, so re-documenting them here would duplicate that output.
- **Agent profiles (`agents/*.md`)** — the design deliberately leaves them untouched; the verify-before-acting behavior rides in the injected block, and no profile restates the `## Conventions` fields or the worktree/branch model.
- **`reference/autonomous-workflow.md`** — references the `## Conventions` block only by directing the orchestrator to include it per `passing.md`; it does not enumerate the block's fields, so the added fields do not make it stale.
- **`reference/conventions/load.md`, `setup.md`** — catalog the project's conventions (Worktrees, Branch names, etc.) at the convention level, not the spawn-payload `## Conventions`-block-field level; unaffected by the two new injected fields.
- **`reference/create-pipeline.md`, `fork-pipeline.md`, `resume-pipeline.md`, `review-pipeline.md`, `pipeline-versioning.md`** — describe the orchestrator's own worktree/branch lifecycle, not the spawned-agent passing path the change touches; not drifted.
- **`website/`** — mentions worktrees only abstractly as a tool primitive ("Claude Code and Pi already ship skills, teams, hooks, worktrees"); does not reference the spawn-payload behavior.
- **`CONTRIBUTING.md`, `AGENTS.md`, `CHANGELOG.md`** — release mechanics, skill-authoring rules, and generated release history respectively; none enumerate the `## Conventions` block or the spawn behavior, and `CHANGELOG.md` is generated from the changeset added in Task 2 rather than edited directly.
