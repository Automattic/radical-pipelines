# Health Monitoring

Runs can stall or fail silently. An agent stops producing output, an inter-agent message is lost, a provider login expires, or a tool call hits a network blip. The owner only finds out when they check back in.

The autonomous workflow launches a recurring **health monitor** that watches the run, attempts bounded auto-recovery, and escalates to the owner when it cannot resolve an issue. The assisted workflow does not use a monitor — the owner is already in the loop and sees issues as they happen.

## When to launch

At run start in the autonomous workflow, right after the run branch and its worktree are created.

Defaults: **5-minute interval**, **10-minute no-output threshold**. Both are owner-tunable. Shorter intervals catch stalls sooner but spend more tokens on each check; the defaults balance the two.

The orchestrator launches the monitor itself. The owner is not asked to run a separate command. The project's **Health monitoring** convention provides the exact command to start the loop.

## What to watch

The monitor checks every interval for the following signals:

- **No-output stall** — an agent working in the run or a lane worktree has not produced output for longer than the no-output threshold.
- **Message failure** — an inter-agent message failed, errored out, or was never delivered.
- **Login / API-key error** — a spawned agent or the orchestrator hit a provider authentication failure.
- **Network failure** — a tool call failed with a transient network error.

Context-window limits are not watched here. The tools auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it.

The monitor reads the run and lane worktrees (last commits, agent logs if available) and the agents' messaging state.

## Recovery

Each issue gets a **2-retry budget** before escalation. Recovery actions are applied in order:

| Issue                 | Retry 1                                                            | Retry 2                             | Escalate        |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------- | --------------- |
| No-output stall       | Ping the agent with a status request                               | Restart the agent                   | Report to owner |
| Message failure       | Re-send the message                                                | Restart the target agent            | Report to owner |
| Login / API-key error | Swap to an authenticated provider-qualified model (per the project's conventions) | Re-spawn the agent on the new model | Report to owner |
| Network failure       | Retry the tool call once                                           | Wait one interval and retry         | Report to owner |

When a retry succeeds, reset that issue's budget. The 2-retry budget is per issue occurrence, not per session.

## Escalation payload

When auto-recovery is exhausted, surface the issue to the owner with:

- **Agent name** — the agent affected (or `orchestrator` for session-level issues).
- **Error verbatim** — the exact error message returned by the tool or model.
- **Last-known progress** — what the agent produced or did most recently (commit, message, artifact written).
- **Suggested next step** — the smallest action the owner can take (re-authenticate provider X, increase a quota, retry the phase, etc.).

After escalation, stop attempting recovery for that issue. The monitor keeps running and continues watching other signals.

## Loop prompt template

The orchestrator hands the monitor a self-contained prompt that names the run:

```
Check the run on branch <run-branch>, artifacts at <artifact-folder>/<run>/.
Agents work in the run and lane worktrees under <worktree-root>.

Signals to look for:
- Any agent with no output for <no-output-threshold>
- A failed inter-agent message
- Login / API-key errors
- Network failures on tool calls

For each detected issue, apply up to 2 auto-recovery actions per this recovery table: <recovery-table>

If unresolved after 2 attempts, stop and report to the owner with: agent name, error verbatim, last-known progress, suggested next step.
```

The orchestrator fills every placeholder when starting the loop, inlining the Recovery table from this file — the prompt must be self-contained for a monitor that cannot read the skill's files.

## Stopping the monitor

The monitor stops when:

- The autonomous run reaches its target phase and closes out.
- The owner cancels the run.

Use the loop cancellation command from the project's **Health monitoring** convention. Leftover loops from a previous session must be cancelled before launching a new one for the same pipeline.
