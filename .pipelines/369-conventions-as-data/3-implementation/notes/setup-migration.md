# Setup migration, followed from the skill's prose

A subagent on `claude-agent/sonnet`, the model opencode's `opencode.models` finds by `sonnet` in the caller's provider, acted as the orchestrator. It followed `load.md`, `setup.md` § Migration and § Write, `changelog.md`, and `scripts/README.md` § Conventions data and § Placeholders, cold, on a version-6 `.rp.md` (`v6.rp.md` beside this file). That file's resource `staging environment` uses `{agent}`, and its `after-creating-worktree` hook defines `{agent}` as `<pipeline slug>-<profile>[-<lane>]`. The owner confirmed every action and accepted every offered variable.

It walked § 7, which changes nothing, then § 8. It moved Commit format, Guardrails, Resources, and Agents into the frontmatter with their values and texts unchanged, and removed those sections from the body. It offered `agent` with the template `{pipeline-slug}-{role}`, citing the hook's definition and the vocabulary's `role` row. Its output is `migrated-v6.rp.md` beside this file; only the frontmatter is kept there.

`rp assign`, run on that `.rp.md` for pipeline `42-export`:

```text
$ rp assign <pipeline worktree>/.pipelines/42-export --role implementer
### staging environment

- resource: Each agent has its own staging environment `42-export-implementer`, at `https://42-export-implementer.staging.example.com`. Start it with `npm run env:start 42-export-implementer` and reset it with `npm run env:reset 42-export-implementer`.

$ rp review <pipeline worktree>/.pipelines/42-export --lane default; git worktree add .worktrees/42-export-review-default 42-export-review-default
$ rp assign <pipeline worktree>/.pipelines/42-export --role reviewer-default
### staging environment

- resource: Each agent has its own staging environment `42-export-reviewer-default`, at `https://42-export-reviewer-default.staging.example.com`. Start it with `npm run env:start 42-export-reviewer-default` and reset it with `npm run env:reset 42-export-reviewer-default`.
```

Neither assignment lists the vocabulary.

The subagent reported one inconsistency in the prose. `setup.md` § Write named Commit format, Guardrails, Resources, and Agents as data, but not Variables, which `load.md` and `scripts/README.md` § Conventions data place in the frontmatter.
