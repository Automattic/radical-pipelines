# Spec Research

## Rough Idea

# Rename "review runs" to "revisions"

> Source: GitHub issue #158 (https://github.com/Automattic/radical-pipelines/issues/158).
> This file is self-contained; agents do not need to open the source issue.

## Goal

The runs that follow a pipeline's `base` run are called **revisions** (`revision-1`, `revision-2`, …) instead of reviews, so the word "review" no longer denotes both these runs and the unrelated reviewing activities in the pipeline.

## Constraints

- Use the full word **revision** — not the abbreviation `rev`.
- `base` keeps its name as the first run.

## Context

"review" is currently overloaded across distinct concepts: the runs after `base` (`review-1`, `review-2`…), the reviewer agents (`code-reviewer`, `spec-reviewer`…), the per-phase approval artifacts (`code-review-approved.md`), and the per-phase rejection iterations (`spec-review-N-rejected.md`). The sharpest collision is between a run number (`review-2`) and a rejection-iteration number (`spec-review-2-rejected.md`), where the same digit means different things. Renaming the runs to "revisions" frees "review" for the reviewing activity only.

## Q&A

### Q1: When a `revision-N` run is created, should the activity/command that creates it (today "Reviewing a Pipeline" / `review-pipeline.md` / "review this pipeline" / "review intent") also be renamed to "revision/revise", or do only the run folders change to `revision-N` while the creating-activity keeps the name "review"?

**A:** Evidence favors option (a) — rename the run-creation activity too (review → revise / revision), not only the folders. But this exceeds the literal intent text and is a scope decision the owner should confirm.

- The intent's "reviewing activities" that it wants "review" reserved for are exclusively the phase-auditing things it enumerates: reviewer agents (`spec-reviewer`, `code-reviewer`, …), approval artifacts (`code-review-approved.md`), and rejection iterations (`spec-review-N-rejected.md`). The run-creation activity ("Reviewing a Pipeline") is **not** listed. So strictly literally, the intent scopes the rename to the run name (`review-N` → `revision-N`).
- However, the run-creation activity is densely worded as "review" throughout `review-pipeline.md` ("a new review run", "review intent", "review-only additions", "MANDATORY for reviews", "assisted review", "A review is a normal run"). A folder-only rename leaves prose like "review run" denoting a `revision-N` folder — a noun/file mismatch — and the word "review" still denotes two unrelated activities (run-creation vs. phase-audit). The intent's stated purpose is only fully met by (a).
- **Decisive collision:** `pipeline-versioning.md` L21 heading `### Reviewer base ref` and L25 `**Review run**` use "Reviewer"/"Review" to mean the run-creation activity, colliding head-on with the audit agents literally named `*-reviewer`. A folder-only rename leaves this exact ambiguous heading. Option (a) (e.g. "Revision base ref") resolves it. This is the single strongest codebase argument that the literal folder-only scope does not deliver the intent.
- Naturalness: every run-creation "review" token maps 1:1 to revision/revise ("revision run", "revision intent", "Revising a Pipeline", "revision count"). No run-creation "review" needs to stay "review" for meaning.

**Reasoning:** The intent's goal ("review no longer denotes both these runs and the unrelated reviewing activities") is achieved only if the run-creation activity also stops being called "review", because that activity is itself distinct from the phase-auditing the intent reserves "review" for. The owner's literal text names only the run/folder, so the researcher flags (a) as widening scope beyond the literal ask — a judgment call to surface for owner confirmation, not something researchable away.

**Sources:** `intent.md:8,17`; gh issue #158 (body == intent, comments empty); `skills/radical-pipelines/reference/review-pipeline.md:1,3,29,33,35,37,39,52,54`; `skills/radical-pipelines/reference/pipeline-versioning.md:15,17,19,21,25,53,55,65,117`; `skills/radical-pipelines/reference/work-on-an-issue.md:36,40`; `skills/radical-pipelines/reference/intent-format.md:3,33`; `.rp.md:35`.

