# Work on an Issue

The owner wants to advance pipeline work for a specific issue. Identify the issue, check for existing pipelines or create a new one and dispatch to autonomous or assisted mode.

Read `pipeline-versioning.md` first for the model — listing existing pipelines in step 2 depends on it.

Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`).

## Steps

### 1. Identify the issue

If the owner has named or linked the issue, use that. Otherwise, ask which issue the owner wants to work on.

Use the **Issues** convention to verify the issue exists and capture its content.

### 2. Check for existing pipelines

For the identified issue, list any pipelines that already exist by following the steps in `pipeline-versioning.md` ("Listing pipelines for an issue"). Then reconstruct the pipeline tree per `pipeline-versioning.md` ("Reconstructing the pipeline tree").

For each match capture, per the **Per-phase completion** rules in `pipeline-versioning.md`:

- The branch (local/remote/both)
- State (in progress, complete and unmerged, or merged into main)
- The **completed phase** (the highest-numbered phase whose completion predicate is satisfied)
- The **active phase**, if any (the next phase has artifacts on disk but its predicate is not yet met)
- The **next phase to run** (the active phase if there is one; otherwise the phase after the completed phase)

**If matches exist**, surface them to the owner with the tree and per-pipeline metadata, and ask how to proceed:

- **Resume** an in-progress pipeline → read `resume-pipeline.md`, then continue to step 3.
- **Fork a new pipeline** → read `fork-pipeline.md` to create a new pipeline from an existing one, then continue to step 3.
- If the pipeline's completed phase is the last phase (phase 5) and there is no active phase, also offer:
  - **Merge** read `merge-pipeline.md`.
  - **Review** read `review-pipeline.md`.
  - **Close** read `close-pipeline.md`.

If the owner has already specified what to do, skip the question.

**If no matches exist**, create the pipeline per `create-pipeline.md`, and continue to step 3.

### 3. Pick the workflow mode

Ask the owner which mode this run uses:

- **Autonomous** — agents drive each phase end-to-end without further questions until the target phase is reached.
- **Assisted** — orchestrator drives a single phase directly with the owner, typically through Q&A. No agents are spawned.

If the owner has already specified the mode, skip the question.

### 4. Dispatch

| Mode       | Read                     |
| ---------- | ------------------------ |
| Autonomous | `autonomous-workflow.md` |
| Assisted   | `assisted-workflow.md`   |

Continue with the chosen workflow.
