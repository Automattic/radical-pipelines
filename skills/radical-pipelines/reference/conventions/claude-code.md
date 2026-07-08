# Claude Code Rules

When the active agentic coding tool is Claude Code, the conventions below take the canonical form shown; inform the owner instead of asking for alternatives.

The block below is the canonical content for `.rp.md`.

```markdown
## Team spawning

Spawn each agent as a Claude Code teammate.

## Health monitoring

Use Claude Code's bundled `/loop` skill — no install is required.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.
```