### Q2: Does the task require migrating existing on-disk `review-N-*` run folders under `.pipelines/` to `revision-N-*` (data migration), or does the rename apply only to the skill/convention going forward?

**A:** Data migration of existing on-disk `review-N-*` folders is **out of scope**. The rename applies to the skill/convention going forward only (new runs → `revision-N`). Existing run folders stay as historical artifacts.

- The intent speaks only of what runs "are called" (naming/convention); it has zero mention of migrating, renaming, or rewriting existing artifacts. The constraints name only "use the full word revision" and "base keeps its name".
- The project rule (`CLAUDE.md` / `AGENTS.md` line 15) states the skill must describe the system only as designed to work, "not transient, historical, or speculative situations… not a one-off (like a migration leftover)." Migrating old folders is the textbook migration-leftover one-off, so it does not belong in the skill, and the rename's deliverable should contain no "rename old `review-N` folders" instruction.
- No external code parses run-folder names, so old folders coexisting with the new convention breaks no tooling. `scripts/` is only version-sync/changeset tooling; `website/demo.js` and `index.html` reference "review" only in the phase-audit sense (`spec-review-approved.md`, reviewer agent names) and only ever show `base/`, never run folders. No glob of `review-*`/`revision-*` exists in code.
- `.pipelines/` is git-tracked (artifacts-in-repo mode; ~380 tracked files), so existing `review-N` run folders (under `.pipelines/{121,122,134,95}-*`) ship with the package as real historical pipeline data. Leaving them is consistent with the append-only-history design (`base/` is never rewritten).

**Coexistence seam (the one place "ignore old folders" has a consequence):** the orchestrator reads run folders at runtime by following **skill prose** that globs `review-*`:
- `pipeline-versioning.md:17` — next run number = "next integer after the existing `review-*` folders".
- `pipeline-versioning.md:53` — latest run = "the highest-numbered `review-N` run".

If the skill's glob changes to `revision-*` only, a pipeline whose existing runs are old-style `review-1`, `review-2` (e.g. resuming/reviewing pipeline 122 or 95 later) would not be seen by the new skill, causing a mis-count of the next run number and mis-identification of the latest run. Two options:
- **(i) Going-forward only, accept the seam** — skill globs `revision-*` only; existing review-bearing pipelines are not expected to gain more runs. Matches the no-migration project rule. Risk: if the owner does review an old pipeline, miscount.
- **(ii) Dual recognition during transition** — skill reads `review-*` OR `revision-*` but writes only `revision-*`. This is exactly the "transient/historical" accommodation the project rule says to keep out of the skill, so it conflicts with that rule.

Researcher recommends **(i)** per `CLAUDE.md` line 15, recorded as an explicit out-of-scope item with the miscount risk surfaced for the owner.

**Reasoning:** The intent is a naming/convention change; migration of committed historical data is a separate concern the intent never raises, and the project's own skill-authoring rule forbids encoding migration leftovers or transient dual-handling in the skill. The only runtime consequence of leaving old folders is the glob seam, which is a genuine requirement decision rather than a research fact, so it is surfaced for the owner.

**Sources:** `intent.md:8,10-13,17`; gh #158 (body == intent, comments empty); `CLAUDE.md:15` / `AGENTS.md:15`; `skills/radical-pipelines/reference/pipeline-versioning.md:17,53`; `.gitignore:5-6`; `git ls-files .pipelines` (380 tracked); `scripts/*` (version tooling only); `website/demo.js`, `website/index.html` (review tokens all phase-audit, no run-folder parse); on-disk folders `.pipelines/{121,122,134,95}-*/review-N-*`.

### Q3: Under option (a) + (i), what is the complete token-by-token replacement set for the run and run-creation-activity vocabulary, and does any replacement collide with the must-not-touch phase-audit "review" terms?

**A:** Locked vocabulary: **noun = "revision"** (the run and its intent), **verb = "revise"** (the act of creating one). Run folder → `revision-N-<short-description>`; command file `review-pipeline.md` → `revision-pipeline.md`; heading `Reviewer base ref` → `Revision base ref`. No hard collision in either direction. One soft reverse-overlap flagged below.

