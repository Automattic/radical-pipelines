# opencode

These mechanics use the Radical Pipelines plugin.

## Spawn

Call `rp_spawn` with:

- `name`: run-unique instance name.
- `agent`: profile name.
- `model`: `provider/model[#variant]`.
- `directory`: absolute worktree path.
- `prompt`: filled prompt template.
- `run`: pipeline branch.

`name` is `<profile> <slug>-<n>` (`<slug>-<lane>-<n>` in a lane), `<n>` counting that profile's instances in the pipeline; the returned session ID is the address for messages. `directory` fixes its working directory for the session's lifetime. The **Worktree folder root** must be inside the repository; `.worktrees/` qualifies.

The plugin appends its messaging and turn protocol, including the spawner's session ID, to every spawned prompt. The protocol directs profile-required messages to the address under **Requester** or to the spawner. An ended turn stops the session; a message or the completion notice of a background command given a timeout resumes it. Failed turns are announced to the spawner.

Commands run through non-interactive `$SHELL -c` and source no profile or rc files.

## Messaging and permissions

Send a directed message with `rp_send` to the agent's session ID. Its result reports admission and observed target state, not receipt.

A read outside a session's worktree raises a permission request; the plugin redirects reads that resolve inside the worktree without asking. A pending request blocks the agent and is announced to the spawner. Answer it with `rp_permission_reply`: `once` allows it; `reject` refuses it and may carry corrective feedback. A blocked agent is not stalled.

## Termination

On an agent's completion declaration, call `rp_terminate` with its session ID.

## Health loop

- Launch with `rp_loop_start`, passing the interval in milliseconds and tick prompt. The target defaults to the calling session. Ticks fire while idle and steer after two intervals without activity.
- List with `rp_loop_list`; cancel with `rp_loop_cancel` and the loop ID.
- Inspect with `rp_status`. It reports `pluginVersion`, `pin`, `ledger`, `recentErrors`, `recentLoopTicks`, and `readFailures`. Each ledger row includes `name`, `run`, `sessionID`, `agent`, `model`, `directory`, `updated`, `activity`, `running`, `pending`, `permissions`, `currentTool`, `lastTurn`, `turns`, `lastSend`, and `lastText`. `activity` includes input, tool, and model progress; `updated` moves on input. `lastText` contains the newest text excerpt or `olderThan`. Turn and send observations live in daemon memory and may be absent after restart. `readFailures` means the affected liveness fields are incomplete.

## Models

The `model` of each profile or lane comes from the project's `Agents` convention as a `provider/model[#variant]` string, or as a name `.rp.md`'s `## opencode` section defines; pass the string verbatim as `model`.

## Setup actions

Verify `rp_status` succeeds and `pluginVersion` is `radical-pipelines@<version>`. Otherwise stop setup and point the owner to the README's opencode installation section.
