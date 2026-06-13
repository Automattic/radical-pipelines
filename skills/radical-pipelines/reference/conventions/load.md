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
| Guardrails         | The deterministic verification gates — exact commands judged pass/fail by exit code                                 | No        |

## Guardrails

A guardrail is an exact command, judged pass/fail solely by its exit code (0 = pass, any non-zero = fail), and mandatory for every gate-running agent that selects it. "Run the tests" is not a guardrail; `npm test` is. A guardrail may optionally name one or more gate-running agents; a guardrail that names no agents runs for every gate-running agent. This is a load-level fact: whether no Agents column exists or an Agents cell is blank, the result is the same — all agents.

An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning.

The gate-running agents are `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, and `doc-reviewer`; this enumeration is load-bearing — adding a future gate-running agent updates it. Each agent selects the guardrails that name it plus the guardrails that name no agents. Phase plays no part in this selection. An empty selection means run none and proceed. A guardrail naming only agents outside this set is selected by no current agent and is inert until such an agent exists; this causes no error, blocker, or warning.

A **writer-type** agent produces commits — it runs every gate in its selection exactly as each command is written, all passing before each commit. A **reviewer-type** agent issues verdicts — it runs its judgment-based checks first, may fail-fast (rejecting without running not-yet-run gates of its selection, recording each as skipped), and approves only when every gate in its selection has run and passed in that same iteration, each instance fresh and stateless. An agent is writer-type if it commits work and reviewer-type if it reviews it.

## Missing conventions

If all required conventions are available, continue to the `## Local overrides` step below.

If one or more required conventions are missing, do not proceed with the pipeline. Read `setup.md`, explain what is missing, and offer to run the setup flow.

If the owner declines setup, cancels, or leaves required answers unresolved, stop and clearly explain what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy.

When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there, since the git-ignored file is never copied into the worktree.

After the committed conventions pass the required-completeness check, merge the local file over them in memory: where it names a convention its value wins, where it is silent the committed value is inherited. Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.
