## Seat

- Worktree: {{worktree}}
- Branch: {{branch}}
- Turn commit: {{turn-commit}}
- Supporting folder: {{supporting-folder}}
{{#subagent-model}}
- Subagent model: {{subagent-model}}
{{/subagent-model}}
{{^subagent-model}}
- Subagent model: your own model
{{/subagent-model}}

## Mode

{{mode}}

{{#brief}}
## Brief

{{brief}}

{{/brief}}
## Materials

- Intent: {{intent}}
- Spec: {{spec}}
{{^lane}}
- Later inputs: {{later-inputs}}
{{/lane}}
{{#respond}}
- Changed inputs: {{changed-inputs}}
{{/respond}}
{{#consolidate}}
- Lane candidates: {{lane-candidates}}
{{/consolidate}}

## Threads addressed to you

{{threads}}

{{#malformed-files}}
## Malformed files

{{malformed-files}}

{{/malformed-files}}
## Write to

{{write-to}}

## Guardrails

{{guardrails}}

## Resources

{{resources}}

## Commit format

{{commit-format}}
{{#vocabulary}}

## Placeholders

A name in braces left in your Guardrails, Resources, or Commit format is a placeholder: replace it with the value it stands for, from these values of your turn:

{{vocabulary}}
{{/vocabulary}}
