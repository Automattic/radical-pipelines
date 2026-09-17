# Agents

Defaults for the run configuration: each profile's model and named lanes.

The owner writes the `Agents` section in any human-readable format. Interpret it when proposing a run configuration. A profile without defaults uses your model and no named lanes.

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's model unless it has its own.
- `brief` — the review angle or production exploration, passed verbatim under **Brief**.
- `materials` — the members of the review package (`../run/state.md` § Terms) a review lane receives; the package's references supply the rest. **Diff**, **Brief**, and **Write to** are always supplied.
- `after` — production lanes whose approved artifacts this lane receives and waits for.

Review lanes supplement the implicit lane. Production lanes replace root synthesis with candidates and consolidation.

The implicit lane has no id, no brief, all materials, and the profile's model.
