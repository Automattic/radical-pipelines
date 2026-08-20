# Lifecycle Hooks

The **Lifecycle hooks** convention attaches project instructions to defined moments of a pipeline's lifecycle — syncing a tracker, posting notifications, cleanup. When the orchestrator reaches a hook's moment, it runs the instructions the convention defines for that hook, then proceeds; where the convention is silent, it proceeds directly.

## Execution

- A hook's instructions are prose; the orchestrator interprets and executes them with its own tools, in both workflow modes.
- Apply the moment's context: the pipeline, run, and phase at hand, and — for `run-started` — the reason work began.
- When an instruction fails, report the failure to the owner and continue. When the failing instruction is marked **blocking**, stop the run instead; the stop takes the run's normal close-out, so `run-ended` still fires.

## Hook points

| Hook                            | Moment                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pipeline-created`              | The pipeline exists: base run branch, worktree, pipeline family folder, and committed intent               |
| `run-started`                   | Work on a run begins — the pipeline was created, resumed, revised, or forked — before anything is launched |
| `branch-created`                | A run branch or lane branch is created                                                                     |
| `worktree-created`              | A worktree is created, or recreated on resume                                                              |
| `phase-started`                 | A phase begins                                                                                             |
| `phase-completed`               | A phase's completion predicate is satisfied, before the next phase begins                                  |
| `lanes-merged`                  | A multi-lane phase's lane branches are merged into the run branch                                          |
| `phase-rolled-back`             | A resume reverts an in-progress active phase                                                               |
| `blocker-reported`              | An agent's blocker report arrives                                                                          |
| `run-ended`                     | The run stops — target phase completed, blocker, owner cancellation, or failure                            |
| `pr-opened`                     | The owner asks to open the pipeline's PR                                                                   |
| `pipeline-merged`               | The owner reports the pipeline merged                                                                      |
| `pipeline-closed-without-merge` | The owner closes the pipeline without merging                                                              |

## The `.rp.md` per-hook block

Each hook the project defines is captured as a block under a `Lifecycle hooks` section:

```markdown
### <hook>

<the instructions to run — an instruction may be marked **blocking**>
```

## Closure actions

The last three hooks are closure moments the owner invokes on a pipeline: opening its PR, recording its merge, closing it without merging. Each request is a firing point — fire the hook and report the outcome; the work itself lives in the hooks or with the owner.
