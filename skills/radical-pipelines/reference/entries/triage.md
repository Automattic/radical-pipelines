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
| New intent that starts from another pipeline's unmerged tip                         | A new pipeline whose branch starts at that tip; `origin` names it         |
| New intent re-attempting an existing pipeline differently                           | A new pipeline; `origin` names the one it re-attempts                     |
| New intent                                                                          | A new pipeline from the main branch                                       |

Several live pipelines match: pick the one whose frontier the request advances; a pipeline stopped by the valve is continued only with new input (an amendment or an escalation answer). When no predicate decides, ask the owner the one deciding question — together with every other question this session still has.

### 4. Confirm the run

Collect from the project's policy defaults and confirm with the owner in a single message: workflow (autonomous or assisted), target phase, review lanes and charters per artifact. Announce the route and why.

### 5. Prepare

**A new pipeline**

1. Slug per the **Branch naming** convention; a second pipeline for the same issue gets `-2`, `-3`.
2. Branch at the chosen start ref; worktree per **Worktree folder root**.
3. `<pipelines folder root>/<slug>/0-intent/intent.md`: the issue body verbatim in the intent format (`intent-format.md`) with `Origin:` lines for the issue and, when stacked or re-attempted, the pipeline it starts from.
4. Commit; `rp stamp` the intent with `--mirror`.

**An external amendment**

1. Live pipeline: work on its branch. Merged pipeline: branch `<slug>_amendment-<n>` from the main branch. One live amendment branch per pipeline; a second correction waits or joins it.
2. `0-intent/<n>-amendment.md` per `intent-format.md`: `Target:`, `Origin:` (the PR comment, the CI run, the owner's request), the owner's words quoted verbatim and attributed `owner`, everything else yours.
3. Commit; `rp stamp` with `--mirror`.

**Continue**: nothing to prepare.

### 6. Run

Fire `run-started`. Autonomous: `../run/loop.md`. Assisted: `../run/assisted.md`.
