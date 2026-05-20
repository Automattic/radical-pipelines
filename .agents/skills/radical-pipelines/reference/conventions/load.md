# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions are stored in the project-root `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention               | What it covers                                                 | Pass down to agents? | Required? |
| ------------------------ | -------------------------------------------------------------- | -------------------- | --------- |
| Pipeline slug            | How to uniquely identify pipelines                             | Yes                  | Yes       |
| Pipeline artifact folder | Where to store the pipeline artifacts                          | Yes                  | Yes       |
| Commit format            | How to write commits                                           | Yes                  | No        |
| Issues                   | Where to find the project issues and how to create/modify them | No                   | Yes       |
| Worktrees                | How to set up and manage worktrees for each pipeline           | No                   | Yes       |
| Branch names             | How to name branches for each pipeline                         | No                   | Yes       |
| Team spawning            | How to define and launch teams of agents                       | No                   | No        |

## Missing conventions

If all required conventions are available, continue the workflow unchanged.

If one or more required conventions are missing, do not proceed with the pipeline. Read `reference/setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Passing conventions down to agents

You are responsible for loading and verifying project conventions. The agents you spawn should not repeat the full convention-discovery flow or, worse, try to guess conventions by looking at the project files.

When spawning an agent, clearly include the following project conventions properties in the initial prompt.
