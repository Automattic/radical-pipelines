# Load Conventions

This skill is generic, but each project has its own conventions that you must follow.

Project-specific conventions and guardrails are stored in the `.rp.md` file. Read it at the start of any workflow.

This information is necessary to execute the pipelines correctly, so you must load and verify it before starting any workflow.

## Conventions

| Convention         | What it covers                                                 | Required? |
| ------------------ | -------------------------------------------------------------- | --------- |
| Pipeline base slug | How to uniquely identify pipelines                             | Yes       |
| Artifact folder    | Where to store the pipeline artifacts                          | Yes       |
| Commit format      | How to write commits                                           | No        |
| Issues             | Where to find the project issues and how to create/modify them | Yes       |
| Worktrees          | How to set up and manage worktrees for each pipeline           | Yes       |
| Branch names       | How to name branches for each pipeline                         | Yes       |
| Team spawning      | How to define and launch teams of agents                       | No        |
| Agent models       | Which model/settings each spawned agent runs on                | No        |
| Health monitoring  | How to launch and cancel the recurring run-health loop         | Yes       |

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Guardrails

A guardrail is a mandatory verification gate defined as an exact command whose pass/fail is judged solely by its exit code: exit 0 = pass, any non-zero exit = fail. "Run the tests" is not a guardrail; `npm test` is.

Guardrails live in `.rp.md`'s `## Guardrails` section, a sibling of `## Conventions`, as a table with columns **Name | Command | Phases**. The only valid Phases values are `code` and/or `docs`; a guardrail may apply to one or both.

Guardrails are tool-agnostic: the same guardrails apply regardless of the active agentic coding tool, and there are no per-tool guardrail variants.

To load the guardrails for a phase, read `.rp.md`'s `## Guardrails` table and select the guardrails applicable to the [code|docs] phase — the rows whose Phases column includes the current phase.

Guardrails are optional. An absent `## Guardrails` section, or a present-but-empty one, both mean "this project has no command gates." This is a valid, complete state — never a blocker. Selecting the guardrails applicable to a phase when none apply yields the empty set: the agent runs none and proceeds, whether the section is absent or simply has no matching rows.

Guardrails are committed-only and not locally overridable: the `.rp.local.md` local-override mechanism (the `## Local overrides` section below) applies to conventions only, so a developer cannot weaken or null out a mandatory gate in their working copy.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited.
