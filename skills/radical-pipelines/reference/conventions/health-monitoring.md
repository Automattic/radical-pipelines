# Health monitoring

A recurring health loop watches an autonomous run: agents stall, messages get lost, a provider login expires, a tool call hits a network blip. Launch it after the pipeline worktree exists and cancel it at close-out, using `tools/<tool>.md`. Cancel a leftover loop for the same pipeline before launching. Defaults: 15-minute interval and 30-minute stall threshold; the project's **Health monitoring** section overrides either, and the owner may change both for a run.

## Tick prompt

```
Health tick for pipeline <slug> on branch <branch>, worktree <path>: run `reference/conventions/health-monitoring.md` § Each tick.
```

## Each tick

1. **Pending permission requests** — answer each using the active tool's procedure.
2. **Stalled agents** — an agent with undeclared completion has no commit, file write, tool output, or message for the threshold.
3. **Dead agents** — a session is gone, its turn failed, or it remains silent after a status request.
4. **Failed messages** — an inter-agent message errored or was never delivered.
5. **Login or API-key errors** — an agent or the orchestrator hit a provider authentication failure.
6. **Network failures** — a tool call failed with a transient network error.
7. **Waves that never close** — compare every open wave's expected lanes with its reports and live agents. Land a fully reported wave; treat a missing report without a live agent as a dead agent.

## Recovery

Each issue gets two recovery attempts before escalation; a success resets the budget for that issue.

| Issue                 | First                                                                 | Second                                   |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| Stalled agent         | Ask once for status                                                   | Terminate; re-dispatch a fresh instance with the same prompt |
| Dead agent            | Terminate any remaining session; re-dispatch with the same prompt     | Re-dispatch once more                    |
| Failed message        | Re-send                                                               | Re-dispatch the target                   |
| Login or API-key error| Swap to an authenticated model the project's **Agents** section names | Re-dispatch on the new model             |
| Network failure       | Retry the call                                                        | Wait one interval and retry              |

A re-dispatched agent's task or lane waits for the new instance. When a re-dispatch changes an agent's identifier, send the new one to the agents that message it.

## Escalation

When recovery is exhausted, stop recovering that issue — the loop keeps watching the others — and report to the owner: the agent affected (or `orchestrator`), the error verbatim, its last known progress, and the smallest owner action that would resolve it. An unavailable environment stops the run through close-out.
