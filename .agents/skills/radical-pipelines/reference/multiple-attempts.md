# Multiple Attempts

Creates a new attempt of an existing pipeline by forking from a parent attempt at a chosen phase.

Read `pipeline-versioning.md` first for the model.

Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`).

## Steps

### 1. Identify the parent attempt and inherited phase

Ask the owner:

- **Parent attempt**: which existing attempt to inherit from.
- **Inherited phase**: the highest-numbered phase to inherit, by folder name (`0-prompt`, `1-spec`, `2-design-doc`, `3-code-plan`, `4-doc-plan`, etc.). The new attempt continues from the next phase or revises the inherited phase.

If the owner has already specified both, skip the question.

### 2. Compute the new attempt id

List existing branches matching the pipeline slug prefix per the **Branch names** convention. Find the highest existing `v<N>` segment among them; treat the first attempt as `v1`. The new attempt id is `v<N+1>`.

### 3. Create the worktree and branch from the main branch

Create the branch from the project's main branch per the **Branch names** convention, with `/v<N>` appended to the first attempt's branch name. Then create and enter the worktree per the **Worktrees** convention.

Always branch from the main branch — never from the parent attempt's tip. The new attempt must start with a clean working tree.

All work happens inside the new worktree.

### 4. Create the artifact folder

Create `.pipelines/<pipeline-slug>/v<N>/` per the **Artifact folder** convention.

### 5. Copy inherited phase folders from the parent

For every phase folder `0-prompt`, `1-spec`, … up to and including the inherited phase, copy the folder from the parent attempt's artifact folder into the new attempt's artifact folder.

Read the parent's files from the parent branch without switching worktrees:

```
git show <parent-branch>:<parent-artifact-folder>/<phase>/<file>
```

If the parent worktree is checked out at a known path, copy directly. Either way, copy only up to and including the inherited phase — do not bring later phases.

### 6. Write `attempt.yml`

Create `.pipelines/<pipeline-slug>/v<N>/attempt.yml` with exactly:

```yaml
forked_from:
  attempt: <parent-branch-name>
  phase: <inherited-phase>
```

This file is immutable. Do not edit it again.

### 7. Commit

Commit the copied phase folders and `attempt.yml` per the **Commit format** convention.

### 8. Continue normal phase work

The new attempt is now a regular pipeline. Continue from the phase that follows the inherited phase, or revise the inherited phase, using the assisted or autonomous workflow as chosen by the owner.
