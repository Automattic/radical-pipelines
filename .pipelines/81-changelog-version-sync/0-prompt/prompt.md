# Track changes with a changelog and keep the plugin version in sync

## Goal

Repository changes are tracked in a changelog, and the project version stays
synchronized everywhere it appears — at minimum `package.json` and the Claude
Code plugin manifest `.claude-plugin/plugin.json`.

## Constraints

- Use the Changesets library to manage the changelog and version bumps.

## Context

- The repo ships two versioned things: the Pi package (`package.json`) and the
  Claude Code plugin (`.claude-plugin/plugin.json`). Changesets natively manages
  `package.json`; the plugin version must be kept in step with it.

## Assumptions / directions to explore

- `.claude-plugin/marketplace.json` references the plugin by source and carries
  no version of its own, so it likely needs no sync. (Looks confirmed from a
  quick read — worth verifying.)
- Changesets controls `package.json` by default; a sync mechanism (e.g. a script
  wired into the version step) will be needed to propagate the version to
  `plugin.json`.

---

_Source issue: https://github.com/Automattic/radical-pipelines/issues/81_
