# Agents

Defaults for the run configuration: each profile's model, subagent model, and lanes.

The owner writes the `Agents` section in any human-readable format, one block per profile: `spec-producer`, `design-doc-producer`, `implementer`, `reviewer`. Interpret it when proposing a run configuration. A profile without defaults uses your model and no lanes.

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's model unless it has its own.
- `subagents` — the model the profile's roles delegate to. A lane inherits the profile's unless it has its own; without one, it is the role's own model.
- `lanes` — named lanes, each with an `id` and optionally a `brief` and its own `model` and `subagents`. A brief is copied verbatim into the assignment's **Brief** section; a lane without one covers its profile's whole scope.
  - `spec-producer` and `design-doc-producer` take production lanes: each lane writes a candidate exploring its brief, or the whole artifact, and the producer consolidates the candidates into the artifact.
  - `reviewer` takes review lanes: each lane reviews the change within its brief, or wholly, and every lane must approve. Without a `reviewer` lane, one lane `default` runs; a project may declare `default` itself, with or without a brief, alongside others.
