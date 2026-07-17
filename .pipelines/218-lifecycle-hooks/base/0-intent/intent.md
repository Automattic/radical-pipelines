# Lifecycle hooks: let conventions define orchestrator actions at defined pipeline moments

> Source: GitHub issue [Automattic/radical-pipelines#218](https://github.com/Automattic/radical-pipelines/issues/218).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Project owners can attach their own instructions to defined moments in a pipeline's lifecycle — creating a branch, creating a worktree, merging a PR, and so on — and the orchestrator runs those instructions when it reaches each moment. This lets a project add behavior such as syncing a tracker, posting messages or comments, or doing cleanup, without modifying the generic skill.

## Context

- Today, project-specific lifecycle behavior is hard-coded into conventions — e.g. this project's `.rp.md` bakes Linear status/label sync and branch-push steps into an "Orchestrator updates during a run" section — which a hooks mechanism would generalize.
- Related open issues:
  - [#99](https://github.com/Automattic/radical-pipelines/issues/99) — a generated `.rp.md` should hold only project-specific config, never duplicate generic skill behavior; its principle (`.rp.md` records values, the skill owns behavior) is the same de-duplication pattern hooks serve.
  - [#180](https://github.com/Automattic/radical-pipelines/issues/180) — the Integrate phase (merging, closing, opening the PR, handling review feedback, run-level acceptance) defines pipeline-tail lifecycle moments where hooks would fire.
  - [#65](https://github.com/Automattic/radical-pipelines/issues/65) — initializing a pipeline's working environment (e.g. installing dependencies, starting services) before agents begin work is a "worktree created" moment where hooks would fire; who owns that initialization is open.

## Assumptions / directions to explore

_(open — to confirm or revise in later phases)_

- Implement as a new "lifecycle convention" (a hooks system): the skill names a hook at each specific point (branch created, worktree created, PR merged, …) and, at that point, says "if the convention defines something for this hook, run it" — doing nothing when the convention is silent.
- The set of hook points and their naming are open.
