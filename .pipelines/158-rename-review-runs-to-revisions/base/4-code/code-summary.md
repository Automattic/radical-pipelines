# Code Summary: Rename "review runs" to "revisions"

## What

The Radical Pipelines skill's follow-up run and the activity that creates it are renamed from "review"/"reviewing" to the noun **revision** and verb **revise**. Concretely, across `skills/`, `agents/`, and `.rp.md`:

- Follow-up runs are named `revision-N-<short-description>` (was `review-N-<short-description>`); `base` is unchanged.
- The run-creation command document is renamed `review-pipeline.md` → `revision-pipeline.md` (history-preserving) and retitled "Revising a Pipeline"; its direct route reads `"revise this pipeline"`.
- The dispatcher menu label and same-issue advisory read "Revise"; the intent type is the "revision intent" (its **Origin** section name kept); the base-ref heading is "Revision base ref" and the convention term is "Revision run" ("Base run" unchanged).
- The orchestrator-update prose and action-list verb in `.rp.md` read "revision run"/"revision's intent"/"revising".

The change is a closed set of 39 line-edits across 8 files plus one `git`-tracked file rename. The phase-auditing meaning of "review" (reviewer agent names, `*-review-approved.md`, `*-review-N-rejected.md`, the reviewing prose, `# … Review` headings, generic owner-review-of-artifacts) and the 32 generic-English `revise`/`revision` uses are left byte-unchanged.

## Why

The word "review" was overloaded: it named both these follow-up runs and the unrelated phase-auditing concepts. The sharpest collision was a run number (`review-2`) versus a rejection-iteration number (`spec-review-2-rejected.md`), where the same digit meant two different things. Renaming the run-creation activity to "revision"/"revise" frees "review" to denote phase-auditing only.

## How

Per-file precision edits over the design's authoritative bucket-A rename map — never a blanket `sed`, because several lines mix rename and keep tokens (within `pipeline-versioning.md` and `.rp.md`, and on the same line at `revision-pipeline.md:39` and the two per-phase base-ref lines `4 - code.md:37` / `5 - docs.md:37`). The command file was renamed history-preservingly (git detects the rename at 30% similarity; `git log --follow` traces back through the original file). The base-ref heading definition (`pipeline-versioning.md:21`) and all four inbound references were updated in lockstep so none dangles. Verification is a re-grep, not committed tests: the project treats the skill as prose, where committed structural tests asserting file content are disallowed. The six re-grep E2E flows in `code-plan.md` were run at author-time (Tasks 1, 10) and re-driven independently at review.

## Key decisions

- **Rename the activity and its command, not only the run folders.** A folder-only rename would leave the run-creation activity still called "review", so "review" would stay overloaded. (Rejected alternative: change `review-N` → `revision-N` and stop.)
- **No migration of legacy `review-N` folders and no dual-recognition.** The two run-folder globs flip to `revision-*` only. (Rejected alternative: add transitional `review-* OR revision-*` recognition — forbidden as a migration leftover; the spec accepts the documented mis-count consequence for pre-existing legacy pipelines.)
- **Always write "revision run" / `revision-N`, never a bare "revision" for the run.** Keeps the run sense distinct from the pre-existing generic-English "revise"/"revision".
- **Within-line precision: keep "a PR review" on `revision-pipeline.md:39`.** It names a generic owner-review-of-artifacts source, not a pipeline run.

## Known limitations

- **Legacy run mis-count (out of scope, owner-accepted).** A pre-existing pipeline whose runs are legacy `review-N`, if later resumed or revised, would be mis-counted / mis-identified because the skill no longer recognizes the legacy names. No dual-recognition is added; existing on-disk `review-N-*` folders under `.pipelines/` are left as historical artifacts.

The batch was approved on the first review iteration; no rejected iterations preceded it.
