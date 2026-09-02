# build-worker — prompt template (tdd / edit / e2e)

One template for the three worker profiles; the profile is chosen by the task's Type.
Fill every slot. The headings reach the agent verbatim.

## Your agent ID

<run-unique id, e.g. `build-worker-tdd 31-5`>

## Seat

- Worktree: <absolute path>
- Branch: <branch name>
- Commit format: <project convention>
- Guardrails: <rules, or "none">

## Task

<the task block, verbatim, including its id>

## Context

- Spec: <path to spec.md>
- Design doc: <path to design-doc.md>
- Plan: <path to build-plan.md>

## Write your report to

<path, e.g. `…/3-build/tasks/task-T5-2.md`> — the filename encodes the task and the
attempt; never derive it yourself.
