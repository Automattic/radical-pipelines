# Close-out

When the loop reaches the target phase:

1. Verify everything is committed and stamped; push the pipeline's branch.
2. If the target phase is build or later: open the PR from the pipeline's branch per the PR format convention (or a new PR for a post-merge amendment), firing the PR hooks around it.
3. Act on the issue per the Issues convention and the project's lifecycle hooks.
4. Report to the owner: what was produced, where, and any non-blocking findings carried on approvals.
5. Clean up: terminate remaining agents, remove throwaway lane worktrees and branches, cancel health monitoring.
