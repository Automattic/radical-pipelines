# Agents

Defaults for the run configuration: each profile's model and lanes.

The owner writes the `Agents` section in any human-readable format, one block per profile: `spec-producer`, `design-doc-producer`, `implementer`, `reviewer`. Interpret it when proposing a run configuration. A profile without defaults uses your model and no lanes.

## Fields

- `model` — what to spawn the profile on. A lane inherits the profile's model unless it has its own.
- `lanes` — named lanes, each with an `id`, a `brief`, and optionally its own `model`. The brief is copied verbatim into the prompt's **Brief** section.
  - `spec-producer` and `design-doc-producer` take production lanes: each lane writes a candidate exploring its brief, and the producer consolidates the candidates into the artifact.
  - `reviewer` takes review lanes: each lane reviews the change within its brief, and every lane must approve.
