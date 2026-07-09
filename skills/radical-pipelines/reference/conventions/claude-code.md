# Claude Code Rules

When the active agentic coding tool is Claude Code, the conventions below take the canonical form shown; inform the owner instead of asking for alternatives.

The **Worktree root** must be a path inside the repository; the suggested default `.worktrees/` qualifies.

The block below is the canonical content for `.rp.md`.

```markdown
## Team spawning

Spawn each agent as a Claude Code teammate. A teammate starts in the orchestrator's shell working directory at spawn time, and a directory change inside a teammate does not persist to its next command — its start directory is fixed for its whole run. To seat an agent: `cd` into its worktree, spawn the agent, then `cd` back. Never use Claude Code's worktree tools (`EnterWorktree`/`ExitWorktree`) during a run — a worktree switch is session-wide and retargets the working directory of every running agent.

## Health monitoring

Use Claude Code's bundled `/loop` skill — no install is required.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `reference/health-monitoring.md`.
- **List active loops:** the `CronList` tool.
- **Cancel:** the `CronDelete` tool with the loop's task id.
```
