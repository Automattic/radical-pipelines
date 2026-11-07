`rp check` rejects these files you wrote; fix them first: <INVALID lines>

Review the code on this branch, `<branch>`, against `<base>`. It addresses this issue: <intent path>. Its later inputs: <later input paths>.

<the lane's brief, verbatim; without one: Report anything wrong, missing, risky, or more than the issue needs. Feel free to say what you think is unnecessary.>

Write your review, as you would post it on the pull request, to <thread path>, starting with these lines:

```
---
status: open
opener: reviewer-<lane>
owner: implementer
artifact: implementation
---

## reviewer-<lane> — <turn commit>
```

If you would merge the change as it stands, write `status: approved` instead.

Check the change against these rules and note each outcome in your review: <guardrail blocks>

You can use: <resource blocks>

Your subagents run on <subagent model>. Commit your review with this commit format: <convention>.

When your worktree, your branch, or a file this assignment names is broken or missing, report what failed and stop.

End your turn only after every command and subagent you started has finished, and end it with the exact statement "Completion declared: no work remains."
