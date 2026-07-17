# Spec: Lifecycle hooks

## Overview

A new optional **Lifecycle hooks** convention lets a project attach its own instructions to defined moments of a pipeline's lifecycle — creating a branch, completing a phase, ending a run, and so on. The orchestrator runs a hook's instructions when it reaches its moment and does nothing where the convention is silent. This moves project-specific lifecycle behavior (tracker sync, notifications, cleanup) out of hard-coded convention prose and into a generic mechanism.

The skill also gains three owner-invokable closure actions — opening the pipeline's PR, recording its merge, and closing it without merge — defined as pure hook firing points.

This repository's own `.rp.md` migrates its "Orchestrator updates during a run" section onto the mechanism, as the mechanism's first consumer.

## Requirements

### The convention

1. The skill defines a **Lifecycle hooks** convention, listed in `conventions/load.md`'s table as not required. A project's convention gives instructions per hook point; for hook points where it is silent, the orchestrator does nothing.
2. A hook's instructions are natural-language prose. The orchestrator interprets and executes them with its own tools when it reaches the hook's moment, before proceeding with the pipeline.
3. The orchestrator applies the moment's context when executing a hook — which pipeline, run, and phase it is at, and for `run-started` the reason the run started.
4. Hooks fire in both workflow modes (autonomous and assisted) and are executed only by the orchestrator, never by spawned agents.
5. `.rp.local.md` may override the Lifecycle hooks convention for a working copy, like other overridable conventions.

### Hook points

6. The skill names this closed list of hook points; each fires at the stated moment:

   | Hook                            | Moment                                                                                                                  |
   | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
   | `pipeline-created`              | The pipeline exists: base run branch, worktree, pipeline family folder, and committed intent                             |
   | `run-started`                   | Work on a run begins — the pipeline was created, resumed, revised, or forked — before anything is launched; the reason is part of the context |
   | `branch-created`                | A run branch or lane branch is created                                                                                   |
   | `worktree-created`              | A worktree is created, or recreated on resume                                                                            |
   | `phase-started`                 | A phase begins                                                                                                           |
   | `phase-completed`               | A phase's completion predicate is satisfied, before the next phase launches                                              |
   | `lanes-merged`                  | All lane branches of a multi-lane phase are merged into the run branch                                                   |
   | `phase-rolled-back`             | A resume reverts an in-progress active phase                                                                             |
   | `blocker-reported`              | An agent's blocker report arrives                                                                                        |
   | `run-ended`                     | The run stops for any reason — target phase completed, blocker, owner cancellation, or failure                           |
   | `pr-opened`                     | The owner asks to open the pipeline's PR                                                                                 |
   | `pipeline-merged`               | The owner reports the pipeline merged                                                                                    |
   | `pipeline-closed-without-merge` | The owner closes the pipeline without merging                                                                            |

### Failure handling

7. The convention may mark individual instructions within a hook as blocking; an unmarked instruction is non-blocking.
8. When a non-blocking instruction fails, the orchestrator reports the failure to the owner and the run continues.
9. When a blocking instruction fails, the run stops with the normal close-out for a stopped run — so `run-ended` still fires.

### Closure actions

10. The skill gains three owner-invokable actions — open the pipeline's PR, record its merge, close it without merging — that are pure firing points: each detects or receives its moment and fires its hook. The skill performs no git or platform actions in them; the work lives in the hooks or with the owner.

### Setup

11. The setup flow (`conventions/setup.md`) offers capturing lifecycle hooks when configuring a project.

### Migration of this repository's `.rp.md`

12. The "Orchestrator updates during a run" section is removed and its Linear items are re-expressed as hooks, preserving observable behavior: `run-started` → add the `running…` label, ensure exactly one version label matching the active pipeline, and assign the current Linear user; `phase-completed` → set the issue status to the completed phase; `run-ended` → remove the `running…` label.
13. The section's "Push at run close-out" item is removed without replacement: the skill's close-out already pushes in both modes.

## Out of Scope

- The full Integrate phase (#180) — PR review feedback handling and run-level acceptance stay there; here the closure actions are firing points only.
- The content of working-environment initialization (#65). Its ownership is settled — the orchestrator — but what it does and its use of `worktree-created` stay in that issue.
- The general sweep of #99 (every convention holding values only, behavior in the skill) — only this repository's lifecycle section migrates here.
- An executable, exit-code-judged hook form (guardrails style) — hooks are prose only.
- A hook replacing the removed push item.
- Git or platform actions inside the closure actions.
- Project-defined hook points beyond the closed list.

## Acceptance Criteria

1. **Given** a project whose conventions define no lifecycle hooks, **when** any hook point's moment is reached, **then** the orchestrator proceeds without any hook action.
2. **Given** a hook defined for a point in the list, **when** its moment is reached in an autonomous or assisted run, **then** the orchestrator executes its instructions with the moment's context before proceeding.
3. **Given** a hook instruction without a blocking mark that fails, **when** the hook runs, **then** the failure is reported to the owner and the run continues.
4. **Given** a hook instruction marked blocking that fails, **when** the hook runs, **then** the run stops, the close-out for a stopped run executes, and `run-ended` fires.
5. **Given** a finished pipeline, **when** the owner invokes opening its PR, recording its merge, or closing it without merge, **then** the corresponding hook fires and the skill itself performs no git or platform action.
6. **Given** the setup flow configuring a project, **when** it reaches conventions capture, **then** it offers defining lifecycle hooks.
7. **Given** a `.rp.local.md` that defines lifecycle hooks, **when** conventions are loaded in that working copy, **then** its hooks win over the committed ones.
8. **Given** this repository's migrated `.rp.md`, **when** a run starts, a phase completes, and a run ends, **then** the Linear issue receives the same label, status, and assignee updates as before the migration, and no push instruction remains in `.rp.md`.
