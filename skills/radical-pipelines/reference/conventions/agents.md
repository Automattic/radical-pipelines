# Agents

Defaults for the run configuration: each profile's model and named lanes.

The owner writes the `Agents` section in any human-readable format. Interpret it when proposing a run configuration. A profile without defaults uses your model and no named lanes.

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's model unless it has its own.
- `brief` — what the lane focuses on: for a review lane, the angle it verifies; for a production lane, the direction it explores. Copied verbatim into the prompt's **Brief** section.
- `materials` — which files of the review package (`../run/state.md` § Terms) a review lane receives; it can still reach the other files through the references inside those files. **Diff**, **Brief**, and **Write to** are always supplied.
- `after` — production lanes whose approved artifacts this lane receives and waits for.

Review lanes run in addition to the implicit lane; each adds its own verdict. Production lanes change how the root artifact is made: each lane writes a candidate, and the producer then consolidates the candidates into the root artifact instead of writing it directly.

The implicit lane has no id, no brief, all materials, and the profile's model.
