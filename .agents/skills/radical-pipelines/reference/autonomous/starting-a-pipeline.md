# Starting a Pipeline (Autonomous Workflow)

This is the entry point of the **autonomous workflow**. Before executing these steps, make sure you have loaded and verified the project conventions (see `SKILL.md` → "Project conventions"). If any required convention is missing, stop and run the setup flow in `../setup-project-conventions.md` before continuing. Each step below applies one of those conventions.

When you greet the owner at the start of the session, say explicitly that you are starting the autonomous workflow so the owner knows what to expect.

## Steps

### 1. Identify the task

Find the task that this pipeline will work on using the project's **Tasks** convention.

### 2. Check for existing work

Before creating any worktree, artifacts, or commits, check whether the task already has associated implementation work using the project's **Tasks** convention.

If associated work exists, warn the owner and pause for explicit confirmation before continuing. Include enough detail for the owner to identify the existing work, such as title, state, URL, and owner when available.

If the owner does not explicitly confirm, stop the workflow.

### 3. Plan the autonomous run

Read `planning-the-pipeline.md` and run that workflow to gather the autonomous run plan with the owner. Do not create the worktree, artifacts, or commits before the plan is confirmed.

### 4. Determine the pipeline slug

Generate the pipeline slug following the **Pipeline slugs** convention.

### 5. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

From this point on, all work happens inside the worktree — never modify files in the main working directory.

### 6. Create the pipeline artifacts folder

Create the folder following the **Pipeline artifact folders** convention.

### 7. Generate the initial prompt

Write the phase-0 prompt to `<artifacts-folder>/prompt.md`. Adapt the task content as a prompt directed at the agents that will run subsequent phases — describe what to do, not how.

### 8. Commit

Commit the artifacts folder following the **Commits** convention.

### 9. Continue or stop

If the plan's target phase is phase 0, stop here. The autonomous run ends with the prompt artifact ready for review.

If the plan extends to phase 1, read `running-the-spec-phase.md` and run that workflow with the per-phase decisions collected in step 3.
