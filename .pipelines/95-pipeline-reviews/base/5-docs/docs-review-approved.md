# Docs Review: APPROVED

**Reviewer:** doc-reviewer
**Batch:** ALL of `doc-plan.md` — D1, D2, D3, D4 (D4 undertaken, not skipped)
**Diff reviewed:** `6d808e6..HEAD` (4 doc-writer commits)
**Verdict:** APPROVED

## Commits reviewed

- `94bf218` Document the review entry point in README (D1)
- `7885fb7` Document the run-folder artifact layout in README (D2)
- `f111936` Add changeset for the reviews feature (D3)
- `b43bd38` Refresh website demo tree to the run-folder layout (D4)

Diffstat: `.changeset/pipeline-reviews.md` (+5), `README.md` (2 lines changed),
`website/index.html` (3 lines changed). Small, surgical, on-altitude.

## Per-task acceptance

### D1 — Review as the third same-issue action in README entry points — PASS

- The "Work on an issue" entry-point bullet now names **review** as a peer of
  **resume** and **fork**, with a one-clause description and a pointer to
  `reference/review-pipeline.md` (the parenthetical style matches resume/fork).
- The review clause states it layers an incremental change by re-running the
  phases as an additional run on the **same branch and worktree, building on the
  existing code**, and that it applies to a **complete, unmerged** pipeline.
- Cross-checked accurate against shipped behavior:
  - "complete, unmerged" matches `review-pipeline.md` step 1 gates (a) complete
    through phase 5 and (b) unmerged, and `work-on-an-issue.md` lines 32–35
    (Review offered only when completed phase is phase 5 with no active phase).
  - "same branch / additional run / building on existing code" matches
    `review-pipeline.md` line 3 and step 3 (re-attach, never a new branch).
  - Fork reworded to "onto a fresh branch from main" — matches the RESUME /
    REVIEW / FORK decision rule in `work-on-an-issue.md` lines 36–40.
- resume and fork descriptions remain accurate, not duplicated or contradicted;
  the three read as parallel peers. No procedure-level detail (no step lists, no
  run-folder internals) copied into the README. `reference/review-pipeline.md`
  resolves on disk.

### D2 — Run-folder (`base/` + `review-N`) artifact layout in README — PASS

- The Configuration paragraph now states phase folders do **not** sit directly
  under the pipeline folder but under a **run** folder; names `base/` as the
  always-present original run "never rewritten," and `review-N-<short-description>/`
  as the per-review sibling on the same branch; points to
  `reference/pipeline-versioning.md` for the run model.
- The existing per-phase-completion / review-filename sentence is preserved and
  remains accurate; it gains "within a run folder," matching
  `pipeline-versioning.md` line 51 (predicate evaluated at
  `<artifacts-folder>/<run>/<phase>`). No restatement of the run-model prose —
  it points to the reference. Stays at README altitude.
- No flat-layout / legacy / migration wording introduced (R5 respected) —
  grepped the README, none present.

### D3 — Changeset for the reviews feature — PASS

- Exactly one changeset added in the batch: `.changeset/pipeline-reviews.md`
  (the other `.changeset/*.md` files are pre-existing). Front matter names
  `"@automattic/radical-pipelines"` with a `minor` bump.
- `minor` is correct per `CONTRIBUTING.md#bump-types` (feature = minor) and the
  pre-1.0 policy (feature = minor). No `BREAKING:` prefix, no `major` bump.
- Summary is an imperative one-line description of the reviews feature (re-run
  the phases as an additional run on the same branch; `base/` + `review-N`).
- Validator and tests pass (see Checks).

### D4 — Website demo tree refreshed to the run layout (undertaken) — PASS

- All three path-bearing example trees in `website/index.html` updated to the
  `base/`-prefixed form: the hero `ls` card (line 118), the hero `git log` line
  (line 126), and the live-tree card title (line 221). No example now shows
  phase files directly under `.pipelines/<slug>/` in a way that contradicts the
  run layer.
- Cosmetic only — no behavior claims added, no reviews-specific marketing copy.
- No changeset added for the website-only change (correct: `website/**` is not
  in `.changeset/config.json` `changedFilePatterns`).
- `website/demo.js` was correctly left untouched: its only `.pipelines/` ref is a
  worktree path (`.pipelines/worktrees/issue-1234`, not a phase-artifact tree),
  and its phase reads/writes are bare filenames with no `<slug>/` path prefix —
  so they neither show nor contradict the run layer.

## Scope check — PASS

- No out-of-scope docs: no consolidation/cleanup docs, no legacy-flat-layout or
  migration wording (R5). README stays at its altitude; no procedure-level
  detail copied in. Website edit is cosmetic with no changeset.
- The skill reference-file edits (code, already approved) were not re-reviewed.

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Node version | `node --version` | v20.20.1 |
| Cited reference paths resolve | `ls reference/{review-pipeline,pipeline-versioning,work-on-an-issue}.md` | All present |
| Changeset validator (staged) | `git add .changeset/pipeline-reviews.md && node scripts/validate-changesets.mjs` | EXIT 0 |
| Tooling regression | `node --test scripts/test/*.test.mjs` | 22 pass / 0 fail |
| Single changeset in batch | `git diff --name-only --diff-filter=A 6d808e6..HEAD -- '.changeset/*'` | only `pipeline-reviews.md` |
| No website changeset | grep website diff for "changeset" | none |
| No flat/legacy/migration in README | grep README | none |

All doc-batch acceptance criteria met, content accurate against shipped
behavior, scope respected, gates green. Approved.
