# Health monitoring

A recurring health loop watches an autonomous run: roles stall or die, a provider login expires, a tool call hits a network blip. Launch it after the pipeline worktree exists and cancel it at close-out, using `tools/<tool>.md`. Cancel a leftover loop for the same pipeline before launching. Defaults: 50-minute interval and 30-minute stall threshold; the project's **Health monitoring** section overrides either, and the owner may change both for a run.

## Tick prompt

```
Health tick for pipeline <pipeline slug> on branch <pipeline branch>, worktree <path>: run `<this skill's folder>/reference/conventions/health-monitoring.md` § Each tick.
```

## Each tick

Inspect the run and lane worktrees and the roles' state through `tools/<tool>.md`.

1. **Pending permission requests** — find them per `tools/<tool>.md` and tell the owner, who answers them.
2. **Stalled roles** — a role that has not ended its turn, has no pending permission request, and has produced no commit, file write, or tool output for the threshold.
3. **Dead roles** — a role whose session is gone or whose turn failed.
4. **Login or API-key errors** — a role or the orchestrator hit a provider authentication failure.
5. **Network failures** — a tool call failed with a transient network error.
6. **Steps that never land** — compare the roles the current step woke with their reports and live sessions. When every one has ended its turn, land them (`../run/loop.md` § One step, step 4); treat a missing report without a live session as a dead role.

## Recovery

Each issue occurrence gets two recovery attempts before escalation; a success resets that occurrence's budget. The budget is per occurrence, not per session.

| Issue                 | First                                                                 | Second                                   |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| Stalled role          | Ask once for status                                                   | Terminate; spawn a fresh instance        |
| Dead role             | Terminate any remaining session; spawn a fresh instance               | Do it once more                          |
| Login or API-key error| Swap to an authenticated model the project's **Agents** section names | Spawn a fresh instance on the new model  |
| Network failure       | Retry the call                                                        | Wait one interval and retry              |

Spawn a fresh instance with the one-line message of `../run/loop.md` § Waking a role; its assignment is already written. A replaced role's work waits for the new instance.

## Escalation

When recovery is exhausted, stop recovering that issue — the loop keeps watching the others — and report to the owner: the role affected (or `orchestrator`), the error verbatim, its last known progress, and the smallest owner action that would resolve it. An unavailable environment stops the run through close-out.
