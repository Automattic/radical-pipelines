# Triage

The owner brings work: an issue, PR feedback, a CI failure, a bug, a correction. You classify it, route it, and only then dispatch. Read `../run/state.md` first.

Triage decides from the request, the pipelines' phase-0 files, and `rp check`. What the request points to — code, logs, results, screenshots, machines — is read by the roles you wake, once phase 0 records it per `intent-format.md`.

## Steps

### 1. Normalize into an issue

Every pipeline traces to an issue. If the request has none, run `manage-issues.md` to create it, then continue. Resolve the canonical issue reference through the **Issues** convention.

### 2. Scan

`git fetch`, fast-forward the artifact base branch to its upstream, then `rp pipelines <pipelines folder root> --base <artifact base branch> --issue <canonical issue reference>` (`../run/state.md` § Discovery), and `rp check <pipeline folder>` on each live pipeline: every pipeline that references the issue, its branch, its frontier, and its pending escalations. A merged pipeline is taken as `rp pipelines` lists it, its files read from the artifact base branch's tree.

When the issue declares dependencies on other issues, check them through the **Issues** convention: surface any that are not closed and let the owner choose to proceed or wait. An issue with no declared dependencies, or whose dependencies' state the tracker cannot report, proceeds without comment.

### 3. Route

A request carries one or more statements; route each by the first predicate that holds:

| Predicate                                                                           | Route                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A pending escalation exists and the request answers it                              | Record the answer (`../run/loop.md` § Owner escalation) and continue that pipeline |
| The request adds nothing to a live pipeline: its frontier names this work, or its intent, constraints, and proposals already call for it | Continue it |
| The request concerns what an existing pipeline's artifacts state or its code does, or brings commits the owner made on its branch | Later input on that pipeline |
| A change of scope for a live pipeline                                               | The owner's choice: rescope it, or a new pipeline from its tip (next row)  |
| New intent that starts from another pipeline's unmerged tip                         | A new pipeline whose branch starts at that tip; the intent's `starts-from` names that branch |
| New intent re-attempting an existing pipeline differently                           | A new pipeline; the intent's `re-attempts` names it                       |
| New intent                                                                          | A new pipeline from the artifact base branch                              |

When several live pipelines match, take the one the request identifies — by name, or as the only one whose frontier it advances; otherwise ask the owner in step 4 which pipeline, and, for a new pipeline, which tip to start from.

Group the routed statements by pipeline; each group is one run.

### 4. Confirm the runs

A run needs the owner's confirmation when it writes an intent, constraint, or proposal, its pipeline has no `config.json` or the request changes it, or steps 1 to 3 left a question open. Every other run starts under its `config.json` without one.

For the runs that need it, propose each run's configuration: its current `config.json`, else the **Lanes** and **Models** defaults (`../conventions/lanes.md`, `../conventions/models.md`). In one message, give:

- each route and why — or, when no predicate decides, the one deciding question;
- the text of each intent, constraint, or proposal you will write;
- the configuration to confirm or change: target phase in plain language without phase numbers, and lanes;
- each profile's and lane's model and subagent model;
- under each profile, the name of each guardrail and resource the run will carry for it;
- what a lane change does to the tree: a dropped production lane's folder is removed;
- the questions steps 1 to 3 left open.

Revise and reconfirm until the owner confirms.

### 5. Prepare

Prepare every route of a run before starting it. Address every worktree by absolute path and run its Git commands through `git -C <worktree>`.

First, start the run:

1. Take the pipeline branch: a live pipeline's own, named without its remote when `rp pipelines` lists it at a remote, and for a new or a merged pipeline the one `../run/state.md` § Names gives. One live branch per pipeline; later input joins it.
2. Write the pipeline configuration the run starts under (`../run/state.md` § Pipeline configuration) to a file outside the repository. A merged pipeline's `base-branch` is the artifact base branch.
3. Apply the plan of `rp start <pipeline folder> --branch <pipeline branch> --config <file>` (`../conventions/lifecycle-hooks.md` § Applying a plan), passing the pipeline folder's absolute path in the main checkout. It creates the pipeline branch and worktree this machine lacks, writes `config.json` there, and prints the pipeline folder in the pipeline worktree, which every later command takes.

Then prepare each route in the pipeline worktree:

**A new pipeline**

1. `0-intent/intent.md` in the pipeline folder, synthesized from the whole issue by `intent-format.md`; `starts-from` records the starting branch and `re-attempts` the prior pipeline's slug.

`after-creating-pipeline` fires once the intent is committed.

**Later input**

1. Write the input per `intent-format.md` § Later input and commit it.

**Rescope**

1. Modify the issue (`manage-issues.md`).
2. Re-synthesize `intent.md` (`intent-format.md`) and commit it.

Last, commit `config.json` per the **Commit format** convention; a new pipeline commits it with its intent.

### 6. Run

Start one run at a time, in the order of the Route table; each run handles the statements routed to its pipeline. Record through Later input every statement a role must act on that no route consumed. Then fire `run-started` and follow `../run/loop.md`.
