# Forking a Pipeline

Creates a new pipeline version by branching at a **cut commit** in a parent pipeline's history. Inherited history carries the inherited work itself — artifacts, code, and commits.

## Steps

### 1. Identify the parent pipeline and inherited phase

Show the owner the pipeline tree for this issue, rendered per `pipeline-versioning.md` ("Rendering the pipeline tree"). Then ask:

- **Parent pipeline** — which existing pipeline to fork from.
- **Inherited point** — the run to cut in (default: the parent's latest run) and the highest phase to inherit within it, by folder name (`0-intent`, `1-spec`, `2-design-doc`, `3-build`, `4-document`). Pick `base`'s `0-intent` to start the new pipeline over with only the intent. The inherited phase must be **complete** in that run (per **Per-phase completion** in `pipeline-versioning.md`).

If the owner has already specified either, skip the question.

### 2. Locate the cut commit

The cut commit is the commit that completed the inherited phase's completion predicate. On the branch of the run containing the cut, find the commit that added each of the phase's required artifacts in that run's phase folder (`git log --diff-filter=A -1 <parent-run-branch> -- <pipeline-family-folder>/<run>/<phase>/<file>`); the newest of those commits is the cut commit.

### 3. Compute the new version

Find the highest existing `v<N>` in the family per `pipeline-versioning.md` ("Listing pipelines for an issue"). The new pipeline version is `v<N+1>`.

### 4. Create the branch and worktree

Create the fork's first run branch at the cut commit, and its worktree per the **Worktree root** convention. The branch carries the cut run's segment: `<branch-base>_v<N+1>` for a cut in `base`, `<branch-base>_v<N+1>_rev-<K>-<desc>` for a cut in a revision run. Fire `branch-created` and `worktree-created`.

### 5. Continue as a normal pipeline

The fork continues from the phase after the inherited phase, or re-runs the inherited phase to change it, in the run containing the cut. Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch.
