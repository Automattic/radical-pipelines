# The Summary Format

This describes a per-phase summary — a self-contained, human-friendly record of what its phase produced in the current run.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **What** — what the phase produced.
- **Why** — the purpose it serves.
- **How** — how it was realized.
- **Key decisions** _(optional)_ — notable decisions, with rejected alternatives worth recording folded in here.
- **Known limitations** _(optional)_ — gaps or caveats a reader should know.

Screenshots or other assets live in the same phase folder and are referenced by relative path.

## Authoring discipline

- **Cover the whole phase.** Include every rejected iteration's surviving work, not only the final approved batch; the diff you derived already spans this scope.
- **Record, don't re-argue.** State what was produced and why; the spec, design, and plan are already settled.
- **Write for a human reader of the artifact folder** — and for a project building run-level outputs from the per-phase summaries. Be concrete and concise.
