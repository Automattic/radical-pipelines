# Work on an Issue

The owner wants to advance pipeline work for a specific issue. Identify the issue, check for existing pipelines or create a new one and dispatch to autonomous or assisted mode.

Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`).

## Steps

### 1. Identify the issue

If the owner has named or linked the issue, use that. Otherwise, ask which issue the owner wants to work on.

Use the **Issues** convention to verify the issue exists and capture its content.

### 2. Check for existing pipelines

For the identified issue, locate any pipelines that already exist:

1. **Derive a slug pattern** using the **Pipeline slug** convention that matches every slug referring to this issue.
2. **Search branches** — local and remote — that match the **Branch names** convention and whose slug refers to this issue.
3. **Search artifact folders** in the **Pipeline artifact folder** location on the main branch of the artifact-bearing repository (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode, per the **Artifact storage** convention).
4. For each match, capture the slug, branch (local/remote/both), state (in-progress or merged into main), and highest committed phase (the highest-numbered phase subfolder present, per the Phases table in `SKILL.md`).

**If matches exist**, surface them to the owner with all four properties and ask how to proceed:

- **Resume** an in-progress pipeline → read `resume-pipeline.md`, then continue to step 3.
- **Start a new attempt** → read `multiple-attempts.md` to create a new pipeline, then continue to step 3.
- If the pipeline is in the latest phase, also offer:
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
