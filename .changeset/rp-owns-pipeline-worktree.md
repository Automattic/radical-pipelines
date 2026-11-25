---
"@automattic/radical-pipelines": minor
---

Have `rp` create and remove the pipeline worktree, with `rp start`, `rp stop`, and `rp close`.

`rp start <pipeline folder> --branch <pipeline branch> --config <file | ->` starts a run. It creates the pipeline branch this machine lacks, from the remote that holds it or else at the configuration's base branch, creates its worktree, and writes the configuration it is given as `config.json` there. Triage no longer creates branches or worktrees with Git: it writes the configuration to a file and applies this plan, which names the `before-`/`after-creating-branch` and `-creating-worktree` hooks to fire.

`rp stop <pipeline folder> --branch <pipeline branch>` removes what a stopped run leaves: the worktree and branch of each lane that holds no work that has not landed, including a lane the configuration dropped. Close-out applies it instead of removing lanes by hand. `rp close <pipeline folder> --branch <pipeline branch>` removes every lane's worktree and then the pipeline worktree, unless that is the main checkout; merging a pipeline's pull request and closing it without merging now apply it. Both name the `before-`/`after-removing-worktree` hooks, so a project's teardown belongs in those hooks. Neither deletes the pipeline branch or a lane branch holding commits that have not landed, and neither changes a remote. A worktree holding an untracked or modified file is never removed, whatever the repository's status configuration hides; this now also holds for the lane worktrees `rp next --apply` removes at a consolidation.

The turn record moves to `rp-turns/<pipeline branch>.json` in the repository's common git directory and names the pipeline folder. `rp start` creates it and `rp close` removes it, and `stop` and `close` act only on a pipeline branch that has one, so they remove nothing `rp` did not make. A lane kept after its pipeline worktree is removed still lands once the worktree is created again. A lane is the pipeline's only while the record holds its turn on its lane branch: `stop` and `close` leave alone a branch or worktree that only bears a lane's name, and `rp next` stops on a lane branch holding commits that have not landed with no recorded turn. A pipeline started before this is installed has no turn record: land or stop its lanes first, and run `rp start` on it once before `rp close` can remove its worktrees.

A merge commit on a lane no longer passes for landed. A production lane's unlanded commits are every commit the pipeline branch does not reach, so landing merges what a merge on the lane brought. A review lane's merge commit stops `rp land`, which picks a review lane's commits one by one.

Every plan is applied the same way, which `lifecycle-hooks.md` § Applying a plan states once.
