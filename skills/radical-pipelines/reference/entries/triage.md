# Triage

The owner brings work: an issue, PR feedback, a CI failure, a bug, a correction. You classify it, route it, and only then dispatch. Read `../run/state.md` first.

Triage decides from the request, the pipelines' phase-0 files, and `rp check`. What the request points to — code, logs, results, screenshots, machines — is read by the roles you wake, once phase 0 records it per `intent-format.md`.

## Steps

### 1. Normalize into an issue

Every pipeline traces to an issue. If the request has none, run `manage-issues.md` to create it, then continue. Resolve the canonical issue reference through the **Issues** convention.

### 2. Scan

`git fetch`, then `rp pipelines <repo path> --base <artifact base branch> --issue <canonical issue reference>` (`../run/state.md` § Discovery), and `rp check <pipeline folder>` on each live pipeline of the current format: every pipeline that references the issue, its branch, its frontier, and its pending escalations. A merged pipeline is taken as `rp pipelines` lists it, its files read from the base branch's tree.

When the issue declares dependencies on other issues, check them through the **Issues** convention: surface any that are not closed and let the owner choose to proceed or wait. An issue with no declared dependencies, or whose dependencies' state the tracker cannot report, proceeds without comment.

### 3. Route

A request carries one or more statements; route each by the first predicate that holds:

| Predicate                                                                           | Route                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A pending escalation exists and the request answers it                              | Record the answer (`../run/loop.md` § Owner escalation) and continue that pipeline |
| A live pipeline's intent, constraints, and proposals already call for this work      | Continue it                                                               |
| The request concerns what an existing pipeline's artifacts state or its code does   | Later input on that pipeline                                              |
| A change of scope for a live pipeline                                               | The owner's choice: rescope it, or a new pipeline from its tip (next row)  |
| New intent that starts from another pipeline's unmerged tip                         | A new pipeline whose branch starts at that tip; `origin: starts-from` names that branch |
| New intent re-attempting an existing pipeline differently                           | A new pipeline; `origin: re-attempts` names it                            |
| New intent                                                                          | A new pipeline from the base branch                                       |

A pipeline of an earlier format is history, never continued and never given later input: work on its issue routes as new intent, from the base branch or, by the owner's choice, from that pipeline's tip.

When several live pipelines match, take the one the request identifies — by name, or as the only one whose frontier it advances; otherwise ask the owner in step 4 which pipeline, and, for a new pipeline, which tip to start from.

Group the routed statements by pipeline; each group is one run.

### 4. Confirm the runs

A run needs the owner's confirmation when it writes an intent, constraint, or proposal, its pipeline has no `run-config.md` or the request changes it, or steps 1 to 3 left a question open. Every other run starts under its `run-config.md` without one.

For the runs that need it, propose each run's configuration: its current `run-config.md`, else the **Agents** defaults. In one message, give:

- each route and why — or, when no predicate decides, the one deciding question;
- the text of each intent, constraint, or proposal you will write;
- the configuration to confirm or change: target phase in plain language without phase numbers, lanes, models;
- what a lane change does to the tree: a dropped production lane's folder is removed;
- the questions steps 1 to 3 left open.

Revise and reconfirm until the owner confirms.

### 5. Prepare

Prepare every route of a run before starting it. Address every worktree by absolute path and run its Git commands through `git -C <worktree>`.

**A new pipeline**

1. Pipeline slug and branch per `../run/state.md` § Names.
2. Branch at the chosen start ref; worktree per **Worktree folder root**.
3. `<pipelines folder root>/<pipeline slug>/0-intent/intent.md`, synthesized from the whole issue by `intent-format.md`; `origin: starts-from` records the starting branch and `origin: re-attempts` the prior pipeline's slug.
4. Commit it per the **Commit format** convention.

Every branch and worktree you create — the pipeline's here, a lane's later — fires its `before-`/`after-creating-branch` and `-creating-worktree` hooks (`../conventions/lifecycle-hooks.md`); `after-creating-pipeline` fires once the intent is committed.

**Later input**

1. Use a live pipeline's branch and worktree; for a merged pipeline, create a branch named per `../run/state.md` § Names from the base branch, with a worktree. One live branch per pipeline; later input joins it.
2. Write the input per `intent-format.md` § Later input and commit it.

**Continue**

1. Use the pipeline's branch and worktree, creating them when this machine lacks them; for a merged pipeline, create the branch named in `../run/state.md` § Names from the base branch.

**Rescope**

1. Modify the issue (`manage-issues.md`).
2. Re-synthesize `intent.md` (`intent-format.md`) and commit it.
3. Continue.

### 6. Run

Start one run at a time, in the order of the Route table; each run handles the statements routed to its pipeline. Record any direction about the work that no route consumed through Later input. Write `run-config.md` (`../run/state.md` § Run configuration) with the current `format` and the configuration the run starts under; commit. Then fire `run-started` and follow `../run/loop.md`.
