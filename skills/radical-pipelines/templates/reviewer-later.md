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

The author answered your review in {{thread}}; what changed since your last message is {{diff}}. Check each answer and review what changed. If you would merge the change as it stands, approve it with this command, your closing message in place of `<your closing message>`:

```
{{rp}} thread close {{pipeline-folder-arg}} --role {{role}} --thread {{thread-arg}} --status approved --body - <<'EOF'
<your closing message>
EOF
```

Otherwise, say what still needs to change with this one, your answer in place of `<your answer>`:

```
{{rp}} thread reply {{pipeline-folder-arg}} --role {{role}} --thread {{thread-arg}} --body - <<'EOF'
<your answer>
EOF
```

When you and the author disagree on what the issue means or demands, say so: the author takes the question to the person who wrote the issue.

Run every other `rp` command the same way, as `{{rp}} <command> {{pipeline-folder-arg}} --role {{role}}`; `{{rp}} --help` lists them.

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

Before you end any turn, run `rp validate` and fix each file it reports. End your turn only after every command and subagent you started has finished, and end it with the exact statement "Completion declared: no work remains."
