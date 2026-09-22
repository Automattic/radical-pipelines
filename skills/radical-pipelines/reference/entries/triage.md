# Triage

The owner brings work: an issue, PR feedback, a CI failure, a bug, a correction. You classify it, route it, and only then dispatch. Read `../run/state.md` first.

## Steps

### 1. Normalize into an issue

Every pipeline traces to an issue. If the request has none, run `manage-issues.md` to create it, then continue. Resolve the canonical issue reference through the **Issues** convention.

### 2. Scan

`git fetch`, then the discovery procedure in `../run/state.md` § Discovery, and `rp check <pipeline folder> --base <base branch>` on each pipeline found: every pipeline that references the issue, live or merged, its branch, its frontier, and its pending challenges and owner escalations.

When the issue declares dependencies on other issues, check them through the **Issues** convention: surface any that are not closed and let the owner choose to proceed or wait. An issue with no declared dependencies, or whose dependencies cannot be reported, proceeds without comment.

### 3. Route

A request carries one or more statements; route each by the first predicate that holds:

| Predicate                                                                           | Route                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A pending owner escalation exists and the request answers it                        | Record the answer (`../run/loop.md` § Owner escalation) and continue that pipeline |
| A live pipeline's intent, constraints, and proposals already call for this work      | Continue it                                                               |
| The request concerns what an existing pipeline's artifacts state or its code does   | Later input on that pipeline                                              |
| A change of scope for a live pipeline                                               | The owner's choice: rescope it, or a new pipeline from its tip (next row)  |
| New intent that starts from another pipeline's unmerged tip                         | A new pipeline whose branch starts at that tip; `Origin: starts-from` names that branch |
| New intent re-attempting an existing pipeline differently                           | A new pipeline; `Origin: re-attempts` names it                            |
| New intent                                                                          | A new pipeline from the base branch                                       |

When several live pipelines match, take the one the request identifies — by name, or as the only one whose frontier it advances; otherwise the owner chooses in step 4, the tip for a new pipeline included.

Routes group by pipeline into runs.

### 4. Confirm the runs

Propose each run's configuration: its current `run-config.md`, else the **Agents** defaults. In one message, give each route and why — or, when no predicate decides, the one deciding question — the incoming-work drafts, the configuration to confirm or change (workflow, target phase in plain language without phase numbers, lanes, models), what a lane change does to the tree (a dropped lane's files are removed; artifacts whose approval package changes go stale), and every other question this session still has. Revise and reconfirm until the owner confirms.

### 5. Prepare

Prepare every route of a run before starting it. Address every worktree by absolute path and run its Git commands through `git -C <worktree>`. Before branching from a tracked artifact base branch, fetch its remote and fast-forward the local branch to its upstream.

**A new pipeline**

1. Pipeline slug and branch per `../run/state.md` § Names.
2. Branch at the chosen start ref; worktree per **Worktree folder root**.
3. `<pipelines folder root>/<pipeline slug>/0-intent/intent.md`, synthesized from the whole issue by `intent-format.md`; `Origin: starts-from` records the starting branch and `Origin: re-attempts` the prior pipeline's slug.
4. Commit following the **Commit format** convention; `rp stamp <intent> --mirror`; commit the stamp in that format.

Every branch and worktree you create — the pipeline's here, a lane's later — fires its `before-`/`after-creating-branch` and `-creating-worktree` hooks (`../conventions/lifecycle-hooks.md`); `after-creating-pipeline` fires once the intent is committed.

**Later input**

1. Use a live pipeline's branch and worktree; for a merged pipeline, create a branch named per `../run/state.md` § Names from the base branch, with a worktree. One live branch per pipeline; later input joins it.
2. Write the input per `intent-format.md` § Later input. Diagnosis belongs to the adjudicating pair.
3. Commit; `rp stamp <input> --mirror`; commit the stamp.

**Continue**: the pipeline's branch and worktree, created when this machine lacks them; for a merged pipeline, create the branch named in `../run/state.md` § Names from the base branch.

**Rescope**: modify the issue (`manage-issues.md`), re-synthesize `intent.md` (`intent-format.md`), commit, `rp stamp <intent> --mirror`, commit the stamp; then Continue.

### 6. Run

One run at a time, in table order; a run carries its statements. Record remaining directions about the work through Later input. Write `run-config.md` (`../run/state.md` § Run configuration) as confirmed; commit. Then fire `run-started`. Autonomous: `../run/loop.md`. Assisted: `../run/assisted.md`.
