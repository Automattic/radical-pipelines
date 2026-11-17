# Close-out

The run stops: the frontier is `complete`, an owner escalation is pending, the owner cancelled, or something failed.

1. Cancel health monitoring (`../conventions/health-monitoring.md`); terminate every role of the run.
2. Make sure every commit, certifications included, is on the pipeline branch and pushed; remove lane worktrees and branches.
3. Fire `run-ended` with the cause.
4. Complete through the target phase: tell the owner the pipeline is ready for the closure actions below.
5. Any other cause: report to the owner what stopped the run, the frontier as `rp check` shows it, and — for an escalation — the dossier (`loop.md` § Owner escalation). Leave the tree exactly as it is; a later triage continues from it.
6. Report to the owner: pipeline, branch, pull requests, phases completed (`rp check --json`'s `complete`), constraints satisfied, proposals and reported failures adopted or refuted, and pending escalations.

## Closure actions

Closure actions are moments the owner invokes on a pipeline: opening its pull request, merging it, closing without merging. Each fires its `before-`/`after-` hooks where the project defines them; beyond the steps below, the work lives in the hooks or with the owner. A pipeline may have several pull requests over its life.

### Open the pull request

1. Fire `before-opening-pr`.
2. Open it, writing its title and description per the **PR format** convention. Compose the description from the intent, the spec, the design doc, `notes.md`, and the approving review threads: what shipped, why, and how, and the limitations and out-of-scope observations the approvals list.
   - `artifacts-in-repo`: push the pipeline branch and open the pull request from it onto the artifact base branch with your own tools.
   - `artifacts-in-fork`: perform the upstream PR transformation below.
3. Fire `after-opening-pr` and report the outcome.

When the pull request already exists, update its description the same way.

#### The upstream PR transformation

Consult the **Artifact storage** convention for the remotes and the upstream branch and commit formats, then:

1. Generate a clean branch name for `upstream` from the upstream branch format — separate from the fork branch — and create the branch at `upstream`'s main branch.
2. Apply the net change (`state.md` § Terms) to the clean branch and commit in the upstream format. When it does not apply cleanly, bring the artifact base branch up to date with `upstream`'s main branch, wake the implementer, mode respond, to merge the base branch into the pipeline branch, run the loop until the frontier is `complete`, and start again from step 1.
3. Push the clean branch directly to `upstream`.
4. Open the pull request in `upstream` from that clean branch. Its source branch lives in `upstream`, not in the fork — viewers of the pull request never see the fork.

### Merge the pull request

1. Fire `before-merging-pr`.
2. Merge it with your own tools.
3. Fire `after-merging-pr` and report the outcome.

When the owner reports the pull request merged, continue at step 3.

### Close without merging

Fire `before-closing-without-merge`, then `after-closing-without-merge`, and report the outcome. The pipeline's branches and artifacts remain.
