# Starting a Pipeline

Before executing these steps, make sure you have loaded the project conventions (see `SKILL.md` → "Project conventions"). Each step below applies one of those conventions.

## Steps

### 1. Identify the task

Find the task that this pipeline will work on using the project's **Tasks** convention.

### 2. Check for existing work

Before creating any worktree, artifacts, or commits, check whether the task already has associated implementation work using the project's **Tasks** convention.

If associated work exists, warn the owner and pause for explicit confirmation before continuing. Include enough detail for the owner to identify the existing work, such as title, state, URL, and owner when available.

If the owner does not explicitly confirm, stop the workflow.

### 3. Determine the pipeline slug

Generate the pipeline slug following the **Pipeline slugs** convention.

### 4. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

From this point on, all work happens inside the worktree — never modify files in the main working directory.

### 5. Create the pipeline artifacts folder

Create the folder following the **Pipeline artifact folders** convention.

### 6. Generate the initial prompt

Write the phase-0 prompt to `<artifacts-folder>/prompt.md`. Adapt the task content as a prompt directed at the agents that will run subsequent phases — describe what to do, not how.

### 7. Commit

Commit the artifacts folder following the **Commits** convention.
