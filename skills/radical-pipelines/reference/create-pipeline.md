# Creating a Pipeline

Creates a new pipeline through phase 0 — sets up the worktree and artifacts folder, writes `prompt.md`, and commits.

## Steps

### 1. Determine the pipeline base slug

Generate the pipeline base slug following the **Pipeline base slug** convention. For `v1` this is also the pipeline's versioned slug.

### 2. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

All work happens inside the worktree — never modify files in the main working directory.

### 3. Create the artifact folder

Create the folder following the **Artifact folder** convention.

### 4. Generate the initial prompt

Create the phase 0 subfolder (`0-prompt/`) inside the artifact folder. Write the prompt to `<artifacts-folder>/0-prompt/prompt.md`.

- Adapt the issue content as a prompt directed at the agents that will run subsequent phases.
- Do not add requirements, technical directions, or implementation details — agents do their own research in later phases.
- If the issue has screenshots or other assets, download them (using the access mechanism captured by the **Issues** convention) and place them in `<artifacts-folder>/0-prompt/`. Reference them explicitly in `prompt.md` using relative paths.
- The phase 0 subfolder must be self-contained — once committed, agents must not need to reach back to the issue source to understand the issue.

### 5. Commit

Commit the newly created artifacts following the **Commit format** convention.