**A. Run folder name** — `review-N-<short-description>` → `revision-N-<short-description>`. The `<short-description>` rule (kebab-case, pipeline-slug style) and the `N` monotonic-counter rule are unchanged in substance (now "next integer after existing `revision-*` folders"). Occurrences: `pipeline-versioning.md:15,17,25,53,117`; `review-pipeline.md:33,37`. Any sample chain `base → review-1 → review-2` → `base → revision-1 → revision-2`.

**B. Command file rename + inbound refs** — `skills/radical-pipelines/reference/review-pipeline.md` → `revision-pipeline.md`. The filename literal is referenced in exactly one place: `work-on-an-issue.md:36` ("**Review** read `review-pipeline.md`" → "**Revise** read `revision-pipeline.md`"). No other file references the filename; `SKILL.md` does not list it.

**C. Activity verb/noun prose** — single verb "revise", single noun "revision", applied consistently. Title `review-pipeline.md:1` "Reviewing a Pipeline" → "Revising a Pipeline"; and review→revision / reviewing→revising across `review-pipeline.md:3,7,9,11,14,18,19,21,35,37,39,40,42,50,52,54`; `work-on-an-issue.md:40` advisory label "**Review**" → "**Revise**"; `pipeline-versioning.md:17,19,55,65,117` run-creation prose ("a review only ADDS", "every review of a pipeline", "a new review may start", "reviews are not part of the cross-pipeline tree", the run chain).

**D. Base-ref heading + "Review run" term** — `pipeline-versioning.md:21` heading `### Reviewer base ref` → `### Revision base ref`; `:25` "**Review run**" → "**Revision run**". (`:26` "**Base run**" stays; `:28` "code/docs reviewer invocation" is phase-audit, KEEP.) The heading name has **two** inbound references that must update in lockstep: `review-pipeline.md:29` and `autonomous-workflow.md:39` (both "Capture the run's base ref per the **Reviewer base ref** rule"). New term shares no substring with audit "reviewer" — clean.

**E. intent-format.md** — `:3` "or a review intent" → "or a revision intent"; `:33` "Review intents carry their mandatory **Origin** section" → "Revision intents carry…". Origin section name unchanged.

**F. .rp.md** — `:35` "For a review run…" → "For a revision run", "not on a review's intent" → "not on a revision's intent" (phase labels `1 - Spec`…`5 - Docs` on that line untouched); plus `:36,37` action-list verb "reviewing" → "revising" ("creating, resuming, forking, or reviewing").

**Forward collision check (every remaining "review" substring is phase-audit, KEEP):** reviewer agent names (`spec-reviewer`, `design-doc-reviewer`, `code-plan-reviewer`, `docs-plan-reviewer`, `code-reviewer`, `docs-reviewer`); approval/rejection artifacts (`*-review-approved.md`, `*-review-N-rejected.md`); the phase-audit verb/noun ("review the spec/plan/code/docs", "review file", "review-style check", "# Spec Review"/"# Code Review" headings, etc.); `SKILL.md:15,29` and `assisted-workflow.md:3` generic "owner reviews and approves". Confirmed: zero run / run-creation "review" tokens remain unrenamed after A–F.

**Reverse collision check (does new "revise/revision" land on a phase-audit concept?):** No hard clash, but a **soft semantic overlap**: "revise"/"revision" already appears as generic English ("change an artifact") in ~12+ sites, e.g. the blocker phrase "the smallest revision that would unblock you" (across many agents), `SKILL.md:15` "review, revise, and relaunch", phase-writer "when revising", and notably `pipeline-versioning.md:112` "v4 forked from v1 and revised the spec" / "revised the intent" — which sits in the **same file** as the new `revision-N` runs, where a reader could briefly conflate the fork's edit with a "revision run". This reintroduces (mildly, in a new spot) the kind of overload the intent dislikes. It is not a hard collision (no file/identifier clash). Mitigation to decide at requirement level: mandate the run is always referred to as "revision run" / `revision-N` (never bare "revision") so the run sense stays distinct from the generic edit sense.

