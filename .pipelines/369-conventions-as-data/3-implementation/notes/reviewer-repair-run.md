# A reviewer woken through rp assign on an INVALID frontier, with the repair request

A scratch pipeline `42-export`. Its review lane `default` is configured on `sonnet`. Its review thread was written at an earlier `rp review` change, `2ae0816e942e1aeddfb3dee95faa4edcda998dad`, and holds a message that approves the change, but its status `pending` is rejected. The orchestrator's steps were followed by hand:

1. `rp check` printed `frontier INVALID threads/1-reviewer-default-implementer-implementation.md: status must be one of open | approved | withdrawn | answered | disagreement`.
2. `rp review --lane default` built a new change, and the lane got a worktree.
3. `rp assign --role reviewer-default` wrote `templates/reviewer-repair.md` and printed `model sonnet`.
4. `opencode.models` resolved `sonnet`, own provider first, to `claude-agent/sonnet`.
5. A child session of agent `radical-pipelines/reviewer` was created, moved to the lane worktree, and started on that model. The prompt was `Read your assignment: <path>.`.

## The assignment rp assign wrote

````markdown
Your worktree is on branch `42-export-review-default`, at `26b379dc6f92e67f75599dc87dba2ec4a34a7c09`. `rp check` rejects these files you wrote, at these paths in `<repo>/.worktrees/42-export-review-default/.pipelines/42-export`:

INVALID threads/1-reviewer-default-implementer-implementation.md: status must be one of open | approved | withdrawn | answered | disagreement

Fix each file, changing only what its reason names and keeping every message it holds. This turn asks for nothing else.

Commit your fix with this commit format:

An imperative subject line ending with (reviewer-default).
````

## The reviewer's turn

It made one commit, `Set review thread status to approved (reviewer-default)`. Its report: "I changed the thread's `status` from `pending` to `approved` … The only change was the status line, and the message is intact." The thread, before against after:

```text
$ diff <the thread before> <the thread after>
2c2
< status: pending
---
> status: approved
```

## Landing

Landing cherry-picked the lane's commit onto the pipeline branch. It stamped the approval `--at` the commit the reviewer's last heading names, `2ae0816e942e1aeddfb3dee95faa4edcda998dad`, which is not this turn's change.

```text
$ rp check .../.pipelines/42-export
frontier complete
review default approved
thread threads/1-reviewer-default-implementer-implementation.md approved
```
