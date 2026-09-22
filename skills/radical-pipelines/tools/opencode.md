# opencode

These mechanics use the Radical Pipelines plugin, whose `rp_` tools are direct tools of your session.

## Spawn

Call `rp_spawn` with:

- `name`: pipeline-unique instance name.
- `agent`: plain RP profile name; the plugin resolves it to `radical-pipelines/<name>`.
- `model`: `provider/model[#variant]`.
- `directory`: absolute worktree path.
- `prompt`: filled prompt template.
- `pipeline_slug`: the pipeline slug.

The plugin regenerates the profiles in opencode's global `agents/radical-pipelines/` folder during setup. `name` is `<profile> <pipeline slug>-<n>` (`<pipeline slug>-<lane>-<n>` in a lane), `<n>` counting that profile's instances in the pipeline; the returned session ID is the address for messages. `directory` fixes its working directory for the session's lifetime. The **Worktree folder root** must be inside the repository; `.worktrees/` qualifies.

The plugin appends its messaging and turn protocol, including the spawner's session ID, to every spawned prompt. The protocol directs profile-required messages to the address under **Requester** or to the spawner. An ended turn stops the session; a message or the completion notice of a background command given a timeout resumes it. Failed turns are announced to the spawner.

Commands run through non-interactive `$SHELL -c` and source no profile or rc files.

## Messaging and permissions

Send a directed message with `rp_send` to the agent's session ID. Its result reports admission and observed target state, not receipt.

Spawned agents reach only `rp_send`; subagents reach no RP tools and return results to their requester. Root sessions reach every RP tool. Unclassifiable sessions are treated as root sessions.

A read outside a session's worktree raises a permission request; the plugin redirects reads that resolve inside the worktree without asking. A pending request blocks the agent and is announced to the spawner. Answer it with `rp_permission_reply`: `once` allows it; `reject` refuses it and may carry corrective feedback. A blocked agent is not stalled.

## Termination

On an agent's completion declaration, call `rp_terminate` with its session ID.

## Health loop

- Launch with `rp_loop_start`, passing the interval in milliseconds and tick prompt. The target defaults to the calling session. Ticks fire while idle and steer after two intervals without activity.
- List with `rp_loop_list`, each loop with its `recentTicks`; cancel with `rp_loop_cancel` and the loop ID. A loop retires when its target session no longer exists.
- Inspect with `rp_status`, passing `pipeline_slug` for the pipeline's agents, `session` for one agent, or neither for every RP session. It reports `pluginVersion`, `ledger`, `recentErrors` — under a scope, those of its sessions and those naming no session — and `readFailures`. Each ledger row includes `name`, `pipelineSlug`, `sessionID`, `agent`, `model`, `directory`, `activity`, `running`, `pending`, `permissions`, `currentTool`, `lastTurn`, and `lastSend`; a `session` row adds `lastText`, the newest assistant text excerpt, `olderThan`, or `null`. `activity` includes input, tool, and model progress. Turn and send observations live in daemon memory and may be absent after restart. `readFailures` means the affected liveness fields are incomplete.

## Models

The `model` of each profile or lane comes from the project's `Agents` convention as a `provider/model[#variant]` string, or as a name `.rp.md`'s `## opencode` section defines; pass the string verbatim as `model`.

## Setup actions

Verify `rp_status` succeeds and `pluginVersion` is `radical-pipelines@<version>`. Otherwise stop setup and point the owner to the README's opencode installation section.
