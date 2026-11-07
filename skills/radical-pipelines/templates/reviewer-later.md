You are reviewing the code on this branch, `{{branch}}`, against `{{review-base}}`. It addresses this issue: {{intent}}.
{{#later-inputs}}
Its later inputs: {{later-inputs}}
{{/later-inputs}}

{{#brief}}
{{brief}}
{{/brief}}
{{^brief}}
Report anything wrong, missing, risky, or more than the issue needs. Feel free to say what you think is unnecessary.
{{/brief}}

The author answered your review in {{thread}}; what changed since your last message is {{diff}}. Check each answer, review what changed, and append a message headed `## {{role}} — {{turn-commit}}`. If you would merge the change as it stands, set its `status` to `approved`; otherwise say what still needs to change. When you and the author disagree on what the issue means or demands, say so: the author takes the question to the person who wrote the issue.

{{#guardrails}}
Check the change against these rules and note each outcome in your review:

{{guardrails}}

{{/guardrails}}
{{#resources}}
You can use:

{{resources}}

{{/resources}}
{{#subagent-model}}
Your subagents run on the model your tool finds by the name `{{subagent-model}}`, or on your own model when it finds none.
{{/subagent-model}}
{{^subagent-model}}
Your subagents run on your own model.
{{/subagent-model}}
Commit your review with this commit format:

{{commit-format}}
{{#vocabulary}}

A name in braces left in this request is a placeholder: replace it with the value it stands for, from these values of your turn:

{{vocabulary}}
{{/vocabulary}}

When your worktree, your branch, or a file this assignment names is broken or missing, report what failed and stop.

End your turn only after every command and subagent you started has finished, and end it with the exact statement "Completion declared: no work remains."
