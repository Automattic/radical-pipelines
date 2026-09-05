# Lifecycle hooks

At each configured moment in either workflow, run the project's prose instructions with the pipeline and phase context. Include the route at `run-started` and the cause at `run-ended`.

Report a failed instruction to the owner and continue. An instruction marked **blocking** stops the run through normal close-out; `run-ended` still fires.

## Hook points

| Hook                           | Moment                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `before-creating-pipeline`     | A pipeline is about to be created, before any step                                                      |
| `after-creating-pipeline`      | The pipeline exists: branch, worktree, pipeline folder, and committed intent                             |
| `run-started`                  | Work on a pipeline begins — created, continued, or amended — before dispatch                            |
| `before-creating-branch`       | A pipeline branch or lane branch is about to be created                                                 |
| `after-creating-branch`        | A pipeline branch or lane branch is created                                                             |
| `before-creating-worktree`     | A worktree is about to be created or recreated — the pipeline's or a lane's                             |
| `after-creating-worktree`      | A worktree is created or recreated                                                                      |
| `phase-started`                | Work on a phase begins or resumes                                                                       |
| `phase-completed`              | A phase becomes complete, phase 0 included, before the next dispatch                                    |
| `before-merging-lanes`         | Lane branches are about to be merged into the pipeline branch                                           |
| `after-merging-lanes`          | Lane branches are merged into the pipeline branch                                                       |
| `escalation-raised`            | A pending owner escalation is surfaced                                                                  |
| `run-ended`                    | The run stops: target phase complete, owner escalation pending, valve, owner cancellation, or failure   |
| `before-opening-pr`            | The owner asks to open a pull request, before any work                                                  |
| `after-opening-pr`             | The pull request exists                                                                                 |
| `before-merging-pr`            | The owner asks to merge the pull request, before any work                                               |
| `after-merging-pr`             | The pull request is merged — by the orchestrator, or by the owner who reports it                        |
| `before-closing-without-merge` | The owner asks to close the pipeline without merging                                                    |
| `after-closing-without-merge`  | The pipeline is closed without merging                                                                  |

A `before-`/`after-` pair brackets its action. A blocking failure in a `before-` hook stops that action. The closure pairs bracket the actions the owner invokes on a pipeline (`../run/close-out.md`).

## Format

Each configured hook is a block under `.rp.md`'s `Lifecycle hooks` section:

```markdown
### <hook>

<instructions; mark an instruction **blocking** when required>
```
