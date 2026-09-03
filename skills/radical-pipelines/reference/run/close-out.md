# Close-out

The run stops: the target phase is complete, an owner escalation is pending, the valve fired, the owner cancelled, or something failed.

1. Cancel health monitoring (`../conventions/health-monitoring.md`); terminate every agent of the run.
2. Make sure every commit and stamp is on the pipeline branch and pushed; remove lane worktrees and branches.
3. Fire `run-ended` with the cause.
4. Complete through the target phase:
   - Open the pull request from the pipeline branch onto the project's main branch — or, for a post-merge amendment, from the amendment branch — per the **PR format**, firing `before-opening-pr` and `after-opening-pr`. A pipeline may have several pull requests over its life.
   - Comment on the issue through the **Issues** convention: the pull request, and the phase reached.
5. Any other cause: report to the owner what stopped the run, the frontier as `rp check` shows it, and — for an escalation or the valve — the dossier (`loop.md` § Owner escalation, § The valve). Leave the tree exactly as it is; a later triage continues from it.
6. Report to the owner: pipeline, branch, pull request, phases completed, amendments absorbed, pending claims.

When the owner asks you to merge the pull request: fire `before-merging-pr`, merge per the project's **PR format**, fire `after-merging-pr`.
