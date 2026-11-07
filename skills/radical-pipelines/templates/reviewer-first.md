Review the code on this branch, `{{branch}}`, against `{{review-base}}`. It addresses this issue: {{intent}}.
{{#later-inputs}}
Its later inputs: {{later-inputs}}
{{/later-inputs}}

{{#brief}}
{{brief}}
{{/brief}}
{{^brief}}
Report anything wrong, missing, risky, or more than the issue needs. Feel free to say what you think is unnecessary.
{{/brief}}

Write your review as you would post it on the pull request, and open it with this command, the review on its standard input:

```
{{rp}} thread open {{pipeline-folder}} --role {{role}} --artifact implementation --body -
```

It prints the path of your review thread. If you would merge the change as it stands, approve it then:

```
{{rp}} thread close {{pipeline-folder}} --role {{role}} --thread <that path> --status approved
```

Run every other `rp` command the same way, as `{{rp}} <command> {{pipeline-folder}} --role {{role}}`; `{{rp}} --help` lists them.

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
