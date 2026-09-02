# Claude Code

## Spawn and address

Spawn each agent as a teammate with the profile, a run-unique instance name, the filled prompt, and the selected model.

The teammate's identifier is its agent ID. Put it in the prompt template's **Your agent ID** slot and use it for messages. A researcher's prompt carries its requester's agent ID under **Requester**.

## Seating

A spawn or message starts the teammate in the sender's current shell directory. Before every send — spawn or message — `cd` into the teammate's worktree; send; then `cd` back. A directory change inside the teammate does not persist to its next turn.

Never use `EnterWorktree` or `ExitWorktree` during a run: they switch the whole session and retarget every teammate. The **Worktree folder root** must be inside the repository; `.worktrees/` qualifies.

## Termination

On the agent's completion declaration, send a shutdown request to its identifier and continue without waiting for exit.

## Health loop

Launch the bundled loop with `/loop <interval> <tick prompt>`. List loops with `CronList`; cancel one with `CronDelete` and its task ID.

## Models

Read model values from `.rp.md`'s `## Claude Code` section under `Agent models`. Pass its aliases or provider-qualified IDs verbatim when spawning.
