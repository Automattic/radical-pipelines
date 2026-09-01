# opencode mechanics

> v3 skeleton stub — content pending. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

Will contain the tool mechanics for opencode, versioned with the skill instead of living in each project's `.rp.md`:

- Agent spawning, seating, addressing, and termination via the `rp_*` plugin tools.
- Health-loop launch and cancellation.
- How to apply a `provider/model[#variant]` value at spawn.

Precedence: this file → `.rp.md` per-tool section (override/extension) → `.rp.local.md`.
