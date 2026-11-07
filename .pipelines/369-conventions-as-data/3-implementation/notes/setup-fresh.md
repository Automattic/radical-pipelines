# Fresh setup, followed from the skill's prose

A subagent on `claude-agent/sonnet`, the model opencode's `opencode.models` finds by `sonnet` in the caller's provider, acted as the orchestrator. It followed `load.md`, `setup.md` § Fresh setup and § Write, `agents.md`, `guardrails.md`, `resources.md`, and `scripts/README.md` § Conventions data and § Placeholders, cold, for a project with no `.rp.md`.

The owner's answers it was given:

- a commit format;
- a guardrail `lint` for the implementer and the reviewer;
- a resource `database` whose text uses `{agent}`, which the owner explained as the pipeline slug and the role joined by a hyphen;
- Agents for `implementer`, and two review lanes.

It wrote those as frontmatter data. It offered `agent` with the template `{pipeline-slug}-{role}` and wrote the other conventions as prose sections. Its frontmatter is `fresh-setup.rp.md` beside this file.

`rp assign`, run on that `.rp.md` for pipeline `42-export`, the paths shortened:

```text
$ rp assign .../.pipelines/42-export --role design-doc-producer
assignment <repo>/.git/rp/design-doc-producer.md
- Subagent model: your own model
## Guardrails
none
## Resources
none
## Commit format
Imperative subject line, with the profile in parentheses, for example `Add spec (spec-producer)`.

$ rp assign .../.pipelines/42-export --role implementer
assignment <repo>/.git/rp/implementer.md
model opus
- Subagent model: sonnet
### lint
- rule: Run `npm run lint` and fix every error.
### database
- resource: A Postgres database per agent, named `db_42-export-implementer`; connect with `psql db_42-export-implementer`.

$ rp review .../.pipelines/42-export --lane second; git worktree add .worktrees/42-export-review-second 42-export-review-second
$ rp assign .../.pipelines/42-export --role reviewer-second
assignment <repo>/.git/worktrees/42-export-review-second/rp/reviewer.md
model astra
### lint
- rule: Run `npm run lint` and fix every error.
### database
- resource: A Postgres database per agent, named `db_42-export-reviewer-second`; connect with `psql db_42-export-reviewer-second`.
Your subagents run on the model your tool finds by the name `luna`, or on your own model when it finds none.
```

The subagent reported that `health-monitoring.md` § Recovery still called Agents a section of `.rp.md`, although Agents is frontmatter data.
