# Spec: Reviews — re-run the whole pipeline as additional runs on the same branch

## Overview

Radical Pipelines today takes an issue through six phases (prompt → spec →
design doc → plan → code → docs), producing inspectable artifacts under
`.pipelines/<slug>/`. Each pipeline maps to one branch and one worktree. Once a
pipeline finishes, the owner can resume an in-progress run, fork a new pipeline
onto a fresh branch, merge, or close — but there is no way to ask for an
incremental change to a finished pipeline while staying on the same branch. The
"Review" action in the orchestrator's menu is currently a dangling hook with
nothing behind it.

This work adds **reviews**. A review lets the owner request a change to a
finished pipeline and have it applied by running the **whole pipeline again**
(prompt → spec → design doc → plan → code → docs) as an additional **run**
layered on top of the existing work, on the **same branch and worktree**. The
key property is that almost nothing changes in the agents: a review is just the
pipeline run again, except the branch already carries the prior runs, so the
same phase flow naturally produces only the incremental change.

To make this work, a pipeline's artifact folder gains a **run** layer. Instead
of phase folders sitting directly under the pipeline folder, each run gets its
own folder holding the full phase structure:

```
.pipelines/<slug>/
  base/                       (the original run; base/0-prompt is the issue)
    0-prompt/ … 5-docs/
  review-1-<short-description>/   (the first review's run; its own prompt)
    0-prompt/ … 5-docs/
  review-2-<short-description>/
    0-prompt/ … 5-docs/
```

`base` is the first run and is always present. Each review adds a sibling
`review-N-<short-description>` run folder driven by its own new prompt — the
original issue and the base prompt are never rewritten. Reviews stay on the same
branch (this is what distinguishes a review from a fork, which always starts a
fresh branch) and run strictly one at a time. The prompt format, previously
inline in the skill, is factored into a shared definition so that issue
creation, base-prompt generation, and review-prompt generation all use one
source of truth with no duplication.

This is the feature that supersedes the closed issue #58: reviews are a whole
way of working built from the existing phase flow, not a single self-contained
reference file that re-implements a run.

## Requirements

Requirements are observable outcomes. "MUST" = required for this work to be
done. Mechanism and file-level decisions left open here are resolved in the
design phase and are not pre-decided.

### A. The run-folder layout

- **R1 (MUST — run folders).** A pipeline's artifact folder is organized into
  sibling **run folders** at its root: `base`, then
  `review-1-<short-description>`, `review-2-<short-description>`, … Each run
  folder holds the full phase structure (`0-prompt` … `5-docs`). `base/0-prompt`
  is the issue; each `review-N-<short-description>/0-prompt` is that review's own
  prompt.

- **R2 (MUST — eager base).** Every new pipeline is created with the `base/` run
  folder present from the moment of creation. A brand-new, never-reviewed
  pipeline already has its phase artifacts under `base/` (`base/0-prompt`, then
  `base/1-spec`, …) — not directly under the pipeline folder. `base/` is always
  present, and a review only ADDS a sibling run folder; it never restructures or
  rewrites `base/`.

- **R3 (MUST — agents are run-agnostic).** The artifact folder a run operates in
  is `<pipeline-folder>/<run>/`. Agents are handed that per-run folder as "the
  artifact folder" and remain run-agnostic: they neither know nor care whether it
  is `base` or `review-N`. No agent profile is rewritten to support reviews
  (consistent with "the agent profiles stay the same, or very nearly so").

- **R4 (MUST — a run is not a branch).** A run folder is purely a folder on the
  same branch. It is NOT a slug, branch, or worktree; it carries no `-v<N>`
  version suffix; and it does not change the pipeline's version. In
  `review-N-<short-description>`, `N` is a per-pipeline monotonic counter (the
  next number after the existing `review-*` folders), and `<short-description>`
  is a short kebab-case summary of that review's goal, formatted like the
  pipeline-slug short description (lowercase, hyphens, no spaces).

