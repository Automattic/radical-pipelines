# Design Doc: Reviews — re-run the whole pipeline as additional runs on the same branch

## Overview

Radical Pipelines takes an issue through six phases (prompt → spec → design doc → plan → code → docs), producing inspectable artifacts under `.pipelines/<slug>/`, with each pipeline mapped to one branch and one worktree. Today, once a pipeline is finished, the owner can resume an in-progress run, fork onto a fresh branch, merge, or close — but there is no way to request an *incremental* change to a finished pipeline while staying on the same branch. The "Review" action in the orchestrator's menu is a dangling hook: `work-on-an-issue.md` references `review-pipeline.md`, but that file does not exist.

This feature adds **reviews**. A review lets the owner request a change to a finished, unmerged pipeline and apply it by running the **whole pipeline again** (prompt → spec → design doc → plan → code → docs) as an additional **run** layered on top of the existing work, on the **same branch and worktree**. The defining property is that almost nothing changes in the agents: a review is just the pipeline run again, except the branch already carries the prior runs, so the same phase flow naturally produces only the incremental change. The chosen approach is **composition, not re-implementation** — we introduce a thin "run" layer in the artifact folder, single-source the prompt format, write one new distributed `review-pipeline.md` procedure that delegates to the existing building blocks (resume's re-attach, create's prompt authoring, the existing workflows and phase agents), and make the smallest possible edits so that the existing machinery, pointed at a per-run folder, does the rest. This supersedes the closed issue #58, which had envisioned a single self-contained `review-pipeline.md` that re-implemented a run.

## Approach

The mental model the implementer should hold is: **a pipeline's artifact folder gains one new layer — the run — between the pipeline folder and the phase folders.** Where phase folders used to sit directly under `.pipelines/<slug>/`, they now sit under a run folder:

```
.pipelines/<slug>/
  base/                              (the original run; base/0-prompt is the issue)
    0-prompt/ … 5-docs/
  review-1-<short-description>/      (the first review; its own prompt)
    0-prompt/ … 5-docs/
  review-2-<short-description>/
    0-prompt/ … 5-docs/
```

`base` is always the first run and is always present from the moment a pipeline is created. Each review adds a sibling `review-N-<short-description>` run folder driven by its own new prompt; the original issue and the base prompt are never rewritten. All runs of a pipeline share the one branch and worktree, which is exactly what distinguishes a review (same branch, build on existing code) from a fork (fresh branch from main).

End-to-end, the feature is realized through five coordinated moves:

1. **Define the run layer once, in `pipeline-versioning.md`.** This file is the single home for the run vocabulary, the run-aware state rules (completion predicate, latest-run state, prompt-only-review state), the branch-level listing/tree rules, and the reviewer base-ref rule. Everything else references it.

2. **Lay `base/` down eagerly at creation, and scope fork-copy to `base/`.** `create-pipeline.md` writes phase 0 under `base/`; `fork-pipeline.md` copies inherited phases from the parent's `base/` into the new pipeline's `base/`.

3. **Keep agents run-agnostic.** Agents are handed `<artifacts-folder>/<run>/` as "the artifact folder" and never learn the run name. This holds with **zero behavioral agent edits**: the run binding is made on the orchestrator side (one workflow handoff line), and six reviewer profiles get a single bounded two-word factual correction each (not a behavior/role change).

4. **Single-source the prompt format.** The schema, rendering rules, and authoring discipline move out of `manage-issues.md` into a new `prompt-format.md`, referenced by all three prompt-authoring sites (issue creation, base-prompt generation, review-prompt generation). The review-only **Origin** reference is specified at the review site, not in the shared schema.

5. **Write one distributed `review-pipeline.md` procedure** that gates on the two hard preconditions (completeness, unmerged), runs the non-gating advisories (fork-vs-review, split), re-attaches via resume's named sections, creates the run folder, authors the review prompt, re-asserts the version, captures the prior-run-tip diff base, and dispatches back into the existing workflow for phases 1–5.

Because the review prompt is delta-scoped (a prompt of *the change*, not a re-spec of the whole feature) and the same prompt propagates through the unchanged phase flow against a live worktree that already carries the prior runs' code and docs, each review phase produces a **full, standalone artifact whose content is the delta** and **builds on** the prior run rather than rebuilding it. The code and docs reviewers diff against the **tip of the previous run**, so a review inspects only its own incremental change. None of this requires rewriting agent behavior or phase procedures — it is an emergent property of the composition.