**Reasoning:** The verb/noun pair revise/revision is the natural English mapping and the only run-creation "review" tokens that survive A–F are genuinely phase-audit. The reverse overlap is real but soft; whether to require disambiguation ("revision run") is a wording decision the requirements should settle rather than leave implicit.

**Sources:** `pipeline-versioning.md:15,17,19,21,25,28,45-49,53,55,65,112,117`; `review-pipeline.md:1,3,7,9,11,14,18,19,21,29,33,35,37,39,40,42,50,52,54`; `work-on-an-issue.md:36,40`; `intent-format.md:3,33`; `.rp.md:35,36,37`; `autonomous-workflow.md:39`; `SKILL.md:15,29`; `assisted-workflow.md:3`; grep `review-pipeline\.md` (1 ref), grep `Reviewer base ref` (2 refs), grep `revis` (all generic-English).

## Research

### Surface-area map: where the run / run-creation concept lives vs. where the phase-audit "review" lives

The word "review" denotes four distinct concepts in the skill. Only the first is in scope for this rename.

**In scope — the run and the activity that creates it (rename to revision/revise):**
- Run folder convention and run-state prose: `skills/radical-pipelines/reference/pipeline-versioning.md` (lines 15, 17, 19, 21, 25, 53, 55, 65, 117).
- The run-creation command: `skills/radical-pipelines/reference/review-pipeline.md` (whole file, including title) → file renamed to `revision-pipeline.md`.
- Menu/dispatch entry and advisory: `skills/radical-pipelines/reference/work-on-an-issue.md` (lines 36, 40).
- Run-creation intent type: `skills/radical-pipelines/reference/intent-format.md` (lines 3, 33).
- Orchestrator-update obligations for a run: `.rp.md` (lines 35, 36, 37).
- Base-ref heading inbound reference: `skills/radical-pipelines/reference/autonomous-workflow.md` (line 39).

**Out of scope — phase-audit "review" (must NOT change):**
- Reviewer agent profiles and names: `agents/{spec,design-doc,code-plan,docs-plan,code,docs}-reviewer.md` and every reference to those names.
- Approval / rejection artifacts: `*-review-approved.md`, `*-review-N-rejected.md` (completion table at `pipeline-versioning.md:45-49`; reviewer-agent write steps; autonomous- and assisted-phase artifact lists).
- The phase-audit reviewing activity in prose ("review the spec/plan/code/docs", "review file", "review-style check", "# Spec Review"/"# Code Review" headings) and generic owner-review-of-artifacts (`SKILL.md:15,29`, `assisted-workflow.md:3`).

**No external tooling reads run-folder names.** `scripts/` is version-sync/changeset tooling only; `website/demo.js` and `website/index.html` reference only phase-audit "review" and only ever show `base/`. The only runtime reader of run-folder names is the orchestrator following skill prose (the `review-*` globs at `pipeline-versioning.md:17,53`).

## Consolidated Requirements

Scope: this is a renaming change to the Radical Pipelines **skill** (`skills/radical-pipelines/`, `agents/`, `.rp.md`) — the generic, going-forward instructions. It produces no behavioral change to how pipelines run; only the vocabulary, one filename, and the run-folder naming convention change.

**Core rename**