- **R5 (MUST — existing flat pipelines are left untouched, and unhandled in the
  skill).** An existing pipeline laid out flat (phase folders directly under the
  pipeline folder, no `base/` run folder) is never migrated or rewritten by the
  reviews feature. The skill's written guidance is authored solely for the
  run-folder model, in which `base/` is always present (R2): it MUST NOT contain
  any instruction, reference, or mention of how to handle a pipeline that lacks a
  `base/` folder. If the orchestrator encounters such a legacy pipeline at
  runtime, it does what it can with its own judgment — but that handling is
  deliberately kept out of the skill and is documented nowhere in it. (This
  resolves the previously open design question of how listing and reconstruction
  would tolerate both shapes: neither a dual-shape-reading rule nor a
  grandfathering rule is written into the skill — the skill stays silent on the
  legacy shape.)

### B. Triggering a review

- **R6 (MUST — single entry point).** The owner requests a review through the
  existing "work on an issue" menu, where the previously dangling "Review" action
  now does real work — or by asking directly (e.g. "review this pipeline"), which
  routes to the same procedure. No second top-level entry point is introduced.

- **R7 (MUST — completeness precondition).** A review can begin only when the
  pipeline's latest run is complete through phase 5 (its docs phase is approved
  and committed, with no active phase). If the latest run is incomplete, the
  owner is steered to resume (to finish it) or fork (to try a different approach),
  not review. This completeness check is a hard precondition for starting a
  review — the other being that the pipeline is unmerged (R9).

- **R8 (MUST — same branch, never a new branch).** A review stays on the same
  branch and worktree as the pipeline and never creates a new branch. Starting a
  review re-attaches to the existing branch/worktree using the same logic the
  resume flow uses (re-enter the worktree if present, recreate it from the branch
  if gone), reusing that behavior rather than reinventing it. A review does not
  roll anything back, because the latest run is already complete — it only adds a
  new run folder on top.

- **R9 (MUST — reviews are for unmerged pipelines).** A review applies to an
  ongoing pipeline whose work is not yet merged into main:
  - A complete, **unmerged** pipeline whose branch and worktree are still live is
    the canonical case — review before merge.
  - Once a pipeline has been **merged** into main it cannot be reviewed,
    regardless of whether its branch is still live. The work is already in main,
    so the requested change is handled as a new issue, not a review.

### C. The review prompt

- **R10 (MUST — own new prompt).** Each review is driven by its own new prompt at
  `review-N-<short-description>/0-prompt/prompt.md`, generated the same way an
  issue is (Goal / Constraints / Context / …). The original issue and the base
  prompt are NEVER rewritten by a review.

- **R11 (MUST — orchestrator authors the prompt).** The orchestrator authors and
  commits the review prompt as the entry step of the review procedure, before any
  phase agents run — mirroring how the base prompt (phase 0) is authored by the
  orchestrator. It does this by capturing the requested change from the owner the
  same way a new issue is captured. When the source is already written down (for
  example a GitHub comment or PR review), there is little to ask and the
  orchestrator mostly transcribes the source into the prompt format.

- **R12 (MUST — origin reference).** A review prompt MUST include a reference to
  where the review came from (a conversation with the owner, a GitHub comment, a
  PR review, etc.). This origin reference is mandatory for review prompts and
  absent from issue and base prompts. It is self-contained: it carries the
  substance of the request (a quote or paraphrase) plus a convenience link, so a
  later phase reading only the review prompt understands what prompted it. Any
  source assets (e.g. images from the source) are placed in the review's
  `0-prompt/` folder and referenced relatively, the same as for issue/base
  prompts.

### D. Shared prompt format (no duplication)

