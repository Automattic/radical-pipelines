# Starting a Pipeline

Sets up a pipeline through phase 0 — identifies the task, creates the worktree and artifacts folder, writes `prompt.md`, and commits. Both the autonomous workflow and the assisted workflow use this as their entry point or fallback.

Before executing these steps, make sure you have loaded and verified the project conventions (see `SKILL.md` → "Project conventions"), including the repository ownership and persistence policy. If the active CLI is Pi, also verify the required phase agent definitions by checking repository-local `.pi/agents/` first and user-local/global `~/.pi/agent/agents/` second. If any required convention is missing, unsafe for the current repository ownership mode, or missing a required Pi agent definition, stop and run the setup flow in `setup-project-conventions.md` before continuing. Each step below applies one of those conventions.

## Steps

### 1. Apply the stored repository ownership convention

Repository ownership is collected once during setup and stored in the **Repository ownership and persistence** convention. Do not ask it again during pipeline startup unless the convention is missing, incomplete, or contradicted by the current checkout:

- If this is an owned repository, continue with the configured in-repository or external artifact policy.
- If this is a not-owned repository, verify the current worktree/branch was created in the configured fork. If not, stop and switch to the configured fork workflow before creating artifacts or launching agents.
- If ownership, fork policy, or artifact persistence is unclear, stop and run setup. Do not create `.pipelines`, `.pi`, `.claude`, `.gitignore`, agent config files, or other personal automation files in the host repository while unclear.

### 2. Identify the task

Find the task that this pipeline will work on using the project's **Tasks** convention.

### 3. Check for existing work

Before creating any worktree, artifacts, or commits, check whether the task already has associated implementation work using the project's **Tasks** convention.

If associated work exists, warn the owner and pause for explicit confirmation before continuing. Include enough detail for the owner to identify the existing work, such as title, state, URL, and owner when available.

If the owner does not explicitly confirm, stop the workflow.

### 4. Determine the pipeline slug

Generate the pipeline slug following the **Pipeline slugs** convention.

### 5. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

From this point on, all work happens inside the worktree — never modify files in the main working directory.

### 6. Create the pipeline artifacts folder

Create the folder following the **Pipeline artifact folders** convention and repository ownership policy. For not-owned repositories, use the stored artifact location from setup. If that convention is missing or would place personal Radical Pipelines state in the upstream project repository, stop and run setup before writing files.

### 7. Generate the initial prompt

Write the phase-0 prompt to `<artifacts-folder>/prompt.md`. Adapt the task content as a prompt directed at the agents that will run subsequent phases — describe what to do, not how.

### 8. Commit or persist safely

Follow the **Commits** convention:

- In owned repositories, commit the artifacts folder when the project convention says pipeline artifacts are tracked.
- In not-owned repositories, commits are allowed once work is happening in the configured fork worktree. Pull-request publication is outside phase 0 and belongs to the open PR phase.
- Before any commit, inspect the staged diff and remove unrelated Radical Pipelines, Pi, Claude, agent, or personal configuration files.
