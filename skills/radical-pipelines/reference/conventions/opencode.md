# opencode Rules

When the active agentic coding tool is opencode, the conventions below take the canonical form shown; inform the owner instead of asking for alternatives.

The **Worktree root** must be a path inside the repository; the suggested default `.worktrees/` qualifies.

The block below is the canonical content for `.rp.md`.

```markdown
## opencode conventions

### Team spawning

Spawn each agent with `rp_spawn`, passing the run-unique instance name, the RP profile name, a `provider/model[#variant]` string, the absolute worktree path to seat the session in, the initial prompt, and the run branch. The session's working directory is fixed for its lifetime. The result's session ID is the identifier for addressing messages to it. Message an agent with `rp_send`. The spawner is notified automatically when a spawned agent's first turn completes; agents report completion of any later work themselves.

### Permissions

A read outside a session's worktree raises a permission request that blocks the session until answered. When the same content exists inside that session's worktree, the plugin rejects the request automatically, redirecting the agent to the worktree copy. Every other request is announced to the spawner and stays pending until answered with `rp_permission_reply` — `once` to allow, `reject` to refuse, with an optional message delivered to the agent as feedback. A session with a pending request is blocked awaiting the reply, not stalled.

### Shell

Sessions run commands in a non-interactive `$SHELL -c` that sources no profile or rc files, so shell functions defined there — version managers like `nvm` — exist only when the command initializes them itself (e.g. `. "$NVM_DIR/nvm.sh" && nvm use`).

### Health monitoring

- **Start:** `rp_loop_start` with the interval and the monitor prompt from `reference/health-monitoring.md`; target defaults to the calling session.
- **List active loops:** `rp_loop_list`.
- **Cancel:** `rp_loop_cancel` with the loop id.
- **Status:** `rp_status` reports each spawned session's running state, current tool, and pending permission requests; consult it before classifying a no-output stall.
```

**Agent models** values are opencode-native `provider/model[#variant]` strings.

## Setup actions

Before writing conventions that reference `rp_*` tools, verify the RP opencode plugin is installed and loaded — `GET /api/plugin` reports `radical-pipelines@<version>`, or `rp_status` succeeds. If it does not, stop setup and point the owner at the documented opencode install procedure (the README's opencode section). This is a check, not a write.
