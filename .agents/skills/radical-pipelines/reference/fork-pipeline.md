# Forking a Pipeline

Creates a new pipeline for an issue by forking from a parent pipeline at a chosen phase.

Read `pipeline-versioning.md` first for the model.

Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`).

## Steps

### 1. Identify the parent pipeline and inherited phase

Show the owner the pipeline tree for this issue, reconstructed per `pipeline-versioning.md` ("Reconstructing the pipeline tree"), so they can see existing pipelines and their parent/sibling relationships.

Then ask:

- **Parent pipeline**: which existing pipeline to inherit from.
- **Inherited phase**: the highest-numbered phase to inherit, by folder name (`0-prompt`, `1-spec`, `2-design-doc`, `3-code-plan`, `4-doc-plan`, etc.). The new pipeline continues from the next phase or revises the inherited phase. Pick `0-prompt` to start the new pipeline over from scratch — only the prompt is inherited.

If the owner has already specified any of them, skip the question.

### 2. Compute the new pipeline version

List the existing pipelines for this issue per `pipeline-versioning.md` ("Listing pipelines for an issue"). Find the highest existing `v<N>` among them; treat the first pipeline as `v1`. The new pipeline version is `v<N+1>`.

### 3. Create the worktree and branch from the main branch

Create the branch from the project's main branch per the **Branch names** convention, with `/v<N>` appended to the first pipeline's branch name. Then create and enter the worktree per the **Worktrees** convention.

Always branch from the main branch — never from the parent pipeline's tip. The new pipeline must start with a clean working tree.

All work happens inside the new worktree.

### 4. Create the artifact folder

Create the new pipeline's artifact folder per the **Artifact folder** convention applied to the slug, with `v<N>/` appended.

### 5. Copy inherited phase folders from the parent

Determine the parent pipeline's worktree path per the **Worktrees** convention applied to the parent's slug and version.

- **If the worktree exists**, copy directly: for every phase folder `0-prompt`, `1-spec`, … up to and including the inherited phase, `cp -r <parent-worktree>/<parent-artifact-folder>/<phase> <artifacts-folder>/<phase>`.
- **If the worktree does not exist**, create a temporary worktree of the parent branch per the **Worktrees** convention, copy as above, then remove it.

Copy only up to and including the inherited phase — do not bring later phases.

### 6. Write `pipeline.yml`

Create `<artifacts-folder>/pipeline.yml` with exactly:

```yaml
forked_from:
  pipeline: <parent-branch-name>
  phase: <inherited-phase>
```

This file is immutable. Do not edit it again.

### 7. Commit

Commit the copied phase folders and `pipeline.yml` per the **Commit format** convention.

### 8. Continue normal phase work

The new pipeline is now a regular pipeline. Continue from the phase that follows the inherited phase, or revise the inherited phase, using the assisted or autonomous workflow as chosen by the owner.
