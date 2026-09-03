# Triage

The owner brings work: an issue, PR feedback, a CI failure, a bug, a correction. You classify it, route it, and only then dispatch. Read `../run/state.md` first.

## Steps

### 1. Normalize into an issue

Every pipeline traces to an issue. If the request has none, run `manage-issues.md` to create it, then continue. Resolve the canonical issue reference through the **Issues** convention.

### 2. Scan

`git fetch`, then the discovery procedure in `../run/state.md` § Discovery, and `rp check` on each pipeline found: every pipeline that references the issue, live or merged, its branch, its frontier, its pending claims and owner escalations, its open amendment branch.

### 3. Route

Apply the first predicate that holds:

| Predicate                                                                           | Route                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A pending owner escalation exists and the request answers it                        | Record the answer (`../run/loop.md` § Owner escalation) and continue that pipeline |
| A live pipeline's intent and amendments already call for this work                  | Continue it                                                               |
| The request corrects what an existing pipeline's artifacts claim or its code does   | An external amendment on that pipeline                                    |
| New intent that starts from another pipeline's unmerged tip                         | A new pipeline whose branch starts at that tip; `Origin: starts-from` names it |
| New intent re-attempting an existing pipeline differently                           | A new pipeline; `Origin: re-attempts` names it                            |
| New intent                                                                          | A new pipeline from the main branch                                       |

Several live pipelines match: pick the one whose frontier the request advances; a pipeline stopped by the valve is continued only with new input (an amendment or an escalation answer).

### 4. Confirm the run

One message to the owner: the route and why — or, when no predicate decides, the one deciding question — together with the run policy to confirm (workflow, target phase, review lanes and charters per artifact, from the project's policy defaults) and every other question this session still has.

### 5. Prepare

**A new pipeline**

1. Slug per the **Branch naming** convention; a second pipeline for the same issue gets `-2`, `-3`.
2. Branch at the chosen start ref; worktree per **Worktree folder root**.
3. `<pipelines folder root>/<slug>/0-intent/intent.md`: the issue body verbatim in the intent format (`intent-format.md`) with `Origin:` lines for the issue and, when stacked or re-attempted, the pipeline it starts from.
4. Commit; `rp stamp <intent> --mirror`.

**An external amendment**

1. Live pipeline: its branch and worktree. Merged pipeline: branch `<slug>_<n>` from the main branch, with a worktree. One live branch per pipeline; a second correction joins it.
2. The owner's words, when there are any, go into `intent.md` as a decision (`intent-format.md`); then `0-intent/<n>-amendment.md`: `Target:`, `Origin:` (the PR comment, the CI run, the decision's id).
3. Commit; `rp stamp <amendment> --mirror` (and the intent, when it changed).

**Continue**: the pipeline's branch and worktree, created when this machine lacks them; a merged pipeline continuing to a later phase gets `<slug>_<n>` from the main branch.

### 6. Run

Fire `run-started`. Autonomous: `../run/loop.md`. Assisted: `../run/assisted.md`.
