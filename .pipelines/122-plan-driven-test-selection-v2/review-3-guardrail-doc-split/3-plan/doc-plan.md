# Doc Plan: Guardrail documentation split

## Overview

Review-3 is a documentation-architecture re-baseline of the skill itself: the code plan's two edits reword skill-internal files — fix the `docs-plan.md` typo in `reference/guardrails.md`, and upgrade `passing.md`'s `Guardrails:` bullet from a passive field-content definition into an active resolve instruction. The design and spec are emphatic that **behavior is unchanged**: resolve was always an orchestrator duty performed at spawn, and making it explicit in the skill prose changes nothing a consumer observes.

External, user-facing documentation describes the guardrail *behavior* a consumer gets — not the skill's internal reading-path architecture. Sweeping the repo for guardrail-describing surfaces (`.changeset/`, `README*`, `pr-description.md`, `CHANGELOG.md`, `website/`, `CONTRIBUTING.md`) confirms every one is already accurate for review-3's change and needs no edit:

- The branch's single changeset, `.changeset/plan-driven-test-selection.md`, already describes the shipped fixed/scoped gate behavior. Review-3 adds no behavior, so the release note has nothing new to say; it must not gain an "internal skill docs reworded" line (that is not a user-facing change) and must not be altered.
- `README.md` describes the Guardrails convention generically (exact commands judged pass/fail by exit code) and defers authoring detail to the convention loader / setup. It never described the internal doc split or resolve, and the `docs-plan.md` typo lived only in `guardrails.md`, never here — so the README stays accurate.
- `pr-description.md` is the only external surface that does name both the `guardrails.md`/`passing.md` split and resolve (line 10). Both stay true under review-3: the split is the shipped baseline this run rewords in place (not relocates), and resolve is the existing, behavior-neutral orchestrator duty the run only makes explicit in skill prose — so every claim there remains correct.
- `CHANGELOG.md` is changeset-generated and never hand-edited; its existing guardrail entry describes shipped released behavior generically. `website/` has no guardrail content; `CONTRIBUTING.md` / `.changeset/README.md` carry release mechanics, no guardrail behavior.

**This change requires no external documentation updates.** The CI changeset gate is already satisfied by the existing `plan-driven-test-selection.md` (present on this branch, which review-3 commits onto), so no new or empty changeset is needed either. This plan therefore has a single verification task confirming each candidate surface is already correct and the gate already satisfied — there is no edit task to invent.

## Guardrail scopes

None

## Tasks

### Task 1: Verify every external doc surface is already accurate and the changeset gate is satisfied

