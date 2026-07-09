# Work on an Issue

The owner wants to advance pipeline work for a specific issue. Identify the issue, check for existing pipelines or create a new one, and dispatch to autonomous or assisted mode.

## Rules

- Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`).
- Read `pipeline-versioning.md` to understand how pipelines are versioned and managed.
- If the owner ever wants to create or modify an issue while working on an issue, make sure to read `manage-issues.md` first.

## Steps

### 1. Identify the issue

If the owner has named or linked the issue, use that. Otherwise, ask which issue the owner wants to work on.

Use the **Issues** convention to verify the issue exists and capture its content.

If the issue declares dependencies on other issues, check them through the **Issues** convention. Surface any that are not closed and let the owner explicitly choose to proceed or wait. An issue with no declared dependencies, or whose dependencies the tracker cannot report, proceeds without comment.

### 2. Check for existing pipelines

List the issue's pipelines per `pipeline-versioning.md` ("Listing pipelines for an issue") and render the tree per `pipeline-versioning.md` ("Rendering the pipeline tree").

**If pipelines exist**, show the owner the tree and ask how to proceed:

- **Resume** an in-progress pipeline → read `resume-pipeline.md`, then continue to step 3.
- **Revise** a pipeline whose latest run is complete → read `revision-pipeline.md`, then continue to step 3.
- **Fork** a new pipeline version from an existing one → read `fork-pipeline.md`, then continue to step 3.

When the owner is unsure which same-issue action to take:

- **Resume** — finish an incomplete latest run.
- **Revise** — layer a new run branch on a complete run, building on the existing work.
- **Fork** — a new pipeline version branched at a cut commit, to try a different approach.

If the owner has already specified what to do, skip the question.

**If no pipelines exist**, create the pipeline per `create-pipeline.md`, and continue to step 3.

### 3. Pick the workflow mode

Ask the owner which mode this run uses:

- **Autonomous** — teams of agents run phases end-to-end.
- **Assisted** — the orchestrator drives a single phase directly with the owner.

If the owner has already specified the mode, skip the question.

### 4. Dispatch

| Mode       | Read                     |
| ---------- | ------------------------ |
| Autonomous | `autonomous-workflow.md` |
| Assisted   | `assisted-workflow.md`   |

Continue with the chosen workflow.
