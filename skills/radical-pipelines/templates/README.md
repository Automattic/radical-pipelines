# Prompt templates

One template per profile. The orchestrator builds every prompt from its template: fill every slot, keep the headings verbatim — the profile references them by name — include only the Materials block of the selected mode, and list materials as explicit paths. An agent's materials are exactly what its prompt lists.

Slots:

- `Seat` — Worktree, Branch, Commit format, Guardrails (`none` when the project has none), Execution (`inspection only` | `full`).
- `Charter` — reviewers: `full scope`, or a focus.
- `Mode`, `Materials` — per profile.
- `Write your review to` / `Write your report to` — the path the orchestrator computed (`../reference/run/state.md` § Names).

`build-worker.md` serves the three build worker profiles.
