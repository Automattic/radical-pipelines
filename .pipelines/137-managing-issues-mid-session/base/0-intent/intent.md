# Orchestrator skips the Managing Issues workflow when opening an issue mid-session

> Source: GitHub issue #137 — https://github.com/Automattic/radical-pipelines/issues/137.
> This file is self-contained; agents do not need to open the source issue.

## Goal

Whenever the orchestrator creates or modifies an issue partway through a "work on an issue" session (which includes running a pipeline), it reliably follows the Managing Issues workflow — the short owner-led capture Q&A, and routing every tracker operation through the Issues convention — the same way it does when a session starts at that entry point.

## Assumptions / directions to explore

_(open — later research may confirm or overturn these)_

- The cause is likely that the skill's entry point gets lost over a long session, so by the time an issue needs to be opened the orchestrator no longer has the Managing Issues steps in view.
