# A reviewer woken through rp assign on opencode, to fix its rejected review thread

A scratch pipeline `42-export`. Its review lane `default` is configured on `sonnet`. Its review thread `threads/1-reviewer-default-implementer-implementation.md` is rejected (`status: pending`). Its guardrail `config` uses `{ticket}`, which names no vocabulary fact or variable. The orchestrator's steps were followed by hand:

1. `rp check` printed `frontier INVALID threads/1-reviewer-default-implementer-implementation.md: status must be one of open | approved | withdrawn | answered | disagreement`.
2. `rp review --lane default` was run, and the lane got a worktree.
3. `rp assign --role reviewer-default` printed `model sonnet`.
4. Per `tools/opencode.md` § Models, `sonnet` has no tool-section mapping and is no `provider/model` string, so `opencode.models` resolved it, own provider first, to `claude-agent/sonnet`.
5. Per `tools/opencode.md` § Spawn, a child session of agent `radical-pipelines/reviewer` was created, moved to the lane worktree, and started with `subagent` on `claude-agent/sonnet`. The prompt was exactly `Read your assignment: <path>.`.

## The assignment rp assign wrote

````markdown
`rp check` rejects these files you wrote; fix them first:

INVALID threads/1-reviewer-default-implementer-implementation.md: status must be one of open | approved | withdrawn | answered | disagreement

Review the code on this branch, `42-export-review-default`, against `656d97a11e1bcd7d7cef418102d5e49c95989c09`. It addresses this issue: <repo>/.worktrees/42-export-review-default/.pipelines/42-export/0-intent/intent.md.

Report anything wrong, missing, risky, or more than the issue needs. Feel free to say what you think is unnecessary.

Write your review, as you would post it on the pull request, to <repo>/.worktrees/42-export-review-default/.pipelines/42-export/threads/1-reviewer-default-implementer-implementation.md, starting with these lines:

```
---
status: open
opener: reviewer-default
owner: implementer
artifact: implementation
---

## reviewer-default — 6a3d9b6e782f3837a8e0d28320c189e224b7a2e5
```

If you would merge the change as it stands, write `status: approved` instead.

Check the change against these rules and note each outcome in your review:

### config

- rule: The change leaves `config/{ticket}.json` untouched, `{ticket}` being the issue number that starts the pipeline slug.

Your subagents run on the model your tool finds by the name `sonnet`, or on your own model when it finds none.
Commit your review with this commit format:

An imperative subject line ending with (reviewer-default).

A name in braces left in these rules, in what you can use, or in the commit format is a placeholder: replace it with the value it stands for, from these values of your turn:

- `{pipeline-slug}`: 42-export
- `{role}`: reviewer-default
- `{profile}`: reviewer
- `{lane}`: default
- `{worktree}`: <repo>/.worktrees/42-export-review-default
- `{branch}`: 42-export-review-default
- `{base}`: main
````

## The reviewer's turn

It committed one commit, `Approve the cart total quantity change (reviewer-default)`, which rewrites thread 1 in place; it opened no other thread. The thread it left:

````markdown
---
status: approved
opener: reviewer-default
owner: implementer
artifact: implementation
---

## reviewer-default — 6a3d9b6e782f3837a8e0d28320c189e224b7a2e5

I would merge this as it stands.

The change is one line in `src/cart.js`: `total` now sums `item.price * item.quantity` instead of `item.price`. This is what the issue's goal asks for ("The cart total counts each item's quantity"), and nothing else in the diff goes beyond it.

**Rule outcome**

- config: the change leaves `config/42.json` untouched. `git diff 656d97a --stat -- config` is empty, and the file is still `{}`.

**What I checked**

- Empty cart: `reduce` starts from `0`, so `total([])` is still `0`.
- Export: `total` was already `export const` and stays so. The issue title says "Export", but the goal describes only the quantity change, so nothing needs adding for it.
- Scope: nothing else in the repo calls `total` or reads `quantity`, so no other callers need updating.

**Non-blocking notes**

- An item with no `quantity` now produces `NaN`, where before it summed fine. The issue doesn't say what a missing quantity means, so I would not add a default (for example `?? 1`) on a guess. If items can arrive without a quantity, ask the owner before deciding.
- The repo has no tests or test setup, and the issue doesn't ask for any, so I'm not asking for them here.
````

Its rule outcome reads `config/42.json` where the guardrail wrote `config/{ticket}.json`: it substituted the placeholder from the listed vocabulary.

## Landing

```text
$ git cherry-pick <change>..42-export-review-default; rp stamp .../threads/1-reviewer-default-implementer-implementation.md --at <change>; git commit
$ rp check .../.pipelines/42-export
frontier complete
review default approved
thread threads/1-reviewer-default-implementer-implementation.md approved
```
