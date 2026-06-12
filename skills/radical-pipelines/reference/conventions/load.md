# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention         | What it covers                                                                                                      | Required? |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- |
| Pipeline base slug | How to uniquely identify pipelines                                                                                  | Yes       |
| Artifact folder    | Where to store the pipeline artifacts                                                                               | Yes       |
| Commit format      | How to write commits                                                                                                | No        |
| Issues             | Where to find the project issues and how to create/modify them                                                      | Yes       |
| Worktrees          | How to set up and manage worktrees for each pipeline                                                                | Yes       |
| Branch names       | How to name branches for each pipeline                                                                              | Yes       |
| Team spawning      | How to define and launch teams of agents                                                                            | No        |
| Agent models       | Which model/settings each spawned agent runs on                                                                     | No        |
| Health monitoring  | How to launch and cancel the recurring run-health loop                                                              | Yes       |
| Guardrails         | The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass | No        |

## Guardrails

A guardrail is an exact command, judged pass/fail solely by its exit code (0 = pass, any non-zero = fail), mandatory within the phase(s) it applies to. "Run the tests" is not a guardrail; `npm test` is. The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both. A guardrail may also carry an optional level — `writer` or `reviewer` — naming which code-phase role runs it; a guardrail with no level applies to both roles.

An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning.

To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase. Within the code phase, apply a second filter: the writer selects gates leveled `writer` or unscoped; the reviewer selects gates leveled `reviewer` or unscoped. The docs-phase selection never consults level; a both-phase gate carrying a level still runs for both doc agents. An empty selection after these filters means run none and proceed.

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited. Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.
