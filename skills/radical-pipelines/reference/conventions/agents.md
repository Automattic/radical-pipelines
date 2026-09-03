# Agents

How the project configures the agents it runs: the model of each profile, and the lanes it adds.

## Format

Blocks under `.rp.md`'s `Agents` section, one per profile. A profile with no block runs with your own model and no named lanes.

```markdown
#### researcher

- model: <model, in the active tool's form, or a name the tool section defines>

#### spec-producer

- model: <model>
- lane event-driven:
  - brief: Explore an event-driven design; the spec's obligations are unchanged.
- lane contrarian:
  - after: event-driven
  - brief: Diverge from the lanes you receive; find the path they did not take.
  - model: <model>

#### build-reviewer

- model: <model>
- lane fresh:
  - brief: Review as a reader of the pull request would — what it does, whether it holds.
  - materials: intent, diff
```

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's unless it names its own.
- `lane <id>` — a named lane; `<id>` is a valid path and ref segment. A reviewer's named lanes review **in addition to** its implicit lane. A producer's named lanes **replace** its root synthesis: each produces in `<phase>/<id>/`, and the root artifact is their consolidation.
- `brief` — the lane's angle: for a reviewer, what it verifies (without a brief, everything its profile covers); for a producer, what it explores. Reaches the agent verbatim under **Brief**.
- `materials` — the subset of the template's materials the lane receives; without it, all of them.
- `after` — production lanes only: the lanes whose approved artifacts this one receives, and waits for.

The implicit lane has no id, no brief, all materials, the profile's model; in the assisted workflow it is the owner's approval.
