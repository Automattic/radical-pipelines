# Docs Plan: Rename "review runs" to "revisions"

## Overview

This change renames the runs that follow a pipeline's `base` run from `review-N` to
`revision-N`, and renames the activity that creates them from "review"/"reviewing" to
"revise"/"revising", so that "review" denotes the phase-auditing activity only. The
**code phase** (`code-plan.md`) already covers every in-skill prose surface — the 8 mapped
files under `skills/radical-pipelines/` and `.rp.md`. This docs plan covers the one
documentation surface **outside** the code plan's edits that narrates the run-naming
concept: the top-level **`README.md`**, whose run-model paragraph names the `review-N`
follow-up run and the "each review adds a sibling run" activity. The single task below is a
precision edit that renames only the run-naming tokens in that paragraph while leaving the
phase-audit "review" tokens (reviewer agents, `*-review-N-rejected.md`,
`*-review-approved.md`) and the `base/` run name byte-unchanged. An end-to-end repository
sweep found no other in-scope documentation surface; the surfaces that were deliberately
excluded, and why, are recorded under "Sweep findings" so the exclusion is auditable rather
than silent.

## Guardrail scopes

| Gate | Scope |
| ---- | ----- |
| None | None |

## Tasks

### Task 1: Rename the run-naming tokens in the `README.md` run-model paragraph

- **Goal:** Update the README's narrative description of the run model so the follow-up run
  and the activity that creates it read "revision"/"revising" (matching the skill's renamed
  convention), while every phase-audit "review" token and the `base/` run name in the same
  paragraph stay unchanged.
- **Audience:** Prospective adopters and contributors reading the project's top-level README
  to understand how runs are organized within a pipeline (the "run folder" model) before
  opening the skill's reference files.
- **Files to change:** `README.md` (the run-model paragraph in the section that describes how
  phases commit artifacts into run folders — currently a single paragraph that introduces the
  `base/` run and the follow-up run, and points at `reference/pipeline-versioning.md`).
- **Sections / scope:** Only the run-naming tokens in that paragraph:
  - the follow-up-run folder name (currently `review-N-<short-description>/`) renames to the
    revision form, keeping the `N` monotonic-counter and `<short-description>` kebab-case
    rules unchanged in substance;
  - the prose naming the act of adding a follow-up run (currently "each review adds a sibling
    … run") renames to the revise/revision wording, written as "revision run" / `revision-N`,
    never as a bare "revision";
  - **keep byte-unchanged in the same paragraph:** the `base/` run name; the phase-audit
    reviewer-agent references; the rejection-iteration artifact name (currently
    `<artifact>-review-N-rejected.md`); the approval artifact name
    (`<artifact>-review-approved.md`); and any generic owner-review-of-artifacts wording. The
    reference link to `reference/pipeline-versioning.md` continues to resolve.
- **Depends on:** none. (The README is independent of the skill-file edits; it links to
  `pipeline-versioning.md` by path, and that path is not renamed by the code plan, so no
  ordering dependency on the code tasks exists.)
- **Traces to:** Spec requirements 1, 2, 3, 5; Spec acceptance criteria on run naming
  (`revision-N-<short-description>`, `base` unchanged) and on writing the run as "revision
  run"/`revision-N` never bare; the spec invariant that no run or run-creation concept is
  named "review" and that phase-audit "review" terms are preserved; Design "Components"
  (README is not in the bucket-A skill-file map but narrates the same convention); Code tasks
  2–9 (this surface must end up consistent with the renamed convention those tasks establish
  in `pipeline-versioning.md` and the run-creation files).
- **Acceptance:**
  - A reader of the README's run-model paragraph learns that a pipeline carries a `base/` run
    plus follow-up **revision** runs named in the `revision-N-<short-description>/` form, and
    that the follow-up run is described with revise/revision wording — never as a "review"
    run.
  - The follow-up run is written as "revision run" or `revision-N`/`revision-N-<short-description>`,
    never as a bare "revision".
  - The `base/` run name and every phase-audit "review" token in the same paragraph — the
    reviewer-agent reference, the rejection-iteration artifact, and the approval artifact — are
    byte-unchanged.
  - The paragraph's reference to the run-model documentation
    (`reference/pipeline-versioning.md`) still resolves.
  - After the edit, the README contains no "review" token that names the follow-up run, the
    act of creating it, or its naming convention; any remaining "review" in the README denotes
    phase-auditing or generic owner-review-of-artifacts.

## Sweep findings

An end-to-end repository sweep (case-insensitive `review` / `revis`, plus targeted
run-naming patterns such as `review-N`, `review run`, `revise this`, `revision-N`) was run
over every documentation surface outside the code plan's 8 mapped files. The full set of
candidate surfaces — top-level `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `AGENTS.md`
(symlinked as `CLAUDE.md`), `pr-description.md`, `.github/PULL_REQUEST_TEMPLATE.md`, every
`.changeset/*.md`, the entire `website/` tree, `scripts/`, `.claude-plugin/`, and `.pi/` —
was classified. Results:

- **In scope — `README.md` (Task 1).** Its run-model paragraph is the only surface outside the
  code plan that narrates the run-naming concept (`review-N-<short-description>/` follow-up
  run and the "each review adds a sibling … run" activity). It is also release-relevant:
  `README.md` is listed in `.changeset/config.json`'s `changedFilePatterns`.

- **Out of scope — `CHANGELOG.md`.** It contains a historical, already-shipped release entry
  (the `## 0.3.0` "Add pipeline reviews" entry, PR #106) that describes the
  `review-N-<short-description>/` run as it existed at that release. Per `CONTRIBUTING.md` and
  `.changeset/config.json`, `CHANGELOG.md` is **generated from changesets** and its `##
  <version>` entries are immutable historical records of what shipped (each becomes the body
  of the corresponding GitHub Release). Rewriting a shipped entry would falsify the release
  record; the rename is a going-forward convention change, not a retroactive edit of past
  releases. Excluded deliberately.

- **Out of scope — `pr-description.md`.** A transient working file describing the PR for a
  different, already-completed pipeline (issue 122); its `review-1`/`review-2` mentions name
  that pipeline's historical run folders, not the going-forward convention. Not project
  documentation of the run-naming concept.

- **Out of scope — `website/` (`index.html`, `demo.js`, and assets).** Every `review`/`revis`
  hit is phase-audit or generic: reviewer agents/tasks, `*-review-approved.md` artifacts,
  "review at checkpoints"/"reviewing" generic prose, and the `base/` run folder (which is
  preserved). No follow-up-run name, "review run", or revise/revision activity appears.

- **Out of scope — `CONTRIBUTING.md`, `AGENTS.md`/`CLAUDE.md`,
  `.github/PULL_REQUEST_TEMPLATE.md`, the other `.changeset/*.md` files, `scripts/`,
  `.claude-plugin/`, `.pi/`.** Their `review`/`revis` hits are generic owner/PR review,
  phase-audit reviewers, or generic "revise an issue" edits — none names the renamed
  run-naming concept. (The `agents/` reviewer profiles, also swept, contain only phase-audit
  "review" — they are the code plan's untouched-but-relevant set, not a docs surface.)

- **Out of scope — `.pipelines/`.** Historical on-disk run folders (e.g. `review-1-*`,
  `review-2-*`) and their artifacts are explicitly out of scope per the spec ("Migration of
  existing on-disk runs"); they are not migrated, renamed, or documented over.
