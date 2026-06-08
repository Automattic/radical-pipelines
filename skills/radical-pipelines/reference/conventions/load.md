# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention        | What it covers                                                 | Required? |
| ----------------- | -------------------------------------------------------------- | --------- |
| Pipeline base slug | How to uniquely identify pipelines                            | Yes       |
| Artifact folder   | Where to store the pipeline artifacts                          | Yes       |
| Commit format     | How to write commits                                           | No        |
| Issues            | Where to find the project issues and how to create/modify them | Yes       |
| Worktrees         | How to set up and manage worktrees for each pipeline           | Yes       |
| Branch names      | How to name branches for each pipeline                         | Yes       |
| Team spawning     | How to define and launch teams of agents                       | No        |
| Agent models      | Which model/settings each spawned agent runs on                | No        |
| Health monitoring | How to launch and cancel the recurring run-health loop         | Yes       |

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

This completeness decision is final. The local-override step that follows runs only on the PASS branch, operates on an already-valid base of committed conventions, and can never make a required convention read as missing or re-open the completeness decision.

## Local overrides

This step fires only on the required-completeness PASS branch above. Override resolution runs strictly after the committed conventions have passed the required-completeness check, never before or during it.

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy. To resolve it — locate the project main root, probe for `.rp.local.md` there, merge each named unit over the committed conventions, and emit the batched summary — read `local-overrides.md` and follow it. That file holds the full procedure; the merge mechanism is not restated here.
