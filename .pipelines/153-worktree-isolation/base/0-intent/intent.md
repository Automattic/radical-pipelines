# Agents sometimes edit files in the main checkout instead of the worktree

> Source: GitHub issue [#153](https://github.com/Automattic/radical-pipelines/issues/153).
> This file is self-contained; agents do not need to open the source issue.

## Goal

When a pipeline runs in a worktree, every file edit **and commit** an agent makes lands in the worktree's copy of the repository and on the pipeline's branch — never in the main checkout or on the main branch.

## Context

During runs, agents sometimes modify files in the main checkout instead of the worktree, and sometimes commit to the main branch (trunk) instead of the pipeline branch.

## Assumptions / directions to explore

_Owner's current understanding — for later research to confirm or revise, not ground truth._

- The worktree path is a sub-path of the main repo path. Agents run with their cwd set to the worktree and are given **relative** paths (e.g. `plugins/woocommerce/.../cart.ts`), which resolve correctly. But when an agent constructs an **absolute** path, it may reason "the repo is at `/Users/luisherranz/Code/woocommerce`" and write to `…/woocommerce/plugins/woocommerce/.../cart.ts` — the *main checkout's* copy — instead of the worktree's copy under `.claude/worktrees/…/plugins/…`. The edit tool happily writes to that absolute path, landing the change in the wrong tree.
- Possible fix: also pass agents the worktree path. Currently they only receive the artifacts folder, so they have no reliable absolute anchor for the worktree.
- Agents also sometimes commit to the main branch (trunk) instead of the pipeline branch. Possible fix: pass the branch name explicitly as well, so agents commit to the correct branch.
