# opencode

Run `opencode api` commands with your shell tool. The plugin registers each profile as the subagent `radical-pipelines/<profile>` and gives you this skill back after compaction.

## Setup actions

Verify that `opencode api GET /api/plugin` lists `radical-pipelines@<version>`, and that the opencode configuration sets `experimental.schedules` to `true` and `experimental.subagent_depth` to at least `2`. Otherwise stop setup and point the owner to the README's opencode installation section.

## Spawn

A role is a child session of yours; its session ID is its address.

1. Create it: `opencode api POST /api/session -d '{"parentID":"'"$OPENCODE_SESSION_ID"'","title":"<pipeline slug> <profile>[ <lane>]","agent":"radical-pipelines/<profile>"}'`. The response's `data.id` is its session ID.
2. Seat it: `opencode api POST /api/session/<session ID>/move -d '{"directory":"<worktree absolute path>"}'`. It stays seated across wakes.
3. Start it: call `subagent` with `agent` `radical-pipelines/<profile>`, `sessionID`, `model`, a short `description`, the filled prompt as `prompt`, and `background: true`.

## Wake

Call `subagent` with the role's `sessionID`, `agent`, `model`, a short `description`, the message as `prompt`, and `background: true`. A running role receives it at its next step; a finished role continues with its context.

## Turn end

When a role's run ends, you receive `<subagent sessionID="<session ID>" state="…">` carrying its final reply, which is its report. `completed` is a finished turn; `error` and `cancelled` are failures.

## Termination

A finished role needs none. Stop a running role with `opencode api POST /api/session/<session ID>/interrupt`, then each of its subagents, which `opencode api GET "/api/session?parentID=<session ID>"` lists; interrupting an idle session does nothing. Keep every role's session: it is the role's transcript.

## Health ticks

- Start them with the Code Mode tool `opencode.schedule_create`, passing `name`, `when: { every: "<interval>" }`, and the tick prompt as `prompt`; each tick wakes your session with it. List them with `opencode.schedule_list`; cancel one with `opencode.schedule_delete` and its `id`.
- On a tick, `opencode api GET /api/session/active` lists the running sessions, and `opencode api GET /api/session/<session ID>` gives a role's `outcome` and its `time.busy` and `time.idle`.
- `opencode api GET /api/session/<session ID>/permission` lists a role's pending permission requests. The owner answers them in opencode's interface; a role with one pending is blocked, not stalled.

## Models

The `model` of each profile or lane comes from the project's `Agents` convention as a `provider/model[#variant]` string, or as a name `.rp.md`'s `## opencode` section defines; pass the string verbatim as `model`. Fill the **Subagent model** with a `provider/model[#variant]` string too: a role passes it as `model` when it calls `subagent`.
