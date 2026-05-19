# Starting a Pipeline

Sets up a pipeline through phase 0 — identifies the issue, checks for existing pipelines for it, creates the worktree and artifacts folder, writes `prompt.md`, and commits.

Before executing these steps, make sure you have loaded and verified the project conventions (see `conventions/load.md`).

## Steps

### 1. Identify the issue

Find the issue that this pipeline will work on using the project's **Issues** convention.

### 2. Check for existing pipeline

Before continuing, check whether one or more pipelines already exist for this issue.

Use the **Pipeline slug** convention to derive a name pattern that matches all slugs referring to this issue, then locate matching pipelines in two places.

1. **Branches** (local and remote) that match the **Branch names** convention and whose slug refers to this issue.
2. **Subfolders** of the **Pipeline artifact folder** location on the main branch of the artifact-bearing repository (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode — per the **Artifact storage** convention) whose name refers to this issue.

If you find any matches, report all of them to the owner with enough detail to identify each: pipeline slug, branch, and state (in-progress vs. merged into main).

Then ask the owner how to proceed:

- **Resume** an in-progress pipeline — re-enter the existing worktree and continue where the previous run stopped (see `resume-pipeline.md`).
- **Start a new attempt** — choose a versioned slug (see `multiple-attempts.md`).
- **Cancel** — stop the workflow.

If the owner does not explicitly choose, stop the workflow.

### 3. Determine the pipeline slug

Generate the pipeline slug following the **Pipeline slug** convention. If the owner chose **Start a new attempt** in step 2, derive the versioned slug per `multiple-attempts.md`.

### 4. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

All work happens inside the worktree — never modify files in the main working directory.

### 5. Create the pipeline artifacts folder

Create the folder following the **Pipeline artifact folder** convention.

### 6. Generate the initial prompt

Create the phase 0 subfolder (`0-prompt/`, per the Phases table in `SKILL.md`) inside the pipeline artifact folder. Write the prompt to `<artifacts-folder>/0-prompt/prompt.md`.

- Adapt the issue content as a prompt directed at the agents that will run subsequent phases.
- Do not add requirements, technical directions, or implementation details — agents do their own research in later phases.
- If the issue has screenshots or other assets, download them (using the access mechanism captured by the **Issues** convention) and place them in `<artifacts-folder>/0-prompt/`. Reference them explicitly in `prompt.md` using relative paths.
- The phase 0 subfolder must be self-contained — once committed, agents must not need to reach back to the issue source to understand the issue.

### 7. Commit

Commit the newly created artifacts following the **Commit** convention.
