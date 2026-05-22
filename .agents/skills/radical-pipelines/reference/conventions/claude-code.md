# Claude Code Rules

When the active agentic coding tool is Claude Code, three project conventions are forced by Claude Code's tool surface.

Do not ask the owner to choose alternatives for these, the tools constrain the answer.

The block below is the canonical content for `.rp.md`.

```markdown
## Worktrees

All work for a pipeline happens inside a Claude Code worktree. Never modify files in the main working directory, never use raw `git worktree`, and never `cd`.

- **Create and enter:** `EnterWorktree({ name: "<pipeline-slug>" })`. Creates the worktree at `.claude/worktrees/<pipeline-slug>` and enters it. All subsequent tool calls and spawned agents inherit the worktree as their working directory.
- **Re-enter an existing worktree:** `EnterWorktree({ path: ".claude/worktrees/<pipeline-slug>" })`.
- **Exit:** `ExitWorktree`.

## Branch names

Branch names are derived automatically by `EnterWorktree` from the worktree name. Do not choose branch names independently and do not rename branches after the fact.

- **Format:** `worktree-<pipeline-slug>`.
- **Source of truth:** the `name` passed to `EnterWorktree` (equal to the pipeline slug) determines the branch.

## Team spawning

Every autonomous workflow that spawns agents must use exactly one Claude Code team using `TeamCreate({ name: "<pipeline-slug>" })`.

Agents in the same team address each other directly via `SendMessage({ to: "<agent-name>", ... })`. When a phase reference says two agents exchange messages, the orchestrator does not relay between them by default. It only spawns, monitors, and waits for completion signals.

If an agent-to-agent message fails (e.g. the target agent is unreachable, errors out, or stops responding), the orchestrator may step in to investigate and try to recover — for example, by re-delivering the message, restarting the affected agent, or relaying directly as a fallback. Intervention is for repair only; once the exchange is healthy again, the agents resume talking to each other directly.

## Health monitoring

Use Claude Code's bundled `/loop` skill — no install is required. Only the autonomous workflow launches the monitor; assisted runs do not.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.

The orchestrator starts the loop itself; the owner is not asked to run the command. Cancel the loop on run close-out and after any owner-requested interruption.
```
