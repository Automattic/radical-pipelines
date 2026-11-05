# Assignment templates

One template per profile. Build every assignment from its template: fill every slot, keep the headings verbatim — the profile refers to them by name — and list materials as explicit paths. Keep only the material lines of the selected mode and **Write to**, as their comments mark, and omit a section marked optional when it has nothing. A role's materials are exactly what its assignment lists.

The reviewer's template is a request with no headings: keep the lines of the form its comments select — the first turn when the lane has no open review thread, the later turn when its open review thread awaits it — fill their slots, and drop the comments. Its `<branch>`, `<base>`, and `<turn commit>` are the `branch`, `base`, and `change` its `rp review` printed; its `<thread path>` is the lane's review thread, a new one named per `../reference/run/state.md` § Threads on a first turn; its later-turn diff is the lane's prepared file (`../reference/run/loop.md` § Review lanes).

The other templates' slots:

- `Seat` — Worktree, Branch, Turn commit, Supporting folder (`../reference/run/state.md` § Names, § Terms), and Subagent model (`../reference/conventions/agents.md`); the implementer adds its Base branch.
- `Mode` — one of the profile's modes.
- `Brief` — a lane's brief, verbatim, when it has one.
- `Materials` — per mode.
- `Threads addressed to you` — every thread awaiting the role, or `none`.
- `Malformed files` — the `rp check` `INVALID` lines naming files the role wrote.
- `Write to` — the artifact path.
- `Guardrails`, `Resources` — the `.rp.md` blocks whose `agents` include the profile, or `none`.
- `Commit format` — the **Commit format** convention.
