# Resuming a Pipeline

Resumes an in-progress pipeline by finishing its latest run.

## Steps

### 1. Cancel any leftover health monitor

Cancel any health monitor still registered for this pipeline per the **Health monitoring** convention — a loop from a previous session persists until cancelled, and the workflow will launch a fresh one.

### 2. Locate the latest run branch and its worktree

Enumerate the family's branches and parse them with the branch grammar (`pipeline-versioning.md`); the latest run is the highest-`N` layered run, or `base`. Reuse the run branch's worktree if it exists; otherwise recreate it from the branch per the **Worktree root** convention, bracketed by the `before-creating-worktree`/`after-creating-worktree` lifecycle hooks.

### 3. Verify state against the completion predicates

Evaluate the **Per-phase completion** predicates (`pipeline-versioning.md`) within the latest run on its branch to establish the completed phase and the active phase. Read the active phase's artifacts end-to-end to establish exactly how far it got.

### 4. Determine the resume point

**No active phase.** The resume point is the phase after the completed phase; there is nothing to roll back.

**An active phase.** Resume investigatively, judging each lane on its own flow. The artifacts, the commits, and the phase's diff — from the parent of its first commit — are the only record of progress. The resume point is the latest state the record proves reached whose next action follows from the record alone; everything past it, including uncommitted changes, is partial work. When no such state exists, the resume point is the phase start. For example, an approved build plan whose diff completes three tasks resumes at the fourth task; a rejected plan with a committed revision resumes at the revision's review.

When there is partial work, roll it back:

1. Tell the owner plainly what resuming keeps and what it rolls back: the partial work's commits reverted and any uncommitted changes discarded, leaving everything up to the resume point untouched. Ask the owner to confirm; if they decline, stop and offer alternatives — for example a fork per `fork-pipeline.md`, which leaves the partial state intact.
2. On confirmation, revert the partial work's commits — reverting adds inverse commits, so a pushed branch needs no force-update — and discard uncommitted changes. The run returns to the resume-point state.
3. Delete the branches and worktrees of lanes rolled back to their start, including pushed copies; the re-run needs their names free.

---

Resume ends here. Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch; the active phase continues from the resume point.
