# Close-out

The run stops: the target phase is complete, an owner escalation is pending, the valve fired, the owner cancelled, or something failed.

1. Cancel health monitoring (`../conventions/health-monitoring.md`); terminate every agent of the run.
2. Make sure every commit and stamp is on the pipeline branch and pushed; remove lane worktrees and branches.
3. Fire `run-ended` with the cause.
4. Complete through the target phase:
   - The branch has no pull request: open one onto the base branch per the **PR format** — `artifacts-in-fork`: the upstream PR transformation below — firing `before-opening-pr` and `after-opening-pr`. It has one: update its description. Compose the description from the plan, its tasks and reports, and the approving phase review — what shipped, why, how, and what the review left non-blocking. A pipeline may have several pull requests over its life.
   - Comment on the issue through the **Issues** convention: the pull request, and the phase reached.
5. Any other cause: report to the owner what stopped the run, the frontier as `rp check` shows it, and — for an escalation or the valve — the dossier (`loop.md` § Owner escalation, § The valve). Leave the tree exactly as it is; a later triage continues from it.
6. Report to the owner: pipeline, branch, pull request, phases completed, amendments absorbed, pending claims.

## The upstream PR transformation

Consult the **Artifact storage** convention for the remotes and the upstream branch and commit formats, then:

1. Generate a clean branch name for `upstream` from the upstream branch format — separate from the fork branch — and create the branch at `upstream`'s main branch.
2. Cherry-pick, oldest first, every commit outside the pipelines folder reachable from the pipeline branch but not from `upstream`'s main branch.
3. Rewrite the cherry-picked commit messages to the upstream commit format.
4. Push the clean branch directly to `upstream`.
5. Open the PR in `upstream` from that clean branch. The PR's source branch lives in `upstream`, not in the fork — viewers of the PR never see the fork.

## Merge

When the owner asks you to merge a pipeline's pull request: fire `before-merging-pr`, merge it, fire `after-merging-pr`.
