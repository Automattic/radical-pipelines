# Claude Code

## Spawn and address

Spawn each agent as a teammate with the profile, a run-unique instance name, the filled prompt, and the selected model.

Name each instance `<profile> <slug>-<n>` (`<slug>-<lane>-<n>` in a lane), `<n>` counting that profile's instances in the pipeline. The spawn result's `agentId` is the address for messages; a researcher's prompt carries its requester's address under **Requester**.

## Seating

A spawn or message starts the teammate in the sender's current shell directory. Before every send — spawn or message — `cd` into the teammate's worktree; send; then `cd` back. A directory change inside the teammate does not persist to its next turn.

Never use `EnterWorktree` or `ExitWorktree` during a run: they switch the whole session and retarget every teammate. The **Worktree folder root** must be inside the repository; `.worktrees/` qualifies.

## Termination

On the agent's completion declaration, send a shutdown request to its identifier and continue without waiting for exit.

## Health loop

Launch the bundled loop with `/loop <interval> <tick prompt>`, appending each agent's worktree path and the seating rule: a message restarts its target in the sender's shell working directory, so `cd` into an agent's worktree before messaging or restarting it, then `cd` back. List loops with `CronList`; cancel one with `CronDelete` and its task ID.

## Models

The `model` of each profile or lane comes from the project's `Agents` convention; a name it uses that is not a model is defined in `.rp.md`'s `## Claude Code` section. Pass aliases or provider-qualified IDs verbatim when spawning.
