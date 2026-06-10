# Doc Plan: Reviews — re-run the whole pipeline as additional runs on the same branch

## Scope note

This feature is implemented as edits to the Radical Pipelines skill's own
reference files and agent profiles (handled by `code-plan.md`). The skill
reference edits are **code, not documentation** and are out of scope here.

External documentation that genuinely goes stale or needs new coverage for
reviews is **narrow**. The only repo documentation that describes the
pipeline behavior reviews change — and that a reader consults to understand
what the product does — is `README.md`, in two places: the same-issue
**entry points** (which list resume and fork but not review) and the
artifact-folder/layout description (silent on the new `base/`/`review-N` run
layer). A release-relevant change to the repo also requires a **changeset**
per the project's standing rule.

The `website/` landing page contains an illustrative, sped-up demo tree that
shows the pre-reviews flat layout; updating marketing copy is **not required**
by this feature (the website is explicitly not a release-relevant path and the
demo is a reconstructed example, not a behavior contract). It is captured below
as a single **optional** task so a doc-writer who wants to keep the marketing
surface from drifting can do so, but skipping it is acceptable and does not
fail the feature.

`AGENTS.md` and `CONTRIBUTING.md` describe skill-authoring rules and release
mechanics respectively; reviews change neither, so they get no task. Per the
spec's out-of-scope, there is **no** consolidation/cleanup documentation and
**no** legacy-flat-layout documentation in this plan.

Each task below is self-contained: a fresh doc-writer can execute one in
isolation using only the listed inputs.

---

## Task D1: Add Review as the third same-issue action in the README entry points

- **Goal:** Update `README.md`'s "Work on an issue" entry-point description so
  it accurately presents the three same-issue actions available on a complete,
  unmerged pipeline — **resume**, **review**, and **fork** — instead of only
  resume and fork. A reader of the README should understand that review layers
  an incremental change onto a complete pipeline by re-running the whole phase
  flow as an additional run on the **same branch and worktree** (distinct from
  fork, which diverges onto a fresh branch from main), and that review is gated
  on the pipeline being complete-through-phase-5 and unmerged.