1. A run that follows a pipeline's `base` run is named `revision-N-<short-description>` (e.g. `revision-1-…`, `revision-2-…`) instead of `review-N-<short-description>`. The full word **revision** is used; the abbreviation `rev` is never used.
2. `base` keeps its name as the first run; the `<short-description>` formatting rule (kebab-case, pipeline-slug style) and the `N` monotonic-counter rule (next integer after existing revision folders) are unchanged in substance.
3. The run-creation activity is named with the verb **revise** and the noun **revision** throughout the skill — the run, the act of creating it, and its intent. After the rename, no run or run-creation concept is still called "review" anywhere in `skills/`, `agents/`, or `.rp.md`. (Adopts option (a): renaming the activity, not only the folders — see Q1; flagged for owner confirmation below.)
4. The run-creation command file `skills/radical-pipelines/reference/review-pipeline.md` is renamed to `revision-pipeline.md`, its title "Reviewing a Pipeline" becomes "Revising a Pipeline", and its single inbound filename reference (`work-on-an-issue.md:36`) is updated.
5. The dispatch/menu label and advisory for this activity (`work-on-an-issue.md:36,40`) read "Revise" instead of "Review".
6. The run-creation intent is named "revision intent" (`intent-format.md:3,33`); the **Origin** section name is unchanged.
7. The orchestrator-update prose for a run (`.rp.md:35,36,37`) refers to a "revision run" / "revision's intent" and the action-list verb "revising"; the phase labels `1 - Spec`…`5 - Docs` on those lines are unchanged.
8. The base-ref convention heading `### Reviewer base ref` (`pipeline-versioning.md:21`) becomes `### Revision base ref` and the term `**Review run**` (`:25`) becomes `**Revision run**`; both inbound references to that heading (`review-pipeline.md:29` and `autonomous-workflow.md:39`) are updated in lockstep. `**Base run**` is unchanged.

**Boundary (must not change)**

9. The phase-audit meaning of "review" is preserved verbatim: reviewer agent names (`spec-reviewer`, `design-doc-reviewer`, `code-plan-reviewer`, `docs-plan-reviewer`, `code-reviewer`, `docs-reviewer`), approval/rejection artifacts (`*-review-approved.md`, `*-review-N-rejected.md`), the phase-audit reviewing activity in prose, and generic owner-review-of-artifacts. None of these is renamed.
10. After the rename, the word "review" in the skill denotes the phase-audit reviewing activity only (the intent's stated goal): the sharpest prior collision — a run number `review-2` versus a rejection-iteration number `spec-review-2-rejected.md` — no longer exists, because runs are `revision-N`.

**Out of scope**

11. Existing on-disk run folders already named `review-N-*` under `.pipelines/` are **not** migrated or renamed; they remain as historical artifacts. The skill describes the going-forward convention only and contains no instruction to rename old folders (per Q2 and the project rule against migration leftovers in the skill).
12. The skill's run-folder globs match `revision-*` only; they do not also match the legacy `review-*` (option (i), Q2). Consequence to confirm with the owner: if a pre-existing `review-N`-bearing pipeline (e.g. 122, 95) is later resumed or revised, the orchestrator would mis-count the next run number and mis-identify the latest run. No transitional dual-recognition is added to the skill.

**Wording discipline**

13. To keep the new run sense distinct from the pre-existing generic English use of "revise/revision" (meaning "edit an artifact", e.g. "the smallest revision that would unblock you", and `pipeline-versioning.md:112` "v4 … revised the spec"), the run is referred to as a "revision run" or `revision-N` and never as a bare "revision" in run-creation prose. Pre-existing generic "revise/revision" usage is left unchanged.

**Success criteria**

14. The change is complete when: (a) every run / run-creation token identified in Q3 sections A–F is renamed per the locked map; (b) no run or run-creation concept is still called "review" in `skills/`, `agents/`, or `.rp.md`; (c) no phase-audit "review" term (requirement 9) is altered; (d) no new "revise/revision" token has landed on a phase-audit concept; and (e) cross-references stay consistent — the renamed command file `revision-pipeline.md` and the renamed heading `Revision base ref` are reachable from every place that referenced their old names.

**Decisions to confirm with the owner** (each extends the literal intent to fully achieve its stated goal; none contradicts the intent):
- Renaming the run-creation **activity and command**, not only the run folders (requirements 3–8). The literal intent names only the run; the activity rename is what actually frees "review" for phase-audit only (Q1).
- **No migration** of existing `review-N` folders and **no dual-glob** transition support, accepting the miscount seam for legacy pipelines (requirements 11–12, Q2).
- Mandating **"revision run" disambiguation** over bare "revision" (requirement 13, Q3 reverse-overlap).
