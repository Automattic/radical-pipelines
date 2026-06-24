# Spec: Rename "review runs" to "revisions"

## Overview

In the Radical Pipelines skill, the runs that follow a pipeline's `base` run are currently called "reviews" (`review-1`, `review-2`, …). The word "review" is overloaded: it names these follow-up runs, but it also names unrelated phase-auditing concepts — the reviewer agents (`spec-reviewer`, `code-reviewer`, …), the per-phase approval artifacts (`*-review-approved.md`), and the per-phase rejection iterations (`*-review-N-rejected.md`). The sharpest collision is between a run number (`review-2`) and a rejection-iteration number (`spec-review-2-rejected.md`), where the same digit means two different things.

This change renames the follow-up run and the activity that creates it to use the noun **revision** and the verb **revise**, so that "review" in the skill denotes the phase-auditing activity only. It is a vocabulary and naming-convention change to the skill's going-forward instructions (`skills/radical-pipelines/`, `agents/`, `.rp.md`); it does not change how pipelines actually run. The full word "revision" is used throughout — never the abbreviation `rev`.

## How to read these requirements

The requirements come in two kinds, and each requirement says which kind it is:

- **Invariant (exhaustive).** A whole-corpus property that must hold across all of `skills/`, `agents/`, and `.rp.md` with no exception. Requirements 3, 11, and 12, and the global acceptance criteria, are invariants. They are the binding completeness guarantee. Where an invariant says "every occurrence", it means every occurrence — the implementer is responsible for independently locating the full occurrence set, not only the examples listed.
- **Named-token (illustrative targets).** A requirement that fixes the target wording for a specific, named "review" token so two implementers rename it the same way. Requirements 1, 2, 4–10 are named-token requirements. They pin down wording for the tokens they name; they are **not** claimed to enumerate every occurrence in the corpus. Any "review" token they do not name is still in scope and is governed by the invariants. Where such a requirement references a count of occurrences, the count is illustrative context, not a closed list — the invariants, not the count, define completeness.

## Requirements

### Run naming

1. _(Named-token.)_ A run that follows a pipeline's `base` run is named `revision-N-<short-description>` (for example `revision-1-<short-description>`, `revision-2-<short-description>`) rather than `review-N-<short-description>`. The full word **revision** is used; the abbreviation `rev` is never used.
2. _(Named-token.)_ `base` remains the name of a pipeline's first run. The `<short-description>` formatting rule (kebab-case, pipeline-slug style) and the `N` monotonic-counter rule (the next integer after the existing follow-up runs) are unchanged in substance.

### Vocabulary of the run-creation activity

3. _(Invariant.)_ The activity of creating a follow-up run is named with the verb **revise** and the noun **revision** throughout the skill — covering the run, the act of creating it, the named route(s) that invoke it, and the intent that drives it. After this change, no run or run-creation concept is named "review" anywhere in `skills/`, `agents/`, or `.rp.md`. This is the binding completeness rule; requirements 4–10 give the specific target wording for individual named tokens, but they do not bound this invariant.
4. _(Named-token.)_ The intent that drives a follow-up run is named a "revision intent" wherever the skill names intent types. The mandatory **Origin** section of such an intent keeps its name.
5. _(Named-token / invariant.)_ The run is always referred to as a "revision run" or as `revision-N`, never as a bare "revision", in run-creation prose. This keeps the run sense distinct from the pre-existing generic-English use of "revise"/"revision" (meaning "edit an artifact", as in "the smallest revision that would unblock you"). Pre-existing generic uses of "revise"/"revision" are left unchanged.

### Consistency of references and conventions

6. _(Named-token.)_ The run-creation command document (currently the file whose title is "Reviewing a Pipeline") is titled "Revising a Pipeline" and is reachable under a `revision`-named filename. Every place that referenced its previous name continues to reach it.
7. _(Named-token.)_ The direct route phrase that invokes the run-creation command (currently the `"review this pipeline"` route) reads `"revise this pipeline"`.
8. _(Named-token.)_ The dispatch/menu label and the same-issue-action advisory for this activity read "Revise" instead of "Review".
9. _(Named-token + invariant on inbound references.)_ The base-ref convention currently headed "Reviewer base ref" is headed "Revision base ref", and the term currently written "Review run" is written "Revision run". The "Base run" term is unchanged. **Every reference to the renamed base-ref heading, wherever it occurs, resolves to the heading after the change** — no reference is left pointing at a heading name that no longer exists. (For context: the heading is referenced by name in more than one file, including reference documents and per-phase files; the implementer must locate and update all of them rather than rely on any stated count.)
10. _(Named-token.)_ The orchestrator-update prose for a follow-up run refers to a "revision run" and to a "revision's intent", and the corresponding action-list verb reads "revising". The per-phase labels that appear alongside this prose are unchanged.

