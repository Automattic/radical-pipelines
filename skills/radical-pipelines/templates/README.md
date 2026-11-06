# Assignment templates

Build every assignment from its template: fill every slot and list materials as explicit paths. A role's materials are exactly what its assignment lists.

The producers' and the implementer's templates are data under headings their profiles refer to by name: keep the headings verbatim, keep only the material lines of the selected mode and **Write to**, as their comments mark, and omit a section marked optional when it has nothing. Their slots:

- `Seat` — Worktree, Branch, Turn commit, Supporting folder (`../reference/run/state.md` § Names, § Terms), and Subagent model (`../reference/conventions/agents.md`); the implementer adds its Base branch.
- `Mode` — one of the profile's modes.
- `Brief` — a lane's brief, verbatim, when it has one.
- `Materials` — per mode.
- `Threads addressed to you` — every thread awaiting the role, or `none`.
- `Malformed files` — the `rp check` `INVALID` lines naming files the role wrote.
- `Write to` — the artifact path.
- `Guardrails`, `Resources` — the `.rp.md` blocks whose `agents` include the profile, or `none`.
- `Commit format` — the **Commit format** convention.

The reviewer's templates are the request itself, one per turn: `reviewer-first.md` when its lane has no open review thread, `reviewer-later.md` when that thread awaits it. Drop each sentence or paragraph whose slot has nothing — the `INVALID` lines, later inputs, guardrails, resources — and fill the rest as above. Its `<branch>`, `<base>`, and `<turn commit>` are the `branch`, `base`, and `change` its `rp review` printed; its `<thread path>` is the lane's review thread, a new one named per `../reference/run/state.md` § Threads on a first turn; its `<diff path>` is the lane's prepared file (`../reference/run/loop.md` § Review lanes); its later inputs are every later input.
