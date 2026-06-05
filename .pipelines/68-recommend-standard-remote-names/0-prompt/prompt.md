# Recommend standard remote names when setting up artifacts-in-fork mode

## Goal

When the owner sets up `artifacts-in-fork` mode, the orchestrator helps them land on clear, conventional git remote names instead of just recording whatever names happen to exist. The owner stays in control: the orchestrator recommends a default naming scheme and asks whether to apply it, but never renames a remote on its own. Whatever names end up in use are written into the convention so later phases reference them unambiguously.

## Constraints

- Renaming a git remote changes the owner's local git configuration, so the orchestrator must always confirm with the owner before renaming anything — never rename silently.

## Assumptions / directions to explore

_Open — to be confirmed or revised in later phases._

- Recommend the GitHub-standard scheme: the fork remote → `origin`, the canonical/upstream remote → `upstream`.
- Phrase it as a recommendation the owner can decline, e.g. "By default we recommend naming them this way. Do you want us to rename them, or leave them as they are?"
- Record which remote is which (the resolved names) in the convention/config so downstream steps don't re-guess.

---

_Source: GitHub issue [Automattic/radical-pipelines#68](https://github.com/Automattic/radical-pipelines/issues/68)._
