# Agents

Defaults for the run configuration: each profile's model and named lanes.

The owner writes the `Agents` section in any human-readable format. Interpret it when proposing a run configuration. A profile without defaults uses your model and no named lanes.

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's model unless it has its own.
- Named lane `id` — identifies the lane.
- `brief` — the review angle or production exploration, passed verbatim under **Brief**.
- `materials` — review-package members selected for a review lane. Its references supply historical material. **Diff**, **Brief**, and **Write to** remain in the prompt.
- `after` — production lanes whose approved artifacts this lane receives and waits for.

Review lanes supplement the implicit lane. Production lanes replace root synthesis with candidates and consolidation.

The implicit lane has no id, no brief, all materials, and the profile's model.
