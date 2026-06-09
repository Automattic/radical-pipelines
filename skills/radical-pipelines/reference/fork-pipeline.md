# Forking a Pipeline

Creates a new pipeline for an issue by forking from a parent pipeline at a chosen phase.

## Steps

### 1. Identify the parent pipeline and inherited phase

Show the owner the pipeline tree for this issue, reconstructed per `pipeline-versioning.md` ("Reconstructing the pipeline tree"), so they can see existing pipelines and their parent/sibling relationships.

Then ask:

- **Parent pipeline**: which existing pipeline to inherit from.
- **Inherited phase**: the highest-numbered phase to inherit, by folder name (`0-prompt`, `1-spec`, `2-design-doc`, `3-plan`, `4-code`, `5-docs`). The new pipeline continues from the next phase or revises the inherited phase. Pick `0-prompt` to start the new pipeline over from scratch — only the prompt is inherited. The inherited phase must be **complete** in the parent (per the **Per-phase completion** rules in `pipeline-versioning.md`); an in-progress phase cannot be inherited.

If the owner has already specified any of them, skip the question.

### 2. Compute the new version and pipeline versioned slug

List the existing pipelines for this issue per `pipeline-versioning.md` ("Listing pipelines for an issue"). Find the highest existing `v<N>` among them; treat the first pipeline as `v1`. The new pipeline version is `v<N+1>`.

The **pipeline versioned slug** is the **pipeline base slug** (the first pipeline's slug) with `-v<N+1>` appended, per `pipeline-versioning.md` ("Model").

### 3. Create the worktree and branch from the main branch

Create and enter the worktree for the pipeline versioned slug per the **Worktrees** convention; the branch is derived from it per the **Branch names** convention. Create the branch from the project's main branch.

Always branch from the main branch — never from the parent pipeline's tip. The new pipeline must start with a clean working tree.

All work happens inside the new worktree.

### 4. Create the artifact folder

Create the new pipeline's artifact folder per the **Artifact folder** convention applied to the pipeline versioned slug. The fork's phases live under its own `base/` run, seeded from the parent's `base/` run in the next step (see **Runs within a pipeline** in `pipeline-versioning.md`); a fork starts a fresh `base/` and never inherits the parent's reviews.

### 5. Seed the inherited phase folders from the parent

Copy only the phase folders being inherited, from the parent's `base/` run into the new pipeline's `base/` run — `base/0-prompt` up to and including the inherited phase agreed in step 1. Only `base/` is copied; the parent's `review-*` runs (if any) are never inherited.

Determine the parent pipeline's worktree path per the **Worktrees** convention applied to the parent's versioned slug.

- **If the worktree exists**, copy directly: for every phase folder `0-prompt`, `1-spec`, … in the parent's `base/` run up to and including the inherited phase, `cp -r <parent-worktree>/<parent-artifact-folder>/base/<phase> <artifacts-folder>/base/<phase>`.
- **If the worktree does not exist**, create a temporary worktree of the parent branch per the **Worktrees** convention, copy as above (from the parent's `base/` run), then remove it.

### 6. Commit

Commit the seeded phase folders per the **Commit format** convention.

### 7. Continue normal phase work

The new pipeline is now a regular pipeline. Continue from the phase that follows the inherited phase, or revise the inherited phase, using the assisted or autonomous workflow as chosen by the owner. Work continues in the fork's `base/` run.
