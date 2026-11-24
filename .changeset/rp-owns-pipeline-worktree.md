---
"@automattic/radical-pipelines": minor
---

Have `rp` create and remove the pipeline worktree, with `rp start`, `rp stop`, and `rp close`.

`rp start <pipeline folder> --branch <pipeline branch> --config <file | ->` starts a run. It creates the pipeline branch this machine lacks, from the remote that holds it or else at the configuration's base branch, creates its worktree, and writes the configuration it is given as `config.json` there. Triage no longer creates branches or worktrees with Git: it writes the configuration to a file and applies this plan, which names the `before-`/`after-creating-branch` and `-creating-worktree` hooks to fire.

`rp stop <pipeline folder>` removes what a stopped run leaves: the worktree and branch of each lane the run woke whose commits have landed, including a lane the configuration dropped. Close-out applies it instead of removing lanes by hand. `rp close <pipeline folder>` removes every lane's worktree and then the pipeline worktree, unless that is the main checkout; merging a pipeline's pull request and closing it without merging now apply it. Both name the `before-`/`after-removing-worktree` hooks, so a project's teardown belongs in those hooks. Neither deletes the pipeline branch or a lane branch holding commits that have not landed, and neither changes a remote. A worktree holding an untracked or modified file is never removed, whatever the repository's status configuration hides; this now also holds for the lane worktrees `rp next --apply` removes at a consolidation.

Every plan is applied the same way, which `lifecycle-hooks.md` § Applying a plan states once.
