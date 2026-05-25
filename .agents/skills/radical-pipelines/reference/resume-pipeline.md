# Resuming a Pipeline

Resumes an in-progress pipeline.

## Steps

### 1. Cancel any leftover health monitor

Cancel any health-monitor loop still registered for this pipeline's slug, per the **Health monitoring** convention. Leftover loops from a previous session persist and must be cancelled before the workflow launches a new one for the same pipeline (see `health-monitoring.md`).

### 2. Re-attach to the branch and worktree

All subsequent work happens inside the pipeline's worktree, per the **Worktrees** convention. Re-attach to the existing worktree for the pipeline's versioned slug:

- **If the worktree exists**, re-enter it per the **Worktrees** convention.
- **If the worktree is gone but the branch exists**, recreate the worktree from the existing branch per the **Worktrees** convention.

### 3. Verify on-disk state against the completion predicate

Read the actual files on the branch and confirm the state against the **Per-phase completion** predicate in `pipeline-versioning.md`:

- Confirm the **completed phase**'s required artifacts are present and committed.
- For the **active phase** (if any), read its latest artifact end-to-end to establish exactly how far it got and why its predicate is not yet met.

### 4. Determine the resume point and restart a partial active phase

If the pipeline has an **active phase** (partially complete), that is the resume point. Otherwise the resume point is the phase **after** the completed phase; the worktree is already clean, so skip the rollback below.

The workflow phase references assume a phase starts fresh, so a partially-complete active phase must be **rolled back to a clean state** before the workflow re-runs it.

Confirm with the owner first:

1. Tell the owner plainly that the active phase will be **restarted and its state reset**: its commits on this branch will be reverted and any uncommitted changes in the worktree discarded, so the phase starts clean. The completed phase and every earlier phase are left untouched.
2. **Ask the owner to confirm.** If they decline, do not roll anything back — stop and offer alternatives, for example forking a new pipeline from the completed phase per `fork-pipeline.md`, which leaves this pipeline's partial state intact.
3. On confirmation, **revert the active phase's commits** so the branch tip returns to the completed-phase state.
   - Reverting adds inverse commits rather than rewriting history, so a branch already on the remote needs no force-update.
   - Then discard any uncommitted changes so the worktree is clean.
   - The active phase folder is now gone from the tip: the pipeline's completed phase is unchanged and it has no active phase.

---

Resume ends here. Return to `work-on-an-issue.md`.
