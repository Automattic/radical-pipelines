# The opencode plugin

What the opencode plugin does once installed, and why each piece is still plugin code. Installation lives in the README's [opencode plugin install](../README.md#opencode-plugin-install) section.

Verified against opencode v2.2.5.

## What opencode covers natively

The orchestrator drives roles with opencode's own primitives, as [`tools/opencode.md`](../skills/radical-pipelines/tools/opencode.md) states. [Native primitives](./research/native-primitives.md) lists what each tool provides. These were checked against the installed binary and are exercised by the integration suite's native-roles checks:

- **Spawn and seat.** The `subagent` tool always creates its child at the parent's location. The orchestrator instead creates the child session itself through the API, with `parentID` set to its own session (`$OPENCODE_SESSION_ID` in the shell), and moves that session to the worktree. It then starts it with `subagent` and that `sessionID`. A moved idle session switches location without a model call, and the location holds across wakes.
- **Wake.** `subagent` with `sessionID` reaches a running or finished child. opencode accepts only children of the calling session.
- **Turn end and failure.** A background run posts `<subagent sessionID=… state=completed|error|cancelled>` with the final reply to the parent.
- **Termination.** `DELETE /api/session/<id>` removes the session and its children.
- **Health ticks.** The `opencode.schedule_create` Code Mode tool wakes the calling session on an interval. It requires `experimental.schedules`. Session state is read through `opencode api`.
- **Delegation by roles.** `experimental.subagent_depth` defaults to 1, which stops a role from spawning subagents. The setup actions require at least 2.

### Gaps accepted

- **Permission requests.** A child's permission request reaches the owner in opencode's interface, never the parent agent. The binary notifies the parent only when a run ends. The orchestrator sees pending requests on its health ticks through `GET /api/session/<id>/permission` and treats such a role as blocked. It does not answer them.
- **Tool scoping.** The plugin registers no tools, so a role reaches no plugin code. A role's `subagent` follow-ups reach only its own children. Its shell could still call `opencode api`, which no profile directs it to do.
- **Messages from roles.** opencode has no tool for a child to message its parent or a sibling mid-run. v4 roles report only through their final reply.

## Skill registration and re-supply

The plugin registers the packaged skills with their source paths and content, so the `radical-pipelines` skill can be invoked.

opencode's compaction summarizes the transcript and drops an activated skill with it, and it re-injects nothing ([compaction](https://opencode.ai/v2/docs/compaction/)). The plugin fills that gap. Every model request shows it the session's active context, and it records each activation it sees there: a successful `skill` tool call, or the skill attached to a prompt. If a request no longer carries a recorded activation, the session is continuing from a checkpoint. The plugin then re-supplies the skill's body as system text, as Claude Code does for invoked skills, and the skill's opening instruction makes the session recompute its state. Once the session activates the skill again, the re-supply stops.

A checkpoint seals history away from every request, so the plugin reads a session's stored history once. Requests that arrive during the read share it. If the read fails or the server is unreachable, the plugin reads again on the next request and meanwhile serves what the requests have shown. A malformed history counts as a failed read, never as an empty one. The plugin keeps records for at most 4,096 sessions. Roles never activate the skill, so it is never re-supplied to them.

## Agent profiles

opencode's agent editor can't add agents from code, so the plugin writes files. On every setup it regenerates its profiles in opencode's global `agents/radical-pipelines/` folder, where they register as `radical-pipelines/<profile>`.

opencode registers an agent file without `mode` as a primary agent, and its `subagent` tool refuses to launch one. Each profile is therefore written with only its `description` and `mode: subagent` in the frontmatter. The other fields are dropped: the path sets the id, and the orchestrator passes the model on each call. The body is copied unchanged.

## Version

The plugin's id is `radical-pipelines@<version>`, read from `package.json`. `opencode api GET /api/plugin` reports it.
