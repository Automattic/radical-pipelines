# Code Plan — Bring the reviews-feature prose into AGENTS.md compliance

## Orientation

This is a documentation-only change: nine precise prose edits across six files under the
repository worktree, bringing PR #106's reviews-feature prose into compliance with the five
`AGENTS.md` rules without losing meaning. There is no application code, no schema, no unit
tests, and no test runner for prose. The design doc fixes an **exact replacement wording**
for every edit site; the governing rule is **apply the decided wording verbatim — do not
re-paraphrase**, because each wording was settled against the minimalism and duplication
rules and a fresh paraphrase would reopen the questions each decision already closed.

**Anchor on quoted text, not line numbers.** Two files take three edits each
(`review-pipeline.md` for tasks 2/6/8, `pipeline-versioning.md` for tasks 3/4/7), so line
numbers cited in the spec and design doc shift as edits land. Each task below carries the
exact current text to match. The edits within a file are independent (non-overlapping text
spans), so order among them does not matter, but every quoted anchor below is the
**pre-edit** text and remains findable regardless of which sibling edit lands first.

**Verification is manual** (no prose linter exists in the repo). The only PR-time gate is
the Changeset Gate CI. Task 10 is the verification task; it is run after all nine edits land.

All paths are relative to the worktree root
`/Users/santosguillamot/Desktop/Code/radical-pipelines/.claude/worktrees/95-pipeline-reviews`.

### Files touched (six)

- `skills/radical-pipelines/reference/fork-pipeline.md` — task 1
- `skills/radical-pipelines/reference/review-pipeline.md` — tasks 2, 6, 8 (three edits)
- `skills/radical-pipelines/reference/pipeline-versioning.md` — tasks 3, 4, 7 (three edits)
- `skills/radical-pipelines/reference/work-on-an-issue.md` — task 5
- `skills/radical-pipelines/reference/autonomous-workflow.md` — task 6 (second base-ref site)
- `.changeset/pipeline-reviews.md` — task 9 (body only; front matter byte-identical)

### Files that must stay byte-identical (do NOT edit)

