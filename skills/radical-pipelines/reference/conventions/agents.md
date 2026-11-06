# Agents

Defaults for the run configuration: each profile's model, subagent model, and lanes.

They are the `agents` entry of `.rp.md`'s frontmatter, one entry per profile: `spec-producer`, `design-doc-producer`, `implementer`, `reviewer` (`../../scripts/README.md` § Conventions data). Propose them, with `.rp.local.md`'s entries over them, when confirming a run. A profile without defaults uses your model and no lanes.

```json
"agents": {
  "spec-producer": { "model": "opus", "subagents": "sonnet", "lanes": { "a": { "brief": "…" }, "b": { "model": "sonnet" } } },
  "reviewer": { "lanes": { "default": { "model": "opus" }, "second": { "model": "astra", "subagents": "luna" } } }
}
```

## Fields

- `model` — the model name to spawn the profile on, as the project writes it. A lane inherits the profile's model unless it has its own.
- `subagents` — the model name the profile's roles delegate to. A lane inherits the profile's unless it has its own; without one, it is the role's own model.
- `lanes` — named lanes by id, each optionally with a `brief` and its own `model` and `subagents`. A brief is a text, copied verbatim into the lane's assignment.
  - `spec-producer` and `design-doc-producer` take production lanes: each lane writes a candidate exploring its brief, or the whole artifact, and the producer consolidates the candidates into the artifact.
  - `reviewer` takes review lanes: each lane's brief is the review request its assignment carries, replacing the default request in `../../templates/reviewer-first.md`, and every lane must approve. Without a `reviewer` lane, one lane `default` runs; a project may declare `default` itself, with or without a brief, alongside others.
