# Health Monitoring

Pipelines can stall or fail silently. An agent stops producing output, a `SendMessage` is lost, a provider login expires, a tool call hits a network blip, or the conversation approaches the session-time-limit. The owner only finds out when they check back in.

Every workflow launches a recurring **health monitor** that watches the run, attempts bounded auto-recovery, and escalates to the owner when it cannot resolve an issue.

## When to launch

| Mode       | When                                 | Default interval | Default no-output threshold |
| ---------- | ------------------------------------ | ---------------- | --------------------------- |
| Autonomous | Right after the team is spawned      | 5 minutes        | 10 minutes                  |
| Assisted   | At the start of the run              | 15 minutes       | N/A (no agents are spawned) |

Intervals are owner-tunable. Shorter intervals catch stalls sooner but spend more tokens on each check; the defaults balance the two.

The orchestrator launches the monitor itself. The owner is not asked to run a separate command. The active tool's rules (see `conventions/claude-code.md` or `conventions/pi.md`) provide the exact slash command to start the loop.

## What to watch

The monitor checks every interval for the following signals:

- **No-output stall** — an agent has not produced output for longer than the no-output threshold (autonomous only).
- **Message failure** — a `SendMessage` / `spawn_teammate` / inter-agent message failed, errored out, or was never delivered.
- **Login / API-key error** — a spawned agent or the orchestrator hit a provider authentication failure.
- **Token-limit warning** — the active session or a spawned agent is close to or has exceeded its context window.
- **Session-time-limit** — the active session is approaching its time limit.
- **Network failure** — a tool call failed with a transient network error.

The autonomous loop reads from the artifact folder (last commits, agent logs if available) and from the team's messaging state. The assisted loop checks session-level signals only (token, login, network) because no agents are spawned.

## Recovery

Each issue gets a **2-retry budget** before escalation. Recovery actions are applied in order:

| Issue                  | Retry 1                                                         | Retry 2                                  | Escalate                            |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| No-output stall        | Ping the agent with a status request                            | Restart the agent in the same team       | Report to owner                     |
| Message failure        | Re-send the message                                             | Restart the target agent                 | Report to owner                     |
| Login / API-key error  | Swap to an authenticated provider-qualified model (see tool rules) | Re-spawn the agent on the new model  | Report to owner                     |
| Token-limit warning    | Let the tool's built-in auto-compaction run                     | Restart the affected agent (fresh context) | Report to owner                   |
| Session-time-limit     | Report to owner immediately (no auto-recovery)                  | —                                        | —                                   |
| Network failure        | Retry the tool call once                                        | Wait one interval and retry              | Report to owner                     |

`/compact` cannot be invoked by the model from a loop in either Claude Code or Pi. Token-limit recovery relies on the tool's built-in auto-compaction; if a spawned agent still fails after that, restart it so it starts with a fresh context.

When a retry succeeds, reset that issue's budget. The 2-retry budget is per issue occurrence, not per session.

## Escalation payload

When auto-recovery is exhausted, surface the issue to the owner with:

- **Agent name** — the agent affected (or `orchestrator` for session-level issues).
- **Error verbatim** — the exact error message returned by the tool or model.
- **Last-known progress** — what the agent produced or did most recently (commit, message, artifact written).
- **Suggested next step** — the smallest action the owner can take (re-authenticate provider X, increase a quota, retry the phase, etc.).

After escalation, stop attempting recovery for that issue. The monitor keeps running and continues watching other signals.

## Loop prompt template

The orchestrator hands the monitor a self-contained prompt that names the pipeline. Example for autonomous mode:

```
Check pipeline at <artifact-folder>, team <pipeline-slug>.

Signals to look for:
- Any agent with no output for >10 minutes
- Failed SendMessage between agents
- Login / API-key errors
- Token-limit warnings
- Session-time-limit approaching
- Network failures on tool calls

For each detected issue, apply up to 2 auto-recovery actions per the recovery table in .agents/skills/radical-pipelines/reference/health-monitoring.md.

If unresolved after 2 attempts, stop and report to the owner with: agent name, error verbatim, last-known progress, suggested next step.
```

For assisted mode the prompt is shorter and covers session-level signals only:

```
Check this session for:
- Token-limit warnings
- Login / API-key errors
- Network failures on tool calls

If any are detected, report to the owner immediately. Do not auto-recover — in assisted mode the owner decides.
```

Both prompts reference this file so the monitor reads the recovery table fresh on each fire.

## Stopping the monitor

The monitor stops when:

- The autonomous run reaches its target phase and closes out.
- The assisted run finishes its single phase.
- The owner cancels the run.

Use the tool's loop cancellation command (see `conventions/claude-code.md` or `conventions/pi.md`). Leftover loops from a previous session must be cancelled before launching a new one for the same pipeline.