- **R13 (MUST — single-sourced prompt format).** The prompt-format definition —
  the section schema (Title, Goal, Constraints, Context, Assumptions, with Goal
  required and the rest optional), the rendering rules (omit empty sections, no
  "N/A" filler), and the authoring discipline (state the outcome not the
  solution; capture, do not converge; reflect hypotheses as open questions) — is
  single-sourced: each element of the schema, rendering rules, and authoring
  discipline lives in exactly one location, and issue creation, base-prompt
  generation, and review-prompt generation all reference it rather than restating
  it. No two sites restate the same format prose. (Whether the definition lives in
  one shared file or is split — for example schema in one file and capture
  discipline in another — is left to the design phase; the requirement is the
  no-duplication outcome, not a file count.) Each of the three sites keeps its own
  distinct destination, source, and trigger (and the review-only origin
  reference); only the shared format/discipline is single-sourced.

### E. What a review run produces

- **R14 (MUST — full artifacts, delta content).** A review run produces FULL,
  standalone phase artifacts with the same file structure as base (a complete
  `1-spec/spec.md`, `2-design-doc/design-doc.md`, a plan, code, and docs). Their
  CONTENT is scoped to the incremental change described by the review prompt: the
  review's spec is a spec of the change, not a re-spec of the whole feature, and
  the same holds for the design doc, plan, code, and docs. Standalone (each
  artifact self-contained about its own subject) and delta-scoped (its subject is
  the change) hold together.

- **R15 (MUST — build on existing work).** A review run builds on top of the work
  already in the worktree rather than rebuilding it: the design, plan, code, and
  docs extend the prior run's code and docs. This follows from the delta-scoped
  review prompt propagating through the phases plus the agents' normal
  investigation of the live (non-empty) tree. "Almost nothing changes in the
  agents" holds at the agent-profile level — no agent profile is rewritten to
  achieve this.

