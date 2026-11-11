# Lifecycle hooks

At each configured moment of a run, follow the instructions the project wrote for that hook, knowing which pipeline, run, and phase you are in. Include the route at `run-started` and the cause at `run-ended`. A worktree's hooks also know the role the worktree is for, the pipeline worktree being for every role without a lane; a spawning or terminating hook knows the role, and a spawned role's resources are those its plan names (`../run/loop.md`).

Report a failed instruction to the owner and continue. When the failed instruction is marked **blocking**, stop the run through close-out; if you are already closing out, continue with the remaining close-out actions. `run-ended` still fires.

## Hook points

| Hook                           | Moment                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `before-creating-pipeline`     | A pipeline is about to be created, before any step                                                      |
| `after-creating-pipeline`      | The pipeline exists: branch, worktree, pipeline folder, and committed intent                             |
| `run-started`                  | Work on a pipeline begins — created, continued, or corrected — before dispatch                          |
| `before-creating-branch`       | Triage is about to create a branch                                                                      |
| `after-creating-branch`        | Triage created a branch                                                                                 |
| `before-creating-worktree`     | A worktree is about to be created or recreated                                                          |
| `after-creating-worktree`      | A worktree is created or recreated                                                                      |
| `before-removing-worktree`     | A worktree is about to be removed                                                                       |
| `after-removing-worktree`      | A worktree is removed                                                                                   |
| `before-spawning-agent`        | A role is about to be spawned                                                                           |
| `after-spawning-agent`         | A role is spawned                                                                                       |
| `before-terminating-agent`     | A role is about to be terminated                                                                        |
| `after-terminating-agent`      | A role is terminated                                                                                    |
| `phase-started`                | Work on a phase begins or resumes                                                                       |
| `phase-completed`              | A phase becomes complete, phase 0 included, before the next dispatch                                    |
| `before-landing-lane`          | A lane branch's commits are about to land on the pipeline branch, merged or cherry-picked               |
| `after-landing-lane`           | A lane branch's commits landed on the pipeline branch                                                   |
| `escalation-raised`            | A pending owner escalation is surfaced                                                                  |
| `run-ended`                    | The run stops: target phase complete, owner escalation pending, owner cancellation, or failure           |
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