- **Goal:** Confirm that review-3's behavior-neutral skill-prose change requires no external documentation edit — that each guardrail-describing surface outside the skill/agent implementation already reflects the shipped behavior, and that the PR's changeset-gate Presence requirement is already met by the existing changeset — so the doc phase ships with no doc edit by design, not by omission.
- **Audience:** Consumers who read release notes / the published changelog, and contributors who read `README.md` for the Guardrails convention.
- **Files to change:** none (verification only; if the sweep finds a genuine inaccuracy introduced or exposed by review-3, fix it in the surface where it lives and note it, rather than expanding scope speculatively).
- **Sections / scope:** Sweep the live tree outside `.pipelines/` artifacts and the `skills/` + `agents/` + `AGENTS.md` implementation (the code plan's domain). A `grep -rIl 'guardrail\|{scope}'` over that space returns five surfaces — `pr-description.md`, `CHANGELOG.md`, `README.md`, `.changeset/plan-driven-test-selection.md`, `.changeset/agent-scoped-guardrails.md`; enumerate each and confirm by observation that it is already accurate for review-3, plus the two guardrail-free surfaces (`website/`, `CONTRIBUTING.md` / `.changeset/README.md`) the sweep clears:
  - `.changeset/plan-driven-test-selection.md` describes the shipped fixed/scoped gate behavior (gates are fixed or scoped; a scoped gate's `{scope}` is filled per pipeline by the plan of the phase whose agents run it; applies to code and docs phases). It carries no internal section-name (`## Guardrail scopes`), spawn-field name (`Guardrails:` / `Guardrail scopes to fill:`), resolve/`{scope}`-substitution mechanics, or skill/agent file path — a release note describes behavior, not skill internals — and review-3 leaves it byte-for-byte unchanged.
  - `.changeset/agent-scoped-guardrails.md` describes the orthogonal agent-naming-on-gates change; already shipped, untouched by review-3, and unrelated to the doc-architecture re-baseline — accurate as-is.
  - `README.md`'s Guardrails description (the Configuration section, ~line 147) still reads accurately: the convention is deterministic gates judged pass/fail by exit code, deferring authoring detail to the convention loader / setup. It names no `docs-plan.md`/`doc-plan.md` artifact, no internal doc-architecture split, and no resolve step, so review-3's typo fix and resolve-instruction upgrade leave it correct and untouched.
  - `pr-description.md` (line 10) does describe both the `reference/guardrails.md` = model / `reference/conventions/passing.md` = spawn-conventions split and resolve ("the orchestrator substitutes … into the agent's `Guardrails:` line before spawn") — the exact concepts review-3 touches. Both stay true: the split is the shipped baseline review-3 keeps (it rewords those files, it does not relocate the model or the spawn conventions), and resolve is behavior-neutral and already described as an existing orchestrator duty. The typo fix and the `passing.md` resolve-instruction upgrade leave every claim here correct, so it needs no edit.
  - `CHANGELOG.md` is generated at release time from changesets and never hand-edited for unreleased work; its existing #118 guardrail entry describes shipped released behavior generically, with no internal doc-architecture or resolve mechanics — accurate as-is and not a hand-edit target.
  - `website/` contains no guardrail, gate, or `{scope}` content (so nothing to update).
  - `CONTRIBUTING.md` and `.changeset/README.md` carry release mechanics only, no guardrail behavior (so nothing to update).
  - The changeset-gate Presence requirement is satisfied: a `.changeset/*.md` file describing release-relevant behavior is present on the branch (`plan-driven-test-selection.md`), so review-3's `skills/**` edits need no new or empty changeset added.
- **Depends on:** none
- **Traces to:** Spec "Out of Scope: Behavior" and "Reverting the owner's edits" (this run refines/documents, changes no behavior); Design "Out of Scope: Behavior" and the "behavior is unchanged" premise throughout. (No spec requirement asks for an external-doc edit; the requirements all target skill-internal files, which the code plan owns.)
- **Acceptance:**
  - `grep -rIl 'guardrail\|{scope}'` over the repo outside `.pipelines/`, `skills/`, `agents/`, and `AGENTS.md` returns `pr-description.md`, `CHANGELOG.md`, `README.md`, `.changeset/plan-driven-test-selection.md`, and `.changeset/agent-scoped-guardrails.md`; each is cleared as already accurate for review-3. None requires an edit: the two changesets and `CHANGELOG.md` describe shipped behavior generically with no internal mechanics; `README.md` (~line 147) describes the convention generically and references no doc split, resolve, or `docs-plan.md`/`doc-plan.md` artifact; and `pr-description.md` (line 10) describes the `guardrails.md`/`passing.md` split and resolve correctly — both remain true under review-3 (the split is the kept baseline, resolve is behavior-neutral).
  - No review-3 commit edits any of these surfaces: `git diff --name-only 42810e9..HEAD -- .changeset/ README.md CHANGELOG.md website/ CONTRIBUTING.md pr-description.md` (review-3 begins at `42810e9 Add review-3 intent`) is empty. The README, `website/`, `pr-description.md`, and changeset changes that appear in `git diff trunk...HEAD` are all pre-review-3 (base/review-2 commits) and are left unchanged by review-3.
  - At least one `.changeset/*.md` file describing release-relevant behavior is present on the branch, so the changeset-gate Presence check is satisfied without a new or empty changeset.

## Surfaces considered and excluded

- **`.changeset/plan-driven-test-selection.md`** — the branch's release note for the whole `122` body of work; already describes the shipped fixed/scoped behavior. Review-3 adds no behavior, so it has nothing to add; covered as the verification target in Task 1, not edited.
- **`.changeset/agent-scoped-guardrails.md`** — already on trunk (shipped); describes the orthogonal agent-naming-on-gates change, untouched by review-3. Not a surface.
- **`README.md`** — generic Guardrails description, accurate and unaffected; verified in Task 1, not edited.
- **`pr-description.md`** — does name the `guardrails.md`/`passing.md` split and resolve (line 10), but both stay true under review-3 (split kept in place, resolve behavior-neutral); verified in Task 1, not edited.
- **`CHANGELOG.md`** — changeset-generated release record, never hand-edited for unreleased work; its existing guardrail entry is generic and accurate. Verified in Task 1, not edited.
- **`website/`** — no guardrail content. Not a surface.
- **`CONTRIBUTING.md`, `.changeset/README.md`** — release mechanics only, no guardrail behavior. Not a surface.
- **The skill and agent files (`skills/`, `agents/`, `AGENTS.md`)** — these are the implementation, planned and edited in `code-plan.md`; this plan documents the change, it does not re-implement it.
