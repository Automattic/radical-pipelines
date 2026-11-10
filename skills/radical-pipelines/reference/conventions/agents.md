# Agents

Defaults for the run configuration: each profile's model, subagent model, and lanes.

The Agents section holds an entry per profile — `spec-producer`, `design-doc-producer`, `implementer`, `reviewer` — and each of its lanes is an entry one heading level beneath it, its brief as its text (`load.md` § Conventions):

```markdown
### Agents

#### spec-producer

- model: `opus`
- subagents: `sonnet`

##### demands

- model: `opus`

Read the intent for what it demands.
```

Propose them when confirming a run. A profile without defaults uses your model and no lanes. `.rp.local.md`'s Agents entries give only `model` and `subagents`, for a profile or for a lane the run declares: they pin this clone's models (`../run/state.md` § Run configuration), and are never proposed.

## Fields

- `model` — the model name to spawn the profile on, as the project writes it. A lane inherits the profile's model unless it has its own.
- `subagents` — the model name the profile's roles delegate to. A lane inherits the profile's unless it has its own; without one, it is the role's own model.
- Lanes — named lanes by id, each optionally with a brief and its own `model` and `subagents`. A brief is a text, copied into the lane's assignment as written, its placeholders expanded.
  - `spec-producer` and `design-doc-producer` take production lanes: each lane writes a candidate exploring its brief, or the whole artifact, and the producer consolidates the candidates into the artifact.
  - `reviewer` takes review lanes: each lane's brief is the review request its assignment carries, replacing the default request in `../../templates/reviewer-first.md`, and every lane must approve. Without a `reviewer` lane, one lane `default` runs; a project may declare `default` itself, with or without a brief, alongside others.
