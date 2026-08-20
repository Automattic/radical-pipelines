# Claude Code Rules

When the active agentic coding tool is Claude Code, the conventions below take the canonical form shown; inform the owner instead of asking for alternatives.

The **Worktree root** must be a path inside the repository; the suggested default `.worktrees/` qualifies.

The block below is the canonical content for `.rp.md`.

```markdown
## Team spawning

Spawn each agent as a Claude Code teammate. A teammate runs in the shell working directory its sender was in at the last send: a spawn starts it there, and every message restarts it there — whoever the sender is. A directory change inside a teammate does not persist to its next command. To seat an agent, at every send — spawn or message: `cd` into its worktree, send, then `cd` back. Never use Claude Code's worktree tools (`EnterWorktree`/`ExitWorktree`) during a run — a worktree switch is session-wide and retargets the working directory of every running agent. A teammate's spawn result includes its `agentId` — the identifier for addressing messages to it. When an agent’s work ends, send a shutdown request to its identifier without blocking workflow progress on its exit.

## Health monitoring

Use Claude Code's bundled `/loop` skill — no install is required.

- **Start:** `/loop <interval> <prompt>` with the interval and the `<prompt>` template from `reference/health-monitoring.md`, appending each agent's worktree path and the seating rule: a message restarts its target in the sender's shell working directory, so `cd` into an agent's worktree before messaging or restarting it, then `cd` back.
- **List active loops:** the `CronList` tool.
- **Cancel:** the `CronDelete` tool with the loop's task id.
```
