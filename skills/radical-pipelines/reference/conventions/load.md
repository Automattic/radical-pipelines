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
| Health monitoring | How to launch and cancel the recurring run-health loop         | Yes       |

## Missing conventions

If all required conventions are available, continue the workflow unchanged.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.
