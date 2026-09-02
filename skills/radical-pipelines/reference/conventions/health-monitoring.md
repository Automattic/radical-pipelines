# Health monitoring

A recurring health loop watches an autonomous run. Launch it after the pipeline worktree exists and cancel it at close-out, using `tools/<tool>.md`. Cancel a leftover loop for the same pipeline before launching. Defaults: 15-minute interval and 30-minute stall threshold; the owner may change both.

## Tick prompt

```
Health tick for pipeline <slug> on branch <branch>, worktree <path>: run `reference/conventions/health-monitoring.md` § Each tick.
```

## Each tick

On each tick:

1. **Pending permission requests** — answer each using the active tool's procedure.
2. **Stalled agents** — an agent with undeclared completion has no commit, file write, tool output, or message for the threshold. Ask once for status.
3. **Dead agents** — a session is gone, its turn failed, or it remains silent after the status request. Terminate any remaining session and re-dispatch a fresh instance with the same prompt. Its task or lane waits for that instance.
4. **Waves that never close** — compare every open wave's expected lanes with its reports and live agents. Land a fully reported wave. Treat a missing report without a live agent as a dead agent.

An unavailable environment or authentication failure stops the run. Close out with the affected agent, error verbatim, last known progress, and smallest owner action.
