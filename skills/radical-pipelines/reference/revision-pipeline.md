# Revising a Pipeline

Starts a revision of a complete, unmerged pipeline: a new run branch layered on the latest run, driven by a fresh revision intent and taken through phases 1–4.

## Steps

### 1. Confirm the preconditions

Re-verify BOTH gates here, independently of any menu — the direct "revise this pipeline" route bypasses `work-on-an-issue.md`:

- **(a) Complete.** The pipeline's latest run is complete through `4-document`, with the **Per-phase completion** predicate evaluated within the latest run (`pipeline-versioning.md`). If it is not, steer the owner to **resume** (`resume-pipeline.md`) to finish the run, or to **fork** (`fork-pipeline.md`) to try a different approach.
- **(b) Unmerged.** The pipeline is unmerged, per the merged detection in `pipeline-versioning.md` ("Lineage"). If it is merged, the requested change is new work: handle it as a NEW issue via `manage-issues.md`, not a revision.

These two are the ONLY preconditions. The advisories below never gate a revision the owner chooses.

### 2. Advisories

- **Fork vs. revision.** If the change is drastic — it would not layer cleanly onto the existing implementation, reworks the architecture, invalidates most existing code, or is "redo this differently" — you MAY recommend a fork via `fork-pipeline.md` instead. An accepted fork diverts to `fork-pipeline.md` entirely; the rest of this procedure does not run.
- **Split.** If several apparently unrelated changes surface at once, you MAY suggest splitting them into separate sequential revisions — one per change.

Confirm the final revision count and boundaries with the owner BEFORE creating anything. Revisions run strictly sequentially.

### 3. Create the revision run branch and worktree

Determine the run name `rev-<N>-<desc>` per the branch grammar (`pipeline-versioning.md`). Create the revision run branch at the previous run branch's tip, and its worktree per the **Worktree root** convention.

### 4. Create the run folder and author the revision intent

Create the run folder `<pipeline-family-folder>/rev-<N>-<desc>/` with its `0-intent/` subfolder in the worktree. Author the revision intent at `rev-<N>-<desc>/0-intent/intent.md` the same way the base intent is orchestrator-authored (the `create-pipeline.md` intent step), following the schema and authoring discipline in `intent-format.md`. Beyond that shared schema, a revision intent carries these revision-only additions:

- An **Origin** section, MANDATORY for revisions and unique to them — its provenance (per `intent-format.md`). It is **self-contained**: it carries the substance of the request (a direct quote or faithful paraphrase of what prompted the revision) PLUS a convenience link, so a later phase reading only this revision intent understands what prompted it without following the link.
- Any source assets are placed in this run's `0-intent/` folder and referenced by relative path, the same as base intents.

Show the owner the rendered revision intent and write it only on explicit approval — every revision intent is confirmed before the run starts, however directly the owner dictated it. Then commit it per the **Commit format** convention.

### 5. Re-assert the version

Confirm the existing `v<N>` version: a revision leaves `pipeline.md` unchanged.

### 6. Return to mode dispatch

Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch the chosen workflow for phases 1–4, which run in this revision run's folder on its branch. A revision is a normal run: every per-run obligation the project's conventions define fires afresh for it.
