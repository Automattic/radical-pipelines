# Close-out

The run stops: the target phase is complete, an owner escalation is pending, the valve fired, the owner cancelled, or something failed.

1. Cancel health monitoring (`../conventions/health-monitoring.md`); terminate every agent of the run.
2. Make sure every commit and stamp is on the pipeline branch and pushed; remove lane worktrees and branches.
3. Fire `run-ended` with the cause.
4. Complete through the target phase: comment on the issue through the **Issues** convention with the phase reached, and tell the owner the pipeline is ready for the closure actions below.
5. Any other cause: report to the owner what stopped the run, the frontier as `rp check` shows it, and — for an escalation or the valve — the dossier (`loop.md` § Owner escalation, § The valve). Leave the tree exactly as it is; a later triage continues from it.
6. Report to the owner: pipeline, branch, pull requests, phases completed, amendments absorbed, pending claims.

## Closure actions

Closure actions are moments the owner invokes on a pipeline: opening its pull request, merging it, closing without merging. Each fires its `before-`/`after-` hooks where the project defines them; beyond the steps below, the work lives in the hooks or with the owner. A pipeline may have several pull requests over its life.

### Open the pull request

1. Fire `before-opening-pr`.
2. Open it from the pipeline branch onto the artifact base branch, writing its title and description per the **PR format** convention. Compose the description from the plan, its tasks and reports, and the approving phase review — what shipped, why, how, and what the review left non-blocking.
   - `artifacts-in-repo`: push the pipeline branch and open the pull request with your own tools.
   - `artifacts-in-fork`: perform the upstream PR transformation below.
3. Fire `after-opening-pr` and report the outcome.

When the pull request already exists, update its description the same way.

#### The upstream PR transformation

Consult the **Artifact storage** convention for the remotes and the upstream branch and commit formats, then:

1. Generate a clean branch name for `upstream` from the upstream branch format — separate from the fork branch — and create the branch at `upstream`'s main branch.
2. Cherry-pick, oldest first, every commit outside the pipelines folder reachable from the pipeline branch but not from `upstream`'s main branch.
3. Rewrite the cherry-picked commit messages to the upstream commit format.
4. Push the clean branch directly to `upstream`.
5. Open the pull request in `upstream` from that clean branch. Its source branch lives in `upstream`, not in the fork — viewers of the pull request never see the fork.

### Merge the pull request

1. Fire `before-merging-pr`.
2. Merge it with your own tools.
3. Fire `after-merging-pr` and report the outcome.

When the owner merged it themselves and reports it, fire `after-merging-pr` and report the outcome.

### Close without merging

Fire `before-closing-without-merge`, then `after-closing-without-merge`, and report the outcome. The pipeline's branch and artifacts remain.
