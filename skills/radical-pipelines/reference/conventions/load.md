# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention        | What it covers                                                                       | Required? |
| ----------------- | ------------------------------------------------------------------------------------ | --------- |
| Branch names      | Produces the `<branch-base>`: deterministic from the issue, a valid git ref, no `_`  | Yes       |
| Artifact folder   | Produces the family's single artifact folder: deterministic from the issue           | Yes       |
| Issues            | Where the project tracks issues and how to read, comment on, and update them         | Yes       |
| Worktrees         | Where worktrees live                                                                 | Yes       |
| Commit format     | How to write commits                                                                 | No        |
| Team spawning     | How to spawn and address agents                                                      | No        |
| Agent models      | Which model/settings each spawned agent runs on                                      | No        |
| Health monitoring | How to launch and cancel the recurring run-health loop                               | Yes       |
| Guardrails        | The deterministic verification gates — exact commands judged pass/fail by exit code  | No        |
| Artifact storage  | Whether `.rp.md` and the artifact folder live in the project's repository or a fork  | Yes       |

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited. Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.
