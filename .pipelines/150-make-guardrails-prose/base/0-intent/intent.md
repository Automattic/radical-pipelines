# Make guardrails prose

> Source: GitHub issue [Automattic/radical-pipelines#150](https://github.com/Automattic/radical-pipelines/issues/150).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Guardrails are prose. Every guardrail is expressed as prose, and the exit-code (`exit 0`) machinery is removed.

## Context

Passing prose rules to the agents is sometimes more useful than runnable commands. A concrete example from the Radical Pipelines project itself: adding guardrails for the build reviewer and the document reviewer with specific rules similar to those in `AGENTS.md`.

## Assumptions / directions to explore

- When a guardrail _is_ a command, express it as prose too — e.g. _"run this command and check that it doesn't fail: [command]"_.
- From the issue discussion: today the `agents:` field admits only `build-writer-tdd`, `build-writer-e2e`, `build-reviewer`, `document-writer`, `document-reviewer` — a restriction that makes sense while guardrails are exit-code commands. Once guardrails are prose, project-owned judgment rules (e.g. design-taste rules such as YAGNI or KISS) naturally target other agents too; the discussion proposed extending the audience to the spec and design-doc agents (lead and reviewer).
- From the owner, pre-pipeline: extend the allowed `agents:` audience to **all** pipeline agents, not only the spec and design-doc lead and reviewer.
- Open question from the owner: how far the removal goes is unresolved — whether command-backed guardrails survive as a distinct kind (possibly keeping the fixed/scoped `{scope}` machinery and its per-run fill lifecycle), or every guardrail folds into plain prose with no separate command field. To be settled in the spec phase.
