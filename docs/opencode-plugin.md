# The opencode plugin

How the opencode plugin behaves once installed, and the design decisions behind that behavior. Installation and the short behavior summary live in the README's [opencode plugin install](../README.md#opencode-plugin-install) section.

## Skill registration and re-supply

The `radical-pipelines` skill is invokable — the plugin registers the packaged skills with their source paths and content.

A session that activated the skill gets it back after opencode's context compaction, which summarizes the transcript and drops an activated skill with it. Every model request shows the plugin the session's active context, and the plugin records the activation it sees there — a successful `skill` tool call, or the skill attached to a prompt. A request that no longer carries a recorded activation is continuing from a checkpoint, and the plugin re-supplies the skill's body as system text, as Claude Code does for invoked skills; the skill's own opening instruction then makes the session follow the skill again and recompute state. Once the session activates the skill again, the re-supply stops.

What a checkpoint sealed is in no request, so a session's stored history is read once — shared by requests that arrive meanwhile, and again on the next request when it fails or the server is unreachable, recording `skill.resupply.unreadable` and serving what the session's requests have shown meanwhile; a malformed history is a failed read, never an empty one. A deleted session's record is dropped and the records are capped.

## Agent profiles

The plugin regenerates RP's profiles in opencode's global `agents/radical-pipelines/` folder, where they register as `radical-pipelines/<name>`; `rp_spawn` accepts the plain RP profile name.

## Messaging protocol

Every agent spawned with `rp_spawn` receives the opencode messaging protocol and its spawner's session ID automatically, so its required reports and messages — including its completion declaration, which always goes to the spawner — are routed with `rp_send` rather than left in its transcript.

The same protocol tells it that an ended turn is a stop: only a message resumes the session — a reply it awaits, or the completion notice of a background command it gave a `timeout` (background commands carry none by default, so a hung one never reports back) — and anything else it waits on holds its turn, with foreground commands that have a timeout and progress compared between checks, instead of parking on detached work nothing can wake it for.

## Turn announcements

A spawned agent's failed turn is announced to the spawner with its cause, and a successful turn in which it sent no `rp_send` is announced as ended without a message, unless `rp_terminate` has successfully deleted that agent's session — every terminal event for a deleted session is suppressed. A turn begins at the spawn or at the previous turn's end; a successful turn whose beginning the daemon did not observe in the last 24 hours, such as one in progress across a restart, is not announced.

## Permissions

A spawned agent's read outside its worktree raises a permission request that the plugin announces to the spawner; reads that resolve inside the worktree are redirected without asking. The spawner answers with `rp_permission_reply`.

## Termination

`rp_terminate` deletes a finished agent's session so it cannot linger or receive more work.

## Status

Use `rp_status` with `pipeline_slug` for health checks. Each `ledger` row contains only `sessionID`, `running`, `secondsSinceActivity` (whole seconds since the latest activity, sampled when the response is built), `pending` (undelivered inputs), and actionable `permissions`. Unknown health fields are `null`. `recentErrors` contains failure summaries: type, session when known, timestamp, and cause capped at 200 characters; successful lifecycle events are omitted. A stopped or inactive agent warrants investigation, not automatic recovery.

Use `rp_status` with `session` to investigate an agent. It returns `pluginVersion`, identity and configuration (`name`, `agent`, `model`, `directory`, `pipelineSlug`), the raw `activity` timestamp, `currentTool`, `lastTurn` (`succeeded`, `failed`, or `interrupted`, with `messaged` telling whether the turn sent an `rp_send` when the daemon observed its beginning in the last 24 hours), `lastSend`, and `lastText` (the newest assistant text, capped at 200 characters; the search depth when none was found; or `null` when the transcript holds none). Its `recentErrors` retains full diagnostic events, including their `info` or `error` level. An unscoped call returns the plugin version and detailed rows for every RP session, without reading transcripts.

### Activity

Activity is the latest of opencode's `updated` (which moves when a session receives input), observed tool or model progress, and raw provider bytes. `lastTurn` and `lastSend` live in daemon memory: after a restart they are absent until observed again, and activity falls back to `updated` until progress is observed. Per-session server reads cover only the selected scope. Scoped diagnostic events concern its recorded or live sessions plus events naming no session; unscoped calls include every event.

### Read failures

Every status response includes `readFailures`: unavailable or malformed reads leave the affected facts unknown rather than reporting a healthy or empty pipeline.

## Health loops

Health-loop ticks skip recently active sessions, steer into sessions with no activity for two intervals, and remain observable through `rp_loop_list`, which lists each loop with its recent ticks.

### Flood protection

A tick never duplicates a prompt whose predecessor is still undelivered or unanswered — a parked queue copy facing a running session is promoted to steer delivery in place.

### Backoff

Each injection is judged by the turn that answers it. When that turn only fails (network outage, provider quota exhaustion) the loop backs off exponentially — up to ~8 intervals between probes — while still inspecting the target every tick, and resumes normal cadence on the first success.

### Dead provider streams

A target stuck on a dead provider stream is interrupted exactly once across all loops, with any parked monitor copy made steerable first, so the monitor prompt reaches the freed session on the next delivery.

A dead provider stream is a frozen tool call, with no tool executing anywhere in the message, whose own response produced no bytes and no progress events for a one-hour confirmation window. The response is identified by its provider call id in the teed bytes of each location's provider responses.

The window is an accepted, documented heuristic: silence cannot prove death, so a totally silent live stream outlasting the window would be interrupted — a case beyond observed provider behavior.

Under the plugin's single-observer assumption (no other plugin consumes through its tee and then substitutes the response without cancelling it), a stream whose response identity is established is never interrupted while it produces bytes — bounded only by the instant between the final revalidation and the session-scoped interrupt request, the tightest window the API offers.

Traffic whose identity cannot be established — never observed, or observed but with the projected tool id unmatched in its consumed bytes — is unknown coverage and is never escalated.

### Timeouts and retirement

Health-loop server requests time out after 10 seconds. A tick still pending after two minutes records a `timeout` tick and re-arms; cancelling a loop returns as soon as it is disarmed instead of waiting for its active tick. A tick that finds its target session gone retires the loop and records `loop.retired`, rather than failing again on every interval for as long as the daemon runs.

## Tool scoping

The plugin's tools are scoped to the session calling them, by two facts a caller cannot forge: the parentage opencode reports when a session is created, and the identity (pipeline slug, instance name, spawner) `rp_spawn` stores in the session's metadata when it creates it. The orchestrator — which nothing spawned — and the owner's own session reach every tool; an agent spawned with `rp_spawn` reaches `rp_send`, which is all its profile needs; and a subagent, created by a session delegating inside its own turn, reaches none and is told to return its findings to whoever delegated to it.

Parentage normally arrives on the event stream, but an event can be missed — the subscription replays no history, and a dropped stream resubscribes rather than recovering what fell in the gap — so a session RP has not seen is asked about, once, against the durable session store rather than assumed unparented. Any read that does not answer — an unreachable server, but equally one that replies 500 or 404 — leaves the question open, and an unclassifiable caller is then treated as a root session, because refusing every one of them would stop the orchestrator too.

Both facts live in the session store, so an agent outliving a daemon restart keeps its identity: its tools stay restricted, its messages attributed, its failures and permission asks routed to its spawner, and `rp_status` — which reads every page of opencode's session list — still reports it.
