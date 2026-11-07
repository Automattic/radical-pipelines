# Cold read of the loop from the plans alone

A subagent on `claude-agent/sonnet#xhigh`, read-only, read `reference/run/loop.md`, `state.md`, `lifecycle-hooks.md`, `tools/opencode.md`, `tools/claude-code.md`, `scripts/README.md` § `next` and § `land`, `SKILL.md`, and `loop-run.txt` (as of 6bde7beb). It wrote, for every plan, the tool calls, hook firings, and `rp` commands an orchestrator takes on opencode and on Claude Code, for a project whose hooks install dependencies after creating a worktree, stop its environments before removing it, reset staging before spawning an agent that receives `staging`, and delete an agent's environment after terminating it.

Every tool call took its worktree, instance name, profile, model name, and message from the plan; every hook took its role, worktree path, resources, or phase from the plan. No step of planning, applying, waking, or landing needed a Git command, a computed path, or a read of a thread or assignment.

## Findings this change owned, and what changed

| Finding | Change |
| --- | --- |
| The merging hooks follow a wake in the plan, while `loop.md` fires them around the landing | `scripts/README.md` § Plan: they fire around the role's landing, once its turn ends (36498bad) |
| The plan names spawning hooks for every woken role, while `loop.md` fires them only around a spawn | `scripts/README.md` § Plan: they fire only when the orchestrator spawns the role (36498bad) |
| Step 7 never holds after a landing that stopped on a rejected file | Step 7: once every role ended its turn and each without a blocker was run through `rp land` (36498bad) |
| A re-run of `--apply` prints only what remains, so which `after-` hooks fire was open | The `after-` hooks of the plan it first printed (36498bad) |
| "In a step you run no Git command" also covered repairing a stop or a blocker, and "only paths `rp` printed" excluded the pipeline folder | The rule covers planning, applying, waking, and landing, and admits the pipeline folder (36498bad) |
| No spawn condition for a role without an instance | "when the role has none or it is gone" (36498bad) |
| The transcript hid the applied plans | `loop-run.sh` shows each (037d1b17) |

## Findings outside this change

The tools' own mechanics — how a model name resolves on opencode, where `$OPENCODE_SESSION_ID` comes from, Claude Code's `subagent_type` namespace and `cd` target, a `subagent` `description`, finding running roles after compaction on Claude Code — and the turn-end rule (a finished report without the completion sentence, failed turns) read the same before this change: they are in `tools/*.md` and in `loop.md`'s unchanged turn-end sentence. Hook texts naming variables, the issue a `phase-completed` hook updates, and a hook's phase on termination and removal lines are what the orchestrator knew before: the pipeline, the run, and the step's phase.
