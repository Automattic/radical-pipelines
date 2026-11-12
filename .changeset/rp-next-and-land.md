---
"@automattic/radical-pipelines": minor
---

BREAKING: Run each loop step with `rp next` and `rp land`, which replace `rp stamp`.

`rp next <pipeline folder>` prints the step's plan and changes nothing: the frontier, the lane branches and worktrees to create, move, or remove, the roles to terminate, each role to wake with its worktree, model name, phase, resources, and assignment path, and every lifecycle hook the step fires, the worktree hooks with the role each worktree is for. A production lane's work is `produce <artifact> <lane>` or `respond <artifact> <lane>`, and a consolidation wakes its producer on a new instance, `wake <role> new`. `rp next <pipeline folder> --apply` does exactly what the plan states — it builds each review lane's review head from the pipeline tip, writes each woken role's assignment, and records each role's turn in the turn record, `rp/turns.json` in the pipeline worktree's assignment folder — and applying again, or again after a failed action is repaired, repeats nothing already done. A lane whose turn ended without landing is landed first, and a lane whose landing would bring a malformed file it wrote is woken in its worktree as it stands to repair it; a lane's commits that have not landed are never discarded.

`rp land <pipeline folder> --role <role>` lands one turn: it verifies the turn's commits are on the role's branch, merges a production lane or cherry-picks a review lane's own commits, stops on any malformed file, naming it and the reason, certifies the role's artifact at its turn commit and each approval at the review head its reviewer read, commits, and prints `hook phase-completed <phase>` for each phase its landing made complete. A stop lands nothing. A lane's landing fires `before-landing-lane` and `after-landing-lane`. `rp check --json`, its keys in kebab-case like the pipeline configuration's, also lists the complete phases as `complete`, and gives each phase its number, its artifact's name, and its path.

Each changed input in an assignment now names the commit at which it was as its artifact last landed, so its diff shows only what changed since, also after a landing that left the artifact unchanged.

`rp next` places each lane's worktree under the worktree folder root, and `rp land` makes its commits from the template the pipeline configuration records, such as `{subject} (orchestrator)`; without one, a commit has its subject alone. Lane branches no longer fire `before-creating-branch` or `after-creating-branch`.