- **Audience:** Prospective and current users reading the README to understand
  what the orchestrator can do with an existing pipeline (the "Current status
  and limitations" reader). Not the agents and not contributors.
- **Files:** `README.md`
- **Sections-scope:**
  - The "Current status and limitations" → **Entry points** → **Work on an
    issue** bullet (currently around line 213), which today reads "the owner can
    **resume** … or **fork** …". Add **review** as a peer action with a
    one-clause description and a pointer to `reference/review-pipeline.md`,
    matching the existing style of the resume/fork clauses (each names its
    reference file in parentheses). Keep the description outcome-level — what
    review does and when it is offered — not a restatement of the procedure.
  - Do **not** add a new top-level section; extend the existing bullet/sentence.
  - Leave the "Workflows" and "Phases" subsections untouched (autonomous/assisted
    modes and the six phases are unchanged by reviews; a review reuses them).
- **Depends on:** none (can be written from the spec/design doc; does not depend
  on D2 or D3).
- **Traces to:** R6 (single entry point — the Review action), R7 (completeness
  precondition), R8 (same branch / re-attach), R9 (unmerged precondition), R25
  (RESUME / REVIEW / FORK decision rule), R29 (wire the Review hook). Spec
  acceptance criteria 4, 5, 16. Maps to code-plan Task 9 (`review-pipeline.md`)
  and Task 10 (menu wiring + decision rule).
- **Acceptance:**
  - The "Work on an issue" entry-point text names **review** alongside resume
    and fork as a same-issue action and points to `reference/review-pipeline.md`.
  - The review clause states (briefly) that it re-runs the pipeline as an
    additional run on the same branch/worktree to apply an incremental change,
    and that it applies to a complete, unmerged pipeline.
  - The resume and fork descriptions remain accurate and are not duplicated or
    contradicted; the three read as parallel peers.
  - No procedure-level detail (step lists, run-folder internals) is copied into
    the README — those live in the skill references.

## Task D2: Describe the run-folder (`base/` + `review-N`) artifact layout in the README

- **Goal:** Update `README.md` so its description of the artifact folder
  reflects the new **run** layer: phase folders now live under a run folder
  (`base/`, then `review-N-<short-description>/`) instead of directly under the
  pipeline folder. A reader should understand that every pipeline carries a
  `base/` run from creation and that each review adds a sibling run folder on
  the same branch, with the original issue/base prompt never rewritten.
- **Audience:** Users reading the README to understand where pipeline artifacts
  live on disk and how reviews appear in the layout (the "Configuration" and
  "Current status" reader).
- **Files:** `README.md`
- **Sections-scope:**
  - The "Configuration" paragraph (currently around line 165) that describes how
    "Each phase commits inspectable review artifacts into the task's artifact
    folder" and the `<artifact>-review-N-rejected.md` / `<artifact>-review-approved.md`
    filenames. Add a concise statement that phase folders sit under a **run**
    folder — `base/` (always present, the original run) plus
    `review-N-<short-description>/` for each review — and that
    `reference/pipeline-versioning.md` documents the run model. Keep the existing
    sentence about per-phase completion detection accurate (it now operates within
    a run folder), without restating the predicate.
  - Optionally, if a doc-writer finds a concrete flat-layout artifact-path example
    elsewhere in the README that contradicts the run layout, correct that example
    to the `base/`-prefixed form in the same edit. (As of writing, the README's
    prose does not show a concrete `.pipelines/<slug>/0-prompt/...` tree, so this
    is a guard, not a known fix.)
  - Do **not** document the legacy flat (no-`base/`) layout or any migration —
    the skill stays silent on it and so does the README (spec out-of-scope, R5).
- **Depends on:** none (writable from the spec/design doc).
- **Traces to:** R1 (run folders), R2 (eager `base/`), R20 (state follows the
  latest run), R22 (reviews are per-pipeline run metadata, not fork-tree nodes).
  Spec acceptance criteria 1, 2, 11. Maps to code-plan Task 1
  (`pipeline-versioning.md` run model) and Task 3 (eager `base/` in
  `create-pipeline.md`).
- **Acceptance:**
  - The README states phase folders live under a run folder, names `base/` as the
    always-present first run and `review-N-<short-description>/` as the per-review
    sibling, and points to `reference/pipeline-versioning.md` for the run model.
  - The existing per-phase-completion / review-filename description remains
    accurate under the run layer and is not duplicated.
  - No flat-layout or legacy/migration wording is introduced.
  - The description stays at the README's altitude (what the layout is), not a
    restatement of the skill's run-model prose.

## Task D3: Add a changeset for the reviews feature

- **Goal:** Record the reviews feature in a committed changeset so the project's
  changelog and version sync pick it up, satisfying the repository's standing
  rule that every release-relevant change carries a changeset (the change edits
  `skills/**` and `agents/**`, both release-relevant paths).
- **Audience:** Maintainers and changelog readers; downstream consumers who pick
  up the next version.
- **Files:** a new `.changeset/<name>.md` file (create via `npx changeset`, or
  hand-author following the existing files in `.changeset/`, e.g.
  `.changeset/changelog-and-version-sync.md`, for the front-matter shape).
- **Sections-scope:**
  - One changeset file: front matter declaring the package
    `"@automattic/radical-pipelines"` and the bump type, plus a one-line
    imperative summary describing the reviews feature.
  - Bump type per `CONTRIBUTING.md#bump-types` and the pre-1.0 policy: this is a
    **new feature**, which is a `minor` bump (and pre-1.0 a feature is `minor`).
    It is not a breaking change, so no `BREAKING:` prefix.
  - Do not edit `CHANGELOG.md` or any version-bearing file directly — Changesets
    generates those at release time.
- **Depends on:** D1, D2 should land in the same change so the changeset's summary
  reflects the full feature (the changeset describes the whole reviews change, of
  which the doc edits are part).
- **Traces to:** Project changeset standing rule (README "Changelog and
  versioning"; `CONTRIBUTING.md#adding-a-changeset`; `.changeset/config.json`
  `changedFilePatterns` includes `skills/**`, `agents/**`, `README.md`). Not a
  spec requirement, but required by the repo's contribution conventions for any
  release-relevant change.
- **Acceptance:**
  - A single `.changeset/*.md` file exists with valid front matter naming
    `"@automattic/radical-pipelines"` and a `minor` bump.
  - The summary is a one-line imperative description of the reviews feature
    (re-run the pipeline as additional runs on the same branch).
  - No `BREAKING:` prefix (not a breaking change), no `major` bump.
  - `npx changeset status` / `node scripts/validate-changesets.mjs` accept it (the
    changeset is well-formed and present), satisfying the Changeset Gate.

## Task D4 (OPTIONAL — marketing, skippable): Refresh the website demo tree to the run layout

- **Goal:** Keep the marketing landing page from showing a stale pre-reviews
  artifact layout. The hero and demo terminal cards in `website/index.html`
  render a flat `.pipelines/issue-1234/` tree (phase files directly under the
  pipeline folder). Under the run layer, a real pipeline's artifacts live under
  `base/`. This task updates the illustrative tree so the marketing surface does
  not contradict the shipped layout.
- **Audience:** Website visitors (marketing), not users or contributors.
- **Files:** `website/index.html` (and, only if the change affects them, the demo
  data in `website/demo.js`).
- **Sections-scope:**
  - The hero `term-body` tree (currently around lines 118–131) and the demo card
    `.pipelines/issue-1234/` references (around line 221). If updated, prefix the
    shown phase artifacts with `base/` (or otherwise depict the run layer) so the
    example matches the shipped layout.
  - This is **cosmetic/illustrative only**. The demo is explicitly a
    "reconstructed log of a real pipeline run, sped up" — it is not a behavior
    contract. `website/**` is **not** a release-relevant path
    (`.changeset/config.json` excludes it; `CONTRIBUTING.md` lists it as
    needing no changeset), so this task needs **no** changeset and does **not**
    gate the feature.
  - Do not introduce reviews-specific marketing copy beyond keeping the existing
    example accurate; new feature-marketing is out of scope for this pipeline.
- **Depends on:** D2 (the layout it should mirror).
- **Traces to:** R1/R2 (run-folder layout) — illustrative consistency only. No
  spec acceptance criterion depends on the website.
- **Acceptance (only if the task is undertaken):**
  - The website's example artifact tree no longer shows phase files directly
    under `.pipelines/<slug>/` in a way that contradicts the `base/` run layer.
  - No changeset is added for a website-only change.
  - If the doc-writer chooses to skip this task, that is acceptable and the
    feature's documentation is still complete (D1–D3 carry the required coverage).
