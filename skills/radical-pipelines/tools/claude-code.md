# Claude Code

The plugin ships each profile as an agent type. After compaction, Claude Code re-attaches the first 5,000 tokens of this skill.

## Spawn

Call `Agent` with `subagent_type` set to the plugin's `<profile>` agent, `name` `<pipeline slug> <profile>[ <lane>]`, `model`, the filled prompt, and `run_in_background: true`. The returned agent ID is the role's address.

## Seating

A role starts in your current shell directory. Before every spawn or message, `cd` into the role's worktree; send; then `cd` back. Seat roles only this way: `EnterWorktree` and `ExitWorktree` move your whole session, and `isolation: worktree` creates a new worktree. The **Worktree folder root** must be inside the repository; `.worktrees/` qualifies.

## Wake

Call `SendMessage` with the role's agent ID and the message. A finished role resumes in the background with its history; a running role receives it mid-task.

## Turn end

When a role finishes, you receive its completion notification carrying its final reply, which is its report. A notification that names an error is a failure.

## Termination

A finished role needs none. Stop a running role with `TaskStop` and its agent ID.

## Health ticks

- Start them with `/loop <interval> <tick prompt>`. List them with `CronList`; cancel one with `CronDelete` and its task ID. A task expires after seven days: recreate it when a run outlives it.
- A role's permission prompt reaches the owner in your session. A role with one pending is blocked, not stalled.

## Models

The `model` of each profile or lane comes from the project's `Agents` convention. Pass an alias (`opus`, `sonnet`, `haiku`, `fable`) as `model`; a name that is not an alias is mapped to one in `.rp.md`'s `## Claude Code` section. Fill the **Subagent model** with an alias too: a role passes it as `model` when it calls `Agent`.

## Unverified

The seating procedure is verified for teammates, not for background subagents: whether `SendMessage` resumes a finished subagent in the sender's current directory or in its first one, and whether a background subagent keeps the `Agent` tool to delegate.
