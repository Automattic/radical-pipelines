# Lifecycle hooks

At each configured moment in either workflow, run the project's prose instructions with the pipeline and phase context. Include the route at `run-started` and the cause at `run-ended`.

Report a failed instruction to the owner and continue. An instruction marked **blocking** stops the run through normal close-out; `run-ended` still fires.

## Hook points

| Hook                | Moment                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `run-started`       | Work on a pipeline begins, before dispatch                                                               |
| `phase-completed`   | A phase becomes complete, before the next dispatch                                                       |
| `escalation-raised` | A pending owner escalation is surfaced                                                                   |
| `run-ended`         | The run stops: target phase complete, owner escalation pending, valve, owner cancellation, or failure   |
| `before-opening-pr` | A pull request is about to be opened                                                                     |
| `after-opening-pr`  | The pull request exists                                                                                  |
| `before-merging-pr` | A pull request is about to be merged                                                                     |
| `after-merging-pr`  | The pull request is merged                                                                               |

A `before-`/`after-` pair brackets its action. A blocking failure in a `before-` hook stops that action.

## Format

Each configured hook is a block under `.rp.md`'s `Lifecycle hooks` section:

```markdown
### <hook>

<instructions; mark an instruction **blocking** when required>
```
