<!-- When the role wrote files `rp check` rejects. -->
`rp check` rejects these files you wrote; fix them first: <one INVALID line per file>

<!-- First turn: the lane has no open review thread. -->
Review the code on this branch, `<branch>`, against `<base>`; its diff is <net change path>. It addresses this issue: <intent path>. Its later inputs: <later input paths>.   <!-- drop the last sentence without later inputs -->

Review only this: <brief>   <!-- when the lane has a brief -->

Report anything wrong, missing, risky, or more than the issue needs. Feel free to say what you think is unnecessary.

Write your review, as you would post it on the pull request, to <thread path>, starting with these lines:

```
status: open
opener: reviewer-<lane>
owner: implementer
artifact: implementation

## reviewer-<lane> — <turn commit>
```

If you would merge the change as it stands, write `status: closed: approved` instead.

<!-- Later turn: the lane's open review thread awaits it. -->
The author answered your review in <thread path>; what changed since your last message is <diff path>. Check each answer, review what changed, and append a message headed `## reviewer-<lane> — <turn commit>`. If you would merge the change as it stands, set the status line to `closed: approved`.

<!-- Both forms. -->
Check the change against these rules and note each outcome in your review:   <!-- with the blocks, only when there are guardrails -->

<guardrail blocks>

You can use:   <!-- with the blocks, only when there are resources -->

<resource blocks>

Commit your review with this commit format: <convention>.
