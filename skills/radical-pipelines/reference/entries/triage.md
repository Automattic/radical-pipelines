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
| New intent                                                                          | A new pipeline from the base branch                                       |

Several live pipelines match: pick the one whose frontier the request advances; a pipeline stopped by the valve is continued only with new input (an amendment or an escalation answer).

### 4. Confirm the run

One message to the owner: the route and why — or, when no predicate decides, the one deciding question — together with the run policy to confirm (workflow, target phase, the lanes of `../conventions/agents.md`) and every other question this session still has.

### 5. Prepare

**A new pipeline**

1. Slug per the **Branch naming** convention; a second pipeline for the same issue gets `-2`, `-3`.
2. Branch at the chosen start ref; worktree per **Worktree folder root**.
3. `<pipelines folder root>/<slug>/0-intent/intent.md` in the intent format (`intent-format.md`), with `Origin:` lines for the issue and, when stacked or re-attempted, the pipeline it starts from. An issue already in the intent format is copied verbatim. Otherwise synthesize it: the issue body, the owner's comments quoted as decisions, cross-referenced issues and the external links the intent needs to be self-contained, attachments downloaded beside it; show the owner the draft and write it on approval.
4. Commit; `rp stamp <intent> --mirror`; commit the stamp.

Every branch and worktree you create — the pipeline's here, a lane's later — fires its `before-`/`after-creating-branch` and `-creating-worktree` hooks (`../conventions/lifecycle-hooks.md`); `after-creating-pipeline` fires once the intent is committed.

**An external amendment**

1. Live pipeline: its branch and worktree. Merged pipeline: branch `<slug>_<n>` from the base branch, with a worktree. One live branch per pipeline; a second correction joins it.
2. The owner's words, when there are any, go into `intent.md` as a decision (`intent-format.md`); then `0-intent/<n>-amendment.md`: `Target:`, `Origin:` (the PR comment, the CI run, the decision's id).
3. Commit; `rp stamp <amendment> --mirror` (and the intent, when it changed); commit the stamps.

**Continue**: the pipeline's branch and worktree, created when this machine lacks them; a merged pipeline continuing to a later phase gets `<slug>_<n>` from the base branch. A pipeline the valve stopped: `rp stamp <artifact> --set episode-start-<series>=<its last wave>` once the new input is in the tree.

### 6. Run

Quote every direction the owner gave this session — the run policy as confirmed (the `--lanes` declaration, target phase, thresholds) and any other instruction for the run — as decisions in `intent.md` (`intent-format.md`); `rp stamp` it with `--mirror`; commit. Then fire `run-started`. Autonomous: `../run/loop.md`. Assisted: `../run/assisted.md`.
