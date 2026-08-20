# Closure Actions

Closure actions are moments the owner invokes on a pipeline: opening its PR, merging its PR, closing it without merging. Each fires its `before-`/`after-` lifecycle hooks where the project defines them; beyond the steps below, the work lives in the hooks or with the owner.

## Open the PR

1. Fire `before-opening-pr`.
2. Open the PR from the pipeline's latest run branch onto the project's main branch:
   - `artifacts-in-repo`: push the run branch and open the PR with your own tools.
   - `artifacts-in-fork`: perform the upstream PR transformation below.
3. Fire `after-opening-pr` and report the outcome.

### The upstream PR transformation

Consult the **Artifact storage** convention for the remotes and the upstream branch and commit formats, then:

1. Generate a clean branch name for `upstream` from the upstream branch format — separate from the fork branch.
2. Cherry-pick only the code commits from the pipeline's latest run branch — artifact commits are excluded.
3. Rewrite the cherry-picked commit messages to the upstream commit format.
4. Push the clean branch directly to `upstream`.
5. Open the PR in `upstream` from that clean branch. The PR's source branch lives in `upstream`, not in the fork — viewers of the PR never see the fork.

## Merge the PR

The merge itself happens outside the skill.

- When the owner announces the merge is about to happen, fire `before-merging-pr`.
- When the owner reports the PR merged, fire `after-merging-pr` and report the outcome.

## Close without merging

Fire `before-closing-without-merge`, then `after-closing-without-merge`, and report the outcome. The pipeline's branches and artifacts remain.