- `README.md` (the run-model sentence at line 157 is load-bearing connective tissue; task 9
  differentiates on the changeset side only).
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` and `5 - docs.md` — the
  two **Reviewer base ref** reference parentheticals. Each reads
  `(the start of the current run — see the **Reviewer base ref** rule in
  \`pipeline-versioning.md\`)`. These are the model for task 6's target and must not change.
- `skills/radical-pipelines/reference/pipeline-versioning.md` lines 21–28 (the canonical
  **Reviewer base ref** rule). This is task 6's dedup target and must remain intact and
  complete — it is the only place the value/timing/hold-constant substance lives after the
  task-6 edits. (Tasks 3, 4, 7 edit *other* parts of this file and must not touch 21–28.)
- `skills/radical-pipelines/reference/intent-format.md` — the shared cross-path dedup file.

---

## Tasks

### Task 1 — fork-pipeline.md: state "fork seeds only from `base/`; reviews not inherited" once

- **Goal:** Collapse the three statements of "a fork seeds only from the parent's `base/`
  run; reviews are not inherited" to a single positive statement at step 4, leaving step 5
  purely operational.
- **Files:** `skills/radical-pipelines/reference/fork-pipeline.md`
- **Changes:** Three independent edits in this one file (Decision 1).
  1. **Step 4 second sentence.** Find the sentence (currently the second sentence of the
     step-4 paragraph):
     > The fork's phases live under its own `base/` run, seeded from the parent's `base/`
     > run in the next step (see **Runs within a pipeline** in `pipeline-versioning.md`); a
     > fork starts a fresh `base/` and never inherits the parent's reviews.

     Replace it **verbatim** with:
     > The fork's phases live under its own fresh `base/` run, seeded only from the parent's
     > `base/` run in the next step (see **Runs within a pipeline** in
     > `pipeline-versioning.md`).

     (This merges "fresh `base/`" and "nothing but the parent's `base/` is inherited" into
     one positive clause via "fresh" and "only", and drops the negative
     "never inherits the parent's reviews".)
  2. **Step 5 second sentence — delete.** In the step-5 lead paragraph, delete the second
     sentence:
     > Only `base/` is copied; the parent's `review-*` runs (if any) are never inherited.

     The lead sentence ("Copy only the phase folders being inherited, from the parent's
     `base/` run into the new pipeline's `base/` run — `base/0-intent` up to and including
     the inherited phase agreed in step 1.") stays verbatim, as do the `cp -r` bullets.
  3. **Worktree-does-not-exist bullet — delete the parenthetical.** Find the bullet:
     > - **If the worktree does not exist**, create a temporary worktree of the parent
     >   branch per the **Worktrees** convention, copy as above (from the parent's `base/`
     >   run), then remove it.

     Delete the parenthetical `(from the parent's `base/` run)` so the bullet reads:
     > - **If the worktree does not exist**, create a temporary worktree of the parent
     >   branch per the **Worktrees** convention, copy as above, then remove it.

     The `cp -r <parent-worktree>/<parent-artifact-folder>/base/<phase> …` source path in
     the preceding bullet and the in-line "in the parent's `base/` run" in the lead sentence
     remain the operational anchors — do not touch them.
- **Depends on:** none.
- **Traces to:** Requirement 1 / Acceptance criterion 1 / Decision 1.
- **Acceptance:** `fork-pipeline.md` conveys "fork seeds only from `base/`, reviews not
  inherited" exactly once (at the step-4 sentence above). The step-5 `cp -r … base/<phase>`
  copy instructions remain complete and executable (which phase folders, from where). The
  word "reviews"/"review-*" no longer appears in steps 4 or 5 as a no-inherit restatement.

### Task 2 — review-pipeline.md: state "advisories never gate an owner-chosen review" once

- **Goal:** Keep the advisories-non-gating fact at step 1; de-label the step-2 heading and
  delete the step-2 body restatement.
- **Files:** `skills/radical-pipelines/reference/review-pipeline.md`
- **Changes:** Two independent edits (Decision 2). The step-1 sentence is **unchanged** —
  both its sentences stay ("These two are the ONLY preconditions." and "The fork-vs-review
  and split advisories (next step) never gate a review the owner chooses.").
  1. **Heading — de-label.** Find the heading:
     > ### 2. Advisories (non-gating)

     Replace with:
     > ### 2. Advisories
  2. **Step-2 body sentence — delete.** Delete the sentence (the paragraph immediately under
     that heading, before the two bullets):
     > Both advisories are recommendations only — the owner decides, and the orchestrator
     > never unilaterally redirects.

     No replacement; step 2 opens directly on its `**Fork vs. review.**` /  `**Split.**`
     bullets. Do not add a lead-in (avoids overlap with the later
     "BEFORE creating any run folder" sentence).
- **Depends on:** none. (Independent of tasks 6 and 8 in the same file — different text
  spans.)
- **Traces to:** Requirement 2 / Acceptance criterion 2 / Decision 2.
- **Acceptance:** The advisories-non-gating fact appears once, at the step-1 sentence
  "The fork-vs-review and split advisories (next step) never gate a review the owner
  chooses." The heading reads "### 2. Advisories". The deleted body sentence is gone.

### Task 3 — pipeline-versioning.md: state "reviews are not cross-pipeline-tree nodes" once

- **Goal:** Keep the tree-node assertion plus its causal rationale only at the lineage
  section (line ~65); strip the restated consequence from the tree-building step and the
  rendering bullet, leaving each downstream site its distinct positive operational
  instruction.
- **Files:** `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Changes:** Two independent edits (Decision 3). The lineage-section sentence is
  **unchanged** — it is the single surviving statement with its WHY: "Tree SHAs are always
  computed over the pipeline's `base/` run; reviews are not part of the cross-pipeline tree,
  because lineage is a cross-fork comparison and forks inherit from `base/`, so only base
  phases are comparable."
  1. **Tree-building step 3 — delete trailing clause.** Find the sentence (end of the "Build
     the tree as a trie…" step):
     > Each pipeline contributes one path through the tree from its `base/` run; a pipeline's
     > reviews are not nodes.

     Delete the trailing clause `; a pipeline's reviews are not nodes`, leaving:
     > Each pipeline contributes one path through the tree from its `base/` run.
  2. **Rendering bullet — delete sentence 2.** In the final "Rendering" bullet, delete the
     second sentence:
     > The tree positions a pipeline by its `base/` run only; reviews never add or move
     > nodes.

     Sentence 1 stays **verbatim**, including its "not as tree nodes" gloss (this gloss is
     NOT a named edit site — do not strip it):
     > A pipeline's runs are reported as a linear chain annotated on the pipeline, not as
     > tree nodes: `base → review-1-<short-description> → review-2-<short-description> …`,
     > each annotated with its own state.

     (Note: this same bullet's final sentence "A pipeline with no reviews shows no run
     chain." is deleted by **task 4**, not here. Both deletions land in this bullet; do them
     per their own task. After both, the bullet ends on "…each annotated with its own
     state.")
- **Depends on:** none. (Independent of tasks 4 and 7 in the same file — task 4 deletes a
  different sentence of the same rendering bullet, task 7 edits the per-phase-completion
  passage.)
- **Traces to:** Requirement 3 / Acceptance criterion 3 / Decision 3.
- **Acceptance:** "reviews are not cross-pipeline-tree nodes" appears once, at the lineage
  sentence with its `because…` rationale. Tree-building step ends on
  "…from its `base/` run." The rendering bullet's sentence 1 (with its "not as tree nodes"
  gloss) is intact; its old sentence 2 ("The tree positions a pipeline by its `base/` run
  only; reviews never add or move nodes.") is gone.

### Task 4 — pipeline-versioning.md: delete the defensive negative about review-less pipelines

- **Goal:** Remove the defensive negative; the empty-chain case is derivable from the chain
  format and the example tree.
- **Files:** `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Changes:** One deletion (Decision 4). In the final "Rendering" bullet, delete the
  sentence:
  > A pipeline with no reviews shows no run chain.

  No replacement. After task 3 also edits this bullet, it ends on "…each annotated with its
  own state." — the last line of the file, no dangling connective.
- **Depends on:** none. (Independent of task 3, though both touch the same rendering bullet
  at different sentences. If task 3 has not yet run, the bullet's sentence 2 is still
  present; this deletion targets only the final sentence "A pipeline with no reviews shows no
  run chain." — match that exact text.)
- **Traces to:** Requirements 4 and 11 / Acceptance criterion 4 / Decision 4.
- **Acceptance:** The sentence "A pipeline with no reviews shows no run chain." no longer
  appears anywhere in `pipeline-versioning.md`. A reader can still determine a review-less
  pipeline shows no run chain from the chain format (nothing after `base`) and the example
  tree (lines ~95–105 render pipelines with no run chains).

### Task 5 — work-on-an-issue.md: delete the "sharpest discriminator" bullet

- **Goal:** Remove the bullet that only restates the three resume/review/fork definitions
  above it; keep the three definition bullets verbatim.
- **Files:** `skills/radical-pipelines/reference/work-on-an-issue.md`
- **Changes:** One deletion (Decision 5). In the "When the owner is unsure which same-issue
  action to take, apply this rule:" sub-list, delete the fourth bullet:
  > - The sharpest discriminator is same-branch-build-on-existing (review) vs.
  >   new-branch-from-main-diverge (fork); resume is the option when the latest run is
  >   incomplete.

  No replacement. The three preceding bullets (**Resume** / **Review** / **Fork**, each
  naming its selecting condition) and the lead-in stay verbatim.
- **Depends on:** none.
- **Traces to:** Requirement 5 / Acceptance criterion 5 / Decision 5.
- **Acceptance:** The "sharpest discriminator" bullet is gone; the three
  **Resume**/**Review**/**Fork** definition bullets and the "apply this rule:" lead-in
  remain. The surviving sub-list is three parallel "**Label** — condition" bullets.

### Task 6 — review-pipeline.md + autonomous-workflow.md: reduce both base-ref steps to bare references

- **Goal:** Both citing steps reference the **Reviewer base ref** rule with no restatement of
  its substance (no value, no capture timing, no hold-constant clause). The substance stays
  only at the canonical rule.
- **Files:** `skills/radical-pipelines/reference/review-pipeline.md`,
  `skills/radical-pipelines/reference/autonomous-workflow.md`
- **Changes:** Two edits, one per file (Decision 6).
  1. **`review-pipeline.md` step 3.** Find the sentence (the last paragraph of the
     "Re-attach … and capture the base ref" step):
     > While HEAD is still the prior-run tip (before the review intent is committed), capture
     > the review's base ref = the prior-run tip, per the **Reviewer base ref** rule in
     > `pipeline-versioning.md`.

     Replace it **verbatim** with:
     > Capture the run's base ref per the **Reviewer base ref** rule in
     > `pipeline-versioning.md`.

     ("review's" → "run's" to match the sibling site; the value clause "= the prior-run tip"
     and the entire timing clause are dropped.)
  2. **`autonomous-workflow.md` step 5.** Find the sentence:
     > At run start, capture the run's base ref per the **Reviewer base ref** rule in
     > `pipeline-versioning.md` and hold it constant for the whole run, so it is fixed before
     > launching the phase-4/5 reviewers.

     Replace it **verbatim** with:
     > At run start, capture the run's base ref per the **Reviewer base ref** rule in
     > `pipeline-versioning.md`.

     ("At run start" stays — it is this workflow's own scheduling imperative for *when* to
     act, not a description of the ref. The hold-constant clause and the trailing purpose
     clause are dropped; both are reachable at the cited rule.)
- **Depends on:** none. (The `review-pipeline.md` edit is independent of tasks 2 and 8 —
  different text spans. Both edited steps depend on the canonical rule at
  `pipeline-versioning.md:21–28` remaining intact — that rule is NOT edited by any task.)
- **Traces to:** Requirement 6 / Acceptance criterion 6 / Decision 6.
- **Acceptance:** Neither step restates the base-ref value (prior-run tip / merge-base), the
  capture timing (while HEAD is still the prior-run tip, before the review intent is
  committed), nor the hold-constant clause. `review-pipeline.md` step 3 reads exactly
  "Capture the run's base ref per the **Reviewer base ref** rule in `pipeline-versioning.md`."
  `autonomous-workflow.md` step 5 reads exactly "At run start, capture the run's base ref per
  the **Reviewer base ref** rule in `pipeline-versioning.md`." The canonical rule at
  `pipeline-versioning.md:21–28` is intact and complete (value, timing, hold-constant all
  present). The `4 - code.md` / `5 - docs.md` parentheticals are unchanged.

### Task 7 — pipeline-versioning.md: delete the no-information per-phase-completion sentence

- **Goal:** Remove the trailing sentence that restates the predicate-evaluation fact already
  stated just before it.
- **Files:** `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Changes:** One deletion (Decision 7). In the per-phase-completion passage, find the
  sentence and delete its trailing sentence:
  > The artifact paths above are relative to a run folder: a phase's predicate is evaluated
  > at `<artifacts-folder>/<run>/<phase>` (for the base run, `<artifacts-folder>/base/<phase>`).
  > The rows are unchanged; only their root is the run folder.

  Delete only `The rows are unchanged; only their root is the run folder.`, leaving:
  > The artifact paths above are relative to a run folder: a phase's predicate is evaluated
  > at `<artifacts-folder>/<run>/<phase>` (for the base run, `<artifacts-folder>/base/<phase>`).

  No replacement. The following paragraph (latest-run selection) opens a new topic and does
  not connect back.
- **Depends on:** none. (Independent of tasks 3 and 4 — different passage of the same file.)
- **Traces to:** Requirement 7 / Acceptance criterion 7 / Decision 7.
- **Acceptance:** The sentence "The rows are unchanged; only their root is the run folder."
  no longer appears in `pipeline-versioning.md`. The preceding sentence (predicate evaluated
  at `<artifacts-folder>/<run>/<phase>`) is intact.

### Task 8 — review-pipeline.md: state "review reuses branch/pipeline, version unchanged" once

- **Goal:** Keep the assertion at the opener; trim step 6 to its bare imperative.
- **Files:** `skills/radical-pipelines/reference/review-pipeline.md`
- **Changes:** One deletion (Decision 8). The **opener (line 3) is unchanged**, including
  "it never creates a new pipeline" (load-bearing fork-contrast at the procedure-selection
  point; finding 8 is a dedup finding, not a negative-phrasing one, so trimming the opener
  would exceed scope). Line 29's two step-3 overrides ("and NEVER create a new branch" and
  "Do NOT perform resume's rollback step") are **also unchanged** — both are operational
  overrides of the cited resume procedure and stay in place.
  - **Step 6 second sentence — delete.** Find the step-6 paragraph:
    > Re-assert (confirm, do not change) the existing `v<N>` version label per
    > `pipeline-versioning.md` ("Model"). Same branch, same pipeline, so the version is
    > unchanged.

    Delete the second sentence `Same branch, same pipeline, so the version is unchanged.`,
    leaving the bare imperative:
    > Re-assert (confirm, do not change) the existing `v<N>` version label per
    > `pipeline-versioning.md` ("Model").

    Leave the `("Model")` citation as-is.
- **Depends on:** none. (Independent of tasks 2 and 6 in the same file — different text
  spans.)
- **Traces to:** Requirement 8 / Acceptance criterion 8.
- **Acceptance:** The "review reuses the branch/pipeline, no new pipeline, version unchanged"
  assertion appears once across the opener (line 3) and step 6. Step 6 ends on
  "…per `pipeline-versioning.md` ("Model")." with no second sentence. The opener's framing
  ("never creates a new pipeline") and line 29's two overrides are preserved verbatim.

### Task 9 — changeset: reword the body to differentiate it from the README

- **Goal:** Edit only the changeset **body** so it no longer shares the run-model sentence
  near-verbatim with `README.md:157`; keep front matter byte-identical and the body
  non-empty so the Changeset Gate stays green. Do **not** touch `README.md`.
- **Files:** `.changeset/pipeline-reviews.md`
- **Changes:** One body replacement (Decision 9). The front matter and the `---` fences stay
  byte-identical:
  ```
  ---
  "@automattic/radical-pipelines": minor
  ---
  ```
  Replace the current body paragraph:
  > Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by
  > re-running the phases as an additional run on the same branch. Every pipeline now carries
  > a `base/` run from creation (the original run, never rewritten), and each review adds a
  > sibling `review-N-<short-description>/` run, so phase folders live under a run folder
  > instead of directly under the pipeline folder.

  with this **verbatim** body:
  > Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by
  > re-running the phases as an additional run on the same branch. Phase folders now live
  > under run folders: the original run is recorded as `base/` at pipeline creation and is
  > never rewritten, and each review adds a sibling `review-N-<short-description>/` run.
- **Depends on:** none.
- **Traces to:** Requirement 9 / Acceptance criterion 9 / Decision 9.
- **Acceptance:** `README.md:157` is unchanged (byte-identical). The changeset front matter
  is byte-identical (`"@automattic/radical-pipelines": minor`, `---` fences). The body is
  the differentiated wording above and is non-empty. The README sentence ("Every pipeline
  carries a `base/` run from creation — the original run, never rewritten — and each review
  adds a sibling `review-N-<short-description>/` run on the same branch.") and the changeset
  body no longer match as near-duplicate sentences (different subject/verb/structure; the
  only residual shared clause "each review adds a sibling `review-N-<short-description>/` run"
  is forced by the folder-name syntax and sits below the near-verbatim-sentence bar).

### Task 10 — Verify: three-layer manual check + Changeset Gate

- **Goal:** Confirm all nine edits landed correctly, no meaning was lost, no new violation
  was introduced, the untouchable patterns are byte-identical, and CI stays green. This is
  the design's three-layer verification (there is no automated prose oracle).
- **Files:** none edited; this is a read/verify + commit task.
- **Changes:** Run the three layers, in order:
  1. **Per-site checks (one per acceptance criterion 1–9).** For each task 1–9, re-open the
     edited file and confirm: (a) the flagged fact now appears exactly once, or the flagged
     sentence is gone; (b) the surviving wording matches the decision's exact wording above.
     Concretely:
     - Task 1: `fork-pipeline.md` — step-4 sentence reads the new "fresh … seeded only from"
       wording; the step-5 second sentence and the line-43 parenthetical are gone; the
       `cp -r` instructions are intact.
     - Task 2: `review-pipeline.md` — heading is "### 2. Advisories"; the
       "Both advisories are recommendations only…" sentence is gone; step-1 sentence intact.
     - Task 3: `pipeline-versioning.md` — lineage sentence intact with its `because…`;
       tree-building step ends "…from its `base/` run."; rendering sentence 1 intact, old
       sentence 2 gone.
     - Task 4: `pipeline-versioning.md` — "A pipeline with no reviews shows no run chain." is
       gone.
     - Task 5: `work-on-an-issue.md` — "sharpest discriminator" bullet gone; three
       definitions + lead-in intact.
     - Task 6: both base-ref steps read exactly the bare-reference wording; canonical rule at
       `pipeline-versioning.md:21–28` intact and complete.
     - Task 7: `pipeline-versioning.md` — "The rows are unchanged; only their root is the run
       folder." is gone.
     - Task 8: `review-pipeline.md` — step 6 ends on the `("Model")` citation, no second
       sentence; opener and line-29 overrides intact.
     - Task 9: changeset body is the differentiated wording, front matter byte-identical,
       body non-empty.
  2. **Cross-cutting re-read (meaning preservation + no new violations).** Re-read the full
     PR #106 prose and confirm every fact in the spec's requirement-10 enumeration is still
     reachable (stated once or via an in-path reference): fork inherits only `base/` (1);
     advisories never gate (2); reviews not tree nodes (3); review-less run-chain derivable
     (4); resume/review/fork distinction (5); base-ref value/timing/hold-constant at the
     canonical rule, reachable from both citing steps (6); per-phase predicate location (7);
     review reuses branch / version unchanged (8); run model in both README and changelog
     (9). Confirm no new duplication / negative-phrasing / non-minimal wording was added.
     Confirm the untouchable patterns are **byte-identical**: `README.md` (esp. line 157),
     `4 - code.md` and `5 - docs.md` base-ref parentheticals, `intent-format.md`, and the
     canonical `pipeline-versioning.md:21–28` rule. Run a repo-wide check that the deleted
     sentences are truly gone and not reintroduced elsewhere, e.g.:
     - `git -C <worktree> diff --stat` — confirm only the six files above changed, README and
       the two phase files are NOT in the list.
     - `grep -rn "shows no run chain" skills/ README.md` — expect no hits.
     - `grep -rn "The rows are unchanged" skills/` — expect no hits.
     - `grep -rn "sharpest discriminator" skills/` — expect no hits.
     - `grep -rn "never unilaterally redirects" skills/` — expect no hits.
     - `grep -rn "reviews are not nodes" skills/` — expect no hits.
     - `grep -rn "the prior-run tip, per the" skills/` — expect no hits (old base-ref
       wording).
  3. **CI (Changeset Gate).** Confirm the gate stays green. Run `npm ci` then `npm test`
     (which runs `validate-changesets` and `changeset status`). Expect green:
     `scripts/test/**` is untouched and the changeset front matter is byte-identical and the
     body non-empty, so neither `scripts/validate-changesets.mjs` (front-matter shape only)
     nor `changeset status` (front matter only) can break on the body reword.
- **Depends on:** tasks 1–9 (all edits must land first).
- **Traces to:** Requirements 10, 11, 12, 13 / Acceptance criteria 10, 11 / design
  "Failure Modes and Observability".
- **Acceptance:** All per-site checks pass (each flagged fact once or the flagged sentence
  gone, surviving wording matches the decisions). The cross-cutting re-read finds no lost
  fact and no new violation; the untouchable patterns are byte-identical. The Changeset Gate
  CI passes. The change is committed to PR #106's existing branch with no new changeset
  added.

---

## Notes on sequencing and delivery

- **Batch per file.** `review-pipeline.md` (tasks 2, 6, 8) and `pipeline-versioning.md`
  (tasks 3, 4, 7) each take three independent edits. Batching the per-file edits and
  anchoring on quoted text avoids line-number drift. The edits within each file do not
  overlap, so any order is safe; do not re-read line numbers between sibling edits — match
  the quoted anchors.
- **Verbatim wording.** Every replacement string in tasks 1–9 is the design doc's decided
  wording. Apply it exactly; do not re-paraphrase. The compliance bar is judgment-based with
  no linter, so the exact wordings are the contract.
- **Delivery.** All edits land on PR #106's existing branch (a review reuses the branch — no
  new pipeline, branch, or changeset). The single existing `.changeset/pipeline-reviews.md`
  satisfies the per-PR Changeset Gate; do not add a new changeset.
- **Commit format** for this artifact: imperative mood, sentence case, no trailing period,
  agent name in parentheses — e.g. `Add code plan (code-plan-writer)`.
