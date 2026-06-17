# Doc Plan: Preserve collaborative research across the assisted phases

## Overview

This change edits skill prose only: the three assisted-phase references and one new
shared reference file under `skills/radical-pipelines/reference/assisted-phases/`
(see `code-plan.md`). It changes how the orchestrator records and carries
collaborative research in assisted mode; it adds no command, flag, artifact
filename, or public API.

A worktree-wide sweep for external documentation surfaces that describe the changed
behavior found exactly one that this change requires acting on: the **changeset**
(release note). Because `skills/**` is a release-relevant path
(`.changeset/config.json` `changedFilePatterns`; `CONTRIBUTING.md` "When a changeset
is required"), the CI Changeset Gate hard-fails any PR touching these files without
one. Every other surface was checked and is excluded for a stated reason (see
**Surfaces checked and excluded**). The skill files themselves are the code plan's
territory and are not doc tasks.

Doc tasks are written to be drift-resistant: they fix coverage and audience
outcomes, not exact wording.

## Tasks

### Doc Task 1: Add the release changeset

- **Goal:** Satisfy the CI Changeset Gate and record this change in the changelog
  with a user-facing, one-line summary of the new behavior — assisted-mode
  collaborative research is reliably recorded within each phase and carried to the
  next assisted phase.
- **Audience:** Consumers of the skill reading the changelog / GitHub Release; the
  maintainer cutting the release.
- **Files to change:**
  - New file: `.changeset/<descriptive-slug>.md` (one new changeset file; slug is a
    wording call, e.g. `preserve-collaborative-research.md`).
- **Sections/scope:**
  - Front matter: `"@automattic/radical-pipelines"` at the bump level chosen per the
    `CONTRIBUTING.md` bump table and pre-1.0 policy. This is a backwards-compatible
    behavioral improvement to the skill (a feature, not a fix and not breaking), so
    `minor` is the expected bump; defer to the bump table if that judgment is
    revisited.
  - Body: one imperative-mood sentence summarizing the user-visible effect — that
    assisted-phase collaborative research (the owner's questions, the explanatory
    exchanges, candidate solutions and trade-offs explored together) is now reliably
    preserved within each assisted phase and carried forward to the next assisted
    phase. Match the tone and length of the existing changeset bodies under
    `.changeset/` (e.g. `per-phase-summaries.md`). No `BREAKING:` prefix (this is not
    a breaking change).
  - Do not restate the skill's internal mechanics (the shared file, the section
    names, the recording trigger): the changeset speaks to consumers about the
    outcome, not to maintainers about the implementation.
- **Depends on:** The code tasks (Tasks 1-4 in `code-plan.md`) — the changeset
  describes shipped behavior, so author it once the skill edits are settled. It may
  be committed in the same PR.
- **Traces to:** Spec Overview (the user-visible behavior change: collaborative
  research preserved and carried across); `CONTRIBUTING.md` "When a changeset is
  required" (`skills/**` is release-relevant) and the Changeset Gate; code-plan
  Tasks 1-4 (the release-relevant edits this changeset covers).
- **Acceptance (drift-resistant):**
  - A single new `.changeset/*.md` file exists, with valid front matter naming
    `"@automattic/radical-pipelines"` at a non-`major` bump level consistent with the
    `CONTRIBUTING.md` bump table.
  - Its body is a user-facing, imperative-mood summary conveying that assisted-mode
    collaborative research is now reliably preserved within a phase and reaches the
    next assisted phase, without describing the internal skill structure.
  - `node scripts/validate-changesets.mjs` accepts it and `npx changeset status`
    reports the change as covered (the CI Changeset Gate passes).

## Surfaces checked and excluded

The following surfaces were swept for references to the changed behavior (assisted
recording timing, the research-artifact section structure, the "don't do the next
phase's job" rules, the carry-across reads, the forward-drift flag) and are out of
scope, each for a stated reason:

- **`skills/radical-pipelines/SKILL.md` and the other `reference/*` files** (incl.
  `assisted-workflow.md`, `pipeline-versioning.md`). These are part of the skill
  itself; any edit needed there belongs to the code plan, not the doc plan. The
  sweep found no SKILL.md or sibling-reference statement that this change falsifies
  beyond the four files the code plan already edits.
- **`README.md`.** Its phase descriptions (Phase 1 Spec / Phase 2 Design doc /
  Phase 3 Plan) and its artifact/run-model section are altitude-level and say
  nothing about assisted-phase recording timing, the research-artifact internal
  sections, the per-phase "don't do the next phase's job" rules, the carry-across
  reads, or the forward-drift flag. Nothing in it is falsified, so no edit is
  required. (Note: `README.md` is itself a release-relevant path, but it needs a
  task only if its content must change — and here it does not.)
- **`AGENTS.md` / `CLAUDE.md` (symlink).** This mirrors the skill-authoring rules;
  it is unaffected and is a non-release-relevant meta file.
- **`CONTRIBUTING.md` and `.changeset/README.md`.** These document the release and
  changeset mechanics, which this change does not alter. They are the authority that
  *requires* Doc Task 1; they need no edit themselves.
- **`CHANGELOG.md`.** Generated by `@changesets/changelog-github` from changesets at
  release time; never hand-edited. Doc Task 1 (the changeset) is the correct entry
  point — editing `CHANGELOG.md` directly is excluded.
- **`website/` (incl. `demo.js`, `index.html`).** A stylized marketing animation of
  an autonomous run; `CONTRIBUTING.md` lists `website/**` as not release-relevant.
  Its `reads`/`writes` arrays are an illustrative dramatization, not a faithful spec
  of assisted-phase inputs, and the carry-across change is scoped to assisted mode
  only. It states none of the changed assisted behavior and is left untouched.
- **`.rp.md`.** The project's host conventions (task tracking, models, commit
  rules); it describes none of the changed behavior and is unaffected.
- **Autonomous-phase references and analyst agent definitions.** Out of scope per
  the spec (separate reading path, knowingly left as-is); excluded from
  documentation tasks for the same reason.
