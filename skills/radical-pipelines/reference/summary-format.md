# The Summary Format

This describes a per-phase summary — a self-contained, human-friendly record of
what its phase produced in the current run as a whole. The code phase renders it
as `4-code/code-summary.md` (H1 `# Code Summary`); the docs phase renders it as
`5-docs/docs-summary.md` (H1 `# Docs Summary`). The section skeleton below is
identical for both.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **What** — what the phase produced in the current run as a whole.
- **Why** — the purpose it serves.
- **How** — how it was realized.
- **Key decisions** _(optional)_ — notable decisions, with rejected alternatives
  worth recording folded in here.
- **Known limitations** _(optional)_ — gaps or caveats a reader should know.

Screenshots or other assets live in the same phase folder and are referenced by
relative path.

## Authoring discipline

- **Cover the whole run, not the last batch.** The summary records what the phase
  produced across the entire run — every rejected iteration's surviving work, not
  only the final approved batch. The reviewer's base-ref → HEAD diff already spans
  this scope.
- **Record, don't re-argue.** State what was produced and why; do not re-litigate
  the spec, design, or plan, which the prior phases already settled.
- **Write for a human reader of the artifact folder** — and for a project building
  run-level outputs from the per-phase summaries. Be concrete and concise.
