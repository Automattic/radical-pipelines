# Resuming a Pipeline

Resumes an in-progress pipeline by finishing its latest run.

## Steps

### 1. Cancel any leftover health monitor

Cancel any health monitor still registered for this pipeline per the **Health monitoring** convention — a loop from a previous session persists until cancelled, and the workflow will launch a fresh one.

### 2. Locate the latest run branch and its worktree

Enumerate the family's branches and parse them with the branch grammar (`pipeline-versioning.md`); the latest run is the highest-`N` revision, or `base`. Reuse the run branch's worktree if it exists; otherwise recreate it from the branch per the **Worktree root** convention.

### 3. Verify state against the completion predicates

Evaluate the **Per-phase completion** predicates (`pipeline-versioning.md`) within the latest run on its branch to establish the completed phase and the active phase. Read the active phase's artifacts end-to-end to establish exactly how far it got.

### 4. Determine the resume point

**No active phase.** The resume point is the phase after the completed phase; there is nothing to roll back.

**Active build or document phase with its plan approved.** Resume investigatively: inspect the plan, the commits, and the phase's diff — from the parent of the commit that added its plan — to judge how far the tasks got, revert partial-task work, and re-dispatch from the last complete task. The commits and the diff are the only record of task progress.

**Any other in-progress active phase.** The phase restarts clean:

1. Tell the owner plainly that the active phase will be restarted: its commits on the run branch reverted and any uncommitted changes discarded, leaving the completed phase and everything earlier untouched. Ask the owner to confirm; if they decline, stop and offer alternatives — for example a fork per `fork-pipeline.md`, which leaves the partial state intact.
2. On confirmation, revert the active phase's commits — reverting adds inverse commits, so a pushed branch needs no force-update — and discard uncommitted changes. The run returns to the completed-phase state.
3. Delete the aborted attempt's lane branches and their worktrees, including pushed copies; the re-run needs their names free.

---

Resume ends here. Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch.