### Boundary — phase-audit "review" is preserved

11. _(Invariant.)_ The phase-auditing meaning of "review" is preserved exactly as-is. The following are NOT renamed: the reviewer agent names (`spec-reviewer`, `design-doc-reviewer`, `code-plan-reviewer`, `docs-plan-reviewer`, `code-reviewer`, `docs-reviewer`); the approval and rejection artifacts (`*-review-approved.md`, `*-review-N-rejected.md`); the phase-auditing reviewing activity described in prose (including "review-style check", "review file", and the `# Spec Review` / `# Code Review` artifact headings); and generic owner-review-of-artifacts.
12. _(Invariant.)_ No new "revise"/"revision" term lands on a phase-auditing concept.

## Out of Scope

- **Migration of existing on-disk runs.** Run folders already named `review-N-*` under `.pipelines/` are not migrated or renamed; they remain as historical artifacts. The skill describes the going-forward convention only and carries no instruction to rename old folders.
- **Transitional dual-recognition of old run names.** The skill recognizes only `revision-*` follow-up runs; it does not also recognize the legacy `review-*` naming. _Owner-visible consequence:_ if a pipeline that already contains legacy `review-N` runs is later resumed or revised, the orchestrator would mis-count the next run number and mis-identify the latest run, because it no longer recognizes the legacy names. No transitional dual-recognition is added to the skill to avoid this.
- **Behavioral change to pipeline execution.** This change is limited to vocabulary, the run-creation command's name, and the run-folder naming convention. How pipelines run is unchanged.

### Decisions reflected here for owner confirmation

The following extend the literal request (which names only the run folder) so that the request's stated goal — "review" no longer denotes both the follow-up runs and the unrelated reviewing activities — is fully met. None contradicts the request:

- **Renaming the run-creation activity and its command, not only the run folders** (requirements 3, 6, 7, 8, 10). Renaming the activity is what actually frees "review" for the phase-auditing sense; a folder-only rename would leave the run-creation activity still called "review".
- **No migration of legacy `review-N` folders and no dual-recognition transition support**, accepting the mis-count consequence for legacy pipelines (see Out of Scope).
- **Mandating the "revision run" / `revision-N` form over a bare "revision"** to keep the run sense distinct from the generic-English sense (requirement 5).

## Acceptance Criteria

- Given a pipeline with a `base` run, when a follow-up run is created, then it is named `revision-N-<short-description>` (e.g. `revision-1-…`), and `base` is unchanged.
- Given the skill's run-folder naming convention, when the next run number is determined, then it is the next integer after the existing `revision-*` follow-up runs, and the `<short-description>` follows the same kebab-case pipeline-slug style as before.
- _(Invariant.)_ Given the skill, agent profiles, and `.rp.md`, when searched for any run or run-creation concept, then none of them is named "review" — the run, the act of creating it, the named route(s) that invoke it, and its intent are named with "revision"/"revise".
- Given the run-creation command document, when it is opened, then its title is "Revising a Pipeline", and every reference that previously pointed to its old name resolves to it.
- Given the direct route phrase that invokes the run-creation command, when it is read, then it says "revise this pipeline" rather than "review this pipeline".
- _(Invariant on inbound references.)_ Given the base-ref convention, when its heading and its run term are read, then they are "Revision base ref" and "Revision run" respectively, "Base run" is unchanged, and **every** reference to the heading anywhere in `skills/`, `agents/`, and `.rp.md` resolves to the renamed heading — none is left dangling.
- Given the dispatch/menu label and the same-issue-action advisory for the activity, when they are read, then they say "Revise" rather than "Review".
- Given the revision-intent type, when it is referenced, then it is named "revision intent" and its mandatory **Origin** section keeps its name.
- _(Invariant.)_ Given the phase-auditing "review" terms — reviewer agent names, `*-review-approved.md`, `*-review-N-rejected.md`, the phase-auditing reviewing prose, and generic owner-review-of-artifacts — when they are inspected after the change, then they are unchanged.
- _(Invariant.)_ Given the full skill after the change, when the word "review" is located, then every remaining occurrence refers to the phase-auditing reviewing activity, and no follow-up-run name collides with a rejection-iteration name (e.g. `revision-2` versus `spec-review-2-rejected.md` are unambiguously different).
- Given run-creation prose after the change, when the follow-up run is referred to, then it appears as "revision run" or `revision-N`, never as a bare "revision", and pre-existing generic uses of "revise"/"revision" elsewhere are unchanged.
