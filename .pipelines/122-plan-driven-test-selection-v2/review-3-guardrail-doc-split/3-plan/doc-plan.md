# Doc Plan: Guardrail documentation split

## Overview

Review-3 is a documentation-architecture re-baseline of the skill itself: the code plan's two edits reword skill-internal files — fix the `docs-plan.md` typo in `reference/guardrails.md`, and upgrade `passing.md`'s `Guardrails:` bullet from a passive field-content definition into an active resolve instruction. The design and spec are emphatic that **behavior is unchanged**: resolve was always an orchestrator duty performed at spawn, and making it explicit in the skill prose changes nothing a consumer observes.

External, user-facing documentation describes the guardrail *behavior* a consumer gets — not the skill's internal reading-path architecture. Sweeping the repo for guardrail-describing surfaces (`.changeset/`, `README*`, `website/`, `CONTRIBUTING.md`) confirms every one is already accurate for review-3's change and needs no edit:

- The branch's single changeset, `.changeset/plan-driven-test-selection.md`, already describes the shipped fixed/scoped gate behavior. Review-3 adds no behavior, so the release note has nothing new to say; it must not gain an "internal skill docs reworded" line (that is not a user-facing change) and must not be altered.
- `README.md` describes the Guardrails convention generically (exact commands judged pass/fail by exit code) and defers authoring detail to the convention loader / setup. It never described the internal doc split or resolve, and the `docs-plan.md` typo lived only in `guardrails.md`, never here — so the README stays accurate.
- `CHANGELOG.md` is changeset-generated and never hand-edited; `website/` has no guardrail content; `CONTRIBUTING.md` / `.changeset/README.md` carry release mechanics, no guardrail behavior.

**This change requires no external documentation updates.** The CI changeset gate is already satisfied by the existing `plan-driven-test-selection.md` (present on this branch, which review-3 commits onto), so no new or empty changeset is needed either. This plan therefore has a single verification task confirming each candidate surface is already correct and the gate already satisfied — there is no edit task to invent.

## Guardrail scopes

None

## Tasks

### Task 1: Verify every external doc surface is already accurate and the changeset gate is satisfied

- **Goal:** Confirm that review-3's behavior-neutral skill-prose change requires no external documentation edit — that each guardrail-describing surface outside the skill/agent implementation already reflects the shipped behavior, and that the PR's changeset-gate Presence requirement is already met by the existing changeset — so the doc phase ships with no doc edit by design, not by omission.
- **Audience:** Consumers who read release notes / the published changelog, and contributors who read `README.md` for the Guardrails convention.
- **Files to change:** none (verification only; if the sweep finds a genuine inaccuracy introduced or exposed by review-3, fix it in the surface where it lives and note it, rather than expanding scope speculatively).
- **Sections / scope:** Sweep the live tree (excluding `.pipelines/` artifacts and the `skills/` + `agents/` + `AGENTS.md` implementation, which are the code plan's domain) for guardrail-describing surfaces, and confirm by observation:
  - `.changeset/plan-driven-test-selection.md` describes the shipped fixed/scoped gate behavior (gates are fixed or scoped; a scoped gate's `{scope}` is filled per pipeline by the plan of the phase whose agents run it; applies to code and docs phases). It carries no internal section-name (`## Guardrail scopes`), spawn-field name (`Guardrails:` / `Guardrail scopes to fill:`), resolve/`{scope}`-substitution mechanics, or skill/agent file path — a release note describes behavior, not skill internals — and review-3 leaves it byte-for-byte unchanged.
  - `README.md`'s Guardrails description (the Configuration section, ~line 147) still reads accurately: the convention is deterministic gates judged pass/fail by exit code, deferring authoring detail to the convention loader / setup. It names no `docs-plan.md`/`doc-plan.md` artifact, no internal doc-architecture split, and no resolve step, so review-3's typo fix and resolve-instruction upgrade leave it correct and untouched.
  - `CHANGELOG.md` is unchanged (generated at release time from changesets, never hand-edited for unreleased work).
  - `website/` contains no guardrail, gate, or `{scope}` content (so nothing to update).
  - `CONTRIBUTING.md` and `.changeset/README.md` carry release mechanics only, no guardrail behavior (so nothing to update).
  - The changeset-gate Presence requirement is satisfied: a `.changeset/*.md` file describing release-relevant behavior is present on the branch (`plan-driven-test-selection.md`), so review-3's `skills/**` edits need no new or empty changeset added.
- **Depends on:** none
- **Traces to:** Spec "Out of Scope: Behavior" and "Reverting the owner's edits" (this run refines/documents, changes no behavior); Design "Out of Scope: Behavior" and the "behavior is unchanged" premise throughout. (No spec requirement asks for an external-doc edit; the requirements all target skill-internal files, which the code plan owns.)
- **Acceptance:**
  - A search of the repo outside `.pipelines/`, `skills/`, `agents/`, and `AGENTS.md` finds the only guardrail-behavior surfaces to be `.changeset/plan-driven-test-selection.md` and `README.md` (~line 147); both already describe the shipped behavior accurately and neither references the internal doc split, resolve, or a `docs-plan.md`/`doc-plan.md` artifact.
  - `git diff trunk...HEAD -- .changeset/ README.md CHANGELOG.md website/ CONTRIBUTING.md` shows no review-3 edit to any of these surfaces — only the pre-existing branch addition of `plan-driven-test-selection.md` (added before review-3) appears, and its content is unchanged by review-3.
  - At least one `.changeset/*.md` file describing release-relevant behavior is present on the branch, so the changeset-gate Presence check is satisfied without a new or empty changeset.

## Surfaces considered and excluded

- **`.changeset/plan-driven-test-selection.md`** — the branch's release note for the whole `122` body of work; already describes the shipped fixed/scoped behavior. Review-3 adds no behavior, so it has nothing to add; covered as the verification target in Task 1, not edited.
- **`.changeset/agent-scoped-guardrails.md`** — already on trunk (shipped); describes the orthogonal agent-naming-on-gates change, untouched by review-3. Not a surface.
- **`README.md`** — generic Guardrails description, accurate and unaffected; verified in Task 1, not edited.
- **`CHANGELOG.md`** — changeset-generated release record, never hand-edited for unreleased work. Not a surface.
- **`website/`** — no guardrail content. Not a surface.
- **`CONTRIBUTING.md`, `.changeset/README.md`** — release mechanics only, no guardrail behavior. Not a surface.
- **The skill and agent files (`skills/`, `agents/`, `AGENTS.md`)** — these are the implementation, planned and edited in `code-plan.md`; this plan documents the change, it does not re-implement it.
