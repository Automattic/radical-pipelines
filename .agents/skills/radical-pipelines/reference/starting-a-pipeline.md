# Starting a Pipeline

Before executing these steps, make sure you have loaded and verified the project conventions (see `SKILL.md` → "Project conventions"). If any required convention is missing, stop and run the setup flow in `reference/setup-project-conventions.md` before continuing. Each step below applies one of those conventions.

## Steps

### 1. Identify the task

Find the task that this pipeline will work on using the project's **Tasks** convention.

### 2. Determine the pipeline slug

Generate the pipeline slug following the **Pipeline slugs** convention.

### 3. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

From this point on, all work happens inside the worktree — never modify files in the main working directory.

### 4. Create the pipeline artifacts folder

Create the folder following the **Pipeline artifact folders** convention.

### 5. Generate the initial prompt

Write the phase-0 prompt to `<artifacts-folder>/prompt.md`. Adapt the task content as a prompt directed at the agents that will run subsequent phases — describe what to do, not how.

### 6. Commit

Commit the artifacts folder following the **Commits** convention.
