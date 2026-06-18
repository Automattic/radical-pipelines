# Make guardrails prose

> Source: GitHub issue Automattic/radical-pipelines#150 — https://github.com/Automattic/radical-pipelines/issues/150 (mirrored in Linear as BILLOW-87).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Guardrails are prose. Every guardrail is expressed as prose, and the exit-code (`exit 0`) machinery is removed.

## Context

Passing prose rules to the agents is sometimes more useful than runnable commands. A concrete example from the Radical Pipelines project itself: adding guardrails for the code reviewer and the docs reviewer with specific rules similar to those in `agents.md`.

## Assumptions / directions to explore

- When a guardrail *is* a command, express it as prose too — e.g. *"run this command and check that it doesn't fail: [command]"*.