- **R16 (MUST — diff against the prior run's tip).** For a review run, the code
  review (and, symmetrically, the docs review) diffs against the tip of the
  previous run — the commit where the prior run (`base` or `review-(N-1)`) ended —
  so the review inspects only the run's incremental change, not the whole
  accumulated tree. This is supplied to the existing review agents as the base
  ref they already accept; no agent capability is added.

- **R17 (MUST — both workflow modes).** A review runs in either autonomous or
  assisted mode, chosen per run like any pipeline run. After the orchestrator
  authors the review prompt (a mode-independent phase 0), the chosen mode drives
  phases 1–5. As with any assisted run, an assisted review can only advance
  through phase 3; an assisted-only review is therefore itself incomplete and
  cannot satisfy the completeness precondition (R7) for a subsequent review until
  it is finished autonomously through phases 4–5.

### F. Sequencing and multiple reviews

- **R18 (MUST — strictly sequential).** Reviews run strictly sequentially, never
  in parallel. `review-(N+1)-…` may begin only after `review-N` is complete
  through phase 5. (Parallel reviews are out of scope.)

- **R19 (MUST — split advisory).** If the owner surfaces several apparently
  unrelated changes at once, the orchestrator MAY suggest splitting them into
  separate reviews (one per change) to run sequentially, so unrelated changes can
  be inspected separately. The owner decides how many reviews there are and where
  the boundaries fall, and may decline and put everything in one review. The
  orchestrator confirms the count and boundaries with the owner before creating
  any run folder.

### G. Pipeline state, resume, and the fork tree

- **R20 (MUST — state follows the latest run).** A pipeline's completed and
  active phase are those of its LATEST run (the highest-numbered run folder), with
  the completion predicate evaluated within that run's folder
  (`<pipeline-folder>/<latest-run>/<phase>`). All phase artifacts, including
  approval/rejection markers, live under the run folder. Two notions are kept
  distinct: the overall pipeline state (the latest run's phase, used by resume)
  and per-run completion (used to gate whether a new review may start, R7). These
  coincide except while a review is in flight. As soon as a review run folder is
  created with only its `0-prompt/prompt.md` and nothing further, that review is
  the latest run and the pipeline's active phase is that review's phase 1 (spec) —
  its prompt is the input to phase 1, just as the base prompt is for the base run.
  (How such an abandoned, prompt-only review run is recovered — resumed from its
  prompt versus removed — is left to the design phase, R21.)

- **R21 (MUST — resume targets the latest run).** Resume operates on the latest
  run's active phase; its rollback target is scoped to that run
  (`<pipeline-folder>/<latest-run>/<active-phase>`). Branch/worktree re-attach is
  unchanged by reviews — it is the same branch and worktree regardless of run.

- **R22 (MUST — fork tree stays at the branch level).** The fork tree, lineage,
  and pipeline listing stay at the branch level. Forks (separate branches with
  `-v<N>` slugs) are tree nodes; reviews (runs within one branch) are NOT new tree
  nodes. Reviews are reported as per-pipeline run metadata — a linear chain within
  a pipeline's node (e.g. `base → review-1-… → review-2-…` with each run's state).
  Cross-fork lineage comparison reads each pipeline's `base/` run; reviews do not
  participate in cross-pipeline lineage. (Treating runs as tree nodes would break
  the existing invariant that the shared root of an issue's tree is the issue's
  prompt, because a review prompt is a new prompt, not the issue.)

- **R23 (MUST — forking unchanged).** Forking is unchanged for this work: a new
  fork starts with its own `base/` run and inherits from the parent's `base/` run.
  Forking from a reviewed run, and any change to fork-inheritance semantics, are
  out of scope.

### H. Orchestrator judgment (advisory, non-gating)

- **R24 (MUST — fork-vs-review advisory).** The orchestrator always assesses
  whether a requested change is drastic and, if so, MAY recommend a fork instead
  of a review — but this is advisory. The owner decides; the orchestrator never
  unilaterally redirects to a fork; and a review proceeds if the owner chooses it,
  even for a large change. "Drastic" is a qualitative heuristic (the change would
  not layer cleanly onto the existing implementation — it reworks the
  architecture, invalidates most of the existing code, or is "redo this
  differently" rather than "add or adjust this"), with no numeric threshold.

- **R25 (MUST — RESUME / REVIEW / FORK decision rule).** The orchestrator
  presents a clear decision rule among the three same-issue actions: resume =
  finish an incomplete latest run on the same branch; review = layer an
  incremental change on a complete run, same branch, building on existing code;
  fork = diverge onto a fresh branch from main. The sharpest discriminator is
  same-branch-build-on-existing (review) versus new-branch-from-main-diverge
  (fork); resume is the option for an incomplete run.

- **R26 (MUST — advisories never gate).** No advisory behavior gates a review.
  The hard preconditions are completeness (R7) and an unmerged pipeline (R9);
  drastic-ness (R24) and splitting (R19) never block a review the owner chooses.

### I. Orchestrator / tracker updates

- **R27 (MUST — review behaves like a normal run).** A review carries exactly the
  orchestrator-update obligations the project's conventions attach to a normal run
  — no additional obligations and none skipped — applied to the review run. The
  conventions decide what those obligations are (a project might define run-start
  and run-end tracker updates, per-phase progress updates, publishing the branch
  at close-out, or none of these); the spec only requires that a review be treated
  identically to any other run of the pipeline. Two things follow from a review
  being a *new* run on an *existing* branch: (1) those obligations fire afresh for
  the review — any run-start and run-end actions run for every outcome, and any
  per-phase or per-run progress the conventions track restarts for the review and
  reflects the review run's own phases rather than continuing the prior run's; and
  (2) because a review stays on the same branch (R8), any branch-publish
  obligation is a fast-forward of additional commits onto that branch, never a new
  branch. A review also operates on the pipeline's existing tracker issue and does
  NOT create a new one — the issue-creation path is never part of a review; the
  orchestrator authors the review prompt (phase 0) and applies all run obligations
  to that existing issue. If the project runs a health monitor, an autonomous
  review follows its normal lifecycle (cancel any leftover monitor for the
  pipeline, launch a fresh one) with the monitor pointed at the review run's folder
  while the pipeline slug and team stay the same; an assisted review launches no
  monitor.

- **R28 (MUST — version unchanged).** A review does NOT change the pipeline
  version: the `v<N>` version label is untouched, because a review is the same
  branch and the same pipeline. Starting a review re-asserts (confirms, does not
  change) the existing version label, the same way creating, resuming, or forking
  asserts it.

### J. Entry-point wiring and supersession

- **R29 (MUST — wire the Review hook, distributed not monolithic).** The
  previously dangling "Review" menu action is wired to a real target, so that
  selecting it runs a working review procedure that produces the outcomes this
  spec requires (an authored review prompt, a new run folder, a diff base scoped
  to the prior run's tip, and a run that proceeds in the chosen autonomous or
  assisted mode). That procedure is **distributed, not monolithic**: it reuses the
  existing phase flow and shared building blocks rather than re-implementing a
  full run in one self-contained reference file. This supersedes the closed issue
  #58 (which envisioned a single `review-pipeline.md` reference); #58 is already
  closed and needs no further tracker action. Wiring the Review action MUST NOT
  remove or break the sibling Merge and Close menu actions, which remain unwired
  by this work. (How the procedure is decomposed across files and references is
  left to the design phase.)

## Out of Scope

- **Merge and close procedures.** The Merge and Close menu actions remain unwired
  exactly as today; this work wires only Review and must not break their menu
  lines.
- **Consolidation / cleanup** of the several prompts, specs, design docs, and
  plans a reviewed pipeline accumulates — explicitly deferred to the future
  cleanup phase.
- **Migrating existing flat-layout pipelines** to the run-folder structure — and,
  more broadly, **codifying any legacy (no-`base/`) handling in the skill**. R5
  leaves such pipelines untouched and unmentioned; if the orchestrator meets one
  it improvises at runtime, but nothing about it is written into the skill.
- **Forking from a reviewed run** and any change to fork-inheritance semantics
  (forks still inherit from `base/`, R23).
- **Parallel reviews** (would require additional worktrees; reviews are strictly
  sequential, R18).

## Acceptance Criteria

1. **New pipeline is laid out under `base/`.**
   Given a brand-new pipeline that has never been reviewed,
   When its artifacts are inspected,
   Then its phase folders live under `base/` (`base/0-prompt`, `base/1-spec`, …)
   and not directly under the pipeline folder, with `base/0-prompt` holding the
   issue prompt. (R1, R2)

2. **A review adds a sibling run folder and leaves base untouched.**
   Given a complete pipeline,
   When the owner requests a review and it is captured,
   Then a new `review-1-<short-description>/` folder appears as a sibling of
   `base/`, the `base/` run folder is byte-for-byte unchanged, and the new run
   folder is on the same branch with no new branch created. (R1, R2, R8, R10)

3. **Review prompt is the review's own and carries an origin reference.**
   Given a review being started,
   When its prompt is authored,
   Then `review-1-<short-description>/0-prompt/prompt.md` exists, it is a new
   prompt (the original issue and `base/0-prompt` are unchanged), and it contains
   a mandatory origin reference describing where the review came from with enough
   substance to stand alone. (R10, R11, R12)

4. **Completeness gates a review.**
   Given a pipeline whose latest run is NOT complete through phase 5,
   When the owner asks for a review,
   Then the review does not start and the owner is steered to resume or fork
   instead. (R7)

5. **Merged pipelines are not reviewable.**
   Given a pipeline that was merged into main (whether or not its branch is still
   live),
   When the owner asks for a review,
   Then a review is not offered and the requested change is handled as a new
   issue; only a complete, unmerged pipeline can be reviewed. (R9)

6. **A second review waits for the first to finish.**
   Given a pipeline with `review-1` still in progress,
   When the owner asks to start `review-2`,
   Then `review-2` does not start until `review-1` is complete through phase 5.
   (R18)

7. **Review run produces full, delta-scoped artifacts that build on prior work.**
   Given a completed review run,
   When its artifacts and the worktree are inspected,
   Then the run folder contains a complete `1-spec` … `5-docs` set whose content
   describes only the incremental change, and the code/docs in the worktree extend
   the prior run's implementation rather than re-creating it. (R14, R15)

8. **Code review diffs only the review's delta.**
   Given a review run reaching the code phase,
   When the code reviewer runs,
   Then it diffs against the tip of the previous run (not against main or an empty
   tree), inspecting only the review's incremental change; the docs review uses
   the same prior-run-tip base. (R16)

9. **Pipeline state and resume follow the latest run.**
   Given a pipeline whose `base` is complete and whose `review-1` is in progress
   at phase 2,
   When the pipeline's state is computed and a resume is requested,
   Then the pipeline's active phase is `review-1`'s phase 2 and resume continues
   `review-1` from that phase on the same branch and worktree. (R20, R21)

10. **A just-created review run is the latest run at phase 1.**
    Given a pipeline whose `base` is complete and whose `review-1` folder has just
    been created with only its `0-prompt/prompt.md` (no later phase started),
    When the pipeline's state is computed,
    Then `review-1` is the latest run and the pipeline's active phase is
    `review-1`'s phase 1 (spec), with its prompt as the input to phase 1. (R20)

11. **Reviews appear as run metadata, not as fork-tree nodes.**
    Given a pipeline with a base run and one or more reviews,
    When the owner lists pipelines for the issue,
    Then the fork tree shows one node for the pipeline (and separate nodes only
    for actual forks), with the pipeline's runs reported as a linear chain
    (`base → review-1-… → …`) including each run's state; reviews do not appear as
    new tree nodes. (R22)

12. **Forking is unaffected.**
    Given a pipeline that has reviews,
    When the owner forks it,
    Then the new fork is on a fresh branch with its own `base/` run inherited from
    the parent's `base/` run, and the parent's reviews do not change the fork's
    lineage. (R23)

13. **Prompt format is single-sourced.**
    Given the skill after this work,
    When the prompt-format schema, rendering rules, and authoring discipline are
    located,
    Then no two of issue creation, base-prompt generation, and review-prompt
    generation restate the same format prose — each references the shared
    definition rather than restating the schema or discipline (whether that
    definition lives in one file or is split is not constrained). (R13)

14. **Review obeys the normal orchestrator-update obligations without changing the
    version.**
    Given a review run from start to close-out,
    When the tracker and branch are observed,
    Then the review incurs the same run obligations the project's conventions
    define for a normal run — run-start and run-end updates fire (every outcome)
    and any per-phase progress re-cycles to reflect the review run — no new tracker
    issue is created (the review reuses the pipeline's existing issue), any branch
    publish is a same-branch fast-forward, and the pipeline's version is unchanged.
    (R27, R28)

15. **Fork-vs-review and splitting are advisory, not gates.**
    Given a drastic change, or several unrelated changes surfaced at once,
    When the orchestrator advises a fork or a split and the owner declines,
    Then the review (or the single combined review) proceeds as the owner chose;
    the advisory inputs never block a review — only the hard preconditions
    (completeness R7, unmerged R9) can. (R24, R19, R26)

16. **The Review hook is wired and is distributed.**
    Given the "work on an issue" menu after this work,
    When the owner selects Review,
    Then it runs a real review procedure (one that produces a review prompt, a new
    run folder, a prior-run-tip diff base, and a run in the chosen mode) built on
    the existing phase flow rather than a single self-contained re-implementation
    of a run — and the Merge and Close menu actions are still present (unwired) and
    not broken. (R29)

17. **The skill never migrates a legacy pipeline and stays silent about the
    no-`base/` case.**
    Given the shipped skill,
    When its references and instructions are searched for any handling of a
    pipeline that lacks a `base/` run folder,
    Then no such instruction or mention is present; and given an existing
    flat-laid-out pipeline on disk, when the reviews feature operates, then that
    pipeline's existing artifacts are never moved or rewritten. (R5)
