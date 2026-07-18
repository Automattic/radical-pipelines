# opencode Rules

When the active agentic coding tool is opencode, the conventions below take the canonical form shown; inform the owner instead of asking for alternatives.

The **Worktree root** must be a path inside the repository; the suggested default `.worktrees/` qualifies.

The block below is the canonical content for `.rp.md`.

```markdown
## opencode conventions

### Team spawning

Spawn each agent with `rp_spawn`, passing the run-unique instance name, the RP profile name, a `provider/model[#variant]` string, the absolute worktree path to seat the session in, the initial prompt, and the run branch. The session's working directory is fixed for its lifetime. The result's session ID is the identifier for addressing messages to it. Message an agent with `rp_send`. The spawner is notified automatically when a spawned agent's first turn completes; agents report completion of any later work themselves.

### Health monitoring

- **Start:** `rp_loop_start` with the interval and the monitor prompt from `reference/health-monitoring.md`; target defaults to the calling session.
- **List active loops:** `rp_loop_list`.
- **Cancel:** `rp_loop_cancel` with the loop id.

### Agent models (optional)

Values are opencode-native `provider/model[#variant]` strings, passed verbatim to `rp_spawn`.
```

## Setup actions

Before writing conventions that reference `rp_*` tools, verify the RP opencode plugin is installed and loaded — `GET /api/plugin` reports `radical-pipelines@<version>`, or `rp_status` succeeds. If it does not, stop setup and point the owner at the documented opencode install procedure (the README's opencode section). This is a check, not a write.