## Components

### New components

- **`skills/radical-pipelines/reference/review-pipeline.md`** (new) — the distributed review procedure. Seven steps: confirm preconditions, run advisories, re-attach to branch/worktree, create the run folder, author+commit the review prompt, re-assert the version, return to the mode-dispatch in `work-on-an-issue.md`. It mostly *delegates*: it never re-implements monitor handling, tracker obligations, prompt-format prose, or re-attach mechanics — it cites the files that own them.

- **`skills/radical-pipelines/reference/prompt-format.md`** (new) — the single source of truth for the prompt format. Two subsections: `## Schema and rendering` (Title/Goal/Constraints/Context/Assumptions; Goal required, rest optional; omit empty sections, no `N/A` filler) and `## Authoring discipline` (capture-don't-converge, lead-with-goal/state-the-outcome-not-the-solution, no requirements/design/implementation detail, reflect hypotheses as open questions). It deliberately contains **no** origin-reference hook.

### Modified components

- **`skills/radical-pipelines/reference/pipeline-versioning.md`** — the run model's home. Gains a `### Runs within a pipeline` subsection (vocabulary + path shape + "a run is NOT a branch" negations), a one-sentence rebind of the completion-predicate table to the run folder, a rewritten pipeline-state paragraph (state follows the latest run; two-notions distinction; prompt-only-review "next phase"), base/-scoped lineage and tree-reconstruction wording, a new run-chain rendering bullet, and a reviewer base-ref rule.

- **`skills/radical-pipelines/reference/create-pipeline.md`** — phase-0 step now creates `base/` and writes the prompt to `base/0-prompt/prompt.md`; the discipline restatement is replaced by a pointer to `prompt-format.md`.

- **`skills/radical-pipelines/reference/fork-pipeline.md`** — the inherited-phase copy is scoped to `base/` on both source and destination (`<parent>/base/<phase>` → `<new>/base/<phase>`); a clause states a fork starts a fresh `base/` and never inherits the parent's reviews.

- **`skills/radical-pipelines/reference/work-on-an-issue.md`** — the Review menu bullet gains "then continue to step 3" (making the live procedure's return-to-dispatch legible); a RESUME / REVIEW / FORK decision-rule block is inserted after the menu so the owner can choose among the three same-issue actions. The Merge and Close bullets are untouched.

- **`skills/radical-pipelines/reference/manage-issues.md`** — the format prose is removed (moved to `prompt-format.md`); "The issue format" and "Constraints" collapse to pointers; the tracker-only "don't write until approved" bullet stays; the issue↔prompt path updates to `base/0-prompt/`.

- **`skills/radical-pipelines/reference/resume-pipeline.md`** — step 3 reads state within the pipeline's latest run; step 4 scopes the rollback target to "the latest run's" completed phase. Re-attach steps 1–2 are unchanged but their headings are now cited by `review-pipeline.md`.

- **`skills/radical-pipelines/reference/autonomous-workflow.md`** — the agent-handoff line is reworded to hand the agent "the active run's folder"; a one-line note in the run-loop section captures the run's base ref at run start.

- **`skills/radical-pipelines/reference/assisted-workflow.md`** — the "create the phase subfolder" line names "the active run's folder" (assisted's only run-binding site, since it spawns no agents).

- **`skills/radical-pipelines/reference/autonomous-phases/4 - code.md`** and **`5 - docs.md`** — each references the `pipeline-versioning.md` reviewer base-ref rule where it launches the reviewer.

- **Six reviewer agent profiles** — `agents/{spec-reviewer, design-doc-reviewer, code-plan-reviewer, doc-plan-reviewer, code-reviewer, doc-reviewer}.md` — one identical two-word substitution each: the parenthetical "(no number; only one ever exists **per pipeline**)" becomes "… **in this artifact folder**". This is a factual correction (under reviews there is one approved file per *run*, not per pipeline), not a behavior change.

- **`.rp.md`** (this project's conventions) — the version-label trigger list gains "or reviewing"; an optional one-sentence note clarifies that a review's per-phase status re-cycles from `1 - Spec` (not `0 - Prompt`).

### Untouched but relevant components

- **The 11 non-reviewer agent profiles and all 17 agents' *behavior*** — no agent's inputs, procedure, outputs, or role changes. Agents already treat `<artifacts-folder>` as an opaque path they were handed and only ever append `/<phase>/<file>`, so handing them a run folder Just Works.
- **`health-monitoring.md`** — the loop template `<artifact-folder>` is a fill-in; for a review the orchestrator substitutes the review run's folder. No edit.
- **`conventions/setup.md`** — the **Artifact folder** convention defines only the pipeline folder and is silent on internal layout; the run layout lives in `pipeline-versioning.md`. No edit.
- **`merge-pipeline.md` / `close-pipeline.md`** — absent today and stay absent (their menu bullets remain dangling and unbroken; out of scope).
- **The four non-reviewer phase references and `doc-plan-writer.md`'s "sweep the entire codebase end-to-end"** — left as-is; the worktree-scoped sweep against a live tree is exactly what makes a review build on existing work.

## Interfaces and Data Flow

### File-layout contract (the run layer)

The pipeline folder `<artifacts-folder>` (the spec's `<pipeline-folder>`; the same thing) contains run folders, each containing the full phase structure:

```
<artifacts-folder>/<run>/<phase>/<file>
```

- `<run>` ∈ { `base`, `review-1-<short-description>`, `review-2-<short-description>`, … }.
- `base` is the first run, always present, never restructured or rewritten by a review.
- `<short-description>` is a kebab-case summary of the review's goal (lowercase, hyphens, no spaces), formatted like the pipeline-slug short description.
- `N` in `review-N-…` is a per-pipeline monotonic counter: the next integer after the existing `review-*` folders.
- A run carries no `-v<N>` suffix, is not a slug/branch/worktree, and does not change the pipeline version.

### Agent handoff (the run-agnostic contract)

- **Define once:** the run concept and the `<artifacts-folder>/<run>/<phase>` path shape are defined in `pipeline-versioning.md`'s `### Runs within a pipeline`.
- **Bind on the orchestrator side:** in autonomous mode, the orchestrator hands each agent "the active run's folder (`<artifacts-folder>/<run>/`, e.g. `<artifacts-folder>/base/`)" as its artifact folder. The agent treats that as its artifact folder and never sees the run name. In assisted mode (no agents), the orchestrator itself writes phase subfolders inside "the active run's folder".
- **Data flow:** the agent reads/writes `<handed-folder>/<phase>/<file>`. Because it never walks above the handed folder, an agent in `review-1/1-spec/` cannot see `base/1-spec/`'s approved file, and its rejection counter is folder-local — so per-run progress restarts naturally.

### Prompt format and the three sites

`prompt-format.md` owns the schema, rendering rules, and authoring discipline. Three sites reference it without restating it; each keeps its own site-local contract (destination, source, trigger, and the review-only origin reference):

| Element | ISSUE creation | BASE prompt | REVIEW prompt |
| --- | --- | --- | --- |
| Destination | the tracker (Issues convention) | `<artifacts-folder>/base/0-prompt/prompt.md` | `<artifacts-folder>/review-N-<short-description>/0-prompt/prompt.md` |
| Source | short owner-led Q&A | the existing issue, transformed | owner's requested change / GitHub comment / PR review / conversation (mostly transcribed when already written) |
| Trigger | owner creates/modifies an issue | a new pipeline is created (phase 0) | a review is started (`review-pipeline.md` step 5) |
| Origin reference | absent | absent | **mandatory** |

Each site references the shared format only — `manage-issues.md` keeps its tracker-only "don't write until approved" rule, `create-pipeline.md` keeps its issue→prompt transform instruction, and `review-pipeline.md` adds the Origin section.

### Reviewer base ref (diff base)

Derived once at run start and held constant for the whole run, keyed on "the start of the current run":

- **Review run** → the **tip of the previous run** (`base` or `review-(N-1)`): the branch tip at the moment the review run begins, *before* its prompt is committed (equivalently, the parent of the review run's first commit, which is the prompt commit). No new bookkeeping.
- **Base run** → the **merge-base of the pipeline branch and main** (robust against main advancing).

The value is captured once (when HEAD is still the prior-run tip), then passed unchanged to every `code-reviewer` and `doc-reviewer` invocation across all rejection/re-dispatch iterations. The diff is always `base-ref → current HEAD`. The rule is defined in `pipeline-versioning.md`; `4 - code.md` and `5 - docs.md` reference it where they launch the reviewer; `review-pipeline.md` step 3 captures the prior-run-tip value at review start; `autonomous-workflow.md`'s run loop holds it during execution. Reviewers already accept "the base ref to diff against" as a launch-prompt input, so no agent capability is added.

### Menu and decision rule (entry points)

The single entry point is the existing "work on an issue" menu (and the direct "review this pipeline" request, which routes to the same procedure). The Review bullet reads `review-pipeline.md`, then continues to mode dispatch. A decision-rule block lets an unsure owner choose:

- **Resume** = finish an incomplete latest run, same branch.
- **Review** = layer an incremental change on a complete run, same branch, build on existing code.
- **Fork** = diverge onto a fresh branch from main.

The sharpest discriminator is same-branch-build-on-existing (review) vs. new-branch-from-main-diverge (fork); resume is the option for an incomplete run.

## Key Decisions

### Decision: Insert a single "run" layer in the artifact folder, defined once in `pipeline-versioning.md`

- **Choice:** Add a run folder (`<artifacts-folder>/<run>/<phase>`) between the pipeline folder and the phase folders, with `base` always first and reviews as siblings. Define the run vocabulary, path shape, and "a run is NOT a branch" negations once, in a new `### Runs within a pipeline` subsection of `pipeline-versioning.md`. Use the existing `<artifacts-folder>` placeholder everywhere (it denotes the same thing as the spec's `<pipeline-folder>`).
- **Alternatives:** (a) Spread the run vocabulary across each file that uses it — rejected as duplication-prone and drift-inducing. (b) Introduce a new placeholder distinct from `<artifacts-folder>` — rejected; "run" is already used in `conventions/setup.md` and `SKILL.md`, and a second placeholder would fork the path vocabulary.
- **Trade-offs:** Concentrating the model in one file means every other file references it rather than restating it; the cost is that readers must follow a cross-reference, which matches the skill's existing FILE + NAMED SECTION idiom.
- **Traces to:** R1 (run folders), R4 (a run is not a branch), R18 (sequential — added one at a time on a complete run). Acceptance criterion 1, 2.

### Decision: Lay `base/` down eagerly at creation; never restructure later

- **Choice:** `create-pipeline.md` creates the `base/` run folder and writes phase 0 to `base/0-prompt/prompt.md` at creation. A review only ADDS a sibling; it never moves or rewrites `base/`. The **Artifact folder** convention stays unchanged (it is layout-silent); `base/` is laid down by the phase-creating step, which cross-references the run definition rather than re-explaining `base`.
- **Alternatives:** Create phases flat and migrate to `base/` on first review — rejected; it would restructure `base/` (violating R2) and require legacy-shape handling (violating R5).
- **Trade-offs:** Every new pipeline carries a `base/` level even if never reviewed; this is the price of never having to migrate or special-case a no-`base/` shape.
- **Traces to:** R2 (eager base). Acceptance criterion 1.

### Decision: Keep agents run-agnostic with zero behavioral agent edits

- **Choice:** Make the run binding on the orchestrator side. Reword the one autonomous handoff line (and the one assisted phase-subfolder line) to hand "the active run's folder" as the artifact folder. Agents are never told the run name. The six reviewer profiles get a two-word factual correction ("per pipeline" → "in this artifact folder") so a now-false statement is not shipped.
- **Alternatives:** (a) Teach agents about runs (pass the run name, add "per run" wording) — rejected; it leaks the run concept into agent vocabulary, violating R3's core property. (b) Leave the reviewer parenthetical as "per pipeline" — rejected; under reviews `base/1-spec/spec-review-approved.md` and `review-1/1-spec/spec-review-approved.md` both exist, so the words are false at the pipeline level, and acceptance/review would flag the falsehood. "In this artifact folder" states the same scope using the only noun the agent already knows.
- **Trade-offs:** "No agent profile is rewritten" is reported honestly as "very nearly so": six profiles get a single bounded two-word substitution that preserves behavior, inputs, outputs, and role. No agent's procedure changes.
- **Traces to:** R3 (agents run-agnostic), R15 (build on existing — agents behave unchanged). Acceptance criterion 7.

### Decision: Single-source the prompt format into a new `prompt-format.md`; keep the origin reference review-only

- **Choice:** Move the schema, rendering rules, and authoring discipline out of `manage-issues.md` into a new `reference/prompt-format.md` with `## Schema and rendering` and `## Authoring discipline`. Issue creation, base-prompt generation, and review-prompt generation reference it. The review-only **Origin** section is specified in `review-pipeline.md` step 5, not in the shared schema. Keep schema and discipline together (not split across two files).
- **Alternatives:** (a) Host the canonical format in `manage-issues.md` and have the others borrow — rejected; it buries the canonical format in the tracker front-door file and creates host/borrow asymmetry inviting drift. (b) Split schema and discipline into separate files — rejected; they are short and tightly coupled, and two files add sync overhead. (c) Add an optional Origin hook to the shared schema — rejected; it pollutes a schema two of three sites never use and forces "mandatory-only-in-review" conditional prose, the exact cross-site coupling R13 avoids. Omit-empty rendering already tolerates an extra section, so no hook is needed.
- **Trade-offs:** A third reference file exists, but each format element now lives in exactly one location and the base-site discipline gloss is trimmed to a pure pointer to satisfy the strict "no two sites restate the same prose" criterion.
- **Traces to:** R10 (own new prompt), R11 (orchestrator authors), R12 (origin reference), R13 (single-sourced). Acceptance criterion 3, 13.

### Decision: Make `review-pipeline.md` a distributed procedure that delegates, not a monolith

- **Choice:** A seven-step procedure that gates on completeness and unmerged-state, runs the non-gating advisories, re-attaches via resume's named sections, creates the run folder, authors+commits the review prompt (same pattern as the base prompt), re-asserts the version, and returns to the mode dispatch in `work-on-an-issue.md`. It re-uses resume's re-attach, create's prompt-authoring pattern, the Issues convention for tracker work, and the workflows for monitor/close-out — duplicating none of them.
- **Alternatives:** A single self-contained `review-pipeline.md` that re-implements a full run (issue #58's original vision) — rejected by R29; it would duplicate the phase flow and tracker/monitor logic.
- **Trade-offs:** The procedure reads as a sequence of delegations; the reader must follow cross-references, but nothing is duplicated and the existing machinery stays the source of truth.
- **Traces to:** R6 (single entry point), R8 (re-attach), R11 (orchestrator authors prompt), R29 (wire Review, distributed). Acceptance criterion 2, 16.

### Decision: Re-verify both hard gates at the top of `review-pipeline.md`

- **Choice:** Re-check both preconditions — (a) latest run complete through phase 5, (b) pipeline unmerged — at the top of `review-pipeline.md`, not relying on the menu. On (a) failure, steer to resume or fork; on (b) failure, handle as a new issue via `manage-issues.md`. State at the gate that these two are the only preconditions and that the advisories never gate.
- **Alternatives:** Rely on the menu's phase-5 guard — rejected; the direct "review this pipeline" route bypasses the menu, and the menu does not check merged-state at all.
- **Trade-offs:** A small amount of apparent redundancy with the menu, justified by correctness for the direct route and the merged case.
- **Traces to:** R7 (completeness gate), R9 (unmerged gate), R26 (advisories never gate). Acceptance criterion 4, 5, 15.

### Decision: Run advisories before re-attach; keep them non-gating

- **Choice:** Run the fork-vs-review advisory (drastic change MAY recommend a fork) and the split advisory (several unrelated changes MAY suggest separate sequential reviews) before re-attaching or creating any run folder, confirming the final count and boundaries with the owner first. The owner decides; the orchestrator never unilaterally redirects.
- **Alternatives:** Advise after re-attach/folder creation — rejected; an accepted fork diverts to `fork-pipeline.md` entirely, and R19 requires settling the count "before creating any run folder," so nothing should be created first.
- **Trade-offs:** None material; ordering the advisories first avoids creating-then-undoing a run folder.
- **Traces to:** R19 (split advisory), R24 (fork-vs-review advisory), R26 (never gate), R18 (sequential). Acceptance criterion 15, 6.

### Decision: Re-attach by citing resume's named sections (no new shared file, no step renumbering)

- **Choice:** `review-pipeline.md` re-uses resume's branch/worktree re-attach by citing resume's two headings by name — "Cancel any leftover health monitor" and "Re-attach to the branch and worktree" — and explicitly NOT performing resume's rollback step (the latest run is already complete; nothing to roll back). Never creates a new branch.
- **Alternatives:** (a) "Do steps 1–2 of `resume-pipeline.md`" — rejected; step-number pointers are foreign to the skill's idiom and break on renumbering. (b) Factor re-attach into a new shared file — rejected as more disruptive for no gain; only review needs the two-step subset, and resume is only ever entered whole.
- **Trade-offs:** Review depends on resume's headings staying stable; the named-section citation is the skill's established, renumber-proof idiom.
- **Traces to:** R8 (same branch, re-attach reused). Acceptance criterion 2, 9.

### Decision: State follows the latest run; "next phase" for the prompt-only-review case

- **Choice:** A pipeline's completed and active phase are those of its **latest run** (highest-numbered `review-N`, or `base` if none), with the predicate evaluated within that run's folder. Keep two notions distinct: overall pipeline state (drives resume) and per-run completion (a run complete through phase 5, gates whether a new review may start). For a just-created review with only `0-prompt/prompt.md`, write that the pipeline's **next phase** is the review's phase 1 (spec) — not "active phase = phase 1" — keeping "active phase" single-sensed for "started-but-not-complete."
- **Alternatives:** Use "active phase = phase 1" verbatim from R20's loose wording — rejected; it overloads "active phase," which the skill's strict predicate reserves for started-but-not-complete artifacts. "Next phase" matches the workflows' existing "next phase = active if one exists, otherwise the phase after the completed phase," whose "otherwise" branch already lands on phase 1 for a prompt-only review.
- **Trade-offs:** A deliberate, minimal wording choice that reconciles R20's loose language with the skill's precise predicate; the on-disk behavior is identical either way.
- **Traces to:** R20 (state = latest run), R21 (resume targets latest). Acceptance criterion 9, 10.

### Decision: Lineage and the fork tree stay at the branch level (read `base/` only)

- **Choice:** Build the cross-pipeline tree only over each pipeline's `base/` run; reviews are not tree nodes. Tree SHAs are computed over `<ref>:<artifacts-folder>/base/<phase>`; the shared root is `base/0-prompt`. Reviews are reported as a per-pipeline linear chain annotated on the pipeline's node (`base → review-1-… → review-2-…`, each with its own state). A pipeline with no reviews shows no run chain.
- **Alternatives:** Treat runs as tree nodes — rejected; it would break the invariant that an issue tree's shared root is the issue's prompt (a review prompt is a new prompt, not the issue), and reviews are not cross-pipeline-comparable since forks inherit from `base/`.
- **Trade-offs:** The existing example tree is left unchanged (it shows no reviews); the new rendering bullet demonstrates the chain syntax. Reviews are visible as run metadata, not as new nodes.
- **Traces to:** R22 (fork tree stays at branch level), R23 (forking unchanged — base-only inheritance). Acceptance criterion 11, 12.

### Decision: Scope fork-copy to `base/` on both source and destination

- **Choice:** `fork-pipeline.md` copies inherited phases from the parent's `base/` run into the new pipeline's `base/` run (`<parent>/base/<phase>` → `<new>/base/<phase>`), and states a fork starts a fresh `base/` and never inherits the parent's reviews.
- **Alternatives:** Leave the copy at the parent's pipeline-folder root — rejected; after eager `base/` (R2) the parent's prompt is at `<parent>/base/0-prompt`, so the current copy path would fail (source missing). The `base/` prefix is both a correctness fix and the reviews-scoping.
- **Trade-offs:** None; reviews were never at accidental-inclusion risk because the copy loop iterates phase names, not a glob, and `review-*` are not phase names — but the explicit base scoping removes doubt.
- **Traces to:** R23 (forking unchanged), R5 (no legacy handling). Acceptance criterion 12.

### Decision: Introduce the reviewer base-ref derivation (closing a pre-existing gap) for both normal and review runs

- **Choice:** Define a unified base-ref rule keyed on "start of the current run" in `pipeline-versioning.md`: review run → prior-run tip; base run → merge-base with main. Capture it once at run start and hold constant. Reference it from `4 - code.md`, `5 - docs.md`, `review-pipeline.md` step 3, and the autonomous run loop. Reviewers already accept the base ref as input.
- **Alternatives:** "Last commit touching `review-(N-1)/`" — rejected as fragile; code/docs commits touch worktree source files, not the run's artifact folder, so it would point at the prior run's phase-3 artifact commit rather than its true tip. "Main's current tip" for base — rejected; it is not robust against main advancing, whereas the merge-base is.
- **Trade-offs:** This honestly *introduces* the base-ref derivation for the first time — it was never written down for any run. R16 is framed as "the base ref they already accept," which is true on the agent side; the orchestrator-side derivation is new but small and well-contained, with zero agent edits.
- **Traces to:** R16 (diff against prior-run tip), R17 (both modes — rule lives in the autonomous path only). Acceptance criterion 8.

### Decision: A review is a normal run for tracker/monitor/version obligations

- **Choice:** `review-pipeline.md` step 7 carries a generic R27 pointer ("a review is a normal run; apply every orchestrator-update obligation the conventions define, fired afresh for this review run; reuse the existing issue, create no new one; same-branch publish is a fast-forward; an autonomous review follows the normal monitor lifecycle pointed at the review run's folder with slug/team unchanged; an assisted review launches no monitor"). The project's concrete obligations live in `.rp.md`; they re-fire for a review because they are run-scoped and per-phase status is now latest-run-relative. The only required `.rp.md` edit is adding "or reviewing" to the version-label trigger list.
- **Alternatives:** Duplicate the concrete obligations into `review-pipeline.md` — rejected; obligations go through the Issues convention and the workflow, and a review inherits them by dispatching. Re-set status to `0 - Prompt` for a review — rejected; `0 - Prompt` is keyed on pipeline creation (a one-time event), so a review's status correctly re-cycles from `1 - Spec`.
- **Trade-offs:** The generic skill names the obligations as a pointer; the project convention owns them. The version is re-asserted (confirmed, not changed), matching create/resume/fork.
- **Traces to:** R27 (review behaves like a normal run), R28 (version unchanged). Acceptance criterion 14.

### Decision: Stay silent on the legacy no-`base/` shape

- **Choice:** Author all guidance solely for the run-folder model where `base/` always exists. No file mentions a no-`base/` shape, dual-shape reading, grandfathering, or migration. Listing/tree SHA paths simply move from flat-only to base-only. Existing flat pipelines are never moved or rewritten.
- **Alternatives:** Add a dual-shape-reading or grandfathering rule — rejected by R5; the flat shape was only ever implicit in the SHA paths (no named "flat layout" prose existed), so moving to base-only makes the flat layout stop being mentioned, which is exactly the required silence.
- **Trade-offs:** A flat pipeline encountered at runtime is handled by orchestrator judgment, documented nowhere; this keeps the skill lean and avoids legacy cruft.
- **Traces to:** R5 (legacy untouched and unmentioned). Acceptance criterion 17.

### Decision: Recover an abandoned prompt-only review via the existing resume flow (zero new mechanism)

- **Choice:** A review run with only `0-prompt/prompt.md` committed has completed phase 0 and no active phase (strict predicate). Resume's "no active phase → start the phase after the completed phase, worktree already clean, skip rollback" lands on phase 1 from the committed prompt. No new handling is written; recovery rides on the latest-run state rule plus the existing resume flow.
- **Alternatives:** Add a "prompt-only review resumes at phase 1" note to `review-pipeline.md` — rejected as redundant with the state rule and resume flow; `review-pipeline.md` is about *starting* a review, recovery is resume's job. Document a removal path — rejected; removal is cleanup (out of scope) and is ordinary git, handled by owner judgment, documented nowhere.
- **Trade-offs:** None; this is a pure consequence of the state rule and resume, with zero new skill text beyond the "next phase" wording already in the state paragraph.
- **Traces to:** R20 (state = latest run), R21 (resume targets latest). Acceptance criterion 10.

## Dependencies

- **Internal — `pipeline-versioning.md`** is the keystone: the run vocabulary, run-aware state, base/-scoped listing/tree, and the reviewer base-ref rule all live there, and `create-pipeline.md`, `fork-pipeline.md`, `work-on-an-issue.md`, `resume-pipeline.md`, the workflows, the two phase references, and `review-pipeline.md` all reference it. It must land first/coherently for the others to make sense.
- **Internal — `resume-pipeline.md`'s re-attach headings** ("Cancel any leftover health monitor", "Re-attach to the branch and worktree") are cited by name from `review-pipeline.md`; their names are a dependency contract.
- **Internal — `prompt-format.md`** is referenced by `manage-issues.md`, `create-pipeline.md`, and `review-pipeline.md`.
- **Internal — the existing workflows and phase agents** are dispatched into unchanged for phases 1–5; reviews depend on their existing behavior (per-run folders, base ref as input, worktree-scoped investigation).
- **Project convention — `.rp.md`** owns the concrete tracker/monitor/version obligations a review inherits; the generic skill depends on a project having defined them, and only requires the review be treated identically to any other run.
- **No new external libraries, services, or tools.** The only mechanics are ordinary git/worktree operations the skill already uses (`git rev-parse`, merge-base, `cp -r`, branch/worktree re-attach).

## Failure Modes and Observability

- **Review requested on an incomplete latest run** — caught by gate (a) at the top of `review-pipeline.md`; the owner is steered to resume (finish it) or fork (try a different approach). Observable: the review does not start; no run folder is created.
- **Review requested on a merged pipeline** — caught by gate (b) using the merged-state determination in `pipeline-versioning.md`; handled as a new issue. Observable: no review is offered.
- **A second review requested while the first is in flight** — the latest run is incomplete, so gate (a) blocks the second review until `review-N` completes through phase 5. Reviews are strictly sequential.
- **Abandoned prompt-only review run** — surfaces as the pipeline's next phase being the review's phase 1; resume continues it from the committed prompt with no rollback. The owner may alternatively revert the prompt commit (ordinary git; out-of-scope cleanup, undocumented).
- **Stale base ref across rejection iterations** — prevented by capturing the base ref once at run start and passing it unchanged; by phase 4 the run has its own commits on top of the prior-run tip, but the diff base stays frozen at the prior-run tip so the review's full delta is reviewed.
- **Fork-copy source-missing after eager `base/`** — prevented by the `base/`-prefixed copy path; without it the fork would copy from a now-nonexistent `<parent>/0-prompt`.
- **Observability** — reviews are surfaced in the pipeline listing as a per-pipeline run chain (`base → review-1-… → …`) with each run's state; the tracker reflects the review via the project's per-phase status (re-cycling `1 - Spec` … `5 - Docs`) and run-start/run-end label changes; an autonomous review's health monitor watches the review run's folder. No new logging surface is introduced.

## Risks and Open Questions

- **Coordinated multi-file edit.** The change is small per file but spans `pipeline-versioning.md` (anchor), two new files, six references, two workflows, two phase references, six agent profiles, and `.rp.md`. The plan should sequence `pipeline-versioning.md` and `prompt-format.md` first so the references they own resolve.
- **"No agent profile is rewritten" is honestly "very nearly so."** The plan and reviewers should expect six reviewer profiles to each receive one bounded two-word factual correction ("per pipeline" → "in this artifact folder"); this preserves behavior, inputs, outputs, and role. This is the only agent-profile change and must be reported as such, not as zero.
- **R16 closes a pre-existing gap.** The reviewer base-ref derivation was never written down for any run; this work introduces it for both normal and review runs. The plan should treat the base-ref rule as new orchestrator-side text, not merely a review-only tweak.
- **Cross-reference fragility by design.** Review cites resume's headings by name; if those headings are later renamed, the citation must follow. This is the skill's established idiom (FILE + NAMED SECTION) and is preferred over step-number pointers, but the dependency is real.
- **No open design questions.** The research record resolved all nine design topics (T1–T9) self-consistently; nothing in this design required fresh investigation or invented a prior-phase decision. Out-of-scope items (merge/close procedures, consolidation/cleanup, migrating flat pipelines, forking from a reviewed run, parallel reviews) are deliberately excluded and must stay out of the plan.
