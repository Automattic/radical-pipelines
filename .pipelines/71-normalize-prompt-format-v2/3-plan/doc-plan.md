# Doc Plan — Normalize issue content into the standard intent format when creating a pipeline

> Source spec: `1-spec/spec.md`. Source design: `2-design-doc/design-doc.md`. Source code plan:
> `3-plan/code-plan.md` (7 tasks rewriting `create-pipeline.md` step 4). This plan is standalone.

## Overview

The feature changes `create-pipeline.md` step 4 so that `intent.md` is always produced in the
canonical Goal / Constraints / Context / Assumptions format, with synthesis from the full issue
picture (body + comments + references) and an owner-confirmation gate when needed. The code
change is confined to `skills/radical-pipelines/reference/create-pipeline.md`.

A repo-wide sweep found **two documentation surfaces** that would fall out of sync if left
unchanged:

1. **`skills/radical-pipelines/reference/manage-issues.md`** — contains the sentence "The issue
   body _is_ the phase-0 intent", which becomes inaccurate on the synthesis path (where the body
   alone does not determine the intent).
2. **`.changeset/` — a new changeset file** — required by the project's standing rule: changes to
   `skills/**` trigger the changeset gate enforced by CI.

All other surfaces examined — `README.md`, `SKILL.md`, `work-on-an-issue.md`,
`autonomous-workflow.md`, `assisted-workflow.md`, `fork-pipeline.md`, `resume-pipeline.md`,
`pipeline-versioning.md`, `conventions/setup.md`, and all `agents/` profiles — describe
phase-0 / intent behavior at an abstraction level that stays accurate after the feature ships
(e.g. "phase 0 is already in place", "turns the issue into `intent.md`" as a that-it-happens
statement, `intent.md` as the read-only input to downstream phases). No doc tasks are needed for
those surfaces.

---

## Task D-1 — Update `manage-issues.md` to reflect that synthesis may occur

**Goal.** Correct the statement that equates the issue body with the phase-0 intent. After the
feature, the body is only a direct input when all three skip conditions hold; when any fails, the
orchestrator synthesizes the intent from the full picture (body + all comments + referenced
content) and confirms with the owner. The wording in `manage-issues.md` must not mislead
orchestrators or contributors reading it.

**Audience.** Orchestrators running `manage-issues.md` to author or modify an issue (they read
this file as the front door to issue creation, so they must understand the downstream effect of
their authoring choices); contributors reading the skill source to understand the pipeline.

**Files to change.** `skills/radical-pipelines/reference/manage-issues.md` — the "The issue
format" section opening sentence (current line 14).

**Sections / scope.** The specific statement "The issue body _is_ the phase-0 intent — When the
pipeline is created, the orchestrator turns the issue into `0-intent/intent.md`. So this is both
the issue template and the intent format." This is the only text in the file that describes the
issue→intent mapping relationship with a false absolute. The wording should convey that:

- Writing the issue in the canonical format (as `manage-issues.md` instructs) is the condition
  under which the body maps directly to `intent.md`.
- When the issue departs from that (non-canonical body, or comments, or references), the
  orchestrator synthesizes the intent from the full picture.
- The format described here is both the issue format and the intent format, but the relationship
  is conditional, not an absolute identity.

The doc-writer reads the shipped `create-pipeline.md` step 4 (post-code-phase) to see the exact
skip conditions and synthesis behavior, then finds wording that fits the existing file's terse
style and stays within the `manage-issues.md` altitude (user-facing issue authoring, not internal
orchestrator mechanics). No new heading or sub-section is needed — a sentence-level update to the
existing introductory statement is sufficient. The rest of the file (the format definition, the
constraints, the Q&A steps) is untouched.

**Depends on.** Code phase (Tasks 1–7 of `code-plan.md`): the shipped `create-pipeline.md` step 4
is the source of truth for the skip-condition wording the doc-writer uses.

**Traces to.** Spec req 1 (always canonical format), req 5–8 (skip conditions), req 14 (change
confined to step 4 with neighbors staying coherent); KD-3 (clause A), KD-12 (every neighbor
verified coherent — `manage-issues.md` is the one neighbor that the design confirmed needs no
edit but which a reader-facing accuracy check finds does need a sentence-level correction).

**Acceptance.**
- The opening statement in `manage-issues.md`'s "The issue format" section no longer asserts an
  unconditional identity between the issue body and the phase-0 intent.
- The updated wording conveys that the canonical issue format is what maps directly to `intent.md`
  (the skip path), and that other issues are synthesized from the full picture.
- The statement still motivates why the issue format matters (it is the intended input to phase 0)
  without misleading readers about the synthesis path.
- No other line in the file is changed.

---

## Task D-2 — Add a changeset for the feature

**Goal.** Record the feature in the project's change log so CI's changeset gate passes and the
release flow captures the behavioral change.

**Audience.** CI gate (`changeset-gate.yml`) enforcing presence of a changeset for changes to
`skills/**`; maintainers reading `CHANGELOG.md` and GitHub Releases to understand what changed.

**Files to change.** A new `.changeset/<slug>.md` file (the slug is chosen by the doc-writer;
the convention is a short description with hyphens, e.g. `normalize-intent-format.md`).

**Sections / scope.** A standard changeset front matter block declaring bump type `minor` (new
feature, not breaking; the feature adds synthesis + confirmation behavior to an existing step —
a `patch` would only be appropriate for a bug fix, and the behavior change is additive) and a
one-line imperative-mood summary describing the change. The doc-writer reads `CONTRIBUTING.md`'s
"Adding a changeset" section for the exact format and the pre-1.0 bump policy before writing.

**Depends on.** None — can be created in any order relative to D-1, since it does not depend on
the shipped skill text.

**Traces to.** `CONTRIBUTING.md`'s standing changeset rule; `.changeset/config.json`'s
`changedFilePatterns` (`skills/**` is listed); the pre-1.0 policy in `CONTRIBUTING.md`
(new feature → `minor`).

**Acceptance.**
- A new `.changeset/*.md` file exists and is committed.
- Its front matter is valid (accepted by `node scripts/validate-changesets.mjs`): the package
  name matches the root `package.json` name, the bump type is `minor`, and no `major` bump is
  present (rejected while pre-1.0).
- The summary is imperative mood, sentence case, one line, describing the behavioral change (not
  the implementation detail).
- `npx changeset status` exits 0 (changeset is present for the modified `skills/**` path).
