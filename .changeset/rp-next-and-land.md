---
"@automattic/radical-pipelines": minor
---

BREAKING: Run each loop step with `rp next` and `rp land`, which replace `rp assign`, `rp review`, and `rp stamp`.

`rp next <pipeline folder>` prints the step's plan and changes nothing: the frontier, the lane branches and worktrees to create, move, or remove, the roles to terminate, each role to wake with its worktree, model name, phase, resources, and assignment path, and every lifecycle hook the step fires, the worktree hooks with the role each worktree is for. `rp next <pipeline folder> --apply` does exactly what the plan states — it builds each review lane's change from the pipeline tip, writes each woken role's assignment, and records each role's turn — and applying again, or again after a failed action is repaired, repeats nothing already done. A lane whose turn ended without landing is landed first, and a lane whose landing would reject a file it wrote is woken in its worktree as it stands to repair it; a lane's commits that have not landed are never discarded.

`rp land <pipeline folder> --role <role>` lands one turn: it verifies the turn's commits are on the role's branch, merges a production lane or cherry-picks a review lane's own commits, stops on any file `rp check` would reject, naming it and the reason, certifies the role's artifact at its turn commit and each approval at the change its reviewer read, commits, and prints `hook phase-completed <phase>` for each phase its landing made complete. A stop lands nothing. `rp check --json` also lists the complete phases as `complete`.

Each changed input in an assignment now names the commit at which it was as its artifact last landed, so its diff shows only what changed since, also after a landing that left the artifact unchanged.

The worktree folder root moves into `.rp.md`'s data as `worktree-folder-root`, and `landing-commit` declares the template of the commits `rp land` makes, such as `{subject} (orchestrator)`; without it, a commit has its subject alone. Lane branches no longer fire `before-creating-branch` or `after-creating-branch`.
