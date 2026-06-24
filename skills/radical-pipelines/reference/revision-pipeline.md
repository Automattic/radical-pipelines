# Revising a Pipeline

Starts a revision of a complete, unmerged pipeline: adds a new revision run on top of the latest run and takes it through phases 1–5 with a fresh revision intent. A revision reuses the existing branch and worktree — it never creates a new pipeline.

## Steps

### 1. Confirm revision preconditions

Re-verify BOTH hard gates here, independently of any menu — the direct "revise this pipeline" route bypasses `work-on-an-issue.md`:

- **(a) Complete.** The pipeline's latest run is complete through phase 5, with the **Per-phase completion** predicate evaluated within the latest run (per `pipeline-versioning.md`). If it is not complete, do not start a revision: steer the owner to **resume** (`resume-pipeline.md`) to finish the run, or to **fork** (`fork-pipeline.md`) to try a different approach.
- **(b) Unmerged.** The pipeline is not merged into main (per the merged-state determination in `pipeline-versioning.md`, "Listing pipelines for an issue" / the `[merged]` annotation). If it is merged, the requested change is new work: handle it as a NEW issue via `manage-issues.md`, not a revision.

These two are the ONLY preconditions. The fork-vs-revision and split advisories (next step) never gate a revision the owner chooses.

### 2. Advisories

- **Fork vs. revision.** If the change is drastic — it would not layer cleanly onto the existing implementation, reworks the architecture, invalidates most existing code, or is "redo this differently" — the orchestrator MAY recommend a fork via `fork-pipeline.md` instead. An accepted fork diverts to `fork-pipeline.md` entirely; the rest of this procedure does not run.
- **Split.** If several apparently unrelated changes surface at once, the orchestrator MAY suggest splitting them into separate sequential revisions — one per change.

Confirm the final revision count and boundaries with the owner BEFORE creating any run folder. Revisions run strictly sequentially.

### 3. Re-attach to the branch and worktree, and capture the base ref

Re-attach using resume's two named sections, in order: "Cancel any leftover health monitor" and "Re-attach to the branch and worktree" (`resume-pipeline.md`).

Do NOT perform resume's rollback step — the latest run is already complete, so there is nothing to roll back — and NEVER create a new branch.

Capture the run's base ref per the **Revision base ref** rule in `pipeline-versioning.md`.

### 4. Determine and create the run folder

Determine the run name `revision-N-<short-description>` per the **Runs within a pipeline** rule in `pipeline-versioning.md`, and create that run folder as a sibling of `base/`.

### 5. Author and commit the revision intent

Author the revision intent at `revision-N-<short-description>/0-intent/intent.md` the same way the base intent is orchestrator-authored (the `create-pipeline.md` step-4 pattern), following the schema and authoring discipline in `intent-format.md`. Beyond that shared schema, a revision intent carries these revision-only additions:

- An **Origin** section, MANDATORY for revisions and unique to them — issue and base intents have none. It is **self-contained**: it carries the substance of the request (a direct quote or faithful paraphrase of the owner's change, a PR comment, a PR review, etc) PLUS a convenience link, so a later phase reading only this revision intent understands what prompted it without following the link.
- Any source assets (e.g. images from the source) are placed in this revision run's `0-intent/` folder and referenced relatively, the same as issue and base intents.

The original issue and `base/0-intent` are never rewritten. Then commit the revision intent per the **Commit format** convention.

### 6. Re-assert the version

Re-assert (confirm, do not change) the existing `v<N>` version label per `pipeline-versioning.md` ("Model").

### 7. Return to mode dispatch, and apply run obligations

Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch the chosen workflow for phases 1–5. The revision intent is phase 0 and is mode-independent; phases run in this revision run's folder.

An assisted revision advances only through phase 3, so an assisted-only revision is itself incomplete and cannot satisfy the completeness precondition (step 1a) for a later revision until it is finished autonomously through phases 4–5.

A revision is a normal run: apply every orchestrator-update obligation the project's conventions define for a run, fired afresh for this revision run — run-start and run-end actions for every outcome, with any per-phase or per-run progress restarted to reflect this revision's phases rather than continuing the prior run's. The revision operates on the pipeline's existing tracker issue and creates no new one. If the project runs a health monitor, an autonomous revision follows the normal monitor lifecycle (cancel any leftover monitor, launch a fresh one) pointed at this revision run's folder, with the pipeline slug unchanged; an assisted revision launches no monitor.

---

Return to `work-on-an-issue.md`.
