# Load Conventions

Project-specific conventions are stored in the `.rp.md` file.

## Conventions

| Convention             | What it covers                                                                             | Required? |
| ---------------------- | ------------------------------------------------------------------------------------------ | --------- |
| Branch name base       | Produces the `<branch-base>`: deterministic from the issue, a valid git ref, no `_`        | Yes       |
| Pipeline family folder | Produces the family's single folder: deterministic from the issue                          | Yes       |
| Issues                 | Where the project tracks issues and how to read, comment on, and update them               | Yes       |
| Worktree root          | Where worktrees live                                                                       | Yes       |
| Commit format          | How to write commits                                                                       | No        |
| Team spawning          | How to spawn and address agents, and how to seat each agent in its worktree                | Yes       |
| Agent models           | Which model/settings each spawned agent runs on                                            | No        |
| Health monitoring      | How to launch and cancel the recurring run-health loop                                     | Yes       |
| Guardrails             | The deterministic verification gates — exact commands judged pass/fail by exit code        | No        |
| Artifact storage       | Whether `.rp.md` and the pipeline family folder live in the project's repository or a fork | Yes       |

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited. Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.
