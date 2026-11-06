# Assignment templates

One template per profile. Build every assignment from its template: fill every slot, keep the headings verbatim — the profile refers to them by name — and list materials as explicit paths. Keep only the material lines of the selected mode and **Write to**, as their comments mark, and omit a section marked optional when it has nothing. A role's materials are exactly what its assignment lists.

The slots:

- `Seat` — Worktree, Branch, Turn commit, Supporting folder (`../reference/run/state.md` § Names, § Terms), and Subagent model (`../reference/conventions/agents.md`); the implementer adds its Base branch. The reviewer has no Supporting folder and adds its Lane and its Base: its Branch, Base, and Turn commit are the `branch`, `base`, and `change` its `rp review` printed.
- `Mode` — one of the profile's modes; the reviewer's is `First` when the lane has no open review thread, else `Later`.
- `Brief` — a lane's brief, verbatim, when it has one.
- `Materials` — per mode. The reviewer's `Later inputs` are every later input; its `Review thread` is the lane's open review thread and its `Diff since your last message` the lane's prepared file (`../reference/run/loop.md` § Review lanes).
- `Threads addressed to you` — every thread awaiting the role, or `none`.
- `Malformed files` — the `rp check` `INVALID` lines naming files the role wrote.
- `Write to` — the artifact path.
- `Guardrails`, `Resources` — the `.rp.md` blocks whose `agents` include the profile, or `none`.
- `Commit format` — the **Commit format** convention.
