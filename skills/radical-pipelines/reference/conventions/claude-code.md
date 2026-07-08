# Claude Code Rules

When the active agentic coding tool is Claude Code, the conventions below take the canonical form shown. Inform the owner instead of asking for alternatives; the owner supplies only the worktree root and the `<branch-base>` format.

The block below is the canonical content for `.rp.md`.

```markdown
## Worktree root

Worktrees live under `<worktree-root>`. The orchestrator creates and removes them with raw `git worktree` shell commands — one worktree per branch, at `<worktree-root>/<branch>`. Agents never run `git worktree`; each occupies the worktree named in its Conventions block.

## Branch name base

`<branch-base>` is `<owner's chosen format>`. The skill's branch grammar appends every other segment.

## Team spawning

Spawn each agent as a Claude Code subagent, passing the model and settings resolved from the **Agent models** convention as spawn parameters. When the spawn mechanism supports a working-directory parameter, set it to the agent's worktree; otherwise the agent seats itself from the Worktree path in its Conventions block. Agents message the orchestrator when their work completes.

If an inter-agent message fails (the target agent is unreachable, errors out, or stops responding), the orchestrator may step in to investigate and try to recover — for example, by re-delivering the message, restarting the affected agent, or relaying directly as a fallback. Intervention is for repair only; once the exchange is healthy again, the agents resume talking to each other directly.

## Health monitoring

Use Claude Code's bundled `/loop` skill — no install is required. Only the autonomous workflow launches the monitor; assisted runs do not.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.

The orchestrator starts the loop itself; the owner is not asked to run the command. Cancel the loop on run close-out and after any owner-requested interruption.
```
