# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention         | What it covers                                                                      | Required? |
| ------------------ | ----------------------------------------------------------------------------------- | --------- |
| Pipeline base slug | How to uniquely identify pipelines                                                  | Yes       |
| Artifact folder    | Where to store the pipeline artifacts                                               | Yes       |
| Commit format      | How to write commits                                                                | No        |
| Issues             | Where to find the project issues and how to create/modify them                      | Yes       |
| Worktrees          | How to set up and manage worktrees for each pipeline                                | Yes       |
| Branch names       | How to name branches for each pipeline                                              | Yes       |
| Team spawning      | How to define and launch teams of agents                                            | No        |
| Agent models       | Which model/settings each spawned agent runs on                                     | No        |
| Health monitoring  | How to launch and cancel the recurring run-health loop                              | Yes       |
| Guardrails         | The deterministic verification gates — exact commands judged pass/fail by exit code | No        |

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited. Guardrails is shared and committed-only; it is never taken from `.rp.local.md`. A gate may be plan-completed for some of its agents (captured at setup); for those agents that gate's command is supplied per pipeline by the `code-plan-writer` in `code-plan.md` and resolved by the orchestrator before spawn, so it is plan data. The mark and the gate's full command are committed `.rp.md`; the feature command lives in `code-plan.md`, never in `.rp.md`, and like the rest of Guardrails is never taken from `.rp.local.md`.
