# Lifecycle Hooks

The **Lifecycle hooks** convention attaches project instructions to defined moments of a pipeline's lifecycle. When the orchestrator reaches a hook's moment, it runs the instructions the convention defines for that hook, then proceeds; where the convention is silent, it proceeds directly.

## Execution

- A hook's instructions are prose; the orchestrator interprets and executes them with its own tools, in both workflow modes.
- Apply the moment's context: the pipeline, run, and phase at hand, and — for `run-started` — the reason work began.
- When an instruction fails, report the failure to the owner and continue. When the failing instruction is marked **blocking**, stop the run instead; the stop takes the run's normal close-out, so `run-ended` still fires.

## Hook points

| Hook                            | Moment                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `before-creating-pipeline-family` | The family's first pipeline is about to be created, before any step                                       |
| `after-creating-pipeline-family` | The family's first pipeline exists: base run branch, worktree, pipeline family folder, and committed intent |
| `run-started`                   | Work on a run begins — the pipeline was created, resumed, revised, amended, or forked — before anything is launched |
| `before-creating-branch`        | A run branch or lane branch is about to be created                                                         |
| `after-creating-branch`         | A run branch or lane branch is created                                                                     |
| `before-creating-worktree`      | A worktree is about to be created, or recreated on resume                                                  |
| `after-creating-worktree`       | A worktree is created, or recreated on resume                                                              |
| `phase-started`                 | Work on a phase begins or resumes                                                                          |
| `phase-completed`               | A phase's completion predicate is satisfied, before the next phase begins                                  |
| `before-merging-lanes`          | A multi-lane phase's lane branches are about to be merged into the run branch                              |
| `after-merging-lanes`           | A multi-lane phase's lane branches are merged into the run branch                                          |
| `blocker-reported`              | An agent's blocker report arrives                                                                          |
| `run-ended`                     | The run stops — target phase completed, blocker, eject, owner cancellation, or failure                     |
| `before-opening-pr`             | The owner asks to open the pipeline's PR, before any work                                                  |
| `after-opening-pr`              | The pipeline's PR exists                                                                                   |
| `before-merging-pr`             | The owner asks to merge the pipeline's PR, before any work                                                 |
| `after-merging-pr`              | The pipeline's PR is merged                                                                                |
| `before-closing-without-merge`  | The owner asks to close the pipeline without merging                                                       |
| `after-closing-without-merge`   | The pipeline is closed without merging                                                                     |

A `before-`/`after-` pair brackets an action; a blocking failure in the `before-` hook stops that action. The closure pairs bracket the closure actions the owner invokes on a pipeline (`closure-actions.md`).

## The `.rp.md` per-hook block

Each hook the project defines is captured as a block under a `Lifecycle hooks` section:

```markdown
### <hook>

<the instructions to run — an instruction may be marked **blocking**>
```
